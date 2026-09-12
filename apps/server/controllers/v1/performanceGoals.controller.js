/**
 * ADR-032 (Performance, module 16, transactional half, feat/performance-goals).
 *
 * `Goal`: a tree-shaped, self-service CRUD doctype (SCOPES.OWN — an Employee
 * reads/writes only their own goal tree; HR User/HR Manager see all, same
 * per-action pattern as `payrollTax.controller.js`'s
 * `EmployeeTaxExemptionDeclaration`). Real, deliberate improvements over
 * source per ADR-032: a parent-cycle guard (rejects a `parentGoalId` that is
 * a descendant of the goal being saved, via `utils/goalTree.js`), and a
 * server-side bulk status-transition guard (source only checked this
 * client-side).
 *
 * `EmployeePerformanceFeedback`: a folded-docstatus (draft/submitted/
 * cancelled) doctype, no SCOPES.OWN — source grants Employee/HR Manager
 * broad create/read/write/submit/cancel (no `if_owner` restriction) and
 * HR User read-only; ported faithfully, matching `Employee Performance
 * Feedback.md`'s own permission table exactly rather than inventing a
 * scoping rule the spec/ADR-032 never asked for. Submitting or cancelling
 * one recomputes the target `Appraisal`'s `avgFeedbackScore`/`finalScore`.
 */
import Goal from "../../models/Goal.js";
import EmployeePerformanceFeedback from "../../models/EmployeePerformanceFeedback.js";
import Appraisal from "../../models/Appraisal.js";
import AppraisalCycle from "../../models/AppraisalCycle.js";
import Employee from "../../models/Employee.js";
import { runListQuery } from "../../utils/listQuery.js";
import { resolveRequestEmployee } from "../../utils/requestEmployee.js";
import { attendanceScope } from "../../utils/attendanceScope.js";
import { SCOPES } from "@demo-panel/shared/scopes";
import { assertCycleNotCompleted } from "./performance.controller.js";
import {
  validateWeightageSum,
  calculateSelfScore,
  calculateFinalScore,
  deriveGoalStatus,
  averageGoalProgress,
} from "../../utils/appraisalCalc.js";
import { wouldCreateCycle, buildChildrenByParent } from "../../utils/goalTree.js";

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
  console.error("Performance (Goal/Feedback) request failed", error);
  return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
};

const throwError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  throw error;
};

const assertActiveEmployee = (employee) => {
  if (!employee) throwError(404, "Employee not found");
  if (employee.status === "Inactive") {
    throwError(400, `Transactions cannot be created for an Inactive Employee ${employee.employeeName}`);
  }
};

// ============================================================================
// 1. Goal
// ============================================================================

// employeeId/isGroup/appraisalCycleId are set-only-once (immutable after
// first save, Goal.md's Port Notes) — excluded from the update allowlist so
// `allowOnlyFields` itself rejects any attempt to change them post-creation.
export const GOAL_CREATE_FIELDS = [
  "goalName", "isGroup", "parentGoalId", "progress", "employeeId",
  "startDate", "endDate", "appraisalCycleId", "kraId", "description",
];
export const GOAL_UPDATE_FIELDS = ["goalName", "parentGoalId", "progress", "startDate", "endDate", "kraId", "description"];

export const GOAL_FILTERABLE = {
  goalName: "string",
  employeeId: "objectId",
  companyId: "objectId",
  parentGoalId: "objectId",
  appraisalCycleId: "objectId",
  kraId: "objectId",
  status: "string",
  isGroup: "boolean",
  startDate: "date",
  endDate: "date",
  createdAt: "date",
};

