import mongoose from "mongoose";

/**
 * ADR-031 (Payroll — Gratuity). Plain CRUD master (not submittable, matching
 * source) defining how a `Gratuity` record's work-experience and payout
 * amount are computed. Embeds two child tables: `applicableEarningsComponent`
 * (which Salary Components count toward the gratuity base amount) and
 * `gratuityRuleSlabs` (the years-of-service brackets and their payout
 * fraction). Both are required with at least one row — enforced in the
 * controller (Mongoose's array `required` only checks presence, not length).
 *
 * `disable` is enforced here, a real, deliberate improvement over source
 * (which defines the flag but never filters it out of selection anywhere):
 * the plain list endpoint (`GET /gratuity-rules`, this project's
 * dropdown-backing lookup source for `Gratuity.gratuityRuleId`) excludes
 * `disable: true` rows; the search endpoint that feeds this master's own
 * CRUD table does not, so HR can still find and re-enable a disabled rule.
 *
 * `gratuityRuleSlabs.toYear: null` means open-ended (only the final slab may
 * be) — this project's `null`-means-unbounded convention (matches
 * `IncomeTaxSlab.toAmount`), not source's `toYear: 0` overload.
 */
const GratuityApplicableComponentSchema = new mongoose.Schema(
  {
    salaryComponentId: { type: mongoose.Schema.Types.ObjectId, ref: "SalaryComponent", required: true },
  },
  { _id: true },
);

export const GratuityRuleSlabSchema = new mongoose.Schema(
  {
    fromYear: { type: Number, required: true, min: 0, default: 0 },
    toYear: { type: Number, default: null, min: 0 },
    fractionOfApplicableEarnings: { type: Number, required: true, min: 0 },
  },
  { _id: true },
);

const GratuityRuleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    disable: { type: Boolean, default: false },
    calculateGratuityAmountBasedOn: {
      type: String,
      enum: ["Current Slab", "Sum of all previous slabs"],
      required: true,
    },
    totalWorkingDaysPerYear: { type: Number, default: 365, min: 0 },
    workExperienceCalculationFunction: {
      type: String,
      enum: ["Round off Work Experience", "Take Exact Completed Years", "Manual"],
      default: "Round off Work Experience",
    },
    minimumYearForGratuity: { type: Number, default: 0, min: 0 },
    applicableEarningsComponent: { type: [GratuityApplicableComponentSchema], default: [] },
    gratuityRuleSlabs: { type: [GratuityRuleSlabSchema], default: [] },
  },
  { timestamps: true },
);

GratuityRuleSchema.index({ name: 1 }, { unique: true });
GratuityRuleSchema.index({ disable: 1 });
GratuityRuleSchema.index({ calculateGratuityAmountBasedOn: 1 });
GratuityRuleSchema.index({ workExperienceCalculationFunction: 1 });
GratuityRuleSchema.index({ minimumYearForGratuity: 1 });
GratuityRuleSchema.index({ totalWorkingDaysPerYear: 1 });
GratuityRuleSchema.index({ createdAt: -1 });

export default mongoose.model("GratuityRule", GratuityRuleSchema);
