import mongoose from "mongoose";

const EmployeeGradeSchema = new mongoose.Schema(
  {
    gradeName: {
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
// Not company-scoped, same reasoning as EmploymentType (ADR-017). No
// defaultSalaryStructure field yet — SalaryStructure doesn't exist until the
// Payroll module; added there as a schema change to this model, not modelled
// speculatively now.
EmployeeGradeSchema.index({ gradeName: 1 }, { unique: true });
EmployeeGradeSchema.index({ isActive: 1, createdAt: -1 });
EmployeeGradeSchema.index({ createdAt: -1 });

export default mongoose.model("EmployeeGrade", EmployeeGradeSchema);
