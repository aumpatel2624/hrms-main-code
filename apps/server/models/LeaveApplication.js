import mongoose from "mongoose";

/**
 * ADR-024 (module complete — second fork). The centerpiece of the module.
 * `status` folds source's `status` field (Open/Approved/Rejected/Cancelled)
 * — this port does not separately model source's `docstatus`, since
 * ADR-016's docstatus-folding precedent already collapses submit/cancel
 * lifecycles into an explicit-action + status-enum shape everywhere else in
 * this codebase; `status` alone is the full state machine here.
 *
 * `totalLeaveDays` is ALWAYS server-recomputed on create/update from
 * fromDate/toDate/halfDay — never trust a client-supplied value (Leave
 * Application.md Port Notes: "a port must NOT trust a client-submitted
 * total_leave_days").
 */
const LeaveApplicationSchema = new mongoose.Schema(
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
    halfDay: { type: Boolean, default: false },
    halfDayDate: { type: Date, required: false, default: null },
    // Server-computed, see file-level comment — never accepted verbatim from
    // the client on create/update.
    totalLeaveDays: { type: Number, default: 0 },
    description: { type: String, trim: true, default: "" },
    // Resolved via resolveApprovers(employeeId, "leave") at creation when not
    // explicitly set, or validated against that resolved set when supplied —
    // see leavesTransactions.controller.js. Self-approval (the approver's
    // linked Employee === employeeId) is always rejected.
    leaveApproverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
    postingDate: { type: Date, required: true, default: Date.now },
    status: {
      type: String,
      enum: ["open", "approved", "rejected", "cancelled"],
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

LeaveApplicationSchema.index({ employeeId: 1, leaveTypeId: 1 });
LeaveApplicationSchema.index({ leaveTypeId: 1 });
LeaveApplicationSchema.index({ companyId: 1 });
LeaveApplicationSchema.index({ leaveApproverId: 1 });
LeaveApplicationSchema.index({ status: 1 });
LeaveApplicationSchema.index({ employeeId: 1, fromDate: 1, toDate: 1 });
LeaveApplicationSchema.index({ fromDate: 1, toDate: 1 });
LeaveApplicationSchema.index({ isActive: 1, createdAt: -1 });
LeaveApplicationSchema.index({ createdAt: -1 });

export default mongoose.model("LeaveApplication", LeaveApplicationSchema);
