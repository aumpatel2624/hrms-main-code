import mongoose from "mongoose";

/**
 * ADR-032 (Performance, module 16, foundation half). Child row of
 * `AppraisalCycle.appraisees` — populated by the "get eligible employees"
 * action (`getEligibleEmployeesForCycle`), one row per candidate employee,
 * and consumed by "create appraisals" (`createAppraisalsForCycle`). The
 * three snapshot fields (`branchId`/`designationId`/`departmentId`) are the
 * employee's values *at the time the list was generated* — matching
 * source's `Appraisee` child doctype, referenced by name only there (owned
 * elsewhere), built here since this project has no separate module for it.
 * `appraisalTemplateId` is the per-row override: defaults from
 * `Designation.appraisalTemplateId` when the list is generated, but HR may
 * change it per-row before running "create appraisals".
 */
const AppraiseeSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null },
    designationId: { type: mongoose.Schema.Types.ObjectId, ref: "Designation", default: null },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
    appraisalTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: "AppraisalTemplate", default: null },
  },
  { _id: true },
);

/**
 * A named, time-boxed HR-managed cycle (e.g. "H1 2026") that generates and
 * tracks `Appraisal` records for a filtered population of employees. Plain
 * CRUD master (matching source, which never submits this doctype).
 *
 * `kraEvaluationMethod` is immutable once any non-cancelled `Appraisal`
 * exists under this cycle — enforced in the controller at update time
 * (changing it after Appraisals exist would silently desync their
 * per-Appraisal `rateGoalsManually` flag, fixed at creation, from what new
 * ones would get). `status` transitioning TO "Completed" must go through the
 * dedicated `completeCycle` action (guarded: no linked Appraisal may still be
 * `draft`) rather than a plain field update — a deliberate small tightening
 * over source, which leaves that transition as an ungated client-side field
 * save; the other transitions (Not Started <-> In Progress) stay a plain,
 * unguarded field write, matching source.
 */
const AppraisalCycleSchema = new mongoose.Schema(
  {
    cycleName: { type: String, required: true, trim: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    status: { type: String, enum: ["Not Started", "In Progress", "Completed"], default: "Not Started", required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    description: { type: String, default: "" },
    kraEvaluationMethod: {
      type: String,
      enum: ["Automated Based on Goal Progress", "Manual Rating"],
      default: "Automated Based on Goal Progress",
      required: true,
    },
    calculateFinalScoreBasedOnFormula: { type: Boolean, default: false },
    // Required only when calculateFinalScoreBasedOnFormula is true —
    // enforced in the controller (Mongoose's conditional-required needs a
    // validator function; the controller check is simpler and matches this
    // project's usual "conditionally required" handling, e.g. Gratuity Rule).
    finalScoreFormula: { type: String, default: "" },
    // Optional filter presets consumed by "get eligible employees" — not
    // enforced constraints, just narrowing filters (matching source).
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
    designationId: { type: mongoose.Schema.Types.ObjectId, ref: "Designation", default: null },
    appraisees: { type: [AppraiseeSchema], default: [] },
  },
  { timestamps: true },
);

AppraisalCycleSchema.index({ cycleName: 1 }, { unique: true });
AppraisalCycleSchema.index({ companyId: 1 });
AppraisalCycleSchema.index({ status: 1 });
AppraisalCycleSchema.index({ kraEvaluationMethod: 1 });
AppraisalCycleSchema.index({ startDate: 1 });
AppraisalCycleSchema.index({ endDate: 1 });
AppraisalCycleSchema.index({ createdAt: -1 });

export default mongoose.model("AppraisalCycle", AppraisalCycleSchema);
