import mongoose from "mongoose";

// ADR-030 (Tax & Exemptions). Employee provisional tax exemption declaration.
export const EmployeeTaxExemptionDeclarationCategorySchema = new mongoose.Schema(
  {
    exemptionSubCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmployeeTaxExemptionSubCategory",
      required: true,
    },
    exemptionCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmployeeTaxExemptionCategory",
      required: true,
    },
    maxAmount: { type: Number, default: 0, min: 0 },
    amount: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: true },
);

const EmployeeTaxExemptionDeclarationSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    payrollPeriodId: { type: mongoose.Schema.Types.ObjectId, ref: "PayrollPeriod", required: true },
    currency: { type: String, trim: true, default: "INR" },
    declarations: { type: [EmployeeTaxExemptionDeclarationCategorySchema], default: [] },
    totalDeclaredAmount: { type: Number, default: 0 },
    totalExemptionAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["draft", "submitted", "cancelled"],
      default: "draft",
      required: true,
    },
  },
  { timestamps: true },
);

EmployeeTaxExemptionDeclarationSchema.index({ employeeId: 1, payrollPeriodId: 1 });
EmployeeTaxExemptionDeclarationSchema.index({ companyId: 1, status: 1 });
EmployeeTaxExemptionDeclarationSchema.index({ createdAt: -1 });

export default mongoose.model("EmployeeTaxExemptionDeclaration", EmployeeTaxExemptionDeclarationSchema);
