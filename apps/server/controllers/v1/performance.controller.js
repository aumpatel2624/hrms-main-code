/**
 * ADR-032 (Performance, module 16, foundation half).
 *
 * KRA / EmployeeFeedbackCriteria: plain CRUD masters (matching source).
 * AppraisalTemplate: plain CRUD master; weightage-sum validated on both
 * `goals` and `ratingCriteria` at save time via `utils/appraisalCalc.js`.
 * AppraisalCycle: plain CRUD master with three real actions ("get eligible
 * employees", "create appraisals", "complete cycle") plus a `kraEvaluationMethod`
 * immutability guard once any non-cancelled Appraisal exists under it.
 * Appraisal: folded-docstatus doctype (draft/submitted/cancelled). Creation
 * copies the resolved AppraisalTemplate's rows by value into whichever of
 * `appraisalKra`/`goals` is active (per the cycle's `kraEvaluationMethod`)
 * plus `selfRatings`. Submit recomputes all four scores server-side via
 * `appraisalCalc.js` — never trusts whatever the client last saw.
 *
 * Goal and EmployeePerformanceFeedback are the deliberately separate second
 * branch (ADR-032, feat/performance-goals) — `Goal` is now wired into
 * `submitAppraisal`'s automated-mode scoring below; everything else about
 * either doctype (CRUD, cascades, submit/cancel) lives in
 * `performanceGoals.controller.js`, not here.
 */
import KRA from "../../models/KRA.js";
import EmployeeFeedbackCriteria from "../../models/EmployeeFeedbackCriteria.js";
import AppraisalTemplate from "../../models/AppraisalTemplate.js";
import AppraisalCycle from "../../models/AppraisalCycle.js";
import Appraisal from "../../models/Appraisal.js";
import Goal from "../../models/Goal.js";
import Employee from "../../models/Employee.js";
import Designation from "../../models/Designation.js";
import Company from "../../models/Company.js";
import { runListQuery } from "../../utils/listQuery.js";
import {
  validateWeightageSum,
  calculateAutomatedGoalScore,
  calculateManualGoalScore,
  calculateSelfScore,
  calculateFinalScore,
} from "../../utils/appraisalCalc.js";

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
  console.error("Performance request failed", error);
  return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
};

const throwError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  throw error;
};

// ============================================================================
// 1. KRA
// ============================================================================

export const KRA_FIELDS = ["name"];

export const createKRA = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) throwError(400, "Name is required");
    const doc = await KRA.create({ name });
    return res.status(201).json({ isOk: true, status: 201, message: "KRA created successfully", data: doc });
  } catch (error) { return failure(res, error); }
};

export const listKRAs = async (req, res) => {
  try {
    const docs = await KRA.find({}).sort({ name: 1 });
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) { return failure(res, error); }
};

export const searchKRAs = async (req, res) => {
  try {
    const data = await runListQuery(KRA, req.body, {
      searchFields: ["name"],
      filterable: { name: "string", createdAt: "date" },
    });
    return res.status(200).json({ isOk: true, status: 200, data });
  } catch (error) { return failure(res, error); }
};

export const getKRAById = async (req, res) => {
  try {
    const doc = await KRA.findById(req.params.id);
    if (!doc) throwError(404, "KRA not found");
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) { return failure(res, error); }
};

export const updateKRA = async (req, res) => {
  try {
    const doc = await KRA.findById(req.params.id);
    if (!doc) throwError(404, "KRA not found");
    if (req.body.name !== undefined) doc.name = req.body.name;
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "KRA updated successfully", data: doc });
  } catch (error) { return failure(res, error); }
};

export const deleteKRA = async (req, res) => {
  try {
    const doc = await KRA.findById(req.params.id);
    if (!doc) throwError(404, "KRA not found");
    const inUse = (await AppraisalTemplate.exists({ "goals.kraId": doc._id }))
      || (await Appraisal.exists({ "appraisalKra.kraId": doc._id }));
    if (inUse) throwError(409, "Cannot delete a KRA that is referenced by an existing Appraisal Template or Appraisal");
    await KRA.findByIdAndDelete(doc._id);
    return res.status(200).json({ isOk: true, status: 200, message: "KRA deleted successfully" });
  } catch (error) { return failure(res, error); }
};

// ============================================================================
// 2. Employee Feedback Criteria
// ============================================================================

export const EMPLOYEE_FEEDBACK_CRITERIA_FIELDS = ["criteria"];

export const createEmployeeFeedbackCriteria = async (req, res) => {
  try {
    const { criteria } = req.body;
    if (!criteria) throwError(400, "Criteria is required");
    const doc = await EmployeeFeedbackCriteria.create({ criteria });
    return res.status(201).json({ isOk: true, status: 201, message: "Employee Feedback Criteria created successfully", data: doc });
  } catch (error) { return failure(res, error); }
};

