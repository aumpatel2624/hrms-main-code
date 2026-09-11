import mongoose from "mongoose";

/**
 * ADR-029 (Payroll — Benefits).
 *
 * Employee Benefit Ledger is an append-only domain ledger (not a financial GL,
 * architecturally identical to LeaveLedgerEntry in ADR-024).
 *
 * Records Accrual and Payout transactions per employee/component/period to
 * maintain the running operational balance for benefit capping logic.
 *
 * Immutable event log: no direct public create/update/delete endpoints.
 * System-written via internal service helpers only.
 */
const EmployeeBenefitLedgerSchema = new mongoose.Schema(
  {
    postingDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
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
    payrollPeriodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PayrollPeriod",
      required: true,
    },
    transactionType: {
      type: String,
      enum: ["Accrual", "Payout"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    yearlyBenefit: {
      type: Number,
      default: 0,
      min: 0,
    },
    flexibleBenefit: {
      type: Boolean,
      default: false,
    },
    salarySlipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalarySlip",
      default: null,
    },
    // Polymorphic back-reference (ADR-024 / ADR-028 / ADR-029 pattern)
    refDoctype: {
      type: String,
      enum: [
        "EmployeeBenefitApplication",
        "EmployeeBenefitClaim",
        "SalaryStructureAssignment",
        "PayrollCorrection",
        "Arrear",
        "SalarySlip",
        null,
      ],
      default: null,
    },
    refDocnameId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    remarks: {
      type: String,
      trim: true,
      default: "",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

EmployeeBenefitLedgerSchema.index({ employeeId: 1, salaryComponentId: 1, payrollPeriodId: 1 });
EmployeeBenefitLedgerSchema.index({ salarySlipId: 1 });
EmployeeBenefitLedgerSchema.index({ companyId: 1 });
EmployeeBenefitLedgerSchema.index({ isDeleted: 1 });
EmployeeBenefitLedgerSchema.index({ refDoctype: 1, refDocnameId: 1 });
EmployeeBenefitLedgerSchema.index({ createdAt: -1 });

export default mongoose.model("EmployeeBenefitLedger", EmployeeBenefitLedgerSchema);
