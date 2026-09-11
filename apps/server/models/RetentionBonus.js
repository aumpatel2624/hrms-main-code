import mongoose from "mongoose";

/**
 * ADR-028 — Payroll (Adjustments & Incentives).
 *
 * Retention Bonus tracks retention agreements payable to an active employee
 * on a specified bonusPaymentDate.
 *
 * Submit action: generates an active AdditionalSalary record, links it via
 * additionalSalaryId, and marks status submitted.
 *
 * Cancel action: cancels the linked AdditionalSalary record and marks status
 * cancelled (matches source's correct behavior).
 */
const RetentionBonusSchema = new mongoose.Schema(
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
    bonusAmount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    bonusPaymentDate: {
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

RetentionBonusSchema.index({ employeeId: 1 });
RetentionBonusSchema.index({ companyId: 1 });
RetentionBonusSchema.index({ bonusPaymentDate: 1 });
RetentionBonusSchema.index({ status: 1 });
RetentionBonusSchema.index({ createdAt: -1 });

export default mongoose.model("RetentionBonus", RetentionBonusSchema);
