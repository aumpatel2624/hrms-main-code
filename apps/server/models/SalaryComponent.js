import mongoose from "mongoose";

// ADR-026. Master doctype: a reusable "line item" (Basic Salary, HRA, PF,
// TDS, ...) added to a Salary Structure's earnings/deductions/employer
// contributions tables. No `accounts` (Salary Component Account — dropped,
// no GL per ADR-016) and no Benefits-related fields
// (isFlexibleBenefit/maxBenefitAmount/payoutMethod/finalCycleAccrualPayout) —
// both are forward dependencies on modules that don't exist yet.
const SalaryComponentSchema = new mongoose.Schema(
  {
    salaryComponentName: { type: String, required: true, trim: true },
    // Auto-derived from initials of salaryComponentName if not supplied
    // (controller-level, see payrollAbbreviation.js), de-duplicated with a
    // numeric suffix scoped to companyId — see DECISIONS.md ADR-026 "As built"
    // for why the dedup scope narrows from source's global uniqueness.
    abbreviation: { type: String, required: true, trim: true },
    type: { type: String, enum: ["Earning", "Deduction", "Employer Contribution"], required: true },
    isTaxApplicable: { type: Boolean, default: false },
    dependsOnPaymentDays: { type: Boolean, default: false },
    doNotIncludeInTotal: { type: Boolean, default: false },
    statisticalComponent: { type: Boolean, default: false },
    roundToNearestInteger: { type: Boolean, default: false },
    exemptedFromIncomeTax: { type: Boolean, default: false },
    removeIfZeroValued: { type: Boolean, default: false },
    // Mutually exclusive with arrearComponent — validated in the controller.
    variableBasedOnTaxableSalary: { type: Boolean, default: false },
    arrearComponent: { type: Boolean, default: false },
    // Only valid when type === "Earning" — validated in the controller.
    accrualComponent: { type: Boolean, default: false },
    // ADR-029 (Payroll — Benefits)
    isFlexibleBenefit: { type: Boolean, default: false },
    maxBenefitAmount: { type: Number, default: null, min: 0 },
    payoutMethod: {
      type: String,
      enum: [
        "Accrue and payout at end of payroll period",
        "Accrue per cycle, pay only on claim",
        "Allow claim for full benefit amount",
        null,
      ],
      default: null,
    },
    finalCycleAccrualPayout: { type: Boolean, default: false },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    isActive: { type: Boolean, default: true, required: true },
  },
  { timestamps: true },
);

SalaryComponentSchema.index({ companyId: 1 });
SalaryComponentSchema.index({ type: 1 });
SalaryComponentSchema.index({ salaryComponentName: 1, companyId: 1 }, { unique: true });
SalaryComponentSchema.index({ abbreviation: 1, companyId: 1 }, { unique: true });
SalaryComponentSchema.index({ isActive: 1, createdAt: -1 });
SalaryComponentSchema.index({ createdAt: -1 });

export default mongoose.model("SalaryComponent", SalaryComponentSchema);
