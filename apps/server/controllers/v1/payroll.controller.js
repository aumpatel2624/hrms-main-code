/**
 * ADR-026 — Payroll (Structure & Assignment). SalaryComponent (master),
 * SalaryStructure (+ embedded SalaryDetail rows), SalaryStructureAssignment,
 * and the stateless Bulk Salary Structure Assignment tool (no stored model,
 * same shape as Leave Control Panel / Shift Assignment Tool).
 *
 * Company confinement reuses `attendanceScope` (ADR-025) with
 * `employeeOwned: false` throughout — this module has no self-service/
 * Employee-role access at all (HR-configuration data only), just a company
 * boundary between HR Users/Managers of different companies.
 */
import { runListQuery } from "../../utils/listQuery.js";
import { attendanceScope } from "../../utils/attendanceScope.js";
import { getReferencingCounts, formatReferenceMessage } from "../../utils/referenceHelper.js";
import { deriveAbbreviation, dedupeAbbreviation } from "../../utils/payrollAbbreviation.js";
import { computeStructureTotals, computeCtcAndGross } from "../../utils/payrollCtc.js";
import { getCurrentSalaryStructureAssignment } from "../../utils/payrollAssignment.js";
import SalaryComponent from "../../models/SalaryComponent.js";
import SalaryStructure from "../../models/SalaryStructure.js";
import SalaryStructureAssignment from "../../models/SalaryStructureAssignment.js";
import Employee from "../../models/Employee.js";

const failure = (res, error) => {
  if (error.status) return res.status(error.status).json({ isOk: false, status: error.status, message: error.message });
  if (error.name === "ValidationError" || error.name === "CastError" || error.code === 11000) {
    return res.status(400).json({ isOk: false, status: 400, message: error.code === 11000 ? "A record with these unique values already exists" : error.message });
  }
  console.error("Payroll request failed", error);
  return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
};

const throwError = (status, message) => { const error = new Error(message); error.status = status; throw error; };

// ============================================================ SalaryComponent --

const SALARYCOMPONENT_FIELDS = [
  "salaryComponentName", "abbreviation", "type", "isTaxApplicable", "dependsOnPaymentDays",
  "doNotIncludeInTotal", "statisticalComponent", "roundToNearestInteger", "exemptedFromIncomeTax",
  "removeIfZeroValued", "variableBasedOnTaxableSalary", "arrearComponent", "accrualComponent",
  "companyId", "isActive",
];
export { SALARYCOMPONENT_FIELDS };

const validateSalaryComponentFlags = (payload) => {
  if (payload.variableBasedOnTaxableSalary && payload.arrearComponent) {
    throwError(400, "Arrear Component cannot be set for Salary Components based on taxable salary");
  }
  if (payload.accrualComponent && payload.type !== "Earning") {
    throwError(400, "Accrual Component can only be set for Earning Salary Components");
  }
};

export const createSalaryComponent = async (req, res) => {
  try {
    const payload = {};
    for (const field of SALARYCOMPONENT_FIELDS) if (req.body[field] !== undefined) payload[field] = req.body[field];
    if (!payload.salaryComponentName || !payload.type || !payload.companyId) {
      return res.status(400).json({ isOk: false, status: 400, message: "Salary Component Name, Type and Company are required" });
    }
    validateSalaryComponentFlags(payload);

    const existing = await SalaryComponent.findOne({ salaryComponentName: payload.salaryComponentName, companyId: payload.companyId });
    if (existing) return res.status(400).json({ isOk: false, status: 400, message: "A Salary Component with this name already exists for this company" });

    const derived = payload.abbreviation && payload.abbreviation.trim() ? payload.abbreviation.trim() : deriveAbbreviation(payload.salaryComponentName);
    payload.abbreviation = await dedupeAbbreviation(SalaryComponent, derived, payload.companyId);

    const doc = await SalaryComponent.create(payload);
    return res.status(201).json({ isOk: true, status: 201, data: doc, message: "Salary Component created successfully" });
  } catch (error) { return failure(res, error); }
};

