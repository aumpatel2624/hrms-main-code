import mongoose from "mongoose";

// ADR-030 (Tax & Exemptions). Plain CRUD master for income tax slabs.
// Contains embedded taxable salary bracket rows (TaxableSalarySlabSchema)
// and embedded compounding surcharge/cess rows (IncomeTaxSlabOtherChargesSchema).
export const TaxableSalarySlabSchema = new mongoose.Schema(
  {
    fromAmount: { type: Number, required: true, min: 0, default: 0 },
    toAmount: { type: Number, default: null, min: 0 },
    percentDeduction: { type: Number, required: true, min: 0, max: 100, default: 0 },
    condition: { type: String, default: "" },
  },
  { _id: true },
);

export const IncomeTaxSlabOtherChargesSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    percent: { type: Number, required: true, min: 0 },
    minTaxableIncome: { type: Number, default: 0, min: 0 },
    maxTaxableIncome: { type: Number, default: null, min: 0 },
  },
  { _id: true },
);

const IncomeTaxSlabSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    effectiveFromDate: { type: Date, required: true },
    allowTaxExemption: { type: Boolean, default: false },
    standardDeduction: { type: Number, default: 0, min: 0 },
    taxReliefLimit: { type: Number, default: 0, min: 0 },
    disabled: { type: Boolean, default: false },
    currency: { type: String, trim: true, default: "INR" },
    slabs: { type: [TaxableSalarySlabSchema], default: [] },
    otherTaxesAndCharges: { type: [IncomeTaxSlabOtherChargesSchema], default: [] },
  },
  { timestamps: true },
);

IncomeTaxSlabSchema.index({ companyId: 1, effectiveFromDate: -1 });
IncomeTaxSlabSchema.index({ companyId: 1, name: 1 }, { unique: true });
IncomeTaxSlabSchema.index({ disabled: 1 });
IncomeTaxSlabSchema.index({ createdAt: -1 });

export default mongoose.model("IncomeTaxSlab", IncomeTaxSlabSchema);
