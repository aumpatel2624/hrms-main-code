import mongoose from "mongoose";
import { runListQuery } from "../../utils/listQuery.js";
import { attendanceScope } from "../../utils/attendanceScope.js";
import { resolveRequestEmployee } from "../../utils/requestEmployee.js";
import { SCOPES } from "@demo-panel/shared/scopes";
import EmployeeBenefitApplication from "../../models/EmployeeBenefitApplication.js";
import EmployeeBenefitClaim from "../../models/EmployeeBenefitClaim.js";
import EmployeeBenefitLedger from "../../models/EmployeeBenefitLedger.js";
import PayrollCorrection from "../../models/PayrollCorrection.js";
import AdditionalSalary from "../../models/AdditionalSalary.js";
import SalarySlip from "../../models/SalarySlip.js";
import SalaryComponent from "../../models/SalaryComponent.js";
import SalaryStructure from "../../models/SalaryStructure.js";
import SalaryStructureAssignment from "../../models/SalaryStructureAssignment.js";
import PayrollPeriod from "../../models/PayrollPeriod.js";
import Employee from "../../models/Employee.js";
import {
  createBenefitLedgerEntry,
  getBenefitLedgerBalance,
  deleteBenefitLedgerEntriesByReference,
} from "../../utils/employeeBenefitLedger.js";
import { getBenefitsDetailsParent } from "../../utils/employeeBenefitSource.js";
import { getCurrentSalaryStructureAssignment } from "../../utils/payrollAssignment.js";
import { previewCurrentCycleBenefitAccrual } from "../../utils/salarySlipCalc.js";
import { calculatePayrollCorrectionBreakup } from "../../utils/payrollCorrectionCalc.js";

const round2 = (val) => Math.round((Number(val || 0) + Number.EPSILON) * 100) / 100;

const failure = (res, error) => {
  if (error.status) {
    return res.status(error.status).json({ isOk: false, status: error.status, message: error.message });
  }
  if (error.name === "ValidationError" || error.name === "CastError" || error.code === 11000) {
    return res.status(400).json({
      isOk: false,
      status: 400,
      message: error.code === 11000 ? "A record with these unique values already exists" : error.message,
    });
  }
  console.error("Payroll Benefits request failed", error);
  return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
};

const throwError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  throw error;
};

// ============================================================================
// 1. Employee Benefit Application
// ============================================================================

export const EMPLOYEE_BENEFIT_APPLICATION_FIELDS = [
  "employeeId",
  "payrollPeriodId",
  "currency",
  "employeeBenefits",
  "remarks",
  "date",
];

export const EMPLOYEE_BENEFIT_APPLICATION_FILTERABLE = {
  employeeId: "objectId",
  companyId: "objectId",
  payrollPeriodId: "objectId",
  currency: "string",
  maxBenefits: "number",
  totalAmount: "number",
  remainingBenefit: "number",
  status: "string",
  date: "date",
  createdAt: "date",
};

const computeAndValidateApplication = async ({
  employeeId,
  payrollPeriodId,
  employeeBenefits,
  excludeId = null,
}) => {
  const employee = await Employee.findById(employeeId).lean();
  if (!employee) throwError(404, "Employee not found");
  if (employee.status === "Inactive") {
    throwError(400, `Transactions cannot be created for an Inactive Employee ${employee.employeeName}`);
  }

  const period = await PayrollPeriod.findById(payrollPeriodId).lean();
  if (!period) throwError(404, "Payroll Period not found");
  if (!period.isActive) throwError(400, "Payroll Period is inactive");

  // Check duplicate active/draft application for same employee and period
  const duplicate = await EmployeeBenefitApplication.findOne({
    employeeId,
    payrollPeriodId,
    status: { $ne: "cancelled" },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  }).lean();
  if (duplicate) {
    throwError(400, `An active or draft Employee Benefit Application already exists for employee in this payroll period`);
  }

  // Resolve maxBenefits from assignment
  const assignment = await getCurrentSalaryStructureAssignment(employeeId, period.startDate);
  const maxBenefits = round2(assignment?.maxBenefits || 0);
  const currency = assignment?.currency || employee.currency || "USD";

  if (!Array.isArray(employeeBenefits) || employeeBenefits.length === 0) {
    throwError(400, "At least one benefit component must be specified in the application");
  }

  const seenComponents = new Set();
  let totalAmount = 0;
  const processedBenefits = [];

  for (const item of employeeBenefits) {
    const compId = String(item.salaryComponentId?._id || item.salaryComponentId || "");
    if (!compId) throwError(400, "Each benefit detail requires a salaryComponentId");
    if (seenComponents.has(compId)) {
      throwError(400, "Duplicate salary components in benefit details are not allowed");
    }
    seenComponents.add(compId);

    const comp = await SalaryComponent.findById(compId).lean();
    if (!comp) throwError(404, `Salary Component ${compId} not found`);
    if (!comp.isFlexibleBenefit) {
      throwError(400, `Salary Component ${comp.name} is not marked as a flexible benefit`);
    }
    if (comp.payoutMethod === "Accrue and payout at end of payroll period") {
      throwError(400, `Component ${comp.name} with payout method 'Accrue and payout at end of payroll period' cannot be chosen in an application`);
    }

    const amt = round2(item.amount);
    if (amt <= 0) throwError(400, `Amount for component ${comp.name} must be greater than 0`);

    if (comp.maxBenefitAmount && amt > comp.maxBenefitAmount) {
      throwError(400, `Amount for ${comp.name} (${amt}) exceeds maximum component limit (${comp.maxBenefitAmount})`);
    }

    totalAmount = round2(totalAmount + amt);
    processedBenefits.push({
      salaryComponentId: comp._id,
      maxBenefitAmount: comp.maxBenefitAmount || 0,
      amount: amt,
    });
  }

  if (maxBenefits > 0 && totalAmount > maxBenefits) {
    throwError(400, `Total benefit amount (${totalAmount}) exceeds employee max benefits ceiling (${maxBenefits})`);
  }

  const remainingBenefit = maxBenefits > 0 ? Math.max(0, round2(maxBenefits - totalAmount)) : 0;

  return {
    employee,
    period,
    companyId: employee.companyId,
    maxBenefits,
    currency,
    employeeBenefits: processedBenefits,
    totalAmount,
    remainingBenefit,
  };
};

