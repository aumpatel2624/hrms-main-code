import { evaluateCondition } from "./payrollFormula.js";
import { PERIODS_PER_YEAR } from "./payrollCtc.js";

const round2 = (val) => Math.round((Number(val || 0) + Number.EPSILON) * 100) / 100;

/**
 * ADR-030 (Tax & Exemptions).
 *
 * Dual-level exemption clamping:
 * Level 1: Each item is clamped to its sub-category ceiling (item.maxAmount).
 * Level 2: The category's running total is clamped to the category ceiling
 *          (categoryCeilings[categoryId]) INSIDE the loop before adding subsequent items.
 *
 * @param {Array<object>} items - [{ exemptionCategoryId, maxAmount, amount }]
 * @param {object} categoryCeilings - { [categoryId]: maxAmount }
 * @returns {number} totalExemptionAmount
 */
export const calculateTotalExemption = (items = [], categoryCeilings = {}) => {
  const categoryTotals = {};

  for (const item of items) {
    if (!item) continue;
    const catId = String(item.exemptionCategoryId?._id || item.exemptionCategoryId || "default");
    const declaredAmt = Math.max(0, Number(item.amount) || 0);
    const subMax = item.maxAmount !== undefined && item.maxAmount !== null && Number(item.maxAmount) > 0
      ? Number(item.maxAmount)
      : Infinity;

    // Level 1: clamp item to sub-category ceiling
    const effectiveItemAmt = Math.min(declaredAmt, subMax);

    const catCeiling = categoryCeilings[catId] !== undefined && categoryCeilings[catId] !== null
      ? Number(categoryCeilings[catId])
      : Infinity;

    if (!categoryTotals[catId]) {
      categoryTotals[catId] = 0;
    }

    categoryTotals[catId] += effectiveItemAmt;
    // Level 2: clamp running total inside the loop
    if (categoryTotals[catId] > catCeiling) {
      categoryTotals[catId] = catCeiling;
    }
  }

  let total = 0;
  for (const catId of Object.keys(categoryTotals)) {
    total += categoryTotals[catId];
  }
  return round2(total);
};

/**
 * Evaluates progressive tax bracket liability using half-open ranges [fromAmount, toAmount)
 * with no "+1" quirk per ADR-030. Surcharges are compounded sequentially.
 *
 * @param {number} annualTaxableEarning
 * @param {object} taxSlab - { taxReliefLimit, slabs, otherTaxesAndCharges }
 * @param {object} evalContext - context for condition evaluation
 * @returns {number} total tax
 */
export const calculateTaxByTaxSlab = (annualTaxableEarning = 0, taxSlab = {}, evalContext = {}) => {
  const earning = Math.max(0, Number(annualTaxableEarning) || 0);
  if (earning === 0) return 0;

  // Relief threshold short-circuit: if annual income <= taxReliefLimit, zero tax
  const reliefLimit = Number(taxSlab.taxReliefLimit) || 0;
  if (reliefLimit > 0 && earning <= reliefLimit) {
    return 0;
  }

  const slabs = [...(taxSlab.slabs || [])].sort((a, b) => (Number(a.fromAmount) || 0) - (Number(b.fromAmount) || 0));

  let baseTax = 0;
  for (const slab of slabs) {
    // If condition is present, evaluate via payrollFormula.js
    if (slab.condition && slab.condition.trim()) {
      try {
        const applies = evaluateCondition(slab.condition, { ...evalContext, annualTaxableEarning: earning });
        if (!applies) continue;
      } catch {
        // If condition errors, skip this bracket
        continue;
      }
    }

    const from = Number(slab.fromAmount) || 0;
    const to = slab.toAmount !== undefined && slab.toAmount !== null && Number(slab.toAmount) > 0
      ? Number(slab.toAmount)
      : null;
    const rate = (Number(slab.percentDeduction) || 0) / 100;

    if (earning <= from) continue;

    let taxableChunk = 0;
    if (to !== null) {
      taxableChunk = Math.min(earning, to) - from;
    } else {
      taxableChunk = earning - from;
    }

    if (taxableChunk > 0) {
      baseTax += taxableChunk * rate;
    }
  }

  // Sequential compounding surcharges / cesses (Income Tax Slab Other Charges)
  let runningTax = baseTax;
  for (const charge of taxSlab.otherTaxesAndCharges || []) {
    const minIncome = Number(charge.minTaxableIncome) || 0;
    const maxIncome = charge.maxTaxableIncome !== undefined && charge.maxTaxableIncome !== null && Number(charge.maxTaxableIncome) > 0
      ? Number(charge.maxTaxableIncome)
      : Infinity;

    if (earning >= minIncome && earning <= maxIncome) {
      const chargeRate = (Number(charge.percent) || 0) / 100;
      const chargeAmt = runningTax * chargeRate;
      runningTax += chargeAmt;
    }
  }

  return round2(runningTax);
};

