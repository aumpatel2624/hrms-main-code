import mongoose from "mongoose";

/**
 * ADR-024. Append-only, mostly-immutable balance ledger — every
 * balance-affecting Leaves action (allocation grant, allocation adjust, and
 * later the second fork's application/encashment/adjustment actions) writes
 * one or more signed rows here. Balance = SUM(leaves) as of a date; see
 * utils/leaveBalance.js.
 *
 * `transactionType`/`transactionId` is source's Dynamic Link
 * (`transaction_type` + `transaction_name`), simplified per the spec's own
 * recommendation to a plain enum + ObjectId pair rather than full
 * Dynamic-Link infrastructure — this table is system-written and
 * append-only, not user-facing CRUD, so there is nothing to resolve a
 * generic reference picker against.
 *
 * Reversal is soft-delete (ADR-024, deliberate deviation from source's
 * hard-DELETE-on-cancel) — consistent with this project's universal
 * soft-delete convention. The one thing this requires getting right:
 * `getLeaveBalance`'s aggregation must filter `isDeleted: { $ne: true }`
 * itself — the soft-delete plugin's query middleware does not run for
 * `aggregate` pipelines built through `.aggregate()` the way it does for
 * `find`/`findOne`.
 *
 * No public create/update endpoint — this collection is list/get (read)
 * only from the API; see controllers/v1/leaves.controller.js.
 */
const LeaveLedgerEntrySchema = new mongoose.Schema(
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
    transactionType: {
      type: String,
      enum: ["LeaveAllocation", "LeavePolicyAssignment", "LeaveApplication", "LeaveEncashment", "LeaveAdjustment"],
      required: true,
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    leaves: { type: Number, required: true },
    fromDate: { type: Date, required: false, default: null },
    toDate: { type: Date, required: false, default: null },
    isCarryForward: { type: Boolean, default: false },
    isExpired: { type: Boolean, default: false },
    isLwp: { type: Boolean, default: false },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: false,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  { timestamps: true },
);

LeaveLedgerEntrySchema.index({ employeeId: 1, leaveTypeId: 1 });
LeaveLedgerEntrySchema.index({ transactionType: 1, transactionId: 1 });
LeaveLedgerEntrySchema.index({ companyId: 1 });
LeaveLedgerEntrySchema.index({ fromDate: 1, toDate: 1 });
LeaveLedgerEntrySchema.index({ isActive: 1, createdAt: -1 });
LeaveLedgerEntrySchema.index({ createdAt: -1 });

export default mongoose.model("LeaveLedgerEntry", LeaveLedgerEntrySchema);
