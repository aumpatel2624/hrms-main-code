/**
 * Will payroll ever pay a one-off line dated `payrollDate`?
 *
 * A one-off Additional Salary is paid only by the slip made for its payroll
 * date's period (`salarySlipCalc.js` takes the lines dated inside the slip's
 * dates, ADR-069). So it is never paid when that date is after the employee's
 * relieving date (no slip is made after they leave), or when a non-cancelled
 * slip already covers the date (that slip was made without it).
 *
 * Shared by the documents that write such a line on submit — Gratuity and
 * Payroll Correction — so both refuse the same dates in the same words.
 * `what` names the document in the message; `ifCovered` tells HR what to do
 * when a slip already covers the date.
 */
import SalarySlip from "../models/SalarySlip.js";

const refuse = (message) => {
  const error = new Error(message);
  error.status = 400;
  throw error;
};

const day = (date) => new Date(date).toISOString().slice(0, 10);

export const assertPayrollDateWillBePaid = async ({ employee, payrollDate, what, ifCovered }) => {
  const date = new Date(payrollDate);
  if (employee.relievingDate && date > new Date(employee.relievingDate)) {
    const relieved = day(employee.relievingDate);
    refuse(`The payroll date is after ${employee.employeeName}'s relieving date (${relieved}), and no salary slip is made after an employee leaves, so this ${what} would never be paid. Set the payroll date on or before ${relieved}.`);
  }
  const coveringSlip = await SalarySlip.findOne({
    employeeId: employee._id,
    status: { $ne: "cancelled" },
    startDate: { $lte: date },
    endDate: { $gte: date },
  }).lean();
  if (coveringSlip) {
    refuse(`${employee.employeeName} already has a salary slip for ${day(coveringSlip.startDate)} – ${day(coveringSlip.endDate)}, so payroll would not pay this ${what}. ${ifCovered(coveringSlip)}`);
  }
};
