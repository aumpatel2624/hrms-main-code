import mongoose from "mongoose";

/**
 * ADR-028 — Payroll (Adjustments & Incentives).
 *
 * Employee Other Income captures externally-declared income sources
 * (rental income, bank interest, freelance income, or house-property interest losses)
 * for future annualized income tax calculation (Tax & Exemptions module).
 *
 * Note on amount: can be negative (e.g. deductible home-loan interest).
 * Note on self-service: Employee role has own-scoped read/write rights.
 * Note on SalarySlip: does NOT generate AdditionalSalary and does not merge
 * into SalarySlip component tables.
 */
const EmployeeOtherIncomeSchema = new mongoose.Schema(
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
    source: {
      type: String,
      required: true,
      trim: true,
      default: "Other Income",
    },
    amount: {
      type: Number,
      required: true,
      // Deliberately no `min: 0` validator — can be negative (e.g. housing loan interest loss)
    },
    date: {
      type: Date,
      default: Date.now,
      required: true,
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

EmployeeOtherIncomeSchema.index({ employeeId: 1 });
EmployeeOtherIncomeSchema.index({ companyId: 1 });
EmployeeOtherIncomeSchema.index({ payrollPeriodId: 1 });
EmployeeOtherIncomeSchema.index({ status: 1 });
EmployeeOtherIncomeSchema.index({ createdAt: -1 });

export default mongoose.model("EmployeeOtherIncome", EmployeeOtherIncomeSchema);
