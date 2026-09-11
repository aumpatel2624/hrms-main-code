/**
 * ADR-029 (Payroll — Benefits & Corrections).
 *
 * Pure calculation logic for Payroll Correction (LWP Reversals).
 * Computes earningArrears, deductionArrears, and accrualArrears given a
 * historical Salary Slip and the number of days to reverse.
 */
const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

export const calculatePayrollCorrectionBreakup = ({
  salarySlip,
  daysToReverse,
  eligibleComponentsMap = {}, // componentId -> { arrearComponent, accrualComponent, type }
}) => {
  if (!salarySlip) throw new Error("Salary Slip is required");
  const days = Number(daysToReverse);
  if (isNaN(days) || days <= 0) throw new Error("Days to reverse must be greater than 0");

  const totalWorkingDays = Number(salarySlip.totalWorkingDays) || 1;
  const paymentDays = Number(salarySlip.paymentDays) || 1;

  const earningArrears = [];
  const deductionArrears = [];
  const accrualArrears = [];

  // 1. Process earnings
  for (const row of salarySlip.earnings || []) {
    const compId = String(row.salaryComponentId?._id || row.salaryComponentId || "");
    const compInfo = eligibleComponentsMap[compId] || row;

    // Must be an arrear component or accrual component to generate arrear top-ups
    if (!compInfo.arrearComponent && !compInfo.accrualComponent && !row.accrualComponent) {
      continue;
    }

    if (row.accrualComponent || compInfo.accrualComponent) {
      const perDay = (Number(row.amount) || 0) / paymentDays;
      const amount = round2(perDay * days);
      if (amount > 0) {
        accrualArrears.push({ salaryComponentId: compId, amount });
      }
    } else {
      const baseAmount = Number(row.defaultAmount ?? row.amount) || 0;
      const perDay = baseAmount / totalWorkingDays;
      const amount = round2(perDay * days);
      if (amount > 0) {
        earningArrears.push({ salaryComponentId: compId, amount });
      }
    }
  }

  // 2. Process deductions
  for (const row of salarySlip.deductions || []) {
    const compId = String(row.salaryComponentId?._id || row.salaryComponentId || "");
    const compInfo = eligibleComponentsMap[compId] || row;

    if (!compInfo.arrearComponent) {
      continue;
    }

    const baseAmount = Number(row.defaultAmount ?? row.amount) || 0;
    const perDay = baseAmount / totalWorkingDays;
    const amount = round2(perDay * days);
    if (amount > 0) {
      deductionArrears.push({ salaryComponentId: compId, amount });
    }
  }

  return {
    earningArrears,
    deductionArrears,
    accrualArrears,
  };
};