const GOAL_LOOKUP_STAGES = [
  { $lookup: { from: "employees", localField: "employeeId", foreignField: "_id", as: "employeeId_joined" } },
  { $addFields: { employeeIdLabel: { $arrayElemAt: ["$employeeId_joined.employeeName", 0] } } },
  { $project: { employeeId_joined: 0 } },
  { $lookup: { from: "goals", localField: "parentGoalId", foreignField: "_id", as: "parentGoalId_joined" } },
  { $addFields: { parentGoalIdLabel: { $arrayElemAt: ["$parentGoalId_joined.goalName", 0] } } },
  { $project: { parentGoalId_joined: 0 } },
  { $lookup: { from: "appraisalcycles", localField: "appraisalCycleId", foreignField: "_id", as: "appraisalCycleId_joined" } },
  { $addFields: { appraisalCycleIdLabel: { $arrayElemAt: ["$appraisalCycleId_joined.cycleName", 0] } } },
  { $project: { appraisalCycleId_joined: 0 } },
  { $lookup: { from: "kras", localField: "kraId", foreignField: "_id", as: "kraId_joined" } },
  { $addFields: { kraIdLabel: { $arrayElemAt: ["$kraId_joined.name", 0] } } },
  { $project: { kraId_joined: 0 } },
];

// Recomputes a parent Goal's progress from the average of its own non-
// Archived direct children, sets its (possibly still-derived) status, saves
// it, and recurses further up the chain — Goal.md's `update_parent_progress`
// + the recursive "bubbles all the way to the root" behavior that calling
// `.save()` on the parent triggers in source. Bounded by tree depth, which
// the cycle-guard below already keeps finite.
const recomputeParentProgress = async (parentGoalId) => {
  if (!parentGoalId) return;
  const parent = await Goal.findById(parentGoalId);
  if (!parent) return;

  const children = await Goal.find({ parentGoalId, status: { $ne: "Archived" } }).select("progress").lean();
  parent.progress = averageGoalProgress(children.map((c) => c.progress));
  parent.status = deriveGoalStatus({ progress: parent.progress, currentStatus: parent.status });
  await parent.save();

  await recomputeParentProgress(parent.parentGoalId);
};

// Propagates a changed KRA from a group goal down to its direct children —
// Goal.md's `update_kra_in_child_goals`: a raw bulk update, no per-row
// validate/cascade (matching source exactly).
const propagateKraToChildren = async (goalId, kraId) => {
  await Goal.updateMany({ parentGoalId: goalId }, { $set: { kraId } });
};

const assertNoParentCycle = async (candidateParentId, selfId) => {
  if (!candidateParentId) return;
  // Only this employee's goals can ever appear in self's descendant chain
  // (validate_parent_fields already requires every child to share the same
  // employee as its parent), so scoping the tree read this way is safe and
  // keeps it small.
  const self = await Goal.findById(selfId).select("employeeId").lean();
  const employeeId = self ? self.employeeId : undefined;
  const rows = employeeId
    ? await Goal.find({ employeeId }).select("_id parentGoalId").lean()
    : [];
  const childrenByParent = buildChildrenByParent(rows);
  if (wouldCreateCycle(candidateParentId, selfId, childrenByParent)) {
    throwError(400, "A goal cannot be assigned a parent that is one of its own descendants — this would create an infinite loop.");
  }
};

