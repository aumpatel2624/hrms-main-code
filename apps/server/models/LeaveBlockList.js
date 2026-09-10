import mongoose from "mongoose";

/**
 * ADR-024 (module complete — second fork). Folds source's two child tables
 * (`Leave Block List Date` -> `blockDates[]`, `Leave Block List Allow` ->
 * `allowList[]`) the same way every other module's child tables have been
 * folded — bounded, owned exclusively by this parent.
 *
 * `allowList[]` is a single `allowUserId` ref (User), matching the real
 * source spec exactly (`Leave Block List Allow.md`: the child table has only
 * one field, `allow_user`, Link to User — no role-based bypass exists in
 * source despite it being a plausible-sounding feature). Ground truth is the
 * spec file, not any summary of it.
 */
const BlockDateSchema = new mongoose.Schema(
  {
    blockDate: { type: Date, required: true },
    reason: { type: String, trim: true, required: true },
  },
  { _id: false },
);

const AllowListEntrySchema = new mongoose.Schema(
  {
    allowUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { _id: false },
);

const LeaveBlockListSchema = new mongoose.Schema(
  {
    leaveBlockListName: { type: String, required: true, trim: true },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    appliesToAllDepartments: { type: Boolean, default: false },
    // Only meaningful when appliesToAllDepartments is false.
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: false,
      default: null,
    },
    // When set, this block list only applies to applications of this Leave
    // Type; when unset, it blocks every leave type.
    leaveTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveType",
      required: false,
      default: null,
    },
    blockDates: { type: [BlockDateSchema], default: [] },
    allowList: { type: [AllowListEntrySchema], default: [] },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  { timestamps: true },
);

LeaveBlockListSchema.index({ leaveBlockListName: 1 }, { unique: true });
LeaveBlockListSchema.index({ companyId: 1 });
LeaveBlockListSchema.index({ departmentId: 1 });
LeaveBlockListSchema.index({ leaveTypeId: 1 });
LeaveBlockListSchema.index({ "blockDates.blockDate": 1 });
LeaveBlockListSchema.index({ isActive: 1, createdAt: -1 });
LeaveBlockListSchema.index({ createdAt: -1 });

export default mongoose.model("LeaveBlockList", LeaveBlockListSchema);
