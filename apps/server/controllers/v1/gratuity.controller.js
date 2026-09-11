/**
 * ADR-031 (Payroll — Gratuity, module 15).
 *
 * Gratuity Rule: plain CRUD master (not submittable, matching source).
 * `listGratuityRules` (GET /gratuity-rules) is the dropdown-backing lookup
 * source consumed by Gratuity's rule picker and excludes `disable: true`
 * rows — the one enforced improvement over source, which defines `disable`
 * but never filters it out of selection anywhere. `searchGratuityRules`
 * (POST /gratuity-rules/search) feeds this master's own CRUD table and does
 * NOT filter disabled rows, so HR can still find and re-enable one.
 *
 * Gratuity: folded-docstatus doctype (draft/submitted/cancelled). Submit
 * requires the employee's relievingDate to be set and a submitted Salary
 * Slip to exist, runs the full gratuityCalc.js pipeline, then creates an
 * active AdditionalSalary exactly like RetentionBonus/EmployeeIncentive
 * (ADR-028). Cancel cascades to cancel that linked AdditionalSalary — a
 * deliberate fix of a real source asymmetry (ADR-031).
 */
import GratuityRule from "../../models/GratuityRule.js";
import Gratuity from "../../models/Gratuity.js";
import AdditionalSalary from "../../models/AdditionalSalary.js";
import Employee from "../../models/Employee.js";
import Company from "../../models/Company.js";
import SalaryComponent from "../../models/SalaryComponent.js";
import SalarySlip from "../../models/SalarySlip.js";
import { runListQuery } from "../../utils/listQuery.js";
import { attendanceScope } from "../../utils/attendanceScope.js";
import { getPayrollSettingsDoc } from "./payrollRun.controller.js";
import { countLwpDaysInRange, getWorkExperience, getGratuityAmount } from "../../utils/gratuityCalc.js";

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
  console.error("Gratuity request failed", error);
  return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
};

const throwError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  throw error;
};

// ============================================================================
// 1. Gratuity Rule
// ============================================================================

export const GRATUITY_RULE_FIELDS = [
  "name",
  "disable",
  "calculateGratuityAmountBasedOn",
  "totalWorkingDaysPerYear",
  "workExperienceCalculationFunction",
  "minimumYearForGratuity",
  "applicableEarningsComponent",
  "gratuityRuleSlabs",
];

/**
 * ADR-031: reuses payrollTax.controller.js's `validateTaxSlabs` bracket
 * shape verbatim (sort ascending, reject `toYear <= fromYear`, reject a
 * bracket after an existing open-ended one, reject `fromYear < previous.toYear`),
 * translated from currency amounts to years of service.
 */
export const validateGratuitySlabs = (slabs = []) => {
  if (!Array.isArray(slabs) || slabs.length === 0) return;
  const sorted = [...slabs].sort((a, b) => (Number(a.fromYear) || 0) - (Number(b.fromYear) || 0));
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    const from = Number(cur.fromYear) || 0;
    const to = cur.toYear !== null && cur.toYear !== undefined ? Number(cur.toYear) : null;
    if (to !== null && to <= from) {
      throwError(400, `Gratuity Rule Slab bracket toYear (${to}) must be greater than fromYear (${from})`);
    }
    if (i > 0) {
      const prev = sorted[i - 1];
      const prevTo = prev.toYear !== null && prev.toYear !== undefined ? Number(prev.toYear) : null;
      if (prevTo === null) {
        throwError(400, "Gratuity Rule Slab bracket ranges cannot overlap: open-ended slab must be the last slab");
      }
      if (from < prevTo) {
        throwError(400, "Gratuity Rule Slab bracket ranges cannot overlap");
      }
    }
  }
};

// Normalizes a client-submitted slab row's `toYear` to a real `null` for
// "open-ended" — a blank text/number input on the admin's array-field editor
// arrives as `""`, not `null`/`undefined`, and `validateGratuitySlabs`/
// `getGratuityAmount` both depend on true `null` for that sentinel.
const normalizeSlabs = (slabs = []) =>
  (Array.isArray(slabs) ? slabs : []).map((slab) => ({
    fromYear: Number(slab.fromYear) || 0,
    toYear: slab.toYear === "" || slab.toYear === null || slab.toYear === undefined ? null : Number(slab.toYear),
    fractionOfApplicableEarnings: Number(slab.fractionOfApplicableEarnings) || 0,
  }));

