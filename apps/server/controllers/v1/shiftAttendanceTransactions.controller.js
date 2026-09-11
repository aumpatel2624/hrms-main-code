/**
 * Shift & Attendance (ADR-025, HRMS module 9 — second/transactional fork):
 * ShiftRequest, AttendanceRequest, the Shift Assignment Tool and Employee
 * Attendance Tool bulk-action endpoints. Kept in its own file/route pair
 * rather than grown onto shiftAttendance.controller.js — same "large
 * module, own file" split Leaves used for its own second fork
 * (leavesTransactions.controller.js).
 *
 * `ShiftRequest`/`AttendanceRequest` are NOT part of the `attendanceScope`
 * company-confinement family (that helper's own file header scopes it to
 * the foundation's six collections + Attendance) — these two follow the
 * plain `buildScopeFilter` self-service pattern every other module uses
 * (LeaveApplication, CompensatoryLeaveRequest), with the same
 * override-`id`-to-the-Employee-id trick `attendanceScope` itself uses
 * internally, since `buildScopeFilter`'s `own` dimension compares against
 * the login User's own id, not the Employee id these two collections key
 * their `employeeId` field on.
 */
import { runListQuery } from "../../utils/listQuery.js";
import { resolveApprovers } from "../../utils/approvers.js";
import { resolveRequestEmployee } from "../../utils/requestEmployee.js";
import { buildScopeFilter } from "../../utils/scope.js";
import { sameCalendarDay } from "../../utils/leaveDayCalculation.js";
import { isHolidayForEmployee } from "../../utils/holidayResolution.js";
import { saveShiftRecord } from "../../utils/shiftAssignmentWrite.js";
import { generateShiftsForScheduleAssignment } from "./shiftAttendance.controller.js";
import { SCOPES } from "@demo-panel/shared/scopes";
import { ROLES } from "@demo-panel/shared/roles";

import ShiftRequest from "../../models/ShiftRequest.js";
import AttendanceRequest from "../../models/AttendanceRequest.js";
import ShiftType from "../../models/ShiftType.js";
import ShiftAssignment from "../../models/ShiftAssignment.js";
import ShiftScheduleAssignment from "../../models/ShiftScheduleAssignment.js";
import Employee from "../../models/Employee.js";
import Attendance from "../../models/Attendance.js";

const addDays = (date, days) => new Date(new Date(date).getTime() + days * 86400000);

const shiftFailure = (res, error) => {
  if (error.status === 400 || error.name === "ValidationError" || error.name === "CastError" || error.code === 11000) {
    return res.status(400).json({ isOk: false, status: 400, message: error.code === 11000 ? "A record with these unique values already exists" : error.message });
  }
  console.error("Shift & Attendance transactions request failed", error);
  return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
};

/** Own-scope filter for ShiftRequest/AttendanceRequest — see file header. */
const employeeOwnScopeFilter = async (req) => {
  const employee = await resolveRequestEmployee(req);
  return buildScopeFilter({ ...req.user, id: employee?._id }, { owner: "employeeId" });
};

/** Defense-in-depth guard mirroring LeaveApplication's canAccessLeaveApplication (own-scope only, no approver dimension here). */
const canAccessOwnRecord = async (req, doc) => {
  if (!req.user || req.user.role === ROLES.ADMIN) return true;
  if (req.user.dataScope !== SCOPES.OWN) return true;
  await resolveRequestEmployee(req);
  return String(req.user.employeeId) === String(doc.employeeId);
};

// ================================================================ ShiftRequest --
// Docstatus folding (ADR-016/025): `status` (open/approved/rejected) +
// `approve`/`reject` actions, same shape as LeaveApplication — approve
// creates the real downstream record (a ShiftAssignment, via the existing
// write-locked saveShiftRecord — never bypassed), reject does nothing
// further.

