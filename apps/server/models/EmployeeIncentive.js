import mongoose from "mongoose";

/**
 * ADR-028 — Payroll (Adjustments & Incentives).
 *
 * Employee Incentive tracks one-time performance rewards, project bonuses,
 * or sales incentives.
 *
 * Submit action: generates an active AdditionalSalary record, links it via
 * additionalSalaryId, and marks status submitted.
 *
 * Cancel action: cancels the linked AdditionalSalary record and marks status
 * cancelled (deliberate bug fix over source gap where cancelling an incentive
 * orphaned its Additional Salary in Frappe).
 */
const EmployeeIncentiveSchema = new mongoose.Schema(
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
    incentiveAmount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    incentiveDate: {
      type: Date,
      required: true,
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

EmployeeIncentiveSchema.index({ employeeId: 1 });
EmployeeIncentiveSchema.index({ companyId: 1 });
EmployeeIncentiveSchema.index({ incentiveDate: 1 });
EmployeeIncentiveSchema.index({ status: 1 });
EmployeeIncentiveSchema.index({ createdAt: -1 });

export default mongoose.model("EmployeeIncentive", EmployeeIncentiveSchema);