export const createGoal = async (req, res) => {
  try {
    const { goalName, parentGoalId, appraisalCycleId } = req.body;
    if (!goalName) throwError(400, "Goal Name is required");

    let employeeId = req.body.employeeId;
    if (req.user?.dataScope === SCOPES.OWN) {
      const ownEmp = await resolveRequestEmployee(req);
      if (!ownEmp) throwError(403, "No employee record linked to this user");
      employeeId = ownEmp._id;
    } else if (!employeeId) {
      throwError(400, "Employee is required");
    }

    const employee = await Employee.findById(employeeId).lean();
    assertActiveEmployee(employee);

    const isGroup = Boolean(req.body.isGroup);
    let kraId = req.body.kraId || null;
    let resolvedCycleId = appraisalCycleId || null;
    let startDate = req.body.startDate ? new Date(req.body.startDate) : null;
    let endDate = req.body.endDate ? new Date(req.body.endDate) : null;

    let parent = null;
    if (parentGoalId) {
      parent = await Goal.findById(parentGoalId);
      if (parent) {
        if (String(parent.employeeId) !== String(employeeId)) {
          throwError(400, "Goal should be owned by the same employee as its parent goal.");
        }
        // kraId/appraisalCycleId are fetched from (locked to) the parent
        // once one is chosen — not independently supplied (Goal.md: both
        // fields are `read_only_depends_on: doc.parent_goal`).
        kraId = parent.kraId || null;
        resolvedCycleId = parent.appraisalCycleId || null;
      }
      // If the parent doesn't exist (race condition), Goal.md says to skip
      // this validation rather than error — the dangling ref itself is not
      // this endpoint's problem to solve.
    } else {
      // Top-level: kraId is required only when tagged to a cycle.
      if (resolvedCycleId && !kraId) {
        throwError(400, "KRA is required for a top-level goal that is tagged to an Appraisal Cycle");
      }
    }

    if (resolvedCycleId) {
      const cycle = await AppraisalCycle.findById(resolvedCycleId);
      if (!cycle) throwError(404, "Appraisal Cycle not found");
      assertCycleNotCompleted(cycle);
      if (!startDate) startDate = cycle.startDate;
      if (!endDate) endDate = cycle.endDate;
    }
    if (!startDate) throwError(400, "Start Date is required");
    if (endDate && startDate && endDate < startDate) throwError(400, "End Date cannot be before Start Date");

    const progress = isGroup ? 0 : Math.min(Math.max(Number(req.body.progress) || 0, 0), 100);
    const status = deriveGoalStatus({ progress, currentStatus: "Pending" });

    const doc = await Goal.create({
      goalName,
      isGroup,
      parentGoalId: parentGoalId || null,
      progress,
      status,
      employeeId,
      companyId: employee.companyId,
      startDate,
      endDate,
      appraisalCycleId: resolvedCycleId,
      kraId,
      description: req.body.description || "",
    });

    await recomputeParentProgress(doc.parentGoalId);

    return res.status(201).json({ isOk: true, status: 201, message: "Goal created successfully", data: doc });
  } catch (error) { return failure(res, error); }
};

export const listGoals = async (req, res) => {
  try {
    const scopeFilter = await attendanceScope(req, true);
    const data = await runListQuery(Goal, req.query, { scopeFilter, filterable: GOAL_FILTERABLE, stages: GOAL_LOOKUP_STAGES });
    return res.status(200).json({ isOk: true, status: 200, data });
  } catch (error) { return failure(res, error); }
};

export const searchGoals = async (req, res) => {
  try {
    const scopeFilter = await attendanceScope(req, true);
    const data = await runListQuery(Goal, req.body, {
      scopeFilter,
      searchFields: ["goalName"],
      filterable: GOAL_FILTERABLE,
      stages: GOAL_LOOKUP_STAGES,
    });
    return res.status(200).json({ isOk: true, status: 200, data });
  } catch (error) { return failure(res, error); }
};

const assertOwnAccess = async (req, doc) => {
  if (req.user?.dataScope === SCOPES.OWN) {
    const ownEmp = await resolveRequestEmployee(req);
    // getGoalById's `doc` has `employeeId` populated (a whole Employee
    // document), while every other call site here loads Goal unpopulated
    // (a raw ObjectId) — extract `._id` when it's the former so this one
    // helper is correct for both, matching payrollTax.controller.js's own
    // `doc.employeeId?._id || doc.employeeId` idiom.
    const ownerId = doc.employeeId?._id || doc.employeeId;
    if (!ownEmp || String(ownerId) !== String(ownEmp._id)) {
      throwError(403, "Access denied");
    }
  }
};