export const listEmployeeFeedbackCriteria = async (req, res) => {
  try {
    const docs = await EmployeeFeedbackCriteria.find({}).sort({ criteria: 1 });
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) { return failure(res, error); }
};

export const searchEmployeeFeedbackCriteria = async (req, res) => {
  try {
    const data = await runListQuery(EmployeeFeedbackCriteria, req.body, {
      searchFields: ["criteria"],
      filterable: { criteria: "string", createdAt: "date" },
    });
    return res.status(200).json({ isOk: true, status: 200, data });
  } catch (error) { return failure(res, error); }
};

export const getEmployeeFeedbackCriteriaById = async (req, res) => {
  try {
    const doc = await EmployeeFeedbackCriteria.findById(req.params.id);
    if (!doc) throwError(404, "Employee Feedback Criteria not found");
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) { return failure(res, error); }
};

export const updateEmployeeFeedbackCriteria = async (req, res) => {
  try {
    const doc = await EmployeeFeedbackCriteria.findById(req.params.id);
    if (!doc) throwError(404, "Employee Feedback Criteria not found");
    if (req.body.criteria !== undefined) doc.criteria = req.body.criteria;
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Employee Feedback Criteria updated successfully", data: doc });
  } catch (error) { return failure(res, error); }
};

export const deleteEmployeeFeedbackCriteria = async (req, res) => {
  try {
    const doc = await EmployeeFeedbackCriteria.findById(req.params.id);
    if (!doc) throwError(404, "Employee Feedback Criteria not found");
    const inUse = (await AppraisalTemplate.exists({ "ratingCriteria.criteriaId": doc._id }))
      || (await Appraisal.exists({ "selfRatings.criteriaId": doc._id }));
    if (inUse) throwError(409, "Cannot delete a criteria that is referenced by an existing Appraisal Template or Appraisal");
    await EmployeeFeedbackCriteria.findByIdAndDelete(doc._id);
    return res.status(200).json({ isOk: true, status: 200, message: "Employee Feedback Criteria deleted successfully" });
  } catch (error) { return failure(res, error); }
};

// ============================================================================
// 3. Appraisal Template
// ============================================================================

export const APPRAISAL_TEMPLATE_FIELDS = ["templateTitle", "description", "goals", "ratingCriteria"];

const normalizeGoals = (goals = []) =>
  (Array.isArray(goals) ? goals : []).map((row) => ({
    kraId: row.kraId,
    weightage: Number(row.weightage) || 0,
  }));

const normalizeRatingCriteria = (rows = []) =>
  (Array.isArray(rows) ? rows : []).map((row) => ({
    criteriaId: row.criteriaId,
    weightage: Number(row.weightage) || 0,
  }));

const validateTemplateTables = ({ goals, ratingCriteria }) => {
  validateWeightageSum(goals);
  validateWeightageSum(ratingCriteria);
};

export const createAppraisalTemplate = async (req, res) => {
  try {
    const { templateTitle } = req.body;
    if (!templateTitle) throwError(400, "Template Title is required");
    const goals = normalizeGoals(req.body.goals);
    const ratingCriteria = normalizeRatingCriteria(req.body.ratingCriteria);
    validateTemplateTables({ goals, ratingCriteria });

    const doc = await AppraisalTemplate.create({
      templateTitle,
      description: req.body.description || "",
      goals,
      ratingCriteria,
    });
    return res.status(201).json({ isOk: true, status: 201, message: "Appraisal Template created successfully", data: doc });
  } catch (error) { return failure(res, error); }
};

export const listAppraisalTemplates = async (req, res) => {
  try {
    const docs = await AppraisalTemplate.find({}).sort({ templateTitle: 1 });
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) { return failure(res, error); }
};

export const searchAppraisalTemplates = async (req, res) => {
  try {
    const data = await runListQuery(AppraisalTemplate, req.body, {
      searchFields: ["templateTitle", "description"],
      filterable: { templateTitle: "string", createdAt: "date" },
    });
    return res.status(200).json({ isOk: true, status: 200, data });
  } catch (error) { return failure(res, error); }
};

export const getAppraisalTemplateById = async (req, res) => {
  try {
    const doc = await AppraisalTemplate.findById(req.params.id)
      .populate("goals.kraId", "name")
      .populate("ratingCriteria.criteriaId", "criteria");
    if (!doc) throwError(404, "Appraisal Template not found");
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) { return failure(res, error); }
};