/**
 * Computes remaining sub-periods in the fiscal/payroll period.
 */
export const calculateRemainingSubPeriods = ({
  payrollPeriod,
  currentSlip,
  payrollFrequency = "Monthly",
  employee = {},
}) => {
  if (!payrollPeriod || !currentSlip) return 1;

  const slipStart = new Date(currentSlip.startDate);
  const pStart = new Date(payrollPeriod.startDate);
  const pEnd = new Date(payrollPeriod.endDate);

  const effectiveEnd = employee.relievingDate && new Date(employee.relievingDate) < pEnd
    ? new Date(employee.relievingDate)
    : pEnd;

  if (payrollFrequency === "Monthly") {
    const t = effectiveEnd;
    const f = slipStart;
    const diff = (t.getFullYear() - f.getFullYear()) * 12 + (t.getMonth() - f.getMonth()) + 1;
    return Math.max(1, diff);
  }

  const salaryDays = Math.max(1, Math.round((new Date(currentSlip.endDate) - slipStart) / (24 * 3600 * 1000)) + 1);
  const remainingDays = Math.max(1, Math.round((effectiveEnd - slipStart) / (24 * 3600 * 1000)) + 1);
  return Math.max(1, Math.round(remainingDays / salaryDays));
};

/**
 * ADR-030 (Tax & Exemptions) Income Tax Annualization & Apportionment Pipeline.
 *
 * Evaluates full-year taxable earnings projection, resolves provisional declarations
 * or final proof substitutions (clawback), applies progressive brackets and sequential
 * surcharges, and apportions remaining tax across remaining sub-periods.
 */
