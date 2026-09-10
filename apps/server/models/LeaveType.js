import mongoose from "mongoose";

/**
 * ADR-024 (Leaves module 8 foundation). Idiomatic rebuild (ADR-016) of
 * source's Leave Type — the configuration doctype every other Leaves
 * collection reads flags off of (carry-forward, earned-leave accrual,
 * encashment, LWP/PPL). No docstatus (not submittable in source either).
 *
 * `earningComponent` (source: a Salary Component link, feeding Leave
 * Encashment's payroll posting) is dropped — Payroll doesn't exist in this
 * project yet (same forward-dependency shape as Travel's expenseType,
 * OPEN-QUESTIONS.md).
 */
const LeaveTypeSchema = new mongoose.Schema(
  {
    leaveTypeName: {
      type: String,
      required: true,
      trim: true,
    },
    isCompensatory: { type: Boolean, default: false },
    isLwp: { type: Boolean, default: false },
    isPpl: { type: Boolean, default: false },
    // Required (server-side) when isPpl is set — the source only range-checks
    // this field but never actually enforces presence; closed here rather
    // than reproduced, per the spec's own flagged gap.
    fractionOfDailySalaryPerLeave: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },
    allowNegative: { type: Boolean, default: false },
    allowOverAllocation: { type: Boolean, default: false },
    includeHoliday: { type: Boolean, default: false },
    isOptionalLeave: { type: Boolean, default: false },
    isCarryForward: { type: Boolean, default: false },
    maximumCarryForwardedLeaves: { type: Number, min: 0, default: null },
    expireCarryForwardedLeavesAfterDays: { type: Number, min: 0, default: null },
    allowEncashment: { type: Boolean, default: false },
    maxEncashableLeaves: { type: Number, min: 0, default: null },
    nonEncashableLeaves: { type: Number, min: 0, default: null },
    isEarnedLeave: { type: Boolean, default: false },
    earnedLeaveFrequency: {
      type: String,
      enum: ["", "Monthly", "Quarterly", "Half-Yearly", "Yearly"],
      default: "",
    },
    allocateOnDay: {
      type: String,
      enum: ["First Day", "Last Day", "Date of Joining"],
      default: "Last Day",
    },
    rounding: {
      type: String,
      enum: ["", "0.25", "0.5", "1.0"],
      default: "",
    },
    maxLeavesAllowed: { type: Number, min: 0, default: null },
    maxContinuousDaysAllowed: { type: Number, min: 0, default: null },
    applicableAfter: { type: Number, min: 0, default: null },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  { timestamps: true },
);

LeaveTypeSchema.index({ leaveTypeName: 1 }, { unique: true });
LeaveTypeSchema.index({ isEarnedLeave: 1 });
LeaveTypeSchema.index({ isActive: 1, createdAt: -1 });
LeaveTypeSchema.index({ createdAt: -1 });

export default mongoose.model("LeaveType", LeaveTypeSchema);
