// Pure-logic test (no DB) — hand-computed expected values for
// `calculateSalarySlip`, covering the exact fidelity points named in
// DECISIONS.md ADR-027: dependsOnPaymentDays-gated scaling (not "every row
// scales"), cascading proration through a dependent formula, statistical-
// component exclusion from gross, a condition-gated skip that can see the
// already-updated `grossPay` context, and employer contributions being
// computed but never included in any total.
//
// ADR-028: tests AdditionalSalary integration — one-off inside period,
// recurring overlapping period, overwrite replacing existing row,
// non-overwrite adding to existing row, and brand-new component inserted.
import assert from "node:assert/strict";
import { calculateSalarySlip, mergeAdditionalSalaries, isAdditionalSalaryInPeriod } from "./salarySlipCalc.js";

const COMP_BS = "600000000000000000000001";
const COMP_HRA = "600000000000000000000002";
const COMP_SPL = "600000000000000000000003";
const COMP_BONUS = "600000000000000000000004";
const COMP_PT = "600000000000000000000005";
const COMP_BIGTAX = "600000000000000000000006";
const COMP_PF = "600000000000000000000007";
const COMP_INCENTIVE = "600000000000000000000008";
const COMP_ALLOWANCE = "600000000000000000000009";
const COMP_DED_ADJ = "600000000000000000000010";

const structure = {
  earnings: [
    // Basic Salary — flat, depends on payment days.
    {
      salaryComponentId: COMP_BS,
      abbreviation: "BS",
      dependsOnPaymentDays: true,
      amountBasedOnFormula: false,
      amount: 30000,
      statisticalComponent: false,
      doNotIncludeInTotal: false,
    },
    // HRA — formula-based, NOT flagged dependsOnPaymentDays itself, but
    // inherits BS's proration automatically because it references BS's
    // (already-scaled) value from the eval context.
    {
      salaryComponentId: COMP_HRA,
      abbreviation: "HRA",
      dependsOnPaymentDays: false,
      amountBasedOnFormula: true,
      formula: "BS * 0.4",
      statisticalComponent: false,
    },
    // A statistical component — referenceable by later formulas, but never
    // counted toward grossPay.
    {
      salaryComponentId: COMP_SPL,
      abbreviation: "SPL",
      dependsOnPaymentDays: false,
      amountBasedOnFormula: false,
      amount: 2000,
      statisticalComponent: true,
    },
    // References the statistical row above — proves a statistical
    // component's value is usable in a formula even though it's excluded
    // from the total itself.
    {
      salaryComponentId: COMP_BONUS,
      abbreviation: "BONUS",
      dependsOnPaymentDays: false,
      amountBasedOnFormula: true,
      formula: "SPL * 0.1",
      statisticalComponent: false,
    },
  ],
  deductions: [
    {
      salaryComponentId: COMP_PT,
      abbreviation: "PT",
      dependsOnPaymentDays: false,
      amountBasedOnFormula: false,
      amount: 1000,
    },
    {
      salaryComponentId: COMP_BIGTAX,
      abbreviation: "BIGTAX",
      condition: "grossPay > 1000000",
      amountBasedOnFormula: false,
      amount: 5000,
    },
  ],
  employerContributions: [
    {
      salaryComponentId: COMP_PF,
      abbreviation: "PF",
      dependsOnPaymentDays: false,
      amountBasedOnFormula: false,
      amount: 500,
    },
  ],
};

const assignment = { base: 0, variable: 0 };

// Scenario A: full attendance — paymentDays === totalWorkingDays, ratio 1.
// Nothing should be scaled at all.
{
  const result = calculateSalarySlip({
    structure,
    assignment,
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
    structure,
    assignment,
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
    structure,
    assignment,
    paymentDaysResult: { paymentDays: 0, totalWorkingDays: 0 },
  });
  const byAbbr = (rows, abbr) => rows.find((r) => r.abbreviation === abbr);
  assert.equal(byAbbr(result.earnings, "BS").defaultAmount, 0);
  assert.equal(Number.isNaN(result.netPay), false);
}
console.log("salarySlipCalc: zero-totalWorkingDays guard passed (no divide-by-zero)");

// ============================================================================
// ADR-028 Scenarios: AdditionalSalary Integration Tests
// ============================================================================