export const createEmployeeBenefitApplication = async (req, res) => {
  try {
    let { employeeId, payrollPeriodId, employeeBenefits, remarks, date } = req.body;

    // Self-service resolution
    if (req.user?.dataScope === SCOPES.OWN) {
      const ownEmp = await resolveRequestEmployee(req);
      if (!ownEmp) throwError(403, "No employee record associated with current user");
      employeeId = ownEmp._id;
    }

    if (!employeeId || !payrollPeriodId) {
      throwError(400, "employeeId and payrollPeriodId are required");
    }

    const validated = await computeAndValidateApplication({
      employeeId,
      payrollPeriodId,
      employeeBenefits,
    });

    const doc = await EmployeeBenefitApplication.create({
      employeeId,
      companyId: validated.companyId,
      payrollPeriodId,
      currency: validated.currency,
      maxBenefits: validated.maxBenefits,
      employeeBenefits: validated.employeeBenefits,
      totalAmount: validated.totalAmount,
      remainingBenefit: validated.remainingBenefit,
      remarks: remarks || "",
      date: date ? new Date(date) : new Date(),
      status: "draft",
    });

    return res.status(201).json({
      isOk: true,
      status: 201,
      message: "Employee Benefit Application created",
      data: doc,
    });
  } catch (error) {
    return failure(res, error);
  }
};