export const updateAppraisalTemplate = async (req, res) => {
  try {
    const doc = await AppraisalTemplate.findById(req.params.id);
    if (!doc) throwError(404, "Appraisal Template not found");

    const nextGoals = req.body.goals !== undefined ? normalizeGoals(req.body.goals) : doc.goals;
    const nextRatingCriteria = req.body.ratingCriteria !== undefined ? normalizeRatingCriteria(req.body.ratingCriteria) : doc.ratingCriteria;
    validateTemplateTables({ goals: nextGoals, ratingCriteria: nextRatingCriteria });

    if (req.body.templateTitle !== undefined) doc.templateTitle = req.body.templateTitle;
    if (req.body.description !== undefined) doc.description = req.body.description;
    doc.goals = nextGoals;
    doc.ratingCriteria = nextRatingCriteria;

    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Appraisal Template updated successfully", data: doc });
  } catch (error) { return failure(res, error); }
};

export const deleteAppraisalTemplate = async (req, res) => {
  try {
    const doc = await AppraisalTemplate.findById(req.params.id);
    if (!doc) throwError(404, "Appraisal Template not found");
    const inUse = (await Designation.exists({ appraisalTemplateId: doc._id }))
      || (await AppraisalCycle.exists({ "appraisees.appraisalTemplateId": doc._id }))
      || (await Appraisal.exists({ appraisalTemplateId: doc._id }));
    if (inUse) throwError(409, "Cannot delete an Appraisal Template that is referenced by a Designation, Appraisal Cycle, or Appraisal");
    await AppraisalTemplate.findByIdAndDelete(doc._id);
    return res.status(200).json({ isOk: true, status: 200, message: "Appraisal Template deleted successfully" });
  } catch (error) { return failure(res, error); }
};

// ============================================================================
// 4. Appraisal Cycle
// ============================================================================

export const APPRAISAL_CYCLE_FIELDS = [
  "cycleName", "companyId", "startDate", "endDate", "description",
  "kraEvaluationMethod", "calculateFinalScoreBasedOnFormula", "finalScoreFormula",
  "branchId", "departmentId", "designationId", "status",
];

export const APPRAISAL_CYCLE_FILTERABLE = {
  cycleName: "string",
  companyId: "objectId",
  status: "string",
  kraEvaluationMethod: "string",
  startDate: "date",
  endDate: "date",
  createdAt: "date",
};

const validateCycleDates = (startDate, endDate) => {
  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    throwError(400, "End Date cannot be before Start Date");
  }
};

const validateCycleFormula = ({ calculateFinalScoreBasedOnFormula, finalScoreFormula }) => {
  if (calculateFinalScoreBasedOnFormula && !finalScoreFormula) {
    throwError(400, "Final Score Formula is required when Calculate Final Score based on Formula is enabled");
  }
};

// Module-wide invariant (`_Module-Spec.md`): no transactions may be created
// or edited against a Completed Appraisal Cycle. Reused by the Appraisal
// controller below too.
export const assertCycleNotCompleted = (cycle) => {
  if (cycle.status === "Completed") {
    throwError(
      400,
      "Cannot create or change transactions against an Appraisal Cycle with status Completed. Set the status to In Progress if required.",
    );
  }
};

export const createAppraisalCycle = async (req, res) => {
  try {
    const { cycleName, companyId, startDate, endDate } = req.body;
    if (!cycleName || !companyId || !startDate || !endDate) {
      throwError(400, "Cycle Name, Company, Start Date and End Date are required");
    }
    validateCycleDates(startDate, endDate);
    validateCycleFormula(req.body);

    const doc = await AppraisalCycle.create({
      cycleName,
      companyId,
      status: "Not Started",
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      description: req.body.description || "",
      kraEvaluationMethod: req.body.kraEvaluationMethod || "Automated Based on Goal Progress",
      calculateFinalScoreBasedOnFormula: Boolean(req.body.calculateFinalScoreBasedOnFormula),
      finalScoreFormula: req.body.finalScoreFormula || "",
      branchId: req.body.branchId || null,
      departmentId: req.body.departmentId || null,
      designationId: req.body.designationId || null,
      appraisees: [],
    });
    return res.status(201).json({ isOk: true, status: 201, message: "Appraisal Cycle created successfully", data: doc });
  } catch (error) { return failure(res, error); }
};

export const listAppraisalCycles = async (req, res) => {
  try {
    const data = await runListQuery(AppraisalCycle, req.query, {
      filterable: APPRAISAL_CYCLE_FILTERABLE,
      stages: [
        { $lookup: { from: "companies", localField: "companyId", foreignField: "_id", as: "companyId_joined" } },
        { $addFields: { companyIdLabel: { $arrayElemAt: ["$companyId_joined.companyName", 0] } } },
        { $project: { companyId_joined: 0 } },
      ],
    });
    return res.status(200).json({ isOk: true, status: 200, data });
  } catch (error) { return failure(res, error); }
};