export const SHIFTREQUEST_FIELDS = ["shiftTypeId", "employeeId", "companyId", "approverId", "fromDate", "toDate"];

/** Other OPEN/APPROVED Shift Requests for this employee whose date range overlaps [fromDate, toDate-or-open-ended]. */
const findOverlappingShiftRequests = (employeeId, fromDate, toDate, excludeId) => {
  const query = {
    employeeId,
    status: { $in: ["open", "approved"] },
    $or: [{ toDate: null }, { toDate: { $gte: fromDate } }],
  };
  if (excludeId) query._id = { $ne: excludeId };
  if (toDate) query.fromDate = { $lte: toDate };
  return ShiftRequest.find(query).lean();
};

/**
 * ADR-025's simplified stand-in for source's timing-overlap check: this
 * project keeps the existing one-row-per-employee-per-day invariant (no
 * multi-shift-per-day — ADR-025), so an existing ACTIVE Shift Assignment
 * overlapping the requested range is treated as the "actual shift timing"
 * conflict, rather than a real start/end-time overlap test that would only
 * matter if multiple concurrent shifts were allowed.
 */
const findOverlappingShiftAssignment = (employeeId, fromDate, toDate) => {
  const query = {
    employeeId, status: "active",
    $or: [{ endDate: null }, { endDate: { $gte: fromDate } }],
  };
  if (toDate) query.startDate = { $lte: toDate };
  return ShiftAssignment.exists(query);
};

/** Shared by create and update — never throws, returns `{ error }` or the resolved fields to persist. */
const runShiftRequestValidation = async (data, { excludeId = null } = {}) => {
  const { employeeId, shiftTypeId, fromDate } = data;
  if (!employeeId || !shiftTypeId || !fromDate) {
    return { error: { status: 400, message: "Employee, Shift Type and From Date are required" } };
  }
  const toDate = data.toDate ? new Date(data.toDate) : null;
  const from = new Date(fromDate);
  if (toDate && from > toDate) {
    return { error: { status: 400, message: "To date can not be less than from date" } };
  }

  const employee = await Employee.findById(employeeId).lean();
  if (!employee) return { error: { status: 404, message: "Employee not found" } };
  if (employee.status === "Inactive") {
    return { error: { status: 400, message: `Transactions cannot be created for an Inactive Employee ${employee.employeeName}` } };
  }

  const shiftType = await ShiftType.findById(shiftTypeId).lean();
  if (!shiftType) return { error: { status: 404, message: "Shift Type not found" } };

  const overlappingRequests = await findOverlappingShiftRequests(employeeId, from, toDate, excludeId);
  if (overlappingRequests.length > 0) {
    const other = overlappingRequests[0];
    return {
      error: {
        status: 400,
        message: `Employee already has a Shift Request between ${new Date(other.fromDate).toDateString()} and ${other.toDate ? new Date(other.toDate).toDateString() : "open-ended"} that overlaps with this period`,
      },
    };
  }

  const overlappingAssignment = await findOverlappingShiftAssignment(employeeId, from, toDate);
  if (overlappingAssignment) {
    return { error: { status: 400, message: "Employee already has an active Shift Assignment that overlaps with this period" } };
  }

  // Approver resolution — reuses resolveApprovers("shiftRequest") AS-IS
  // (ADR-024/025): direct-field-wins-else-department-ancestor-chain-union,
  // not a narrower single-level rule.
  let approverId = data.approverId || null;
  const resolvedApprovers = await resolveApprovers(employeeId, "shiftRequest");
  if (!approverId) {
    if (resolvedApprovers.length === 0) {
      return { error: { status: 400, message: "Please set a Shift Approver for this Employee or their Department" } };
    }
    [approverId] = resolvedApprovers;
  } else if (resolvedApprovers.length > 0 && !resolvedApprovers.includes(String(approverId))) {
    return { error: { status: 400, message: "The supplied Shift Approver is not a resolved approver for this Employee" } };
  }

  return { companyId: employee.companyId, approverId };
};

