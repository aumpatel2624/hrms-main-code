import mongoose from "mongoose";

// ADR-026. Salary Detail row shape, shared by earnings[]/deductions[]/
// employerContributions[]. `abbreviation` through `accrualComponent` are a
// ONE-TIME denormalized copy of the referenced SalaryComponent's flags at
// row-creation time (ADR-026: historical rows must not retroactively change
// if the master component is edited later) — copied by the controller, not
// by a schema default/hook, since "creation time" for a row added on a later
// update is that update, not the document's own createdAt. Each row's copy
// stays independently editable afterward.
// Exported (ADR-027, Payroll — Run) so `SalarySlip` can reuse the exact same
// row shape for its own earnings[]/deductions[]/employerContributions[]
// tables — same "one-time denormalized copy" reasoning as here, just copied
// from the resolved SalaryStructureAssignment's structure at slip-creation
// time instead of at structure-authoring time (AGENTS.md #2: reuse before
// you write).
export const SalaryDetailSchema = new mongoose.Schema(
  {
    salaryComponentId: { type: mongoose.Schema.Types.ObjectId, ref: "SalaryComponent", required: true },
    abbreviation: { type: String, trim: true },
    statisticalComponent: { type: Boolean, default: false },
    isTaxApplicable: { type: Boolean, default: false },
    variableBasedOnTaxableSalary: { type: Boolean, default: false },
    dependsOnPaymentDays: { type: Boolean, default: false },
    exemptedFromIncomeTax: { type: Boolean, default: false },
    doNotIncludeInTotal: { type: Boolean, default: false },
    accrualComponent: { type: Boolean, default: false },
    condition: { type: String, default: "" },
    amountBasedOnFormula: { type: Boolean, default: false },
    formula: { type: String, default: "" },
    // Required unless amountBasedOnFormula — enforced in the controller
    // (a Mongoose conditional-required needs the sibling field, which a
    // plain schema-level required fn can also read via `this`).
    amount: {
      type: Number,
      required: function () { return !this.amountBasedOnFormula; },
      default: 0,
      min: 0,
    },
    // Server-computed on every SalaryStructure save (and again, with real
    // base/variable, on SalaryStructureAssignment save) — the evaluated
    // result of `formula`/`amount`, after any `condition` gate. Never
    // trusted from the client.
    defaultAmount: { type: Number, default: 0 },
  },
  { _id: true },
);

const SalaryStructureSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    // Server-required (ADR-026 closes a flagged source gap: source only
    // requires this client-side).
    payrollFrequency: { type: String, enum: ["Monthly", "Fortnightly", "Bimonthly", "Weekly", "Daily"], required: true },
    isActive: { type: Boolean, default: true, required: true },
    // Q-14. Optional — the per-day Leave Encashment rate this structure
    // carries forward onto every SalaryStructureAssignment referencing it.
    leaveEncashmentAmountPerDay: { type: Number, default: null, min: 0 },
    currency: { type: String, required: true, trim: true },
    earnings: { type: [SalaryDetailSchema], default: [] },
    deductions: { type: [SalaryDetailSchema], default: [] },
    employerContributions: { type: [SalaryDetailSchema], default: [] },
    // Server-computed on every create/update (ADR-026 closes a flagged
    // source gap: source computes these client-JS-only, with no server
    // equivalent) — never trust a client-supplied value for these three.
    totalEarning: { type: Number, default: 0 },
    totalDeduction: { type: Number, default: 0 },
    netPay: { type: Number, default: 0 },
  },
  { timestamps: true },
);

SalaryStructureSchema.index({ companyId: 1 });
SalaryStructureSchema.index({ payrollFrequency: 1 });
SalaryStructureSchema.index({ isActive: 1, createdAt: -1 });
SalaryStructureSchema.index({ createdAt: -1 });

export default mongoose.model("SalaryStructure", SalaryStructureSchema);