export const searchAppraisalCycles = async (req, res) => {
  try {
    const data = await runListQuery(AppraisalCycle, req.body, {
      searchFields: ["cycleName"],
      filterable: APPRAISAL_CYCLE_FILTERABLE,
      stages: [
        { $lookup: { from: "companies", localField: "companyId", foreignField: "_id", as: "companyId_joined" } },
        { $addFields: { companyIdLabel: { $arrayElemAt: ["$companyId_joined.companyName", 0] } } },
        { $project: { companyId_joined: 0 } },
      ],
    });
    return res.status(200).json({ isOk: true, status: 200, data });
  } catch (error) { return failure(res, error); }
};

export const getAppraisalCycleById = async (req, res) => {
  try {
    const doc = await AppraisalCycle.findById(req.params.id)
      .populate("companyId", "companyName")
      .populate("branchId", "branchName")
      .populate("departmentId", "departmentName")
      .populate("designationId", "designationName")
      .populate("appraisees.employeeId", "employeeName employeeCode")
      .populate("appraisees.appraisalTemplateId", "templateTitle");
    if (!doc) throwError(404, "Appraisal Cycle not found");
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) { return failure(res, error); }
};

export const updateAppraisalCycle = async (req, res) => {
  try {
    const doc = await AppraisalCycle.findById(req.params.id);
    if (!doc) throwError(404, "Appraisal Cycle not found");

    const nextStart = req.body.startDate !== undefined ? req.body.startDate : doc.startDate;
    const nextEnd = req.body.endDate !== undefined ? req.body.endDate : doc.endDate;
    validateCycleDates(nextStart, nextEnd);
    validateCycleFormula({
      calculateFinalScoreBasedOnFormula: req.body.calculateFinalScoreBasedOnFormula !== undefined
        ? req.body.calculateFinalScoreBasedOnFormula : doc.calculateFinalScoreBasedOnFormula,
      finalScoreFormula: req.body.finalScoreFormula !== undefined ? req.body.finalScoreFormula : doc.finalScoreFormula,
    });

    // Immutability guard (Module-Wide Invariants): kraEvaluationMethod
    // cannot change once any non-cancelled Appraisal exists under this cycle.
    if (req.body.kraEvaluationMethod !== undefined && req.body.kraEvaluationMethod !== doc.kraEvaluationMethod) {
      const appraisalsExist = await Appraisal.exists({ appraisalCycleId: doc._id, status: { $ne: "cancelled" } });
      if (appraisalsExist) {
        throwError(400, "Evaluation Method cannot be changed as there are existing appraisals created for this cycle");
      }
    }

    // The Completed transition must go through the guarded completeCycle
    // action, not a plain field write (a deliberate small tightening over
    // source, which leaves this transition ungated — see Appraisal Cycle
    // model comment).
    if (req.body.status !== undefined && req.body.status === "Completed" && doc.status !== "Completed") {
      throwError(400, "Use the Complete Cycle action to mark a cycle Completed");
    }

    if (req.body.cycleName !== undefined) doc.cycleName = req.body.cycleName;
    if (req.body.companyId !== undefined) doc.companyId = req.body.companyId;
    if (req.body.startDate !== undefined) doc.startDate = new Date(req.body.startDate);
    if (req.body.endDate !== undefined) doc.endDate = new Date(req.body.endDate);
    if (req.body.description !== undefined) doc.description = req.body.description;
    if (req.body.kraEvaluationMethod !== undefined) doc.kraEvaluationMethod = req.body.kraEvaluationMethod;
    if (req.body.calculateFinalScoreBasedOnFormula !== undefined) doc.calculateFinalScoreBasedOnFormula = Boolean(req.body.calculateFinalScoreBasedOnFormula);
    if (req.body.finalScoreFormula !== undefined) doc.finalScoreFormula = req.body.finalScoreFormula;
    if (req.body.branchId !== undefined) doc.branchId = req.body.branchId || null;
    if (req.body.departmentId !== undefined) doc.departmentId = req.body.departmentId || null;
    if (req.body.designationId !== undefined) doc.designationId = req.body.designationId || null;
    if (req.body.status !== undefined && req.body.status !== "Completed") doc.status = req.body.status;

    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Appraisal Cycle updated successfully", data: doc });
  } catch (error) { return failure(res, error); }
};

export const deleteAppraisalCycle = async (req, res) => {
  try {
    const doc = await AppraisalCycle.findById(req.params.id);
    if (!doc) throwError(404, "Appraisal Cycle not found");
    const inUse = await Appraisal.exists({ appraisalCycleId: doc._id });
    if (inUse) throwError(409, "Cannot delete an Appraisal Cycle that has Appraisals created under it");
    await AppraisalCycle.findByIdAndDelete(doc._id);
    return res.status(200).json({ isOk: true, status: 200, message: "Appraisal Cycle deleted successfully" });
  } catch (error) { return failure(res, error); }
};

