import mongoose from "mongoose";
import { EmployeeBenefitDetailSchema } from "./SalaryStructure.js";

// ADR-026. No `toDate` field at all, deliberately — see
// `getCurrentSalaryStructureAssignment` (utils/payrollAssignment.js) for how
// "current as of a date" is resolved instead of stored. The only uniqueness
// invariant is exact-duplicate-fromDate-per-employee (index below); do not
// add an overlap guard.
const SalaryStructureAssignmentSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    salaryStructureId: { type: mongoose.Schema.Types.ObjectId, ref: "SalaryStructure", required: true },
    fromDate: { type: Date, required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    base: { type: Number, default: null, min: 0 },
    variable: { type: Number, default: null, min: 0 },
    // Fetched from the referenced SalaryStructure at save time.
    currency: { type: String, trim: true },
    // Fetched from the referenced SalaryStructure, defaulting only when the
    // assignment's own value isn't explicitly set (fetch_if_empty, Q-14).
    leaveEncashmentAmountPerDay: { type: Number, default: null, min: 0 },
    // Q-18 / ADR-029. Flexible benefit pool cap and employee component distributions.
    maxBenefits: { type: Number, default: null, min: 0 },
    employeeBenefits: { type: [EmployeeBenefitDetailSchema], default: [] },
    // Q-19 / ADR-030 (Tax & Exemptions). Reference to IncomeTaxSlab and opening tax balances.
    incomeTaxSlabId: { type: mongoose.Schema.Types.ObjectId, ref: "IncomeTaxSlab", default: null },
    taxDeductedTillDate: { type: Number, default: 0, min: 0 },
    taxableEarningsTillDate: { type: Number, default: 0, min: 0 },
    // Server-computed — see utils/payrollCtc.js.
    annualGrossEarning: { type: Number, default: 0 },
    ctc: { type: Number, default: 0 },
  },
  { timestamps: true },
);

SalaryStructureAssignmentSchema.index({ employeeId: 1 });
SalaryStructureAssignmentSchema.index({ salaryStructureId: 1 });
SalaryStructureAssignmentSchema.index({ companyId: 1 });
SalaryStructureAssignmentSchema.index({ fromDate: 1 });
SalaryStructureAssignmentSchema.index({ incomeTaxSlabId: 1 });
// The exact-duplicate-fromDate-for-the-same-employee guard, as a real unique
// index rather than a race-prone findOne check alone.
SalaryStructureAssignmentSchema.index({ employeeId: 1, fromDate: 1 }, { unique: true });
SalaryStructureAssignmentSchema.index({ employeeId: 1, fromDate: -1 });
SalaryStructureAssignmentSchema.index({ createdAt: -1 });

export default mongoose.model("SalaryStructureAssignment", SalaryStructureAssignmentSchema);
