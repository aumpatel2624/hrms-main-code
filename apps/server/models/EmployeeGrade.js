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
    // ADR-026 (Payroll — Structure & Assignment). Matches source's
    // `Salary Structure Assignment.salary_structure` fetch_from
    // `grade.default_salary_structure` / `.base` fetch_from
    // `grade.default_base_pay` — both optional, since not every grade has a
    // default structure/base pay set.
    defaultSalaryStructureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalaryStructure",
      required: false,
      default: null,
    },
    defaultBasePay: {
      type: Number,
      required: false,
      default: null,
      min: 0,
    },
  },
  { timestamps: true },
);

// ---- indexes ----------------------------------------------------------
// Not company-scoped, same reasoning as EmploymentType (ADR-017).
EmployeeGradeSchema.index({ gradeName: 1 }, { unique: true });
EmployeeGradeSchema.index({ defaultSalaryStructureId: 1 });
EmployeeGradeSchema.index({ isActive: 1, createdAt: -1 });
EmployeeGradeSchema.index({ createdAt: -1 });

export default mongoose.model("EmployeeGrade", EmployeeGradeSchema);
