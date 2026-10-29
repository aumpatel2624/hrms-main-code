// P11 (29 Oct functional test): the nightly absence sweep marked leavers
// Absent every day after their relieving date, because a leaver's shift
// assignment stays active. It now marks only days inside employment, for
// people who are not Left, Inactive or Suspended (ADR-068). Models are
// in-memory stand-ins; no database.
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";
import ShiftAssignment from "../models/ShiftAssignment.js";
import { isEmployedOn, processAbsenceSweep } from "./attendanceScheduler.js";

const oid = () => new mongoose.Types.ObjectId();
const query = (result) => {
  const chain = { populate: () => chain, lean: () => chain, then: (resolve, reject) => Promise.resolve(result).then(resolve, reject) };
  return chain;
};

const person = (employeeName, extra = {}) => ({
  _id: oid(), employeeName, companyId: oid(), status: "Active", dateOfJoining: new Date("2024-01-01"), relievingDate: null, ...extra,
});
const staff = person("current staff");
const people = [
  staff,
  person("Pratik, relieved 26 Oct and marked Left", { status: "Left", relievingDate: new Date("2026-10-26") }),
  person("relieved 26 Oct, status not yet changed", { relievingDate: new Date("2026-10-26") }),
  person("joins 30 Oct", { dateOfJoining: new Date("2026-10-30") }),
  person("suspended", { status: "Suspended" }),
  person("inactive", { status: "Inactive" }),
];
const shift = { _id: oid(), enableAutoAttendance: true, markAutoAttendanceOnHolidays: true };
const assignments = people.map((p) => ({
  _id: oid(), employeeId: p._id, shiftTypeId: shift, status: "active", isActive: true, startDate: new Date("2024-01-01"), endDate: null,
}));

ShiftAssignment.find = () => query(assignments);
Employee.findById = (id) => query(people.find((p) => String(p._id) === String(id)) ?? null);
Attendance.findOne = () => query(null);
const marked = [];
Attendance.create = async (row) => { marked.push(row); return row; };

// The 28 Oct run sweeps 27 Oct.
const result = await processAbsenceSweep(new Date("2026-10-28"));
assert.deepEqual(marked.map((row) => String(row.employeeId)), [String(staff._id)], "only current staff are marked absent");
assert.equal(marked[0].status, "Absent");
assert.equal(result.created, 1);
assert.equal(result.skipped, people.length - 1);

// The relieving day itself is still a working day; the joining day is the first one.
const day = (iso) => new Date(iso);
assert.equal(isEmployedOn(people[2], day("2026-10-26")), true, "relieving day is inside employment");
assert.equal(isEmployedOn(people[2], day("2026-10-27")), false, "the day after is not");
assert.equal(isEmployedOn(people[3], day("2026-10-29")), false, "the day before joining is not");
assert.equal(isEmployedOn(people[3], day("2026-10-30")), true, "joining day is");

console.log("attendanceScheduler: absence sweep marks only days inside employment (P11)");