export const getGoalById = async (req, res) => {
  try {
    const doc = await Goal.findById(req.params.id)
      .populate("employeeId", "employeeName employeeCode")
      .populate("companyId", "companyName")
      .populate("parentGoalId", "goalName")
      .populate("appraisalCycleId", "cycleName")
      .populate("kraId", "name");
    if (!doc) throwError(404, "Goal not found");
    await assertOwnAccess(req, doc);
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) { return failure(res, error); }
};

export const updateGoal = async (req, res) => {
  try {
    const doc = await Goal.findById(req.params.id);
    if (!doc) throwError(404, "Goal not found");
    await assertOwnAccess(req, doc);

    const previousParentId = doc.parentGoalId;
    const previousKraId = doc.kraId;

    const nextParentId = req.body.parentGoalId !== undefined ? (req.body.parentGoalId || null) : doc.parentGoalId;
    if (String(nextParentId || "") !== String(doc.parentGoalId || "")) {
      await assertNoParentCycle(nextParentId, doc._id);
    }

    let kraId = req.body.kraId !== undefined ? (req.body.kraId || null) : doc.kraId;
    let appraisalCycleId = doc.appraisalCycleId; // immutable after first save, regardless of parent

    let parent = null;
    if (nextParentId) {
      parent = await Goal.findById(nextParentId);
      if (parent) {
        if (String(parent.employeeId) !== String(doc.employeeId)) {
          throwError(400, "Goal should be owned by the same employee as its parent goal.");
        }
        // Locked/inherited from the parent once one is chosen.
        kraId = parent.kraId || null;
      }
    } else if (appraisalCycleId && !kraId) {
      throwError(400, "KRA is required for a top-level goal that is tagged to an Appraisal Cycle");
    }

    if (appraisalCycleId) {
      const cycle = await AppraisalCycle.findById(appraisalCycleId);
      if (cycle) assertCycleNotCompleted(cycle);
    }

    const nextStart = req.body.startDate !== undefined ? new Date(req.body.startDate) : doc.startDate;
    const nextEnd = req.body.endDate !== undefined ? (req.body.endDate ? new Date(req.body.endDate) : null) : doc.endDate;
    if (nextEnd && nextStart && nextEnd < nextStart) throwError(400, "End Date cannot be before Start Date");

    if (req.body.goalName !== undefined) doc.goalName = req.body.goalName;
    doc.parentGoalId = nextParentId;
    doc.kraId = kraId;
    doc.startDate = nextStart;
    doc.endDate = nextEnd;
    if (req.body.description !== undefined) doc.description = req.body.description;

    // progress is read-only whenever isGroup or status is already Closed —
    // a client-supplied value is silently ignored in either case (matching
    // source's read_only_depends_on field, not a hard reject).
    if (req.body.progress !== undefined && !doc.isGroup && doc.status !== "Closed") {
      doc.progress = Math.min(Math.max(Number(req.body.progress) || 0, 0), 100);
    }
    doc.status = deriveGoalStatus({ progress: doc.progress, currentStatus: doc.status });

    await doc.save();

    if (doc.isGroup && String(previousKraId || "") !== String(doc.kraId || "")) {
      await propagateKraToChildren(doc._id, doc.kraId);
    }
    if (String(previousParentId || "") !== String(doc.parentGoalId || "")) {
      await recomputeParentProgress(previousParentId);
    }
    await recomputeParentProgress(doc.parentGoalId);

    return res.status(200).json({ isOk: true, status: 200, message: "Goal updated successfully", data: doc });
  } catch (error) { return failure(res, error); }
};

