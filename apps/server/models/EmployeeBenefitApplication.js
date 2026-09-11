import mongoose from "mongoose";

/**
 * ADR-029 (Payroll — Benefits).
 *
 * Employee Benefit Application records an employee's annual election of how
 * their flexible benefit pool (`maxBenefits`) is distributed across eligible
 * flexible-benefit earning components for a given `PayrollPeriod`.
 *
 * Status: folded docstatus (`draft`, `submitted`, `cancelled`).
 * Only one submitted application per (employee, payroll period) is allowed.
 *
 * `totalAmount` and `remainingBenefit` are computed and validated server-side
 * on every save (closing the client-JS-only source gap).
 */
export const EmployeeBenefitApplicationDetailSchema = new mongoose.Schema(
  {
    salaryComponentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalaryComponent",
      required: true,
    },
    maxBenefitAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
  },
  { _id: true },
);

const EmployeeBenefitApplicationSchema = new mongoose.Schema(
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
    payrollPeriodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PayrollPeriod",
      required: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    currency: {
      type: String,
      required: true,
      trim: true,
    },
    maxBenefits: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    remainingBenefit: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    employeeBenefits: {
      type: [EmployeeBenefitApplicationDetailSchema],
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

EmployeeBenefitApplicationSchema.index({ employeeId: 1, payrollPeriodId: 1 });
EmployeeBenefitApplicationSchema.index({ companyId: 1 });
EmployeeBenefitApplicationSchema.index({ status: 1 });
EmployeeBenefitApplicationSchema.index({ createdAt: -1 });

export default mongoose.model("EmployeeBenefitApplication", EmployeeBenefitApplicationSchema);
