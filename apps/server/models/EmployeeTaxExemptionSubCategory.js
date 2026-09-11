import mongoose from "mongoose";

// ADR-030 (Tax & Exemptions). Master sub-category for granular exemption instruments.
const EmployeeTaxExemptionSubCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    exemptionCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmployeeTaxExemptionCategory",
      required: true,
    },
    maxAmount: { type: Number, min: 0, default: 0 },
    isActive: { type: Boolean, default: true },
    description: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

EmployeeTaxExemptionSubCategorySchema.index({ exemptionCategoryId: 1 });
EmployeeTaxExemptionSubCategorySchema.index({ name: 1, exemptionCategoryId: 1 }, { unique: true });
EmployeeTaxExemptionSubCategorySchema.index({ isActive: 1 });
EmployeeTaxExemptionSubCategorySchema.index({ createdAt: -1 });

export default mongoose.model("EmployeeTaxExemptionSubCategory", EmployeeTaxExemptionSubCategorySchema);
