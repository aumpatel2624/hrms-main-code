/**
 * Leaves (ADR-024, HRMS module 8 — second/transactional fork):
 * LeaveAdjustment, CompensatoryLeaveRequest, LeaveApplication,
 * LeaveEncashment, LeaveBlockList, and the two Leave Control Panel
 * bulk-action endpoints. Kept in its own file/route pair rather than grown
 * onto leaves.controller.js — that file's own header already flagged this
 * as "none of that is here", and this half is large enough on its own to
 * warrant the split.
 *
 * Every balance-affecting action here writes to `LeaveLedgerEntry` (the
 * single source of truth for balance — ADR-024) and never touches
 * `LeaveAllocation.totalLeavesAllocated`/`newLeavesAllocated` directly.
 * Ledger reversal is soft-delete (`isDeleted: true`), never a hard DELETE —
 * ADR-024's explicit deviation from source, for consistency with this
 * project's universal soft-delete convention.
 */
import { runListQuery } from "../../utils/listQuery.js";
import { getReferencingCounts, formatReferenceMessage } from "../../utils/referenceHelper.js";
import { getLeaveBalance } from "../../utils/leaveBalance.js";
import { resolveApprovers, getEmployeesApprovedBy } from "../../utils/approvers.js";
import { resolveRequestEmployee } from "../../utils/requestEmployee.js";
import { buildScopeFilter } from "../../utils/scope.js";
import { countLeaveDays, sameCalendarDay } from "../../utils/leaveDayCalculation.js";
import { getHolidayDatesInRange, isEntireRangeHolidays, isHolidayForEmployee } from "../../utils/holidayResolution.js";
import { getBlockedDatesInRange } from "../../utils/leaveBlockList.js";
import { getCurrentSalaryStructureAssignment } from "../../utils/payrollAssignment.js";
import { SCOPES } from "@demo-panel/shared/scopes";
import { ROLES } from "@demo-panel/shared/roles";

import LeaveAdjustment from "../../models/LeaveAdjustment.js";
import CompensatoryLeaveRequest from "../../models/CompensatoryLeaveRequest.js";
import LeaveApplication from "../../models/LeaveApplication.js";
import LeaveEncashment from "../../models/LeaveEncashment.js";
import LeaveBlockList from "../../models/LeaveBlockList.js";
import LeaveType from "../../models/LeaveType.js";
import LeaveAllocation from "../../models/LeaveAllocation.js";
import LeaveLedgerEntry from "../../models/LeaveLedgerEntry.js";
import LeavePolicyAssignment from "../../models/LeavePolicyAssignment.js";
import { grantAllocationsForAssignment } from "./leaves.controller.js";
import LeavePeriod from "../../models/LeavePeriod.js";
import HolidayList from "../../models/HolidayList.js";
import Employee from "../../models/Employee.js";
import Attendance from "../../models/Attendance.js";

const referenceGuardedDelete = async (Model, modelName, id, label) => {
  const referenceInfo = await getReferencingCounts(modelName, id);
  if (referenceInfo.totalReferences > 0) {
    return {
      blocked: true,
      body: {
        isOk: false,
        status: 409,
        message: `Cannot delete ${label}. It is being used by other records.`,
        totalReferences: referenceInfo.totalReferences,
        references: referenceInfo.details,
        formattedMessage: formatReferenceMessage(referenceInfo.details),
      },
    };
  }
  await Model.findByIdAndUpdate(id, { isDeleted: true });
  return { blocked: false };
};

const daysBetween = (a, b) => Math.round((new Date(a).getTime() - new Date(b).getTime()) / 86400000);
const addDays = (date, days) => new Date(new Date(date).getTime() + days * 86400000);

// ============================================================ LeaveAdjustment --
// ADR-024: "simple enough that create IS the action" — one signed
// LeaveLedgerEntry on create, no update/delete (immutable once written,
// same append-only spirit as LeaveLedgerEntry itself). Does NOT touch
// LeaveAllocation.totalLeavesAllocated — deliberate, matches source.

