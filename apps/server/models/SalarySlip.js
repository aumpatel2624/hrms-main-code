import mongoose from "mongoose";
import { SalaryDetailSchema } from "./SalaryStructure.js";

/**
 * ADR-027 (Payroll — Run, foundation half). The real payroll-run document —
 * one payslip for one employee for one period. Every figure on it (payment
 * days, the three component tables, the leave snapshot, the totals) is
 * computed once at creation time from `utils/payrollPaymentDays.js` +
 * `utils/salarySlipCalc.js` and stored — a Salary Slip is a point-in-time
 * snapshot, never recomputed live afterward (matches source: re-opening a
 * draft *would* re-run the calculation in source, but nothing in this
 * project's admin UI re-opens a saved slip for editing — create/submit/
 * cancel are the only three actions — so "recompute on every save" doesn't
 * apply here; see DECISIONS.md ADR-027 "As built" for the full reasoning).
 *
 * Reuses the exact same `SalaryDetailSchema` `SalaryStructure` uses for its
 * own earnings/deductions/employerContributions (AGENTS.md #2) — copied from
 * the resolved assignment's structure at slip-creation time, same one-time
 * denormalization behavior ADR-026 already established.
 *
 * No tax breakup, no timesheet, no loan, no journalEntry/modeOfPayment —
 * all permanently/forward deferred per ADR-027.
 */
const LeaveSnapshotSchema = new mongoose.Schema(
  {
    leaveTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "LeaveType", required: true },
    // A deliberately scoped-down 3-field snapshot (allocated/used/available)
    // rather than source's 5-field `Salary Slip Leave`
    // (total_allocated_leaves/expired_leaves/used_leaves/pending_leaves/
    // available_leaves) — `expired_leaves`/`pending_leaves` need
    // infrastructure (expiry-aware allocation walking, a pending-approval
    // leave-days sum) this project hasn't built; see ADR-027 "As built".
    allocated: { type: Number, default: 0 },
    used: { type: Number, default: 0 },
    available: { type: Number, default: 0 },
  },
  { _id: false },
);

const SalarySlipSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    salaryStructureAssignmentId: { type: mongoose.Schema.Types.ObjectId, ref: "SalaryStructureAssignment", required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    // Payment-days snapshot — populated once from computePaymentDays() at
    // creation, never recomputed live afterward.
    workingDays: { type: Number, default: 0 },
    totalWorkingDays: { type: Number, default: 0 },
    paymentDays: { type: Number, default: 0 },
    lwpDays: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    halfDayDays: { type: Number, default: 0 },

    earnings: { type: [SalaryDetailSchema], default: [] },
    deductions: { type: [SalaryDetailSchema], default: [] },
    employerContributions: { type: [SalaryDetailSchema], default: [] },

    // Server-computed — see utils/salarySlipCalc.js. Never trust a
    // client-supplied value for these three.
    grossPay: { type: Number, default: 0 },
    totalDeduction: { type: Number, default: 0 },
    netPay: { type: Number, default: 0 },

    // Read-only snapshot, one row per Leave Type covering this employee, as
    // of endDate — populated at creation only when Payroll Settings'
    // showLeaveBalancesInSalarySlip is on.
    leaves: { type: [LeaveSnapshotSchema], default: [] },

    // Q-21 / ADR-030 (Tax & Exemptions). Snapshot fields from computeIncomeTaxBreakup.
    annualTaxableEarning: { type: Number, default: 0 },
    annualIncomeTax: { type: Number, default: 0 },
    incomeTaxDeduction: { type: Number, default: 0 },
    totalTaxDeductedTillDate: { type: Number, default: 0 },
    totalExemptionAmount: { type: Number, default: 0 },
    remainingSubPeriods: { type: Number, default: 0 },

    // Docstatus folds to this explicit enum (ADR-016 pattern, same as every
    // other submittable doctype in this port) — draft/submitted/withheld/
    // cancelled, matching source's real, additional state dimension.
    // "withheld" is not set by this foundation half (Salary Withholding is
    // built on the second stacked branch) but the value is reserved here so
    // that branch doesn't need a schema migration to add it later.
    status: { type: String, enum: ["draft", "submitted", "withheld", "cancelled"], default: "draft", required: true },
  },
  { timestamps: true },
);

SalarySlipSchema.index({ employeeId: 1 });
SalarySlipSchema.index({ salaryStructureAssignmentId: 1 });
SalarySlipSchema.index({ companyId: 1 });
SalarySlipSchema.index({ startDate: 1 });
SalarySlipSchema.index({ endDate: 1 });
SalarySlipSchema.index({ status: 1 });
// The exact-duplicate-(employeeId,startDate,endDate) guard, as a real unique
// index rather than a race-prone findOne check alone (matches source's own
// `check_existing()` invariant, and this project's SalaryStructureAssignment
// precedent for the same class of guard).
SalarySlipSchema.index({ employeeId: 1, startDate: 1, endDate: 1 }, { unique: true });
SalarySlipSchema.index({ createdAt: -1 });

export default mongoose.model("SalarySlip", SalarySlipSchema);
