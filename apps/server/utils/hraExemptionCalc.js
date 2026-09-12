import Company from "../models/Company.js";
import SalaryStructureAssignment from "../models/SalaryStructureAssignment.js";
import SalaryStructure from "../models/SalaryStructure.js";
import { evaluateComponentTable } from "./payrollCtc.js";

const DAY = 24 * 60 * 60 * 1000;
const asDate = (value) => new Date(value);
const dateDiffInDays = (toDate, fromDate) => Math.floor((asDate(toDate) - asDate(fromDate)) / DAY);
const monthDiff = (toDate, fromDate) => (
  (asDate(toDate).getFullYear() - asDate(fromDate).getFullYear()) * 12
  + asDate(toDate).getMonth() - asDate(fromDate).getMonth() + 1
);
const sameId = (left, right) => String(left?._id || left) === String(right?._id || right);
const laterDate = (left, right) => (asDate(left) > asDate(right) ? asDate(left) : asDate(right));

export const getComponentPay = (frequency, amount, fromDate, toDate) => {
  const days = dateDiffInDays(toDate, fromDate) + 1;
  const value = Number(amount) || 0;
  switch (frequency) {
    case "Daily": return value * days;
    case "Weekly": return value * Math.floor(days / 7);
    case "Fortnightly": return value * Math.floor(days / 14);
    case "Monthly": return value * monthDiff(toDate, fromDate);
    case "Bimonthly": return value * monthDiff(toDate, fromDate) / 2;
    default: throw new Error(`getComponentPay: unrecognized payroll frequency "${frequency}"`);
  }
};

export const calculateHraExemption = ({ annualBasic, annualHra, monthlyHouseRent, rentedInMetroCity }) => {
  const basic = Number(annualBasic) || 0;
  const hra = Number(annualHra) || 0;
  const rent = Number(monthlyHouseRent) || 0;
  const annualExemption = Math.max(0, Math.min(
    hra,
    rent * 12 - basic * 0.10,
    basic * (rentedInMetroCity ? 0.50 : 0.40),
  ));
  return { annualExemption, monthlyExemption: annualExemption / 12 };
};

export const calculateAnnualEligibleHraExemption = async ({
  employeeId, companyId, payrollPeriod, monthlyHouseRent, rentedInMetroCity,
}) => {
  const company = await Company.findById(companyId).lean();
  if (!company?.basicComponentId || !company?.hraComponentId) {
    throw new Error(`Please set Basic and HRA component in Company ${companyId}`);
  }

  const periodStart = asDate(payrollPeriod.startDate);
  const periodEnd = asDate(payrollPeriod.endDate);
  let assignments = await SalaryStructureAssignment.find({
    employeeId,
    fromDate: { $gte: periodStart, $lte: periodEnd },
  }).sort({ fromDate: 1 }).lean();
  if (!assignments.length) {
    const previous = await SalaryStructureAssignment.findOne({ employeeId, fromDate: { $lt: periodStart } })
      .sort({ fromDate: -1 }).lean();
    if (previous) assignments = [previous];
  }
  if (!assignments.length) throw new Error(`No Salary Structure Assignment found for employee ${employeeId}`);

  let basicAmount = 0;
  let hraAmount = 0;
  for (let index = 0; index < assignments.length; index += 1) {
    const assignment = assignments[index];
    const effectiveFromDate = laterDate(assignment.fromDate, periodStart);
    const nextFrom = assignments[index + 1] ? laterDate(assignments[index + 1].fromDate, periodStart) : null;
    const effectiveToDate = nextFrom ? new Date(nextFrom.getTime() - DAY) : periodEnd;
    if (effectiveToDate < effectiveFromDate) continue;

    const structure = await SalaryStructure.findById(assignment.salaryStructureId).lean();
    if (!structure) throw new Error(`Salary Structure ${assignment.salaryStructureId} not found`);
    const basicRow = (structure.earnings || []).find((row) => sameId(row.salaryComponentId, company.basicComponentId));
    const hraRow = (structure.earnings || []).find((row) => sameId(row.salaryComponentId, company.hraComponentId));
    if (!hraRow) continue;

    const context = { base: Number(assignment.base) || 0, variable: Number(assignment.variable) || 0 };
    const evaluated = evaluateComponentTable(structure.earnings, context);
    const evaluatedBasic = evaluated.find((row) => sameId(row.salaryComponentId, company.basicComponentId));
    const evaluatedHra = evaluated.find((row) => sameId(row.salaryComponentId, company.hraComponentId));
    if (basicRow && evaluatedBasic && !evaluatedBasic._skipped) {
      basicAmount += getComponentPay(structure.payrollFrequency, evaluatedBasic.defaultAmount, effectiveFromDate, effectiveToDate);
    }
    if (evaluatedHra && !evaluatedHra._skipped) {
      hraAmount += getComponentPay(structure.payrollFrequency, evaluatedHra.defaultAmount, effectiveFromDate, effectiveToDate);
    }
  }

  if (!hraAmount || !monthlyHouseRent) return { hraAmount, annualExemption: 0, monthlyExemption: 0 };
  return { hraAmount, ...calculateHraExemption({ annualBasic: basicAmount, annualHra: hraAmount, monthlyHouseRent, rentedInMetroCity }) };
};

export const calculateHraExemptionForPeriod = async ({ houseRentPaymentAmount, rentedFrom, rentedTo, ...rest }) => {
  if (!houseRentPaymentAmount) return null;
  const factor = Math.round(((dateDiffInDays(rentedTo, rentedFrom) + 1) / 30) * 2) / 2;
  const monthlyHouseRent = Number(houseRentPaymentAmount) / factor;
  const result = await calculateAnnualEligibleHraExemption({ ...rest, monthlyHouseRent });
  return { monthlyHouseRent, totalEligibleHraExemption: result.monthlyExemption * factor, ...result };
};

export const validateHouseRentDates = (rentedFrom, rentedTo) => {
  if (!rentedFrom || !rentedTo) throw new Error("Rented From and Rented To dates are required");
  if (dateDiffInDays(rentedTo, rentedFrom) < 14) {
    throw new Error("Rented From and Rented To dates should be atleast 15 days apart");
  }
};
