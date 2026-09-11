import EmployeeCheckin from "../models/EmployeeCheckin.js";
import Employee from "../models/Employee.js";
import ShiftType from "../models/ShiftType.js";
import ShiftLocation from "../models/ShiftLocation.js";
import ShiftAssignment from "../models/ShiftAssignment.js";
import ShiftSchedule from "../models/ShiftSchedule.js";
import HolidayList from "../models/HolidayList.js";
import Company from "../models/Company.js";
import { attendanceScope } from "./attendanceScope.js";
import { dayStart, isAssignmentCurrentlyActive, resolveShiftOccurrence } from "./shiftOccurrence.js";
import { haversineDistance } from "./geofence.js";

export const invalidShift = message => { throw Object.assign(new Error(message), { status: 400 }); };
export const validateShiftRecord = async (doc, previous, req) => {
  const name = doc.constructor.modelName;
  if (doc.employeeId) {
    const employee = await Employee.findOne({ $and: [{ _id: doc.employeeId }, await attendanceScope(req, false)] }).lean();
    if (!employee) invalidShift("Employee not available in your company");
    if (employee.status === "Inactive") invalidShift(`Transactions cannot be created for an Inactive Employee ${employee.employeeName}`);
    doc.companyId = employee.companyId;
    // Own-scope users must never create or reassign another employee's records.
    await attendanceScope(req);
    const own = req.user.dataScope === "own" || req.user.dataScope === "approver";
    if (own && String(req.user.employeeId) !== String(doc.employeeId)) invalidShift("You can only manage your own records");
    if (req.user.dataScope === "department" && String(employee.departmentId) !== String(req.employee?.departmentId || req.user.departmentId)) invalidShift("Employee is outside your department");
  }
  if (!doc.companyId || !await Company.exists({ _id: doc.companyId })) invalidShift("Company is required and must exist");
  const companyScope = await attendanceScope(req, false);
  if (!await Company.exists({ $and: [{ _id: doc.companyId }, companyScope.companyId ? { _id: companyScope.companyId } : {}] })) invalidShift("Company is outside your access");
  for (const [field, Model] of [["shiftTypeId", ShiftType], ["shiftLocationId", ShiftLocation], ["shiftScheduleId", ShiftSchedule], ["holidayListId", HolidayList]]) {
    if (doc[field] && !await Model.exists({ _id: doc[field], companyId: doc.companyId, isActive: true })) invalidShift(`${field} must belong to the same company and be active`);
  }
  await doc.validate();
  if (name === "ShiftType" && previous && previous.startTime !== doc.startTime && await EmployeeCheckin.exists({ shiftId: doc._id, attendanceId: null, skipAutoAttendance: false, offshift: false })) {
    invalidShift("Mark attendance for existing check-in/out logs before changing shift settings");
  }
  if (name === "ShiftAssignment") {
    doc.startDate = dayStart(doc.startDate);
    if (doc.endDate) doc.endDate = dayStart(doc.endDate);
    if (doc.endDate && doc.startDate > doc.endDate) invalidShift("Start date must be on or before end date");
    // Evaluate activity at the candidate's first date, not wall-clock today: historical overlaps still conflict.
    if (isAssignmentCurrentlyActive(doc, doc.startDate)) {
      const query = { employeeId: doc.employeeId, status: "active", _id: { $ne: doc._id },
        $or: [{ endDate: null }, { endDate: { $gte: doc.startDate } }],
      };
      if (doc.endDate) query.startDate = { $lte: doc.endDate };
      if (await ShiftAssignment.exists(query)) invalidShift("An active Shift Assignment already overlaps these dates for this employee");
    }
  }
  if (name === "ShiftScheduleAssignment") {
    if (doc.createShiftsAfter) doc.createShiftsAfter = dayStart(doc.createShiftsAfter);
    if (previous?.createShiftsAfter && doc.createShiftsAfter < previous.createShiftsAfter && await ShiftAssignment.exists({
      shiftScheduleAssignmentId: doc._id, status: "active",
      $or: [{ endDate: null }, { endDate: { $gte: doc.createShiftsAfter } }],
    })) invalidShift("Cannot move create shifts after backward: active generated assignments already exist at or after that date");
    if (previous && ["employeeId", "shiftScheduleId", "companyId"].some(f => String(doc[f]) !== String(previous[f])) && await ShiftAssignment.exists({ shiftScheduleAssignmentId: doc._id })) invalidShift("Cannot change employee or schedule after assignments have been generated; create a new schedule assignment");
  }
  if (name === "EmployeeCheckin") {
    if (previous?.attendanceId && (+doc.time !== +previous.time || String(doc.employeeId) !== String(previous.employeeId) || doc.logType !== previous.logType)) invalidShift("Time, employee and log type cannot be changed after this checkin is linked to attendance");
    if (!previous?.attendanceId) {
      const occurrence = await resolveShiftOccurrence(doc.employeeId, doc.time);
      doc.shiftId = occurrence?.shift._id || null;
      doc.offshift = !occurrence;
      const location = occurrence?.assignment.shiftLocationId && await ShiftLocation.findById(occurrence.assignment.shiftLocationId).lean();
      if (location?.latitude != null && location.longitude != null && location.checkinRadius > 0 && doc.latitude != null && doc.longitude != null &&
        haversineDistance(location.latitude, location.longitude, doc.latitude, doc.longitude) > location.checkinRadius) invalidShift("Checkin is outside the allowed Shift Location radius");
    }
  }
};
