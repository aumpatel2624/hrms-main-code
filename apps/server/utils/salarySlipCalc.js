/**
 * ADR-027 (Payroll — Run) & ADR-028 (Payroll — Adjustments & Incentives).
 * The real Salary Slip calculation — reuses the *unchanged* `evaluateComponentTable`
 * (utils/payrollCtc.js) with a richer context (Q-17: "the formula evaluator's
 * context grows, not a second engine") rather than writing a second formula-evaluation pass.
 *
 * **The `dependsOnPaymentDays` scaling question, settled from the real spec**
 * (`Salary Slip.md` section I, `get_amount_based_on_payment_days`): only a
 * row flagged `dependsOnPaymentDays` is scaled by `paymentDays /
 * totalWorkingDays` — a row without that flag keeps its full, unprorated
 * value.
 *
 * **ADR-028: AdditionalSalary Merge**
 * Active AdditionalSalary rows matching the pay period (one-off within [startDate, endDate],
 * or recurring overlapping the period) are merged after the base structure tables evaluate:
 * - existing row + overwrite: true -> replaces amount and defaultAmount
 * - existing row + overwrite: false -> adds to amount and defaultAmount
 * - no existing row -> inserts a new row with dependsOnPaymentDays: false
 * Then recalculates grossPay, totalDeduction, and netPay.
 */
import { evaluateComponentTable } from "./payrollCtc.js";
import { computePaymentDays } from "./payrollPaymentDays.js";
import AdditionalSalary from "../models/AdditionalSalary.js";

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const getComponentIdStr = (rowOrId) => {
  if (!rowOrId) return "";
  const id = rowOrId._id || rowOrId.salaryComponentId?._id || rowOrId.salaryComponentId || rowOrId;
  return id ? String(id) : "";
};

/**
 * Checks whether an AdditionalSalary row falls within or overlaps [startDate, endDate].
 */
export const isAdditionalSalaryInPeriod = (addSal, startDate, endDate) => {
  if (!startDate || !endDate) return true;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (addSal.isRecurring) {
    const from = new Date(addSal.fromDate);
    const to = new Date(addSal.toDate);
    return from <= end && to >= start;
  } else if (addSal.payrollDate) {
    const pDate = new Date(addSal.payrollDate);
    return pDate >= start && pDate <= end;
  }
  return false;
};

/**
 * Merges active AdditionalSalary rows into earnings and deductions tables per ADR-028.
 */
export const mergeAdditionalSalaries = ({ earnings = [], deductions = [], additionalSalaries = [], startDate, endDate }) => {
  const clonedEarnings = (earnings || []).map((r) => (typeof r.toObject === "function" ? r.toObject() : { ...r }));
  const clonedDeductions = (deductions || []).map((r) => (typeof r.toObject === "function" ? r.toObject() : { ...r }));

  for (const addSal of additionalSalaries) {
    if (!addSal || addSal.status === "cancelled") continue;
    const resolvedCompId = addSal.salaryComponentId?._id || addSal.salaryComponentId;
    if (!resolvedCompId) continue;
    if (startDate && endDate && !isAdditionalSalaryInPeriod(addSal, startDate, endDate)) {
      continue;
    }

    const isDeduction = addSal.type === "Deduction";
    const targetTable = isDeduction ? clonedDeductions : clonedEarnings;
    const compIdStr = getComponentIdStr(resolvedCompId);

    const existingRow = targetTable.find((r) => getComponentIdStr(r.salaryComponentId) === compIdStr);
    const adjAmount = round2(Number(addSal.amount) || 0);

    if (existingRow) {
      if (addSal.overwriteSalaryStructureAmount) {
        existingRow.amount = adjAmount;
        existingRow.defaultAmount = adjAmount;
        existingRow.dependsOnPaymentDays = false;
        existingRow.additionalAmount = adjAmount;
      } else {
        existingRow.amount = round2((Number(existingRow.amount) || 0) + adjAmount);
        existingRow.defaultAmount = round2((Number(existingRow.defaultAmount) || 0) + adjAmount);
        existingRow.additionalAmount = round2((Number(existingRow.additionalAmount) || 0) + adjAmount);
      }
    } else {
      const comp = typeof addSal.salaryComponentId === "object" && addSal.salaryComponentId !== null ? addSal.salaryComponentId : {};
      targetTable.push({
        salaryComponentId: resolvedCompId,
        abbreviation: comp.abbreviation || addSal.abbreviation || "",
        statisticalComponent: false, // AdditionalSalary cannot be statistical per ADR-028
        isTaxApplicable: comp.isTaxApplicable ?? false,
        variableBasedOnTaxableSalary: comp.variableBasedOnTaxableSalary ?? false,
        dependsOnPaymentDays: false, // hardcoded false per ADR-028 (fixed adjustment, never prorated)
        exemptedFromIncomeTax: comp.exemptedFromIncomeTax ?? false,
        doNotIncludeInTotal: comp.doNotIncludeInTotal ?? false,
        accrualComponent: false,
        condition: "",
        amountBasedOnFormula: false,
        formula: "",
        amount: adjAmount,
        defaultAmount: adjAmount,
        additionalAmount: adjAmount,
      });
    }
  }

  const grossPay = round2(
    clonedEarnings
      .filter((r) => !r._skipped && !r.statisticalComponent && !r.doNotIncludeInTotal)
      .reduce((sum, r) => sum + (r.defaultAmount ?? r.amount ?? 0), 0),
  );

  const totalDeduction = round2(
    clonedDeductions
      .filter((r) => !r._skipped)
      .reduce((sum, r) => sum + (r.defaultAmount ?? r.amount ?? 0), 0),
  );

  const netPay = round2(grossPay - totalDeduction);

  return {
    earnings: clonedEarnings,
    deductions: clonedDeductions,
    grossPay,
    totalDeduction,
    netPay,
  };
};