// Scenario D: Period Date Matching (isAdditionalSalaryInPeriod helper)
{
  const startDate = new Date("2026-06-01T00:00:00.000Z");
  const endDate = new Date("2026-06-30T23:59:59.999Z");

  // One-off inside period
  assert.equal(
    isAdditionalSalaryInPeriod(
      { isRecurring: false, payrollDate: new Date("2026-06-15") },
      startDate,
      endDate,
    ),
    true,
  );

  // One-off outside period (after)
  assert.equal(
    isAdditionalSalaryInPeriod(
      { isRecurring: false, payrollDate: new Date("2026-07-01") },
      startDate,
      endDate,
    ),
    false,
  );

  // One-off outside period (before)
  assert.equal(
    isAdditionalSalaryInPeriod(
      { isRecurring: false, payrollDate: new Date("2026-05-31") },
      startDate,
      endDate,
    ),
    false,
  );

  // Recurring overlapping period (starts before, ends inside)
  assert.equal(
    isAdditionalSalaryInPeriod(
      { isRecurring: true, fromDate: new Date("2026-05-01"), toDate: new Date("2026-06-15") },
      startDate,
      endDate,
    ),
    true,
  );

  // Recurring overlapping period (starts inside, ends after)
  assert.equal(
    isAdditionalSalaryInPeriod(
      { isRecurring: true, fromDate: new Date("2026-06-15"), toDate: new Date("2026-07-31") },
      startDate,
      endDate,
    ),
    true,
  );

  // Recurring spanning across the entire period
  assert.equal(
    isAdditionalSalaryInPeriod(
      { isRecurring: true, fromDate: new Date("2026-01-01"), toDate: new Date("2026-12-31") },
      startDate,
      endDate,
    ),
    true,
  );

  // Recurring completely before
  assert.equal(
    isAdditionalSalaryInPeriod(
      { isRecurring: true, fromDate: new Date("2026-01-01"), toDate: new Date("2026-05-31") },
      startDate,
      endDate,
    ),
    false,
  );

  // Recurring completely after
  assert.equal(
    isAdditionalSalaryInPeriod(
      { isRecurring: true, fromDate: new Date("2026-07-01"), toDate: new Date("2026-12-31") },
      startDate,
      endDate,
    ),
    false,
  );
}
console.log("salarySlipCalc: AdditionalSalary period matching passed");