// ---- "Get Eligible Employees" action ---------------------------------------
// Resolves the cycle's own stored filters (company + optional branch/
// department/designation) against Active employees, defaults each row's
// template from Designation.appraisalTemplateId, and persists the result
// into cycle.appraisees (matching source's set_employees(), which clears and
// repopulates the same child table via save — not a stateless read-only
// preview).
export const getEligibleEmployeesForCycle = async (req, res) => {
  try {
    const cycle = await AppraisalCycle.findById(req.params.id);
    if (!cycle) throwError(404, "Appraisal Cycle not found");

    const match = { status: "Active", companyId: cycle.companyId };
    if (cycle.branchId) match.branchId = cycle.branchId;
    if (cycle.departmentId) match.departmentId = cycle.departmentId;
    if (cycle.designationId) match.designationId = cycle.designationId;

    const employees = await Employee.find(match).select("employeeName employeeCode branchId departmentId designationId").lean();

    const designationIds = [...new Set(employees.map((e) => String(e.designationId)))];
    const designations = designationIds.length
      ? await Designation.find({ _id: { $in: designationIds } }).select("appraisalTemplateId").lean()
      : [];
    const templateByDesignation = Object.fromEntries(designations.map((d) => [String(d._id), d.appraisalTemplateId || null]));

    cycle.appraisees = employees.map((e) => ({
      employeeId: e._id,
      branchId: e.branchId || null,
      designationId: e.designationId || null,
      departmentId: e.departmentId || null,
      appraisalTemplateId: templateByDesignation[String(e.designationId)] || null,
    }));

    await cycle.save();

    const templateMissing = cycle.appraisees.some((row) => !row.appraisalTemplateId);
    return res.status(200).json({
      isOk: true,
      status: 200,
      message: employees.length
        ? "Eligible employees loaded"
        : "No employees found for the selected criteria",
      data: { appraisees: cycle.appraisees, templateMissing },
    });
  } catch (error) { return failure(res, error); }
};

// ---- Shared Appraisal-creation core -----------------------------------------
// Used by both the bulk "create appraisals" cycle action and the standalone
// single createAppraisal endpoint below, so there is exactly one place that
// copies an AppraisalTemplate's rows into a new Appraisal.
export const createAppraisalCore = async ({ cycle, employeeId, appraisalTemplateIdOverride }) => {
  assertCycleNotCompleted(cycle);

  const employee = await Employee.findById(employeeId).lean();
  if (!employee) throwError(404, "Employee not found");
  if (employee.status === "Inactive") {
    throwError(400, `Transactions cannot be created for an Inactive Employee ${employee.employeeName}`);
  }

  const existing = await Appraisal.findOne({ employeeId, appraisalCycleId: cycle._id, status: { $ne: "cancelled" } }).lean();
  if (existing) {
    const error = new Error(`An Appraisal already exists for ${employee.employeeName} under this Appraisal Cycle`);
    error.status = 409;
    error.code = "DUPLICATE_APPRAISAL";
    throw error;
  }

  let appraisalTemplateId = appraisalTemplateIdOverride;
  if (!appraisalTemplateId) {
    const designation = await Designation.findById(employee.designationId).lean();
    appraisalTemplateId = designation?.appraisalTemplateId || null;
  }
  if (!appraisalTemplateId) {
    throwError(
      400,
      `Appraisal Template not found for ${employee.employeeName}'s designation. Set one on the Designation or choose one directly.`,
    );
  }

  const template = await AppraisalTemplate.findById(appraisalTemplateId).lean();
  if (!template) throwError(404, "Appraisal Template not found");

  const rateGoalsManually = cycle.kraEvaluationMethod === "Manual Rating";

  let appraisalKra = [];
  let goals = [];
  if (rateGoalsManually) {
    // Genuine translation step (ADR-032): the template's own child rows are
    // KRA-based (`goals[].kraId`), but manual-mode's `Appraisal.goals[].label`
    // is free text — so this seeds `label` from the referenced KRA's *name*,
    // not its id, matching source's set_kras_and_rating_criteria() which
    // literally copies the KRA link's value (its name) into the free-text field.
    const kraIds = [...new Set((template.goals || []).map((g) => String(g.kraId)))];
    const kras = kraIds.length ? await KRA.find({ _id: { $in: kraIds } }).select("name").lean() : [];
    const kraNameById = Object.fromEntries(kras.map((k) => [String(k._id), k.name]));
    goals = (template.goals || []).map((g) => ({
      label: kraNameById[String(g.kraId)] || "",
      weightage: g.weightage,
      score: 0,
      scoreEarned: 0,
    }));
    validateWeightageSum(goals);
  } else {
    appraisalKra = (template.goals || []).map((g) => ({
      kraId: g.kraId,
      weightage: g.weightage,
      goalCompletion: 0,
      goalScore: 0,
    }));
    validateWeightageSum(appraisalKra);
  }

  const selfRatings = (template.ratingCriteria || []).map((r) => ({
    criteriaId: r.criteriaId,
    weightage: r.weightage,
    rating: 0,
  }));

  const doc = await Appraisal.create({
    employeeId,
    companyId: employee.companyId,
    appraisalCycleId: cycle._id,
    startDate: cycle.startDate,
    endDate: cycle.endDate,
    appraisalTemplateId,
    rateGoalsManually,
    appraisalKra,
    goals,
    selfRatings,
    status: "draft",
  });

  return doc;
};

