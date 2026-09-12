import mongoose from "mongoose";
import { FeedbackRatingSchema } from "./AppraisalTemplate.js";

/**
 * ADR-032 (Performance, module 16, transactional half). A single reviewer's
 * feedback on an employee for a specific `Appraisal`, rated against the
 * Appraisal's template criteria. Submitting one contributes to the target
 * Appraisal's `avgFeedbackScore`/`finalScore` (both directions — submit AND
 * cancel recompute, see `performanceGoals.controller.js`'s
 * `recomputeAppraisalFeedbackScore`).
 *
 * Folded-docstatus (ADR-016 shape, matching `Appraisal`): plain
 * `status: draft|submitted|cancelled`, no naming series, no `amendedFrom`
 * chain — source's `Employee Performance Feedback` is submittable but this
 * project drops the amendment chain the same way `Appraisal` already did.
 *
 * `feedbackRatings` embeds the exact same shared `FeedbackRatingSchema` as
 * `AppraisalTemplate.ratingCriteria`/`Appraisal.selfRatings` (ADR-032) —
 * imported, not redefined. `totalScore`'s formula
 * (`Σ(rating * NUMBER_OF_STARS * weightage/100)`) is byte-for-byte the same
 * as `Appraisal`'s self-score formula (confirmed against the real spec,
 * `Employee Performance Feedback.md`'s `set_total_score()` — its hardcoded
 * `5` is exactly `NUMBER_OF_STARS`), so the controller reuses
 * `calculateSelfScore` directly rather than a second copy of the same math.
 */
const EmployeePerformanceFeedbackSchema = new mongoose.Schema(
  {
    // The reviewee.
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    // The reviewer — must differ from employeeId (validated in the
    // controller: self-appraisal has its own dedicated mechanism, the
    // Appraisal's own selfRatings, not this doctype).
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    addedOn: { type: Date, default: Date.now },
    // Fetched from appraisalId at creation and kept in step with it — not
    // independently client-settable (matching source's read-only fetch_from).
    appraisalCycleId: { type: mongoose.Schema.Types.ObjectId, ref: "AppraisalCycle", default: null },
    appraisalId: { type: mongoose.Schema.Types.ObjectId, ref: "Appraisal", required: true },
    feedbackRatings: { type: [FeedbackRatingSchema], default: [] },
    totalScore: { type: Number, default: 0 },
    feedback: { type: String, required: true },
    status: { type: String, enum: ["draft", "submitted", "cancelled"], default: "draft", required: true },
  },
  { timestamps: true },
);

EmployeePerformanceFeedbackSchema.index({ employeeId: 1 });
EmployeePerformanceFeedbackSchema.index({ companyId: 1 });
EmployeePerformanceFeedbackSchema.index({ reviewerId: 1 });
EmployeePerformanceFeedbackSchema.index({ appraisalCycleId: 1 });
EmployeePerformanceFeedbackSchema.index({ appraisalId: 1 });
EmployeePerformanceFeedbackSchema.index({ status: 1 });
EmployeePerformanceFeedbackSchema.index({ createdAt: -1 });

export default mongoose.model("EmployeePerformanceFeedback", EmployeePerformanceFeedbackSchema);
