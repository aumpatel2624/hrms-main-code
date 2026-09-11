import mongoose from "mongoose";

/**
 * ADR-025 (module complete — second/transactional fork). Docstatus folding
 * (ADR-016): source's Draft/Submitted/Cancelled + a separate `status` field
 * collapse to this one `status` enum + explicit `approve`/`reject` actions,
 * same shape as `LeaveApplication` (ADR-024) — approve creates the real
 * downstream record (a `ShiftAssignment`), reject does nothing further.
 *
 * `approverId` is resolved via `resolveApprovers(employeeId, "shiftRequest")`
 * at creation when not explicitly supplied, or validated against that
 * resolved set when it is — see shiftAttendanceTransactions.controller.js.
 * Reuses ADR-024's approver mechanism as-is (per ADR-025): no separate,
 * narrower approver rule for this one doctype.
 */
const ShiftRequestSchema = new mongoose.Schema(
  {
    shiftTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShiftType",
      required: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    approverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: false, default: null },
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

ShiftRequestSchema.index({ employeeId: 1, status: 1 });
ShiftRequestSchema.index({ shiftTypeId: 1 });
ShiftRequestSchema.index({ companyId: 1 });
ShiftRequestSchema.index({ approverId: 1 });
ShiftRequestSchema.index({ status: 1 });
ShiftRequestSchema.index({ fromDate: 1 });
ShiftRequestSchema.index({ toDate: 1 });
ShiftRequestSchema.index({ fromDate: 1, toDate: 1 });
ShiftRequestSchema.index({ isActive: 1, createdAt: -1 });
ShiftRequestSchema.index({ createdAt: -1 });

export default mongoose.model("ShiftRequest", ShiftRequestSchema);
