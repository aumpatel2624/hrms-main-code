/**
 * Leaves (ADR-024, HRMS module 8 foundation half): LeaveType, LeavePeriod,
 * HolidayList (+holidays[]), HolidayListAssignment, LeavePolicy
 * (+leavePolicyDetails[]), LeavePolicyAssignment (+grant-allocations),
 * LeaveAllocation (+earnedLeaveSchedule[], +adjust), LeaveLedgerEntry
 * (read-only). Grouped in one file — a large module, same reasoning as
 * organizationSetup.controller.js/travel.controller.js.
 *
 * Second fork builds LeaveAdjustment/CompensatoryLeaveRequest/
 * LeaveApplication/LeaveEncashment/LeaveBlockList/Leave Control Panel on top
 * of this file's models — none of that is here.
 */
import mongoose from "mongoose";
import { runListQuery } from "../../utils/listQuery.js";
import {
  getReferencingCounts,
  formatReferenceMessage,
} from "../../utils/referenceHelper.js";
import { getLeaveBalance } from "../../utils/leaveBalance.js";
import { prorateTenureLeaves, buildEarnedLeaveSchedule } from "../../utils/leaveProration.js";

import LeaveType from "../../models/LeaveType.js";
import LeavePeriod from "../../models/LeavePeriod.js";
import HolidayList from "../../models/HolidayList.js";
import HolidayListAssignment from "../../models/HolidayListAssignment.js";
import LeavePolicy from "../../models/LeavePolicy.js";
import LeavePolicyAssignment from "../../models/LeavePolicyAssignment.js";
import LeaveAllocation from "../../models/LeaveAllocation.js";
import LeaveLedgerEntry from "../../models/LeaveLedgerEntry.js";
import Employee from "../../models/Employee.js";

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

// ==================================================================== LeaveType --

const LEAVE_TYPE_FIELDS = [
  "leaveTypeName", "isCompensatory", "isLwp", "isPpl", "fractionOfDailySalaryPerLeave",
  "allowNegative", "allowOverAllocation", "includeHoliday", "isOptionalLeave",
  "isCarryForward", "maximumCarryForwardedLeaves", "expireCarryForwardedLeavesAfterDays",
  "allowEncashment", "maxEncashableLeaves", "nonEncashableLeaves", "isEarnedLeave",
  "earnedLeaveFrequency", "allocateOnDay", "rounding", "maxLeavesAllowed",
  "maxContinuousDaysAllowed", "applicableAfter", "isActive",
];

/** Leave Type.md Validation Rules #2-4 — reproduced server-side (no docstatus, so this is create/update, not a submit hook). */
const validateLeaveType = (data) => {
  if (data.isCompensatory && data.isEarnedLeave) {
    return "Leave Type can either be compensatory or earned leave.";
  }
  if (data.isLwp && data.isPpl) {
    return "Leave Type can either be without pay or partial pay.";
  }
  if (data.isPpl) {
    const fraction = data.fractionOfDailySalaryPerLeave;
    if (fraction === undefined || fraction === null || fraction < 0 || fraction > 1) {
      return "The fraction of Daily Salary per Leave should be between 0 and 1.";
    }
  }
  return null;
};

