/**
 * ADR-027 — Payroll (Run), foundation half. `PayrollPeriod` (company-scoped
 * date-range bookkeeping), `PayrollSettings` (global singleton, SeoSettings.js's
 * exact pattern) and `SalarySlip` (the real payroll-run document: create
 * resolves payment days + evaluates the three component tables via the
 * unchanged formula evaluator with a richer context, submit/cancel are
 * explicit actions).
 *
 * Company confinement for PayrollPeriod/SalarySlip reuses `attendanceScope`
 * (ADR-025/026) with `employeeOwned: false` — same "HR-configuration/
 * transactional data, no self-service dimension" shape as module 10.
 * `PayrollSettings` has no company dimension at all (a true global
 * singleton) so it never touches `attendanceScope`.
 */
import { runListQuery } from "../../utils/listQuery.js";
import { attendanceScope } from "../../utils/attendanceScope.js";
import { getCurrentSalaryStructureAssignment } from "../../utils/payrollAssignment.js";
import { calculateSalarySlipForEmployee } from "../../utils/salarySlipCalc.js";
import { getLeaveBalance } from "../../utils/leaveBalance.js";
import PayrollPeriod from "../../models/PayrollPeriod.js";
import PayrollSettings from "../../models/PayrollSettings.js";
import SalarySlip from "../../models/SalarySlip.js";
import SalaryStructure from "../../models/SalaryStructure.js";
import SalaryStructureAssignment from "../../models/SalaryStructureAssignment.js";
import Employee from "../../models/Employee.js";
import LeaveType from "../../models/LeaveType.js";
import LeaveAllocation from "../../models/LeaveAllocation.js";

const failure = (res, error) => {
  if (error.status) return res.status(error.status).json({ isOk: false, status: error.status, message: error.message });
  if (error.name === "ValidationError" || error.name === "CastError" || error.code === 11000) {
    return res.status(400).json({ isOk: false, status: 400, message: error.code === 11000 ? "A record with these unique values already exists" : error.message });
  }
  console.error("Payroll Run request failed", error);
  return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
};

const throwError = (status, message) => { const error = new Error(message); error.status = status; throw error; };

// ================================================================ PayrollPeriod --

export const PAYROLLPERIOD_FIELDS = ["companyId", "startDate", "endDate", "isActive"];

const assertNoOverlap = async (companyId, startDate, endDate, excludeId) => {
  const overlap = await PayrollPeriod.findOne({
    companyId,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  });
  if (overlap) throwError(400, "This Payroll Period overlaps another Payroll Period for the same company");
};

export const createPayrollPeriod = async (req, res) => {
  try {
    const { companyId, startDate, endDate, isActive } = req.body;
    if (!companyId || !startDate || !endDate) {
      return res.status(400).json({ isOk: false, status: 400, message: "Company, Start Date and End Date are required" });
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) return res.status(400).json({ isOk: false, status: 400, message: "Start Date cannot be after End Date" });

    await assertNoOverlap(companyId, start, end);

    const doc = await PayrollPeriod.create({ companyId, startDate: start, endDate: end, isActive: isActive ?? true });
    return res.status(201).json({ isOk: true, status: 201, data: doc, message: "Payroll Period created successfully" });
  } catch (error) { return failure(res, error); }
};

export const updatePayrollPeriod = async (req, res) => {
  try {
    const doc = await PayrollPeriod.findOne({ $and: [{ _id: req.params.payrollPeriodId }, await attendanceScope(req, false)] });
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Payroll Period not found" });

    const start = req.body.startDate !== undefined ? new Date(req.body.startDate) : doc.startDate;
    const end = req.body.endDate !== undefined ? new Date(req.body.endDate) : doc.endDate;
    if (start > end) return res.status(400).json({ isOk: false, status: 400, message: "Start Date cannot be after End Date" });

    await assertNoOverlap(doc.companyId, start, end, doc._id);

    doc.startDate = start;
    doc.endDate = end;
    if (req.body.isActive !== undefined) doc.isActive = req.body.isActive;
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, data: doc, message: "Payroll Period updated successfully" });
  } catch (error) { return failure(res, error); }
};

