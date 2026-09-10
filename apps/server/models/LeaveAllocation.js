import mongoose from "mongoose";

/**
 * ADR-024. `earnedLeaveSchedule[]` folds source's `Earned Leave Schedule`
 * child table — bounded, owned exclusively by this allocation, the
 * embedding case docs/conventions/20-schema.md describes.
 *
 * `status` folds source's docstatus + `expired` check field into one enum
 * (active/expired/cancelled) — ADR-016, no separate submit/cancel lifecycle.
 *
 * **`totalLeavesAllocated` is a cached snapshot, never the source of
 * truth.** The balance is always `SUM(LeaveLedgerEntry.leaves)` for this
 * employee/leaveType, computed via utils/leaveBalance.js's
 * `getLeaveBalance`. Do not "fix" this field to look consistent if it
 * drifts — that would break the real invariant (ADR-024).
 */
const EarnedLeaveScheduleSchema = new mongoose.Schema(
  {
    allocationDate: { type: Date, required: true },
    numberOfLeaves: { type: Number, required: true, default: 0 },
    isAllocated: { type: Boolean, default: false },
    attempted: { type: Boolean, default: false },
    failed: { type: Boolean, default: false },
    failureReason: { type: String, trim: true, default: "" },
    allocatedVia: {
      type: String,
      enum: ["", "Scheduler", "Leave Policy Assignment", "Manually"],
      default: "",
    },
  },
  { _id: false },
);

const LeaveAllocationSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    leaveTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveType",
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: false,
      default: null,
    },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    newLeavesAllocated: { type: Number, required: true, default: 0, min: 0 },
    carryForward: { type: Boolean, default: false },
    unusedLeaves: { type: Number, default: 0 },
    // Cached snapshot — see the file-level comment. Kept roughly in step by
    // the controller on every write that changes newLeavesAllocated/
    // unusedLeaves, but never trusted as the read path for a balance.
    totalLeavesAllocated: { type: Number, default: 0 },
    totalLeavesEncashed: { type: Number, default: 0 },
    leavePeriodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeavePeriod",
      required: false,
      default: null,
    },
    leavePolicyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeavePolicy",
      required: false,
      default: null,
    },
    leavePolicyAssignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeavePolicyAssignment",
      required: false,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
      required: true,
    },
    earnedLeaveSchedule: { type: [EarnedLeaveScheduleSchema], default: [] },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  { timestamps: true },
);

LeaveAllocationSchema.index({ employeeId: 1, leaveTypeId: 1 });
LeaveAllocationSchema.index({ leaveTypeId: 1 });
LeaveAllocationSchema.index({ companyId: 1 });
LeaveAllocationSchema.index({ leavePeriodId: 1 });
LeaveAllocationSchema.index({ leavePolicyId: 1 });
LeaveAllocationSchema.index({ leavePolicyAssignmentId: 1 });
LeaveAllocationSchema.index({ status: 1 });
LeaveAllocationSchema.index({ fromDate: 1, toDate: 1 });
LeaveAllocationSchema.index({ "earnedLeaveSchedule.allocationDate": 1, "earnedLeaveSchedule.attempted": 1 });
LeaveAllocationSchema.index({ isActive: 1, createdAt: -1 });
LeaveAllocationSchema.index({ createdAt: -1 });

export default mongoose.model("LeaveAllocation", LeaveAllocationSchema);