// ---- "Create Appraisals" bulk action ----------------------------------------
// Synchronous with per-item try/catch isolation (ADR-032 explicitly drops
// source's >30-appraisee background-job machinery as a UX nicety, not a
// correctness rule — matching PayrollEntry's bulk pattern, ADR-027).
export const createAppraisalsForCycle = async (req, res) => {
  try {
    const cycle = await AppraisalCycle.findById(req.params.id);
    if (!cycle) throwError(404, "Appraisal Cycle not found");
    assertCycleNotCompleted(cycle);

    if (!cycle.appraisees || cycle.appraisees.length === 0) {
      throwError(400, "Please select employees to create appraisals for. Run \"Get Eligible Employees\" first.");
    }

    const requestedIds = Array.isArray(req.body?.employeeIds) && req.body.employeeIds.length
      ? new Set(req.body.employeeIds.map(String))
      : null;
    const selected = requestedIds
      ? cycle.appraisees.filter((row) => requestedIds.has(String(row.employeeId)))
      : cycle.appraisees;

    if (selected.length === 0) {
      throwError(400, "None of the selected employees are in this cycle's eligible-employees list");
    }

    const missingTemplate = selected.filter((row) => !row.appraisalTemplateId);
    if (missingTemplate.length > 0) {
      throwError(
        400,
        "Appraisal Template not found for some designations. Set a default Appraisal Template on the relevant Designations, or choose one directly for each employee.",
      );
    }

    const results = [];
    for (const row of selected) {
      try {
        const doc = await createAppraisalCore({ // eslint-disable-line no-await-in-loop
          cycle,
          employeeId: row.employeeId,
          appraisalTemplateIdOverride: row.appraisalTemplateId,
        });
        results.push({ employeeId: row.employeeId, success: true, appraisalId: doc._id });
      } catch (error) {
        if (error.code === "DUPLICATE_APPRAISAL") {
          results.push({ employeeId: row.employeeId, success: false, skipped: true, reason: error.message });
        } else {
          results.push({ employeeId: row.employeeId, success: false, error: error.message || "Could not create this appraisal" });
        }
      }
    }

    return res.status(200).json({ isOk: true, status: 200, data: { results } });
  } catch (error) { return failure(res, error); }
};

// ---- "Complete Cycle" action -------------------------------------------------
export const completeAppraisalCycle = async (req, res) => {
  try {
    const cycle = await AppraisalCycle.findById(req.params.id);
    if (!cycle) throwError(404, "Appraisal Cycle not found");
    if (cycle.status === "Completed") throwError(400, "Appraisal Cycle is already Completed");

    const draftCount = await Appraisal.countDocuments({ appraisalCycleId: cycle._id, status: "draft" });
    if (draftCount > 0) {
      throwError(
        400,
        `${draftCount} Appraisal(s) are not submitted yet. Please submit them before marking the cycle as Completed.`,
      );
    }

    cycle.status = "Completed";
    await cycle.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Appraisal Cycle marked Completed", data: cycle });
  } catch (error) { return failure(res, error); }
};

// ============================================================================
// 5. Appraisal
// ============================================================================

// employeeId/appraisalCycleId/appraisalTemplateId are create-only — set once
// at creation and never client-editable afterward (appraisalTemplateId is
// resolved from the cycle/Designation, and rateGoalsManually derives from
// it), so the update route gets its own, narrower allowlist.
export const APPRAISAL_CREATE_FIELDS = ["employeeId", "appraisalCycleId", "appraisalTemplateId"];
export const APPRAISAL_UPDATE_FIELDS = ["remarks", "reflections", "appraisalKra", "goals", "selfRatings"];

export const APPRAISAL_FILTERABLE = {
  employeeId: "objectId",
  companyId: "objectId",
  appraisalCycleId: "objectId",
  appraisalTemplateId: "objectId",
  status: "string",
  startDate: "date",
  endDate: "date",
  createdAt: "date",
};

