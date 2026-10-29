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

// Case 5: a mid-period joiner — dateOfJoining clamps actualStartDate, so only
// the 22 days from joining are paid, out of the month's 31 (ADR-069).
{
  const dates = daysInRange("2026-01-10", "2026-01-31"); // 22 days
  const attendanceRows = dates.map((d) => ({ attendanceDate: d, status: "Present" }));
  const result = calculatePaymentDays({
    startDate: "2026-01-01", endDate: "2026-01-31",
    dateOfJoining: "2026-01-10",
    attendanceRows, settings: baseSettings,
  });
  assert.equal(result.actualStartDate.toISOString().slice(0, 10), "2026-01-10");
  assert.equal(result.workingDays, 31);
  assert.equal(result.totalWorkingDays, 31);
  assert.equal(result.paymentDays, 22);
}
console.log("payrollPaymentDays: mid-period joiner passed (22 of 31 working days)");

// Case 5b (29 Oct functional test, P2): October 2026 with Sundays and two
// holidays off has 25 working days. A leaver is paid their working days up to
// relieving out of those 25, not out of the days they were employed.
{
  const holidayDates = ["2026-10-04", "2026-10-11", "2026-10-18", "2026-10-25", "2026-10-02", "2026-10-20"];
  const present = (toIso, absent = []) => daysInRange("2026-10-01", toIso)
    .filter((d) => !holidayDates.includes(d))
    .map((d) => ({ attendanceDate: d, status: absent.includes(d) ? "Absent" : "Present" }));
  const october = { startDate: "2026-10-01", endDate: "2026-10-31", holidayDates, settings: baseSettings };

  // Pratik Panchal TRP014: relieved 26 Oct, no absences -> 20 of 25.
  const pratik = calculatePaymentDays({ ...october, relievingDate: "2026-10-26", attendanceRows: present("2026-10-26") });
  assert.equal(pratik.totalWorkingDays, 25);
  assert.equal(pratik.paymentDays, 20);
  assert.equal(pratik.absentDays, 0); // days after relieving are not absences
  assert.equal(45000 * pratik.paymentDays / pratik.totalWorkingDays, 36000);

  // Mayank Trivedi TRP013: relieved 28 Oct, 2 absent -> 22 - 2 = 20 of 25.
  const mayank = calculatePaymentDays({
    ...october, relievingDate: "2026-10-28", attendanceRows: present("2026-10-28", ["2026-10-07", "2026-10-08"]),
  });
  assert.equal(mayank.totalWorkingDays, 25);
  assert.equal(mayank.absentDays, 2);
  assert.equal(mayank.paymentDays, 20);
  assert.equal(45000 * mayank.paymentDays / mayank.totalWorkingDays, 36000);

  // A joiner on the 16th with full attendance is paid 13 of 25, not a full month.
  const joiner = calculatePaymentDays({
    ...october, dateOfJoining: "2026-10-16",
    attendanceRows: present("2026-10-31").filter((r) => r.attendanceDate >= "2026-10-16"),
  });
  assert.equal(joiner.totalWorkingDays, 25);
  assert.equal(joiner.paymentDays, 13);
  assert.equal(joiner.absentDays, 0); // days before joining are not absences

  // A full-month employee is unchanged: 25 of 25.
  const fullMonth = calculatePaymentDays({ ...october, attendanceRows: present("2026-10-31") });
  assert.equal(fullMonth.paymentDays, 25);
  assert.equal(fullMonth.totalWorkingDays, 25);
}
console.log("payrollPaymentDays: leavers and joiners are prorated on the month's 25 working days (P2)");

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
