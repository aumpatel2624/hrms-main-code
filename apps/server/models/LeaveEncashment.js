import mongoose from "mongoose";

/**
 * ADR-024 (module complete — second fork). Source's `Leave Encashment`
 * inherits `AccountsController` and posts GL entries or an `Additional
 * Salary` — this project has no Payroll/Accounting module yet (ADR-016/Q-3
 * precedent, same as Full & Final Statement's markStatementAsPaid), so
 * `/mark-paid` is a manual substitute: amount/date/reference, no GL, no
 * Payment Entry.
 *
 * `perDayEncashmentAmount` is source's `Salary Structure Assignment.
 * leave_encashment_amount_per_day` lookup — that module doesn't exist yet in
 * this project (same forward-dependency shape as Travel's `expenseType`,
 * OPEN-QUESTIONS.md), so it is a manually-entered field on this form rather
 * than blocking on a module 11+ dependency. Retrofit item, see
 * OPEN-QUESTIONS.md.
 */
const LeaveEncashmentSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    // Must have LeaveType.allowEncashment set — enforced in the controller.
    leaveTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveType",
      required: true,
    },
    leaveAllocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveAllocation",
      required: true,
    },
    leavePeriodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeavePeriod",
      required: false,
      default: null,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: false,
      default: null,
    },
    encashmentDate: { type: Date, required: true, default: Date.now },
    // Computed via getLeaveBalance at encashment time — snapshot, not
    // re-derived on every read.
    leaveBalance: { type: Number, default: 0 },
    // leaveBalance capped by LeaveType.nonEncashableLeaves/maxEncashableLeaves.
    actualEncashableDays: { type: Number, default: 0 },
    encashmentDays: { type: Number, required: true, min: 0 },
    // Manual field — see file-level comment. No Salary Structure Assignment
    // to derive this from yet.
    perDayEncashmentAmount: { type: Number, required: true, min: 0 },
    encashmentAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
      required: true,
    },
    paymentDate: { type: Date, required: false, default: null },
    paymentReference: { type: String, trim: true, default: "" },
    paidAmount: { type: Number, default: 0 },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  { timestamps: true },
);

LeaveEncashmentSchema.index({ employeeId: 1, leaveTypeId: 1 });
LeaveEncashmentSchema.index({ leaveAllocationId: 1 });
LeaveEncashmentSchema.index({ leavePeriodId: 1 });
LeaveEncashmentSchema.index({ companyId: 1 });
LeaveEncashmentSchema.index({ status: 1 });
LeaveEncashmentSchema.index({ encashmentDate: 1 });
LeaveEncashmentSchema.index({ isActive: 1, createdAt: -1 });
LeaveEncashmentSchema.index({ createdAt: -1 });

export default mongoose.model("LeaveEncashment", LeaveEncashmentSchema);