// ---- Explicit, guarded state-transition actions (archive/unarchive/close/reopen) -----
// Each is a real transition, not a raw status PATCH — matching Goal.md's
// dedicated form-button actions (as distinct from the bulk list-view action
// below, which has its own stricter eligible-source-status matrix).
const runGoalAction = async (req, res, { requireStatus, nextStatus, forceProgress, message }) => {
  try {
    const doc = await Goal.findById(req.params.id);
    if (!doc) throwError(404, "Goal not found");
    await assertOwnAccess(req, doc);
    if (requireStatus && !requireStatus.includes(doc.status)) {
      throwError(400, `Cannot ${message.toLowerCase()} a Goal with status "${doc.status}"`);
    }
    const previousParentId = doc.parentGoalId;
    if (forceProgress !== undefined) doc.progress = forceProgress;
    doc.status = nextStatus === "" ? deriveGoalStatus({ progress: doc.progress, currentStatus: "" }) : nextStatus;
    await doc.save();
    await recomputeParentProgress(doc.parentGoalId);
    if (String(previousParentId || "") !== String(doc.parentGoalId || "")) await recomputeParentProgress(previousParentId);
    return res.status(200).json({ isOk: true, status: 200, message: `Goal ${message}`, data: doc });
  } catch (error) { return failure(res, error); }
};

export const archiveGoal = (req, res) => runGoalAction(req, res, {
  requireStatus: ["Pending", "In Progress", "Completed"],
  nextStatus: "Archived",
  message: "archived",
});
export const unarchiveGoal = (req, res) => runGoalAction(req, res, {
  requireStatus: ["Archived"],
  nextStatus: "",
  message: "unarchived",
});
export const closeGoal = (req, res) => runGoalAction(req, res, {
  requireStatus: ["Pending", "In Progress", "Completed", "Archived"],
  nextStatus: "Closed",
  message: "closed",
});
export const reopenGoal = (req, res) => runGoalAction(req, res, {
  requireStatus: ["Closed"],
  nextStatus: "",
  message: "reopened",
});

// ---- Bulk status update (list-view action) — server-side transition guard ----
// Goal.md's exact eligible-source-status matrix (source only enforced this
// client-side in goal_list.js — ADR-032's deliberate improvement is doing it
// here too). Group goals are always excluded, matching the client-side
// filter. Per-row try/catch isolation, same pattern as
// `performance.controller.js`'s `createAppraisalsForCycle`.
const BULK_ELIGIBLE_SOURCES = {
  Completed: ["Pending", "In Progress"],
  Archived: ["Pending", "In Progress", "Closed"],
  Closed: ["Pending", "In Progress", "Archived"],
  Unarchived: ["Archived"],
  Reopened: ["Closed"],
};

export const bulkUpdateGoalStatus = async (req, res) => {
  try {
    const { status, goals } = req.body;
    if (!BULK_ELIGIBLE_SOURCES[status]) {
      throwError(400, `Unsupported bulk status "${status}". Must be one of ${Object.keys(BULK_ELIGIBLE_SOURCES).join(", ")}`);
    }
    const goalIds = Array.isArray(goals) ? goals : [];
    if (goalIds.length === 0) throwError(400, "No goals specified");

    const results = [];
    for (const goalId of goalIds) {
      try {
        const doc = await Goal.findById(goalId); // eslint-disable-line no-await-in-loop
        if (!doc) { results.push({ goalId, success: false, reason: "Goal not found" }); continue; }
        await assertOwnAccess(req, doc); // eslint-disable-line no-await-in-loop
        if (doc.isGroup) { results.push({ goalId, success: false, reason: "Group goals cannot be bulk-updated" }); continue; }
        if (!BULK_ELIGIBLE_SOURCES[status].includes(doc.status)) {
          results.push({ goalId, success: false, reason: `Cannot move a "${doc.status}" goal to "${status}"` });
          continue;
        }

        const previousParentId = doc.parentGoalId;
        if (status === "Completed") {
          doc.status = "Completed";
          doc.progress = 100;
        } else if (status === "Archived" || status === "Closed") {
          doc.status = status;
        } else {
          // Unarchived / Reopened both mean: clear the sticky status and
          // let it recompute from progress, matching source's status="".
          doc.status = deriveGoalStatus({ progress: doc.progress, currentStatus: "" });
        }
        await doc.save(); // eslint-disable-line no-await-in-loop
        await recomputeParentProgress(doc.parentGoalId); // eslint-disable-line no-await-in-loop
        if (String(previousParentId || "") !== String(doc.parentGoalId || "")) {
          await recomputeParentProgress(previousParentId); // eslint-disable-line no-await-in-loop
        }
        results.push({ goalId, success: true });
      } catch (error) {
        results.push({ goalId, success: false, reason: error.message || "Could not update this goal" });
      }
    }

    return res.status(200).json({ isOk: true, status: 200, data: { results } });
  } catch (error) { return failure(res, error); }
};