export const createLeaveAdjustment = async (req, res) => {
  try {
    const { employeeId, leaveTypeId, leavesToAdjust, adjustmentType } = req.body;
    if (!employeeId || !leaveTypeId || !leavesToAdjust || !adjustmentType) {
      return res.status(400).json({ isOk: false, status: 400, message: "Employee, Leave Type, Leaves to Adjust and Adjustment Type are required" });
    }
    if (!["Allocate", "Reduce"].includes(adjustmentType)) {
      return res.status(400).json({ isOk: false, status: 400, message: "Adjustment Type must be Allocate or Reduce" });
    }
    if (Number(leavesToAdjust) <= 0) {
      return res.status(400).json({ isOk: false, status: 400, message: "Enter a non-zero, positive value to adjust" });
    }

    const employee = await Employee.findById(employeeId).lean();
    if (!employee) return res.status(404).json({ isOk: false, status: 404, message: "Employee not found" });
    const leaveType = await LeaveType.findById(leaveTypeId).lean();
    if (!leaveType) return res.status(404).json({ isOk: false, status: 404, message: "Leave Type not found" });

    const postingDate = req.body.postingDate ? new Date(req.body.postingDate) : new Date();
    const currentBalance = await getLeaveBalance(employeeId, leaveTypeId, postingDate);

    // Leave Adjustment.md Validation Rule #4 — over-allocation cap (Allocate only).
    if (adjustmentType === "Allocate" && leaveType.maxLeavesAllowed) {
      const newAllocation = currentBalance + Number(leavesToAdjust);
      if (newAllocation > leaveType.maxLeavesAllowed) {
        return res.status(400).json({
          isOk: false, status: 400,
          message: `Allocation is greater than the maximum allowed ${leaveType.maxLeavesAllowed} for leave type ${leaveType.leaveTypeName}`,
        });
      }
    }
    // Validation Rule #5 — reduce cannot exceed current balance.
    if (adjustmentType === "Reduce" && currentBalance < Number(leavesToAdjust)) {
      return res.status(400).json({
        isOk: false, status: 400,
        message: `Reduction is more than ${employee.employeeName}'s available leave balance ${currentBalance} for leave type ${leaveType.leaveTypeName}`,
      });
    }

    if (req.body.leaveAllocationId) {
      const allocation = await LeaveAllocation.findById(req.body.leaveAllocationId).lean();
      if (!allocation) return res.status(404).json({ isOk: false, status: 404, message: "Leave Allocation not found" });
    }

    const signedLeaves = adjustmentType === "Allocate" ? Number(leavesToAdjust) : -Number(leavesToAdjust);
    const leavesAfterAdjustment = currentBalance + signedLeaves;

    const doc = await LeaveAdjustment.create({
      employeeId,
      leaveTypeId,
      leaveAllocationId: req.body.leaveAllocationId || null,
      companyId: employee.companyId,
      postingDate,
      leavesToAdjust: Number(leavesToAdjust),
      adjustmentType,
      leavesAfterAdjustment,
      reasonForAdjustment: req.body.reasonForAdjustment || "",
    });

    await LeaveLedgerEntry.create({
      employeeId,
      leaveTypeId,
      transactionType: "LeaveAdjustment",
      transactionId: doc._id,
      leaves: signedLeaves,
      fromDate: postingDate,
      toDate: postingDate,
      isCarryForward: false,
      companyId: employee.companyId,
    });

    return res.status(201).json({ isOk: true, status: 201, message: "Leave Adjustment created successfully", data: { _id: doc._id } });
  } catch (error) {
    console.log("Error in createLeaveAdjustment", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getLeaveAdjustmentById = async (req, res) => {
  try {
    const doc = await LeaveAdjustment.findById(req.params.leaveAdjustmentId)
      .populate("employeeId", "employeeName employeeCode")
      .populate("leaveTypeId", "leaveTypeName");
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Leave Adjustment not found" });
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getLeaveAdjustmentById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listLeaveAdjustmentByParams = async (req, res) => {
  try {
    const list = await runListQuery(LeaveAdjustment, req.body, {
      searchFields: [],
      filterable: {
        employeeId: "objectId",
        leaveTypeId: "objectId",
        leaveAllocationId: "objectId",
        adjustmentType: "string",
        companyId: "objectId",
        createdAt: "date",
      },
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log("Error in listLeaveAdjustmentByParams", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// ==================================================== CompensatoryLeaveRequest --

const CLR_UPDATABLE_FIELDS = ["workFromDate", "workEndDate", "halfDay", "halfDayDate", "reason", "leaveTypeId"];

export const createCompensatoryLeaveRequest = async (req, res) => {
  try {
    const { employeeId, leaveTypeId, workFromDate, workEndDate, reason } = req.body;
    if (!employeeId || !leaveTypeId || !workFromDate || !workEndDate || !reason) {
      return res.status(400).json({ isOk: false, status: 400, message: "Employee, Leave Type, Work From/End Date and Reason are required" });
    }

    const employee = await Employee.findById(employeeId).lean();
    if (!employee) return res.status(404).json({ isOk: false, status: 404, message: "Employee not found" });
    if (employee.status === "Inactive") {
      return res.status(400).json({ isOk: false, status: 400, message: `Transactions cannot be created for an Inactive Employee ${employee.employeeName}` });
    }

    const leaveType = await LeaveType.findById(leaveTypeId).lean();
    if (!leaveType) return res.status(404).json({ isOk: false, status: 404, message: "Leave Type not found" });
    if (!leaveType.isCompensatory) {
      return res.status(400).json({ isOk: false, status: 400, message: `Leave Type ${leaveType.leaveTypeName} is not marked Is Compensatory` });
    }

    if (new Date(workFromDate) > new Date(workEndDate)) {
      return res.status(400).json({ isOk: false, status: 400, message: "To date can not be less than from date" });
    }

    if (req.body.halfDay) {
      if (!req.body.halfDayDate) {
        return res.status(400).json({ isOk: false, status: 400, message: "Half Day Date is mandatory" });
      }
      const hd = new Date(req.body.halfDayDate);
      if (hd < new Date(workFromDate) || hd > new Date(workEndDate)) {
        return res.status(400).json({ isOk: false, status: 400, message: "Half Day Date should be in between Work From Date and Work End Date" });
      }
    }

    const doc = await CompensatoryLeaveRequest.create({
      employeeId,
      leaveTypeId,
      companyId: employee.companyId,
      workFromDate,
      workEndDate,
      halfDay: Boolean(req.body.halfDay),
      halfDayDate: req.body.halfDay ? req.body.halfDayDate : null,
      reason,
    });

    return res.status(201).json({ isOk: true, status: 201, message: "Compensatory Leave Request created successfully", data: { _id: doc._id } });
  } catch (error) {
    console.log("Error in createCompensatoryLeaveRequest", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateCompensatoryLeaveRequest = async (req, res) => {
  try {
    const doc = await CompensatoryLeaveRequest.findById(req.params.compensatoryLeaveRequestId);
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Compensatory Leave Request not found" });
    if (doc.status !== "open") {
      return res.status(400).json({ isOk: false, status: 400, message: `Cannot edit a ${doc.status} Compensatory Leave Request` });
    }
    for (const field of CLR_UPDATABLE_FIELDS) if (req.body[field] !== undefined) doc[field] = req.body[field];
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Compensatory Leave Request updated successfully" });
  } catch (error) {
    console.log("Error in updateCompensatoryLeaveRequest", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteCompensatoryLeaveRequest = async (req, res) => {
  try {
    const { compensatoryLeaveRequestId } = req.params;
    const doc = await CompensatoryLeaveRequest.findById(compensatoryLeaveRequestId);
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Compensatory Leave Request not found" });
    if (doc.status === "approved") {
      return res.status(400).json({ isOk: false, status: 400, message: "Cannot delete an approved Compensatory Leave Request — it has already granted leave" });
    }
    const result = await referenceGuardedDelete(CompensatoryLeaveRequest, "CompensatoryLeaveRequest", compensatoryLeaveRequestId, "compensatory leave request");
    if (result.blocked) return res.status(409).json(result.body);
    return res.status(200).json({ isOk: true, status: 200, message: "Compensatory Leave Request deleted successfully" });
  } catch (error) {
    console.log("Error in deleteCompensatoryLeaveRequest", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getCompensatoryLeaveRequestById = async (req, res) => {
  try {
    const doc = await CompensatoryLeaveRequest.findById(req.params.compensatoryLeaveRequestId)
      .populate("employeeId", "employeeName employeeCode")
      .populate("leaveTypeId", "leaveTypeName")
      .populate("leaveAllocationId", "fromDate toDate");
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Compensatory Leave Request not found" });
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getCompensatoryLeaveRequestById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listCompensatoryLeaveRequestByParams = async (req, res) => {
  try {
    await resolveRequestEmployee(req);
    let approverIds = [];
    if (req.user?.dataScope === SCOPES.APPROVER) approverIds = await getEmployeesApprovedBy(req.user.id, "leave");
    const scopeFilter = buildScopeFilter(req.user, { owner: "employeeId", approverIds });

    const list = await runListQuery(CompensatoryLeaveRequest, req.body, {
      searchFields: ["reason"],
      filterable: {
        employeeId: "objectId",
        leaveTypeId: "objectId",
        status: "string",
        companyId: "objectId",
        workFromDate: "date",
        workEndDate: "date",
        createdAt: "date",
      },
      scopeFilter,
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log("Error in listCompensatoryLeaveRequestByParams", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

/**
 * POST /compensatory-leave-requests/:id/approve — Compensatory Leave
 * Request.md's `on_submit`. Validation chain: active employee, date order,
 * every day in the worked range must be a holiday per the employee's
 * resolved Holiday List, and matching Attendance rows must exist for the
 * whole range.
 *
 * Judgment call (per task instructions): the spec is ambiguous on whether a
 * missing Attendance row for a worked day should hard-block approval or be
 * auto-created. This project has no Attendance data populated by anything
 * yet, so a silent auto-create would mask that gap — hard-block chosen
 * instead, with a clear error naming which day(s) are missing.
 */
export const approveCompensatoryLeaveRequest = async (req, res) => {
  try {
    const doc = await CompensatoryLeaveRequest.findById(req.params.compensatoryLeaveRequestId);
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Compensatory Leave Request not found" });
    if (doc.status !== "open") {
      return res.status(400).json({ isOk: false, status: 400, message: `Only an open request can be approved (current status: ${doc.status})` });
    }

    const employee = await Employee.findById(doc.employeeId).lean();
    if (!employee) return res.status(404).json({ isOk: false, status: 404, message: "Employee not found" });
    if (employee.status === "Inactive") {
      return res.status(400).json({ isOk: false, status: 400, message: `Transactions cannot be created for an Inactive Employee ${employee.employeeName}` });
    }
    if (new Date(doc.workFromDate) > new Date(doc.workEndDate)) {
      return res.status(400).json({ isOk: false, status: 400, message: "To date can not be less than from date" });
    }

    const allHolidays = await isEntireRangeHolidays(doc.employeeId, doc.workFromDate, doc.workEndDate);
    if (!allHolidays) {
      return res.status(400).json({
        isOk: false, status: 400,
        message: "The days between the Work From Date and Work End Date are not all valid holidays per the employee's Holiday List",
      });
    }

    const from = new Date(doc.workFromDate);
    const to = new Date(doc.workEndDate);
    const dayCount = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
    const attendanceCount = await Attendance.countDocuments({
      employeeId: doc.employeeId,
      attendanceDate: { $gte: from, $lte: to },
      status: { $in: ["Present", "Work From Home", "Half Day"] },
    });
    if (attendanceCount < dayCount) {
      return res.status(400).json({
        isOk: false, status: 400,
        message: "You are not present all day(s) between compensatory leave request days — matching Attendance records are missing for at least one day",
      });
    }

    const leaveType = await LeaveType.findById(doc.leaveTypeId).lean();
    let dateDifference = dayCount;
    if (doc.halfDay) dateDifference -= 0.5;

    const compLeaveValidFrom = addDays(doc.workEndDate, 1);
    const leavePeriod = await LeavePeriod.findOne({
      companyId: employee.companyId,
      isActive: true,
      fromDate: { $lte: compLeaveValidFrom },
      toDate: { $gte: compLeaveValidFrom },
    }).lean();
    if (!leavePeriod) {
      return res.status(400).json({
        isOk: false, status: 400,
        message: `This compensatory leave will be applicable from ${compLeaveValidFrom.toDateString()}. There is no active Leave Period for this date — create one first.`,
      });
    }

    let allocation = await LeaveAllocation.findOne({
      employeeId: doc.employeeId,
      leaveTypeId: doc.leaveTypeId,
      status: "active",
      fromDate: { $lte: compLeaveValidFrom },
      toDate: { $gte: compLeaveValidFrom },
    });

    if (allocation) {
      allocation.newLeavesAllocated += dateDifference;
      allocation.totalLeavesAllocated = allocation.unusedLeaves + allocation.newLeavesAllocated;
      await allocation.save();
    } else {
      allocation = await LeaveAllocation.create({
        employeeId: doc.employeeId,
        leaveTypeId: doc.leaveTypeId,
        companyId: employee.companyId,
        fromDate: compLeaveValidFrom,
        toDate: leavePeriod.toDate,
        newLeavesAllocated: dateDifference,
        unusedLeaves: 0,
        totalLeavesAllocated: dateDifference,
        carryForward: Boolean(leaveType?.isCarryForward),
        leavePeriodId: leavePeriod._id,
        status: "active",
      });
    }

    await LeaveLedgerEntry.create({
      employeeId: doc.employeeId,
      leaveTypeId: doc.leaveTypeId,
      transactionType: "LeaveAllocation",
      transactionId: allocation._id,
      leaves: dateDifference,
      fromDate: compLeaveValidFrom,
      toDate: compLeaveValidFrom,
      isCarryForward: false,
      companyId: employee.companyId,
    });

    doc.leaveAllocationId = allocation._id;
    doc.status = "approved";
    await doc.save();

    return res.status(200).json({ isOk: true, status: 200, message: "Compensatory Leave Request approved successfully", data: { leaveAllocationId: allocation._id } });
  } catch (error) {
    console.log("Error in approveCompensatoryLeaveRequest", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const rejectCompensatoryLeaveRequest = async (req, res) => {
  try {
    const doc = await CompensatoryLeaveRequest.findById(req.params.compensatoryLeaveRequestId);
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Compensatory Leave Request not found" });
    if (doc.status !== "open") {
      return res.status(400).json({ isOk: false, status: 400, message: `Only an open request can be rejected (current status: ${doc.status})` });
    }
    doc.status = "rejected";
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Compensatory Leave Request rejected" });
  } catch (error) {
    console.log("Error in rejectCompensatoryLeaveRequest", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// ============================================================ LeaveApplication --
// The centerpiece. `runLeaveApplicationValidation` reproduces the real
// validation chain's order (Leave Application.md Validation Rules) as an
// idiomatic rebuild (ADR-016) — not a byte-for-byte port of all ~19 source
// steps, but every step the task called out explicitly: active-employee,
// half-day date sanity, balance sufficiency (allowNegative override),
// overlap with the half-day-adjacency carve-out, max-consecutive-days,
// block-date enforcement, applicableAfter vs joining date, isOptionalLeave.
// Shared by create and update so both paths re-validate identically.

/** Every OTHER non-cancelled/non-rejected application for this employee whose date range overlaps [fromDate, toDate]. */
const findOverlappingApplications = (employeeId, fromDate, toDate, excludeId) =>
  LeaveApplication.find({
    employeeId,
    status: { $in: ["open", "approved"] },
    _id: excludeId ? { $ne: excludeId } : { $exists: true },
    toDate: { $gte: fromDate },
    fromDate: { $lte: toDate },
  }).lean();

/** The active LeaveAllocation covering `date`, if any. */
const findAllocationCovering = (employeeId, leaveTypeId, date) =>
  LeaveAllocation.findOne({
    employeeId, leaveTypeId, status: "active",
    fromDate: { $lte: date }, toDate: { $gte: date },
  });

/**
 * Runs the full create/update validation chain and returns either
 * `{ error }` or the derived fields (`totalLeaveDays`, `leaveApproverId`,
 * `companyId`, `holidayDates`) the caller should persist. Never throws —
 * every failure is returned as `{ error }` for the controller to translate
 * into a 400/404.
 */
const runLeaveApplicationValidation = async (data, { excludeId = null, actingUserId = null } = {}) => {
  const { employeeId, leaveTypeId, fromDate, toDate, halfDay, halfDayDate } = data;

  if (!employeeId || !leaveTypeId || !fromDate || !toDate) {
    return { error: { status: 400, message: "Employee, Leave Type, From Date and To Date are required" } };
  }
  if (new Date(fromDate) > new Date(toDate)) {
    return { error: { status: 400, message: "To date cannot be before from date" } };
  }

  const employee = await Employee.findById(employeeId).lean();
  if (!employee) return { error: { status: 404, message: "Employee not found" } };
  if (employee.status === "Inactive") {
    return { error: { status: 400, message: `Transactions cannot be created for an Inactive Employee ${employee.employeeName}` } };
  }

  const leaveType = await LeaveType.findById(leaveTypeId).lean();
  if (!leaveType) return { error: { status: 404, message: "Leave Type not found" } };

  const from = new Date(fromDate);
  const to = new Date(toDate);

  // Half-day date sanity (Validation Rule 3.3): required, in range, not a holiday.
  if (halfDay) {
    if (!halfDayDate) return { error: { status: 400, message: "Half Day Date is mandatory when Half Day is checked" } };
    const hd = new Date(halfDayDate);
    if (hd < from || hd > to) return { error: { status: 400, message: "Half Day Date should be between From Date and To Date" } };
    if (await isHolidayForEmployee(employeeId, hd)) {
      return { error: { status: 400, message: "Half Day Date cannot be a holiday" } };
    }
  }

  const holidayDates = leaveType.includeHoliday ? [] : await getHolidayDatesInRange(employeeId, from, to);
  const totalLeaveDays = countLeaveDays({
    fromDate: from, toDate: to, halfDay: Boolean(halfDay), halfDayDate,
    holidayDates, includeHoliday: leaveType.includeHoliday,
  });
  if (totalLeaveDays <= 0) {
    return { error: { status: 400, message: "The day(s) on which you are applying for leave are holidays. You need not apply for leave." } };
  }

  // Balance sufficiency (Validation Rule 4, "for_consumption" balance) — as
  // of toDate, since applying leave consumes balance for the whole range.
  if (!leaveType.isLwp) {
    const balance = await getLeaveBalance(employeeId, leaveTypeId, to);
    if (balance < totalLeaveDays && !leaveType.allowNegative) {
      return { error: { status: 400, message: `Insufficient leave balance for Leave Type ${leaveType.leaveTypeName}` } };
    }
  }

  // Overlap check, with the half-day-adjacency carve-out: two OTHER
  // applications that are each half-day on the exact same halfDayDate are
  // tolerated (so long as no third one already shares that date) — mirrors
  // source's "total_leaves_on_half_day < 1" rule without the full chain
  // walk.
  const overlapping = await findOverlappingApplications(employeeId, from, to, excludeId);
  for (const other of overlapping) {
    const isHalfDayAdjacency = halfDay && other.halfDay
      && other.halfDayDate && halfDayDate
      && sameCalendarDay(other.halfDayDate, halfDayDate)
      && (totalLeaveDays === 0.5 || sameCalendarDay(from, other.toDate) || sameCalendarDay(to, other.fromDate));
    if (isHalfDayAdjacency) continue; // eslint-disable-line no-continue
    return {
      error: {
        status: 400,
        message: `Employee already has a leave application between ${new Date(other.fromDate).toDateString()} and ${new Date(other.toDate).toDateString()}`,
      },
    };
  }

  // Max consecutive days — one-hop adjacency merge (a simplified rebuild of
  // source's full recursive chain walk, documented in DECISIONS.md): if an
  // Open/Approved application for the same employee+leaveType immediately
  // precedes or follows this range, its span is folded in before comparing
  // to the limit.
  if (leaveType.maxContinuousDaysAllowed) {
    let mergedFrom = from;
    let mergedTo = to;
    const adjacent = await LeaveApplication.find({
      employeeId, leaveTypeId, status: { $in: ["open", "approved"] },
      _id: excludeId ? { $ne: excludeId } : { $exists: true },
      $or: [
        { toDate: addDays(from, -1) },
        { fromDate: addDays(to, 1) },
      ],
    }).lean();
    for (const adj of adjacent) {
      if (sameCalendarDay(adj.toDate, addDays(mergedFrom, -1))) mergedFrom = new Date(adj.fromDate);
      if (sameCalendarDay(adj.fromDate, addDays(mergedTo, 1))) mergedTo = new Date(adj.toDate);
    }
    const consecutiveDays = Math.round((mergedTo.getTime() - mergedFrom.getTime()) / 86400000) + 1;
    if (consecutiveDays > leaveType.maxContinuousDaysAllowed) {
      return {
        error: {
          status: 400,
          message: `Leave of type ${leaveType.leaveTypeName} cannot be longer than ${leaveType.maxContinuousDaysAllowed} consecutive days`,
        },
      };
    }
  }

  // Block-date enforcement — hard block at create (task instruction), with
  // allow-list bypass for the acting user.
  const blockedDates = await getBlockedDatesInRange({
    companyId: employee.companyId, departmentId: employee.departmentId, leaveTypeId,
    fromDate: from, toDate: to, bypassUserId: actingUserId,
  });
  if (blockedDates.length > 0) {
    return {
      error: {
        status: 400,
        message: `You are not authorized to apply for leave on block date(s): ${blockedDates.map((b) => new Date(b.blockDate).toDateString()).join(", ")}`,
      },
    };
  }

  // applicableAfter vs joining date.
  if (leaveType.applicableAfter > 0 && employee.dateOfJoining) {
    const numberOfDays = daysBetween(from, employee.dateOfJoining);
    if (numberOfDays >= 0 && numberOfDays < leaveType.applicableAfter) {
      return { error: { status: 400, message: `${leaveType.leaveTypeName} applicable after ${leaveType.applicableAfter} calendar days` } };
    }
  }

  // isOptionalLeave — the whole range must fall within the covering Leave
  // Period's optional holiday list.
  if (leaveType.isOptionalLeave) {
    const leavePeriod = await LeavePeriod.findOne({
      companyId: employee.companyId, isActive: true,
      fromDate: { $lte: from }, toDate: { $gte: to },
    }).lean();
    if (!leavePeriod) return { error: { status: 400, message: "Cannot find an active Leave Period covering this date range" } };
    if (!leavePeriod.optionalHolidayListId) {
      return { error: { status: 400, message: `Optional Holiday List not set for leave period covering ${from.toDateString()}` } };
    }
    const optionalList = await HolidayList.findById(leavePeriod.optionalHolidayListId).lean();
    const optionalDates = (optionalList?.holidays || []).map((h) => h.holidayDate);
    let cursor = new Date(from);
    while (cursor <= to) {
      if (!optionalDates.some((d) => sameCalendarDay(d, cursor))) {
        return { error: { status: 400, message: `${cursor.toDateString()} is not in the Optional Holiday List` } };
      }
      cursor = addDays(cursor, 1);
    }
  }

  // Leave Approver resolution + self-approval prevention.
  let leaveApproverId = data.leaveApproverId || null;
  const resolvedApprovers = await resolveApprovers(employeeId, "leave");
  if (!leaveApproverId) {
    if (resolvedApprovers.length === 0) {
      return { error: { status: 400, message: "Please set a Leave Approver for this Employee or their Department" } };
    }
    [leaveApproverId] = resolvedApprovers;
  } else if (resolvedApprovers.length > 0 && !resolvedApprovers.includes(String(leaveApproverId))) {
    return { error: { status: 400, message: "The supplied Leave Approver is not a resolved approver for this Employee" } };
  }
  const approverEmployee = await Employee.findOne({ userId: leaveApproverId }).lean();
  if (approverEmployee && String(approverEmployee._id) === String(employeeId)) {
    return { error: { status: 400, message: "Self-approval for leaves is not allowed" } };
  }

  return {
    totalLeaveDays,
    leaveApproverId,
    companyId: employee.companyId,
    departmentId: employee.departmentId,
    leaveType,
  };
};

export const createLeaveApplication = async (req, res) => {
  try {
    const result = await runLeaveApplicationValidation(req.body, { actingUserId: req.user?.id });
    if (result.error) return res.status(result.error.status).json({ isOk: false, status: result.error.status, message: result.error.message });

    const doc = await LeaveApplication.create({
      employeeId: req.body.employeeId,
      leaveTypeId: req.body.leaveTypeId,
      companyId: result.companyId,
      fromDate: req.body.fromDate,
      toDate: req.body.toDate,
      halfDay: Boolean(req.body.halfDay),
      halfDayDate: req.body.halfDay ? req.body.halfDayDate : null,
      totalLeaveDays: result.totalLeaveDays,
      description: req.body.description || "",
      leaveApproverId: result.leaveApproverId,
      postingDate: req.body.postingDate || new Date(),
    });

    return res.status(201).json({ isOk: true, status: 201, message: "Leave Application created successfully", data: { _id: doc._id, totalLeaveDays: result.totalLeaveDays } });
  } catch (error) {
    console.log("Error in createLeaveApplication", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateLeaveApplication = async (req, res) => {
  try {
    const { leaveApplicationId } = req.params;
    const doc = await LeaveApplication.findById(leaveApplicationId);
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Leave Application not found" });
    if (doc.status !== "open") {
      return res.status(400).json({ isOk: false, status: 400, message: `Cannot edit a ${doc.status} Leave Application` });
    }

    const merged = { ...doc.toObject(), ...req.body };
    const result = await runLeaveApplicationValidation(merged, { excludeId: leaveApplicationId, actingUserId: req.user?.id });
    if (result.error) return res.status(result.error.status).json({ isOk: false, status: result.error.status, message: result.error.message });

    const EDITABLE_FIELDS = ["employeeId", "leaveTypeId", "fromDate", "toDate", "halfDay", "halfDayDate", "description", "leaveApproverId", "postingDate"];
    for (const field of EDITABLE_FIELDS) if (req.body[field] !== undefined) doc[field] = req.body[field];
    doc.totalLeaveDays = result.totalLeaveDays;
    doc.leaveApproverId = result.leaveApproverId;
    doc.companyId = result.companyId;
    if (!doc.halfDay) doc.halfDayDate = null;
    await doc.save();

    return res.status(200).json({ isOk: true, status: 200, message: "Leave Application updated successfully" });
  } catch (error) {
    console.log("Error in updateLeaveApplication", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

/** Whether req.user may see/act on this specific Leave Application (APPROVER-scope defense in depth). */
const canAccessLeaveApplication = async (req, doc) => {
  if (!req.user || req.user.role === ROLES.ADMIN) return true;
  if (req.user.dataScope !== SCOPES.APPROVER) return true;
  await resolveRequestEmployee(req);
  const approverIds = await getEmployeesApprovedBy(req.user.id, "leave");
  const allowedIds = [String(req.user.employeeId), ...approverIds];
  return allowedIds.includes(String(doc.employeeId));
};

export const getLeaveApplicationById = async (req, res) => {
  try {
    const doc = await LeaveApplication.findById(req.params.leaveApplicationId);
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Leave Application not found" });
    if (!(await canAccessLeaveApplication(req, doc))) {
      return res.status(403).json({ isOk: false, status: 403, message: "You do not have permission to view this Leave Application" });
    }
    // Balance from the raw ids, BEFORE populate turns them into sub-documents
    // — issue #13 (same trap fixed in leaves.controller.js's
    // getLeaveAllocationById): a populated document's String() is not its
    // hex id, so passing it into getLeaveBalance's ObjectId constructor
    // throws.
    const balance = await getLeaveBalance(doc.employeeId, doc.leaveTypeId, new Date());
    await doc.populate([
      { path: "employeeId", select: "employeeName employeeCode" },
      { path: "leaveTypeId", select: "leaveTypeName" },
      { path: "companyId", select: "companyName" },
    ]);
    return res.status(200).json({ isOk: true, status: 200, data: { ...doc.toObject(), currentBalance: balance } });
  } catch (error) {
    console.log("Error in getLeaveApplicationById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

/**
 * ADR-024 (Q-4, wired for real): `Employee` and `Leave Approver` roles both
 * get the `approver` data scope on this menu row — for an Employee with
 * nobody reporting to them, `getEmployeesApprovedBy` returns `[]` and the
 * filter degenerates to exactly "my own applications"; for a real Leave
 * Approver it is "my own plus everyone I approve for". `HR User`/`HR
 * Manager` stay unscoped (role-level "all", the default — no per-menu-row
 * override needed). See DECISIONS.md ADR-024 "As built (module complete)"
 * for the reasoning.
 */
export const listLeaveApplicationByParams = async (req, res) => {
  try {
    await resolveRequestEmployee(req);
    let approverIds = [];
    if (req.user?.dataScope === SCOPES.APPROVER) approverIds = await getEmployeesApprovedBy(req.user.id, "leave");
    const scopeFilter = buildScopeFilter(req.user, { owner: "employeeId", approverIds });

    const list = await runListQuery(LeaveApplication, req.body, {
      searchFields: ["description"],
      filterable: {
        employeeId: "objectId",
        leaveTypeId: "objectId",
        status: "string",
        companyId: "objectId",
        leaveApproverId: "objectId",
        fromDate: "date",
        toDate: "date",
        createdAt: "date",
      },
      scopeFilter,
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log("Error in listLeaveApplicationByParams", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

/**
 * POST /leave-applications/:id/approve — re-validates balance (state may
 * have changed since creation), creates/updates Attendance rows for every
 * day in range, and writes 1-2 LeaveLedgerEntry rows, splitting across an
 * allocation boundary when the range crosses one.
 */
export const approveLeaveApplication = async (req, res) => {
  try {
    const doc = await LeaveApplication.findById(req.params.leaveApplicationId);
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Leave Application not found" });
    if (!(await canAccessLeaveApplication(req, doc))) {
      return res.status(403).json({ isOk: false, status: 403, message: "You do not have permission to act on this Leave Application" });
    }
    if (doc.status !== "open") {
      return res.status(400).json({ isOk: false, status: 400, message: `Only an open application can be approved (current status: ${doc.status})` });
    }

    const employee = await Employee.findById(doc.employeeId).lean();
    if (!employee) return res.status(404).json({ isOk: false, status: 404, message: "Employee not found" });
    const leaveType = await LeaveType.findById(doc.leaveTypeId).lean();
    if (!leaveType) return res.status(404).json({ isOk: false, status: 404, message: "Leave Type not found" });

    const from = new Date(doc.fromDate);
    const to = new Date(doc.toDate);

    if (!leaveType.isLwp) {
      const balance = await getLeaveBalance(doc.employeeId, doc.leaveTypeId, to);
      if (balance < doc.totalLeaveDays && !leaveType.allowNegative) {
        return res.status(400).json({ isOk: false, status: 400, message: `Insufficient leave balance for Leave Type ${leaveType.leaveTypeName}` });
      }
    }

    // Attendance rows — one per calendar day, skipping holidays unless the
    // leave type includes them.
    const holidayDates = leaveType.includeHoliday ? [] : await getHolidayDatesInRange(doc.employeeId, from, to);
    let cursor = new Date(from);
    while (cursor <= to) {
      const isHoliday = holidayDates.some((d) => sameCalendarDay(d, cursor));
      if (!isHoliday) {
        const isHalfDay = doc.halfDay && doc.halfDayDate && sameCalendarDay(doc.halfDayDate, cursor);
        await Attendance.findOneAndUpdate( // eslint-disable-line no-await-in-loop
          { employeeId: doc.employeeId, attendanceDate: cursor },
          {
            employeeId: doc.employeeId,
            companyId: employee.companyId,
            attendanceDate: cursor,
            status: isHalfDay ? "Half Day" : "On Leave",
            leaveApplicationId: doc._id,
            leaveTypeId: doc.leaveTypeId,
            isActive: true,
          },
          { upsert: true, setDefaultsOnInsert: true },
        );
      }
      cursor = addDays(cursor, 1);
    }

    // Ledger entries — split across an allocation boundary when the range
    // crosses one (fromAlloc's toDate !== toAlloc's fromDate - 1 is treated
    // as "not consecutive" and simply produces two entries covering only
    // what each allocation actually spans, rather than throwing — a
    // deliberate relaxation of source's hard non-consecutive-allocations
    // error, documented in DECISIONS.md, since blocking approval entirely
    // over a gap between two allocations is worse than posting what can be
    // posted).
    const fromAlloc = await findAllocationCovering(doc.employeeId, doc.leaveTypeId, from);
    const toAlloc = await findAllocationCovering(doc.employeeId, doc.leaveTypeId, to);

    const writeLedgerEntry = (entryFrom, entryTo) => {
      const days = countLeaveDays({
        fromDate: entryFrom, toDate: entryTo, halfDay: doc.halfDay, halfDayDate: doc.halfDayDate,
        holidayDates, includeHoliday: leaveType.includeHoliday,
      });
      if (!days) return Promise.resolve(null);
      return LeaveLedgerEntry.create({
        employeeId: doc.employeeId,
        leaveTypeId: doc.leaveTypeId,
        transactionType: "LeaveApplication",
        transactionId: doc._id,
        leaves: -days,
        fromDate: entryFrom,
        toDate: entryTo,
        isCarryForward: false,
        isLwp: Boolean(leaveType.isLwp),
        companyId: employee.companyId,
      });
    };

    if (fromAlloc && toAlloc && String(fromAlloc._id) !== String(toAlloc._id)) {
      await writeLedgerEntry(from, fromAlloc.toDate);
      await writeLedgerEntry(addDays(fromAlloc.toDate, 1), to);
    } else {
      await writeLedgerEntry(from, to);
    }

    doc.status = "approved";
    await doc.save();

    return res.status(200).json({ isOk: true, status: 200, message: "Leave Application approved successfully" });
  } catch (error) {
    console.log("Error in approveLeaveApplication", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const rejectLeaveApplication = async (req, res) => {
  try {
    const doc = await LeaveApplication.findById(req.params.leaveApplicationId);
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Leave Application not found" });
    if (!(await canAccessLeaveApplication(req, doc))) {
      return res.status(403).json({ isOk: false, status: 403, message: "You do not have permission to act on this Leave Application" });
    }
    if (doc.status !== "open") {
      return res.status(400).json({ isOk: false, status: 400, message: `Only an open application can be rejected (current status: ${doc.status})` });
    }
    doc.status = "rejected";
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Leave Application rejected" });
  } catch (error) {
    console.log("Error in rejectLeaveApplication", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

/**
 * POST /leave-applications/:id/cancel — an already-APPROVED application
 * only. Reverses the ledger entries (soft-delete, ADR-024) and the
 * Attendance rows this application created.
 */
export const cancelLeaveApplication = async (req, res) => {
  try {
    const doc = await LeaveApplication.findById(req.params.leaveApplicationId);
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Leave Application not found" });
    if (!(await canAccessLeaveApplication(req, doc))) {
      return res.status(403).json({ isOk: false, status: 403, message: "You do not have permission to act on this Leave Application" });
    }
    if (doc.status !== "approved") {
      return res.status(400).json({ isOk: false, status: 400, message: `Only an approved application can be cancelled (current status: ${doc.status})` });
    }

    await LeaveLedgerEntry.updateMany(
      { transactionType: "LeaveApplication", transactionId: doc._id },
      { isDeleted: true },
    );
    await Attendance.updateMany(
      { leaveApplicationId: doc._id },
      { isDeleted: true },
    );

    doc.status = "cancelled";
    await doc.save();

    return res.status(200).json({ isOk: true, status: 200, message: "Leave Application cancelled successfully" });
  } catch (error) {
    console.log("Error in cancelLeaveApplication", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// ============================================================= LeaveEncashment --
// Q-14 retrofitted (ADR-026, Payroll — Structure & Assignment): Payroll now
// exists, so `perDayEncashmentAmount` is optional in the request — when
// omitted, it resolves the employee's current SalaryStructureAssignment (as
// of the encashment's own date) and defaults to its
// `leaveEncashmentAmountPerDay`. Falls back to requiring the manual field
// (same 400 as before ADR-026) only when no assignment resolves, or one
// resolves but has no `leaveEncashmentAmountPerDay` set. No GL/Payment
// Entry — `/mark-paid` is the same manual substitute Full & Final Statement
// established (ADR-016/Q-3). Judgment call: the negative ledger entry is
// written at CREATE (not at mark-paid) — source writes it in `on_submit`,
// and this project's "create IS the action" fold (already used for
// LeaveAdjustment) treats creation as the equivalent of submit for a
// doctype this simple.

export const createLeaveEncashment = async (req, res) => {
  try {
    const { employeeId, leaveTypeId } = req.body;
    if (!employeeId || !leaveTypeId) {
      return res.status(400).json({ isOk: false, status: 400, message: "Employee and Leave Type are required" });
    }

    const encashmentDate = req.body.encashmentDate ? new Date(req.body.encashmentDate) : new Date();
    let perDayEncashmentAmount = req.body.perDayEncashmentAmount;
    if (perDayEncashmentAmount === undefined || perDayEncashmentAmount === null) {
      const currentAssignment = await getCurrentSalaryStructureAssignment(employeeId, encashmentDate);
      if (currentAssignment && currentAssignment.leaveEncashmentAmountPerDay !== null && currentAssignment.leaveEncashmentAmountPerDay !== undefined) {
        perDayEncashmentAmount = currentAssignment.leaveEncashmentAmountPerDay;
      }
    }
    if (perDayEncashmentAmount === undefined || perDayEncashmentAmount === null) {
      return res.status(400).json({ isOk: false, status: 400, message: "Per Day Encashment Amount is required — no Salary Structure Assignment with a leave encashment rate resolves for this employee" });
    }

    const employee = await Employee.findById(employeeId).lean();
    if (!employee) return res.status(404).json({ isOk: false, status: 404, message: "Employee not found" });
    if (employee.status === "Inactive") {
      return res.status(400).json({ isOk: false, status: 400, message: `Transactions cannot be created for an Inactive Employee ${employee.employeeName}` });
    }

    const leaveType = await LeaveType.findById(leaveTypeId).lean();
    if (!leaveType) return res.status(404).json({ isOk: false, status: 404, message: "Leave Type not found" });
    if (!leaveType.allowEncashment) {
      return res.status(400).json({ isOk: false, status: 400, message: `Leave Type ${leaveType.leaveTypeName} is not encashable` });
    }

    let allocation = null;
    if (req.body.leaveAllocationId) {
      allocation = await LeaveAllocation.findById(req.body.leaveAllocationId);
    } else {
      allocation = await LeaveAllocation.findOne({
        employeeId, leaveTypeId, status: "active",
        fromDate: { $lte: encashmentDate }, toDate: { $gte: encashmentDate },
      });
    }
    if (!allocation) {
      return res.status(404).json({ isOk: false, status: 404, message: `No Leaves Allocated to Employee: ${employee.employeeName} for Leave Type: ${leaveType.leaveTypeName}` });
    }

    const leaveBalance = await getLeaveBalance(employeeId, leaveTypeId, encashmentDate);

    let actualEncashableDays = Math.max(leaveBalance, 0);
    if (leaveType.nonEncashableLeaves) {
      actualEncashableDays = Math.max(actualEncashableDays - leaveType.nonEncashableLeaves, 0);
    }
    if (leaveType.maxEncashableLeaves) {
      actualEncashableDays = Math.min(actualEncashableDays, leaveType.maxEncashableLeaves);
    }

    const encashmentDays = req.body.encashmentDays !== undefined && req.body.encashmentDays !== null
      ? Number(req.body.encashmentDays)
      : actualEncashableDays;
    if (encashmentDays > actualEncashableDays) {
      return res.status(400).json({ isOk: false, status: 400, message: `Encashment Days cannot exceed Actual Encashable Days (${actualEncashableDays})` });
    }
    if (encashmentDays <= 0) {
      return res.status(400).json({ isOk: false, status: 400, message: "Encashment Days must be greater than zero" });
    }

    const encashmentAmount = encashmentDays * Number(perDayEncashmentAmount);

    const doc = await LeaveEncashment.create({
      employeeId,
      leaveTypeId,
      leaveAllocationId: allocation._id,
      leavePeriodId: allocation.leavePeriodId || null,
      companyId: employee.companyId,
      encashmentDate,
      leaveBalance,
      actualEncashableDays,
      encashmentDays,
      perDayEncashmentAmount: Number(perDayEncashmentAmount),
      encashmentAmount,
    });

    await LeaveLedgerEntry.create({
      employeeId,
      leaveTypeId,
      transactionType: "LeaveEncashment",
      transactionId: doc._id,
      leaves: -encashmentDays,
      fromDate: encashmentDate,
      toDate: encashmentDate,
      isCarryForward: false,
      companyId: employee.companyId,
    });

    return res.status(201).json({ isOk: true, status: 201, message: "Leave Encashment created successfully", data: { _id: doc._id, encashmentAmount } });
  } catch (error) {
    console.log("Error in createLeaveEncashment", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getLeaveEncashmentById = async (req, res) => {
  try {
    const doc = await LeaveEncashment.findById(req.params.leaveEncashmentId)
      .populate("employeeId", "employeeName employeeCode")
      .populate("leaveTypeId", "leaveTypeName")
      .populate("leaveAllocationId", "fromDate toDate");
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Leave Encashment not found" });
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getLeaveEncashmentById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listLeaveEncashmentByParams = async (req, res) => {
  try {
    const list = await runListQuery(LeaveEncashment, req.body, {
      searchFields: [],
      filterable: {
        employeeId: "objectId",
        leaveTypeId: "objectId",
        leaveAllocationId: "objectId",
        status: "string",
        companyId: "objectId",
        encashmentDate: "date",
        createdAt: "date",
      },
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log("Error in listLeaveEncashmentByParams", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

/**
 * Defense-in-depth guard (issue #11) — this collection is immutable once
 * created (create is the action), so there is deliberately no real update
 * path. But `/mark-paid` needs `edit` permission on this menu row, which
 * also makes the generic edit form reachable — this returns a clean 400
 * instead of letting `config.api.update` be `undefined` and crash the admin
 * on Save.
 */
export const updateLeaveEncashment = async (req, res) =>
  res.status(400).json({ isOk: false, status: 400, message: "A Leave Encashment cannot be edited after creation — use Mark as Paid instead." });

/** POST /leave-encashments/:id/mark-paid — amount/date/reference, no GL, no Payment Entry (ADR-016/Q-3 precedent). */
export const markLeaveEncashmentPaid = async (req, res) => {
  try {
    const doc = await LeaveEncashment.findById(req.params.leaveEncashmentId);
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Leave Encashment not found" });
    if (doc.status === "paid") {
      return res.status(400).json({ isOk: false, status: 400, message: "This encashment is already marked as paid" });
    }

    doc.status = "paid";
    doc.paymentDate = req.body.paymentDate ? new Date(req.body.paymentDate) : new Date();
    doc.paymentReference = req.body.paymentReference || "";
    doc.paidAmount = req.body.paidAmount !== undefined && req.body.paidAmount !== null
      ? Number(req.body.paidAmount)
      : doc.encashmentAmount;
    await doc.save();

    return res.status(200).json({ isOk: true, status: 200, message: "Leave Encashment marked as paid" });
  } catch (error) {
    console.log("Error in markLeaveEncashmentPaid", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// ============================================================== LeaveBlockList --

const LEAVE_BLOCK_LIST_FIELDS = ["leaveBlockListName", "companyId", "appliesToAllDepartments", "departmentId", "leaveTypeId", "blockDates", "allowList"];

/** Leave Block List.md Validation Rule #1 — no duplicate blockDate within the table. */
const findDuplicateBlockDate = (blockDates = []) => {
  const seen = new Set();
  for (const row of blockDates) {
    const key = new Date(row.blockDate).toISOString().slice(0, 10);
    if (seen.has(key)) return key;
    seen.add(key);
  }
  return null;
};

export const createLeaveBlockList = async (req, res) => {
  try {
    const { leaveBlockListName, companyId, blockDates } = req.body;
    if (!leaveBlockListName || !companyId) {
      return res.status(400).json({ isOk: false, status: 400, message: "Leave Block List Name and Company are required" });
    }
    if (!blockDates || blockDates.length === 0) {
      return res.status(400).json({ isOk: false, status: 400, message: "At least one Block Date is required" });
    }
    const duplicate = findDuplicateBlockDate(blockDates);
    if (duplicate) return res.status(400).json({ isOk: false, status: 400, message: `Date is repeated: ${duplicate}` });

    const existing = await LeaveBlockList.findOne({ leaveBlockListName });
    if (existing) return res.status(400).json({ isOk: false, status: 400, message: "A Leave Block List with this name already exists" });

    const payload = {};
    for (const field of LEAVE_BLOCK_LIST_FIELDS) if (req.body[field] !== undefined) payload[field] = req.body[field];
    const doc = await LeaveBlockList.create(payload);
    return res.status(201).json({ isOk: true, status: 201, message: "Leave Block List created successfully", data: { _id: doc._id } });
  } catch (error) {
    console.log("Error in createLeaveBlockList", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateLeaveBlockList = async (req, res) => {
  try {
    const doc = await LeaveBlockList.findById(req.params.leaveBlockListId);
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Leave Block List not found" });

    if (req.body.blockDates !== undefined) {
      const duplicate = findDuplicateBlockDate(req.body.blockDates);
      if (duplicate) return res.status(400).json({ isOk: false, status: 400, message: `Date is repeated: ${duplicate}` });
    }

    for (const field of LEAVE_BLOCK_LIST_FIELDS) if (req.body[field] !== undefined) doc[field] = req.body[field];
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Leave Block List updated successfully" });
  } catch (error) {
    console.log("Error in updateLeaveBlockList", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteLeaveBlockList = async (req, res) => {
  try {
    const { leaveBlockListId } = req.params;
    const doc = await LeaveBlockList.findById(leaveBlockListId);
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Leave Block List not found" });
    const result = await referenceGuardedDelete(LeaveBlockList, "LeaveBlockList", leaveBlockListId, "leave block list");
    if (result.blocked) return res.status(409).json(result.body);
    return res.status(200).json({ isOk: true, status: 200, message: "Leave Block List deleted successfully" });
  } catch (error) {
    console.log("Error in deleteLeaveBlockList", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getLeaveBlockListById = async (req, res) => {
  try {
    const doc = await LeaveBlockList.findById(req.params.leaveBlockListId)
      .populate("companyId", "companyName")
      .populate("departmentId", "departmentName")
      .populate("leaveTypeId", "leaveTypeName");
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Leave Block List not found" });
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getLeaveBlockListById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listLeaveBlockListByParams = async (req, res) => {
  try {
    const list = await runListQuery(LeaveBlockList, req.body, {
      searchFields: ["leaveBlockListName"],
      filterable: {
        leaveBlockListName: "string",
        companyId: "objectId",
        departmentId: "objectId",
        leaveTypeId: "objectId",
        appliesToAllDepartments: "boolean",
        isActive: "boolean",
        createdAt: "date",
      },
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log("Error in listLeaveBlockListByParams", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// ========================================================= Leave Control Panel --
// Stateless bulk-action form (ADR-024/source: a Frappe Single with
// disable_save) — no stored model, two bulk-action endpoints with per-item
// try/catch isolation so one employee's failure never aborts the batch.

/** Shared by both bulk endpoints below — creates one LeavePolicyAssignment for one employee, or throws. */
const createOnePolicyAssignment = async (item) => {
  const { employeeId, leavePolicyId } = item;
  if (!employeeId || !leavePolicyId) throw new Error("Employee and Leave Policy are required");
  const employee = await Employee.findById(employeeId).lean();
  if (!employee) throw new Error("Employee not found");

  let effectiveFrom = item.effectiveFrom;
  let effectiveTo = item.effectiveTo;
  if (item.assignmentBasedOn === "Leave Period" && item.leavePeriodId) {
    const period = await LeavePeriod.findById(item.leavePeriodId).lean();
    if (!period) throw new Error("Leave Period not found");
    effectiveFrom = period.fromDate;
    effectiveTo = period.toDate;
  } else if (item.assignmentBasedOn === "Joining Date") {
    effectiveFrom = employee.dateOfJoining;
    effectiveTo = item.effectiveTo || addDays(effectiveFrom, 365);
  }
  if (!effectiveFrom || !effectiveTo) throw new Error("Effective From and Effective To could not be resolved");

  const overlap = await LeavePolicyAssignment.findOne({
    employeeId,
    effectiveTo: { $gte: effectiveFrom },
    effectiveFrom: { $lte: effectiveTo },
  }).lean();
  if (overlap) throw new Error("A Leave Policy is already assigned for this Employee for an overlapping period");

  return LeavePolicyAssignment.create({
    employeeId,
    leavePolicyId,
    companyId: employee.companyId,
    assignmentBasedOn: item.assignmentBasedOn || "",
    leavePeriodId: item.leavePeriodId || null,
    effectiveFrom,
    effectiveTo,
    // The bulk tool defaults carryForward to true (source's own documented
    // UX difference from a plain Leave Allocation's default of false).
    carryForward: item.carryForward !== undefined ? Boolean(item.carryForward) : true,
  });
};

/**
 * POST /leave-control-panel/bulk-policy-assignments — body: `{ items:
 * [{ employeeId, leavePolicyId, leavePeriodId, assignmentBasedOn,
 * effectiveFrom, effectiveTo, carryForward }] }`. Creates the
 * LeavePolicyAssignment rows themselves, left unallocated (no grant-
 * allocations call) — matches source's create_leave_policy_assignments path
 * without the immediate submit-and-allocate step. Per-item try/catch
 * isolation: one employee's failure never aborts the batch.
 */
export const bulkCreatePolicyAssignments = async (req, res) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (items.length === 0) {
      return res.status(400).json({ isOk: false, status: 400, message: "Please select at least one employee to perform this action" });
    }

    const results = [];
    for (const item of items) {
      try {
        const assignment = await createOnePolicyAssignment(item); // eslint-disable-line no-await-in-loop
        results.push({ employeeId: String(item.employeeId), success: true, leavePolicyAssignmentId: String(assignment._id) });
      } catch (itemError) {
        results.push({ employeeId: String(item.employeeId || ""), success: false, error: itemError.message });
      }
    }

    return res.status(200).json({ isOk: true, status: 200, message: "Bulk policy assignment run complete", data: { results } });
  } catch (error) {
    console.log("Error in bulkCreatePolicyAssignments", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

/**
 * POST /leave-control-panel/bulk-allocations — same item shape as
 * bulk-policy-assignments, but additionally calls
 * grantAllocationsForAssignment for each employee immediately after
 * creating the assignment — "reuses the existing LeavePolicyAssignment +
 * grant-allocations logic per employee" per the module's own design.
 * Per-item try/catch isolation, same as above.
 */
export const bulkAllocateLeaves = async (req, res) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (items.length === 0) {
      return res.status(400).json({ isOk: false, status: 400, message: "Please select at least one employee to perform this action" });
    }

    const results = [];
    for (const item of items) {
      try {
        const assignment = await createOnePolicyAssignment(item); // eslint-disable-line no-await-in-loop
        const grantResult = await grantAllocationsForAssignment(assignment._id); // eslint-disable-line no-await-in-loop
        results.push({ employeeId: String(item.employeeId), success: true, leavePolicyAssignmentId: String(assignment._id), ...grantResult });
      } catch (itemError) {
        results.push({ employeeId: String(item.employeeId || ""), success: false, error: itemError.message });
      }
    }

    return res.status(200).json({ isOk: true, status: 200, message: "Bulk allocation run complete", data: { results } });
  } catch (error) {
    console.log("Error in bulkAllocateLeaves", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};
