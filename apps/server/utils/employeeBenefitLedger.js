import mongoose from "mongoose";
import EmployeeBenefitLedger from "../models/EmployeeBenefitLedger.js";

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * Creates an immutable domain ledger entry recording an Accrual or Payout.
 * System-internal write helper — no HTTP route directly invokes this.
 */
export const createBenefitLedgerEntry = async ({
  postingDate = new Date(),
  employeeId,
  companyId,
  salaryComponentId,
  payrollPeriodId,
  transactionType,
  amount,
  yearlyBenefit = 0,
  flexibleBenefit = false,
  salarySlipId = null,
  refDoctype = null,
  refDocnameId = null,
  remarks = "",
}) => {
  if (!employeeId || !companyId || !salaryComponentId || !payrollPeriodId || !transactionType) {
    throw new Error("Missing required fields for EmployeeBenefitLedger entry");
  }
  const roundedAmount = round2(Number(amount) || 0);
  if (roundedAmount <= 0) return null; // zero amount entries are no-ops

  const doc = await EmployeeBenefitLedger.create({
    postingDate,
    employeeId,
    companyId,
    salaryComponentId,
    payrollPeriodId,
    transactionType,
    amount: roundedAmount,
    yearlyBenefit: round2(Number(yearlyBenefit) || 0),
    flexibleBenefit: Boolean(flexibleBenefit),
    salarySlipId,
    refDoctype,
    refDocnameId,
    remarks,
  });
  return doc;
};

/**
 * Computes accrued and paid totals from the ledger for an employee, component, and period.
 * NOTE: Explicitly filters out soft-deleted records in the aggregation $match stage,
 * since Mongoose query middleware does not run on raw aggregate pipelines (ADR-024 / ADR-029).
 */
export const getBenefitLedgerBalance = async (employeeId, salaryComponentId, payrollPeriodId) => {
  const match = {
    employeeId: new mongoose.Types.ObjectId(String(employeeId)),
    salaryComponentId: new mongoose.Types.ObjectId(String(salaryComponentId)),
    payrollPeriodId: new mongoose.Types.ObjectId(String(payrollPeriodId)),
    isDeleted: { $ne: true },
  };

  const results = await EmployeeBenefitLedger.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$transactionType",
        total: { $sum: "$amount" },
      },
    },
  ]);

  let accruedToDate = 0;
  let paidToDate = 0;

  for (const r of results) {
    if (r._id === "Accrual") accruedToDate = round2(r.total);
    if (r._id === "Payout") paidToDate = round2(r.total);
  }

  return {
    accruedToDate,
    paidToDate,
    netAccrued: round2(accruedToDate - paidToDate),
  };
};

/**
 * Reverses (soft-deletes) ledger entries created by a specific Salary Slip.
 * Used during SalarySlip cancellation.
 */
export const deleteBenefitLedgerEntriesBySalarySlip = async (salarySlipId) => {
  return EmployeeBenefitLedger.updateMany(
    { salarySlipId: new mongoose.Types.ObjectId(String(salarySlipId)), isDeleted: { $ne: true } },
    { isDeleted: true },
  );
};

/**
 * Reverses (soft-deletes) ledger entries created by a reference document (e.g. PayrollCorrection).
 * Used during cancellation.
 */
export const deleteBenefitLedgerEntriesByReference = async (refDoctype, refDocnameId) => {
  return EmployeeBenefitLedger.updateMany(
    {
      refDoctype,
      refDocnameId: new mongoose.Types.ObjectId(String(refDocnameId)),
      isDeleted: { $ne: true },
    },
    { isDeleted: true },
  );
};
