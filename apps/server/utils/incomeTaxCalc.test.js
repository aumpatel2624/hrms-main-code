import assert from "node:assert/strict";
import {
  calculateTotalExemption,
  calculateTaxByTaxSlab,
  calculateRemainingSubPeriods,
  computeIncomeTaxBreakup,
} from "./incomeTaxCalc.js";

const CAT_80C = "600000000000000000000080";
const CAT_80D = "600000000000000000000081";

console.log("Running incomeTaxCalc.test.js...");

// 1. Test calculateTotalExemption
{
  // 1a. Level 1 clamp (sub-category maxAmount)
  const items = [
    { exemptionCategoryId: CAT_80C, maxAmount: 50000, amount: 70000 },
  ];
  const ceilings = { [CAT_80C]: 150000 };
  const total = calculateTotalExemption(items, ceilings);
  assert.equal(total, 50000, "Should clamp to sub-category ceiling (50,000)");
}

{
  // 1b. Level 2 clamp (category ceiling inside loop)
  const items = [
    { exemptionCategoryId: CAT_80C, maxAmount: 100000, amount: 90000 },
    { exemptionCategoryId: CAT_80C, maxAmount: 100000, amount: 80000 }, // sum would be 170k, capped to 150k
  ];
  const ceilings = { [CAT_80C]: 150000 };
  const total = calculateTotalExemption(items, ceilings);
  assert.equal(total, 150000, "Should clamp category total to 150,000 ceiling");
}

{
  // 1c. Multiple categories
  const items = [
    { exemptionCategoryId: CAT_80C, maxAmount: 150000, amount: 150000 },
    { exemptionCategoryId: CAT_80D, maxAmount: 25000, amount: 30000 }, // clamped to 25k
  ];
  const ceilings = { [CAT_80C]: 150000, [CAT_80D]: 50000 };
  const total = calculateTotalExemption(items, ceilings);
  assert.equal(total, 175000, "Should sum across categories (150k + 25k)");
}

// 2. Test calculateTaxByTaxSlab
{
  // Progressive brackets on half-open ranges [from, to) with no +1 quirk
  // 0 to 300k @ 0%
  // 300k to 600k @ 5%
  // 600k to 900k @ 10%
  // 900k to null @ 20%
  const taxSlab = {
    taxReliefLimit: 0,
    slabs: [
      { fromAmount: 0, toAmount: 300000, percentDeduction: 0 },
      { fromAmount: 300000, toAmount: 600000, percentDeduction: 5 },
      { fromAmount: 600000, toAmount: 900000, percentDeduction: 10 },
      { fromAmount: 900000, toAmount: null, percentDeduction: 20 },
    ],
  };

  // 2a. Income in 0% bracket
  assert.equal(calculateTaxByTaxSlab(250000, taxSlab), 0);

  // 2b. Income at 500k -> 300k @ 0% + 200k @ 5% = 10,000
  assert.equal(calculateTaxByTaxSlab(500000, taxSlab), 10000);

  // 2c. Income at 800k -> 300k@0% + 300k@5% (15k) + 200k@10% (20k) = 35,000
  assert.equal(calculateTaxByTaxSlab(800000, taxSlab), 35000);

  // 2d. Income in top open bracket: 1,200,000 -> 0 + 15k + 30k + 300k@20% (60k) = 105,000
  assert.equal(calculateTaxByTaxSlab(1200000, taxSlab), 105000);

  // 2e. Tax relief limit short-circuit
  const slabWithRelief = { ...taxSlab, taxReliefLimit: 500000 };
  assert.equal(calculateTaxByTaxSlab(500000, slabWithRelief), 0, "Should short-circuit to 0 when <= relief limit");
  assert.equal(calculateTaxByTaxSlab(500001, slabWithRelief), 10000.05, "Should tax normally when > relief limit");
}

{
  // ADR-034: unset is unchanged; only the configured marginal window caps tax.
  const slab = { taxReliefLimit: 500000, slabs: [{ fromAmount: 0, toAmount: null, percentDeduction: 10 }] };
  assert.equal(calculateTaxByTaxSlab(550000, slab), 55000, "Unset marginal relief must preserve normal tax");
  const withMarginalRelief = { ...slab, marginalReliefLimit: 600000 };
  assert.equal(calculateTaxByTaxSlab(550000, withMarginalRelief), 50000, "Tax in the marginal window is capped at income over relief limit");
  assert.equal(calculateTaxByTaxSlab(600000, withMarginalRelief), 60000, "Cap stops at the marginal relief limit");
}

