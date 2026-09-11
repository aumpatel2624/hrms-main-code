import assert from "node:assert/strict";
import { selectWorkingHoursFn, decideAttendanceStatus, computeLateEarlyFlags } from "./attendanceAutoStatus.js";
import { alternatingFirstAndLast, alternatingEveryValidPair, strictFirstAndLast, strictEveryValidPair } from "./workingHours.js";

// selectWorkingHoursFn — all four combinations resolve to the right function.
assert.equal(selectWorkingHoursFn({ determineCheckInAndCheckOut: "alternating-entries", workingHoursCalculationBasis: "first-and-last" }), alternatingFirstAndLast);
assert.equal(selectWorkingHoursFn({ determineCheckInAndCheckOut: "alternating-entries", workingHoursCalculationBasis: "every-valid-pair" }), alternatingEveryValidPair);
assert.equal(selectWorkingHoursFn({ determineCheckInAndCheckOut: "strict-in-out", workingHoursCalculationBasis: "first-and-last" }), strictFirstAndLast);
assert.equal(selectWorkingHoursFn({ determineCheckInAndCheckOut: "strict-in-out", workingHoursCalculationBasis: "every-valid-pair" }), strictEveryValidPair);
assert.equal(selectWorkingHoursFn({}), alternatingFirstAndLast); // defaults, no shift type data

// decideAttendanceStatus — strict "<", Absent tested before Half Day.
assert.equal(decideAttendanceStatus(8, { workingHoursThresholdForAbsent: 4, workingHoursThresholdForHalfDay: 6 }), "Present");
assert.equal(decideAttendanceStatus(5, { workingHoursThresholdForAbsent: 4, workingHoursThresholdForHalfDay: 6 }), "Half Day");
assert.equal(decideAttendanceStatus(3, { workingHoursThresholdForAbsent: 4, workingHoursThresholdForHalfDay: 6 }), "Absent");
assert.equal(decideAttendanceStatus(4, { workingHoursThresholdForAbsent: 4, workingHoursThresholdForHalfDay: 6 }), "Half Day"); // exactly at Absent threshold — not "less than"
assert.equal(decideAttendanceStatus(6, { workingHoursThresholdForAbsent: 4, workingHoursThresholdForHalfDay: 6 }), "Present"); // exactly at Half Day threshold
assert.equal(decideAttendanceStatus(0, {}), "Present"); // both thresholds at schema default 0 — never triggers
assert.equal(decideAttendanceStatus(0, { workingHoursThresholdForAbsent: 4 }), "Absent"); // only Absent threshold set

// computeLateEarlyFlags — grace periods, and disabled marking returns null (not false).
const window = { start: new Date("2026-09-14T09:00:00Z"), end: new Date("2026-09-14T17:00:00Z") };
const logs = [{ time: "2026-09-14T09:20:00Z", logType: "IN" }, { time: "2026-09-14T16:40:00Z", logType: "OUT" }];
assert.deepEqual(
  computeLateEarlyFlags(logs, { enableLateEntryMarking: true, enableEarlyExitMarking: true, lateEntryGracePeriod: 10, earlyExitGracePeriod: 10 }, window),
  { lateEntry: true, earlyExit: true },
);
assert.deepEqual(
  computeLateEarlyFlags(logs, { enableLateEntryMarking: true, enableEarlyExitMarking: true, lateEntryGracePeriod: 30, earlyExitGracePeriod: 30 }, window),
  { lateEntry: false, earlyExit: false },
);
assert.deepEqual(
  computeLateEarlyFlags(logs, { enableLateEntryMarking: false, enableEarlyExitMarking: false }, window),
  { lateEntry: null, earlyExit: null },
);
assert.deepEqual(computeLateEarlyFlags([], { enableLateEntryMarking: true, enableEarlyExitMarking: true }, window), { lateEntry: null, earlyExit: null });

console.log("attendanceAutoStatus: working-hours selection, status decision and late/early flags all passed");