export const deleteGoal = async (req, res) => {
  try {
    const doc = await Goal.findById(req.params.id);
    if (!doc) throwError(404, "Goal not found");
    await assertOwnAccess(req, doc);
    const childCount = await Goal.countDocuments({ parentGoalId: doc._id });
    if (childCount > 0) throwError(409, "Cannot delete a Goal that has child Goals — delete or re-parent them first");

    const parentGoalId = doc.parentGoalId;
    doc.isDeleted = true;
    await doc.save();
    await recomputeParentProgress(parentGoalId);
    return res.status(200).json({ isOk: true, status: 200, message: "Goal deleted successfully" });
  } catch (error) { return failure(res, error); }
};

// ============================================================================
// 2. Employee Performance Feedback
// ============================================================================

export const EMPLOYEE_PERFORMANCE_FEEDBACK_CREATE_FIELDS = [
  "employeeId", "reviewerId", "addedOn", "appraisalId", "feedbackRatings", "feedback",
];
export const EMPLOYEE_PERFORMANCE_FEEDBACK_UPDATE_FIELDS = ["feedbackRatings", "feedback"];

export const EMPLOYEE_PERFORMANCE_FEEDBACK_FILTERABLE = {
  employeeId: "objectId",
  companyId: "objectId",
  reviewerId: "objectId",
  appraisalCycleId: "objectId",
  appraisalId: "objectId",
  status: "string",
  totalScore: "number",
  createdAt: "date",
};

const FEEDBACK_LOOKUP_STAGES = [
  { $lookup: { from: "employees", localField: "employeeId", foreignField: "_id", as: "employeeId_joined" } },
  { $addFields: { employeeIdLabel: { $arrayElemAt: ["$employeeId_joined.employeeName", 0] } } },
  { $project: { employeeId_joined: 0 } },
  { $lookup: { from: "employees", localField: "reviewerId", foreignField: "_id", as: "reviewerId_joined" } },
  { $addFields: { reviewerIdLabel: { $arrayElemAt: ["$reviewerId_joined.employeeName", 0] } } },
  { $project: { reviewerId_joined: 0 } },
  { $lookup: { from: "appraisalcycles", localField: "appraisalCycleId", foreignField: "_id", as: "appraisalCycleId_joined" } },
  { $addFields: { appraisalCycleIdLabel: { $arrayElemAt: ["$appraisalCycleId_joined.cycleName", 0] } } },
  { $project: { appraisalCycleId_joined: 0 } },
];

const sanitizeFeedbackRatings = (rows = []) =>
  (Array.isArray(rows) ? rows : []).map((row) => ({
    criteriaId: row.criteriaId,
    weightage: Number(row.weightage) || 0,
    rating: Math.min(Math.max(Number(row.rating) || 0, 0), 1),
  }));

// Goal.md's `_Module-Spec.md`-shared invariant, reused here too (Employee
// Performance Feedback.md, Validation Rule 1) — the cycle a feedback row is
// tagged to (fetched from its Appraisal) must not be Completed.
const assertFeedbackCycleNotCompleted = async (appraisalCycleId) => {
  if (!appraisalCycleId) return;
  const cycle = await AppraisalCycle.findById(appraisalCycleId);
  if (cycle) assertCycleNotCompleted(cycle);
};

