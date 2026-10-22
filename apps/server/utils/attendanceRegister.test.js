import assert from "node:assert/strict";
import { REGISTER_CODES } from "@demo-panel/shared/attendance";
import { buildAttendanceRegister, dayStatus, monthDateKeys, shiftOn } from "./attendanceRegister.js";

const IST = "Asia/Kolkata";

// monthDateKeys — month lengths, leap year.
assert.equal(monthDateKeys("2026-09").length, 30);
assert.equal(monthDateKeys("2026-10").at(-1), "2026-10-31");
assert.equal(monthDateKeys("2028-02").length, 29);

// shiftOn — inactive/cancelled/ended assignments are skipped; latest start wins.
const general = { _id: "g", shiftTypeName: "General Shift", startTime: "09:30", endTime: "18:30", lateEntryGracePeriod: 15, beginCheckInBeforeShiftStartTime: 60 };
const night = { _id: "n", shiftTypeName: "Night Shift", startTime: "22:00", endTime: "06:00", lateEntryGracePeriod: 0, beginCheckInBeforeShiftStartTime: 60 };
const assignments = [
  { status: "active", startDate: "2026-04-01", endDate: null, shiftTypeId: general },
  { status: "cancelled", startDate: "2026-09-10", endDate: null, shiftTypeId: night },
  { status: "active", startDate: "2026-09-25", endDate: "2026-09-26", shiftTypeId: night },
];
assert.equal(shiftOn(assignments, "2026-09-24")._id, "g");
assert.equal(shiftOn(assignments, "2026-09-25")._id, "n");
assert.equal(shiftOn(assignments, "2026-09-27")._id, "g"); // ended the day before
assert.equal(shiftOn(assignments, "2026-03-31"), null); // before any assignment

// dayStatus — attendance wins, then leave, then holiday list; unmarked takes the given code, else blank.
const lwp = { leaveTypeName: "Leave Without Pay", isLwp: true };
const casual = { leaveTypeName: "Casual Leave", isLwp: false };
assert.deepEqual(dayStatus({ status: "Present" }, null, [{ weeklyOff: true }], "2026-09-20"), { firstHalf: "PR", secondHalf: null, portion: 1, note: null });
assert.equal(dayStatus({ status: "Work From Home" }, null, [], "k").firstHalf, "WFH");
assert.equal(dayStatus({ status: "Absent" }, null, [], "k").firstHalf, "AB");
assert.deepEqual(dayStatus({ status: "On Leave", leaveTypeId: lwp }, null, [], "k"), { firstHalf: "LWP", secondHalf: null, portion: 1, note: "Leave Without Pay" });
assert.equal(dayStatus({ status: "On Leave", leaveTypeId: null }, { leaveTypeId: casual }, [], "k").firstHalf, "LV");
assert.deepEqual(dayStatus({ status: "Half Day", halfDayStatus: "Absent" }, null, [], "k"), { firstHalf: "HD", secondHalf: "AB", portion: 0.5, note: null });
assert.equal(dayStatus({ status: "Half Day", halfDayStatus: "" }, null, [], "k").secondHalf, null); // other half still pending
assert.equal(dayStatus({ status: "Half Day", leaveTypeId: casual }, null, [], "k").secondHalf, "LV");
assert.deepEqual(dayStatus(null, { leaveTypeId: lwp, halfDay: true, halfDayDate: "2026-09-25" }, [], "2026-09-25"), { firstHalf: "LWP", secondHalf: null, portion: 0.5, note: "Leave Without Pay" });
assert.equal(dayStatus(null, { leaveTypeId: casual, halfDay: true, halfDayDate: "2026-09-24" }, [], "2026-09-25").portion, 1);
assert.deepEqual(dayStatus(null, null, [{ weeklyOff: true, description: "Saturday" }], "k"), { firstHalf: "WO", secondHalf: null, portion: 1, note: "Saturday" });
assert.equal(dayStatus(null, null, [{ weeklyOff: true, description: "Saturday" }, { weeklyOff: false, description: "Independence Day" }], "k").note, "Independence Day");
assert.equal(dayStatus(null, null, [{ weeklyOff: true }, { weeklyOff: false }], "k").firstHalf, "HO");
assert.deepEqual(dayStatus(null, null, [], "k"), { firstHalf: null, secondHalf: null, portion: null, note: null });
assert.deepEqual(dayStatus(null, null, [], "k", "AB"), { firstHalf: "AB", secondHalf: null, portion: 1, note: null });
assert.equal(dayStatus(null, null, [{ weeklyOff: true }], "k", "AB").firstHalf, "WO");
// Leave skips a holiday unless its leave type counts holidays — as leave approval does.
assert.deepEqual(dayStatus(null, { leaveTypeId: casual }, [{ weeklyOff: true, description: "Sunday" }], "k"), { firstHalf: "WO", secondHalf: null, portion: 1, note: "Sunday" });
assert.equal(dayStatus(null, { leaveTypeId: { ...casual, includeHoliday: true } }, [{ weeklyOff: true }], "k").firstHalf, "LV");

