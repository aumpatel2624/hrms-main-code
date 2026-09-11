import mongoose from "mongoose";

const ArrearDetailSchema = new mongoose.Schema(
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
 * ADR-028 — Payroll (Adjustments & Incentives).
 *
 * Arrear calculates retroactive salary differentials when a salary structure
 * revision is backdated over historical submitted salary slips.
 *
 * Reproduces source's positive-only behavior exactly (no negative clawback).
 * Child tables are editable before submit (per source fidelity).
 *
 * Submit action: creates an AdditionalSalary for each non-zero arrear row
 * and marks status as submitted.
 *
 * Cancel action: cascades cancellation to all linked AdditionalSalary records
 * (deliberate bug fix over source gap, ADR-028).
 */
const ArrearSchema = new mongoose.Schema(
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
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    payrollDate: {
      type: Date,
      required: true,
    },
    earningArrears: {
      type: [ArrearDetailSchema],
      default: [],
    },
    deductionArrears: {
      type: [ArrearDetailSchema],
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

ArrearSchema.index({ employeeId: 1 });
ArrearSchema.index({ companyId: 1 });
ArrearSchema.index({ payrollDate: 1 });
ArrearSchema.index({ status: 1 });
ArrearSchema.index({ createdAt: -1 });

export default mongoose.model("Arrear", ArrearSchema);
