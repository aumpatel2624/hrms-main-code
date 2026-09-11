import mongoose from "mongoose";

// ADR-030 (Tax & Exemptions). Master category defining statutory ceilings (e.g. Section 80C).
const EmployeeTaxExemptionCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    maxAmount: { type: Number, required: true, min: 0, default: 0 },
    isActive: { type: Boolean, default: true },
    description: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

EmployeeTaxExemptionCategorySchema.index({ name: 1 }, { unique: true });
EmployeeTaxExemptionCategorySchema.index({ isActive: 1 });
EmployeeTaxExemptionCategorySchema.index({ createdAt: -1 });

export default mongoose.model("EmployeeTaxExemptionCategory", EmployeeTaxExemptionCategorySchema);
