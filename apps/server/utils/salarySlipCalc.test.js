// Pure-logic test (no DB) — hand-computed expected values for
// `calculateSalarySlip`, covering the exact fidelity points named in
// DECISIONS.md ADR-027: dependsOnPaymentDays-gated scaling (not "every row
// scales"), cascading proration through a dependent formula, statistical-
// component exclusion from gross, a condition-gated skip that can see the
// already-updated `grossPay` context, and employer contributions being
// computed but never included in any total.
import assert from "node:assert/strict";
import { calculateSalarySlip } from "./salarySlipCalc.js";

const structure = {
  earnings: [
    // Basic Salary — flat, depends on payment days. The only row that gets
    // pre-scaled by paymentDays/totalWorkingDays before evaluation.
    { abbreviation: "BS", dependsOnPaymentDays: true, amountBasedOnFormula: false, amount: 30000, statisticalComponent: false, doNotIncludeInTotal: false },
    // HRA — formula-based, NOT flagged dependsOnPaymentDays itself, but
    // inherits BS's proration automatically because it references BS's
    // (already-scaled) value from the eval context.
    { abbreviation: "HRA", dependsOnPaymentDays: false, amountBasedOnFormula: true, formula: "BS * 0.4", statisticalComponent: false },
    // A statistical component — referenceable by later formulas, but never
    // counted toward grossPay.
    { abbreviation: "SPL", dependsOnPaymentDays: false, amountBasedOnFormula: false, amount: 2000, statisticalComponent: true },
    // References the statistical row above — proves a statistical
    // component's value is usable in a formula even though it's excluded
    // from the total itself.
    { abbreviation: "BONUS", dependsOnPaymentDays: false, amountBasedOnFormula: true, formula: "SPL * 0.1", statisticalComponent: false },
  ],
  deductions: [
    { abbreviation: "PT", dependsOnPaymentDays: false, amountBasedOnFormula: false, amount: 1000 },
    // Condition references `grossPay`, which must already be the real,
    // updated total by the time deductions evaluate (ADR-026/027 ordering) —
    // always false here (42200/38000 is nowhere near 1,000,000), so this row
    // must be skipped entirely and contribute nothing to totalDeduction.
    { abbreviation: "BIGTAX", condition: "grossPay > 1000000", amountBasedOnFormula: false, amount: 5000 },
  ],
  employerContributions: [
    // Computed and shown, but must never affect grossPay/totalDeduction/netPay.
    { abbreviation: "PF", dependsOnPaymentDays: false, amountBasedOnFormula: false, amount: 500 },
  ],
};

const assignment = { base: 0, variable: 0 };

// Scenario A: full attendance — paymentDays === totalWorkingDays, ratio 1.
// Nothing should be scaled at all.
{
  const result = calculateSalarySlip({
    structure, assignment,
    paymentDaysResult: { paymentDays: 30, totalWorkingDays: 30 },
  });

  const byAbbr = (rows, abbr) => rows.find((r) => r.abbreviation === abbr);
  assert.equal(byAbbr(result.earnings, "BS").defaultAmount, 30000);
  assert.equal(byAbbr(result.earnings, "HRA").defaultAmount, 12000); // 30000 * 0.4
  assert.equal(byAbbr(result.earnings, "SPL").defaultAmount, 2000);
  assert.equal(byAbbr(result.earnings, "BONUS").defaultAmount, 200); // 2000 * 0.1
  assert.equal(result.grossPay, 42200); // 30000 + 12000 + 200 (SPL excluded, statistical)

  assert.equal(byAbbr(result.deductions, "PT").defaultAmount, 1000);
  const bigTax = byAbbr(result.deductions, "BIGTAX");
  assert.equal(bigTax._skipped, true);
  assert.equal(result.totalDeduction, 1000); // BIGTAX skipped, never counted

  assert.equal(result.netPay, 41200); // 42200 - 1000

  assert.equal(byAbbr(result.employerContributions, "PF").defaultAmount, 500);
}
console.log("salarySlipCalc: full attendance passed (gross 42200, netPay 41200)");

// Scenario B: paymentDays reduced to 27 of 30 (an LWP day, say) — ratio 0.9.
// Only BS (flagged dependsOnPaymentDays) is pre-scaled; HRA/BONUS inherit the
// reduction through their formulas; PT/PF (not flagged) stay full value.
{
  const result = calculateSalarySlip({
    structure, assignment,
    paymentDaysResult: { paymentDays: 27, totalWorkingDays: 30 },
  });
  const byAbbr = (rows, abbr) => rows.find((r) => r.abbreviation === abbr);

  assert.equal(byAbbr(result.earnings, "BS").defaultAmount, 27000); // 30000 * 0.9
  assert.equal(byAbbr(result.earnings, "HRA").defaultAmount, 10800); // 27000 * 0.4 — cascaded
  assert.equal(byAbbr(result.earnings, "SPL").defaultAmount, 2000); // not depends-on-payment-days -> unscaled
  assert.equal(byAbbr(result.earnings, "BONUS").defaultAmount, 200); // 2000 * 0.1, unaffected by ratio
  assert.equal(result.grossPay, 38000); // 27000 + 10800 + 200

  assert.equal(byAbbr(result.deductions, "PT").defaultAmount, 1000); // unscaled
  assert.equal(result.totalDeduction, 1000);
  assert.equal(result.netPay, 37000); // 38000 - 1000

  assert.equal(byAbbr(result.employerContributions, "PF").defaultAmount, 500); // unscaled
}
console.log("salarySlipCalc: LWP-reduced payment days passed (gross 38000, netPay 37000)");

// Scenario C: totalWorkingDays of 0 (a mid-period joiner clamped to nothing)
// must not divide by zero — ratio falls back to 0, so any
// dependsOnPaymentDays row resolves to 0 rather than throwing/NaN.
{
  const result = calculateSalarySlip({
    structure, assignment,
    paymentDaysResult: { paymentDays: 0, totalWorkingDays: 0 },
  });
  const byAbbr = (rows, abbr) => rows.find((r) => r.abbreviation === abbr);
  assert.equal(byAbbr(result.earnings, "BS").defaultAmount, 0);
  assert.equal(Number.isNaN(result.netPay), false);
}
console.log("salarySlipCalc: zero-totalWorkingDays guard passed (no divide-by-zero)");

console.log("salarySlipCalc: all cases passed");