/**
 * Scales `rows` (plain SalaryDetail-shaped objects or Mongoose subdocuments)
 * by `paymentDays / totalWorkingDays` for any row flagged `dependsOnPaymentDays`,
 * then evaluates the table against `context` via the unchanged
 * `evaluateComponentTable`. Mutates nothing; returns the evaluated rows.
 */
const scaleAndEvaluate = (rows, context, paymentDays, totalWorkingDays) => {
  const ratio = totalWorkingDays > 0 ? paymentDays / totalWorkingDays : 0;
  const scaledRows = (rows || []).map((row) => {
    const plain = typeof row.toObject === "function" ? row.toObject() : { ...row };
    if (plain.dependsOnPaymentDays) {
      plain.amount = round2((Number(plain.amount) || 0) * ratio);
    }
    return plain;
  });
  return evaluateComponentTable(scaledRows, context);
};

/**
 * Computes the full Salary Slip calculation: payment days + the three
 * scaled/evaluated component tables + totals, and merges any additional salaries.
 *
 * @param {object} args
 * @param {object} args.structure — a `SalaryStructure` document (earnings[]/deductions[]/employerContributions[]).
 * @param {object} args.assignment — a `SalaryStructureAssignment` document (base/variable).
 * @param {{paymentDays:number, totalWorkingDays:number}} args.paymentDaysResult — from `computePaymentDays`/`calculatePaymentDays`.
 * @param {Array<object>} [args.additionalSalaries] — active AdditionalSalary rows to merge per ADR-028.
 * @param {Date|string} [args.startDate] — optional slip start date for period matching.
 * @param {Date|string} [args.endDate] — optional slip end date for period matching.
 */
