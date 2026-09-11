import mongoose from "mongoose";

/**
 * ADR-032 (Performance, module 16, transactional half). An employee's
 * individual goal, optionally nested under a parent "group" goal (`isGroup`),
 * optionally tagged to an `AppraisalCycle` + `KRA` to feed automated KRA
 * scoring in `Appraisal` (see `performance.controller.js`'s `submitAppraisal`).
 *
 * Tree shape: plain adjacency list (`parentGoalId`, self-referencing) with
 * recursive application-level rollup, not source's nested-set (`lft`/`rgt`)
 * bookkeeping — `Goal.md`'s own Port Notes call this the simpler, at-some-
 * query-cost-tradeoff option, and this is the first tree-shaped doctype in
 * this project (no nested-set helper exists to reuse). The business rules
 * (parent-progress rollup, KRA propagation, status derivation) are the same
 * either way.
 *
 * `set_only_once` fields (source's term — immutable after first save):
 * `employeeId`, `isGroup`, `appraisalCycleId`. `kraId` is NOT set_only_once
 * in source (Port Notes list only the three above) — a top-level goal can
 * freely change its own `kraId`; it is only locked/inherited when a
 * `parentGoalId` is chosen (fetched from the parent, not independently
 * editable) — enforced in `performance.controller.js`'s Goal handlers, not
 * here (Mongoose has no per-field "immutable after first save" primitive;
 * that check belongs at the point that already loads the prior document).
 *
 * `progress`/`status` derivation, the parent-progress rollup average, and
 * the new parent-cycle guard live in `utils/appraisalCalc.js` (pure scoring/
 * aggregation math) and `utils/goalTree.js` (pure tree-cycle detection) —
 * this schema only shapes the data.
 */
const GoalSchema = new mongoose.Schema(
  {
    goalName: { type: String, required: true, trim: true },
    isGroup: { type: Boolean, default: false },
    parentGoalId: { type: mongoose.Schema.Types.ObjectId, ref: "Goal", default: null },
    // Read-only (server-computed) whenever isGroup is true or status is
    // "Closed" — enforced in the controller, which simply ignores a
    // client-supplied value in either case rather than erroring (matching
    // source's read_only_depends_on field semantics, not a hard reject).
    progress: { type: Number, default: 0, min: 0, max: 100 },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed", "Archived", "Closed"],
      default: "Pending",
      required: true,
    },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    appraisalCycleId: { type: mongoose.Schema.Types.ObjectId, ref: "AppraisalCycle", default: null },
    kraId: { type: mongoose.Schema.Types.ObjectId, ref: "KRA", default: null },
    description: { type: String, default: "" },
  },
  { timestamps: true },
);

GoalSchema.index({ employeeId: 1 });
GoalSchema.index({ companyId: 1 });
GoalSchema.index({ parentGoalId: 1 });
GoalSchema.index({ appraisalCycleId: 1 });
GoalSchema.index({ kraId: 1 });
GoalSchema.index({ status: 1 });
GoalSchema.index({ isGroup: 1 });
GoalSchema.index({ startDate: 1 });
GoalSchema.index({ endDate: 1 });
GoalSchema.index({ createdAt: -1 });

export default mongoose.model("Goal", GoalSchema);
