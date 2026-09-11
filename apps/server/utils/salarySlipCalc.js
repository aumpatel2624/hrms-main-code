/**
 * ADR-027 (Payroll — Run). The real Salary Slip calculation — reuses the
 * *unchanged* `evaluateComponentTable` (utils/payrollCtc.js) with a richer
 * context (Q-17: "the formula evaluator's context grows, not a second
 * engine") rather than writing a second formula-evaluation pass.
 *
 * **The `dependsOnPaymentDays` scaling question, settled from the real spec**
 * (`Salary Slip.md` section I, `get_amount_based_on_payment_days`): only a
 * row flagged `dependsOnPaymentDays` is scaled by `paymentDays /
 * totalWorkingDays` — a row without that flag keeps its full, unprorated
 * value. This is NOT "every row scales" — that would be wrong for e.g. a
 * flat statutory deduction that's owed in full regardless of attendance.
 *
 * The scaling is applied to each row's flat `amount` field *before*
 * `evaluateComponentTable` runs (not to the post-formula result), so a
 * formula on a LATER row that references an EARLIER flat row's abbreviation
 * naturally sees the already-prorated value — this is exactly the cascading
 * behavior the real spec calls out ("SA = BS * 0.5 inherits BS's own
 * proration automatically because BS's prorated value is what's stored under
 * its abbr in the eval context"). The one known gap this leaves, recorded as
 * a judgment call (DECISIONS.md ADR-027 "As built"): a *formula-based* row
 * that is itself flagged `dependsOnPaymentDays` is not separately re-scaled
 * after its own formula evaluates (pre-scaling its inert `amount` field has
 * no effect on a formula path) — proration reaches it only through its
 * inputs already being scaled. In practice every component in this project's
 * seeded structures that depends on payment days is a flat row (Basic
 * Salary), so this gap is real but narrow.
 */
import { evaluateComponentTable } from "./payrollCtc.js";
import { computePaymentDays } from "./payrollPaymentDays.js";

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * Scales `rows` (plain SalaryDetail-shaped objects or Mongoose subdocuments)
 * by `paymentDays / totalWorkingDays` for any row flagged `dependsOnPaymentDays`,
 * then evaluates the table against `context` via the unchanged
 * `evaluateComponentTable`. Mutates nothing; returns the evaluated rows.
 */
const scaleAndEvaluate = (rows, context, paymentDays, totalWorkingDays) => {
  const ratio = totalWorkingDays > 0 ? paymentDays / totalWorkingDays : 0;
  const scaledRows = (rows || []).map((row) => {
    const plain = typeof row.toObject === "function" ? row.toObject() : { ...row };
    if (plain.dependsOnPaymentDays) {
      plain.amount = round2((Number(plain.amount) || 0) * ratio);
    }
    return plain;
  });
  return evaluateComponentTable(scaledRows, context);
};

/**
 * Computes the full Salary Slip calculation: payment days + the three
 * scaled/evaluated component tables + totals. Pure with respect to its
 * inputs (`structure`/`assignment`/`paymentDaysResult` are already-resolved
 * data) — no DB access of its own, so it's directly unit-testable.
 *
 * @param {object} args
 * @param {object} args.structure — a `SalaryStructure` document (earnings[]/deductions[]/employerContributions[]).
 * @param {object} args.assignment — a `SalaryStructureAssignment` document (base/variable).
 * @param {{paymentDays:number, totalWorkingDays:number}} args.paymentDaysResult — from `computePaymentDays`/`calculatePaymentDays`.
 */
export const calculateSalarySlip = ({ structure, assignment, paymentDaysResult }) => {
  const { paymentDays, totalWorkingDays } = paymentDaysResult;
  const context = {
    base: Number(assignment?.base) || 0,
    variable: Number(assignment?.variable) || 0,
    paymentDays,
    totalWorkingDays,
    grossPay: 0,
    netPay: 0,
  };

  const earnings = scaleAndEvaluate(structure.earnings, context, paymentDays, totalWorkingDays);
  const grossPay = round2(earnings
    .filter((r) => !r._skipped && !r.statisticalComponent && !r.doNotIncludeInTotal)
    .reduce((sum, r) => sum + r.defaultAmount, 0));
  context.grossPay = grossPay; // updated in context after earnings, before deductions (ADR-026/027 ordering)

  const deductions = scaleAndEvaluate(structure.deductions, context, paymentDays, totalWorkingDays);
  const totalDeduction = round2(deductions
    .filter((r) => !r._skipped)
    .reduce((sum, r) => sum + r.defaultAmount, 0));

  const netPay = round2(grossPay - totalDeduction);
  context.netPay = netPay;

  // Employer contributions: computed and displayed but never included in
  // gross/deduction/net pay (matches source exactly, and module 10's own
  // computeCtcAndGross precedent).
  const employerContributions = scaleAndEvaluate(structure.employerContributions, context, paymentDays, totalWorkingDays);

  return { earnings, deductions, employerContributions, grossPay, totalDeduction, netPay };
};

/**
 * Convenience wrapper: resolves payment days via the DB-backed
 * `computePaymentDays` and then runs `calculateSalarySlip`. Used by the
 * controller; kept separate so `calculateSalarySlip` itself stays DB-free
 * and directly testable.
 */
export const calculateSalarySlipForEmployee = async ({ employeeId, startDate, endDate, settings, structure, assignment }) => {
  const paymentDaysResult = await computePaymentDays({ employeeId, startDate, endDate, settings });
  const calc = calculateSalarySlip({ structure, assignment, paymentDaysResult });
  return { ...paymentDaysResult, ...calc };
};
