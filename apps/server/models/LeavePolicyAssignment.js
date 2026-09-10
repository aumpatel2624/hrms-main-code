import mongoose from "mongoose";

/**
 * ADR-024. `status`/`leavesAllocated` fold source's docstatus + on_submit
 * side effect (ADR-016): `grant-allocations` is the explicit action that
 * reproduces `grant_leave_alloc_for_employee`, guarded by `leavesAllocated`
 * the same way source guards re-entry.
 */
const LeavePolicyAssignmentSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: false,
      default: null,
    },
    leavePolicyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeavePolicy",
      required: true,
    },
    assignmentBasedOn: {
      type: String,
      enum: ["", "Leave Period", "Joining Date"],
      default: "",
    },
    leavePeriodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeavePeriod",
      required: false,
      default: null,
    },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date, required: true },
    carryForward: { type: Boolean, default: false },
    // Idempotency guard for the grant-allocations action — matches source's
    // leaves_allocated flag exactly.
    leavesAllocated: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["pending", "allocated"],
      default: "pending",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  { timestamps: true },
);

LeavePolicyAssignmentSchema.index({ employeeId: 1 });
LeavePolicyAssignmentSchema.index({ leavePolicyId: 1 });
LeavePolicyAssignmentSchema.index({ leavePeriodId: 1 });
LeavePolicyAssignmentSchema.index({ companyId: 1 });
LeavePolicyAssignmentSchema.index({ status: 1 });
LeavePolicyAssignmentSchema.index({ effectiveFrom: 1, effectiveTo: 1 });
LeavePolicyAssignmentSchema.index({ isActive: 1, createdAt: -1 });
LeavePolicyAssignmentSchema.index({ createdAt: -1 });

export default mongoose.model("LeavePolicyAssignment", LeavePolicyAssignmentSchema);
