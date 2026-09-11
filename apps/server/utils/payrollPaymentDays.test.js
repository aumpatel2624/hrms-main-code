// Pure-logic test (no DB) — exercises `calculatePaymentDays` directly with
// hand-computed expected values. The DB-fetching wrapper `computePaymentDays`
// is exercised live by scripts/verify-shift-attendance.mjs's sibling for this
// module (scripts/verify-payroll-run.mjs) against real seeded documents.
import assert from "node:assert/strict";
import { calculatePaymentDays } from "./payrollPaymentDays.js";

const daysInRange = (fromIso, toIso) => {
  const dates = [];
  let cursor = new Date(fromIso);
  const last = new Date(toIso);
  while (cursor <= last) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor = new Date(cursor.getTime() + 86400000);
  }
  return dates;
};

const baseSettings = {
  payrollBasedOn: "Attendance",
  considerUnmarkedAttendanceAs: "Absent",
  includeHolidaysInTotalWorkingDays: false,
  dailyWagesFractionForHalfDay: 0.5,
};

// Case 1: a full-attendance month — every day Present, no holidays, no LWP.
// 31 days in January -> paymentDays must equal workingDays exactly.
{
  const attendanceRows = daysInRange("2026-01-01", "2026-01-31").map((d) => ({ attendanceDate: d, status: "Present" }));
  const result = calculatePaymentDays({ startDate: "2026-01-01", endDate: "2026-01-31", attendanceRows, settings: baseSettings });
  assert.equal(result.workingDays, 31);
  assert.equal(result.totalWorkingDays, 31);
  assert.equal(result.lwpDays, 0);
  assert.equal(result.absentDays, 0);
  assert.equal(result.halfDayDays, 0);
  assert.equal(result.paymentDays, 31);
}
console.log("payrollPaymentDays: full-attendance month passed (31/31)");

// Case 2: one LWP day (an "On Leave" Attendance row whose Leave Type is LWP)
// -> reduces paymentDays by exactly 1, full day, no half-day fraction.
{
  const dates = daysInRange("2026-01-01", "2026-01-31");
  const attendanceRows = dates.map((d) =>
    d === "2026-01-15" ? { attendanceDate: d, status: "On Leave", isLwp: true } : { attendanceDate: d, status: "Present" },
  );
  const result = calculatePaymentDays({ startDate: "2026-01-01", endDate: "2026-01-31", attendanceRows, settings: baseSettings });
  assert.equal(result.lwpDays, 1);
  assert.equal(result.absentDays, 0);
  assert.equal(result.paymentDays, 30);
}
console.log("payrollPaymentDays: one LWP day passed (31 - 1 = 30)");

// Case 3: an unmarked day (no Attendance row at all) under both
// considerUnmarkedAttendanceAs settings.
{
  const attendanceRows = daysInRange("2026-01-01", "2026-01-31")
    .filter((d) => d !== "2026-01-20")
    .map((d) => ({ attendanceDate: d, status: "Present" }));

  const asAbsent = calculatePaymentDays({ startDate: "2026-01-01", endDate: "2026-01-31", attendanceRows, settings: baseSettings });
  assert.equal(asAbsent.absentDays, 1);
  assert.equal(asAbsent.paymentDays, 30);

  const asPresent = calculatePaymentDays({
    startDate: "2026-01-01", endDate: "2026-01-31", attendanceRows,
    settings: { ...baseSettings, considerUnmarkedAttendanceAs: "Present" },
  });
  assert.equal(asPresent.absentDays, 0);
  assert.equal(asPresent.paymentDays, 31);
}
console.log("payrollPaymentDays: unmarked day passed (Absent -> 30, Present -> 31)");

// Case 4: a half day (halfDayStatus set) reduces paymentDays by the
// configured fraction (0.5 here), not a full day.
{
  const dates = daysInRange("2026-01-01", "2026-01-31");
  const attendanceRows = dates.map((d) =>
    d === "2026-01-05" ? { attendanceDate: d, status: "Half Day", halfDayStatus: "Absent" } : { attendanceDate: d, status: "Present" },
  );
  const result = calculatePaymentDays({ startDate: "2026-01-01", endDate: "2026-01-31", attendanceRows, settings: baseSettings });
  assert.equal(result.halfDayDays, 1);
  assert.equal(result.paymentDays, 30.5);
}
console.log("payrollPaymentDays: half day passed (31 - 0.5 = 30.5)");

