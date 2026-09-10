import mongoose from "mongoose";

/**
 * ADR-024 (module complete — second fork). `status` folds source's docstatus
 * (open/approved/rejected — no "cancelled" state exists in source for this
 * doctype beyond the standard amend-cancel, which this port does not
 * reproduce, matching the no-amend precedent already set for
 * `LeaveAdjustment`). `leaveAllocationId` is set server-side by the
 * `/approve` action, exactly like source sets it via `db_set` in `on_submit`
 * — never client-writable.
 */
const CompensatoryLeaveRequestSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    // Must be a compensatory-flagged Leave Type (LeaveType.isCompensatory) —
    // enforced server-side in the controller, not the schema, since the
    // check needs to read the referenced LeaveType document.
    leaveTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveType",
      required: true,
    },
    leaveAllocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveAllocation",
      required: false,
      default: null,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: false,
      default: null,
    },
    workFromDate: { type: Date, required: true },
    workEndDate: { type: Date, required: true },
    halfDay: { type: Boolean, default: false },
    halfDayDate: { type: Date, required: false, default: null },
    reason: { type: String, trim: true, required: true },
    status: {
      type: String,
      enum: ["open", "approved", "rejected"],
      default: "open",
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

CompensatoryLeaveRequestSchema.index({ employeeId: 1 });
CompensatoryLeaveRequestSchema.index({ leaveTypeId: 1 });
CompensatoryLeaveRequestSchema.index({ leaveAllocationId: 1 });
CompensatoryLeaveRequestSchema.index({ companyId: 1 });
CompensatoryLeaveRequestSchema.index({ status: 1 });
CompensatoryLeaveRequestSchema.index({ workFromDate: 1, workEndDate: 1 });
CompensatoryLeaveRequestSchema.index({ isActive: 1, createdAt: -1 });
CompensatoryLeaveRequestSchema.index({ createdAt: -1 });

export default mongoose.model("CompensatoryLeaveRequest", CompensatoryLeaveRequestSchema);