export const computeIncomeTaxBreakup = ({
  payrollPeriod,
  currentSlip,
  payrollFrequency = "Monthly",
  employee = {},
  assignment = {},
  taxSlab,
  priorSubmittedSlips = [],
  currentActualTaxableEarnings = 0,
  currentUnproratedTaxableEarnings = 0,
  additionalSalaries = [],
  employeeOtherIncomes = [],
  exemptionDeclaration = null,
  exemptionProofSubmission = null,
  categoryCeilings = {},
  evalContext = {},
}) => {
  if (!taxSlab) {
    return {
      annualTaxableEarning: 0,
      annualIncomeTax: 0,
      incomeTaxDeduction: 0,
      totalTaxDeductedTillDate: 0,
      totalExemptionAmount: 0,
      remainingSubPeriods: 0,
    };
  }

  const remainingSubPeriods = calculateRemainingSubPeriods({
    payrollPeriod,
    currentSlip,
    payrollFrequency,
    employee,
  });

  // 1. Prior period actuals + assignment opening balances
  let previousTaxableEarnings = Number(assignment.taxableEarningsTillDate) || 0;
  let previousTotalPaidTaxes = Number(assignment.taxDeductedTillDate) || 0;

  for (const slip of priorSubmittedSlips) {
    if (!slip || slip.status !== "submitted") continue;
    let slipTaxable = 0;
    for (const e of slip.earnings || []) {
      if (e.isTaxApplicable && !e._skipped) slipTaxable += Number(e.amount ?? e.defaultAmount) || 0;
    }
    for (const d of slip.deductions || []) {
      if (d.exemptedFromIncomeTax && !d._skipped) slipTaxable -= Number(d.amount ?? d.defaultAmount) || 0;
    }
    previousTaxableEarnings += slipTaxable;
    previousTotalPaidTaxes += Number(slip.incomeTaxDeduction || 0);
  }

  // 2. Future unprorated structured earnings projection
  const futureStructuredEarnings = Math.max(0, Number(currentUnproratedTaxableEarnings) || 0) * (remainingSubPeriods - 1);

  // 3. Additional Salaries handling
  let recurringFutureAddl = 0;
  let fullTaxAddlEarnings = 0;
  let normalAddlEarnings = 0;

  for (const addSal of additionalSalaries) {
    if (!addSal || addSal.status === "cancelled") continue;
    const amt = Number(addSal.amount) || 0;
    const isEarning = addSal.type === "Earning";
    if (!isEarning) continue; // deductions handled via normal slip calculation

    if (addSal.isRecurring) {
      // recurring future periods
      recurringFutureAddl += amt * Math.max(0, remainingSubPeriods - 1);
    } else if (addSal.deductFullTaxOnSelectedPayrollDate) {
      // one-off bonus taxed 100% in current period
      fullTaxAddlEarnings += amt;
    } else {
      normalAddlEarnings += amt;
    }
  }

  // 4. Employee Other Income (submitted only)
  let totalOtherIncome = 0;
  for (const other of employeeOtherIncomes) {
    if (other && other.status === "submitted") {
      totalOtherIncome += Number(other.amount) || 0;
    }
  }

  // 5. Exemption resolution (provisional vs proof year-end clawback)
  let totalExemptionAmount = 0;
  const standardDeduction = Number(taxSlab.standardDeduction) || 0;

  if (taxSlab.allowTaxExemption) {
    const isFinalPeriod = remainingSubPeriods <= 1 || (
      payrollPeriod && currentSlip && new Date(payrollPeriod.endDate) <= new Date(currentSlip.endDate)
    );

    if (isFinalPeriod) {
      // Final cycle: proof submission strictly required. If missing, exemption drops to 0 (clawback).
      if (exemptionProofSubmission && exemptionProofSubmission.status === "submitted") {
        totalExemptionAmount = calculateTotalExemption(
          exemptionProofSubmission.taxExemptionProofs || [],
          categoryCeilings,
        );
      } else {
        totalExemptionAmount = 0; // clawback!
      }
    } else {
      // Earlier cycles: use declaration
      if (exemptionDeclaration && exemptionDeclaration.status === "submitted") {
        totalExemptionAmount = calculateTotalExemption(
          exemptionDeclaration.declarations || [],
          categoryCeilings,
        );
      }
    }
  }

  totalExemptionAmount = round2(totalExemptionAmount + standardDeduction);

  // 6. Net annual taxable earnings calculation
  const currentActual = Math.max(0, Number(currentActualTaxableEarnings) || 0);
  const baseGrossAnnualTaxable = round2(
    previousTaxableEarnings +
    currentActual +
    futureStructuredEarnings +
    recurringFutureAddl +
    normalAddlEarnings +
    totalOtherIncome,
  );

  const netAnnualTaxableWithoutBonus = Math.max(0, round2(baseGrossAnnualTaxable - totalExemptionAmount));
  const netAnnualTaxableWithBonus = Math.max(0, round2(baseGrossAnnualTaxable + fullTaxAddlEarnings - totalExemptionAmount));

  // 7. Progressive Tax calculation
  const totalStructuredAnnualTax = calculateTaxByTaxSlab(netAnnualTaxableWithoutBonus, taxSlab, evalContext);

  // 8. Period Apportionment
  const remainingTax = Math.max(0, totalStructuredAnnualTax - previousTotalPaidTaxes);
  const currentSpreadTax = remainingSubPeriods > 0 ? round2(remainingTax / remainingSubPeriods) : 0;

  // Incremental tax for full-tax-now bonus
  let incrementalBonusTax = 0;
  let annualIncomeTax = totalStructuredAnnualTax;
  if (fullTaxAddlEarnings > 0) {
    const totalTaxWithBonus = calculateTaxByTaxSlab(netAnnualTaxableWithBonus, taxSlab, evalContext);
    incrementalBonusTax = Math.max(0, round2(totalTaxWithBonus - totalStructuredAnnualTax));
    annualIncomeTax = totalTaxWithBonus;
  }

  const currentPeriodTaxDeduction = round2(currentSpreadTax + incrementalBonusTax);
  const totalTaxDeductedTillDate = round2(previousTotalPaidTaxes + currentPeriodTaxDeduction);

  return {
    annualTaxableEarning: netAnnualTaxableWithBonus,
    annualIncomeTax,
    incomeTaxDeduction: currentPeriodTaxDeduction,
    totalTaxDeductedTillDate,
    totalExemptionAmount,
    remainingSubPeriods,
  };
};