// buildAttendanceRegister — a September month read in IST, shaped like the dummy data.
const register = buildAttendanceRegister({
  month: "2026-09",
  timeZone: IST,
  assignments: [{ status: "active", startDate: "2026-04-01", endDate: null, shiftTypeId: general }],
  holidayAssignments: { company: [{ fromDate: "2026-01-01", holidayListId: "hl" }] },
  holidayLists: [{ _id: "hl", holidays: [{ holidayDate: "2026-09-20", description: "Sunday", weeklyOff: true }] }],
  attendance: [
    { _id: "a1", attendanceDate: "2026-09-21", status: "Present", inTime: "2026-09-21T04:00:00Z", outTime: "2026-09-21T12:53:00Z", workingHours: 8.88 },
    { _id: "a2", attendanceDate: "2026-09-03", status: "Present", inTime: "2026-09-03T04:42:00Z", outTime: "2026-09-03T13:04:00Z" },
    { _id: "a3", attendanceDate: "2026-09-04", status: "Present", inTime: "2026-09-04T04:10:00Z", outTime: "2026-09-04T13:04:00Z" },
  ],
  leaves: [{ fromDate: "2026-09-25", toDate: "2026-09-25", leaveTypeId: lwp }],
  checkins: [
    // 21 Sep: four punches, 10:00-11:30 and 11:45-18:23 IST.
    { _id: "c2", time: "2026-09-21T06:00:00Z", logType: "OUT" },
    { _id: "c1", time: "2026-09-21T04:30:00Z", logType: "IN" },
    { _id: "c3", time: "2026-09-21T06:15:00Z", logType: "IN" },
    { _id: "c4", time: "2026-09-21T12:53:00Z", logType: "OUT" },
    // 22 Sep, 08:40 IST — inside the 60-minute buffer before 09:30, so it is the 22nd's punch.
    { _id: "c5", time: "2026-09-22T03:10:00Z", logType: "IN" },
    // 22 Sep, 20:00 IST — past the check-out buffer (19:30), so it falls back to its calendar date.
    { _id: "c6", time: "2026-09-22T14:30:00Z", logType: "OUT" },
    // 1 Oct, 08:00 IST — outside the month, ignored.
    { _id: "c7", time: "2026-10-01T02:30:00Z", logType: "IN" },
  ],
});
const day = (key) => register.days.find((row) => row.date === key);
assert.equal(register.days.length, 30);
assert.equal(day("2026-09-21").weekday, "Mon");
assert.equal(day("2026-09-21").shift.name, "General Shift");
assert.equal(day("2026-09-21").cutOffStart.toISOString(), "2026-09-21T03:00:00.000Z"); // 08:30 IST, 60 min before 09:30
assert.equal(day("2026-09-21").cutOffEnd.toISOString(), "2026-09-21T14:00:00.000Z"); // 19:30 IST, 60 min after 18:30
assert.deepEqual(day("2026-09-21").punches.map((punch) => punch._id), ["c1", "c2", "c3", "c4"]);
assert.equal(day("2026-09-21").inTime, "2026-09-21T04:30:00Z"); // the first punch wins over the Attendance row
assert.equal(day("2026-09-21").grossMinutes, 8 * 60 + 23);
assert.equal(day("2026-09-21").netPunchMinutes, 90 + 398); // 1:30 + 6:38
assert.equal(day("2026-09-21").breakMinutes, 15);
assert.equal(day("2026-09-21").lateInMinutes, 30); // 10:00 IST, past the 15-minute grace
assert.equal(day("2026-09-03").inTime, "2026-09-03T04:42:00Z"); // no punches, the Attendance row fills in
assert.equal(day("2026-09-03").lateInMinutes, 42); // 10:12 IST
assert.equal(day("2026-09-04").lateInMinutes, 0); // 09:40 IST, inside the grace
assert.equal(day("2026-09-03").netPunchMinutes, null); // no punches, so no punch hours
assert.deepEqual(day("2026-09-22").punches.map((punch) => punch._id), ["c5", "c6"]);
assert.equal(day("2026-09-22").inTime, "2026-09-22T03:10:00Z"); // no Attendance row, punches fill in
assert.equal(day("2026-09-22").outTime, "2026-09-22T14:30:00Z");
assert.equal(day("2026-09-22").firstHalf, null); // unmarked working day, no payroll setting given: blank
assert.equal(day("2026-09-20").firstHalf, "WO");
assert.equal(day("2026-09-25").firstHalf, "LWP");
assert.equal(day("2026-09-25").inTime, null);
assert.deepEqual(register.summary, { PR: 3, WO: 1, LWP: 1 });