export const updateEmployeeBenefitApplication = async (req, res) => {
  try {
    const doc = await EmployeeBenefitApplication.findById(req.params.id);
    if (!doc) throwError(404, "Employee Benefit Application not found");
    if (doc.status !== "draft") throwError(400, "Only draft applications can be modified");

    // Guard self-service access
    if (req.user?.dataScope === SCOPES.OWN) {
      const ownEmp = await resolveRequestEmployee(req);
      if (!ownEmp || String(doc.employeeId) !== String(ownEmp._id)) {
        throwError(403, "Access denied");
      }
    }

    const employeeId = req.body.employeeId || doc.employeeId;
    const payrollPeriodId = req.body.payrollPeriodId || doc.payrollPeriodId;
    const employeeBenefits = req.body.employeeBenefits || doc.employeeBenefits;

    const validated = await computeAndValidateApplication({
      employeeId,
      payrollPeriodId,
      employeeBenefits,
      excludeId: doc._id,
    });

    doc.employeeId = employeeId;
    doc.companyId = validated.companyId;
    doc.payrollPeriodId = payrollPeriodId;
    doc.currency = validated.currency;
    doc.maxBenefits = validated.maxBenefits;
    doc.employeeBenefits = validated.employeeBenefits;
    doc.totalAmount = validated.totalAmount;
    doc.remainingBenefit = validated.remainingBenefit;
    if (req.body.remarks !== undefined) doc.remarks = req.body.remarks;
    if (req.body.date) doc.date = new Date(req.body.date);

    await doc.save();
    return res.json({ isOk: true, status: 200, message: "Employee Benefit Application updated", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const getEmployeeBenefitApplicationById = async (req, res) => {
  try {
    const doc = await EmployeeBenefitApplication.findById(req.params.id)
      .populate("employeeId")
      .populate("payrollPeriodId")
      .populate("companyId")
      .populate("employeeBenefits.salaryComponentId");
    if (!doc) throwError(404, "Employee Benefit Application not found");

    if (req.user?.dataScope === SCOPES.OWN) {
      const ownEmp = await resolveRequestEmployee(req);
      if (!ownEmp || String(doc.employeeId?._id || doc.employeeId) !== String(ownEmp._id)) {
        throwError(403, "Access denied");
      }
    }

    return res.json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const listEmployeeBenefitApplications = async (req, res) => {
  try {
    const scope = await attendanceScope(req, true); // employeeOwned: true for self-service
    const docs = await EmployeeBenefitApplication.find(scope)
      .populate("employeeId")
      .populate("payrollPeriodId")
      .populate("companyId")
      .populate("employeeBenefits.salaryComponentId")
      .sort({ createdAt: -1 });
    return res.json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    return failure(res, error);
  }
};

export const searchEmployeeBenefitApplications = async (req, res) => {
  try {
    const scope = await attendanceScope(req, true);
    const data = await runListQuery(EmployeeBenefitApplication, req.body, {
      scopeFilter: scope,
      filterable: EMPLOYEE_BENEFIT_APPLICATION_FILTERABLE,
      stages: [
        { $lookup: { from: "employees", localField: "employeeId", foreignField: "_id", as: "employeeId_joined" } },
        { $addFields: { employeeIdLabel: { $arrayElemAt: ["$employeeId_joined.employeeName", 0] } } },
        { $project: { employeeId_joined: 0 } },
      ],
    });
    return res.json({ isOk: true, status: 200, data });
  } catch (error) {
    return failure(res, error);
  }
};

export const submitEmployeeBenefitApplication = async (req, res) => {
  try {
    const doc = await EmployeeBenefitApplication.findById(req.params.id);
    if (!doc) throwError(404, "Employee Benefit Application not found");
    if (doc.status !== "draft") throwError(400, "Only draft applications can be submitted");

    // Re-verify that no other submitted application exists for this employee and period
    const existing = await EmployeeBenefitApplication.findOne({
      employeeId: doc.employeeId,
      payrollPeriodId: doc.payrollPeriodId,
      status: "submitted",
      _id: { $ne: doc._id },
    }).lean();
    if (existing) {
      throwError(400, "A submitted Employee Benefit Application already exists for this employee in this payroll period");
    }

    doc.status = "submitted";
    await doc.save();
    return res.json({ isOk: true, status: 200, message: "Employee Benefit Application submitted", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const cancelEmployeeBenefitApplication = async (req, res) => {
  try {
    const doc = await EmployeeBenefitApplication.findById(req.params.id);
    if (!doc) throwError(404, "Employee Benefit Application not found");
    if (doc.status === "cancelled") throwError(400, "Application is already cancelled");

    doc.status = "cancelled";
    await doc.save();
    return res.json({ isOk: true, status: 200, message: "Employee Benefit Application cancelled", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const deleteEmployeeBenefitApplication = async (req, res) => {
  try {
    const doc = await EmployeeBenefitApplication.findById(req.params.id);
    if (!doc) throwError(404, "Employee Benefit Application not found");
    if (doc.status !== "draft") throwError(400, "Only draft applications can be deleted");

    if (req.user?.dataScope === SCOPES.OWN) {
      const ownEmp = await resolveRequestEmployee(req);
      if (!ownEmp || String(doc.employeeId) !== String(ownEmp._id)) {
        throwError(403, "Access denied");
      }
    }

    await doc.deleteOne();
    return res.json({ isOk: true, status: 200, message: "Employee Benefit Application deleted" });
  } catch (error) {
    return failure(res, error);
  }
};

// ============================================================================
// 2. Employee Benefit Claim
// ============================================================================

export const EMPLOYEE_BENEFIT_CLAIM_FIELDS = [
  "employeeId",
  "claimDate",
  "salaryComponentId",
  "claimedAmount",
  "remarks",
];

export const EMPLOYEE_BENEFIT_CLAIM_FILTERABLE = {
  employeeId: "objectId",
  companyId: "objectId",
  salaryComponentId: "objectId",
  claimDate: "date",
  claimedAmount: "number",
  status: "string",
  additionalSalaryId: "objectId",
  createdAt: "date",
};

/**
 * ADR-029 calculation helper: resolves parent benefit config, ledger running balance,
 * and current cycle accrual preview to determine max claimable amount.
 */
export const calculateClaimEligibility = async ({ employeeId, salaryComponentId, claimDate = new Date() }) => {
  const date = new Date(claimDate);
  const employee = await Employee.findById(employeeId).lean();
  if (!employee) throwError(404, "Employee not found");

  const payrollPeriod = await PayrollPeriod.findOne({
    companyId: employee.companyId,
    startDate: { $lte: date },
    endDate: { $gte: date },
    isActive: true,
  }).lean();
  if (!payrollPeriod) {
    throwError(400, `No active Payroll Period found for claim date ${date.toISOString().slice(0, 10)}`);
  }

  const comp = await SalaryComponent.findById(salaryComponentId).lean();
  if (!comp) throwError(404, "Salary Component not found");
  if (!comp.isFlexibleBenefit) {
    throwError(400, `Salary Component ${comp.name} is not marked as a flexible benefit`);
  }
  if (comp.payoutMethod === "Accrue and payout at end of payroll period") {
    throwError(400, `Component ${comp.name} with payout method 'Accrue and payout at end of payroll period' cannot be claimed`);
  }

  const parentConfig = await getBenefitsDetailsParent(employeeId, payrollPeriod._id, date);
  if (!parentConfig) {
    return {
      eligibleAmount: 0,
      yearlyBenefit: 0,
      accruedToDate: 0,
      paidToDate: 0,
      payrollPeriodId: payrollPeriod._id,
      currency: employee.currency || "USD",
      message: "No flexible benefit configuration or approved application found for employee",
    };
  }

  const benefitItem = (parentConfig.benefits || []).find(
    (b) => String(b.salaryComponentId?._id || b.salaryComponentId) === String(salaryComponentId)
  );
  if (!benefitItem) {
    return {
      eligibleAmount: 0,
      yearlyBenefit: 0,
      accruedToDate: 0,
      paidToDate: 0,
      payrollPeriodId: payrollPeriod._id,
      currency: parentConfig.currency || employee.currency || "USD",
      message: `Component ${comp.name} is not part of employee's benefit allocation`,
    };
  }

  const yearlyBenefit = round2(benefitItem.amount || comp.maxBenefitAmount || 0);
  const { accruedToDate, paidToDate } = await getBenefitLedgerBalance(
    employeeId,
    salaryComponentId,
    payrollPeriod._id
  );

  let eligibleAmount = 0;
  let currentCycleAccrual = 0;

  if (comp.payoutMethod === "Allow claim for full benefit amount") {
    eligibleAmount = Math.max(0, round2(yearlyBenefit - paidToDate));
    return {
      eligibleAmount,
      yearlyBenefit,
      accruedToDate: yearlyBenefit,
      paidToDate,
      payrollPeriodId: payrollPeriod._id,
      currency: parentConfig.currency || employee.currency || "USD",
      payoutMethod: comp.payoutMethod,
    };
  }

  if (comp.payoutMethod === "Accrue per cycle, pay only on claim") {
    const assignment = await getCurrentSalaryStructureAssignment(employeeId, date);
    const structure = assignment ? await SalaryStructure.findById(assignment.salaryStructureId).lean() : null;

    if (structure && assignment) {
      currentCycleAccrual = previewCurrentCycleBenefitAccrual({
        structure,
        assignment,
        salaryComponentId,
        yearlyBenefit,
        dependsOnPaymentDays: comp.dependsOnPaymentDays,
      });
    }

    const totalAccrued = Math.min(yearlyBenefit, round2(accruedToDate + currentCycleAccrual));
    eligibleAmount = Math.max(0, round2(totalAccrued - paidToDate));

    return {
      eligibleAmount,
      yearlyBenefit,
      accruedToDate: totalAccrued,
      paidToDate,
      previewCurrentCycleAccrual: currentCycleAccrual,
      payrollPeriodId: payrollPeriod._id,
      currency: parentConfig.currency || employee.currency || "USD",
      payoutMethod: comp.payoutMethod,
    };
  }

  throwError(400, `Unrecognized flexible benefit payout method: ${comp.payoutMethod}`);
};

export const calculateEligibility = async (req, res) => {
  try {
    let { employeeId, salaryComponentId, claimDate } = req.body;
    if (req.user?.dataScope === SCOPES.OWN) {
      const ownEmp = await resolveRequestEmployee(req);
      if (!ownEmp) throwError(403, "No employee record associated with current user");
      employeeId = ownEmp._id;
    }
    if (!employeeId || !salaryComponentId) {
      throwError(400, "employeeId and salaryComponentId are required");
    }

    const result = await calculateClaimEligibility({
      employeeId,
      salaryComponentId,
      claimDate: claimDate || new Date(),
    });
    return res.json({ isOk: true, status: 200, data: result });
  } catch (error) {
    return failure(res, error);
  }
};

export const createEmployeeBenefitClaim = async (req, res) => {
  try {
    let { employeeId, claimDate, salaryComponentId, claimedAmount, remarks } = req.body;

    if (req.user?.dataScope === SCOPES.OWN) {
      const ownEmp = await resolveRequestEmployee(req);
      if (!ownEmp) throwError(403, "No employee record associated with current user");
      employeeId = ownEmp._id;
    }

    if (!employeeId || !salaryComponentId || !claimedAmount) {
      throwError(400, "employeeId, salaryComponentId, and claimedAmount are required");
    }

    const employee = await Employee.findById(employeeId).lean();
    if (!employee) throwError(404, "Employee not found");
    if (employee.status === "Inactive") {
      throwError(400, `Transactions cannot be created for an Inactive Employee ${employee.employeeName}`);
    }

    const numClaimed = round2(claimedAmount);
    if (numClaimed <= 0) throwError(400, "Claimed amount must be greater than 0");

    const date = claimDate ? new Date(claimDate) : new Date();
    const eligibility = await calculateClaimEligibility({
      employeeId,
      salaryComponentId,
      claimDate: date,
    });

    if (numClaimed > eligibility.eligibleAmount) {
      throwError(
        400,
        `Claimed amount ${numClaimed} exceeds eligible amount ${eligibility.eligibleAmount} (${eligibility.message || "cap reached"})`
      );
    }

    const doc = await EmployeeBenefitClaim.create({
      employeeId,
      companyId: employee.companyId,
      salaryComponentId,
      earningComponentId: salaryComponentId,
      claimDate: date,
      payrollDate: date,
      currency: eligibility.currency || employee.currency || "USD",
      yearlyBenefit: eligibility.yearlyBenefit || 0,
      maxAmountEligible: eligibility.eligibleAmount || 0,
      claimedAmount: numClaimed,
      remarks: remarks || "",
      status: "draft",
    });

    return res.status(201).json({
      isOk: true,
      status: 201,
      message: "Employee Benefit Claim created",
      data: doc,
    });
  } catch (error) {
    return failure(res, error);
  }
};

export const updateEmployeeBenefitClaim = async (req, res) => {
  try {
    const doc = await EmployeeBenefitClaim.findById(req.params.id);
    if (!doc) throwError(404, "Employee Benefit Claim not found");
    if (doc.status !== "draft") throwError(400, "Only draft claims can be modified");

    if (req.user?.dataScope === SCOPES.OWN) {
      const ownEmp = await resolveRequestEmployee(req);
      if (!ownEmp || String(doc.employeeId) !== String(ownEmp._id)) {
        throwError(403, "Access denied");
      }
    }

    const employeeId = req.body.employeeId || doc.employeeId;
    const salaryComponentId = req.body.salaryComponentId || doc.salaryComponentId;
    const claimDate = req.body.claimDate ? new Date(req.body.claimDate) : doc.claimDate;
    const numClaimed = req.body.claimedAmount !== undefined ? round2(req.body.claimedAmount) : doc.claimedAmount;

    if (numClaimed <= 0) throwError(400, "Claimed amount must be greater than 0");

    const eligibility = await calculateClaimEligibility({
      employeeId,
      salaryComponentId,
      claimDate,
    });

    if (numClaimed > eligibility.eligibleAmount) {
      throwError(
        400,
        `Claimed amount ${numClaimed} exceeds eligible amount ${eligibility.eligibleAmount}`
      );
    }

    doc.employeeId = employeeId;
    doc.salaryComponentId = salaryComponentId;
    doc.claimDate = claimDate;
    doc.claimedAmount = numClaimed;
    if (req.body.remarks !== undefined) doc.remarks = req.body.remarks;

    await doc.save();
    return res.json({ isOk: true, status: 200, message: "Employee Benefit Claim updated", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const getEmployeeBenefitClaimById = async (req, res) => {
  try {
    const doc = await EmployeeBenefitClaim.findById(req.params.id)
      .populate("employeeId")
      .populate("salaryComponentId")
      .populate("companyId")
      .populate("additionalSalaryId");
    if (!doc) throwError(404, "Employee Benefit Claim not found");

    if (req.user?.dataScope === SCOPES.OWN) {
      const ownEmp = await resolveRequestEmployee(req);
      if (!ownEmp || String(doc.employeeId?._id || doc.employeeId) !== String(ownEmp._id)) {
        throwError(403, "Access denied");
      }
    }

    return res.json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const listEmployeeBenefitClaims = async (req, res) => {
  try {
    const scope = await attendanceScope(req, true);
    const docs = await EmployeeBenefitClaim.find(scope)
      .populate("employeeId")
      .populate("salaryComponentId")
      .populate("companyId")
      .populate("additionalSalaryId")
      .sort({ createdAt: -1 });
    return res.json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    return failure(res, error);
  }
};

export const searchEmployeeBenefitClaims = async (req, res) => {
  try {
    const scope = await attendanceScope(req, true);
    const data = await runListQuery(EmployeeBenefitClaim, req.body, {
      scopeFilter: scope,
      filterable: EMPLOYEE_BENEFIT_CLAIM_FILTERABLE,
      stages: [
        { $lookup: { from: "employees", localField: "employeeId", foreignField: "_id", as: "employeeId_joined" } },
        { $addFields: { employeeIdLabel: { $arrayElemAt: ["$employeeId_joined.employeeName", 0] } } },
        { $project: { employeeId_joined: 0 } },
        { $lookup: { from: "salarycomponents", localField: "salaryComponentId", foreignField: "_id", as: "salaryComponentId_joined" } },
        { $addFields: { salaryComponentIdLabel: { $arrayElemAt: ["$salaryComponentId_joined.salaryComponentName", 0] } } },
        { $project: { salaryComponentId_joined: 0 } },
      ],
    });
    return res.json({ isOk: true, status: 200, data });
  } catch (error) {
    return failure(res, error);
  }
};

/**
 * ADR-029: Submit claim creates a 4th AdditionalSalary producer record
 * (type: "Earning", overwriteSalaryStructureAmount: false, refDoctype: "EmployeeBenefitClaim")
 */
export const submitEmployeeBenefitClaim = async (req, res) => {
  try {
    const doc = await EmployeeBenefitClaim.findById(req.params.id);
    if (!doc) throwError(404, "Employee Benefit Claim not found");
    if (doc.status !== "draft") throwError(400, "Only draft claims can be submitted");

    const employee = await Employee.findById(doc.employeeId).lean();
    if (!employee) throwError(404, "Employee not found");

    // Re-verify eligibility before final submission
    const eligibility = await calculateClaimEligibility({
      employeeId: doc.employeeId,
      salaryComponentId: doc.salaryComponentId,
      claimDate: doc.claimDate,
    });

    if (doc.claimedAmount > eligibility.eligibleAmount) {
      throwError(
        400,
        `Claimed amount ${doc.claimedAmount} exceeds eligible amount ${eligibility.eligibleAmount}`
      );
    }

    // Create the AdditionalSalary record
    const addSal = await AdditionalSalary.create({
      employeeId: doc.employeeId,
      companyId: doc.companyId,
      salaryComponentId: doc.salaryComponentId,
      type: "Earning",
      amount: doc.claimedAmount,
      isRecurring: false,
      payrollDate: doc.claimDate,
      overwriteSalaryStructureAmount: false,
      deductFullTaxOnSelectedPayrollDate: false,
      currency: employee.currency || "USD",
      status: "active",
      refDoctype: "EmployeeBenefitClaim",
      refDocnameId: doc._id,
    });

    doc.additionalSalaryId = addSal._id;
    doc.status = "submitted";
    await doc.save();

    return res.json({
      isOk: true,
      status: 200,
      message: "Employee Benefit Claim submitted and Additional Salary generated",
      data: doc,
    });
  } catch (error) {
    return failure(res, error);
  }
};

/**
 * ADR-029: Cancellation cascade — cancelling an Employee Benefit Claim auto-cancels
 * its linked AdditionalSalary record.
 */
export const cancelEmployeeBenefitClaim = async (req, res) => {
  try {
    const doc = await EmployeeBenefitClaim.findById(req.params.id);
    if (!doc) throwError(404, "Employee Benefit Claim not found");
    if (doc.status === "cancelled") throwError(400, "Claim is already cancelled");

    if (doc.additionalSalaryId) {
      await AdditionalSalary.findByIdAndUpdate(doc.additionalSalaryId, { status: "cancelled" });
    }

    doc.status = "cancelled";
    await doc.save();

    return res.json({
      isOk: true,
      status: 200,
      message: "Employee Benefit Claim and linked Additional Salary cancelled",
      data: doc,
    });
  } catch (error) {
    return failure(res, error);
  }
};

export const deleteEmployeeBenefitClaim = async (req, res) => {
  try {
    const doc = await EmployeeBenefitClaim.findById(req.params.id);
    if (!doc) throwError(404, "Employee Benefit Claim not found");
    if (doc.status !== "draft") throwError(400, "Only draft claims can be deleted");

    if (req.user?.dataScope === SCOPES.OWN) {
      const ownEmp = await resolveRequestEmployee(req);
      if (!ownEmp || String(doc.employeeId) !== String(ownEmp._id)) {
        throwError(403, "Access denied");
      }
    }

    await doc.deleteOne();
    return res.json({ isOk: true, status: 200, message: "Employee Benefit Claim deleted" });
  } catch (error) {
    return failure(res, error);
  }
};

// ============================================================================
// 3. Employee Benefit Ledger (Read-Only API)
// ============================================================================

export const EMPLOYEE_BENEFIT_LEDGER_FILTERABLE = {
  postingDate: "date",
  employeeId: "objectId",
  companyId: "objectId",
  salaryComponentId: "objectId",
  payrollPeriodId: "objectId",
  transactionType: "string",
  amount: "number",
  yearlyBenefit: "number",
  flexibleBenefit: "boolean",
  salarySlipId: "objectId",
  refDoctype: "string",
  refDocnameId: "objectId",
  isDeleted: "boolean",
  createdAt: "date",
};

export const listEmployeeBenefitLedgers = async (req, res) => {
  try {
    const scope = await attendanceScope(req, true);
    const filter = { ...scope, isDeleted: { $ne: true } };
    const docs = await EmployeeBenefitLedger.find(filter)
      .populate("employeeId")
      .populate("salaryComponentId")
      .populate("payrollPeriodId")
      .populate("salarySlipId")
      .populate("companyId")
      .sort({ createdAt: -1 });
    return res.json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    return failure(res, error);
  }
};

export const searchEmployeeBenefitLedgers = async (req, res) => {
  try {
    const scope = await attendanceScope(req, true);
    const filter = { ...scope, isDeleted: { $ne: true } };
    const data = await runListQuery(EmployeeBenefitLedger, req.body, {
      scopeFilter: filter,
      filterable: EMPLOYEE_BENEFIT_LEDGER_FILTERABLE,
      stages: [
        { $lookup: { from: "employees", localField: "employeeId", foreignField: "_id", as: "employeeId_joined" } },
        { $addFields: { employeeIdLabel: { $arrayElemAt: ["$employeeId_joined.employeeName", 0] } } },
        { $project: { employeeId_joined: 0 } },
        { $lookup: { from: "salarycomponents", localField: "salaryComponentId", foreignField: "_id", as: "salaryComponentId_joined" } },
        { $addFields: { salaryComponentIdLabel: { $arrayElemAt: ["$salaryComponentId_joined.salaryComponentName", 0] } } },
        { $project: { salaryComponentId_joined: 0 } },
      ],
    });
    return res.json({ isOk: true, status: 200, data });
  } catch (error) {
    return failure(res, error);
  }
};

export const getEmployeeBenefitLedgerById = async (req, res) => {
  try {
    const doc = await EmployeeBenefitLedger.findOne({ _id: req.params.id, isDeleted: { $ne: true } })
      .populate("employeeId")
      .populate("salaryComponentId")
      .populate("payrollPeriodId")
      .populate("salarySlipId")
      .populate("companyId");
    if (!doc) throwError(404, "Employee Benefit Ledger entry not found");

    if (req.user?.dataScope === SCOPES.OWN) {
      const ownEmp = await resolveRequestEmployee(req);
      if (!ownEmp || String(doc.employeeId?._id || doc.employeeId) !== String(ownEmp._id)) {
        throwError(403, "Access denied");
      }
    }

    return res.json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

// ============================================================================
// 4. Payroll Correction
// ============================================================================

export const PAYROLL_CORRECTION_FIELDS = [
  "salarySlipId",
  "daysToReverse",
  "remarks",
];

export const PAYROLL_CORRECTION_FILTERABLE = {
  salarySlipId: "objectId",
  employeeId: "objectId",
  companyId: "objectId",
  payrollPeriodId: "objectId",
  daysToReverse: "number",
  status: "string",
  createdAt: "date",
};

export const calculatePayrollCorrectionDetails = async ({ salarySlipId, daysToReverse, excludeId = null }) => {
  if (!salarySlipId) throwError(400, "salarySlipId is required");
  const days = round2(daysToReverse);
  if (days <= 0) throwError(400, "daysToReverse must be greater than 0");

  const salarySlip = await SalarySlip.findById(salarySlipId).lean();
  if (!salarySlip) throwError(404, "Salary Slip not found");
  if (salarySlip.status !== "submitted" && salarySlip.status !== "withheld") {
    throwError(400, "Payroll Correction can only be calculated on a submitted or withheld Salary Slip");
  }

  const slipLwpDays = round2(salarySlip.lwpDays || 0);
  if (slipLwpDays <= 0) {
    throwError(400, "Target Salary Slip has no LWP days to reverse");
  }

  // Sum prior non-cancelled corrections on this slip
  const priorCorrections = await PayrollCorrection.find({
    salarySlipId,
    status: { $ne: "cancelled" },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  }).lean();

  const previouslyReversedDays = round2(
    priorCorrections.reduce((sum, c) => sum + (Number(c.daysToReverse) || 0), 0)
  );

  const totalAfterReversal = round2(previouslyReversedDays + days);
  if (totalAfterReversal > slipLwpDays) {
    throwError(
      400,
      `Requested days to reverse (${days}) plus previously reversed days (${previouslyReversedDays}) exceeds available LWP days (${slipLwpDays}) on this Salary Slip`
    );
  }

  const allCompIds = [
    ...(salarySlip.earnings || []).map((e) => e.salaryComponentId),
    ...(salarySlip.deductions || []).map((d) => d.salaryComponentId),
  ];

  const components = await SalaryComponent.find({ _id: { $in: allCompIds } }).lean();
  const eligibleComponentsMap = {};
  for (const c of components) {
    eligibleComponentsMap[String(c._id)] = c;
  }

  const breakup = calculatePayrollCorrectionBreakup({
    salarySlip,
    daysToReverse: days,
    eligibleComponentsMap,
  });

  return {
    salarySlip,
    daysToReverse: days,
    previouslyReversedDays,
    remainingLwpDays: round2(slipLwpDays - totalAfterReversal),
    earningArrears: breakup.earningArrears,
    deductionArrears: breakup.deductionArrears,
    accrualArrears: breakup.accrualArrears,
  };
};

export const calculateBreakup = async (req, res) => {
  try {
    const { salarySlipId, daysToReverse } = req.body;
    const result = await calculatePayrollCorrectionDetails({ salarySlipId, daysToReverse });
    return res.json({ isOk: true, status: 200, data: result });
  } catch (error) {
    return failure(res, error);
  }
};

export const createPayrollCorrection = async (req, res) => {
  try {
    const { salarySlipId, daysToReverse, remarks } = req.body;
    const details = await calculatePayrollCorrectionDetails({ salarySlipId, daysToReverse });
    const salarySlip = details.salarySlip;

    // Find period covering the slip
    const payrollPeriod = await PayrollPeriod.findOne({
      companyId: salarySlip.companyId,
      startDate: { $lte: salarySlip.endDate },
      endDate: { $gte: salarySlip.startDate },
      isActive: true,
    }).lean();

    const pDate = req.body.payrollDate ? new Date(req.body.payrollDate) : (salarySlip.endDate || new Date());

    const doc = await PayrollCorrection.create({
      salarySlipId,
      employeeId: salarySlip.employeeId,
      companyId: salarySlip.companyId,
      payrollPeriodId: payrollPeriod?._id || null,
      payrollDate: pDate,
      daysToReverse: details.daysToReverse,
      earningArrears: details.earningArrears,
      deductionArrears: details.deductionArrears,
      accrualArrears: details.accrualArrears,
      remarks: remarks || "",
      status: "draft",
    });

    return res.status(201).json({
      isOk: true,
      status: 201,
      message: "Payroll Correction created",
      data: doc,
    });
  } catch (error) {
    return failure(res, error);
  }
};

export const updatePayrollCorrection = async (req, res) => {
  try {
    const doc = await PayrollCorrection.findById(req.params.id);
    if (!doc) throwError(404, "Payroll Correction not found");
    if (doc.status !== "draft") throwError(400, "Only draft corrections can be modified");

    const salarySlipId = req.body.salarySlipId || doc.salarySlipId;
    const daysToReverse = req.body.daysToReverse !== undefined ? req.body.daysToReverse : doc.daysToReverse;

    const details = await calculatePayrollCorrectionDetails({
      salarySlipId,
      daysToReverse,
      excludeId: doc._id,
    });

    doc.salarySlipId = salarySlipId;
    doc.daysToReverse = details.daysToReverse;
    doc.earningArrears = details.earningArrears;
    doc.deductionArrears = details.deductionArrears;
    doc.accrualArrears = details.accrualArrears;
    if (req.body.remarks !== undefined) doc.remarks = req.body.remarks;

    await doc.save();
    return res.json({ isOk: true, status: 200, message: "Payroll Correction updated", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const getPayrollCorrectionById = async (req, res) => {
  try {
    const doc = await PayrollCorrection.findById(req.params.id)
      .populate("employeeId")
      .populate("salarySlipId")
      .populate("companyId")
      .populate("payrollPeriodId")
      .populate("earningArrears.salaryComponentId")
      .populate("deductionArrears.salaryComponentId")
      .populate("accrualArrears.salaryComponentId");
    if (!doc) throwError(404, "Payroll Correction not found");

    const scope = await attendanceScope(req, false);
    const accessible = await PayrollCorrection.findOne({ $and: [{ _id: doc._id }, scope] });
    if (!accessible) throwError(403, "Access denied");

    return res.json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const listPayrollCorrections = async (req, res) => {
  try {
    const scope = await attendanceScope(req, false);
    const docs = await PayrollCorrection.find(scope)
      .populate("employeeId")
      .populate("salarySlipId")
      .populate("companyId")
      .populate("payrollPeriodId")
      .populate("earningArrears.salaryComponentId")
      .populate("deductionArrears.salaryComponentId")
      .populate("accrualArrears.salaryComponentId")
      .sort({ createdAt: -1 });
    return res.json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    return failure(res, error);
  }
};

export const searchPayrollCorrections = async (req, res) => {
  try {
    const scope = await attendanceScope(req, false);
    const data = await runListQuery(PayrollCorrection, req.body, {
      scopeFilter: scope,
      filterable: PAYROLL_CORRECTION_FILTERABLE,
      stages: [
        { $lookup: { from: "employees", localField: "employeeId", foreignField: "_id", as: "employeeId_joined" } },
        { $addFields: { employeeIdLabel: { $arrayElemAt: ["$employeeId_joined.employeeName", 0] } } },
        { $project: { employeeId_joined: 0 } },
      ],
    });
    return res.json({ isOk: true, status: 200, data });
  } catch (error) {
    return failure(res, error);
  }
};

/**
 * ADR-029: Submit writes AdditionalSalary rows for earning & deduction arrears,
 * and EmployeeBenefitLedger rows for accrual arrears.
 */
export const submitPayrollCorrection = async (req, res) => {
  try {
    const doc = await PayrollCorrection.findById(req.params.id);
    if (!doc) throwError(404, "Payroll Correction not found");
    if (doc.status !== "draft") throwError(400, "Only draft corrections can be submitted");

    // Re-verify that daysToReverse is still valid against current uncancelled corrections
    const details = await calculatePayrollCorrectionDetails({
      salarySlipId: doc.salarySlipId,
      daysToReverse: doc.daysToReverse,
      excludeId: doc._id,
    });

    const employee = await Employee.findById(doc.employeeId).lean();
    const currency = employee?.currency || "USD";
    const now = new Date();

    // 1. Create AdditionalSalary for earning arrears
    for (const ear of doc.earningArrears || []) {
      await AdditionalSalary.create({
        employeeId: doc.employeeId,
        companyId: doc.companyId,
        salaryComponentId: ear.salaryComponentId,
        type: "Earning",
        amount: ear.amount,
        isRecurring: false,
        payrollDate: now,
        overwriteSalaryStructureAmount: false,
        deductFullTaxOnSelectedPayrollDate: false,
        currency,
        status: "active",
        refDoctype: "PayrollCorrection",
        refDocnameId: doc._id,
      });
    }

    // 2. Create AdditionalSalary for deduction arrears
    for (const ded of doc.deductionArrears || []) {
      await AdditionalSalary.create({
        employeeId: doc.employeeId,
        companyId: doc.companyId,
        salaryComponentId: ded.salaryComponentId,
        type: "Deduction",
        amount: ded.amount,
        isRecurring: false,
        payrollDate: now,
        overwriteSalaryStructureAmount: false,
        deductFullTaxOnSelectedPayrollDate: false,
        currency,
        status: "active",
        refDoctype: "PayrollCorrection",
        refDocnameId: doc._id,
      });
    }

    // 3. Create EmployeeBenefitLedger entries for accrual arrears
    if (doc.payrollPeriodId && (doc.accrualArrears || []).length > 0) {
      for (const acc of doc.accrualArrears) {
        await createBenefitLedgerEntry({
          postingDate: now,
          employeeId: doc.employeeId,
          companyId: doc.companyId,
          salaryComponentId: acc.salaryComponentId,
          payrollPeriodId: doc.payrollPeriodId,
          transactionType: "Accrual",
          amount: acc.amount,
          yearlyBenefit: 0,
          flexibleBenefit: true,
          refDoctype: "PayrollCorrection",
          refDocnameId: doc._id,
          remarks: "Payroll Correction LWP reversal accrual",
        });
      }
    }

    doc.status = "submitted";
    await doc.save();

    return res.json({
      isOk: true,
      status: 200,
      message: "Payroll Correction submitted, arrears and accruals posted",
      data: doc,
    });
  } catch (error) {
    return failure(res, error);
  }
};

/**
 * ADR-029: Cancellation cascade — cancelling a Payroll Correction cancels linked
 * AdditionalSalary records and soft-deletes linked EmployeeBenefitLedger entries.
 */
export const cancelPayrollCorrection = async (req, res) => {
  try {
    const doc = await PayrollCorrection.findById(req.params.id);
    if (!doc) throwError(404, "Payroll Correction not found");
    if (doc.status === "cancelled") throwError(400, "Payroll Correction is already cancelled");

    // 1. Cancel linked AdditionalSalary records
    await AdditionalSalary.updateMany(
      { refDoctype: "PayrollCorrection", refDocnameId: doc._id, status: "active" },
      { status: "cancelled" }
    );

    // 2. Soft-delete linked EmployeeBenefitLedger entries
    await deleteBenefitLedgerEntriesByReference("PayrollCorrection", doc._id);

    doc.status = "cancelled";
    await doc.save();

    return res.json({
      isOk: true,
      status: 200,
      message: "Payroll Correction and linked arrears/accruals cancelled",
      data: doc,
    });
  } catch (error) {
    return failure(res, error);
  }
};

export const deletePayrollCorrection = async (req, res) => {
  try {
    const doc = await PayrollCorrection.findById(req.params.id);
    if (!doc) throwError(404, "Payroll Correction not found");
    if (doc.status !== "draft") throwError(400, "Only draft corrections can be deleted");

    const scope = await attendanceScope(req, false);
    const accessible = await PayrollCorrection.findOne({ $and: [{ _id: doc._id }, scope] });
    if (!accessible) throwError(403, "Access denied");

    await doc.deleteOne();
    return res.json({ isOk: true, status: 200, message: "Payroll Correction deleted" });
  } catch (error) {
    return failure(res, error);
  }
};
