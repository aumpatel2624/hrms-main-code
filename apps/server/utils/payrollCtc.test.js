import assert from "node:assert";
import { evaluateComponentTable, computeStructureTotals, computeCtcAndGross, PERIODS_PER_YEAR } from "./payrollCtc.js";

// ---------------------------------------------------- evaluateComponentTable --
{
  const context = { base: 0, variable: 0 };
  const rows = [
    { salaryComponentId: "c1", abbreviation: "BS", amount: 1000, amountBasedOnFormula: false },
    { salaryComponentId: "c2", abbreviation: "HRA", amount: 0, amountBasedOnFormula: true, formula: "BS * 0.4" },
  ];
  const evaluated = evaluateComponentTable(rows, context);
  assert.strictEqual(evaluated[0].defaultAmount, 1000, "flat-amount row resolves to its amount");
  assert.strictEqual(evaluated[1].defaultAmount, 400, "formula row references an earlier row's abbreviation");
  assert.strictEqual(context.HRA, 400, "resolved amount is injected into context under its abbreviation");
}

// condition-gated row: skipped, contributes nothing, no context entry at all
{
  const context = { base: 0, variable: 0 };
  const rows = [
    { salaryComponentId: "c1", abbreviation: "BONUS", amount: 500, condition: "base > 100000" },
  ];
  const evaluated = evaluateComponentTable(rows, context);
  assert.strictEqual(evaluated[0]._skipped, true, "condition-false row is marked skipped");
  assert.strictEqual(evaluated[0].defaultAmount, 0, "a skipped row contributes 0");
  assert.strictEqual(Object.prototype.hasOwnProperty.call(context, "BONUS"), false, "a skipped row's abbreviation is NOT injected into context");
}
{
  const context = { base: 200000, variable: 0 };
  const rows = [{ salaryComponentId: "c1", abbreviation: "BONUS", amount: 500, condition: "base > 100000" }];
  const evaluated = evaluateComponentTable(rows, context);
  assert.strictEqual(evaluated[0]._skipped, false, "condition-true row is not skipped");
  assert.strictEqual(context.BONUS, 500, "a passing condition row still injects its abbreviation");
}

// ---------------------------------------------------------- structure totals --
// Hand-computed: Basic 30000 (earning), HRA = BS*0.4 = 12000 (earning),
// a statistical component worth 5000 excluded from totalEarning,
// PF deduction 1800 (flat), TDS = BS*0.1 = 3000 (formula deduction).
// totalEarning = 30000 + 12000 = 42000 (statistical row excluded)
// totalDeduction = 1800 + 3000 = 4800 (no exclusion rule for deductions)
// netPay = 42000 - 4800 = 37200
{
  const structure = {
    payrollFrequency: "Monthly",
    earnings: [
      { abbreviation: "BS", amount: 30000, amountBasedOnFormula: false },
      { abbreviation: "HRA", amount: 0, amountBasedOnFormula: true, formula: "BS * 0.4" },
      { abbreviation: "STAT", amount: 5000, amountBasedOnFormula: false, statisticalComponent: true },
    ],
    deductions: [
      { abbreviation: "PF", amount: 1800, amountBasedOnFormula: false },
      { abbreviation: "TDS", amount: 0, amountBasedOnFormula: true, formula: "BS * 0.1" },
    ],
    employerContributions: [],
  };
  const { totalEarning, totalDeduction, netPay } = computeStructureTotals(structure);
  assert.strictEqual(totalEarning, 42000, "totalEarning excludes the statistical row");
  assert.strictEqual(totalDeduction, 4800, "totalDeduction sums every deduction row, no exclusion");
  assert.strictEqual(netPay, 37200, "netPay = totalEarning - totalDeduction");
}

// doNotIncludeInTotal excludes an earning row from totalEarning too
{
  const structure = {
    payrollFrequency: "Monthly",
    earnings: [
      { abbreviation: "BS", amount: 20000 },
      { abbreviation: "NOTIONAL", amount: 3000, doNotIncludeInTotal: true },
    ],
    deductions: [],
    employerContributions: [],
  };
  const { totalEarning } = computeStructureTotals(structure);
  assert.strictEqual(totalEarning, 20000, "doNotIncludeInTotal excludes an earning row from totalEarning");
}

// ------------------------------------------------------------- CTC / gross --
// Hand-computed, Monthly (periods = 12): base = 50000, variable = 5000.
// Earnings: Basic = base = 50000, HRA = Basic * 0.4 = 20000.
// grossPerPeriod = 50000 + 20000 = 70000.
// Employer contributions: PF (employer share) = Basic * 0.12 = 6000.
// annualGrossEarning = 70000 * 12 = 840000.
// ctc = (70000 + 6000) * 12 = 76000 * 12 = 912000.
{
  const structure = {
    payrollFrequency: "Monthly",
    earnings: [
      { abbreviation: "BASIC", amount: 0, amountBasedOnFormula: true, formula: "base" },
      { abbreviation: "HRA", amount: 0, amountBasedOnFormula: true, formula: "BASIC * 0.4" },
    ],
    deductions: [],
    employerContributions: [
      { abbreviation: "EPF", amount: 0, amountBasedOnFormula: true, formula: "BASIC * 0.12" },
    ],
  };
  const assignment = { base: 50000, variable: 5000 };
  const { annualGrossEarning, ctc, grossPerPeriod, employerContributionsTotal } = computeCtcAndGross(structure, assignment);
  assert.strictEqual(grossPerPeriod, 70000, "grossPerPeriod = Basic + HRA");
  assert.strictEqual(employerContributionsTotal, 6000, "employerContributionsTotal = EPF");
  assert.strictEqual(annualGrossEarning, 840000, "annualGrossEarning = grossPerPeriod * 12");
  assert.strictEqual(ctc, 912000, "ctc = (grossPerPeriod + employerContributionsTotal) * 12");
}

// Different payrollFrequency changes the periods-per-year divisor.
// Weekly, periods = 52: grossPerPeriod = base = 10000 -> annualGrossEarning = 520000.
{
  const structure = {
    payrollFrequency: "Weekly",
    earnings: [{ abbreviation: "BASIC", amount: 0, amountBasedOnFormula: true, formula: "base" }],
    deductions: [],
    employerContributions: [],
  };
  const { annualGrossEarning, ctc } = computeCtcAndGross(structure, { base: 10000, variable: 0 });
  assert.strictEqual(PERIODS_PER_YEAR.Weekly, 52, "PERIODS_PER_YEAR.Weekly is 52");
  assert.strictEqual(annualGrossEarning, 520000, "Weekly frequency uses 52 periods/year");
  assert.strictEqual(ctc, 520000, "no employer contributions -> ctc == annualGrossEarning here");
}

console.log("payrollCtc.test.js: all assertions passed");