// Employee Performance Feedback.md's `update_avg_feedback_score_in_appraisal`
// + Appraisal.md's `calculate_avg_feedback_score` — called from both submit
// and cancel. Recomputes the target Appraisal's avgFeedbackScore as the
// plain average of totalScore across every currently-submitted feedback row
// for that employee+appraisal, then re-runs calculateFinalScore using the
// Appraisal's already-stored totalScore/selfScore, and saves both back.
export const recomputeAppraisalFeedbackScore = async (appraisalId) => {
  const appraisal = await Appraisal.findById(appraisalId);
  if (!appraisal) return;

  const submitted = await EmployeePerformanceFeedback.find({ appraisalId, status: "submitted" }).select("totalScore").lean();
  const avgFeedbackScore = submitted.length
    ? Math.round((submitted.reduce((sum, row) => sum + (Number(row.totalScore) || 0), 0) / submitted.length + Number.EPSILON) * 100) / 100
    : 0;

  const cycle = await AppraisalCycle.findById(appraisal.appraisalCycleId).lean();
  const employee = await Employee.findById(appraisal.employeeId).lean();
  const evalContext = {
    ...(cycle || {}),
    ...(employee || {}),
    totalScore: appraisal.totalScore,
    selfScore: appraisal.selfScore,
    avgFeedbackScore,
    remarks: appraisal.remarks,
    reflections: appraisal.reflections,
  };

  appraisal.avgFeedbackScore = avgFeedbackScore;
  appraisal.finalScore = calculateFinalScore({
    goalScore: appraisal.totalScore,
    selfScore: appraisal.selfScore,
    feedbackScore: avgFeedbackScore,
    useFormula: Boolean(cycle?.calculateFinalScoreBasedOnFormula),
    formula: cycle?.finalScoreFormula,
    evalContext,
  });
  await appraisal.save();
};

export const createEmployeePerformanceFeedback = async (req, res) => {
  try {
    const { employeeId, reviewerId, appraisalId, feedback } = req.body;
    if (!employeeId) throwError(400, "Employee is required");
    if (!reviewerId) throwError(400, "Reviewer is required");
    if (!appraisalId) throwError(400, "Appraisal is required");
    if (!feedback) throwError(400, "Feedback is required");
    if (String(employeeId) === String(reviewerId)) {
      throwError(400, "Employees cannot give feedback to themselves. Use Self Appraisal on the Appraisal record instead.");
    }

    const employee = await Employee.findById(employeeId).lean();
    assertActiveEmployee(employee);
    const reviewer = await Employee.findById(reviewerId).lean();
    assertActiveEmployee(reviewer);

    const appraisal = await Appraisal.findById(appraisalId).lean();
    if (!appraisal) throwError(404, "Appraisal not found");
    if (String(appraisal.employeeId) !== String(employeeId)) {
      throwError(400, `Appraisal ${appraisalId} does not belong to Employee ${employeeId}`);
    }

    await assertFeedbackCycleNotCompleted(appraisal.appraisalCycleId);

    const feedbackRatings = sanitizeFeedbackRatings(req.body.feedbackRatings);
    validateWeightageSum(feedbackRatings);
    const totalScore = calculateSelfScore(feedbackRatings);

    const doc = await EmployeePerformanceFeedback.create({
      employeeId,
      companyId: employee.companyId,
      reviewerId,
      addedOn: req.body.addedOn ? new Date(req.body.addedOn) : new Date(),
      appraisalCycleId: appraisal.appraisalCycleId,
      appraisalId,
      feedbackRatings,
      totalScore,
      feedback,
      status: "draft",
    });

    return res.status(201).json({ isOk: true, status: 201, message: "Employee Performance Feedback created successfully", data: doc });
  } catch (error) { return failure(res, error); }
};

export const listEmployeePerformanceFeedbacks = async (req, res) => {
  try {
    const data = await runListQuery(EmployeePerformanceFeedback, req.query, {
      filterable: EMPLOYEE_PERFORMANCE_FEEDBACK_FILTERABLE,
      stages: FEEDBACK_LOOKUP_STAGES,
    });
    return res.status(200).json({ isOk: true, status: 200, data });
  } catch (error) { return failure(res, error); }
};