export const updateSalaryComponent = async (req, res) => {
  try {
    const doc = await SalaryComponent.findOne({ $and: [{ _id: req.params.salaryComponentId }, await attendanceScope(req, false)] });
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Salary Component not found" });

    const merged = doc.toObject();
    for (const field of SALARYCOMPONENT_FIELDS) if (req.body[field] !== undefined) merged[field] = req.body[field];
    validateSalaryComponentFlags(merged);

    for (const field of SALARYCOMPONENT_FIELDS) if (field !== "abbreviation" && req.body[field] !== undefined) doc[field] = req.body[field];

    // Abbreviation: an explicit non-empty value is deduped and set as given;
    // an explicit empty value (or a renamed component with no abbreviation
    // sent) re-derives from the (possibly also-updated) name — matching
    // source's own "re-derive only when the field is left blank" rule.
    if (Object.prototype.hasOwnProperty.call(req.body, "abbreviation")) {
      const requested = (req.body.abbreviation || "").trim();
      const base = requested || deriveAbbreviation(doc.salaryComponentName);
      doc.abbreviation = await dedupeAbbreviation(SalaryComponent, base, doc.companyId, doc._id);
    }

    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, data: doc, message: "Salary Component updated successfully" });
  } catch (error) { return failure(res, error); }
};

export const getSalaryComponentById = async (req, res) => {
  try {
    const doc = await SalaryComponent.findOne({ $and: [{ _id: req.params.salaryComponentId }, await attendanceScope(req, false)] }).populate("companyId", "companyName");
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Salary Component not found" });
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) { return failure(res, error); }
};

export const listSalaryComponents = async (req, res) => {
  try {
    const docs = await SalaryComponent.find({ $and: [{ isActive: true }, await attendanceScope(req, false)] });
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) { return failure(res, error); }
};