const validateGratuityRuleTables = ({ applicableEarningsComponent, gratuityRuleSlabs }) => {
  if (!Array.isArray(applicableEarningsComponent) || applicableEarningsComponent.length === 0) {
    throwError(400, "At least one Applicable Earnings Component row is required");
  }
  if (!Array.isArray(gratuityRuleSlabs) || gratuityRuleSlabs.length === 0) {
    throwError(400, "At least one Gratuity Rule Slab row is required");
  }
  validateGratuitySlabs(gratuityRuleSlabs);
};

export const createGratuityRule = async (req, res) => {
  try {
    const { name, calculateGratuityAmountBasedOn, applicableEarningsComponent } = req.body;
    const gratuityRuleSlabs = normalizeSlabs(req.body.gratuityRuleSlabs);
    if (!name || !calculateGratuityAmountBasedOn) {
      throwError(400, "Name and Calculate Gratuity Amount Based On are required");
    }
    validateGratuityRuleTables({ applicableEarningsComponent, gratuityRuleSlabs });

    const doc = await GratuityRule.create({
      name,
      disable: req.body.disable ?? false,
      calculateGratuityAmountBasedOn,
      totalWorkingDaysPerYear: req.body.totalWorkingDaysPerYear ?? 365,
      workExperienceCalculationFunction: req.body.workExperienceCalculationFunction || "Round off Work Experience",
      minimumYearForGratuity: req.body.minimumYearForGratuity ?? 0,
      applicableEarningsComponent,
      gratuityRuleSlabs,
    });

    return res.status(201).json({ isOk: true, status: 201, message: "Gratuity Rule created successfully", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

// Plain list — ADR-031's enforced dropdown-backing endpoint: excludes
// disable:true rows. Consumed by Gratuity's gratuityRuleId lookup.
export const listGratuityRules = async (req, res) => {
  try {
    const docs = await GratuityRule.find({ disable: false }).sort({ name: 1 });
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    return failure(res, error);
  }
};

// Search — feeds Gratuity Rule's own CRUD management table; shows every
// rule (including disabled ones) so HR can find and re-enable them.
export const searchGratuityRules = async (req, res) => {
  try {
    const data = await runListQuery(GratuityRule, req.body, {
      searchFields: ["name"],
      filterable: {
        name: "string",
        disable: "boolean",
        calculateGratuityAmountBasedOn: "string",
        workExperienceCalculationFunction: "string",
        minimumYearForGratuity: "number",
        totalWorkingDaysPerYear: "number",
        createdAt: "date",
      },
    });
    return res.status(200).json({ isOk: true, status: 200, data });
  } catch (error) {
    return failure(res, error);
  }
};

export const getGratuityRuleById = async (req, res) => {
  try {
    const doc = await GratuityRule.findById(req.params.id).populate(
      "applicableEarningsComponent.salaryComponentId",
      "salaryComponentName",
    );
    if (!doc) throwError(404, "Gratuity Rule not found");
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const updateGratuityRule = async (req, res) => {
  try {
    const doc = await GratuityRule.findById(req.params.id);
    if (!doc) throwError(404, "Gratuity Rule not found");

    const nextSlabs = req.body.gratuityRuleSlabs !== undefined ? normalizeSlabs(req.body.gratuityRuleSlabs) : doc.gratuityRuleSlabs;
    validateGratuityRuleTables({
      applicableEarningsComponent: req.body.applicableEarningsComponent ?? doc.applicableEarningsComponent,
      gratuityRuleSlabs: nextSlabs,
    });

    if (req.body.name !== undefined) doc.name = req.body.name;
    if (req.body.disable !== undefined) doc.disable = req.body.disable;
    if (req.body.calculateGratuityAmountBasedOn !== undefined) {
      doc.calculateGratuityAmountBasedOn = req.body.calculateGratuityAmountBasedOn;
    }
    if (req.body.totalWorkingDaysPerYear !== undefined) doc.totalWorkingDaysPerYear = req.body.totalWorkingDaysPerYear;
    if (req.body.workExperienceCalculationFunction !== undefined) {
      doc.workExperienceCalculationFunction = req.body.workExperienceCalculationFunction;
    }
    if (req.body.minimumYearForGratuity !== undefined) doc.minimumYearForGratuity = req.body.minimumYearForGratuity;
    if (req.body.applicableEarningsComponent !== undefined) doc.applicableEarningsComponent = req.body.applicableEarningsComponent;
    if (req.body.gratuityRuleSlabs !== undefined) doc.gratuityRuleSlabs = nextSlabs;

    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Gratuity Rule updated successfully", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const deleteGratuityRule = async (req, res) => {
  try {
    const doc = await GratuityRule.findById(req.params.id);
    if (!doc) throwError(404, "Gratuity Rule not found");
    const inUse = await Gratuity.exists({ gratuityRuleId: doc._id });
    if (inUse) {
      throwError(409, "Cannot delete a Gratuity Rule that is referenced by an existing Gratuity record");
    }
    await GratuityRule.findByIdAndDelete(doc._id);
    return res.status(200).json({ isOk: true, status: 200, message: "Gratuity Rule deleted successfully" });
  } catch (error) {
    return failure(res, error);
  }
};

// ============================================================================
// 2. Gratuity
// ============================================================================

export const GRATUITY_FIELDS = [
  "employeeId",
  "postingDate",
  "gratuityRuleId",
  "currentWorkExperience",
  "payrollDate",
  "salaryComponentId",
];

export const GRATUITY_FILTERABLE = {
  employeeId: "objectId",
  companyId: "objectId",
  gratuityRuleId: "objectId",
  salaryComponentId: "objectId",
  status: "string",
  postingDate: "date",
  payrollDate: "date",
  createdAt: "date",
};

// Create computes nothing yet (matches RetentionBonus/EmployeeIncentive's
// draft-only create behavior) — currentWorkExperience/amount are entirely
// server-computed at submit time (they need the employee's relievingDate and
// a submitted Salary Slip, neither of which is guaranteed to exist yet at
// draft-creation time). The one exception: when the rule's
// workExperienceCalculationFunction is "Manual", currentWorkExperience is
// client-supplied up front (it is the user's own input, not a computation).
export const createGratuity = async (req, res) => {
  try {
    const { employeeId, gratuityRuleId, payrollDate, salaryComponentId } = req.body;
    if (!employeeId || !gratuityRuleId || !payrollDate || !salaryComponentId) {
      throwError(400, "Employee, Gratuity Rule, Payroll Date, and Salary Component are required");
    }

    const employee = await Employee.findById(employeeId).lean();
    if (!employee) throwError(404, "Employee not found");

    const rule = await GratuityRule.findById(gratuityRuleId).lean();
    if (!rule) throwError(404, "Gratuity Rule not found");

    const component = await SalaryComponent.findById(salaryComponentId).lean();
    if (!component) throwError(404, "Salary Component not found");
    if (component.type !== "Earning") {
      throwError(400, "Salary Component must be of type Earning");
    }

    let currentWorkExperience = 0;
    if (rule.workExperienceCalculationFunction === "Manual") {
      currentWorkExperience = Number(req.body.currentWorkExperience) || 0;
    }

    const doc = await Gratuity.create({
      employeeId,
      companyId: employee.companyId,
      postingDate: req.body.postingDate ? new Date(req.body.postingDate) : new Date(),
      gratuityRuleId,
      currentWorkExperience,
      amount: 0,
      payrollDate: new Date(payrollDate),
      salaryComponentId,
      status: "draft",
    });

    return res.status(201).json({ isOk: true, status: 201, message: "Gratuity created successfully", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const listGratuities = async (req, res) => {
  try {
    const scope = await attendanceScope(req, false);
    const result = await runListQuery(Gratuity, req.query, {
      scopeFilter: scope,
      filterable: GRATUITY_FILTERABLE,
      stages: [
        { $lookup: { from: "employees", localField: "employeeId", foreignField: "_id", as: "employeeId_joined" } },
        { $addFields: { employeeIdLabel: { $arrayElemAt: ["$employeeId_joined.employeeName", 0] } } },
        { $project: { employeeId_joined: 0 } },
        { $lookup: { from: "gratuityrules", localField: "gratuityRuleId", foreignField: "_id", as: "gratuityRuleId_joined" } },
        { $addFields: { gratuityRuleIdLabel: { $arrayElemAt: ["$gratuityRuleId_joined.name", 0] } } },
        { $project: { gratuityRuleId_joined: 0 } },
        { $lookup: { from: "salarycomponents", localField: "salaryComponentId", foreignField: "_id", as: "salaryComponentId_joined" } },
        { $addFields: { salaryComponentIdLabel: { $arrayElemAt: ["$salaryComponentId_joined.salaryComponentName", 0] } } },
        { $project: { salaryComponentId_joined: 0 } },
      ],
    });
    return res.status(200).json({ isOk: true, status: 200, data: result });
  } catch (error) {
    return failure(res, error);
  }
};

export const searchGratuities = async (req, res) => {
  try {
    const scope = await attendanceScope(req, false);
    const data = await runListQuery(Gratuity, req.body, {
      scopeFilter: scope,
      filterable: GRATUITY_FILTERABLE,
      stages: [
        { $lookup: { from: "employees", localField: "employeeId", foreignField: "_id", as: "employeeId_joined" } },
        { $addFields: { employeeIdLabel: { $arrayElemAt: ["$employeeId_joined.employeeName", 0] } } },
        { $project: { employeeId_joined: 0 } },
        { $lookup: { from: "gratuityrules", localField: "gratuityRuleId", foreignField: "_id", as: "gratuityRuleId_joined" } },
        { $addFields: { gratuityRuleIdLabel: { $arrayElemAt: ["$gratuityRuleId_joined.name", 0] } } },
        { $project: { gratuityRuleId_joined: 0 } },
        { $lookup: { from: "salarycomponents", localField: "salaryComponentId", foreignField: "_id", as: "salaryComponentId_joined" } },
        { $addFields: { salaryComponentIdLabel: { $arrayElemAt: ["$salaryComponentId_joined.salaryComponentName", 0] } } },
        { $project: { salaryComponentId_joined: 0 } },
      ],
    });
    return res.status(200).json({ isOk: true, status: 200, data });
  } catch (error) {
    return failure(res, error);
  }
};

export const getGratuityById = async (req, res) => {
  try {
    const doc = await Gratuity.findById(req.params.id)
      .populate("employeeId", "employeeName employeeCode")
      .populate("gratuityRuleId", "name")
      .populate("salaryComponentId", "salaryComponentName")
      .populate("companyId", "companyName")
      .populate("additionalSalaryId");
    if (!doc) throwError(404, "Gratuity not found");
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const updateGratuity = async (req, res) => {
  try {
    const doc = await Gratuity.findById(req.params.id);
    if (!doc) throwError(404, "Gratuity not found");
    if (doc.status !== "draft") throwError(400, "Only draft Gratuity documents can be edited");

    if (req.body.payrollDate !== undefined) doc.payrollDate = new Date(req.body.payrollDate);
    if (req.body.postingDate !== undefined) doc.postingDate = new Date(req.body.postingDate);
    if (req.body.salaryComponentId !== undefined) {
      const component = await SalaryComponent.findById(req.body.salaryComponentId).lean();
      if (!component || component.type !== "Earning") throwError(400, "Salary Component must be of type Earning");
      doc.salaryComponentId = req.body.salaryComponentId;
    }
    if (req.body.gratuityRuleId !== undefined) {
      const rule = await GratuityRule.findById(req.body.gratuityRuleId).lean();
      if (!rule) throwError(404, "Gratuity Rule not found");
      doc.gratuityRuleId = req.body.gratuityRuleId;
    }
    if (req.body.currentWorkExperience !== undefined) {
      doc.currentWorkExperience = Number(req.body.currentWorkExperience) || 0;
    }

    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Gratuity updated successfully", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const submitGratuity = async (req, res) => {
  try {
    const doc = await Gratuity.findById(req.params.id);
    if (!doc) throwError(404, "Gratuity not found");
    if (doc.status !== "draft") throwError(400, "Only draft Gratuity documents can be submitted");

    const employee = await Employee.findById(doc.employeeId).lean();
    if (!employee) throwError(404, "Employee not found");
    if (!employee.relievingDate) {
      throwError(400, `Please set the relieving date for employee ${employee.employeeName} first`);
    }

    const rule = await GratuityRule.findById(doc.gratuityRuleId).lean();
    if (!rule) throwError(404, "Gratuity Rule not found");

    const latestSlip = await SalarySlip.findOne({ employeeId: doc.employeeId, status: "submitted" })
      .sort({ startDate: -1 })
      .lean();
    if (!latestSlip) {
      throwError(400, `No Salary Slip found for Employee: ${employee.employeeName}`);
    }

    let currentWorkExperience;
    if (rule.workExperienceCalculationFunction === "Manual") {
      currentWorkExperience = getWorkExperience({
        workExperienceCalculationFunction: "Manual",
        manualValue: doc.currentWorkExperience,
        minimumYearForGratuity: rule.minimumYearForGratuity,
      });
    } else {
      const settings = await getPayrollSettingsDoc();
      const lwpDays = await countLwpDaysInRange({
        employeeId: doc.employeeId,
        startDate: employee.dateOfJoining,
        endDate: employee.relievingDate,
        settings,
      });
      currentWorkExperience = getWorkExperience({
        dateOfJoining: employee.dateOfJoining,
        relievingDate: employee.relievingDate,
        lwpDays,
        totalWorkingDaysPerYear: rule.totalWorkingDaysPerYear,
        workExperienceCalculationFunction: rule.workExperienceCalculationFunction,
        minimumYearForGratuity: rule.minimumYearForGratuity,
      });
    }

    const applicableComponentIds = (rule.applicableEarningsComponent || []).map((r) => r.salaryComponentId);
    const amount = getGratuityAmount({
      workExperience: currentWorkExperience,
      applicableComponentIds,
      latestSlipEarnings: latestSlip.earnings || [],
      calculateGratuityAmountBasedOn: rule.calculateGratuityAmountBasedOn,
      slabs: rule.gratuityRuleSlabs || [],
    });

    const company = await Company.findById(doc.companyId).lean();
    const currency = company?.defaultCurrency || "USD";

    const addSal = await AdditionalSalary.create({
      employeeId: doc.employeeId,
      companyId: doc.companyId,
      salaryComponentId: doc.salaryComponentId,
      type: "Earning",
      amount,
      isRecurring: false,
      payrollDate: doc.payrollDate,
      overwriteSalaryStructureAmount: false,
      currency,
      status: "active",
      refDoctype: "Gratuity",
      refDocnameId: doc._id,
    });

    doc.currentWorkExperience = currentWorkExperience;
    doc.amount = amount;
    doc.additionalSalaryId = addSal._id;
    doc.status = "submitted";
    await doc.save();

    return res.json({ isOk: true, status: 200, message: "Gratuity submitted", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const cancelGratuity = async (req, res) => {
  try {
    const doc = await Gratuity.findById(req.params.id);
    if (!doc) throwError(404, "Gratuity not found");
    if (doc.status !== "submitted") throwError(400, "Only submitted Gratuity documents can be cancelled");

    // ADR-031 fixes a real source asymmetry: cancel cascades to the linked
    // AdditionalSalary (same uniform pattern as RetentionBonus/EmployeeIncentive).
    if (doc.additionalSalaryId) {
      await AdditionalSalary.updateOne({ _id: doc.additionalSalaryId }, { status: "cancelled" });
    }
    await AdditionalSalary.updateMany(
      { refDoctype: "Gratuity", refDocnameId: doc._id, status: "active" },
      { status: "cancelled" },
    );

    doc.status = "cancelled";
    await doc.save();
    return res.json({ isOk: true, status: 200, message: "Gratuity cancelled", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const deleteGratuity = async (req, res) => {
  try {
    const doc = await Gratuity.findById(req.params.id);
    if (!doc) throwError(404, "Gratuity not found");
    if (doc.status === "submitted") throwError(400, "Submitted documents must be cancelled before deletion");
    doc.isDeleted = true;
    await doc.save();
    return res.json({ isOk: true, status: 200, message: "Gratuity deleted" });
  } catch (error) {
    return failure(res, error);
  }
};
