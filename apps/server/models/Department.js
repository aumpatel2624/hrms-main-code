import mongoose from "mongoose";

const DepartmentSchema = new mongoose.Schema(
  {
    departmentName: {
      type: String,
      required: true,
      trim: true,
    },
    departmentCode: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  { timestamps: true },
);


// ---- indexes ----------------------------------------------------------
// Every field the controller's `filterable` map exposes needs one, or the
// filter is a collection scan. isDeleted is deliberately NOT indexed on its
// own — see models/softDelete.js: `$ne: true` matches nearly every row and is
// too unselective to help. Compound indexes lead with the selective field.
// departmentName and departmentCode are searchable and filterable;
// createdAt is the default list sort.
DepartmentSchema.index({ departmentName: 1 });
DepartmentSchema.index({ departmentCode: 1 });
DepartmentSchema.index({ isActive: 1, createdAt: -1 });
DepartmentSchema.index({ createdAt: -1 });

export default mongoose.model("Department", DepartmentSchema);