const APPRAISAL_LOOKUP_STAGES = [
  { $lookup: { from: "employees", localField: "employeeId", foreignField: "_id", as: "employeeId_joined" } },
  { $addFields: { employeeIdLabel: { $arrayElemAt: ["$employeeId_joined.employeeName", 0] } } },
  { $project: { employeeId_joined: 0 } },
  { $lookup: { from: "companies", localField: "companyId", foreignField: "_id", as: "companyId_joined" } },
  { $addFields: { companyIdLabel: { $arrayElemAt: ["$companyId_joined.companyName", 0] } } },
  { $project: { companyId_joined: 0 } },
  { $lookup: { from: "appraisalcycles", localField: "appraisalCycleId", foreignField: "_id", as: "appraisalCycleId_joined" } },
  { $addFields: { appraisalCycleIdLabel: { $arrayElemAt: ["$appraisalCycleId_joined.cycleName", 0] } } },
  { $project: { appraisalCycleId_joined: 0 } },
  { $lookup: { from: "appraisaltemplates", localField: "appraisalTemplateId", foreignField: "_id", as: "appraisalTemplateId_joined" } },
  { $addFields: { appraisalTemplateIdLabel: { $arrayElemAt: ["$appraisalTemplateId_joined.templateTitle", 0] } } },
  { $project: { appraisalTemplateId_joined: 0 } },
];

export const createAppraisal = async (req, res) => {
  try {
    const { employeeId, appraisalCycleId, appraisalTemplateId } = req.body;
    if (!employeeId || !appraisalCycleId) throwError(400, "Employee and Appraisal Cycle are required");

    const cycle = await AppraisalCycle.findById(appraisalCycleId);
    if (!cycle) throwError(404, "Appraisal Cycle not found");

    const doc = await createAppraisalCore({ cycle, employeeId, appraisalTemplateIdOverride: appraisalTemplateId || null });
    return res.status(201).json({ isOk: true, status: 201, message: "Appraisal created successfully", data: doc });
  } catch (error) { return failure(res, error); }
};

export const listAppraisals = async (req, res) => {
  try {
    const data = await runListQuery(Appraisal, req.query, { filterable: APPRAISAL_FILTERABLE, stages: APPRAISAL_LOOKUP_STAGES });
    return res.status(200).json({ isOk: true, status: 200, data });
  } catch (error) { return failure(res, error); }
};

export const searchAppraisals = async (req, res) => {
  try {
    const data = await runListQuery(Appraisal, req.body, { filterable: APPRAISAL_FILTERABLE, stages: APPRAISAL_LOOKUP_STAGES });
    return res.status(200).json({ isOk: true, status: 200, data });
  } catch (error) { return failure(res, error); }
};

export const getAppraisalById = async (req, res) => {
  try {
    const doc = await Appraisal.findById(req.params.id)
      .populate("employeeId", "employeeName employeeCode")
      .populate("companyId", "companyName")
      .populate("appraisalCycleId", "cycleName kraEvaluationMethod calculateFinalScoreBasedOnFormula finalScoreFormula")
      .populate("appraisalTemplateId", "templateTitle")
      .populate("appraisalKra.kraId", "name")
      .populate("selfRatings.criteriaId", "criteria");
    if (!doc) throwError(404, "Appraisal not found");
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) { return failure(res, error); }
};

const sanitizeAppraisalKra = (rows = []) =>
  (Array.isArray(rows) ? rows : []).map((row) => ({
    kraId: row.kraId,
    weightage: Number(row.weightage) || 0,
    goalCompletion: 0,
    goalScore: 0,
  }));

const sanitizeAppraisalGoals = (rows = []) =>
  (Array.isArray(rows) ? rows : []).map((row) => ({
    label: row.label,
    weightage: Number(row.weightage) || 0,
    score: Number(row.score) || 0,
    scoreEarned: 0,
  }));

const sanitizeSelfRatings = (rows = []) =>
  (Array.isArray(rows) ? rows : []).map((row) => ({
    criteriaId: row.criteriaId,
    weightage: Number(row.weightage) || 0,
    rating: Math.min(Math.max(Number(row.rating) || 0, 0), 1),
  }));