export const getPayrollPeriodById = async (req, res) => {
  try {
    const doc = await PayrollPeriod.findOne({ $and: [{ _id: req.params.payrollPeriodId }, await attendanceScope(req, false)] }).populate("companyId", "companyName");
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Payroll Period not found" });
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) { return failure(res, error); }
};

export const listPayrollPeriods = async (req, res) => {
  try {
    const docs = await PayrollPeriod.find({ $and: [{ isActive: true }, await attendanceScope(req, false)] });
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) { return failure(res, error); }
};

export const searchPayrollPeriods = async (req, res) => {
  try {
    const data = await runListQuery(PayrollPeriod, req.body, {
      scopeFilter: await attendanceScope(req, false),
      searchFields: [],
      filterable: {
        companyId: "objectId", startDate: "date", endDate: "date", isActive: "boolean", createdAt: "date",
      },
      stages: [
        { $lookup: { from: "companies", localField: "companyId", foreignField: "_id", as: "companyId_joined" } },
        { $addFields: { companyIdLabel: { $arrayElemAt: ["$companyId_joined.companyName", 0] } } },
        { $project: { companyId_joined: 0 } },
      ],
    });
    return res.status(200).json({ isOk: true, status: 200, data });
  } catch (error) { return failure(res, error); }
};

export const deletePayrollPeriod = async (req, res) => {
  try {
    const doc = await PayrollPeriod.findOne({ $and: [{ _id: req.params.payrollPeriodId }, await attendanceScope(req, false)] });
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Payroll Period not found" });
    await PayrollPeriod.findByIdAndUpdate(doc._id, { isDeleted: true });
    return res.status(200).json({ isOk: true, status: 200, message: "Payroll Period deleted successfully" });
  } catch (error) { return failure(res, error); }
};

// =============================================================== PayrollSettings --
// A true global singleton (SeoSettings.js's exact pattern) — no company
// dimension, find-or-create-with-defaults on first read, then update it.

export const PAYROLLSETTINGS_FIELDS = [
  "payrollBasedOn", "considerUnmarkedAttendanceAs", "includeHolidaysInTotalWorkingDays",
  "considerMarkedAttendanceOnHolidays", "dailyWagesFractionForHalfDay", "disableRoundedTotal",
  "showLeaveBalancesInSalarySlip",
];

export const getPayrollSettingsDoc = async () => {
  const existing = await PayrollSettings.findOne({ key: "default" });
  if (existing) return existing;
  return PayrollSettings.create({ key: "default" });
};

export const getPayrollSettings = async (req, res) => {
  try {
    const settings = await getPayrollSettingsDoc();
    return res.status(200).json({ isOk: true, status: 200, data: settings });
  } catch (error) { return failure(res, error); }
};

export const updatePayrollSettings = async (req, res) => {
  try {
    await getPayrollSettingsDoc();
    const update = {};
    for (const field of PAYROLLSETTINGS_FIELDS) if (req.body[field] !== undefined) update[field] = req.body[field];
    const settings = await PayrollSettings.findOneAndUpdate({ key: "default" }, update, { new: true });
    return res.status(200).json({ isOk: true, status: 200, data: settings, message: "Payroll Settings updated successfully" });
  } catch (error) { return failure(res, error); }
};

// =================================================================== SalarySlip --

/**
 * One row per Leave Type the employee has an allocation covering `asOfDate`
 * for — a deliberately scoped-down 3-field snapshot (allocated/used/
 * available), see SalarySlip.js's file-level comment for why this isn't
 * source's full 5-field `Salary Slip Leave` shape.
 */
const buildLeaveSnapshot = async (employeeId, asOfDate) => {
  const allocations = await LeaveAllocation.find({
    employeeId,
    status: "active",
    fromDate: { $lte: asOfDate },
    toDate: { $gte: asOfDate },
  }).lean();
  if (!allocations.length) return [];

  const byLeaveType = new Map();
  for (const allocation of allocations) {
    const key = String(allocation.leaveTypeId);
    byLeaveType.set(key, (byLeaveType.get(key) || 0) + (allocation.newLeavesAllocated || 0));
  }

  const rows = [];
  for (const [leaveTypeId, allocated] of byLeaveType.entries()) {
    const available = await getLeaveBalance(employeeId, leaveTypeId, asOfDate); // eslint-disable-line no-await-in-loop
    rows.push({ leaveTypeId, allocated, used: Math.max(0, allocated - available), available });
  }
  return rows;
};

