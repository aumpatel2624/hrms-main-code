import assert from "node:assert/strict";
import { buildAttendanceRegister, dayStatus, monthDateKeys, shiftOn } from "./attendanceRegister.js";
import { isValidTimeZone, zonedDateKey, zonedWallTime } from "./zonedTime.js";

const IST = "Asia/Kolkata";

// zonedTime — wall clock <-> instant, including a daylight-saving zone.
assert.equal(zonedWallTime("2026-09-21", 9 * 60 + 30, IST).toISOString(), "2026-09-21T04:00:00.000Z");
assert.equal(zonedWallTime("2026-09-21", -30, IST).toISOString(), "2026-09-20T18:00:00.000Z"); // before midnight
assert.equal(zonedWallTime("2026-09-21", 0, "UTC").toISOString(), "2026-09-21T00:00:00.000Z");
assert.equal(zonedWallTime("2026-03-29", 12 * 60, "Europe/London").toISOString(), "2026-03-29T11:00:00.000Z"); // BST
assert.equal(zonedWallTime("2026-03-28", 12 * 60, "Europe/London").toISOString(), "2026-03-28T12:00:00.000Z"); // GMT
assert.equal(zonedDateKey("2026-09-20T18:30:00Z", IST), "2026-09-21");
assert.equal(zonedDateKey("2026-09-20T18:30:00Z", "UTC"), "2026-09-20");
assert.equal(isValidTimeZone(IST), true);
assert.equal(isValidTimeZone("Mars/Olympus"), false);
assert.equal(isValidTimeZone(""), false);

// monthDateKeys — month lengths, leap year.
assert.equal(monthDateKeys("2026-09").length, 30);
assert.equal(monthDateKeys("2026-10").at(-1), "2026-10-31");
assert.equal(monthDateKeys("2028-02").length, 29);

// shiftOn — inactive/cancelled/ended assignments are skipped; latest start wins.
const general = { _id: "g", shiftTypeName: "General Shift", startTime: "09:30", endTime: "18:30", lateEntryGracePeriod: 15, beginCheckInBeforeShiftStartTime: 60, holidayListId: "hl" };
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

// dayStatus — attendance wins, then leave, then holiday list; unmarked stays blank.
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

// buildAttendanceRegister — a September month read in IST, shaped like the dummy data.
const register = buildAttendanceRegister({
  month: "2026-09",
  timeZone: IST,
  assignments: [{ status: "active", startDate: "2026-04-01", endDate: null, shiftTypeId: general }],
  holidayAssignments: { company: [{ fromDate: "2026-01-01", holidayListId: "hl" }] },
  holidayLists: [{ _id: "hl", holidays: [
    { holidayDate: "2026-09-20", description: "Sunday", weeklyOff: true },
    { holidayDate: "2026-09-26", description: "Saturday", weeklyOff: true, isDeleted: true },
  ] }],
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
assert.equal(day("2026-09-21").shiftStart.toISOString(), "2026-09-21T04:00:00.000Z"); // 09:30 IST
assert.equal(day("2026-09-21").shiftEnd.toISOString(), "2026-09-21T13:00:00.000Z"); // 18:30 IST
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
assert.equal(day("2026-09-22").firstHalf, null); // unmarked working day stays blank
assert.equal(day("2026-09-20").firstHalf, "WO");
assert.equal(day("2026-09-26").firstHalf, null); // its holiday entry was deleted
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
assert.equal(nightDay("2026-09-10").shiftEnd.toISOString(), "2026-09-11T06:00:00.000Z");
assert.deepEqual(nightDay("2026-09-11").punches.map((punch) => punch._id), ["d1"]); // past the 07:00 check-out buffer
assert.equal(nightDay("2026-09-10").grossMinutes, 9 * 60 + 6);
assert.equal(nightDay("2026-09-10").lateInMinutes, 0); // 20:59, early
assert.equal(nightDay("2026-09-12").shift, null);
assert.equal(nightDay("2026-09-12").shiftStart, null);

console.log("attendanceRegister: all assertions passed");
