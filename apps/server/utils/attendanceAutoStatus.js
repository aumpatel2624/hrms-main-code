import {
  alternatingFirstAndLast,
  alternatingEveryValidPair,
  strictFirstAndLast,
  strictEveryValidPair,
} from "./workingHours.js";

/**
 * ADR-025 — `processAutoAttendance`'s pure calculation core, factored out so
 * it is testable without a database (this project's "pure, tested
 * calculation utilities" pattern — `leaveProration.js`, `workingHours.js`).
 */

/**
 * Picks the working-hours function a `ShiftType` actually wants, from its
 * own `determineCheckInAndCheckOut` ("alternating-entries"/"strict-in-out")
 * x `workingHoursCalculationBasis` ("first-and-last"/"every-valid-pair")
 * combination — all four of `workingHours.js`'s functions are real,
 * independently-selectable modes (ADR-025), not simplified away.
 */
export const selectWorkingHoursFn = (shiftType) => {
  const strict = shiftType?.determineCheckInAndCheckOut === "strict-in-out";
  const everyPair = shiftType?.workingHoursCalculationBasis === "every-valid-pair";
  if (strict) return everyPair ? strictEveryValidPair : strictFirstAndLast;
  return everyPair ? alternatingEveryValidPair : alternatingFirstAndLast;
};

/**
 * The Present/Absent/Half Day decision. Both thresholds use a strict "less
 * than" test (per the research), and are tested in this exact order —
 * `workingHoursThresholdForAbsent` first, then `workingHoursThresholdForHalfDay`
 * — so a shift with only one threshold set (the other left at its schema
 * default of 0) never accidentally triggers the untouched one, since
 * `workingHours` can never be negative.
 */
export const decideAttendanceStatus = (workingHours, { workingHoursThresholdForAbsent = 0, workingHoursThresholdForHalfDay = 0 } = {}) => {
  if (workingHoursThresholdForAbsent > 0 && workingHours < workingHoursThresholdForAbsent) return "Absent";
  if (workingHoursThresholdForHalfDay > 0 && workingHours < workingHoursThresholdForHalfDay) return "Half Day";
  return "Present";
};

/**
 * Late-entry / early-exit flags — the first/last checkin log time compared
 * against the shift's nominal window boundaries plus their grace periods
 * (minutes). `enableLateEntryMarking`/`enableEarlyExitMarking` gate whether
 * the flag is even computed (mirrors `ShiftType`'s own toggles) — `null` is
 * returned, not `false`, when the corresponding marking is disabled, so a
 * caller can tell "not late" apart from "not evaluated".
 */
export const computeLateEarlyFlags = (logs, shiftType, window) => {
  const first = logs[0];
  const last = logs.at(-1);
  const lateEntry = shiftType?.enableLateEntryMarking && first
    ? new Date(first.time) > new Date(+window.start + (shiftType.lateEntryGracePeriod || 0) * 60000)
    : null;
  const earlyExit = shiftType?.enableEarlyExitMarking && last
    ? new Date(last.time) < new Date(+window.end - (shiftType.earlyExitGracePeriod || 0) * 60000)
    : null;
  return { lateEntry, earlyExit };
};