export const createSalarySlip = async (req, res) => {
  try {
    const { employeeId, startDate, endDate } = req.body;
    if (!employeeId || !startDate || !endDate) {
      return res.status(400).json({ isOk: false, status: 400, message: "Employee, Start Date and End Date are required" });
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) return res.status(400).json({ isOk: false, status: 400, message: "Start Date cannot be after End Date" });

    const employee = await Employee.findById(employeeId).lean();
    if (!employee) return res.status(404).json({ isOk: false, status: 404, message: "Employee not found" });
    // Reuses this project's established active-employee guard.
    if (employee.status === "Inactive") {
      return res.status(400).json({ isOk: false, status: 400, message: `Transactions cannot be created for an Inactive Employee ${employee.employeeName}` });
    }
    if (!employee.dateOfJoining) {
      return res.status(400).json({ isOk: false, status: 400, message: `Please set the Date Of Joining for employee ${employee.employeeName}` });
    }
    // Source's real `validate_dates()` guards (Salary Slip.md rules 6/7).
    if (new Date(employee.dateOfJoining) > end) {
      return res.status(400).json({ isOk: false, status: 400, message: "Cannot create Salary Slip for Employee joining after Payroll Period" });
    }
    if (employee.relievingDate && new Date(employee.relievingDate) < start) {
      return res.status(400).json({ isOk: false, status: 400, message: "Cannot create Salary Slip for Employee who has left before Payroll Period" });
    }

    // Exact-duplicate-(employeeId,startDate,endDate) guard — a clean message
    // ahead of the real unique index backing it (source's `check_existing()`).
    const duplicate = await SalarySlip.findOne({ employeeId, startDate: start, endDate: end });
    if (duplicate) {
      return res.status(400).json({ isOk: false, status: 400, message: `Salary Slip of employee ${employee.employeeName} already created for this period` });
    }

    let assignment;
    if (req.body.salaryStructureAssignmentId) {
      assignment = await SalaryStructureAssignment.findById(req.body.salaryStructureAssignmentId);
      if (!assignment) return res.status(404).json({ isOk: false, status: 404, message: "Salary Structure Assignment not found" });
    } else {
      assignment = await getCurrentSalaryStructureAssignment(employeeId, end);
      if (!assignment) {
        return res.status(400).json({
          isOk: false, status: 400,
          message: `Please assign a Salary Structure for Employee ${employee.employeeName} applicable from or before ${end.toISOString().slice(0, 10)} first`,
        });
      }
    }

    const structure = await SalaryStructure.findById(assignment.salaryStructureId);
    if (!structure) return res.status(400).json({ isOk: false, status: 400, message: "Salary Structure not found" });

    const settings = await getPayrollSettingsDoc();

    const calc = await calculateSalarySlipForEmployee({ employeeId, startDate: start, endDate: end, settings, structure, assignment });

    const leaves = settings.showLeaveBalancesInSalarySlip ? await buildLeaveSnapshot(employeeId, end) : [];

    const doc = await SalarySlip.create({
      employeeId,
      salaryStructureAssignmentId: assignment._id,
      companyId: employee.companyId,
      startDate: start,
      endDate: end,
      workingDays: calc.workingDays,
      totalWorkingDays: calc.totalWorkingDays,
      paymentDays: calc.paymentDays,
      lwpDays: calc.lwpDays,
      absentDays: calc.absentDays,
      halfDayDays: calc.halfDayDays,
      earnings: calc.earnings,
      deductions: calc.deductions,
      employerContributions: calc.employerContributions,
      grossPay: calc.grossPay,
      totalDeduction: calc.totalDeduction,
      netPay: calc.netPay,
      leaves,
      status: "draft",
    });
    return res.status(201).json({ isOk: true, status: 201, data: doc, message: "Salary Slip created successfully" });
  } catch (error) { return failure(res, error); }
};

/**
 * A Salary Slip is a point-in-time snapshot (ADR-027) — every field is
 * server-computed at creation and never edited afterward; Submit/Cancel are
 * the only real actions. This endpoint exists only so the admin's generic
 * edit screen has something to call — the route's `allowOnlyFields([])`
 * means no field can actually be changed through it.
 */