export const searchEmployeePerformanceFeedbacks = async (req, res) => {
  try {
    const data = await runListQuery(EmployeePerformanceFeedback, req.body, {
      searchFields: ["feedback"],
      filterable: EMPLOYEE_PERFORMANCE_FEEDBACK_FILTERABLE,
      stages: FEEDBACK_LOOKUP_STAGES,
    });
    return res.status(200).json({ isOk: true, status: 200, data });
  } catch (error) { return failure(res, error); }
};

export const getEmployeePerformanceFeedbackById = async (req, res) => {
  try {
    const doc = await EmployeePerformanceFeedback.findById(req.params.id)
      .populate("employeeId", "employeeName employeeCode")
      .populate("reviewerId", "employeeName employeeCode")
      .populate("companyId", "companyName")
      .populate("appraisalCycleId", "cycleName")
      .populate("appraisalId", "employeeId status")
      .populate("feedbackRatings.criteriaId", "criteria");
    if (!doc) throwError(404, "Employee Performance Feedback not found");
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) { return failure(res, error); }
};

export const updateEmployeePerformanceFeedback = async (req, res) => {
  try {
    const doc = await EmployeePerformanceFeedback.findById(req.params.id);
    if (!doc) throwError(404, "Employee Performance Feedback not found");
    if (doc.status !== "draft") throwError(400, "Only draft feedback can be updated");

    await assertFeedbackCycleNotCompleted(doc.appraisalCycleId);

    if (req.body.feedbackRatings !== undefined) {
      const feedbackRatings = sanitizeFeedbackRatings(req.body.feedbackRatings);
      validateWeightageSum(feedbackRatings);
      doc.feedbackRatings = feedbackRatings;
      doc.totalScore = calculateSelfScore(feedbackRatings);
    }
    if (req.body.feedback !== undefined) doc.feedback = req.body.feedback;

    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Employee Performance Feedback updated successfully", data: doc });
  } catch (error) { return failure(res, error); }
};

export const submitEmployeePerformanceFeedback = async (req, res) => {
  try {
    const doc = await EmployeePerformanceFeedback.findById(req.params.id);
    if (!doc) throwError(404, "Employee Performance Feedback not found");
    if (doc.status !== "draft") throwError(400, "Only draft feedback can be submitted");

    await assertFeedbackCycleNotCompleted(doc.appraisalCycleId);

    validateWeightageSum(doc.feedbackRatings);
    doc.totalScore = calculateSelfScore(doc.feedbackRatings);
    doc.status = "submitted";
    await doc.save();

    await recomputeAppraisalFeedbackScore(doc.appraisalId);

    return res.status(200).json({ isOk: true, status: 200, message: "Employee Performance Feedback submitted", data: doc });
  } catch (error) { return failure(res, error); }
};

export const cancelEmployeePerformanceFeedback = async (req, res) => {
  try {
    const doc = await EmployeePerformanceFeedback.findById(req.params.id);
    if (!doc) throwError(404, "Employee Performance Feedback not found");
    if (doc.status !== "submitted") throwError(400, "Only submitted feedback can be cancelled");

    doc.status = "cancelled";
    await doc.save();

    await recomputeAppraisalFeedbackScore(doc.appraisalId);

    return res.status(200).json({ isOk: true, status: 200, message: "Employee Performance Feedback cancelled", data: doc });
  } catch (error) { return failure(res, error); }
};

export const deleteEmployeePerformanceFeedback = async (req, res) => {
  try {
    const doc = await EmployeePerformanceFeedback.findById(req.params.id);
    if (!doc) throwError(404, "Employee Performance Feedback not found");
    if (doc.status === "submitted") throwError(400, "Submitted documents must be cancelled before deletion");
    doc.isDeleted = true;
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Employee Performance Feedback deleted" });
  } catch (error) { return failure(res, error); }
};
