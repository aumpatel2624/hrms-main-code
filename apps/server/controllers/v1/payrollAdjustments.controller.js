import mongoose from "mongoose";
import { runListQuery } from "../../utils/listQuery.js";
import { attendanceScope } from "../../utils/attendanceScope.js";
import { resolveRequestEmployee } from "../../utils/requestEmployee.js";
import { ROLES } from "@demo-panel/shared/roles";
import { SCOPES } from "@demo-panel/shared/scopes";
import AdditionalSalary from "../../models/AdditionalSalary.js";
import Arrear from "../../models/Arrear.js";
import RetentionBonus from "../../models/RetentionBonus.js";
import EmployeeIncentive from "../../models/EmployeeIncentive.js";
import EmployeeOtherIncome from "../../models/EmployeeOtherIncome.js";
import Employee from "../../models/Employee.js";
import Company from "../../models/Company.js";
import SalaryComponent from "../../models/SalaryComponent.js";
import SalarySlip from "../../models/SalarySlip.js";
import SalaryStructure from "../../models/SalaryStructure.js";
import SalaryStructureAssignment from "../../models/SalaryStructureAssignment.js";
import { calculateArrears } from "../../utils/arrearCalc.js";
import { getCurrentSalaryStructureAssignment } from "../../utils/payrollAssignment.js";

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
  console.error("Payroll Adjustments request failed", error);
  return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
};

const throwError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  throw error;
};

// ============================================================================
// 1. Additional Salary
// ============================================================================

export const ADDITIONAL_SALARY_FIELDS = [
  "employeeId",
  "companyId",
  "salaryComponentId",
  "amount",
  "isRecurring",
  "fromDate",
  "toDate",
  "payrollDate",
  "overwriteSalaryStructureAmount",
  "deductFullTaxOnSelectedPayrollDate",
  "status",
  "refDoctype",
  "refDocnameId",
];

export const ADDITIONAL_SALARY_FILTERABLE = {
  employeeId: "objectId",
  companyId: "objectId",
  salaryComponentId: "objectId",
  type: "string",
  amount: "number",
  isRecurring: "boolean",
  fromDate: "date",
  toDate: "date",
  payrollDate: "date",
  overwriteSalaryStructureAmount: "boolean",
  deductFullTaxOnSelectedPayrollDate: "boolean",
  status: "string",
  refDoctype: "string",
  refDocnameId: "objectId",
  createdAt: "date",
};

/**
 * ADR-028 Save-time overlap validator for overwrite Additional Salary rows.
 * Rejects creating/activating a second active overwrite row for the same
 * employee and component where periods overlap.
 */
export const assertNoOverwriteOverlap = async ({
  employeeId,
  salaryComponentId,
  isRecurring,
  fromDate,
  toDate,
  payrollDate,
  excludeId,
}) => {
  const query = {
    employeeId,
    salaryComponentId,
    status: "active",
    overwriteSalaryStructureAmount: true,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  };

  const existingActiveRows = await AdditionalSalary.find(query).lean();
  if (!existingActiveRows.length) return;

  const newFrom = fromDate ? new Date(fromDate) : null;
  const newTo = toDate ? new Date(toDate) : null;
  const newDate = payrollDate ? new Date(payrollDate) : null;

  for (const row of existingActiveRows) {
    if (row.isRecurring) {
      const existFrom = new Date(row.fromDate);
      const existTo = new Date(row.toDate);
      if (isRecurring) {
        // Both recurring: ranges overlap if newFrom <= existTo && newTo >= existFrom
        if (newFrom <= existTo && newTo >= existFrom) {
          throwError(400, "An active overwrite Additional Salary already exists for this employee and component in an overlapping period");
        }
      } else {
        // New is one-off, existing is recurring: check if newDate falls in [existFrom, existTo]
        if (newDate >= existFrom && newDate <= existTo) {
          throwError(400, "An active overwrite Additional Salary already exists for this employee and component in an overlapping period");
        }
      }
    } else {
      const existDate = new Date(row.payrollDate);
      if (isRecurring) {
        // New is recurring, existing is one-off: check if existDate falls in [newFrom, newTo]
        if (existDate >= newFrom && existDate <= newTo) {
          throwError(400, "An active overwrite Additional Salary already exists for this employee and component in an overlapping period");
        }
      } else {
        // Both one-off: same month overlap (in standard payroll, two overwrites in the same month conflict)
        if (existDate.toISOString().slice(0, 7) === newDate.toISOString().slice(0, 7)) {
          throwError(400, "An active overwrite Additional Salary already exists for this employee and component in this payroll period");
        }
      }
    }
  }
};

