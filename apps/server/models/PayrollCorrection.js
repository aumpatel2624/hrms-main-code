import mongoose from "mongoose";

const PayrollCorrectionDetailSchema = new mongoose.Schema(
  {
    salaryComponentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalaryComponent",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  { _id: true },
);

/**
 * ADR-029 — Payroll (Benefits & Corrections).
 *
 * Payroll Correction reverses ("gives back") a specified number of Leave-Without-Pay
 * (LWP) days from an already-processed Salary Slip for a given period.
 *
 * It generates:
 * - earningArrears: AdditionalSalary rows (Earning, non-overwrite)
 * - deductionArrears: AdditionalSalary rows (Deduction, non-overwrite)
 * - accrualArrears: EmployeeBenefitLedger rows (Accrual)
 *
 * Submit action: creates active AdditionalSalary records and EmployeeBenefitLedger entries.
 * Cancel action: cascades cancellation to linked AdditionalSalary records and
 * soft-deletes linked EmployeeBenefitLedger entries.
 */
const PayrollCorrectionSchema = new mongoose.Schema(
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
    salarySlipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalarySlip",
      required: true,
    },
    payrollDate: {
      type: Date,
      default: Date.now,
    },
    daysToReverse: {
      type: Number,
      required: true,
      min: 0.01,
    },
    earningArrears: {
      type: [PayrollCorrectionDetailSchema],
      default: [],
    },
    deductionArrears: {
      type: [PayrollCorrectionDetailSchema],
      default: [],
    },
    accrualArrears: {
      type: [PayrollCorrectionDetailSchema],
      default: [],
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

PayrollCorrectionSchema.index({ employeeId: 1 });
PayrollCorrectionSchema.index({ companyId: 1 });
PayrollCorrectionSchema.index({ salarySlipId: 1 });
PayrollCorrectionSchema.index({ status: 1 });
PayrollCorrectionSchema.index({ createdAt: -1 });

export default mongoose.model("PayrollCorrection", PayrollCorrectionSchema);