export const createShiftRequest = async (req, res) => {
  try {
    const result = await runShiftRequestValidation(req.body);
    if (result.error) return res.status(result.error.status).json({ isOk: false, status: result.error.status, message: result.error.message });

    const doc = await ShiftRequest.create({
      shiftTypeId: req.body.shiftTypeId,
      employeeId: req.body.employeeId,
      companyId: result.companyId,
      approverId: result.approverId,
      fromDate: req.body.fromDate,
      toDate: req.body.toDate || null,
    });

    return res.status(201).json({ isOk: true, status: 201, message: "Shift Request created successfully", data: { _id: doc._id } });
  } catch (error) {
    console.log("Error in createShiftRequest", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateShiftRequest = async (req, res) => {
  try {
    const doc = await ShiftRequest.findById(req.params.shiftRequestId);
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Shift Request not found" });
    if (!(await canAccessOwnRecord(req, doc))) {
      return res.status(403).json({ isOk: false, status: 403, message: "You do not have permission to edit this Shift Request" });
    }
    if (doc.status !== "open") {
      return res.status(400).json({ isOk: false, status: 400, message: `Cannot edit a ${doc.status} Shift Request` });
    }

    const merged = { ...doc.toObject(), ...req.body };
    const result = await runShiftRequestValidation(merged, { excludeId: doc._id });
    if (result.error) return res.status(result.error.status).json({ isOk: false, status: result.error.status, message: result.error.message });

    const EDITABLE_FIELDS = ["shiftTypeId", "employeeId", "fromDate", "toDate"];
    for (const field of EDITABLE_FIELDS) if (req.body[field] !== undefined) doc[field] = req.body[field];
    doc.companyId = result.companyId;
    doc.approverId = result.approverId;
    await doc.save();

    return res.status(200).json({ isOk: true, status: 200, message: "Shift Request updated successfully" });
  } catch (error) {
    console.log("Error in updateShiftRequest", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getShiftRequestById = async (req, res) => {
  try {
    const doc = await ShiftRequest.findById(req.params.shiftRequestId);
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Shift Request not found" });
    if (!(await canAccessOwnRecord(req, doc))) {
      return res.status(403).json({ isOk: false, status: 403, message: "You do not have permission to view this Shift Request" });
    }
    await doc.populate([
      { path: "employeeId", select: "employeeName employeeCode" },
      { path: "shiftTypeId", select: "shiftTypeName" },
      { path: "companyId", select: "companyName" },
      { path: "approverId", select: "userName" },
    ]);
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getShiftRequestById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listShiftRequestByParams = async (req, res) => {
  try {
    const scopeFilter = await employeeOwnScopeFilter(req);
    const list = await runListQuery(ShiftRequest, req.body, {
      searchFields: [],
      filterable: {
        employeeId: "objectId",
        shiftTypeId: "objectId",
        companyId: "objectId",
        approverId: "objectId",
        status: "string",
        fromDate: "date",
        toDate: "date",
        createdAt: "date",
      },
      stages: [
        { $lookup: { from: "employees", localField: "employeeId", foreignField: "_id", as: "employeeId_joined" } },
        { $addFields: { employeeIdLabel: { $arrayElemAt: ["$employeeId_joined.employeeName", 0] } } },
        { $project: { employeeId_joined: 0 } },
        { $lookup: { from: "shifttypes", localField: "shiftTypeId", foreignField: "_id", as: "shiftTypeId_joined" } },
        { $addFields: { shiftTypeIdLabel: { $arrayElemAt: ["$shiftTypeId_joined.shiftTypeName", 0] } } },
        { $project: { shiftTypeId_joined: 0 } },
      ],
      scopeFilter,
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log("Error in listShiftRequestByParams", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

/**
 * POST /shift-requests/:id/approve — creates a ShiftAssignment through the
 * existing write-locked saveShiftRecord (never a bypass), referencing
 * shiftTypeId/employeeId/companyId/fromDate (as startDate)/toDate (as
 * endDate). Same shape as LeaveApplication.approve.
 */
export const approveShiftRequest = async (req, res) => {
  try {
    const doc = await ShiftRequest.findById(req.params.shiftRequestId);
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Shift Request not found" });
    if (doc.status !== "open") {
      return res.status(400).json({ isOk: false, status: 400, message: `Only an open request can be approved (current status: ${doc.status})` });
    }

    const assignment = new ShiftAssignment({
      employeeId: doc.employeeId,
      shiftTypeId: doc.shiftTypeId,
      companyId: doc.companyId,
      startDate: doc.fromDate,
      endDate: doc.toDate || null,
      status: "active",
    });
    await saveShiftRecord(assignment, null, req);

    doc.status = "approved";
    await doc.save();

    return res.status(200).json({ isOk: true, status: 200, message: "Shift Request approved successfully", data: { shiftAssignmentId: assignment._id } });
  } catch (error) {
    return shiftFailure(res, error);
  }
};

export const rejectShiftRequest = async (req, res) => {
  try {
    const doc = await ShiftRequest.findById(req.params.shiftRequestId);
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Shift Request not found" });
    if (doc.status !== "open") {
      return res.status(400).json({ isOk: false, status: 400, message: `Only an open request can be rejected (current status: ${doc.status})` });
    }
    doc.status = "rejected";
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Shift Request rejected" });
  } catch (error) {
    console.log("Error in rejectShiftRequest", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// =========================================================== AttendanceRequest --
// ADR-025: "create IS the action" — no separate approval step (source's own
// submit-does-everything shape). Create directly writes/updates one
// Attendance row per covered day; `cancel` soft-deletes exactly the rows it
// created (Attendance.attendanceRequestId back-ref), reusing
// LeaveApplication.cancel's soft-delete-reversal pattern (ADR-024).

export const ATTENDANCEREQUEST_FIELDS = ["employeeId", "companyId", "fromDate", "toDate", "halfDay", "includeHolidays", "halfDayDate", "reason", "explanation"];

const runAttendanceRequestValidation = async (data, { excludeId = null } = {}) => {
  const { employeeId, fromDate, toDate, reason } = data;
  if (!employeeId || !fromDate || !toDate || !reason) {
    return { error: { status: 400, message: "Employee, From Date, To Date and Reason are required" } };
  }
  if (!["Work From Home", "On Duty"].includes(reason)) {
    return { error: { status: 400, message: "Reason must be Work From Home or On Duty" } };
  }

  const employee = await Employee.findById(employeeId).lean();
  if (!employee) return { error: { status: 404, message: "Employee not found" } };
  if (employee.status === "Inactive") {
    return { error: { status: 400, message: `Transactions cannot be created for an Inactive Employee ${employee.employeeName}` } };
  }

  const from = new Date(fromDate);
  const to = new Date(toDate);
  if (from > to) return { error: { status: 400, message: "To date can not be less than from date" } };
  if (employee.dateOfJoining && from < new Date(employee.dateOfJoining)) {
    return { error: { status: 400, message: "From date can not be less than employee's joining date" } };
  }
  if (employee.relievingDate && to > new Date(employee.relievingDate)) {
    return { error: { status: 400, message: "To date can not greater than employee's relieving date" } };
  }

  if (data.halfDay) {
    const hd = data.halfDayDate ? new Date(data.halfDayDate) : null;
    if (!hd || hd < from || hd > to) {
      return { error: { status: 400, message: "Half day date should be in between from date and to date" } };
    }
  }

  const overlapQuery = {
    employeeId, status: "active",
    toDate: { $gte: from }, fromDate: { $lte: to },
  };
  if (excludeId) overlapQuery._id = { $ne: excludeId };
  const overlap = await AttendanceRequest.findOne(overlapQuery).lean();
  if (overlap) {
    return { error: { status: 400, message: `Employee ${employee.employeeName} already has an Attendance Request that overlaps with this period` } };
  }

  return { companyId: employee.companyId };
};

/** Attendance Request.md's get_attendance_status — half day date wins, then Work From Home, else Present (covers "On Duty"). */
const targetAttendanceStatus = (doc, date) => {
  if (doc.halfDay && doc.halfDayDate && sameCalendarDay(doc.halfDayDate, date)) return "Half Day";
  if (doc.reason === "Work From Home") return "Work From Home";
  return "Present";
};

/**
 * One day of `create_or_update_attendance`/`should_mark_attendance`: skips a
 * holiday (unless includeHolidays) and skips a day that already has an
 * approved-leave-backed Attendance row (carries leaveApplicationId — ADR-025's
 * explicit simplification, matching the auto-attendance job's own skip
 * rule), otherwise upserts the Attendance row with the target status and the
 * attendanceRequestId back-ref.
 */
const markAttendanceForRequestDay = async (doc, date) => {
  if (!doc.includeHolidays && await isHolidayForEmployee(doc.employeeId, date)) {
    return { date, marked: false, reason: "Holiday" };
  }
  const existing = await Attendance.findOne({ employeeId: doc.employeeId, attendanceDate: date }).lean();
  if (existing?.leaveApplicationId) {
    return { date, marked: false, reason: "On Leave" };
  }

  const status = targetAttendanceStatus(doc, date);
  await Attendance.findOneAndUpdate(
    { employeeId: doc.employeeId, attendanceDate: date },
    {
      employeeId: doc.employeeId,
      companyId: doc.companyId,
      attendanceDate: date,
      status,
      attendanceRequestId: doc._id,
      halfDayStatus: status === "Half Day" ? "Absent" : (existing?.halfDayStatus || ""),
      isActive: true,
    },
    { upsert: true, setDefaultsOnInsert: true },
  );
  return { date, marked: true, reason: null };
};

export const createAttendanceRequest = async (req, res) => {
  try {
    const result = await runAttendanceRequestValidation(req.body);
    if (result.error) return res.status(result.error.status).json({ isOk: false, status: result.error.status, message: result.error.message });

    const doc = await AttendanceRequest.create({
      employeeId: req.body.employeeId,
      companyId: result.companyId,
      fromDate: req.body.fromDate,
      toDate: req.body.toDate,
      halfDay: Boolean(req.body.halfDay),
      includeHolidays: Boolean(req.body.includeHolidays),
      halfDayDate: req.body.halfDay ? req.body.halfDayDate : null,
      reason: req.body.reason,
      explanation: req.body.explanation || "",
    });

    const days = [];
    let cursor = new Date(doc.fromDate);
    const to = new Date(doc.toDate);
    while (cursor <= to) {
      days.push(await markAttendanceForRequestDay(doc, cursor)); // eslint-disable-line no-await-in-loop
      cursor = addDays(cursor, 1);
    }

    return res.status(201).json({
      isOk: true, status: 201, message: "Attendance Request created successfully",
      data: { _id: doc._id, days },
    });
  } catch (error) {
    console.log("Error in createAttendanceRequest", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

/**
 * Defense-in-depth guard (same shape as LeaveEncashment.updateLeaveEncashment,
 * issue #11) — this collection is immutable once created (create is the
 * action, cancel is the only reversal), but `/cancel` needs `edit`
 * permission on this menu row, which also makes the generic edit form
 * reachable — this returns a clean 400 instead of a silent crash.
 */
export const updateAttendanceRequest = async (req, res) =>
  res.status(400).json({ isOk: false, status: 400, message: "An Attendance Request cannot be edited after creation — cancel it and create a new one instead." });

export const getAttendanceRequestById = async (req, res) => {
  try {
    const doc = await AttendanceRequest.findById(req.params.attendanceRequestId);
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Attendance Request not found" });
    if (!(await canAccessOwnRecord(req, doc))) {
      return res.status(403).json({ isOk: false, status: 403, message: "You do not have permission to view this Attendance Request" });
    }
    await doc.populate([
      { path: "employeeId", select: "employeeName employeeCode" },
      { path: "companyId", select: "companyName" },
    ]);
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getAttendanceRequestById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listAttendanceRequestByParams = async (req, res) => {
  try {
    const scopeFilter = await employeeOwnScopeFilter(req);
    const list = await runListQuery(AttendanceRequest, req.body, {
      searchFields: ["explanation"],
      filterable: {
        employeeId: "objectId",
        companyId: "objectId",
        status: "string",
        reason: "string",
        fromDate: "date",
        toDate: "date",
        createdAt: "date",
      },
      stages: [
        { $lookup: { from: "employees", localField: "employeeId", foreignField: "_id", as: "employeeId_joined" } },
        { $addFields: { employeeIdLabel: { $arrayElemAt: ["$employeeId_joined.employeeName", 0] } } },
        { $project: { employeeId_joined: 0 } },
      ],
      scopeFilter,
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log("Error in listAttendanceRequestByParams", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const cancelAttendanceRequest = async (req, res) => {
  try {
    const doc = await AttendanceRequest.findById(req.params.attendanceRequestId);
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Attendance Request not found" });
    if (!(await canAccessOwnRecord(req, doc))) {
      return res.status(403).json({ isOk: false, status: 403, message: "You do not have permission to act on this Attendance Request" });
    }
    if (doc.status !== "active") {
      return res.status(400).json({ isOk: false, status: 400, message: `Only an active Attendance Request can be cancelled (current status: ${doc.status})` });
    }

    await Attendance.updateMany({ attendanceRequestId: doc._id }, { isDeleted: true });

    doc.status = "cancelled";
    await doc.save();

    return res.status(200).json({ isOk: true, status: 200, message: "Attendance Request cancelled successfully" });
  } catch (error) {
    console.log("Error in cancelAttendanceRequest", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// =========================================================== Shift Assignment Tool --
// Stateless bulk-action form (ADR-025/source: a Frappe Single with
// hide_toolbar) — no stored model, three bulk-action endpoints, each with
// per-item try/catch isolation so one employee's/request's failure never
// aborts the batch. Judgment call: the request shape here is an explicit
// employee-id (or shift-request-id) list per item — the filter-based
// quick-select ("Branch/Department/Designation/Grade/Employment Type") the
// real tool also offers is a nice-to-have per the task brief, not built here
// to keep this endpoint's surface controlled; the admin page can still let
// an HR user multi-select from the full employee list, same as Leave Control
// Panel already does.

/** Shared by bulk-assign — creates one ShiftAssignment for one item, or throws. Goes through the same write-locked saveShiftRecord as every other Shift Assignment write. */
const createOneShiftAssignment = async (item, req) => {
  const { employeeId, shiftTypeId, startDate } = item;
  if (!employeeId || !shiftTypeId || !startDate) throw new Error("Employee, Shift Type and Start Date are required");
  const employee = await Employee.findById(employeeId).lean();
  if (!employee) throw new Error("Employee not found");

  const assignment = new ShiftAssignment({
    employeeId,
    shiftTypeId,
    shiftLocationId: item.shiftLocationId || null,
    companyId: employee.companyId,
    startDate,
    endDate: item.endDate || null,
    status: "active",
  });
  await saveShiftRecord(assignment, null, req);
  return assignment;
};

/** POST /shift-assignment-tool/bulk-assign — body: `{ items: [{ employeeId, shiftTypeId, shiftLocationId?, startDate, endDate? }] }`. */
export const bulkAssignShifts = async (req, res) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (items.length === 0) {
      return res.status(400).json({ isOk: false, status: 400, message: "Please select at least one employee to perform this action" });
    }

    const results = [];
    for (const item of items) {
      try {
        const assignment = await createOneShiftAssignment(item, req); // eslint-disable-line no-await-in-loop
        results.push({ employeeId: String(item.employeeId), success: true, shiftAssignmentId: String(assignment._id) });
      } catch (itemError) {
        results.push({ employeeId: String(item.employeeId || ""), success: false, error: itemError.message });
      }
    }

    return res.status(200).json({ isOk: true, status: 200, message: "Bulk shift assignment run complete", data: { results } });
  } catch (error) {
    console.log("Error in bulkAssignShifts", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

/**
 * POST /shift-assignment-tool/bulk-assign-schedule — body: `{ items: [{
 * employeeId, shiftScheduleId, shiftLocationId?, startDate?, endDate? }] }`.
 * Creates a ShiftScheduleAssignment per item, then immediately calls
 * `generateShiftsForScheduleAssignment` (the exact function
 * shiftAttendance.controller.js's own `generate` action uses) — matching
 * source's "bulk-assigning a schedule eagerly generates the first batch of
 * Shift Assignments synchronously" behavior, not a separate/duplicated copy
 * of that generation algorithm.
 */
export const bulkAssignShiftSchedules = async (req, res) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (items.length === 0) {
      return res.status(400).json({ isOk: false, status: 400, message: "Please select at least one employee to perform this action" });
    }

    const results = [];
    for (const item of items) {
      try {
        const { employeeId, shiftScheduleId } = item;
        if (!employeeId || !shiftScheduleId) throw new Error("Employee and Shift Schedule are required");
        const employee = await Employee.findById(employeeId).lean(); // eslint-disable-line no-await-in-loop
        if (!employee) throw new Error("Employee not found");

        const scheduleAssignment = new ShiftScheduleAssignment({
          employeeId,
          shiftScheduleId,
          shiftLocationId: item.shiftLocationId || null,
          companyId: employee.companyId,
          enabled: true,
          createShiftsAfter: item.startDate || undefined,
          status: "active",
        });
        await saveShiftRecord(scheduleAssignment, null, req); // eslint-disable-line no-await-in-loop

        const generateResult = await generateShiftsForScheduleAssignment(scheduleAssignment._id, req, item.endDate); // eslint-disable-line no-await-in-loop
        results.push({ employeeId: String(employeeId), success: true, shiftScheduleAssignmentId: String(scheduleAssignment._id), generate: generateResult });
      } catch (itemError) {
        results.push({ employeeId: String(item.employeeId || ""), success: false, error: itemError.message });
      }
    }

    return res.status(200).json({ isOk: true, status: 200, message: "Bulk shift schedule assignment run complete", data: { results } });
  } catch (error) {
    console.log("Error in bulkAssignShiftSchedules", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

/** POST /shift-assignment-tool/process-requests — body: `{ items: [{ shiftRequestId, decision: "approve"|"reject" }] }`. Calls the same approve/reject logic as the single-record actions, per item. */
export const bulkProcessShiftRequests = async (req, res) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (items.length === 0) {
      return res.status(400).json({ isOk: false, status: 400, message: "Please select at least one Shift Request to perform this action" });
    }

    const results = [];
    for (const item of items) {
      try {
        const { shiftRequestId, decision } = item;
        if (!shiftRequestId || !["approve", "reject"].includes(decision)) throw new Error("Shift Request and a decision of approve or reject are required");
        const doc = await ShiftRequest.findById(shiftRequestId); // eslint-disable-line no-await-in-loop
        if (!doc) throw new Error("Shift Request not found");
        if (doc.status !== "open") throw new Error(`Only an open request can be processed (current status: ${doc.status})`);

        if (decision === "approve") {
          const assignment = new ShiftAssignment({
            employeeId: doc.employeeId, shiftTypeId: doc.shiftTypeId, companyId: doc.companyId,
            startDate: doc.fromDate, endDate: doc.toDate || null, status: "active",
          });
          await saveShiftRecord(assignment, null, req); // eslint-disable-line no-await-in-loop
          doc.status = "approved";
        } else {
          doc.status = "rejected";
        }
        await doc.save(); // eslint-disable-line no-await-in-loop

        results.push({ shiftRequestId: String(shiftRequestId), success: true, status: doc.status });
      } catch (itemError) {
        results.push({ shiftRequestId: String(item.shiftRequestId || ""), success: false, error: itemError.message });
      }
    }

    return res.status(200).json({ isOk: true, status: 200, message: "Bulk shift request processing complete", data: { results } });
  } catch (error) {
    console.log("Error in bulkProcessShiftRequests", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// ======================================================= Employee Attendance Tool --
// HR-Manager-only per ADR-025/source. Same "explicit id list" judgment call
// as the Shift Assignment Tool above.

/** POST /employee-attendance-tool/mark — body: `{ date, status, employeeIds: [] }`. Per-item isolation. */
export const bulkMarkAttendance = async (req, res) => {
  try {
    const { date, status } = req.body;
    const employeeIds = Array.isArray(req.body.employeeIds) ? req.body.employeeIds : [];
    if (!date || !status) {
      return res.status(400).json({ isOk: false, status: 400, message: "Date and Status are required" });
    }
    if (employeeIds.length === 0) {
      return res.status(400).json({ isOk: false, status: 400, message: "Please select at least one employee to perform this action" });
    }

    const results = [];
    for (const employeeId of employeeIds) {
      try {
        const employee = await Employee.findById(employeeId).lean(); // eslint-disable-line no-await-in-loop
        if (!employee) throw new Error("Employee not found");

        const doc = await Attendance.findOneAndUpdate( // eslint-disable-line no-await-in-loop
          { employeeId, attendanceDate: new Date(date) },
          {
            employeeId,
            companyId: employee.companyId,
            attendanceDate: new Date(date),
            status,
            lateEntry: Boolean(req.body.lateEntry),
            earlyExit: Boolean(req.body.earlyExit),
            shiftId: req.body.shift || null,
            isActive: true,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
        results.push({ employeeId: String(employeeId), success: true, attendanceId: String(doc._id) });
      } catch (itemError) {
        results.push({ employeeId: String(employeeId), success: false, error: itemError.message });
      }
    }

    return res.status(200).json({ isOk: true, status: 200, message: "Bulk attendance marking complete", data: { results } });
  } catch (error) {
    console.log("Error in bulkMarkAttendance", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

/**
 * POST /employee-attendance-tool/resolve-half-day — body: `{ attendanceId,
 * halfDayStatus }`. Directly updates the specified Attendance row's
 * halfDayStatus, bypassing the rest of Attendance's own validation chain —
 * matches source's real "half-day updates bypass validation" behavior
 * (direct query-builder UPDATE in source; a direct `findByIdAndUpdate` here,
 * deliberately not routed through Attendance's own save/validate path).
 */
export const resolveHalfDayAttendance = async (req, res) => {
  try {
    const { attendanceId, halfDayStatus } = req.body;
    if (!attendanceId || !["Present", "Absent"].includes(halfDayStatus)) {
      return res.status(400).json({ isOk: false, status: 400, message: "Attendance record and a Status for Other Half of Present or Absent are required" });
    }
    const doc = await Attendance.findByIdAndUpdate(attendanceId, { halfDayStatus }, { new: true });
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Attendance record not found" });
    return res.status(200).json({ isOk: true, status: 200, message: "Half day status resolved", data: { _id: doc._id, halfDayStatus: doc.halfDayStatus } });
  } catch (error) {
    console.log("Error in resolveHalfDayAttendance", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};
