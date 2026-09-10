import mongoose from "mongoose";

/**
 * ADR-021. Source's parent/subsidiary-company validation layer (a nested-
 * set Company tree this project's flat, multi-company `Company` doesn't
 * have) is dropped entirely — only the same-company overlap guard survives.
 * `currentCount`/`currentOpenings`/`numberOfPositions`/`totalEstimatedCost`
 * are all recomputed server-side on every save from live Employee/JobOpening
 * counts, never client-supplied. No "prompt"-style user-typed primary key
 * (this project uses `_id` everywhere, per ADR-016) and no docstatus.
 */
const StaffingDetailSchema = new mongoose.Schema(
  {
    designationId: { type: mongoose.Schema.Types.ObjectId, ref: "Designation", required: true },
    vacancies: { type: Number, required: true, min: 0, default: 0 },
    estimatedCostPerPosition: { type: Number, min: 0, default: null },
    // Server-computed on every parent save — see staffingPlan.controller.js.
    currentCount: { type: Number, default: 0 },
    currentOpenings: { type: Number, default: 0 },
    numberOfPositions: { type: Number, default: 0 },
    totalEstimatedCost: { type: Number, default: 0 },
  },
  { _id: false },
);

const StaffingPlanSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: false,
      default: null,
    },
    fromDate: {
      type: Date,
      required: true,
    },
    toDate: {
      type: Date,
      required: true,
    },
    staffingDetails: {
      type: [StaffingDetailSchema],
      default: [],
    },
    totalEstimatedBudget: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  { timestamps: true },
);

StaffingPlanSchema.index({ companyId: 1 });
StaffingPlanSchema.index({ departmentId: 1 });
StaffingPlanSchema.index({ fromDate: 1, toDate: 1 });
StaffingPlanSchema.index({ isActive: 1, createdAt: -1 });
StaffingPlanSchema.index({ createdAt: -1 });

export default mongoose.model("StaffingPlan", StaffingPlanSchema);