{
  // 2f. Sequential compounding surcharges
  // Base tax: 100k
  // Surcharge 1: 10% on tax -> tax becomes 110k
  // Surcharge 2 (Cess): 4% on 110k (4,400) -> final tax becomes 114,400
  const taxSlabWithCharges = {
    taxReliefLimit: 0,
    slabs: [
      { fromAmount: 0, toAmount: null, percentDeduction: 10 }, // 1M @ 10% = 100,000
    ],
    otherTaxesAndCharges: [
      { description: "Surcharge", percent: 10, minTaxableIncome: 0 },
      { description: "Health Cess", percent: 4, minTaxableIncome: 0 },
    ],
  };

  const tax = calculateTaxByTaxSlab(1000000, taxSlabWithCharges);
  assert.equal(tax, 114400, "Sequential compounding: 100k + 10% = 110k, 110k + 4% = 114,400");
}

{
  // 2g. Bracket condition evaluation via evaluateCondition
  const taxSlabWithCondition = {
    slabs: [
      { fromAmount: 0, toAmount: 300000, percentDeduction: 0, condition: "age < 60" },
      { fromAmount: 0, toAmount: 500000, percentDeduction: 0, condition: "age >= 60" },
      { fromAmount: 300000, toAmount: null, percentDeduction: 10, condition: "age < 60" },
      { fromAmount: 500000, toAmount: null, percentDeduction: 10, condition: "age >= 60" },
    ],
  };

  // Junior employee (age 30): income 400k -> (400k - 300k)*10% = 10k
  assert.equal(calculateTaxByTaxSlab(400000, taxSlabWithCondition, { age: 30 }), 10000);

  // Senior employee (age 65): income 400k -> falls in 0 to 500k @ 0% -> 0
  assert.equal(calculateTaxByTaxSlab(400000, taxSlabWithCondition, { age: 65 }), 0);
}

// 3. Test computeIncomeTaxBreakup
{
  const payrollPeriod = {
    startDate: "2026-04-01",
    endDate: "2027-03-31",
  };
  const taxSlab = {
    allowTaxExemption: true,
    standardDeduction: 50000,
    taxReliefLimit: 0,
    slabs: [
      { fromAmount: 0, toAmount: 300000, percentDeduction: 0 },
      { fromAmount: 300000, toAmount: null, percentDeduction: 10 },
    ],
  };

  // Month 1 (April 2026): 12 remaining periods, unprorated base = 50,000/mo
  // Projected annual gross = 50k * 12 = 600,000
  // Standard deduction = 50,000 -> Net taxable = 550,000
  // Tax = (550,000 - 300,000) * 10% = 25,000 annual
  // Monthly deduction = 25,000 / 12 = 2083.33
  const breakup1 = computeIncomeTaxBreakup({
    payrollPeriod,
    currentSlip: { startDate: "2026-04-01", endDate: "2026-04-30" },
    payrollFrequency: "Monthly",
    taxSlab,
    currentActualTaxableEarnings: 50000,
    currentUnproratedTaxableEarnings: 50000,
  });

  assert.equal(breakup1.remainingSubPeriods, 12);
  assert.equal(breakup1.annualTaxableEarning, 550000);
  assert.equal(breakup1.annualIncomeTax, 25000);
  assert.equal(breakup1.incomeTaxDeduction, 2083.33);
  assert.equal(breakup1.totalTaxDeductedTillDate, 2083.33);
}