export const updateSalarySlip = async (req, res) => {
  try {
    const doc = await SalarySlip.findOne({ $and: [{ _id: req.params.salarySlipId }, await attendanceScope(req, false)] });
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Salary Slip not found" });
    return res.status(200).json({ isOk: true, status: 200, data: doc, message: "A Salary Slip is a read-only snapshot — use Submit/Cancel instead" });
  } catch (error) { return failure(res, error); }
};

export const getSalarySlipById = async (req, res) => {
  try {
    const doc = await SalarySlip.findOne({ $and: [{ _id: req.params.salarySlipId }, await attendanceScope(req, false)] })
      .populate("employeeId", "employeeName employeeCode")
      .populate("salaryStructureAssignmentId", "salaryStructureId")
      .populate("companyId", "companyName")
      .populate("earnings.salaryComponentId", "salaryComponentName abbreviation")
      .populate("deductions.salaryComponentId", "salaryComponentName abbreviation")
      .populate("employerContributions.salaryComponentId", "salaryComponentName abbreviation")
      .populate("leaves.leaveTypeId", "leaveTypeName");
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Salary Slip not found" });
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) { return failure(res, error); }
};

export const listSalarySlips = async (req, res) => {
  try {
    const docs = await SalarySlip.find(await attendanceScope(req, false));
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) { return failure(res, error); }
};

export const searchSalarySlips = async (req, res) => {
  try {
    const data = await runListQuery(SalarySlip, req.body, {
      scopeFilter: await attendanceScope(req, false),
      searchFields: [],
      filterable: {
        employeeId: "objectId", companyId: "objectId", startDate: "date", endDate: "date",
        status: "string", createdAt: "date",
      },
      stages: [
        { $lookup: { from: "employees", localField: "employeeId", foreignField: "_id", as: "employeeId_joined" } },
        { $addFields: { employeeIdLabel: { $arrayElemAt: ["$employeeId_joined.employeeName", 0] } } },
        { $project: { employeeId_joined: 0 } },
        { $lookup: { from: "companies", localField: "companyId", foreignField: "_id", as: "companyId_joined" } },
        { $addFields: { companyIdLabel: { $arrayElemAt: ["$companyId_joined.companyName", 0] } } },
        { $project: { companyId_joined: 0 } },
      ],
    });
    return res.status(200).json({ isOk: true, status: 200, data });
  } catch (error) { return failure(res, error); }
};

export const deleteSalarySlip = async (req, res) => {
  try {
    const doc = await SalarySlip.findOne({ $and: [{ _id: req.params.salarySlipId }, await attendanceScope(req, false)] });
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Salary Slip not found" });
    await SalarySlip.findByIdAndUpdate(doc._id, { isDeleted: true });
    return res.status(200).json({ isOk: true, status: 200, message: "Salary Slip deleted successfully" });
  } catch (error) { return failure(res, error); }
};

/**
 * Re-validates `netPay >= 0` (source's real `on_submit()` gate — a draft MAY
 * be negative, only submit enforces this) and flips status. No GL, no
 * email, no linked-doctype side effects (all out of this module's scope).
 */
export const submitSalarySlip = async (req, res) => {
  try {
    const doc = await SalarySlip.findOne({ $and: [{ _id: req.params.salarySlipId }, await attendanceScope(req, false)] });
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Salary Slip not found" });
    if (doc.status !== "draft") return res.status(400).json({ isOk: false, status: 400, message: "Only a draft Salary Slip can be submitted" });
    if (doc.netPay < 0) return res.status(400).json({ isOk: false, status: 400, message: "Net Pay cannot be less than 0" });

    doc.status = "submitted";
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, data: doc, message: "Salary Slip submitted successfully" });
  } catch (error) { return failure(res, error); }
};

/** Status flip only — no GL/ledger reversal (ADR-016/027's no-GL scope). */
export const cancelSalarySlip = async (req, res) => {
  try {
    const doc = await SalarySlip.findOne({ $and: [{ _id: req.params.salarySlipId }, await attendanceScope(req, false)] });
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Salary Slip not found" });
    if (doc.status === "cancelled") return res.status(400).json({ isOk: false, status: 400, message: "Salary Slip is already cancelled" });

    doc.status = "cancelled";
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, data: doc, message: "Salary Slip cancelled successfully" });
  } catch (error) { return failure(res, error); }
};
