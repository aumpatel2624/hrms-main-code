import assert from "node:assert/strict";
import { calculateArrears } from "./arrearCalc.js";

const COMP_BS = "600000000000000000000001";
const COMP_HRA = "600000000000000000000002";
const COMP_ALLOWANCE = "600000000000000000000003";
const COMP_PT = "600000000000000000000004";

const currentStructure = {
  earnings: [
    {
      salaryComponentId: COMP_BS,
      abbreviation: "BS",
      dependsOnPaymentDays: true,
      amountBasedOnFormula: false,
      amount: 25000, // increased from 20000
    },
    {
      salaryComponentId: COMP_HRA,
      abbreviation: "HRA",
      dependsOnPaymentDays: false,
      amountBasedOnFormula: false,
      amount: 10000, // unchanged from 10000
    },
    {
      salaryComponentId: COMP_ALLOWANCE,
      abbreviation: "ALLW",
      dependsOnPaymentDays: false,
      amountBasedOnFormula: false,
      amount: 3000, // decreased from 5000 (negative delta!)
    },
  ],
  deductions: [
    {
      salaryComponentId: COMP_PT,
      abbreviation: "PT",
      dependsOnPaymentDays: false,
      amountBasedOnFormula: false,
      amount: 1500, // increased from 1000
    },
  ],
  employerContributions: [],
};

const currentAssignment = { base: 0, variable: 0 };

// Case 1: Single historical slip with positive, zero, and negative deltas
{
  const historicalSlip = {
    paymentDays: 30,
    totalWorkingDays: 30,
    earnings: [
      { salaryComponentId: COMP_BS, defaultAmount: 20000, amount: 20000 },
      { salaryComponentId: COMP_HRA, defaultAmount: 10000, amount: 10000 },
      { salaryComponentId: COMP_ALLOWANCE, defaultAmount: 5000, amount: 5000 },
    ],
    deductions: [
      { salaryComponentId: COMP_PT, defaultAmount: 1000, amount: 1000 },
    ],
  };

  const result = calculateArrears({
    historicalSlips: [historicalSlip],
    currentAssignment,
    currentStructure,
  });

  // Basic delta: 25000 - 20000 = +5000 (included)
  const bsArrear = result.earningArrears.find((r) => String(r.salaryComponentId) === COMP_BS);
  assert.ok(bsArrear, "BS arrear should exist");
  assert.equal(bsArrear.amount, 5000);

  // HRA delta: 10000 - 10000 = 0 (dropped)
  const hraArrear = result.earningArrears.find((r) => String(r.salaryComponentId) === COMP_HRA);
  assert.equal(hraArrear, undefined, "Zero delta should not produce arrear");

  // Allowance delta: 3000 - 5000 = -2000 (dropped, ADR-028 positive-only rule)
  const allwArrear = result.earningArrears.find((r) => String(r.salaryComponentId) === COMP_ALLOWANCE);
  assert.equal(allwArrear, undefined, "Negative delta must be dropped per ADR-028 positive-only rule");

  // Deduction PT delta: 1500 - 1000 = +500 (included)
  const ptArrear = result.deductionArrears.find((r) => String(r.salaryComponentId) === COMP_PT);
  assert.ok(ptArrear, "PT deduction arrear should exist");
  assert.equal(ptArrear.amount, 500);

  assert.equal(result.earningArrears.length, 1);
  assert.equal(result.deductionArrears.length, 1);
}
console.log("arrearCalc: single slip positive-only delta passed");

// Case 2: Multi-slip accumulation across 2 months
{
  const slip1 = {
    paymentDays: 30,
    totalWorkingDays: 30,
    earnings: [{ salaryComponentId: COMP_BS, defaultAmount: 20000, amount: 20000 }],
    deductions: [{ salaryComponentId: COMP_PT, defaultAmount: 1000, amount: 1000 }],
  };
  const slip2 = {
    paymentDays: 30,
    totalWorkingDays: 30,
    earnings: [{ salaryComponentId: COMP_BS, defaultAmount: 20000, amount: 20000 }],
    deductions: [{ salaryComponentId: COMP_PT, defaultAmount: 1000, amount: 1000 }],
  };

  const result = calculateArrears({
    historicalSlips: [slip1, slip2],
    currentAssignment,
    currentStructure,
  });

  // BS arrear accumulated: (25000 - 20000) * 2 = 10000
  const bsArrear = result.earningArrears.find((r) => String(r.salaryComponentId) === COMP_BS);
  assert.equal(bsArrear.amount, 10000);

  // PT arrear accumulated: (1500 - 1000) * 2 = 1000
  const ptArrear = result.deductionArrears.find((r) => String(r.salaryComponentId) === COMP_PT);
  assert.equal(ptArrear.amount, 1000);
}
console.log("arrearCalc: multi-slip accumulation passed");

// Case 3: Brand-new component not present in historical slip (oldAmount = 0)
{
  const COMP_NEW = "600000000000000000000099";
  const structWithNew = {
    earnings: [
      {
        salaryComponentId: COMP_NEW,
        abbreviation: "NEWCOMP",
        dependsOnPaymentDays: false,
        amountBasedOnFormula: false,
        amount: 4000,
      },
    ],
    deductions: [],
    employerContributions: [],
  };

  const slipWithoutNew = {
    paymentDays: 30,
    totalWorkingDays: 30,
    earnings: [],
    deductions: [],
  };

  const result = calculateArrears({
    historicalSlips: [slipWithoutNew],
    currentAssignment,
    currentStructure: structWithNew,
  });

  assert.equal(result.earningArrears.length, 1);
  assert.equal(result.earningArrears[0].amount, 4000);
}
console.log("arrearCalc: brand-new component arrear passed");

console.log("arrearCalc: all tests passed!");
