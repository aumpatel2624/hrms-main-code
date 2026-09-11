import mongoose from "mongoose";

/**
 * ADR-032 (Performance, module 16, foundation half). Plain CRUD master —
 * a named list of feedback/rating criteria (e.g. "Communication", "Teamwork")
 * referenced by `FeedbackRatingSchema` rows (`AppraisalTemplate.ratingCriteria`,
 * `Appraisal.selfRatings`, and — second branch, not built here —
 * `EmployeePerformanceFeedback.feedbackRatings`). Source names this field
 * `criteria` (both the label and the document's natural name, per
 * `field:criteria` naming) — this project keeps that same field name rather
 * than adding a redundant separate `name` field.
 */
const EmployeeFeedbackCriteriaSchema = new mongoose.Schema(
  {
    criteria: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

EmployeeFeedbackCriteriaSchema.index({ criteria: 1 }, { unique: true });
EmployeeFeedbackCriteriaSchema.index({ createdAt: -1 });

export default mongoose.model("EmployeeFeedbackCriteria", EmployeeFeedbackCriteriaSchema);
