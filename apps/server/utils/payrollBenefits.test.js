import assert from "node:assert";
import { previewCurrentCycleBenefitAccrual } from "./salarySlipCalc.js";
import { calculatePayrollCorrectionBreakup } from "./payrollCorrectionCalc.js";

console.log("Running payrollBenefits.test.js...");

// 1. previewCurrentCycleBenefitAccrual from structure.earnings
{
  const structure = {
    payrollFrequency: "Monthly",
    earnings: [
      {
        salaryComponentId: "comp-1",
        amount: 12000,
        dependsOnPaymentDays: true,
      },
    ],
    deductions: [],
    employerContributions: [],
  };
  const assignment = { base: 10000, variable: 0 };
  const paymentDaysResult = { paymentDays: 15, totalWorkingDays: 30 };

  const accrual = previewCurrentCycleBenefitAccrual({
    structure,
    assignment,
    paymentDaysResult,
    salaryComponentId: "comp-1",
    yearlyBenefit: 144000,
    dependsOnPaymentDays: true,
  });

  // 12000 * 15 / 30 = 6000
  assert.strictEqual(accrual, 6000, "Should scale component in earnings by payment days ratio");
}

// 2. previewCurrentCycleBenefitAccrual pro-rated from yearlyBenefit when not in structure.earnings
{
  const structure = {
    payrollFrequency: "Monthly",
    earnings: [],
    deductions: [],
    employerContributions: [],
  };
  const assignment = { base: 0, variable: 0 };
  const paymentDaysResult = { paymentDays: 20, totalWorkingDays: 20 };

  const accrual = previewCurrentCycleBenefitAccrual({
    structure,
    assignment,
    paymentDaysResult,
    salaryComponentId: "comp-2",
    yearlyBenefit: 60000, // 5000 / month
    dependsOnPaymentDays: false,
  });

  assert.strictEqual(accrual, 5000, "Should pro-rate 60000 / 12 = 5000 per month");
}

// 3. calculatePayrollCorrectionBreakup
{
  const salarySlip = {
    totalWorkingDays: 30,
    paymentDays: 20, // 10 LWP days
    earnings: [
      {
        salaryComponentId: "comp-basic",
        amount: 20000,
        defaultAmount: 30000,
        accrualComponent: false,
      },
      {
        salaryComponentId: "comp-accrual",
        amount: 2000,
        accrualComponent: true,
      },
    ],
    deductions: [
      {
        salaryComponentId: "comp-ded",
        amount: 2000,
        defaultAmount: 3000,
      },
    ],
  };

  const eligibleComponentsMap = {
    "comp-basic": { arrearComponent: true, accrualComponent: false },
    "comp-accrual": { arrearComponent: false, accrualComponent: true },
    "comp-ded": { arrearComponent: true, accrualComponent: false },
  };

  // Reverse 3 LWP days
  const breakup = calculatePayrollCorrectionBreakup({
    salarySlip,
    daysToReverse: 3,
    eligibleComponentsMap,
  });

  // Basic: 30000 / 30 = 1000 per day * 3 = 3000
  assert.strictEqual(breakup.earningArrears.length, 1);
  assert.strictEqual(breakup.earningArrears[0].salaryComponentId, "comp-basic");
  assert.strictEqual(breakup.earningArrears[0].amount, 3000);

  // Accrual: 2000 / 20 = 100 per day * 3 = 300
  assert.strictEqual(breakup.accrualArrears.length, 1);
  assert.strictEqual(breakup.accrualArrears[0].salaryComponentId, "comp-accrual");
  assert.strictEqual(breakup.accrualArrears[0].amount, 300);

  // Deduction: 3000 / 30 = 100 per day * 3 = 300
  assert.strictEqual(breakup.deductionArrears.length, 1);
  assert.strictEqual(breakup.deductionArrears[0].salaryComponentId, "comp-ded");
  assert.strictEqual(breakup.deductionArrears[0].amount, 300);
}

// 4. A reversed day is worth the full monthly amount ÷ working days (ADR-069).
// Harsh Pawar (29 Oct functional test, P7): Basic ₹10,000, paid 18 of 25
// days, so the slip holds ₹7,200; one day back is ₹400, not ₹7,200 ÷ 25 = ₹288.
{
  const breakup = calculatePayrollCorrectionBreakup({
    salarySlip: {
      totalWorkingDays: 25,
      paymentDays: 18,
      earnings: [{ salaryComponentId: "comp-basic", amount: 7200, defaultAmount: 7200 }],
      deductions: [{ salaryComponentId: "comp-pf", amount: 864, defaultAmount: 864 }],
    },
    daysToReverse: 1,
    eligibleComponentsMap: { "comp-basic": { arrearComponent: true }, "comp-pf": { arrearComponent: true } },
    fullMonthlyAmounts: { "comp-basic": 10000, "comp-pf": 1200 },
  });
  assert.strictEqual(breakup.earningArrears[0].amount, 400);
  assert.strictEqual(breakup.deductionArrears[0].amount, 48);
}

console.log("payrollBenefits.test.js: all tests passed!");