export const searchSalaryComponents = async (req, res) => {
  try {
    const data = await runListQuery(SalaryComponent, req.body, {
      scopeFilter: await attendanceScope(req, false),
      searchFields: ["salaryComponentName", "abbreviation"],
      filterable: {
        salaryComponentName: "string", abbreviation: "string", type: "string",
        companyId: "objectId", isActive: "boolean", createdAt: "date",
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

export const deleteSalaryComponent = async (req, res) => {
  try {
    const doc = await SalaryComponent.findOne({ $and: [{ _id: req.params.salaryComponentId }, await attendanceScope(req, false)] });
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Salary Component not found" });
    const refs = await getReferencingCounts("SalaryComponent", doc._id);
    if (refs.totalReferences) return res.status(409).json({ isOk: false, status: 409,
      message: "Cannot delete Salary Component. It is being used by other records.", totalReferences: refs.totalReferences,
      references: refs.details, formattedMessage: formatReferenceMessage(refs.details),
    });
    await SalaryComponent.findByIdAndUpdate(doc._id, { isDeleted: true });
    return res.status(200).json({ isOk: true, status: 200, message: "Salary Component deleted successfully" });
  } catch (error) { return failure(res, error); }
};

// ============================================================ SalaryStructure --

const SALARYSTRUCTURE_TOP_FIELDS = ["companyId", "payrollFrequency", "isActive", "leaveEncashmentAmountPerDay", "currency"];
export const SALARYSTRUCTURE_FIELDS = [...SALARYSTRUCTURE_TOP_FIELDS, "earnings", "deductions", "employerContributions"];
const ROW_TABLES = ["earnings", "deductions", "employerContributions"];

/**
 * Builds the final rows for one table (earnings/deductions/
 * employerContributions) from the incoming payload rows plus the existing
 * stored rows (empty on create). A row matched by `_id` to an existing
 * subdocument keeps its already-denormalized flags (ADR-026: one-time
 * snapshot, not a live join) and only has its editable fields
 * (salaryComponentId/amount/formula/condition/amountBasedOnFormula) updated;
 * a row with no matching `_id` is brand new and gets a fresh flag snapshot
 * copied from its referenced SalaryComponent right now.
 */
const buildRows = async (incomingRows, existingRows, companyId) => {
  const existingById = new Map((existingRows || []).map((row) => [String(row._id), row]));
  const result = [];
  for (const incoming of incomingRows || []) {
    const existing = incoming._id && existingById.get(String(incoming._id));
    const amountBasedOnFormula = Boolean(incoming.amountBasedOnFormula);
    if (!amountBasedOnFormula && (incoming.amount === undefined || incoming.amount === null)) {
      throwError(400, "Each row needs an amount unless it is amount-based-on-formula");
    }
    if (amountBasedOnFormula && !incoming.formula) {
      throwError(400, "A row with amount-based-on-formula needs a formula");
    }

    if (existing) {
      result.push({
        _id: existing._id,
        salaryComponentId: incoming.salaryComponentId ?? existing.salaryComponentId,
        abbreviation: existing.abbreviation,
        statisticalComponent: existing.statisticalComponent,
        isTaxApplicable: existing.isTaxApplicable,
        variableBasedOnTaxableSalary: existing.variableBasedOnTaxableSalary,
        dependsOnPaymentDays: existing.dependsOnPaymentDays,
        exemptedFromIncomeTax: existing.exemptedFromIncomeTax,
        doNotIncludeInTotal: existing.doNotIncludeInTotal,
        accrualComponent: existing.accrualComponent,
        condition: incoming.condition ?? "",
        amountBasedOnFormula,
        formula: incoming.formula ?? "",
        amount: amountBasedOnFormula ? 0 : Number(incoming.amount),
      });
      continue;
    }

    if (!incoming.salaryComponentId) throwError(400, "Each row needs a salaryComponentId");
    const component = await SalaryComponent.findOne({ _id: incoming.salaryComponentId, companyId });
    if (!component) throwError(400, `Salary Component ${incoming.salaryComponentId} not found for this company`);

    result.push({
      salaryComponentId: component._id,
      abbreviation: component.abbreviation,
      statisticalComponent: component.statisticalComponent,
      isTaxApplicable: component.isTaxApplicable,
      variableBasedOnTaxableSalary: component.variableBasedOnTaxableSalary,
      dependsOnPaymentDays: component.dependsOnPaymentDays,
      exemptedFromIncomeTax: component.exemptedFromIncomeTax,
      doNotIncludeInTotal: component.doNotIncludeInTotal,
      accrualComponent: component.accrualComponent,
      condition: incoming.condition ?? "",
      amountBasedOnFormula,
      formula: incoming.formula ?? "",
      amount: amountBasedOnFormula ? 0 : Number(incoming.amount),
    });
  }
  return result;
};

/** Rebuilds all three row tables + recomputes totalEarning/totalDeduction/netPay onto `doc` (not yet saved). */
const applyStructureRows = async (doc, req) => {
  for (const table of ROW_TABLES) {
    if (req.body[table] !== undefined) {
      doc[table] = await buildRows(req.body[table], doc[table], doc.companyId);
    }
  }
  const totals = computeStructureTotals(doc);
  for (const table of ROW_TABLES) {
    doc[table].forEach((row, idx) => { row.defaultAmount = totals[table][idx]?.defaultAmount ?? 0; });
  }
  doc.totalEarning = totals.totalEarning;
  doc.totalDeduction = totals.totalDeduction;
  doc.netPay = totals.netPay;
};

export const createSalaryStructure = async (req, res) => {
  try {
    const payload = {};
    for (const field of SALARYSTRUCTURE_TOP_FIELDS) if (req.body[field] !== undefined) payload[field] = req.body[field];
    if (!payload.companyId || !payload.payrollFrequency || !payload.currency) {
      return res.status(400).json({ isOk: false, status: 400, message: "Company, Payroll Frequency and Currency are required" });
    }
    const doc = new SalaryStructure(payload);
    await applyStructureRows(doc, req);
    await doc.save();
    return res.status(201).json({ isOk: true, status: 201, data: doc, message: "Salary Structure created successfully" });
  } catch (error) { return failure(res, error); }
};

export const updateSalaryStructure = async (req, res) => {
  try {
    const doc = await SalaryStructure.findOne({ $and: [{ _id: req.params.salaryStructureId }, await attendanceScope(req, false)] });
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Salary Structure not found" });

    for (const field of SALARYSTRUCTURE_TOP_FIELDS) if (field !== "companyId" && req.body[field] !== undefined) doc[field] = req.body[field];
    await applyStructureRows(doc, req);
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, data: doc, message: "Salary Structure updated successfully" });
  } catch (error) { return failure(res, error); }
};

export const getSalaryStructureById = async (req, res) => {
  try {
    const doc = await SalaryStructure.findOne({ $and: [{ _id: req.params.salaryStructureId }, await attendanceScope(req, false)] })
      .populate("companyId", "companyName")
      .populate("earnings.salaryComponentId", "salaryComponentName abbreviation")
      .populate("deductions.salaryComponentId", "salaryComponentName abbreviation")
      .populate("employerContributions.salaryComponentId", "salaryComponentName abbreviation");
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Salary Structure not found" });
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) { return failure(res, error); }
};

export const listSalaryStructures = async (req, res) => {
  try {
    const docs = await SalaryStructure.find({ $and: [{ isActive: true }, await attendanceScope(req, false)] });
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) { return failure(res, error); }
};

export const searchSalaryStructures = async (req, res) => {
  try {
    const data = await runListQuery(SalaryStructure, req.body, {
      scopeFilter: await attendanceScope(req, false),
      searchFields: [],
      filterable: {
        companyId: "objectId", payrollFrequency: "string", isActive: "boolean", createdAt: "date",
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

export const deleteSalaryStructure = async (req, res) => {
  try {
    const doc = await SalaryStructure.findOne({ $and: [{ _id: req.params.salaryStructureId }, await attendanceScope(req, false)] });
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Salary Structure not found" });
    const refs = await getReferencingCounts("SalaryStructure", doc._id);
    if (refs.totalReferences) return res.status(409).json({ isOk: false, status: 409,
      message: "Cannot delete Salary Structure. It is being used by other records.", totalReferences: refs.totalReferences,
      references: refs.details, formattedMessage: formatReferenceMessage(refs.details),
    });
    await SalaryStructure.findByIdAndUpdate(doc._id, { isDeleted: true });
    return res.status(200).json({ isOk: true, status: 200, message: "Salary Structure deleted successfully" });
  } catch (error) { return failure(res, error); }
};

// ================================================== SalaryStructureAssignment --

/**
 * The shared creation core (ADR-026 / AGENTS.md #2) — reused verbatim by the
 * single-assignment HTTP handler below and by the bulk `/assign` action,
 * mirroring source's own `create_salary_structure_assignment` reuse.
 * Throws an Error with a `.status` on any known validation failure so a
 * bulk caller can catch it per-employee without aborting the batch.
 */
export const SALARYSTRUCTUREASSIGNMENT_FIELDS = ["employeeId", "salaryStructureId", "fromDate", "base", "variable", "leaveEncashmentAmountPerDay"];

export const createSalaryStructureAssignmentCore = async ({ employeeId, salaryStructureId, fromDate, base, variable, leaveEncashmentAmountPerDay }) => {
  if (!employeeId || !salaryStructureId || !fromDate) {
    throwError(400, "Employee, Salary Structure and From Date are required");
  }
  const employee = await Employee.findById(employeeId).lean();
  if (!employee) throwError(404, "Employee not found");
  // Reuses this project's established active-employee guard (leavesTransactions.controller.js's createLeaveEncashment).
  if (employee.status === "Inactive") {
    throwError(400, `Transactions cannot be created for an Inactive Employee ${employee.employeeName}`);
  }

  const from = new Date(fromDate);
  if (employee.dateOfJoining && from < new Date(employee.dateOfJoining)) {
    throwError(400, "From Date cannot be before the employee's Date of Joining");
  }
  if (employee.relievingDate && from > new Date(employee.relievingDate)) {
    throwError(400, "From Date cannot be after the employee's Relieving Date");
  }

  const structure = await SalaryStructure.findById(salaryStructureId);
  if (!structure) throwError(404, "Salary Structure not found");
  if (String(structure.companyId) !== String(employee.companyId)) {
    throwError(400, "Salary Structure does not belong to the employee's company");
  }

  // The ONLY uniqueness invariant (ADR-026) — exact-duplicate fromDate for
  // the same employee. No overlap guard, no toDate field.
  const duplicate = await SalaryStructureAssignment.findOne({ employeeId, fromDate: from });
  if (duplicate) throwError(400, "Salary Structure Assignment for Employee already exists for this From Date");

  // fetch_from structure.leaveEncashmentAmountPerDay, fetch_if_empty (Q-14):
  // only fall back to the structure's rate when the caller didn't supply
  // one of their own.
  const resolvedLeaveEncashmentAmountPerDay = leaveEncashmentAmountPerDay !== undefined && leaveEncashmentAmountPerDay !== null
    ? leaveEncashmentAmountPerDay
    : (structure.leaveEncashmentAmountPerDay ?? null);

  const { annualGrossEarning, ctc } = computeCtcAndGross(structure, { base, variable });

  const doc = await SalaryStructureAssignment.create({
    employeeId,
    salaryStructureId,
    fromDate: from,
    companyId: employee.companyId,
    base: base ?? null,
    variable: variable ?? null,
    currency: structure.currency,
    leaveEncashmentAmountPerDay: resolvedLeaveEncashmentAmountPerDay,
    annualGrossEarning,
    ctc,
  });
  return doc;
};

export const createSalaryStructureAssignment = async (req, res) => {
  try {
    const doc = await createSalaryStructureAssignmentCore({
      employeeId: req.body.employeeId,
      salaryStructureId: req.body.salaryStructureId,
      fromDate: req.body.fromDate,
      base: req.body.base,
      variable: req.body.variable,
      leaveEncashmentAmountPerDay: req.body.leaveEncashmentAmountPerDay,
    });
    return res.status(201).json({ isOk: true, status: 201, data: doc, message: "Salary Structure Assignment created successfully" });
  } catch (error) { return failure(res, error); }
};

export const updateSalaryStructureAssignment = async (req, res) => {
  try {
    const doc = await SalaryStructureAssignment.findOne({ $and: [{ _id: req.params.salaryStructureAssignmentId }, await attendanceScope(req, false)] });
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Salary Structure Assignment not found" });

    if (req.body.base !== undefined) doc.base = req.body.base;
    if (req.body.variable !== undefined) doc.variable = req.body.variable;

    const structure = await SalaryStructure.findById(doc.salaryStructureId);
    if (!structure) return res.status(400).json({ isOk: false, status: 400, message: "Salary Structure not found" });
    const { annualGrossEarning, ctc } = computeCtcAndGross(structure, { base: doc.base, variable: doc.variable });
    doc.annualGrossEarning = annualGrossEarning;
    doc.ctc = ctc;

    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, data: doc, message: "Salary Structure Assignment updated successfully" });
  } catch (error) { return failure(res, error); }
};

export const getSalaryStructureAssignmentById = async (req, res) => {
  try {
    const doc = await SalaryStructureAssignment.findOne({ $and: [{ _id: req.params.salaryStructureAssignmentId }, await attendanceScope(req, false)] })
      .populate("employeeId", "employeeName employeeCode")
      .populate("salaryStructureId", "payrollFrequency currency")
      .populate("companyId", "companyName");
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Salary Structure Assignment not found" });
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) { return failure(res, error); }
};

export const listSalaryStructureAssignments = async (req, res) => {
  try {
    const docs = await SalaryStructureAssignment.find(await attendanceScope(req, false));
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) { return failure(res, error); }
};

export const searchSalaryStructureAssignments = async (req, res) => {
  try {
    const data = await runListQuery(SalaryStructureAssignment, req.body, {
      scopeFilter: await attendanceScope(req, false),
      searchFields: [],
      filterable: {
        employeeId: "objectId", salaryStructureId: "objectId", fromDate: "date",
        companyId: "objectId", createdAt: "date",
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

export const deleteSalaryStructureAssignment = async (req, res) => {
  try {
    const doc = await SalaryStructureAssignment.findOne({ $and: [{ _id: req.params.salaryStructureAssignmentId }, await attendanceScope(req, false)] });
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Salary Structure Assignment not found" });
    await SalaryStructureAssignment.findByIdAndUpdate(doc._id, { isDeleted: true });
    return res.status(200).json({ isOk: true, status: 200, message: "Salary Structure Assignment deleted successfully" });
  } catch (error) { return failure(res, error); }
};

// ================================================ Bulk Salary Structure Assignment --
// No stored model — a stateless bulk-action tool pair, matching Leave
// Control Panel / Shift Assignment Tool precedent exactly (ADR-026).
// Always synchronous with per-item try/catch isolation, no size-based async
// threshold (this project has no real queue at this scale).

export const eligibleEmployeesForBulkAssignment = async (req, res) => {
  try {
    const { fromDate, companyId, departmentId, gradeId, employmentTypeId } = req.body;
    if (!fromDate) return res.status(400).json({ isOk: false, status: 400, message: "From Date is required" });
    const from = new Date(fromDate);

    const match = {
      status: "Active",
      dateOfJoining: { $lte: from },
      $or: [{ relievingDate: null }, { relievingDate: { $gt: from } }],
    };
    if (companyId) match.companyId = companyId;
    if (departmentId) match.departmentId = departmentId;
    if (gradeId) match.gradeId = gradeId;
    if (employmentTypeId) match.employmentTypeId = employmentTypeId;

    const alreadyAssigned = await SalaryStructureAssignment.find({ fromDate: from }).distinct("employeeId");
    match._id = { $nin: alreadyAssigned };

    const employees = await Employee.find(match).populate("gradeId", "defaultBasePay").lean();
    const data = employees.map((employee) => ({
      employeeId: employee._id,
      employeeName: employee.employeeName,
      employeeCode: employee.employeeCode,
      gradeId: employee.gradeId?._id ?? null,
      base: employee.gradeId?.defaultBasePay ?? 0,
      variable: 0,
    }));
    return res.status(200).json({ isOk: true, status: 200, data });
  } catch (error) { return failure(res, error); }
};

export const bulkAssignSalaryStructure = async (req, res) => {
  try {
    const { employeeIds, salaryStructureId, fromDate, base, variable } = req.body;
    if (!salaryStructureId || !fromDate || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ isOk: false, status: 400, message: "Salary Structure, From Date and at least one employee are required" });
    }

    const results = [];
    for (const employeeId of employeeIds) {
      try {
        const doc = await createSalaryStructureAssignmentCore({ employeeId, salaryStructureId, fromDate, base, variable }); // eslint-disable-line no-await-in-loop
        results.push({ employeeId, success: true, salaryStructureAssignmentId: doc._id });
      } catch (error) {
        results.push({ employeeId, success: false, error: error.message || "Could not create this assignment" });
      }
    }
    return res.status(200).json({ isOk: true, status: 200, data: { results } });
  } catch (error) { return failure(res, error); }
};