export const createLeaveType = async (req, res) => {
  try {
    const { leaveTypeName } = req.body;
    if (!leaveTypeName) {
      return res.status(400).json({ isOk: false, status: 400, message: "Leave Type name is required" });
    }
    const existing = await LeaveType.findOne({ leaveTypeName });
    if (existing) {
      return res.status(400).json({ isOk: false, status: 400, message: "Leave Type already exists" });
    }
    const error = validateLeaveType(req.body);
    if (error) return res.status(400).json({ isOk: false, status: 400, message: error });

    const payload = {};
    for (const field of LEAVE_TYPE_FIELDS) if (req.body[field] !== undefined) payload[field] = req.body[field];
    await LeaveType.create(payload);
    return res.status(201).json({ isOk: true, status: 201, message: "Leave Type created successfully" });
  } catch (error) {
    console.log("Error in createLeaveType", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateLeaveType = async (req, res) => {
  try {
    const { leaveTypeId } = req.params;
    const doc = await LeaveType.findById(leaveTypeId);
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Leave Type not found" });

    const merged = { ...doc.toObject(), ...req.body };
    const error = validateLeaveType(merged);
    if (error) return res.status(400).json({ isOk: false, status: 400, message: error });

    for (const field of LEAVE_TYPE_FIELDS) if (req.body[field] !== undefined) doc[field] = req.body[field];
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Leave Type updated successfully" });
  } catch (error) {
    console.log("Error in updateLeaveType", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteLeaveType = async (req, res) => {
  try {
    const { leaveTypeId } = req.params;
    const doc = await LeaveType.findById(leaveTypeId);
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Leave Type not found" });
    const result = await referenceGuardedDelete(LeaveType, "LeaveType", leaveTypeId, "leave type");
    if (result.blocked) return res.status(409).json(result.body);
    return res.status(200).json({ isOk: true, status: 200, message: "Leave Type deleted successfully" });
  } catch (error) {
    console.log("Error in deleteLeaveType", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getLeaveTypeById = async (req, res) => {
  try {
    const doc = await LeaveType.findById(req.params.leaveTypeId);
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Leave Type not found" });
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getLeaveTypeById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listLeaveTypes = async (_req, res) => {
  try {
    const docs = await LeaveType.find({ isActive: true });
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    console.log("Error in listLeaveTypes", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listLeaveTypeByParams = async (req, res) => {
  try {
    const list = await runListQuery(LeaveType, req.body, {
      searchFields: ["leaveTypeName"],
      filterable: {
        leaveTypeName: "string",
        isLwp: "boolean",
        isEarnedLeave: "boolean",
        isCompensatory: "boolean",
        isActive: "boolean",
        createdAt: "date",
      },
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log("Error in listLeaveTypeByParams", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// ================================================================== LeavePeriod --

const LEAVE_PERIOD_FIELDS = ["fromDate", "toDate", "companyId", "optionalHolidayListId", "isActive"];

const validateLeavePeriodDates = (fromDate, toDate) => {
  if (new Date(fromDate) >= new Date(toDate)) return "To date can not be equal or less than from date";
  return null;
};

/** Leave Period.md Validation Rule #2 — overlap check scoped per company. */
const assertNoLeavePeriodOverlap = async (companyId, fromDate, toDate, excludeId) => {
  const overlap = await LeavePeriod.findOne({
    companyId,
    _id: excludeId ? { $ne: excludeId } : { $exists: true },
    fromDate: { $lte: toDate },
    toDate: { $gte: fromDate },
  });
  if (overlap) {
    return `A Leave Period already exists between ${new Date(overlap.fromDate).toDateString()} and ${new Date(overlap.toDate).toDateString()} for this company`;
  }
  return null;
};

export const createLeavePeriod = async (req, res) => {
  try {
    const { fromDate, toDate, companyId } = req.body;
    if (!fromDate || !toDate || !companyId) {
      return res.status(400).json({ isOk: false, status: 400, message: "From Date, To Date and Company are required" });
    }
    const dateError = validateLeavePeriodDates(fromDate, toDate);
    if (dateError) return res.status(400).json({ isOk: false, status: 400, message: dateError });
    const overlapError = await assertNoLeavePeriodOverlap(companyId, fromDate, toDate);
    if (overlapError) return res.status(400).json({ isOk: false, status: 400, message: overlapError });

    const payload = {};
    for (const field of LEAVE_PERIOD_FIELDS) if (req.body[field] !== undefined) payload[field] = req.body[field];
    await LeavePeriod.create(payload);
    return res.status(201).json({ isOk: true, status: 201, message: "Leave Period created successfully" });
  } catch (error) {
    console.log("Error in createLeavePeriod", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateLeavePeriod = async (req, res) => {
  try {
    const { leavePeriodId } = req.params;
    const doc = await LeavePeriod.findById(leavePeriodId);
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Leave Period not found" });

    const fromDate = req.body.fromDate ?? doc.fromDate;
    const toDate = req.body.toDate ?? doc.toDate;
    const companyId = req.body.companyId ?? doc.companyId;
    const dateError = validateLeavePeriodDates(fromDate, toDate);
    if (dateError) return res.status(400).json({ isOk: false, status: 400, message: dateError });
    const overlapError = await assertNoLeavePeriodOverlap(companyId, fromDate, toDate, leavePeriodId);
    if (overlapError) return res.status(400).json({ isOk: false, status: 400, message: overlapError });

    for (const field of LEAVE_PERIOD_FIELDS) if (req.body[field] !== undefined) doc[field] = req.body[field];
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Leave Period updated successfully" });
  } catch (error) {
    console.log("Error in updateLeavePeriod", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteLeavePeriod = async (req, res) => {
  try {
    const { leavePeriodId } = req.params;
    const doc = await LeavePeriod.findById(leavePeriodId);
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Leave Period not found" });
    const result = await referenceGuardedDelete(LeavePeriod, "LeavePeriod", leavePeriodId, "leave period");
    if (result.blocked) return res.status(409).json(result.body);
    return res.status(200).json({ isOk: true, status: 200, message: "Leave Period deleted successfully" });
  } catch (error) {
    console.log("Error in deleteLeavePeriod", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getLeavePeriodById = async (req, res) => {
  try {
    const doc = await LeavePeriod.findById(req.params.leavePeriodId).populate("companyId", "companyName");
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Leave Period not found" });
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getLeavePeriodById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listLeavePeriods = async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.companyId) filter.companyId = req.query.companyId;
    const docs = await LeavePeriod.find(filter);
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    console.log("Error in listLeavePeriods", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listLeavePeriodByParams = async (req, res) => {
  try {
    const list = await runListQuery(LeavePeriod, req.body, {
      searchFields: [],
      filterable: {
        companyId: "objectId",
        fromDate: "date",
        toDate: "date",
        isActive: "boolean",
        createdAt: "date",
      },
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log("Error in listLeavePeriodByParams", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// ================================================================== HolidayList --

const HOLIDAY_LIST_FIELDS = ["holidayListName", "fromDate", "toDate", "companyId", "holidays", "isActive"];

export const createHolidayList = async (req, res) => {
  try {
    const { holidayListName, fromDate, toDate, companyId } = req.body;
    if (!holidayListName || !fromDate || !toDate || !companyId) {
      return res.status(400).json({ isOk: false, status: 400, message: "Holiday List name, From Date, To Date and Company are required" });
    }
    if (new Date(fromDate) > new Date(toDate)) {
      return res.status(400).json({ isOk: false, status: 400, message: "To date cannot be before from date" });
    }
    const payload = {};
    for (const field of HOLIDAY_LIST_FIELDS) if (req.body[field] !== undefined) payload[field] = req.body[field];
    await HolidayList.create(payload);
    return res.status(201).json({ isOk: true, status: 201, message: "Holiday List created successfully" });
  } catch (error) {
    console.log("Error in createHolidayList", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateHolidayList = async (req, res) => {
  try {
    const { holidayListId } = req.params;
    const doc = await HolidayList.findById(holidayListId);
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Holiday List not found" });

    const fromDate = req.body.fromDate ?? doc.fromDate;
    const toDate = req.body.toDate ?? doc.toDate;
    if (new Date(fromDate) > new Date(toDate)) {
      return res.status(400).json({ isOk: false, status: 400, message: "To date cannot be before from date" });
    }

    for (const field of HOLIDAY_LIST_FIELDS) if (req.body[field] !== undefined) doc[field] = req.body[field];
    await doc.save(); // totalHolidays recomputed by the pre-save hook
    return res.status(200).json({ isOk: true, status: 200, message: "Holiday List updated successfully" });
  } catch (error) {
    console.log("Error in updateHolidayList", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteHolidayList = async (req, res) => {
  try {
    const { holidayListId } = req.params;
    const doc = await HolidayList.findById(holidayListId);
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Holiday List not found" });
    const result = await referenceGuardedDelete(HolidayList, "HolidayList", holidayListId, "holiday list");
    if (result.blocked) return res.status(409).json(result.body);
    return res.status(200).json({ isOk: true, status: 200, message: "Holiday List deleted successfully" });
  } catch (error) {
    console.log("Error in deleteHolidayList", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getHolidayListById = async (req, res) => {
  try {
    const doc = await HolidayList.findById(req.params.holidayListId).populate("companyId", "companyName");
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Holiday List not found" });
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getHolidayListById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listHolidayLists = async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.companyId) filter.companyId = req.query.companyId;
    const docs = await HolidayList.find(filter).select("holidayListName fromDate toDate companyId totalHolidays");
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    console.log("Error in listHolidayLists", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listHolidayListByParams = async (req, res) => {
  try {
    const list = await runListQuery(HolidayList, req.body, {
      searchFields: ["holidayListName"],
      filterable: {
        holidayListName: "string",
        companyId: "objectId",
        isActive: "boolean",
        createdAt: "date",
      },
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log("Error in listHolidayListByParams", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// ======================================================= HolidayListAssignment --

const HOLIDAY_LIST_ASSIGNMENT_FIELDS = ["holidayListId", "applicableFor", "employeeId", "companyId", "fromDate", "isActive"];

const validateHolidayListAssignment = async (data, excludeId) => {
  if (!data.holidayListId || !data.applicableFor || !data.fromDate) {
    return "Holiday List, Applicable For and From Date are required";
  }
  const assignedToId = data.applicableFor === "Employee" ? data.employeeId : data.companyId;
  const otherId = data.applicableFor === "Employee" ? data.companyId : data.employeeId;
  if (!assignedToId) {
    return `${data.applicableFor === "Employee" ? "Employee" : "Company"} is required when Applicable For is ${data.applicableFor}`;
  }
  if (otherId) {
    return "Only one of Employee/Company may be set, matching Applicable For";
  }

  const holidayList = await HolidayList.findById(data.holidayListId);
  if (!holidayList) return "Holiday List not found";
  const assignmentStart = new Date(data.fromDate);
  if (assignmentStart < new Date(holidayList.fromDate) || assignmentStart > new Date(holidayList.toDate)) {
    return "Assignment start date cannot be outside holiday list dates";
  }

  const assignedField = data.applicableFor === "Employee" ? "employeeId" : "companyId";
  const duplicate = await HolidayListAssignment.findOne({
    [assignedField]: assignedToId,
    fromDate: data.fromDate,
    _id: excludeId ? { $ne: excludeId } : { $exists: true },
  });
  if (duplicate) {
    return `Holiday List Assignment for this ${assignedField === "employeeId" ? "employee" : "company"} already exists for this date`;
  }
  return null;
};

export const createHolidayListAssignment = async (req, res) => {
  try {
    const error = await validateHolidayListAssignment(req.body);
    if (error) return res.status(400).json({ isOk: false, status: 400, message: error });

    const payload = {};
    for (const field of HOLIDAY_LIST_ASSIGNMENT_FIELDS) if (req.body[field] !== undefined) payload[field] = req.body[field];
    await HolidayListAssignment.create(payload);
    return res.status(201).json({ isOk: true, status: 201, message: "Holiday List Assignment created successfully" });
  } catch (error) {
    console.log("Error in createHolidayListAssignment", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateHolidayListAssignment = async (req, res) => {
  try {
    const { holidayListAssignmentId } = req.params;
    const doc = await HolidayListAssignment.findById(holidayListAssignmentId);
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Holiday List Assignment not found" });

    const merged = { ...doc.toObject(), ...req.body };
    const error = await validateHolidayListAssignment(merged, holidayListAssignmentId);
    if (error) return res.status(400).json({ isOk: false, status: 400, message: error });

    for (const field of HOLIDAY_LIST_ASSIGNMENT_FIELDS) if (req.body[field] !== undefined) doc[field] = req.body[field];
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Holiday List Assignment updated successfully" });
  } catch (error) {
    console.log("Error in updateHolidayListAssignment", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteHolidayListAssignment = async (req, res) => {
  try {
    const { holidayListAssignmentId } = req.params;
    const doc = await HolidayListAssignment.findById(holidayListAssignmentId);
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Holiday List Assignment not found" });
    const result = await referenceGuardedDelete(HolidayListAssignment, "HolidayListAssignment", holidayListAssignmentId, "holiday list assignment");
    if (result.blocked) return res.status(409).json(result.body);
    return res.status(200).json({ isOk: true, status: 200, message: "Holiday List Assignment deleted successfully" });
  } catch (error) {
    console.log("Error in deleteHolidayListAssignment", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getHolidayListAssignmentById = async (req, res) => {
  try {
    const doc = await HolidayListAssignment.findById(req.params.holidayListAssignmentId)
      .populate("holidayListId", "holidayListName fromDate toDate")
      .populate("employeeId", "employeeName employeeCode")
      .populate("companyId", "companyName");
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Holiday List Assignment not found" });
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getHolidayListAssignmentById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listHolidayListAssignments = async (_req, res) => {
  try {
    const docs = await HolidayListAssignment.find({ isActive: true });
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    console.log("Error in listHolidayListAssignments", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listHolidayListAssignmentByParams = async (req, res) => {
  try {
    const list = await runListQuery(HolidayListAssignment, req.body, {
      searchFields: [],
      filterable: {
        holidayListId: "objectId",
        applicableFor: "string",
        employeeId: "objectId",
        companyId: "objectId",
        fromDate: "date",
        isActive: "boolean",
        createdAt: "date",
      },
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log("Error in listHolidayListAssignmentByParams", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// ================================================================= LeavePolicy --

const LEAVE_POLICY_FIELDS = ["title", "leavePolicyDetails", "isActive"];

/** Leave Policy.md Validation Rule #1 — annualAllocation capped at the leave type's own maxLeavesAllowed, when set. */
const validateLeavePolicyDetails = async (leavePolicyDetails = []) => {
  for (const detail of leavePolicyDetails) {
    // eslint-disable-next-line no-await-in-loop
    const leaveType = await LeaveType.findById(detail.leaveTypeId).lean();
    if (!leaveType) return "One of the Leave Policy Details references an unknown Leave Type";
    if (leaveType.maxLeavesAllowed > 0 && detail.annualAllocation > leaveType.maxLeavesAllowed) {
      return `Maximum leave allowed in the leave type ${leaveType.leaveTypeName} is ${leaveType.maxLeavesAllowed}`;
    }
  }
  return null;
};

export const createLeavePolicy = async (req, res) => {
  try {
    const { title, leavePolicyDetails } = req.body;
    if (!title || !leavePolicyDetails || leavePolicyDetails.length === 0) {
      return res.status(400).json({ isOk: false, status: 400, message: "Title and at least one Leave Policy Detail are required" });
    }
    const error = await validateLeavePolicyDetails(leavePolicyDetails);
    if (error) return res.status(400).json({ isOk: false, status: 400, message: error });

    const payload = {};
    for (const field of LEAVE_POLICY_FIELDS) if (req.body[field] !== undefined) payload[field] = req.body[field];
    await LeavePolicy.create(payload);
    return res.status(201).json({ isOk: true, status: 201, message: "Leave Policy created successfully" });
  } catch (error) {
    console.log("Error in createLeavePolicy", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateLeavePolicy = async (req, res) => {
  try {
    const { leavePolicyId } = req.params;
    const doc = await LeavePolicy.findById(leavePolicyId);
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Leave Policy not found" });

    if (req.body.leavePolicyDetails !== undefined) {
      const error = await validateLeavePolicyDetails(req.body.leavePolicyDetails);
      if (error) return res.status(400).json({ isOk: false, status: 400, message: error });
    }

    for (const field of LEAVE_POLICY_FIELDS) if (req.body[field] !== undefined) doc[field] = req.body[field];
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Leave Policy updated successfully" });
  } catch (error) {
    console.log("Error in updateLeavePolicy", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteLeavePolicy = async (req, res) => {
  try {
    const { leavePolicyId } = req.params;
    const doc = await LeavePolicy.findById(leavePolicyId);
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Leave Policy not found" });
    const result = await referenceGuardedDelete(LeavePolicy, "LeavePolicy", leavePolicyId, "leave policy");
    if (result.blocked) return res.status(409).json(result.body);
    return res.status(200).json({ isOk: true, status: 200, message: "Leave Policy deleted successfully" });
  } catch (error) {
    console.log("Error in deleteLeavePolicy", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getLeavePolicyById = async (req, res) => {
  try {
    const doc = await LeavePolicy.findById(req.params.leavePolicyId).populate("leavePolicyDetails.leaveTypeId", "leaveTypeName");
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Leave Policy not found" });
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getLeavePolicyById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listLeavePolicies = async (_req, res) => {
  try {
    const docs = await LeavePolicy.find({ isActive: true }).select("title leavePolicyDetails");
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    console.log("Error in listLeavePolicies", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listLeavePolicyByParams = async (req, res) => {
  try {
    const list = await runListQuery(LeavePolicy, req.body, {
      searchFields: ["title"],
      filterable: { title: "string", isActive: "boolean", createdAt: "date" },
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log("Error in listLeavePolicyByParams", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// ======================================================= LeavePolicyAssignment --

const LEAVE_POLICY_ASSIGNMENT_FIELDS = [
  "employeeId", "leavePolicyId", "assignmentBasedOn", "leavePeriodId",
  "effectiveFrom", "effectiveTo", "carryForward", "isActive",
];

const lastDayOfMonthUTC = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));

/** Leave Policy Assignment.md's `set_dates()` — force-derives the effective dates from the chosen basis. */
const applyAssignmentDates = async (data) => {
  if (data.assignmentBasedOn === "Leave Period") {
    if (!data.leavePeriodId) return { error: "Leave Period is required when Assignment based on is Leave Period" };
    const period = await LeavePeriod.findById(data.leavePeriodId).lean();
    if (!period) return { error: "Leave Period not found" };
    return { effectiveFrom: period.fromDate, effectiveTo: period.toDate };
  }
  if (data.assignmentBasedOn === "Joining Date") {
    const employee = await Employee.findById(data.employeeId).lean();
    if (!employee) return { error: "Employee not found" };
    const effectiveFrom = employee.dateOfJoining;
    const effectiveTo = data.effectiveTo || lastDayOfMonthUTC(new Date(new Date(effectiveFrom).setUTCMonth(new Date(effectiveFrom).getUTCMonth() + 12)));
    return { effectiveFrom, effectiveTo };
  }
  if (!data.effectiveFrom || !data.effectiveTo) {
    return { error: "Effective From and Effective To are required" };
  }
  return { effectiveFrom: data.effectiveFrom, effectiveTo: data.effectiveTo };
};

/** Leave Policy Assignment.md Validation Rule #2 — overlap per employee, against OTHER assignments. */
const assertNoAssignmentOverlap = async (employeeId, effectiveFrom, effectiveTo, excludeId) => {
  const overlap = await LeavePolicyAssignment.findOne({
    employeeId,
    _id: excludeId ? { $ne: excludeId } : { $exists: true },
    effectiveTo: { $gte: effectiveFrom },
    effectiveFrom: { $lte: effectiveTo },
  });
  if (overlap) {
    return `A Leave Policy is already assigned for this Employee for period ${new Date(overlap.effectiveFrom).toDateString()} to ${new Date(overlap.effectiveTo).toDateString()}`;
  }
  return null;
};

export const createLeavePolicyAssignment = async (req, res) => {
  try {
    const { employeeId, leavePolicyId } = req.body;
    if (!employeeId || !leavePolicyId) {
      return res.status(400).json({ isOk: false, status: 400, message: "Employee and Leave Policy are required" });
    }
    const employee = await Employee.findById(employeeId).lean();
    if (!employee) return res.status(404).json({ isOk: false, status: 404, message: "Employee not found" });

    const dates = await applyAssignmentDates(req.body);
    if (dates.error) return res.status(400).json({ isOk: false, status: 400, message: dates.error });

    const overlapError = await assertNoAssignmentOverlap(employeeId, dates.effectiveFrom, dates.effectiveTo);
    if (overlapError) return res.status(400).json({ isOk: false, status: 400, message: overlapError });

    const payload = {};
    for (const field of LEAVE_POLICY_ASSIGNMENT_FIELDS) if (req.body[field] !== undefined) payload[field] = req.body[field];
    payload.effectiveFrom = dates.effectiveFrom;
    payload.effectiveTo = dates.effectiveTo;
    payload.companyId = employee.companyId;

    const doc = await LeavePolicyAssignment.create(payload);
    return res.status(201).json({ isOk: true, status: 201, message: "Leave Policy Assignment created successfully", data: { _id: doc._id } });
  } catch (error) {
    console.log("Error in createLeavePolicyAssignment", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateLeavePolicyAssignment = async (req, res) => {
  try {
    const { leavePolicyAssignmentId } = req.params;
    const doc = await LeavePolicyAssignment.findById(leavePolicyAssignmentId);
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Leave Policy Assignment not found" });

    const merged = { ...doc.toObject(), ...req.body };
    const dates = await applyAssignmentDates(merged);
    if (dates.error) return res.status(400).json({ isOk: false, status: 400, message: dates.error });
    const overlapError = await assertNoAssignmentOverlap(merged.employeeId, dates.effectiveFrom, dates.effectiveTo, leavePolicyAssignmentId);
    if (overlapError) return res.status(400).json({ isOk: false, status: 400, message: overlapError });

    for (const field of LEAVE_POLICY_ASSIGNMENT_FIELDS) if (req.body[field] !== undefined) doc[field] = req.body[field];
    doc.effectiveFrom = dates.effectiveFrom;
    doc.effectiveTo = dates.effectiveTo;
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Leave Policy Assignment updated successfully" });
  } catch (error) {
    console.log("Error in updateLeavePolicyAssignment", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteLeavePolicyAssignment = async (req, res) => {
  try {
    const { leavePolicyAssignmentId } = req.params;
    const doc = await LeavePolicyAssignment.findById(leavePolicyAssignmentId);
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Leave Policy Assignment not found" });
    const result = await referenceGuardedDelete(LeavePolicyAssignment, "LeavePolicyAssignment", leavePolicyAssignmentId, "leave policy assignment");
    if (result.blocked) return res.status(409).json(result.body);
    return res.status(200).json({ isOk: true, status: 200, message: "Leave Policy Assignment deleted successfully" });
  } catch (error) {
    console.log("Error in deleteLeavePolicyAssignment", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getLeavePolicyAssignmentById = async (req, res) => {
  try {
    const doc = await LeavePolicyAssignment.findById(req.params.leavePolicyAssignmentId)
      .populate("employeeId", "employeeName employeeCode")
      .populate("leavePolicyId", "title")
      .populate("leavePeriodId", "fromDate toDate")
      .populate("companyId", "companyName");
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Leave Policy Assignment not found" });
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getLeavePolicyAssignmentById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listLeavePolicyAssignments = async (_req, res) => {
  try {
    const docs = await LeavePolicyAssignment.find({ isActive: true }).select("employeeId leavePolicyId status effectiveFrom effectiveTo");
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    console.log("Error in listLeavePolicyAssignments", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listLeavePolicyAssignmentByParams = async (req, res) => {
  try {
    const list = await runListQuery(LeavePolicyAssignment, req.body, {
      searchFields: [],
      filterable: {
        employeeId: "objectId",
        leavePolicyId: "objectId",
        leavePeriodId: "objectId",
        companyId: "objectId",
        status: "string",
        createdAt: "date",
      },
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log("Error in listLeavePolicyAssignmentByParams", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

/**
 * Business logic behind POST /leave-policy-assignments/:id/grant-allocations
 * — ADR-024's fold of source's `grant_leave_alloc_for_employee` (on_submit).
 * Idempotent via `leavesAllocated`. Skips LWP leave types entirely (never
 * allocated via this flow, matching source). Pro-ration: see
 * utils/leaveProration.js.
 *
 * Extracted from the route handler (module complete, second fork) so Leave
 * Control Panel's bulk-allocations endpoint can call the same logic
 * per-employee without going through HTTP — "reuse before you write"
 * (AGENTS.md). Throws an `Error` with a `.status` property on a known
 * failure (404/400); the HTTP handler below translates that, and a bulk
 * caller can catch it per-item.
 *
 * @returns {Promise<{created: object[], skipped: object[]}>}
 */
export const grantAllocationsForAssignment = async (leavePolicyAssignmentId) => {
  const assignment = await LeavePolicyAssignment.findById(leavePolicyAssignmentId);
  if (!assignment) {
    const error = new Error("Leave Policy Assignment not found");
    error.status = 404;
    throw error;
  }
  if (assignment.leavesAllocated) {
    const error = new Error("Leave already has been assigned for this Leave Policy Assignment");
    error.status = 400;
    throw error;
  }

  const policy = await LeavePolicy.findById(assignment.leavePolicyId).lean();
  if (!policy) {
    const error = new Error("Leave Policy not found");
    error.status = 404;
    throw error;
  }
  const employee = await Employee.findById(assignment.employeeId).lean();
  if (!employee) {
    const error = new Error("Employee not found");
    error.status = 404;
    throw error;
  }

  const today = new Date();
  const fromDate = new Date(assignment.effectiveFrom);
  const toDate = new Date(assignment.effectiveTo);
  const dateOfJoining = employee.dateOfJoining ? new Date(employee.dateOfJoining) : null;

  const created = [];
  const skipped = [];

  for (const detail of policy.leavePolicyDetails) {
    // eslint-disable-next-line no-await-in-loop
    const leaveType = await LeaveType.findById(detail.leaveTypeId).lean();
    if (!leaveType || leaveType.isLwp) continue; // LWP types are never allocated via this flow

    let newLeavesAllocated = 0;
    let earnedLeaveSchedule = [];

    if (leaveType.isCompensatory) {
      newLeavesAllocated = 0; // compensatory leave is never allocated up front
    } else if (leaveType.isEarnedLeave) {
      earnedLeaveSchedule = buildEarnedLeaveSchedule({
        annualAllocation: detail.annualAllocation,
        frequency: leaveType.earnedLeaveFrequency,
        rounding: leaveType.rounding,
        fromDate,
        toDate,
        dateOfJoining,
        today,
      });
      newLeavesAllocated = earnedLeaveSchedule
        .filter((row) => row.isAllocated)
        .reduce((sum, row) => sum + row.numberOfLeaves, 0);
    } else {
      newLeavesAllocated = prorateTenureLeaves(detail.annualAllocation, dateOfJoining, fromDate, toDate);
    }

    // Annual allocation is a hard ceiling, except Yearly-frequency earned leave.
    if (
      newLeavesAllocated > detail.annualAllocation
      && !(leaveType.isEarnedLeave && leaveType.earnedLeaveFrequency === "Yearly")
    ) {
      newLeavesAllocated = detail.annualAllocation;
    }

    if (newLeavesAllocated === 0 && !leaveType.isEarnedLeave && !leaveType.allowNegative) {
      skipped.push({ leaveTypeId: String(detail.leaveTypeId), reason: "computed allocation is 0" });
      continue; // eslint-disable-line no-continue
    }

    // Carry-forward: sum of the previous allocation's balance as of its
    // own end date, clamped to LeaveType.maximumCarryForwardedLeaves.
    let unusedLeaves = 0;
    if (assignment.carryForward && leaveType.isCarryForward) {
      // eslint-disable-next-line no-await-in-loop
      const previousAllocation = await LeaveAllocation.findOne({
        employeeId: employee._id,
        leaveTypeId: leaveType._id,
        toDate: { $lt: fromDate },
      }).sort({ toDate: -1 });
      if (previousAllocation) {
        // eslint-disable-next-line no-await-in-loop
        const balance = await getLeaveBalance(employee._id, leaveType._id, previousAllocation.toDate);
        unusedLeaves = Math.max(balance, 0);
        if (leaveType.maximumCarryForwardedLeaves && unusedLeaves > leaveType.maximumCarryForwardedLeaves) {
          unusedLeaves = leaveType.maximumCarryForwardedLeaves;
        }
      }
    }

    const totalLeavesAllocated = unusedLeaves + newLeavesAllocated;

    // eslint-disable-next-line no-await-in-loop
    const allocation = await LeaveAllocation.create({
      employeeId: employee._id,
      leaveTypeId: leaveType._id,
      companyId: employee.companyId,
      fromDate,
      toDate,
      newLeavesAllocated,
      carryForward: Boolean(assignment.carryForward && leaveType.isCarryForward),
      unusedLeaves,
      totalLeavesAllocated,
      leavePeriodId: assignment.leavePeriodId || null,
      leavePolicyId: assignment.leavePolicyId,
      leavePolicyAssignmentId: assignment._id,
      status: "active",
      earnedLeaveSchedule,
    });

    if (unusedLeaves > 0) {
      // eslint-disable-next-line no-await-in-loop
      await LeaveLedgerEntry.create({
        employeeId: employee._id,
        leaveTypeId: leaveType._id,
        transactionType: "LeaveAllocation",
        transactionId: allocation._id,
        leaves: unusedLeaves,
        fromDate,
        toDate,
        isCarryForward: true,
        companyId: employee.companyId,
      });
    }
    if (newLeavesAllocated !== 0) {
      // eslint-disable-next-line no-await-in-loop
      await LeaveLedgerEntry.create({
        employeeId: employee._id,
        leaveTypeId: leaveType._id,
        transactionType: "LeaveAllocation",
        transactionId: allocation._id,
        leaves: newLeavesAllocated,
        fromDate,
        toDate,
        isCarryForward: false,
        companyId: employee.companyId,
      });
    }

    created.push({ leaveTypeId: String(leaveType._id), allocationId: String(allocation._id), newLeavesAllocated, unusedLeaves });
  }

  assignment.leavesAllocated = true;
  assignment.status = "allocated";
  await assignment.save();

  return { created, skipped };
};

/** Thin HTTP wrapper around grantAllocationsForAssignment — see its own doc comment. */
export const grantLeavePolicyAssignmentAllocations = async (req, res) => {
  try {
    const result = await grantAllocationsForAssignment(req.params.leavePolicyAssignmentId);
    return res.status(200).json({
      isOk: true,
      status: 200,
      message: "Leave allocations granted successfully",
      data: result,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ isOk: false, status: error.status, message: error.message });
    }
    console.log("Error in grantLeavePolicyAssignmentAllocations", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// =============================================================== LeaveAllocation --

const LEAVE_ALLOCATION_FIELDS = [
  "employeeId", "leaveTypeId", "companyId", "fromDate", "toDate", "carryForward",
  "leavePeriodId", "leavePolicyId", "leavePolicyAssignmentId", "status", "isActive",
];

export const createLeaveAllocation = async (req, res) => {
  try {
    const { employeeId, leaveTypeId, fromDate, toDate } = req.body;
    if (!employeeId || !leaveTypeId || !fromDate || !toDate) {
      return res.status(400).json({ isOk: false, status: 400, message: "Employee, Leave Type, From Date and To Date are required" });
    }
    if (new Date(fromDate) >= new Date(toDate)) {
      return res.status(400).json({ isOk: false, status: 400, message: "To date cannot be before from date" });
    }
    const leaveType = await LeaveType.findById(leaveTypeId).lean();
    if (!leaveType) return res.status(404).json({ isOk: false, status: 404, message: "Leave Type not found" });
    if (leaveType.isLwp) {
      return res.status(400).json({ isOk: false, status: 400, message: `Leave Type ${leaveType.leaveTypeName} cannot be allocated since it is leave without pay` });
    }

    const newLeavesAllocated = Number(req.body.newLeavesAllocated) || 0;
    const unusedLeaves = Number(req.body.unusedLeaves) || 0;

    const payload = {};
    for (const field of LEAVE_ALLOCATION_FIELDS) if (req.body[field] !== undefined) payload[field] = req.body[field];
    payload.newLeavesAllocated = newLeavesAllocated;
    payload.unusedLeaves = unusedLeaves;
    payload.totalLeavesAllocated = newLeavesAllocated + unusedLeaves;

    const allocation = await LeaveAllocation.create(payload);

    if (newLeavesAllocated !== 0 || unusedLeaves !== 0) {
      if (newLeavesAllocated !== 0) {
        await LeaveLedgerEntry.create({
          employeeId, leaveTypeId, transactionType: "LeaveAllocation", transactionId: allocation._id,
          leaves: newLeavesAllocated, fromDate, toDate, isCarryForward: false, companyId: payload.companyId,
        });
      }
      if (unusedLeaves !== 0) {
        await LeaveLedgerEntry.create({
          employeeId, leaveTypeId, transactionType: "LeaveAllocation", transactionId: allocation._id,
          leaves: unusedLeaves, fromDate, toDate, isCarryForward: true, companyId: payload.companyId,
        });
      }
    }

    return res.status(201).json({ isOk: true, status: 201, message: "Leave Allocation created successfully", data: { _id: allocation._id } });
  } catch (error) {
    console.log("Error in createLeaveAllocation", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

/**
 * `newLeavesAllocated` cannot change through this generic endpoint once the
 * allocation is `active` — only `/adjust` may change it (same "explicit
 * action, not raw field PATCH" pattern this project used for Training
 * Event's markCompleted). Every other field updates normally.
 */
export const updateLeaveAllocation = async (req, res) => {
  try {
    const { leaveAllocationId } = req.params;
    const doc = await LeaveAllocation.findById(leaveAllocationId);
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Leave Allocation not found" });

    if (
      req.body.newLeavesAllocated !== undefined
      && Number(req.body.newLeavesAllocated) !== doc.newLeavesAllocated
      && doc.status === "active"
    ) {
      return res.status(400).json({
        isOk: false,
        status: 400,
        message: "newLeavesAllocated cannot be changed directly on an active allocation — use POST /leave-allocations/:id/adjust",
      });
    }

    for (const field of LEAVE_ALLOCATION_FIELDS) if (req.body[field] !== undefined) doc[field] = req.body[field];
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Leave Allocation updated successfully" });
  } catch (error) {
    console.log("Error in updateLeaveAllocation", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteLeaveAllocation = async (req, res) => {
  try {
    const { leaveAllocationId } = req.params;
    const doc = await LeaveAllocation.findById(leaveAllocationId);
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Leave Allocation not found" });
    const result = await referenceGuardedDelete(LeaveAllocation, "LeaveAllocation", leaveAllocationId, "leave allocation");
    if (result.blocked) return res.status(409).json(result.body);
    return res.status(200).json({ isOk: true, status: 200, message: "Leave Allocation deleted successfully" });
  } catch (error) {
    console.log("Error in deleteLeaveAllocation", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getLeaveAllocationById = async (req, res) => {
  try {
    const doc = await LeaveAllocation.findById(req.params.leaveAllocationId);
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Leave Allocation not found" });
    // Balance computed from the raw (unpopulated) ids — issue #13: passing
    // a populated sub-document into getLeaveBalance's ObjectId constructor
    // threw, since a populated Mongoose document's String() is not its hex
    // id. Populate only happens after, purely for display.
    const balance = await getLeaveBalance(doc.employeeId, doc.leaveTypeId, new Date());
    await doc.populate([
      { path: "employeeId", select: "employeeName employeeCode" },
      { path: "leaveTypeId", select: "leaveTypeName" },
      { path: "companyId", select: "companyName" },
    ]);
    return res.status(200).json({ isOk: true, status: 200, data: { ...doc.toObject(), currentBalance: balance } });
  } catch (error) {
    console.log("Error in getLeaveAllocationById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listLeaveAllocations = async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.employeeId) filter.employeeId = req.query.employeeId;
    const docs = await LeaveAllocation.find(filter).select("employeeId leaveTypeId fromDate toDate newLeavesAllocated totalLeavesAllocated status");
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    console.log("Error in listLeaveAllocations", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listLeaveAllocationByParams = async (req, res) => {
  try {
    const list = await runListQuery(LeaveAllocation, req.body, {
      searchFields: [],
      filterable: {
        employeeId: "objectId",
        leaveTypeId: "objectId",
        companyId: "objectId",
        leavePolicyAssignmentId: "objectId",
        status: "string",
        createdAt: "date",
      },
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log("Error in listLeaveAllocationByParams", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

/**
 * POST /leave-allocations/:id/adjust — ADR-024's fold of source's
 * `on_update_after_submit` (the ONLY supported way to change
 * `newLeavesAllocated` post-creation). Writes a signed delta ledger entry.
 */
export const adjustLeaveAllocation = async (req, res) => {
  try {
    const { leaveAllocationId } = req.params;
    const { newLeavesAllocated } = req.body;
    if (newLeavesAllocated === undefined || newLeavesAllocated === null) {
      return res.status(400).json({ isOk: false, status: 400, message: "newLeavesAllocated is required" });
    }

    const allocation = await LeaveAllocation.findById(leaveAllocationId);
    if (!allocation) return res.status(404).json({ isOk: false, status: 404, message: "Leave Allocation not found" });
    if (allocation.status !== "active") {
      return res.status(400).json({ isOk: false, status: 400, message: `Cannot adjust a ${allocation.status} allocation` });
    }

    const leaveType = await LeaveType.findById(allocation.leaveTypeId).lean();
    const delta = Number(newLeavesAllocated) - allocation.newLeavesAllocated;
    if (delta === 0) {
      return res.status(200).json({ isOk: true, status: 200, message: "No change — newLeavesAllocated already matches", data: { delta: 0 } });
    }

    const nextTotal = allocation.unusedLeaves + Number(newLeavesAllocated);
    if (leaveType?.maxLeavesAllowed && nextTotal > leaveType.maxLeavesAllowed) {
      return res.status(400).json({
        isOk: false,
        status: 400,
        message: `Total allocated leaves are more than maximum allocation allowed (${leaveType.maxLeavesAllowed}) for ${leaveType.leaveTypeName}`,
      });
    }
    if (!leaveType?.allowOverAllocation) {
      const periodDays = Math.round((new Date(allocation.toDate) - new Date(allocation.fromDate)) / 86400000) + 1;
      if (nextTotal > periodDays) {
        return res.status(400).json({ isOk: false, status: 400, message: "Total Leaves Allocated are more than the number of days in the allocation period" });
      }
    }

    await LeaveLedgerEntry.create({
      employeeId: allocation.employeeId,
      leaveTypeId: allocation.leaveTypeId,
      transactionType: "LeaveAllocation",
      transactionId: allocation._id,
      leaves: delta,
      fromDate: new Date(),
      toDate: allocation.toDate,
      isCarryForward: false,
      companyId: allocation.companyId,
    });

    allocation.newLeavesAllocated = Number(newLeavesAllocated);
    allocation.totalLeavesAllocated = allocation.unusedLeaves + allocation.newLeavesAllocated;
    await allocation.save();

    const balance = await getLeaveBalance(allocation.employeeId, allocation.leaveTypeId, new Date());
    return res.status(200).json({
      isOk: true,
      status: 200,
      message: "Leave Allocation adjusted successfully",
      data: { delta, newLeavesAllocated: allocation.newLeavesAllocated, currentBalance: balance },
    });
  } catch (error) {
    console.log("Error in adjustLeaveAllocation", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// ============================================================= LeaveLedgerEntry --
// Read-only (ADR-024) — append-only, system-written by grant-allocations/
// adjust here, and by the second fork's Application/Encashment/Adjustment
// actions. No create/update/delete endpoint at all.

export const getLeaveLedgerEntryById = async (req, res) => {
  try {
    const doc = await LeaveLedgerEntry.findById(req.params.leaveLedgerEntryId)
      .populate("employeeId", "employeeName employeeCode")
      .populate("leaveTypeId", "leaveTypeName");
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Leave Ledger Entry not found" });
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getLeaveLedgerEntryById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listLeaveLedgerEntryByParams = async (req, res) => {
  try {
    const list = await runListQuery(LeaveLedgerEntry, req.body, {
      searchFields: [],
      filterable: {
        employeeId: "objectId",
        leaveTypeId: "objectId",
        transactionType: "string",
        companyId: "objectId",
        isCarryForward: "boolean",
        isExpired: "boolean",
        createdAt: "date",
      },
      stages: [
        { $lookup: { from: "employees", localField: "employeeId", foreignField: "_id", as: "employee" } },
        { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: "leavetypes", localField: "leaveTypeId", foreignField: "_id", as: "leaveType" } },
        { $unwind: { path: "$leaveType", preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            employeeName: { $ifNull: ["$employee.employeeName", ""] },
            leaveTypeName: { $ifNull: ["$leaveType.leaveTypeName", ""] },
          },
        },
      ],
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log("Error in listLeaveLedgerEntryByParams", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getLeaveBalanceForEmployee = async (req, res) => {
  try {
    const { employeeId, leaveTypeId } = req.query;
    if (!employeeId || !leaveTypeId || !mongoose.Types.ObjectId.isValid(employeeId) || !mongoose.Types.ObjectId.isValid(leaveTypeId)) {
      return res.status(400).json({ isOk: false, status: 400, message: "Valid employeeId and leaveTypeId query params are required" });
    }
    const balance = await getLeaveBalance(employeeId, leaveTypeId, req.query.asOfDate ? new Date(req.query.asOfDate) : new Date());
    return res.status(200).json({ isOk: true, status: 200, data: { balance } });
  } catch (error) {
    console.log("Error in getLeaveBalanceForEmployee", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};