// Scenario E: Rich Multi-Adjustment Merge with Hand-Computed Totals
// Pay period: 2026-06-01 to 2026-06-30, full attendance (30/30)
// Base calculation would yield:
//   BS = 30000, HRA = 12000, SPL = 2000 (stat), BONUS = 200 -> Gross = 42200
//   PT = 1000 -> TotalDeduction = 1000
//   NetPay = 41200
// Now apply 5 distinct adjustments:
// 1. One-off overwrite on BS: replaces BS 30000 with 35000.
// 2. One-off non-overwrite on HRA: adds 3000 to HRA (12000 + 3000 = 15000).
// 3. One-off brand-new Earning component "INCENTIVE": inserts new row 5000.
// 4. Recurring brand-new Earning component "ALLOWANCE": inserts new row 2000 (overlapping 2026-05-01 to 2026-08-31).
// 5. One-off outside period (2026-07-15): amount 99999 -> MUST BE IGNORED.
// 6. One-off brand-new Deduction component "DED_ADJ": inserts new deduction 1500.
//
// Hand-computed expected totals:
//   Earnings:
//     BS: 35000 (overwritten)
//     HRA: 15000 (12000 + 3000 additive)
//     SPL: 2000 (statistical, excluded from gross)
//     BONUS: 200 (formula from SPL)
//     INCENTIVE: 5000 (inserted)
//     ALLOWANCE: 2000 (inserted)
//     Gross Pay = 35000 + 15000 + 200 + 5000 + 2000 = 57,200
//   Deductions:
//     PT: 1000
//     DED_ADJ: 1500 (inserted)
//     Total Deduction = 1000 + 1500 = 2,500
//   Net Pay = 57200 - 2500 = 54,700
{
  const startDate = new Date("2026-06-01T00:00:00.000Z");
  const endDate = new Date("2026-06-30T23:59:59.999Z");

  const additionalSalaries = [
    // 1. Overwrite existing BS
    {
      salaryComponentId: COMP_BS,
      abbreviation: "BS",
      type: "Earning",
      amount: 35000,
      isRecurring: false,
      payrollDate: new Date("2026-06-15"),
      overwriteSalaryStructureAmount: true,
      status: "active",
    },
    // 2. Additive to existing HRA
    {
      salaryComponentId: COMP_HRA,
      abbreviation: "HRA",
      type: "Earning",
      amount: 3000,
      isRecurring: false,
      payrollDate: new Date("2026-06-20"),
      overwriteSalaryStructureAmount: false,
      status: "active",
    },
    // 3. New earning component
    {
      salaryComponentId: COMP_INCENTIVE,
      abbreviation: "INCENTIVE",
      type: "Earning",
      amount: 5000,
      isRecurring: false,
      payrollDate: new Date("2026-06-25"),
      overwriteSalaryStructureAmount: false,
      status: "active",
    },
    // 4. Recurring new component
    {
      salaryComponentId: COMP_ALLOWANCE,
      abbreviation: "ALLW",
      type: "Earning",
      amount: 2000,
      isRecurring: true,
      fromDate: new Date("2026-05-01"),
      toDate: new Date("2026-08-31"),
      overwriteSalaryStructureAmount: false,
      status: "active",
    },
    // 5. Outside pay period -> ignored
    {
      salaryComponentId: "600000000000000000000099",
      abbreviation: "IGNORE_ME",
      type: "Earning",
      amount: 99999,
      isRecurring: false,
      payrollDate: new Date("2026-07-15"),
      overwriteSalaryStructureAmount: false,
      status: "active",
    },
    // 6. New deduction adjustment
    {
      salaryComponentId: COMP_DED_ADJ,
      abbreviation: "DED_ADJ",
      type: "Deduction",
      amount: 1500,
      isRecurring: false,
      payrollDate: new Date("2026-06-10"),
      overwriteSalaryStructureAmount: false,
      status: "active",
    },
  ];

  const result = calculateSalarySlip({
    structure,
    assignment,
    paymentDaysResult: { paymentDays: 30, totalWorkingDays: 30 },
    additionalSalaries,
    startDate,
    endDate,
  });

  const byCompId = (rows, id) => rows.find((r) => String(r.salaryComponentId?._id || r.salaryComponentId) === id);

  // 1. Overwrite verified
  const bsRow = byCompId(result.earnings, COMP_BS);
  assert.ok(bsRow, "BS row must exist");
  assert.equal(bsRow.defaultAmount, 35000, "BS row should be overwritten to 35000");
  assert.equal(bsRow.dependsOnPaymentDays, false, "Overwritten adjustment row must be dependsOnPaymentDays: false");

  // 2. Additive verified
  const hraRow = byCompId(result.earnings, COMP_HRA);
  assert.ok(hraRow, "HRA row must exist");
  assert.equal(hraRow.defaultAmount, 15000, "HRA row should be 12000 + 3000 = 15000");

  // 3. New inserted earning verified
  const incentiveRow = byCompId(result.earnings, COMP_INCENTIVE);
  assert.ok(incentiveRow, "INCENTIVE row must be inserted");
  assert.equal(incentiveRow.defaultAmount, 5000);
  assert.equal(incentiveRow.dependsOnPaymentDays, false, "Inserted adjustment must have dependsOnPaymentDays: false");

  // 4. Recurring inserted earning verified
  const allwRow = byCompId(result.earnings, COMP_ALLOWANCE);
  assert.ok(allwRow, "ALLOWANCE row must be inserted");
  assert.equal(allwRow.defaultAmount, 2000);
  assert.equal(allwRow.dependsOnPaymentDays, false);

  // 5. Outside row ignored verified
  const ignoredRow = byCompId(result.earnings, "600000000000000000000099");
  assert.equal(ignoredRow, undefined, "Adjustment outside pay period must be excluded");

  // 6. New deduction verified
  const dedAdjRow = byCompId(result.deductions, COMP_DED_ADJ);
  assert.ok(dedAdjRow, "DED_ADJ deduction must be inserted");
  assert.equal(dedAdjRow.defaultAmount, 1500);
  assert.equal(dedAdjRow.dependsOnPaymentDays, false);

  // Totals verification against hand-computed values:
  assert.equal(result.grossPay, 57200, "Gross Pay must equal hand-computed 57200");
  assert.equal(result.totalDeduction, 2500, "Total Deduction must equal hand-computed 2500");
  assert.equal(result.netPay, 54700, "Net Pay must equal hand-computed 54700");
}
console.log("salarySlipCalc: full AdditionalSalary merge passed (gross 57200, totalDeduction 2500, netPay 54700)");

console.log("salarySlipCalc: all cases passed");
