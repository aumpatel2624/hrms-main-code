import mongoose from "mongoose";

/**
 * ADR-029 (Payroll — Benefits).
 *
 * Employee Benefit Claim records an employee's claim against an eligible
 * flexible benefit component for reimbursement.
 *
 * Status: folded docstatus (`draft`, `submitted`, `cancelled`).
 * Submit action: creates an active AdditionalSalary record (additive,
 * overwriteSalaryStructureAmount: false, refDoctype: "EmployeeBenefitClaim")
 * through the universal ingestion primitive (ADR-028).
 * Cancel action: cascades cancellation to the linked AdditionalSalary record.
 */
const EmployeeBenefitClaimSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    salaryComponentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalaryComponent",
      required: true,
    },
    earningComponentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalaryComponent",
      default: function () {
        return this.salaryComponentId;
      },
    },
    claimDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    payrollDate: {
      type: Date,
      default: function () {
        return this.claimDate;
      },
    },
    currency: {
      type: String,
      default: "USD",
      trim: true,
    },
    claimedAmount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    yearlyBenefit: {
      type: Number,
      min: 0,
      default: 0,
    },
    maxAmountEligible: {
      type: Number,
      min: 0,
      default: 0,
    },
    remarks: {
      type: String,
      default: "",
      trim: true,
    },
    attachments: {
      type: [String],
      default: [],
    },
    additionalSalaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdditionalSalary",
      default: null,
    },
    status: {
      type: String,
      enum: ["draft", "submitted", "cancelled"],
      default: "draft",
      required: true,
    },
  },
  { timestamps: true },
);

EmployeeBenefitClaimSchema.index({ employeeId: 1, salaryComponentId: 1 });
EmployeeBenefitClaimSchema.index({ companyId: 1 });
EmployeeBenefitClaimSchema.index({ claimDate: 1 });
EmployeeBenefitClaimSchema.index({ status: 1 });
EmployeeBenefitClaimSchema.index({ createdAt: -1 });

export default mongoose.model("EmployeeBenefitClaim", EmployeeBenefitClaimSchema);