export const updateAppraisal = async (req, res) => {
  try {
    const doc = await Appraisal.findById(req.params.id);
    if (!doc) throwError(404, "Appraisal not found");
    if (doc.status !== "draft") throwError(400, "Only draft Appraisal documents can be edited");

    const cycle = await AppraisalCycle.findById(doc.appraisalCycleId);
    if (cycle) assertCycleNotCompleted(cycle);

    if (doc.rateGoalsManually) {
      if (req.body.goals !== undefined) {
        const nextGoals = sanitizeAppraisalGoals(req.body.goals);
        validateWeightageSum(nextGoals);
        for (const [idx, row] of nextGoals.entries()) {
          if (row.score > 5) throwError(400, `Row ${idx + 1}: Goal Score cannot be greater than 5`);
        }
        doc.goals = nextGoals;
      }
    } else if (req.body.appraisalKra !== undefined) {
      const nextKra = sanitizeAppraisalKra(req.body.appraisalKra);
      validateWeightageSum(nextKra);
      // Preserve any already-computed goalCompletion/goalScore for rows whose
      // kraId is unchanged — only weightage/composition is client-editable.
      doc.appraisalKra = nextKra.map((row) => {
        const prior = doc.appraisalKra.find((p) => String(p.kraId) === String(row.kraId));
        return prior ? { ...row, goalCompletion: prior.goalCompletion, goalScore: prior.goalScore } : row;
      });
    }

    if (req.body.selfRatings !== undefined) {
      const nextSelfRatings = sanitizeSelfRatings(req.body.selfRatings);
      validateWeightageSum(nextSelfRatings);
      doc.selfRatings = nextSelfRatings;
    }

    if (req.body.remarks !== undefined) doc.remarks = req.body.remarks;
    if (req.body.reflections !== undefined) doc.reflections = req.body.reflections;

    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Appraisal updated successfully", data: doc });
  } catch (error) { return failure(res, error); }
};

export const submitAppraisal = async (req, res) => {
  try {
    const doc = await Appraisal.findById(req.params.id);
    if (!doc) throwError(404, "Appraisal not found");
    if (doc.status !== "draft") throwError(400, "Only draft Appraisal documents can be submitted");

    const cycle = await AppraisalCycle.findById(doc.appraisalCycleId).lean();
    if (!cycle) throwError(404, "Appraisal Cycle not found");
    if (cycle.status === "Completed") assertCycleNotCompleted(cycle);

    let goalScore;
    if (doc.rateGoalsManually) {
      validateWeightageSum(doc.goals);
      const { rows, totalScore } = calculateManualGoalScore(doc.goals);
      doc.goals = rows;
      goalScore = totalScore;
    } else {
      validateWeightageSum(doc.appraisalKra);
      // ADR-032 (transactional half, feat/performance-goals): real Goal
      // data, replacing the foundation half's honest `{}` placeholder.
      // Only TOP-LEVEL Goals tagged to this employee+cycle count — a child
      // goal's progress is already folded into its parent's own `progress`
      // via the parent-progress rollup (Goal.md), so including children too
      // would double-count the same completion into a KRA's average.
      // Archived goals are excluded, matching the rollup's own exclusion.
      const goalsByKra = await Goal.find({
        employeeId: doc.employeeId,
        appraisalCycleId: doc.appraisalCycleId,
        parentGoalId: null,
        status: { $ne: "Archived" },
      }).select("kraId progress").lean();
      const { rows, goalScorePercentage, totalScore } = calculateAutomatedGoalScore({
        appraisalKra: doc.appraisalKra,
        goalsByKra,
      });
      doc.appraisalKra = rows;
      doc.goalScorePercentage = goalScorePercentage;
      goalScore = totalScore;
    }
    doc.totalScore = goalScore;

    validateWeightageSum(doc.selfRatings);
    doc.selfScore = calculateSelfScore(doc.selfRatings);

    const employee = await Employee.findById(doc.employeeId).lean();
    // Merge order matches source's override precedence exactly: Cycle
    // fields first, Employee fields next (win over same-named Cycle
    // fields), then this Appraisal's own fields (win over both).
    const evalContext = {
      ...(cycle || {}),
      ...(employee || {}),
      totalScore: doc.totalScore,
      selfScore: doc.selfScore,
      avgFeedbackScore: doc.avgFeedbackScore,
      remarks: doc.remarks,
      reflections: doc.reflections,
    };

    doc.finalScore = calculateFinalScore({
      goalScore: doc.totalScore,
      selfScore: doc.selfScore,
      feedbackScore: doc.avgFeedbackScore,
      useFormula: Boolean(cycle.calculateFinalScoreBasedOnFormula),
      formula: cycle.finalScoreFormula,
      evalContext,
    });

    doc.status = "submitted";
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Appraisal submitted", data: doc });
  } catch (error) { return failure(res, error); }
};

export const cancelAppraisal = async (req, res) => {
  try {
    const doc = await Appraisal.findById(req.params.id);
    if (!doc) throwError(404, "Appraisal not found");
    if (doc.status !== "submitted") throwError(400, "Only submitted Appraisal documents can be cancelled");
    doc.status = "cancelled";
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Appraisal cancelled", data: doc });
  } catch (error) { return failure(res, error); }
};

export const deleteAppraisal = async (req, res) => {
  try {
    const doc = await Appraisal.findById(req.params.id);
    if (!doc) throwError(404, "Appraisal not found");
    if (doc.status === "submitted") throwError(400, "Submitted documents must be cancelled before deletion");
    doc.isDeleted = true;
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Appraisal deleted" });
  } catch (error) { return failure(res, error); }
};
