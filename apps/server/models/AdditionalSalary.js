import mongoose from "mongoose";

/**
 * ADR-028 — Payroll (Adjustments & Incentives).
 *
 * The universal ingestion primitive for all ad-hoc and recurring payroll
 * adjustments. Every other adjustment doctype (Retention Bonus, Employee
 * Incentive, Arrear, and external referral/gratuity producers) routes
 * through here — creating an active AdditionalSalary record that is queried
 * and merged by SalarySlip calculation.
 *
 * Dates: exactly one of `payrollDate` (one-off) OR `fromDate`/`toDate`
 * (recurring) must be set.
 *
 * Status: `active` or `cancelled`. No separate draft state per ADR-028
 * (every producer creates this already-active).
 *
 * Overwrite: when `overwriteSalaryStructureAmount` is true, replaces the
 * component's base amount on the Salary Slip. Save-time validation prevents
 * multiple active overwrite rows from overlapping for the same employee and
 * component.
 */
const AdditionalSalarySchema = new mongoose.Schema(
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
    // Denormalized once at creation from SalaryComponent.type ("Earning" or "Deduction")
    type: {
      type: String,
      enum: ["Earning", "Deduction"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    fromDate: {
      type: Date,
      default: null,
    },
    toDate: {
      type: Date,
      default: null,
    },
    payrollDate: {
      type: Date,
      default: null,
    },
    overwriteSalaryStructureAmount: {
      type: Boolean,
      default: false,
    },
    deductFullTaxOnSelectedPayrollDate: {
      type: Boolean,
      default: false,
    },
    currency: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "cancelled"],
      default: "active",
      required: true,
    },
    // Polymorphic back-reference (ADR-024 / ADR-028 pattern)
    refDoctype: {
      type: String,
      enum: ["RetentionBonus", "EmployeeIncentive", "Arrear", null],
      default: null,
    },
    refDocnameId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  { timestamps: true },
);

AdditionalSalarySchema.index({ employeeId: 1, salaryComponentId: 1 });
AdditionalSalarySchema.index({ companyId: 1 });
AdditionalSalarySchema.index({ status: 1 });
AdditionalSalarySchema.index({ payrollDate: 1 });
AdditionalSalarySchema.index({ fromDate: 1, toDate: 1 });
AdditionalSalarySchema.index({ refDoctype: 1, refDocnameId: 1 });
AdditionalSalarySchema.index({ createdAt: -1 });

export default mongoose.model("AdditionalSalary", AdditionalSalarySchema);
