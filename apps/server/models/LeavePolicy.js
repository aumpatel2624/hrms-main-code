import mongoose from "mongoose";

/**
 * ADR-024. `leavePolicyDetails[]` folds source's `Leave Policy Detail` child
 * table (one (LeaveType, annualAllocation) pair per row) — bounded, always
 * read with its parent, exactly the embedding case docs/conventions/20-schema.md
 * describes. No docstatus (ADR-016) — this doctype has no on_submit side
 * effect in source beyond the generic lifecycle, so folding it away loses
 * nothing.
 */
const LeavePolicyDetailSchema = new mongoose.Schema(
  {
    leaveTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveType",
      required: true,
    },
    annualAllocation: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const LeavePolicySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    leavePolicyDetails: { type: [LeavePolicyDetailSchema], default: [] },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  { timestamps: true },
);

LeavePolicySchema.index({ title: 1 }, { unique: true });
LeavePolicySchema.index({ "leavePolicyDetails.leaveTypeId": 1 });
LeavePolicySchema.index({ isActive: 1, createdAt: -1 });
LeavePolicySchema.index({ createdAt: -1 });

export default mongoose.model("LeavePolicy", LeavePolicySchema);
