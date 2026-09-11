/**
 * ADR-026. Pure calculation utilities shared by `SalaryStructure` (its own
 * server-computed totalEarning/totalDeduction/netPay) and
 * `SalaryStructureAssignment` (annualGrossEarning/ctc) — both need the same
 * "evaluate a table of Salary Detail rows against a shared context" pass, so
 * it lives once here rather than being written twice (AGENTS.md #2).
 *
 * `evaluateComponentTable` mirrors source's `_evaluate_component_table`
 * exactly: rows are walked in table order, a `condition`-gated row that
 * evaluates false is skipped entirely (its abbreviation is NOT injected into
 * `context` — it contributes nothing, matching source's own "continue"
 * before injection), otherwise its `defaultAmount` is either the evaluated
 * `formula` (when `amountBasedOnFormula`) or the static `amount`, and that
 * value is injected into `context[row.abbreviation]` so a *later* row/table
 * can reference it by abbreviation (earnings before deductions before
 * employer contributions).
 */
import { evaluateFormula, evaluateCondition } from "./payrollFormula.js";

export const PERIODS_PER_YEAR = { Monthly: 12, Fortnightly: 26, Bimonthly: 24, Weekly: 52, Daily: 365 };

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * Evaluates one earnings/deductions/employerContributions table in place
 * against `context` (mutated: each resolved row's abbreviation is injected
 * so later rows/tables can reference it). Returns a new array of rows, each
 * carrying `defaultAmount` (0 and `_skipped: true` for a condition-gated row
 * that evaluated false) — the caller decides which rows count toward which
 * total.
 */
export const evaluateComponentTable = (rows, context) => {
  const evaluated = [];
  for (const row of rows || []) {
    const plain = typeof row.toObject === "function" ? row.toObject() : { ...row };

    if (plain.condition) {
      let passes;
      try {
        passes = evaluateCondition(plain.condition, context);
      } catch (error) {
        throw new Error(`Row "${plain.abbreviation || plain.salaryComponentId}": condition error — ${error.message}`);
      }
      if (!passes) {
        evaluated.push({ ...plain, defaultAmount: 0, _skipped: true });
        continue;
      }
    }

    let defaultAmount;
    if (plain.amountBasedOnFormula && plain.formula) {
      try {
        defaultAmount = evaluateFormula(plain.formula, context);
      } catch (error) {
        throw new Error(`Row "${plain.abbreviation || plain.salaryComponentId}": formula error — ${error.message}`);
      }
    } else {
      defaultAmount = Number(plain.amount) || 0;
    }

    evaluated.push({ ...plain, defaultAmount, _skipped: false });
    if (plain.abbreviation) context[plain.abbreviation] = defaultAmount;
  }
  return evaluated;
};

/**
 * Structure-level totals (no assignment/base/variable context yet — those
 * default to 0, per ADR-026). `totalEarning` excludes rows flagged
 * `statisticalComponent`/`doNotIncludeInTotal` (matches source's real
 * `gross_pay` exclusion rule); `totalDeduction` is a plain sum of every
 * (non-skipped) deduction row — nothing in source ever filters a deduction
 * row out of a total the way it does for earnings/gross_pay, so this does
 * not invent a symmetric exclusion (judgment call, recorded in
 * DECISIONS.md ADR-026 "As built").
 */
export const computeStructureTotals = (structure) => {
  const context = { base: 0, variable: 0 };
  const earnings = evaluateComponentTable(structure.earnings, context);
  const deductions = evaluateComponentTable(structure.deductions, context);
  const employerContributions = evaluateComponentTable(structure.employerContributions, context);

  const totalEarning = round2(earnings
    .filter((r) => !r._skipped && !r.statisticalComponent && !r.doNotIncludeInTotal)
    .reduce((sum, r) => sum + r.defaultAmount, 0));
  const totalDeduction = round2(deductions
    .filter((r) => !r._skipped)
    .reduce((sum, r) => sum + r.defaultAmount, 0));
  const netPay = round2(totalEarning - totalDeduction);

  return { earnings, deductions, employerContributions, totalEarning, totalDeduction, netPay };
};

/**
 * Assignment-level CTC/gross — real `base`/`variable` context this time.
 * `grossPerPeriod` uses the same earnings-exclusion rule as
 * `computeStructureTotals`; `employerContributionsTotal` excludes only
 * `statisticalComponent` rows (Employer Contribution rows never carry
 * `doNotIncludeInTotal` per the real spec — it's only ever shown for
 * Earning/Deduction components).
 */
export const computeCtcAndGross = (structure, assignment) => {
  const context = { base: Number(assignment?.base) || 0, variable: Number(assignment?.variable) || 0 };
  const earnings = evaluateComponentTable(structure.earnings, context);
  const deductions = evaluateComponentTable(structure.deductions, context);
  const employerContributions = evaluateComponentTable(structure.employerContributions, context);

  const grossPerPeriod = earnings
    .filter((r) => !r._skipped && !r.statisticalComponent && !r.doNotIncludeInTotal)
    .reduce((sum, r) => sum + r.defaultAmount, 0);
  const employerContributionsTotal = employerContributions
    .filter((r) => !r._skipped && !r.statisticalComponent)
    .reduce((sum, r) => sum + r.defaultAmount, 0);

  const periods = PERIODS_PER_YEAR[structure.payrollFrequency] || 12;
  const annualGrossEarning = round2(grossPerPeriod * periods);
  const ctc = round2((grossPerPeriod + employerContributionsTotal) * periods);

  return { earnings, deductions, employerContributions, grossPerPeriod, employerContributionsTotal, annualGrossEarning, ctc };
};