export const createAdditionalSalary = async (req, res) => {
  try {
    const {
      employeeId,
      salaryComponentId,
      amount,
      isRecurring,
      fromDate,
      toDate,
      payrollDate,
      overwriteSalaryStructureAmount,
      deductFullTaxOnSelectedPayrollDate,
      refDoctype,
      refDocnameId,
    } = req.body;

    if (!employeeId || !salaryComponentId) {
      throwError(400, "Employee and Salary Component are required");
    }

    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      throwError(400, "Amount must be greater than zero");
    }

    const employee = await Employee.findById(employeeId).lean();
    if (!employee) throwError(404, "Employee not found");

    const component = await SalaryComponent.findById(salaryComponentId).lean();
    if (!component) throwError(404, "Salary Component not found");

    // Validate component restrictions per ADR-028
    if (component.statisticalComponent) {
      throwError(400, "Statistical components cannot be added via Additional Salary");
    }
    if (component.type === "Employer Contribution") {
      throwError(400, "Employer Contribution components cannot be used in Additional Salary");
    }
    if (!["Earning", "Deduction"].includes(component.type)) {
      throwError(400, `Invalid salary component type: ${component.type}`);
    }

    // Mutual exclusion validation on date shapes
    const recurring = Boolean(isRecurring);
    if (recurring) {
      if (!fromDate || !toDate) {
        throwError(400, "From Date and To Date are required for recurring adjustments");
      }
      if (new Date(fromDate) > new Date(toDate)) {
        throwError(400, "From Date cannot be after To Date");
      }
      if (payrollDate) {
        throwError(400, "Provide either payrollDate for one-off adjustments or fromDate and toDate for recurring adjustments, not both");
      }
    } else {
      if (!payrollDate) {
        throwError(400, "Payroll Date is required for one-off adjustments");
      }
      if (fromDate || toDate) {
        throwError(400, "Provide either payrollDate for one-off adjustments or fromDate and toDate for recurring adjustments, not both");
      }
    }

    // Save-time overwrite uniqueness validation per ADR-028
    if (overwriteSalaryStructureAmount) {
      await assertNoOverwriteOverlap({
        employeeId,
        salaryComponentId,
        isRecurring: recurring,
        fromDate,
        toDate,
        payrollDate,
      });
    }

    const company = await Company.findById(employee.companyId).lean();
    const currency = company?.defaultCurrency || "USD";

    const doc = await AdditionalSalary.create({
      employeeId,
      companyId: employee.companyId,
      salaryComponentId,
      type: component.type,
      amount: numAmount,
      isRecurring: recurring,
      fromDate: recurring ? fromDate : null,
      toDate: recurring ? toDate : null,
      payrollDate: recurring ? null : payrollDate,
      overwriteSalaryStructureAmount: Boolean(overwriteSalaryStructureAmount),
      deductFullTaxOnSelectedPayrollDate: Boolean(deductFullTaxOnSelectedPayrollDate),
      currency,
      status: "active",
      refDoctype: refDoctype || null,
      refDocnameId: refDocnameId || null,
    });

    return res.status(201).json({ isOk: true, status: 201, message: "Additional Salary created", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const listAdditionalSalaries = async (req, res) => {
  try {
    const scope = await attendanceScope(req, false);
    const result = await runListQuery({
      model: AdditionalSalary,
      query: req.query,
      filter: scope,
      filterable: ADDITIONAL_SALARY_FILTERABLE,
      populate: ["employeeId", "salaryComponentId", "companyId"],
    });
    return res.json({ isOk: true, status: 200, ...result });
  } catch (error) {
    return failure(res, error);
  }
};

export const searchAdditionalSalaries = async (req, res) => {
  try {
    const scope = await attendanceScope(req, false);
    const result = await runListQuery({
      model: AdditionalSalary,
      query: req.body,
      filter: scope,
      filterable: ADDITIONAL_SALARY_FILTERABLE,
      populate: ["employeeId", "salaryComponentId", "companyId"],
    });
    return res.json({ isOk: true, status: 200, ...result });
  } catch (error) {
    return failure(res, error);
  }
};

export const getAdditionalSalaryById = async (req, res) => {
  try {
    const doc = await AdditionalSalary.findById(req.params.id)
      .populate("employeeId")
      .populate("salaryComponentId")
      .populate("companyId");
    if (!doc) throwError(404, "Additional Salary not found");
    return res.json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const cancelAdditionalSalary = async (req, res) => {
  try {
    const doc = await AdditionalSalary.findById(req.params.id);
    if (!doc) throwError(404, "Additional Salary not found");
    if (doc.status === "cancelled") {
      return res.json({ isOk: true, status: 200, message: "Additional Salary is already cancelled", data: doc });
    }
    doc.status = "cancelled";
    await doc.save();
    return res.json({ isOk: true, status: 200, message: "Additional Salary cancelled", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const deleteAdditionalSalary = async (req, res) => {
  try {
    const doc = await AdditionalSalary.findById(req.params.id);
    if (!doc) throwError(404, "Additional Salary not found");
    await doc.softDelete();
    return res.json({ isOk: true, status: 200, message: "Additional Salary deleted" });
  } catch (error) {
    return failure(res, error);
  }
};

// ============================================================================
// 2. Arrear
// ============================================================================

export const ARREAR_FIELDS = [
  "employeeId",
  "companyId",
  "startDate",
  "endDate",
  "payrollDate",
  "earningArrears",
  "deductionArrears",
];

export const ARREAR_FILTERABLE = {
  employeeId: "objectId",
  companyId: "objectId",
  startDate: "date",
  endDate: "date",
  payrollDate: "date",
  status: "string",
  createdAt: "date",
};

/**
 * Computes arrear differences for an employee across [startDate, endDate]
 * comparing historical submitted SalarySlips against the currently active assignment.
 */
export const computeArrearsForEmployee = async ({ employeeId, startDate, endDate }) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const historicalSlips = await SalarySlip.find({
    employeeId,
    status: "submitted",
    startDate: { $gte: start },
    endDate: { $lte: end },
  }).sort({ startDate: 1 });

  if (!historicalSlips.length) {
    return { earningArrears: [], deductionArrears: [] };
  }

  const currentAssignment = await getCurrentSalaryStructureAssignment(employeeId, end);
  if (!currentAssignment) {
    throwError(400, "No active Salary Structure Assignment found for this employee");
  }

  const currentStructure = await SalaryStructure.findById(currentAssignment.salaryStructureId);
  if (!currentStructure) {
    throwError(400, "Active Salary Structure not found");
  }

  return calculateArrears({
    historicalSlips,
    currentAssignment,
    currentStructure,
  });
};

export const createArrear = async (req, res) => {
  try {
    const { employeeId, startDate, endDate, payrollDate, earningArrears, deductionArrears } = req.body;

    if (!employeeId || !startDate || !endDate || !payrollDate) {
      throwError(400, "Employee, Start Date, End Date, and Payroll Date are required");
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const pDate = new Date(payrollDate);

    if (start > end) throwError(400, "Start Date cannot be after End Date");
    if (pDate < end) throwError(400, "Payroll Date must be on or after End Date");

    const employee = await Employee.findById(employeeId).lean();
    if (!employee) throwError(404, "Employee not found");

    let earnings = earningArrears;
    let deductions = deductionArrears;

    // If child tables are not provided by client, calculate them from historical slips
    if (!earnings || !deductions) {
      const calc = await computeArrearsForEmployee({ employeeId, startDate: start, endDate: end });
      earnings = calc.earningArrears;
      deductions = calc.deductionArrears;
    }

    const doc = await Arrear.create({
      employeeId,
      companyId: employee.companyId,
      startDate: start,
      endDate: end,
      payrollDate: pDate,
      earningArrears: earnings || [],
      deductionArrears: deductions || [],
      status: "draft",
    });

    return res.status(201).json({ isOk: true, status: 201, message: "Arrear created", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const calculateArrearPreview = async (req, res) => {
  try {
    const { employeeId, startDate, endDate } = req.body;
    if (!employeeId || !startDate || !endDate) {
      throwError(400, "Employee, Start Date, and End Date are required");
    }
    const result = await computeArrearsForEmployee({ employeeId, startDate, endDate });
    return res.json({ isOk: true, status: 200, data: result });
  } catch (error) {
    return failure(res, error);
  }
};

export const listArrears = async (req, res) => {
  try {
    const scope = await attendanceScope(req, false);
    const result = await runListQuery({
      model: Arrear,
      query: req.query,
      filter: scope,
      filterable: ARREAR_FILTERABLE,
      populate: ["employeeId", "companyId", "earningArrears.salaryComponentId", "deductionArrears.salaryComponentId"],
    });
    return res.json({ isOk: true, status: 200, ...result });
  } catch (error) {
    return failure(res, error);
  }
};

export const searchArrears = async (req, res) => {
  try {
    const scope = await attendanceScope(req, false);
    const result = await runListQuery({
      model: Arrear,
      query: req.body,
      filter: scope,
      filterable: ARREAR_FILTERABLE,
      populate: ["employeeId", "companyId", "earningArrears.salaryComponentId", "deductionArrears.salaryComponentId"],
    });
    return res.json({ isOk: true, status: 200, ...result });
  } catch (error) {
    return failure(res, error);
  }
};

export const getArrearById = async (req, res) => {
  try {
    const doc = await Arrear.findById(req.params.id)
      .populate("employeeId")
      .populate("companyId")
      .populate("earningArrears.salaryComponentId")
      .populate("deductionArrears.salaryComponentId");
    if (!doc) throwError(404, "Arrear not found");
    return res.json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const updateArrear = async (req, res) => {
  try {
    const doc = await Arrear.findById(req.params.id);
    if (!doc) throwError(404, "Arrear not found");
    if (doc.status !== "draft") throwError(400, "Only draft Arrear documents can be edited");

    if (req.body.earningArrears !== undefined) doc.earningArrears = req.body.earningArrears;
    if (req.body.deductionArrears !== undefined) doc.deductionArrears = req.body.deductionArrears;
    if (req.body.payrollDate !== undefined) {
      if (new Date(req.body.payrollDate) < doc.endDate) {
        throwError(400, "Payroll Date must be on or after End Date");
      }
      doc.payrollDate = req.body.payrollDate;
    }

    await doc.save();
    return res.json({ isOk: true, status: 200, message: "Arrear updated", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const submitArrear = async (req, res) => {
  try {
    const doc = await Arrear.findById(req.params.id);
    if (!doc) throwError(404, "Arrear not found");
    if (doc.status !== "draft") throwError(400, "Only draft Arrear documents can be submitted");

    const totalRows = (doc.earningArrears || []).length + (doc.deductionArrears || []).length;
    if (totalRows === 0) throwError(400, "No arrear details found");

    const company = await Company.findById(doc.companyId).lean();
    const currency = company?.defaultCurrency || "USD";

    // Create an active AdditionalSalary for each non-zero arrear row
    for (const row of doc.earningArrears || []) {
      if (!row.amount || row.amount <= 0) continue;
      await AdditionalSalary.create({
        employeeId: doc.employeeId,
        companyId: doc.companyId,
        salaryComponentId: row.salaryComponentId,
        type: "Earning",
        amount: row.amount,
        isRecurring: false,
        payrollDate: doc.payrollDate,
        overwriteSalaryStructureAmount: false,
        currency,
        status: "active",
        refDoctype: "Arrear",
        refDocnameId: doc._id,
      });
    }

    for (const row of doc.deductionArrears || []) {
      if (!row.amount || row.amount <= 0) continue;
      await AdditionalSalary.create({
        employeeId: doc.employeeId,
        companyId: doc.companyId,
        salaryComponentId: row.salaryComponentId,
        type: "Deduction",
        amount: row.amount,
        isRecurring: false,
        payrollDate: doc.payrollDate,
        overwriteSalaryStructureAmount: false,
        currency,
        status: "active",
        refDoctype: "Arrear",
        refDocnameId: doc._id,
      });
    }

    doc.status = "submitted";
    await doc.save();
    return res.json({ isOk: true, status: 200, message: "Arrear submitted", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const cancelArrear = async (req, res) => {
  try {
    const doc = await Arrear.findById(req.params.id);
    if (!doc) throwError(404, "Arrear not found");
    if (doc.status !== "submitted") throwError(400, "Only submitted Arrear documents can be cancelled");

    // ADR-028 uniform cancellation cascade: cancel all linked AdditionalSalary rows
    await AdditionalSalary.updateMany(
      { refDoctype: "Arrear", refDocnameId: doc._id, status: "active" },
      { status: "cancelled" },
    );

    doc.status = "cancelled";
    await doc.save();
    return res.json({ isOk: true, status: 200, message: "Arrear cancelled", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const deleteArrear = async (req, res) => {
  try {
    const doc = await Arrear.findById(req.params.id);
    if (!doc) throwError(404, "Arrear not found");
    if (doc.status === "submitted") {
      throwError(400, "Submitted Arrear documents must be cancelled before deletion");
    }
    await doc.softDelete();
    return res.json({ isOk: true, status: 200, message: "Arrear deleted" });
  } catch (error) {
    return failure(res, error);
  }
};

// ============================================================================
// 3. Retention Bonus
// ============================================================================

export const RETENTION_BONUS_FIELDS = [
  "employeeId",
  "companyId",
  "salaryComponentId",
  "bonusAmount",
  "bonusPaymentDate",
];

export const RETENTION_BONUS_FILTERABLE = {
  employeeId: "objectId",
  companyId: "objectId",
  salaryComponentId: "objectId",
  bonusAmount: "number",
  bonusPaymentDate: "date",
  status: "string",
  createdAt: "date",
};

export const createRetentionBonus = async (req, res) => {
  try {
    const { employeeId, salaryComponentId, bonusAmount, bonusPaymentDate } = req.body;

    if (!employeeId || !salaryComponentId || !bonusAmount || !bonusPaymentDate) {
      throwError(400, "Employee, Salary Component, Bonus Amount, and Bonus Payment Date are required");
    }

    const numAmount = Number(bonusAmount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      throwError(400, "Bonus Amount must be greater than zero");
    }

    const employee = await Employee.findById(employeeId).lean();
    if (!employee) throwError(404, "Employee not found");

    const pDate = new Date(bonusPaymentDate);
    if (employee.relievingDate && pDate > new Date(employee.relievingDate)) {
      throwError(400, "Bonus payment date cannot be after employee's relieving date");
    }

    const component = await SalaryComponent.findById(salaryComponentId).lean();
    if (!component) throwError(404, "Salary Component not found");
    if (component.type !== "Earning") {
      throwError(400, "Salary Component must be of type Earning");
    }

    const doc = await RetentionBonus.create({
      employeeId,
      companyId: employee.companyId,
      salaryComponentId,
      bonusAmount: numAmount,
      bonusPaymentDate: pDate,
      status: "draft",
    });

    return res.status(201).json({ isOk: true, status: 201, message: "Retention Bonus created", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const listRetentionBonuses = async (req, res) => {
  try {
    const scope = await attendanceScope(req, false);
    const result = await runListQuery({
      model: RetentionBonus,
      query: req.query,
      filter: scope,
      filterable: RETENTION_BONUS_FILTERABLE,
      populate: ["employeeId", "salaryComponentId", "companyId"],
    });
    return res.json({ isOk: true, status: 200, ...result });
  } catch (error) {
    return failure(res, error);
  }
};

export const searchRetentionBonuses = async (req, res) => {
  try {
    const scope = await attendanceScope(req, false);
    const result = await runListQuery({
      model: RetentionBonus,
      query: req.body,
      filter: scope,
      filterable: RETENTION_BONUS_FILTERABLE,
      populate: ["employeeId", "salaryComponentId", "companyId"],
    });
    return res.json({ isOk: true, status: 200, ...result });
  } catch (error) {
    return failure(res, error);
  }
};

export const getRetentionBonusById = async (req, res) => {
  try {
    const doc = await RetentionBonus.findById(req.params.id)
      .populate("employeeId")
      .populate("salaryComponentId")
      .populate("companyId")
      .populate("additionalSalaryId");
    if (!doc) throwError(404, "Retention Bonus not found");
    return res.json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const updateRetentionBonus = async (req, res) => {
  try {
    const doc = await RetentionBonus.findById(req.params.id);
    if (!doc) throwError(404, "Retention Bonus not found");
    if (doc.status !== "draft") throwError(400, "Only draft Retention Bonus documents can be edited");

    if (req.body.bonusAmount !== undefined) {
      const num = Number(req.body.bonusAmount);
      if (!Number.isFinite(num) || num <= 0) throwError(400, "Bonus Amount must be greater than zero");
      doc.bonusAmount = num;
    }
    if (req.body.bonusPaymentDate !== undefined) {
      doc.bonusPaymentDate = req.body.bonusPaymentDate;
    }
    if (req.body.salaryComponentId !== undefined) {
      const component = await SalaryComponent.findById(req.body.salaryComponentId).lean();
      if (!component || component.type !== "Earning") throwError(400, "Salary Component must be of type Earning");
      doc.salaryComponentId = req.body.salaryComponentId;
    }

    await doc.save();
    return res.json({ isOk: true, status: 200, message: "Retention Bonus updated", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const submitRetentionBonus = async (req, res) => {
  try {
    const doc = await RetentionBonus.findById(req.params.id);
    if (!doc) throwError(404, "Retention Bonus not found");
    if (doc.status !== "draft") throwError(400, "Only draft Retention Bonus documents can be submitted");

    const employee = await Employee.findById(doc.employeeId).lean();
    if (employee.relievingDate && doc.bonusPaymentDate > new Date(employee.relievingDate)) {
      throwError(400, "Bonus payment date cannot be after employee's relieving date");
    }

    const company = await Company.findById(doc.companyId).lean();
    const currency = company?.defaultCurrency || "USD";

    const addSal = await AdditionalSalary.create({
      employeeId: doc.employeeId,
      companyId: doc.companyId,
      salaryComponentId: doc.salaryComponentId,
      type: "Earning",
      amount: doc.bonusAmount,
      isRecurring: false,
      payrollDate: doc.bonusPaymentDate,
      overwriteSalaryStructureAmount: false,
      currency,
      status: "active",
      refDoctype: "RetentionBonus",
      refDocnameId: doc._id,
    });

    doc.additionalSalaryId = addSal._id;
    doc.status = "submitted";
    await doc.save();

    return res.json({ isOk: true, status: 200, message: "Retention Bonus submitted", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const cancelRetentionBonus = async (req, res) => {
  try {
    const doc = await RetentionBonus.findById(req.params.id);
    if (!doc) throwError(404, "Retention Bonus not found");
    if (doc.status !== "submitted") throwError(400, "Only submitted Retention Bonus documents can be cancelled");

    if (doc.additionalSalaryId) {
      await AdditionalSalary.updateOne({ _id: doc.additionalSalaryId }, { status: "cancelled" });
    }
    await AdditionalSalary.updateMany(
      { refDoctype: "RetentionBonus", refDocnameId: doc._id, status: "active" },
      { status: "cancelled" },
    );

    doc.status = "cancelled";
    await doc.save();
    return res.json({ isOk: true, status: 200, message: "Retention Bonus cancelled", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const deleteRetentionBonus = async (req, res) => {
  try {
    const doc = await RetentionBonus.findById(req.params.id);
    if (!doc) throwError(404, "Retention Bonus not found");
    if (doc.status === "submitted") throwError(400, "Submitted documents must be cancelled before deletion");
    await doc.softDelete();
    return res.json({ isOk: true, status: 200, message: "Retention Bonus deleted" });
  } catch (error) {
    return failure(res, error);
  }
};

// ============================================================================
// 4. Employee Incentive
// ============================================================================

export const EMPLOYEE_INCENTIVE_FIELDS = [
  "employeeId",
  "companyId",
  "salaryComponentId",
  "incentiveAmount",
  "incentiveDate",
];

export const EMPLOYEE_INCENTIVE_FILTERABLE = {
  employeeId: "objectId",
  companyId: "objectId",
  salaryComponentId: "objectId",
  incentiveAmount: "number",
  incentiveDate: "date",
  status: "string",
  createdAt: "date",
};

export const createEmployeeIncentive = async (req, res) => {
  try {
    const { employeeId, salaryComponentId, incentiveAmount, incentiveDate } = req.body;

    if (!employeeId || !salaryComponentId || !incentiveAmount || !incentiveDate) {
      throwError(400, "Employee, Salary Component, Incentive Amount, and Incentive Date are required");
    }

    const numAmount = Number(incentiveAmount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      throwError(400, "Incentive Amount must be greater than zero");
    }

    const employee = await Employee.findById(employeeId).lean();
    if (!employee) throwError(404, "Employee not found");

    const component = await SalaryComponent.findById(salaryComponentId).lean();
    if (!component) throwError(404, "Salary Component not found");
    if (component.type !== "Earning") {
      throwError(400, "Salary Component must be of type Earning");
    }

    const doc = await EmployeeIncentive.create({
      employeeId,
      companyId: employee.companyId,
      salaryComponentId,
      incentiveAmount: numAmount,
      incentiveDate: new Date(incentiveDate),
      status: "draft",
    });

    return res.status(201).json({ isOk: true, status: 201, message: "Employee Incentive created", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const listEmployeeIncentives = async (req, res) => {
  try {
    const scope = await attendanceScope(req, false);
    const result = await runListQuery({
      model: EmployeeIncentive,
      query: req.query,
      filter: scope,
      filterable: EMPLOYEE_INCENTIVE_FILTERABLE,
      populate: ["employeeId", "salaryComponentId", "companyId"],
    });
    return res.json({ isOk: true, status: 200, ...result });
  } catch (error) {
    return failure(res, error);
  }
};

export const searchEmployeeIncentives = async (req, res) => {
  try {
    const scope = await attendanceScope(req, false);
    const result = await runListQuery({
      model: EmployeeIncentive,
      query: req.body,
      filter: scope,
      filterable: EMPLOYEE_INCENTIVE_FILTERABLE,
      populate: ["employeeId", "salaryComponentId", "companyId"],
    });
    return res.json({ isOk: true, status: 200, ...result });
  } catch (error) {
    return failure(res, error);
  }
};

export const getEmployeeIncentiveById = async (req, res) => {
  try {
    const doc = await EmployeeIncentive.findById(req.params.id)
      .populate("employeeId")
      .populate("salaryComponentId")
      .populate("companyId")
      .populate("additionalSalaryId");
    if (!doc) throwError(404, "Employee Incentive not found");
    return res.json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const updateEmployeeIncentive = async (req, res) => {
  try {
    const doc = await EmployeeIncentive.findById(req.params.id);
    if (!doc) throwError(404, "Employee Incentive not found");
    if (doc.status !== "draft") throwError(400, "Only draft Employee Incentive documents can be edited");

    if (req.body.incentiveAmount !== undefined) {
      const num = Number(req.body.incentiveAmount);
      if (!Number.isFinite(num) || num <= 0) throwError(400, "Incentive Amount must be greater than zero");
      doc.incentiveAmount = num;
    }
    if (req.body.incentiveDate !== undefined) {
      doc.incentiveDate = req.body.incentiveDate;
    }
    if (req.body.salaryComponentId !== undefined) {
      const component = await SalaryComponent.findById(req.body.salaryComponentId).lean();
      if (!component || component.type !== "Earning") throwError(400, "Salary Component must be of type Earning");
      doc.salaryComponentId = req.body.salaryComponentId;
    }

    await doc.save();
    return res.json({ isOk: true, status: 200, message: "Employee Incentive updated", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const submitEmployeeIncentive = async (req, res) => {
  try {
    const doc = await EmployeeIncentive.findById(req.params.id);
    if (!doc) throwError(404, "Employee Incentive not found");
    if (doc.status !== "draft") throwError(400, "Only draft Employee Incentive documents can be submitted");

    const company = await Company.findById(doc.companyId).lean();
    const currency = company?.defaultCurrency || "USD";

    const addSal = await AdditionalSalary.create({
      employeeId: doc.employeeId,
      companyId: doc.companyId,
      salaryComponentId: doc.salaryComponentId,
      type: "Earning",
      amount: doc.incentiveAmount,
      isRecurring: false,
      payrollDate: doc.incentiveDate,
      overwriteSalaryStructureAmount: false,
      currency,
      status: "active",
      refDoctype: "EmployeeIncentive",
      refDocnameId: doc._id,
    });

    doc.additionalSalaryId = addSal._id;
    doc.status = "submitted";
    await doc.save();

    return res.json({ isOk: true, status: 200, message: "Employee Incentive submitted", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const cancelEmployeeIncentive = async (req, res) => {
  try {
    const doc = await EmployeeIncentive.findById(req.params.id);
    if (!doc) throwError(404, "Employee Incentive not found");
    if (doc.status !== "submitted") throwError(400, "Only submitted Employee Incentive documents can be cancelled");

    // ADR-028 uniform cancellation cascade: cancel linked AdditionalSalary (fixes source gap)
    if (doc.additionalSalaryId) {
      await AdditionalSalary.updateOne({ _id: doc.additionalSalaryId }, { status: "cancelled" });
    }
    await AdditionalSalary.updateMany(
      { refDoctype: "EmployeeIncentive", refDocnameId: doc._id, status: "active" },
      { status: "cancelled" },
    );

    doc.status = "cancelled";
    await doc.save();
    return res.json({ isOk: true, status: 200, message: "Employee Incentive cancelled", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const deleteEmployeeIncentive = async (req, res) => {
  try {
    const doc = await EmployeeIncentive.findById(req.params.id);
    if (!doc) throwError(404, "Employee Incentive not found");
    if (doc.status === "submitted") throwError(400, "Submitted documents must be cancelled before deletion");
    await doc.softDelete();
    return res.json({ isOk: true, status: 200, message: "Employee Incentive deleted" });
  } catch (error) {
    return failure(res, error);
  }
};

// ============================================================================
// 5. Employee Other Income
// ============================================================================

export const EMPLOYEE_OTHER_INCOME_FIELDS = [
  "employeeId",
  "companyId",
  "payrollPeriodId",
  "source",
  "amount",
  "date",
];

export const EMPLOYEE_OTHER_INCOME_FILTERABLE = {
  employeeId: "objectId",
  companyId: "objectId",
  payrollPeriodId: "objectId",
  source: "string",
  amount: "number",
  date: "date",
  status: "string",
  createdAt: "date",
};

export const createEmployeeOtherIncome = async (req, res) => {
  try {
    const { employeeId, payrollPeriodId, source, amount, date } = req.body;

    if (!payrollPeriodId || amount === undefined || amount === null) {
      throwError(400, "Payroll Period and Amount are required");
    }

    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount)) {
      throwError(400, "Amount must be a valid number");
    }

    let resolvedEmployeeId = employeeId;
    // Self-service enforcement for Employee role: must only create for themselves
    if (req.user?.dataScope === SCOPES.OWN) {
      const ownEmp = await resolveRequestEmployee(req);
      if (!ownEmp) throwError(403, "No employee record linked to this user");
      resolvedEmployeeId = ownEmp._id;
    } else if (!resolvedEmployeeId) {
      throwError(400, "Employee is required");
    }

    const employee = await Employee.findById(resolvedEmployeeId).lean();
    if (!employee) throwError(404, "Employee not found");

    const doc = await EmployeeOtherIncome.create({
      employeeId: resolvedEmployeeId,
      companyId: employee.companyId,
      payrollPeriodId,
      source: source || "Other Income",
      amount: numAmount,
      date: date ? new Date(date) : new Date(),
      status: "draft",
    });

    return res.status(201).json({ isOk: true, status: 201, message: "Employee Other Income created", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const listEmployeeOtherIncomes = async (req, res) => {
  try {
    const scope = await attendanceScope(req, true); // employeeOwned: true for self-service
    const result = await runListQuery({
      model: EmployeeOtherIncome,
      query: req.query,
      filter: scope,
      filterable: EMPLOYEE_OTHER_INCOME_FILTERABLE,
      populate: ["employeeId", "payrollPeriodId", "companyId"],
    });
    return res.json({ isOk: true, status: 200, ...result });
  } catch (error) {
    return failure(res, error);
  }
};

export const searchEmployeeOtherIncomes = async (req, res) => {
  try {
    const scope = await attendanceScope(req, true); // employeeOwned: true for self-service
    const result = await runListQuery({
      model: EmployeeOtherIncome,
      query: req.body,
      filter: scope,
      filterable: EMPLOYEE_OTHER_INCOME_FILTERABLE,
      populate: ["employeeId", "payrollPeriodId", "companyId"],
    });
    return res.json({ isOk: true, status: 200, ...result });
  } catch (error) {
    return failure(res, error);
  }
};

export const getEmployeeOtherIncomeById = async (req, res) => {
  try {
    const doc = await EmployeeOtherIncome.findById(req.params.id)
      .populate("employeeId")
      .populate("payrollPeriodId")
      .populate("companyId");
    if (!doc) throwError(404, "Employee Other Income not found");

    // Guard self-service access
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

export const updateEmployeeOtherIncome = async (req, res) => {
  try {
    const doc = await EmployeeOtherIncome.findById(req.params.id);
    if (!doc) throwError(404, "Employee Other Income not found");
    if (doc.status !== "draft") throwError(400, "Only draft Employee Other Income documents can be edited");

    if (req.user?.dataScope === SCOPES.OWN) {
      const ownEmp = await resolveRequestEmployee(req);
      if (!ownEmp || String(doc.employeeId) !== String(ownEmp._id)) {
        throwError(403, "Access denied");
      }
    }

    if (req.body.amount !== undefined) {
      const num = Number(req.body.amount);
      if (!Number.isFinite(num)) throwError(400, "Amount must be a valid number");
      doc.amount = num;
    }
    if (req.body.source !== undefined) doc.source = req.body.source;
    if (req.body.date !== undefined) doc.date = req.body.date;
    if (req.body.payrollPeriodId !== undefined) doc.payrollPeriodId = req.body.payrollPeriodId;

    await doc.save();
    return res.json({ isOk: true, status: 200, message: "Employee Other Income updated", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const submitEmployeeOtherIncome = async (req, res) => {
  try {
    const doc = await EmployeeOtherIncome.findById(req.params.id);
    if (!doc) throwError(404, "Employee Other Income not found");
    if (doc.status !== "draft") throwError(400, "Only draft Employee Other Income documents can be submitted");

    if (req.user?.dataScope === SCOPES.OWN) {
      const ownEmp = await resolveRequestEmployee(req);
      if (!ownEmp || String(doc.employeeId) !== String(ownEmp._id)) {
        throwError(403, "Access denied");
      }
    }

    doc.status = "submitted";
    await doc.save();
    return res.json({ isOk: true, status: 200, message: "Employee Other Income submitted", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const cancelEmployeeOtherIncome = async (req, res) => {
  try {
    const doc = await EmployeeOtherIncome.findById(req.params.id);
    if (!doc) throwError(404, "Employee Other Income not found");
    if (doc.status !== "submitted") throwError(400, "Only submitted Employee Other Income documents can be cancelled");

    if (req.user?.dataScope === SCOPES.OWN) {
      const ownEmp = await resolveRequestEmployee(req);
      if (!ownEmp || String(doc.employeeId) !== String(ownEmp._id)) {
        throwError(403, "Access denied");
      }
    }

    doc.status = "cancelled";
    await doc.save();
    return res.json({ isOk: true, status: 200, message: "Employee Other Income cancelled", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const deleteEmployeeOtherIncome = async (req, res) => {
  try {
    const doc = await EmployeeOtherIncome.findById(req.params.id);
    if (!doc) throwError(404, "Employee Other Income not found");
    if (doc.status === "submitted") throwError(400, "Submitted documents must be cancelled before deletion");

    if (req.user?.dataScope === SCOPES.OWN) {
      throwError(403, "Employees cannot delete Other Income records");
    }

    await doc.softDelete();
    return res.json({ isOk: true, status: 200, message: "Employee Other Income deleted" });
  } catch (error) {
    return failure(res, error);
  }
};
