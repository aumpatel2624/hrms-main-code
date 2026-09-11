import SalaryWithholding from "../models/SalaryWithholding.js";
export const isSalaryWithheld = async (employeeId, startDate, endDate) => Boolean(await SalaryWithholding.exists({
  employeeId: employeeId?._id || employeeId,
  status: "withheld",
  cycles: { $elemMatch: { fromDate: { $lte: startDate }, toDate: { $gte: endDate }, isReleased: false } },
}));
// Keep the stored workflow status intact; cancellation takes precedence.
export const withWithholdingDisplay = async (slip) => {
  const row = slip.toObject ? slip.toObject() : { ...slip };
  row.isSalaryWithheld = row.status !== "cancelled" && await isSalaryWithheld(row.employeeId, row.startDate, row.endDate);
  row.displayStatus = row.isSalaryWithheld ? "withheld" : row.status;
  return row;
};