export const calculateSalarySlip = ({
  structure,
  assignment,
  paymentDaysResult,
  additionalSalaries = [],
  startDate,
  endDate,
}) => {
  const { paymentDays = 0, totalWorkingDays = 0 } = paymentDaysResult || {};
  const context = {
    base: Number(assignment?.base) || 0,
    variable: Number(assignment?.variable) || 0,
    paymentDays,
    totalWorkingDays,
    grossPay: 0,
    netPay: 0,
  };

  let earnings = scaleAndEvaluate(structure.earnings, context, paymentDays, totalWorkingDays);
  let grossPay = round2(
    earnings
      .filter((r) => !r._skipped && !r.statisticalComponent && !r.doNotIncludeInTotal)
      .reduce((sum, r) => sum + r.defaultAmount, 0),
  );
  context.grossPay = grossPay; // updated in context after earnings, before deductions (ADR-026/027 ordering)

  let deductions = scaleAndEvaluate(structure.deductions, context, paymentDays, totalWorkingDays);
  let totalDeduction = round2(
    deductions
      .filter((r) => !r._skipped)
      .reduce((sum, r) => sum + r.defaultAmount, 0),
  );

  let netPay = round2(grossPay - totalDeduction);
  context.netPay = netPay;

  // Employer contributions: computed and displayed but never included in gross/deduction/net pay
  const employerContributions = scaleAndEvaluate(structure.employerContributions, context, paymentDays, totalWorkingDays);

  // ADR-028: Merge AdditionalSalary rows if any exist
  if (additionalSalaries && additionalSalaries.length > 0) {
    const merged = mergeAdditionalSalaries({
      earnings,
      deductions,
      additionalSalaries,
      startDate,
      endDate,
    });
    earnings = merged.earnings;
    deductions = merged.deductions;
    grossPay = merged.grossPay;
    totalDeduction = merged.totalDeduction;
    netPay = merged.netPay;
  }

  return { earnings, deductions, employerContributions, grossPay, totalDeduction, netPay };
};

/**
 * Convenience wrapper: resolves payment days via the DB-backed
 * `computePaymentDays`, queries active `AdditionalSalary` rows matching the period,
 * and runs `calculateSalarySlip`. Used by the controller.
 */
export const calculateSalarySlipForEmployee = async ({
  employeeId,
  startDate,
  endDate,
  settings,
  structure,
  assignment,
  additionalSalaries: explicitAdditionalSalaries,
}) => {
  const paymentDaysResult = await computePaymentDays({ employeeId, startDate, endDate, settings });

  let additionalSalaries = explicitAdditionalSalaries;
  if (!additionalSalaries) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    additionalSalaries = await AdditionalSalary.find({
      employeeId,
      status: "active",
      $or: [
        { isRecurring: false, payrollDate: { $gte: start, $lte: end } },
        { isRecurring: true, fromDate: { $lte: end }, toDate: { $gte: start } },
      ],
    })
      .populate("salaryComponentId")
      .lean();
  }

  const calc = calculateSalarySlip({
    structure,
    assignment,
    paymentDaysResult,
    additionalSalaries,
    startDate,
    endDate,
  });

  return { ...paymentDaysResult, ...calc };
};

/**
 * ADR-029 (Payroll — Benefits).
 *
 * Previews the expected benefit accrual for a specific component in the current cycle
 * without persisting a Salary Slip. Reuses the unchanged `calculateSalarySlip` engine.
 */
export const previewCurrentCycleBenefitAccrual = ({
  structure,
  assignment,
  paymentDaysResult = { paymentDays: 30, totalWorkingDays: 30 },
  salaryComponentId,
  yearlyBenefit = 0,
  dependsOnPaymentDays = false,
}) => {
  const compIdStr = String(salaryComponentId?._id || salaryComponentId || "");
  const calc = calculateSalarySlip({
    structure,
    assignment,
    paymentDaysResult,
  });

  const matchingEarning = (calc.earnings || []).find(
    (r) => String(r.salaryComponentId?._id || r.salaryComponentId || "") === compIdStr,
  );

  if (matchingEarning) {
    return round2(Number(matchingEarning.defaultAmount ?? matchingEarning.amount) || 0);
  }

  // If not directly in structure.earnings, compute pro-rata from yearlyBenefit and payrollFrequency
  const freq = structure?.payrollFrequency || "Monthly";
  const cycles = { Monthly: 12, Fortnightly: 26, Bimonthly: 24, Weekly: 52, Daily: 365 }[freq] || 12;
  let cycleAmount = cycles > 0 ? yearlyBenefit / cycles : 0;

  if (dependsOnPaymentDays) {
    const { paymentDays = 0, totalWorkingDays = 0 } = paymentDaysResult || {};
    const ratio = totalWorkingDays > 0 ? paymentDays / totalWorkingDays : 0;
    cycleAmount *= ratio;
  }

  return round2(cycleAmount);
};