{
  // 3b. Declaration vs Proof Year-End Clawback
  const payrollPeriod = { startDate: "2026-04-01", endDate: "2027-03-31" };
  const taxSlab = {
    allowTaxExemption: true,
    standardDeduction: 0,
    slabs: [
      { fromAmount: 0, toAmount: null, percentDeduction: 10 },
    ],
  };
  const declaration = {
    status: "submitted",
    declarations: [{ exemptionCategoryId: CAT_80C, maxAmount: 150000, amount: 100000 }],
  };

  // Cycle 11 (February): uses Declaration (exemption = 100,000)
  const febBreakup = computeIncomeTaxBreakup({
    payrollPeriod,
    currentSlip: { startDate: "2027-02-01", endDate: "2027-02-28" },
    payrollFrequency: "Monthly",
    taxSlab,
    currentActualTaxableEarnings: 50000,
    currentUnproratedTaxableEarnings: 50000,
    exemptionDeclaration: declaration,
    categoryCeilings: { [CAT_80C]: 150000 },
  });
  assert.equal(febBreakup.totalExemptionAmount, 100000, "Mid-year cycle uses declaration");

  // Cycle 12 (March, Final Period): NO proof submitted -> Exemption drops to 0 (clawback!)
  const marchNoProof = computeIncomeTaxBreakup({
    payrollPeriod,
    currentSlip: { startDate: "2027-03-01", endDate: "2027-03-31" },
    payrollFrequency: "Monthly",
    taxSlab,
    currentActualTaxableEarnings: 50000,
    currentUnproratedTaxableEarnings: 50000,
    exemptionDeclaration: declaration,
    exemptionProofSubmission: null, // missing!
    categoryCeilings: { [CAT_80C]: 150000 },
  });
  assert.equal(marchNoProof.totalExemptionAmount, 0, "Final cycle with no proof drops exemption to 0");

  // Cycle 12 (March, Final Period): Proof submitted for 80,000 -> completely replaces declaration
  const proofSubmission = {
    status: "submitted",
    taxExemptionProofs: [{ exemptionCategoryId: CAT_80C, maxAmount: 150000, amount: 80000 }],
  };
  const marchWithProof = computeIncomeTaxBreakup({
    payrollPeriod,
    currentSlip: { startDate: "2027-03-01", endDate: "2027-03-31" },
    payrollFrequency: "Monthly",
    taxSlab,
    currentActualTaxableEarnings: 50000,
    currentUnproratedTaxableEarnings: 50000,
    exemptionDeclaration: declaration,
    exemptionProofSubmission: proofSubmission,
    categoryCeilings: { [CAT_80C]: 150000 },
  });
  assert.equal(marchWithProof.totalExemptionAmount, 80000, "Final cycle replaces declaration with proof amount");
}

{
  // 3c. One-off AdditionalSalary with deductFullTaxOnSelectedPayrollDate: true
  // Net annual base: 600,000 @ 10% = 60,000 annual tax -> 5,000/mo over 12 periods.
  // Bonus: 50,000 full-tax-now.
  // Tax on (600k + 50k) = 65,000.
  // Incremental bonus tax = 65,000 - 60,000 = 5,000 (100% in current period).
  // Current month deduction = 5,000 (spread) + 5,000 (bonus tax) = 10,000.
  const payrollPeriod = { startDate: "2026-04-01", endDate: "2027-03-31" };
  const taxSlab = {
    allowTaxExemption: false,
    standardDeduction: 0,
    slabs: [{ fromAmount: 0, toAmount: null, percentDeduction: 10 }],
  };

  const breakup = computeIncomeTaxBreakup({
    payrollPeriod,
    currentSlip: { startDate: "2026-04-01", endDate: "2026-04-30" },
    payrollFrequency: "Monthly",
    taxSlab,
    currentActualTaxableEarnings: 50000,
    currentUnproratedTaxableEarnings: 50000,
    additionalSalaries: [
      {
        type: "Earning",
        amount: 50000,
        isRecurring: false,
        deductFullTaxOnSelectedPayrollDate: true,
        status: "active",
      },
    ],
  });

  assert.equal(breakup.incomeTaxDeduction, 10000, "Should include 100% incremental tax for full-tax bonus");
  assert.equal(breakup.annualTaxableEarning, 650000);
  assert.equal(breakup.annualIncomeTax, 65000);
}

{
  // 3d. EmployeeOtherIncome and opening balances
  const payrollPeriod = { startDate: "2026-04-01", endDate: "2027-03-31" };
  const taxSlab = {
    allowTaxExemption: false,
    standardDeduction: 0,
    slabs: [{ fromAmount: 0, toAmount: null, percentDeduction: 10 }],
  };

  const breakup = computeIncomeTaxBreakup({
    payrollPeriod,
    currentSlip: { startDate: "2026-04-01", endDate: "2026-04-30" },
    payrollFrequency: "Monthly",
    taxSlab,
    currentActualTaxableEarnings: 50000,
    currentUnproratedTaxableEarnings: 50000,
    assignment: {
      taxableEarningsTillDate: 100000,
      taxDeductedTillDate: 10000,
    },
    employeeOtherIncomes: [
      { amount: 20000, status: "submitted" },
      { amount: -5000, status: "submitted" }, // negative loss
      { amount: 99999, status: "draft" }, // draft excluded
    ],
  });

  // Base: 50k*12 = 600k + 100k (opening) + 15k (net other income) = 715k
  // Tax: 715k @ 10% = 71,500
  // Remaining tax: 71,500 - 10,000 (paid opening) = 61,500
  // Monthly deduction = 61,500 / 12 = 5125
  assert.equal(breakup.annualTaxableEarning, 715000);
  assert.equal(breakup.annualIncomeTax, 71500);
  assert.equal(breakup.incomeTaxDeduction, 5125);
  assert.equal(breakup.totalTaxDeductedTillDate, 15125);
}

console.log("✅ All incomeTaxCalc.test.js assertions passed!");
