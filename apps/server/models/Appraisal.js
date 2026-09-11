import mongoose from "mongoose";
import { FeedbackRatingSchema } from "./AppraisalTemplate.js";

/**
 * ADR-032 (Performance, module 16, foundation half). Child row of
 * `Appraisal.appraisalKra` — used when `rateGoalsManually` is false
 * ("Automated Based on Goal Progress" mode, the default). `goalCompletion`/
 * `goalScore` are derived/cached values (a materialized aggregate of
 * `Goal.progress`, second branch, not built here) recomputed at submit time
 * via `utils/appraisalCalc.js`'s `calculateAutomatedGoalScore` — never
 * client-trusted. Until `Goal` exists, these stay 0 (no goals to average
 * yet); the second branch retrofits real data in.
 */
const AppraisalKraSchema = new mongoose.Schema(
  {
    kraId: { type: mongoose.Schema.Types.ObjectId, ref: "KRA", required: true },
    weightage: { type: Number, required: true, min: 0 },
    goalCompletion: { type: Number, default: 0, min: 0 },
    goalScore: { type: Number, default: 0, min: 0 },
  },
  { _id: true },
);

/**
 * Child row of `Appraisal.goals` — used when `rateGoalsManually` is true
 * ("Manual Rating" mode). `label` is free text (NOT a KRA ref, per
 * ADR-032 — source's own `kra` fieldname here is confirmed free text,
 * genuinely distinct from `AppraisalKra.kraId`'s real reference), seeded
 * at creation from the KRA *name* the template's KRA-ref row pointed at
 * (a genuine translation step — see `performance.controller.js`'s
 * `buildAppraisalRowsFromTemplate`). `score` is capped at `NUMBER_OF_STARS`
 * (server-enforced at submit, matching source's `calculate_total_score`
 * guard) and `scoreEarned` is computed (`score * weightage / 100`).
 */
const AppraisalGoalSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    weightage: { type: Number, required: true, min: 0 },
    score: { type: Number, default: 0, min: 0 },
    scoreEarned: { type: Number, default: 0, min: 0 },
  },
  { _id: true },
);

/**
 * The per-employee, per-cycle folded-docstatus record (draft/submitted/
 * cancelled — the standard ADR-016 shape) aggregating KRA/goal scores,
 * self-appraisal score, average peer feedback score (stays 0 in this half —
 * `EmployeePerformanceFeedback` is the second branch), and a computed final
 * score.
 *
 * `startDate`/`endDate` default from the linked `AppraisalCycle`'s own dates
 * at creation time — a real gap in source (Port Notes: no code path was
 * found that ever populates these) closed here rather than left blank.
 *
 * `rateGoalsManually` is set once at creation from the cycle's
 * `kraEvaluationMethod` and is never client-editable afterward — it decides
 * which of `appraisalKra`/`goals` is the active table for the rest of this
 * document's life.
 */
const AppraisalSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    appraisalCycleId: { type: mongoose.Schema.Types.ObjectId, ref: "AppraisalCycle", required: true },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    appraisalTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: "AppraisalTemplate", required: true },
    rateGoalsManually: { type: Boolean, default: false },
    appraisalKra: { type: [AppraisalKraSchema], default: [] },
    goals: { type: [AppraisalGoalSchema], default: [] },
    goalScorePercentage: { type: Number, default: 0 },
    selfRatings: { type: [FeedbackRatingSchema], default: [] },
    selfScore: { type: Number, default: 0 },
    remarks: { type: String, default: "" },
    reflections: { type: String, default: "" },
    totalScore: { type: Number, default: 0 },
    // Stays 0 through this half — EmployeePerformanceFeedback (second
    // branch) is what ever writes a non-zero value here.
    avgFeedbackScore: { type: Number, default: 0 },
    finalScore: { type: Number, default: 0 },
    status: { type: String, enum: ["draft", "submitted", "cancelled"], default: "draft", required: true },
  },
  { timestamps: true },
);

AppraisalSchema.index({ employeeId: 1 });
AppraisalSchema.index({ companyId: 1 });
AppraisalSchema.index({ appraisalCycleId: 1 });
AppraisalSchema.index({ appraisalTemplateId: 1 });
AppraisalSchema.index({ status: 1 });
AppraisalSchema.index({ startDate: 1 });
AppraisalSchema.index({ endDate: 1 });
AppraisalSchema.index({ createdAt: -1 });
// Foundation-half duplicate guard is one employee/one cycle (ADR-032 scopes
// down source's fuller "or overlapping date range" invariant for the bulk
// create-appraisals action) — this partial index enforces it at the DB
// layer too, not just in the controller's pre-check.
AppraisalSchema.index(
  { employeeId: 1, appraisalCycleId: 1 },
  { unique: true, partialFilterExpression: { status: { $ne: "cancelled" } } },
);

export default mongoose.model("Appraisal", AppraisalSchema);
