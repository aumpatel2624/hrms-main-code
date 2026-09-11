import { calculateSalarySlip } from "./salarySlipCalc.js";

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const getComponentIdStr = (row) => {
  if (!row) return "";
  const id = row.salaryComponentId?._id || row.salaryComponentId;
  return id ? String(id) : "";
};

/**
 * ADR-028 — Pure Arrear Calculation engine.
 *
 * Given historical submitted SalarySlip documents and the current/revised
 * SalaryStructureAssignment and SalaryStructure:
 * 1. For each historical slip, re-evaluates what it should have paid under the
 *    new structure, preserving the historical slip's paymentDays and totalWorkingDays.
 * 2. Computes the component-wise delta: diff = newAmount - oldAmount.
 * 3. Only when diff > 0 (reproducing source's positive-only behavior exactly;
 *    no negative clawbacks), accumulates into earningArrears / deductionArrears.
 *
 * @param {object} args
 * @param {Array<object>} args.historicalSlips — Submitted SalarySlip documents within [startDate, endDate]
 * @param {object} args.currentAssignment — SalaryStructureAssignment active now
 * @param {object} args.currentStructure — SalaryStructure referenced by currentAssignment
 * @returns {{ earningArrears: Array<{salaryComponentId: string|object, amount: number}>, deductionArrears: Array<{salaryComponentId: string|object, amount: number}> }}
 */
export const calculateArrears = ({ historicalSlips = [], currentAssignment, currentStructure }) => {
  const earningMap = new Map(); // componentIdStr -> { salaryComponentId, amount }
  const deductionMap = new Map(); // componentIdStr -> { salaryComponentId, amount }

  for (const slip of historicalSlips) {
    const paymentDaysResult = {
      paymentDays: slip.paymentDays ?? slip.totalWorkingDays ?? 0,
      totalWorkingDays: slip.totalWorkingDays ?? 0,
    };

    // Re-evaluate what the slip should have paid with current structure/assignment
    const preview = calculateSalarySlip({
      structure: currentStructure,
      assignment: currentAssignment,
      paymentDaysResult,
    });

    // Earnings delta: positive only
    for (const previewRow of preview.earnings || []) {
      if (previewRow._skipped || previewRow.statisticalComponent) continue;
      const compIdStr = getComponentIdStr(previewRow);
      if (!compIdStr) continue;

      const oldRow = (slip.earnings || []).find((r) => getComponentIdStr(r) === compIdStr);
      const oldAmount = Number(oldRow?.defaultAmount ?? oldRow?.amount ?? 0);
      const newAmount = Number(previewRow.defaultAmount ?? previewRow.amount ?? 0);
      const diff = round2(newAmount - oldAmount);

      // Only positive diff is added (source fidelity: diff > 0)
      if (diff > 0) {
        const existing = earningMap.get(compIdStr) || {
          salaryComponentId: previewRow.salaryComponentId,
          amount: 0,
        };
        existing.amount = round2(existing.amount + diff);
        earningMap.set(compIdStr, existing);
      }
    }

    // Deductions delta: positive only
    for (const previewRow of preview.deductions || []) {
      if (previewRow._skipped) continue;
      const compIdStr = getComponentIdStr(previewRow);
      if (!compIdStr) continue;

      const oldRow = (slip.deductions || []).find((r) => getComponentIdStr(r) === compIdStr);
      const oldAmount = Number(oldRow?.defaultAmount ?? oldRow?.amount ?? 0);
      const newAmount = Number(previewRow.defaultAmount ?? previewRow.amount ?? 0);
      const diff = round2(newAmount - oldAmount);

      // Only positive diff is added
      if (diff > 0) {
        const existing = deductionMap.get(compIdStr) || {
          salaryComponentId: previewRow.salaryComponentId,
          amount: 0,
        };
        existing.amount = round2(existing.amount + diff);
        deductionMap.set(compIdStr, existing);
      }
    }
  }

  return {
    earningArrears: Array.from(earningMap.values()),
    deductionArrears: Array.from(deductionMap.values()),
  };
};