// Night shift: after-midnight punches belong to the shift's own day; no shift means a calendar day.
const nightRegister = buildAttendanceRegister({
  month: "2026-09",
  timeZone: "UTC",
  assignments: [{ status: "active", startDate: "2026-09-10", endDate: "2026-09-10", shiftTypeId: night }],
  checkins: [
    { _id: "n1", time: "2026-09-10T21:55:00Z", logType: "IN" },
    { _id: "n2", time: "2026-09-11T06:05:00Z", logType: "OUT" },
    { _id: "d1", time: "2026-09-11T09:00:00Z", logType: "IN" },
    { _id: "d2", time: "2026-09-10T20:59:00Z", logType: "IN" },
  ],
});
const nightDay = (key) => nightRegister.days.find((row) => row.date === key);
assert.deepEqual(nightDay("2026-09-10").punches.map((punch) => punch._id), ["d2", "n1", "n2"]);
assert.equal(nightDay("2026-09-10").cutOffStart.toISOString(), "2026-09-10T21:00:00.000Z");
assert.equal(nightDay("2026-09-10").cutOffEnd.toISOString(), "2026-09-11T07:00:00.000Z");
assert.deepEqual(nightDay("2026-09-11").punches.map((punch) => punch._id), ["d1"]); // past the 07:00 check-out buffer
assert.equal(nightDay("2026-09-10").grossMinutes, 9 * 60 + 6);
assert.equal(nightDay("2026-09-10").lateInMinutes, 0); // 20:59, early
assert.equal(nightDay("2026-09-12").shift, null);
assert.equal(nightDay("2026-09-12").cutOffStart, null);

// Leave over a weekly off: Fri 18 - Mon 21 Sep, Sat/Sun off. Approval writes On Leave rows only for the
// working days, and the off days stay WO unless the leave type counts holidays.
const weekend = { _id: "we", holidays: [
  { holidayDate: "2026-09-19", description: "Saturday", weeklyOff: true },
  { holidayDate: "2026-09-20", description: "Sunday", weeklyOff: true },
] };
const companyWeekend = { company: [{ fromDate: "2026-01-01", holidayListId: "we" }] };
// Holidays come from Holiday List Assignments only — the order leave approval and payroll resolve them
// in — never from the Shift Type's own list.
const shiftListOnly = buildAttendanceRegister({
  month: "2026-09", timeZone: IST, holidayLists: [weekend],
  assignments: [{ status: "active", startDate: "2026-04-01", endDate: null, shiftTypeId: { ...general, holidayListId: "we" } }],
});
assert.deepEqual(shiftListOnly.summary, {});
const leaveRegister = (leaveTypeId, attendance) => buildAttendanceRegister({
  month: "2026-09", timeZone: IST, holidayAssignments: companyWeekend, holidayLists: [weekend], attendance,
  leaves: [{ fromDate: "2026-09-18", toDate: "2026-09-21", leaveTypeId }],
});
const onLeave = (date) => ({ _id: date, attendanceDate: date, status: "On Leave", leaveTypeId: casual });
assert.deepEqual(leaveRegister(casual, [onLeave("2026-09-18"), onLeave("2026-09-21")]).summary, { LV: 2, WO: 2 });
assert.deepEqual(leaveRegister(casual, []).summary, { LV: 2, WO: 2 });
assert.equal(leaveRegister(casual, []).days.find((row) => row.date === "2026-09-19").note, "Saturday");
assert.deepEqual(leaveRegister({ ...casual, includeHoliday: true }, []).summary, { LV: 4 });

// Unmarked days follow PayrollSettings.considerUnmarkedAttendanceAs: past days of employment only,
// never a holiday, today or a later day. Joined 3 Sep, relieved 21 Sep, read on 23 Sep.
const unmarkedRegister = (unmarkedAs) => buildAttendanceRegister({
  month: "2026-09", timeZone: IST, today: "2026-09-23", unmarkedAs, dateOfJoining: "2026-09-03", relievingDate: "2026-09-21",
  holidayAssignments: companyWeekend, holidayLists: [weekend],
  attendance: [{ _id: "p", attendanceDate: "2026-09-04", status: "Present" }],
});
const absentFill = unmarkedRegister("Absent");
const fillDay = (key) => absentFill.days.find((row) => row.date === key);
assert.equal(fillDay("2026-09-02").firstHalf, null); // before joining
assert.deepEqual([fillDay("2026-09-03").firstHalf, fillDay("2026-09-03").portion], ["AB", 1]);
assert.equal(fillDay("2026-09-04").firstHalf, "PR"); // marked
assert.equal(fillDay("2026-09-19").firstHalf, "WO");
assert.equal(fillDay("2026-09-21").firstHalf, "AB"); // the relieving day still counts
assert.equal(fillDay("2026-09-22").firstHalf, null); // after relieving
assert.equal(fillDay("2026-09-23").firstHalf, null); // today
assert.deepEqual(absentFill.summary, { AB: 16, PR: 1, WO: 2 });
assert.deepEqual(unmarkedRegister("Present").summary, { PR: 17, WO: 2 });
assert.deepEqual(unmarkedRegister(null).summary, { PR: 1, WO: 2 });

// Every code the register emits is one the admin can label.
for (const { days } of [register, nightRegister, leaveRegister(casual, []), absentFill]) {
  for (const row of days) for (const code of [row.firstHalf, row.secondHalf]) if (code) assert.ok(code in REGISTER_CODES, code);
}

console.log("attendanceRegister: all assertions passed");