// Case 5: a mid-period joiner — dateOfJoining clamps actualStartDate, which
// shrinks BOTH workingDays and totalWorkingDays (this project's model — see
// file-level comment on the deliberate simplification vs. source).
{
  const dates = daysInRange("2026-01-10", "2026-01-31"); // 22 days
  const attendanceRows = dates.map((d) => ({ attendanceDate: d, status: "Present" }));
  const result = calculatePaymentDays({
    startDate: "2026-01-01", endDate: "2026-01-31",
    dateOfJoining: "2026-01-10",
    attendanceRows, settings: baseSettings,
  });
  assert.equal(result.actualStartDate.toISOString().slice(0, 10), "2026-01-10");
  assert.equal(result.workingDays, 22);
  assert.equal(result.totalWorkingDays, 22);
  assert.equal(result.paymentDays, 22);
}
console.log("payrollPaymentDays: mid-period joiner passed (clamped to 22 working days)");

// Case 6: a holiday included vs. excluded from the total working days.
{
  const attendanceRows = ["2026-01-01", "2026-01-02", "2026-01-04", "2026-01-05", "2026-01-06", "2026-01-07"]
    .map((d) => ({ attendanceDate: d, status: "Present" }));

  const excluded = calculatePaymentDays({
    startDate: "2026-01-01", endDate: "2026-01-07",
    holidayDates: ["2026-01-03"],
    attendanceRows, settings: baseSettings,
  });
  assert.equal(excluded.workingDays, 6);
  assert.equal(excluded.absentDays, 0); // the holiday isn't part of the working set at all
  assert.equal(excluded.paymentDays, 6);

  const includedAbsent = calculatePaymentDays({
    startDate: "2026-01-01", endDate: "2026-01-07",
    holidayDates: ["2026-01-03"],
    attendanceRows, settings: { ...baseSettings, includeHolidaysInTotalWorkingDays: true },
  });
  assert.equal(includedAbsent.workingDays, 7);
  assert.equal(includedAbsent.absentDays, 1); // now in the working set, unmarked -> Absent
  assert.equal(includedAbsent.paymentDays, 6);

  const includedPresent = calculatePaymentDays({
    startDate: "2026-01-01", endDate: "2026-01-07",
    holidayDates: ["2026-01-03"],
    settings: { ...baseSettings, includeHolidaysInTotalWorkingDays: true, considerUnmarkedAttendanceAs: "Present" },
    attendanceRows,
  });
  assert.equal(includedPresent.paymentDays, 7);
}
console.log("payrollPaymentDays: holiday included vs excluded passed");

// Case 7: the Leave-Application-based path — an approved LWP leave
// overlapping the period, plus a single-day half-day application.
{
  const settings = { ...baseSettings, payrollBasedOn: "Leave Application" };

  const fullDays = calculatePaymentDays({
    startDate: "2026-01-01", endDate: "2026-01-31",
    leaveApplications: [{ fromDate: "2026-01-10", toDate: "2026-01-12", halfDay: false }],
    settings,
  });
  assert.equal(fullDays.lwpDays, 3);
  assert.equal(fullDays.halfDayDays, 0);
  assert.equal(fullDays.paymentDays, 28);

  const withHalfDay = calculatePaymentDays({
    startDate: "2026-01-01", endDate: "2026-01-31",
    leaveApplications: [
      { fromDate: "2026-01-10", toDate: "2026-01-12", halfDay: false },
      { fromDate: "2026-01-15", toDate: "2026-01-15", halfDay: true },
    ],
    settings,
  });
  assert.equal(withHalfDay.lwpDays, 3);
  assert.equal(withHalfDay.halfDayDays, 1);
  assert.equal(withHalfDay.paymentDays, 27.5);
}
console.log("payrollPaymentDays: Leave-Application-based path passed (28, 27.5)");

console.log("payrollPaymentDays: all cases passed");
