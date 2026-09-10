import mongoose from "mongoose";

const RoleMasterSchema = new mongoose.Schema(
  {
    roleName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);


// ---- indexes ----------------------------------------------------------
// Every field the controller's `filterable` map exposes needs one, or the
// filter is a collection scan. isDeleted is deliberately NOT indexed on its
// own — see models/softDelete.js: `$ne: true` matches nearly every row and is
// too unselective to help. Compound indexes lead with the selective field.
// roleName already has a unique index; these cover the list's filter
// and its default sort.
RoleMasterSchema.index({ isActive: 1, createdAt: -1 });
RoleMasterSchema.index({ createdAt: -1 });

export default mongoose.model("RoleMaster", RoleMasterSchema);
