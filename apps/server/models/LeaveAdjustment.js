import mongoose from "mongoose";

/**
 * ADR-024 (module complete — second fork). Source's `Leave Adjustment`:
 * "simple enough that create IS the action" (ADR-024's docstatus-folding
 * decision) — one signed `LeaveLedgerEntry` is written on create, and there
 * is no separate submit/approve step and no update/delete of the balance
 * effect. Matches `Leave Adjustment.md`'s own note: this doctype does NOT
 * touch `LeaveAllocation.totalLeavesAllocated` — the ledger is the only
 * source of truth for balance, exactly like every other Leaves transaction.
 */
const LeaveAdjustmentSchema = new mongoose.Schema(
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
    // Optional — which allocation this nets against, if any. Source treats
    // it as required-but-client-populated (see Leave Adjustment.md Port
    // Notes: "no server-side fallback... a non-Frappe-desk client MUST
    // supply it explicitly"); this port relaxes that to optional since a
    // plain API caller may not always have one at hand, and the ledger
    // entry this writes doesn't strictly need a `leaveAllocationId` to be
    // correct (balance is `SUM(LeaveLedgerEntry.leaves)`, not allocation-
    // scoped).
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
    postingDate: { type: Date, required: true, default: Date.now },
    leavesToAdjust: { type: Number, required: true, min: 0.01 },
    adjustmentType: {
      type: String,
      enum: ["Allocate", "Reduce"],
      required: true,
    },
    // Informational snapshot only — per ADR-024, the real balance is always
    // the ledger sum (utils/leaveBalance.js's getLeaveBalance). Do NOT treat
    // this field as authoritative; it exists purely for display, mirroring
    // what the source doctype itself does (its own Port Notes flag this as
    // "informational, not authoritative").
    leavesAfterAdjustment: { type: Number, default: null },
    reasonForAdjustment: { type: String, trim: true, default: "" },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  { timestamps: true },
);

LeaveAdjustmentSchema.index({ employeeId: 1, leaveTypeId: 1 });
LeaveAdjustmentSchema.index({ leaveAllocationId: 1 });
LeaveAdjustmentSchema.index({ companyId: 1 });
LeaveAdjustmentSchema.index({ adjustmentType: 1 });
LeaveAdjustmentSchema.index({ isActive: 1, createdAt: -1 });
LeaveAdjustmentSchema.index({ createdAt: -1 });

export default mongoose.model("LeaveAdjustment", LeaveAdjustmentSchema);
