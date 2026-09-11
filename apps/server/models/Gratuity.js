import mongoose from "mongoose";

/**
 * ADR-031 (Payroll — Gratuity). Folded-docstatus doctype (draft/submitted/
 * cancelled, the standard ADR-016 shape) tracking one employee's gratuity
 * payout. `currentWorkExperience` and `amount` are server-computed at
 * submit time (see utils/gratuityCalc.js) unless the linked Gratuity Rule's
 * `workExperienceCalculationFunction` is "Manual", in which case
 * `currentWorkExperience` is client-supplied and only `amount` is computed.
 *
 * Submit creates an active AdditionalSalary (refDoctype: "Gratuity"),
 * exactly the RetentionBonus/EmployeeIncentive pattern (ADR-028). Cancel
 * cascades to cancel that linked AdditionalSalary — a deliberate fix of a
 * real source asymmetry (source only ever reverses gratuity's now-dropped
 * GL branch on cancel, never touches the Additional Salary branch).
 *
 * No payViaSalarySlip toggle and none of source's GL-only payment-tab
 * fields (paidAmount, or any general-ledger posting target) are ported —
 * the entire GL payout branch is dropped project-wide (ADR-016), leaving
 * AdditionalSalary as the only payout path.
 */
const GratuitySchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    postingDate: { type: Date, default: Date.now, required: true },
    gratuityRuleId: { type: mongoose.Schema.Types.ObjectId, ref: "GratuityRule", required: true },
    currentWorkExperience: { type: Number, default: 0, min: 0 },
    amount: { type: Number, default: 0, min: 0 },
    payrollDate: { type: Date, required: true },
    salaryComponentId: { type: mongoose.Schema.Types.ObjectId, ref: "SalaryComponent", required: true },
    additionalSalaryId: { type: mongoose.Schema.Types.ObjectId, ref: "AdditionalSalary", default: null },
    status: { type: String, enum: ["draft", "submitted", "cancelled"], default: "draft", required: true },
  },
  { timestamps: true },
);

GratuitySchema.index({ employeeId: 1 });
GratuitySchema.index({ companyId: 1 });
GratuitySchema.index({ gratuityRuleId: 1 });
GratuitySchema.index({ salaryComponentId: 1 });
GratuitySchema.index({ status: 1 });
GratuitySchema.index({ postingDate: 1 });
GratuitySchema.index({ payrollDate: 1 });
GratuitySchema.index({ createdAt: -1 });

export default mongoose.model("Gratuity", GratuitySchema);
