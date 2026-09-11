import mongoose from "mongoose";

/**
 * ADR-032 (Performance, module 16, foundation half). Shared embedded schema
 * — same reuse-by-import pattern as `SalaryStructure.js`'s
 * `EmployeeBenefitDetailSchema` (ADR-029): one shape, three parent contexts
 * (`AppraisalTemplate.ratingCriteria`, `Appraisal.selfRatings`, and — second
 * branch, not built here — `EmployeePerformanceFeedback.feedbackRatings`),
 * imported by whichever parent needs it rather than duplicated by hand.
 *
 * `rating` is a 0..1 fraction (Frappe's own `Rating` fieldtype storage
 * convention, e.g. 3 stars out of 5 = 0.6) — kept on this exact scale, not
 * rescaled to 0-5 here. `utils/appraisalCalc.js`'s `calculateSelfScore` is
 * what multiplies by `NUMBER_OF_STARS` to convert it back to a "stars
 * earned" value. Meaningless/unused in the `AppraisalTemplate.ratingCriteria`
 * context (a template only carries criteria + weightage), left at its
 * default 0 there rather than modelled as a separate field-less shape.
 */
export const FeedbackRatingSchema = new mongoose.Schema(
  {
    criteriaId: { type: mongoose.Schema.Types.ObjectId, ref: "EmployeeFeedbackCriteria", required: true },
    weightage: { type: Number, required: true, min: 0 },
    rating: { type: Number, default: 0, min: 0, max: 1 },
  },
  { _id: true },
);

/**
 * `AppraisalTemplateGoal` — child row of `AppraisalTemplate.goals`. Source
 * names the KRA-reference field `key_result_area` here and `kra` on
 * `Appraisal KRA`/`Appraisal Goal` — this project uses one consistent name,
 * `kraId`, everywhere (ADR-032).
 */
const AppraisalTemplateGoalSchema = new mongoose.Schema(
  {
    kraId: { type: mongoose.Schema.Types.ObjectId, ref: "KRA", required: true },
    weightage: { type: Number, required: true, min: 0 },
  },
  { _id: true },
);

/**
 * Reusable, named blueprint of KRAs (with weightages) and rating criteria
 * (with weightages) — assigned per-Designation (`Designation.appraisalTemplateId`)
 * or per-appraisee override on an `AppraisalCycle`, and copied by value (not
 * referenced live) into each `Appraisal` at creation time
 * (`AGENTS.md`/ADR-032: template rows are a blueprint, not a live join).
 *
 * Both `goals` and `ratingCriteria` weightages must each sum to exactly 100
 * (rounded to 2dp) whenever non-empty — enforced in the controller via
 * `utils/appraisalCalc.js`'s shared `validateWeightageSum`, not two inline
 * copies (this is the single most-repeated rule in the whole module).
 */
const AppraisalTemplateSchema = new mongoose.Schema(
  {
    templateTitle: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    goals: { type: [AppraisalTemplateGoalSchema], default: [] },
    ratingCriteria: { type: [FeedbackRatingSchema], default: [] },
  },
  { timestamps: true },
);

AppraisalTemplateSchema.index({ templateTitle: 1 }, { unique: true });
AppraisalTemplateSchema.index({ createdAt: -1 });

export default mongoose.model("AppraisalTemplate", AppraisalTemplateSchema);
