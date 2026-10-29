// The 29 Oct functional test (ADR-068): an employee's own payslip showed only
// days and totals (P9), and a Payroll Correction's View page said its Salary
// Slip was an "Inactive or deleted record" and showed no status (P7).
// And the 29 Oct re-check: that View still said "Salary Slip —", because a
// second toView later in the config replaced the one building the label, and
// it showed no amounts.
// advanced.jsx is JSX and cannot be imported here, so this reads its source,
// like row-pickers.test.js.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./advanced.jsx", import.meta.url), "utf8");
const configOf = (name) => {
    const start = source.indexOf(`export const ${name} = {`);
    assert.ok(start >= 0, `${name} exists`);
    return source.slice(start, source.indexOf("\nexport const", start + 1));
};

// P9: the View page (the only one an employee can open) lists each earning and
// deduction with its amount, then the totals.
const slip = configOf("salarySlipConfig");
const slipView = slip.match(/renderViewExtra: \(\{ values \}\) => \([\s\S]*?\n {4}\),/)?.[0] ?? "";
assert.match(slipView, /title="Earnings" rows=\{paidLines\(values\.earnings\)\}/, "earning lines on the payslip view");
assert.match(slipView, /title="Deductions" rows=\{paidLines\(values\.deductions\)\}/, "deduction lines on the payslip view");
for (const total of ["grossPay", "totalDeduction", "netPay"]) {
    assert.match(slipView, new RegExp(`values\\.${total}`), `${total} on the payslip view`);
}
assert.ok(slipView.indexOf("Earnings") < slipView.indexOf("Totals"), "lines first, then the totals");
assert.match(source, /PAYSLIP_LINE_COLUMNS = \[[\s\S]*?salaryComponentName[\s\S]*?label: "Amount"/, "each line names its component and amount");

// P7: the correction's View names the slip from the populated record and shows its status.
const correction = configOf("payrollCorrectionConfig");
const viewFields = correction.match(/viewFields: \[[\s\S]*?\n {4}\],/)?.[0] ?? "";
assert.match(viewFields, /name: "salarySlipLabel", label: "Salary Slip"/, "the slip is shown by its label");
assert.match(viewFields, /name: "status", label: "Status"/, "the status is shown");
assert.match(correction, /toView: \(data\) => \(\{[\s\S]*?salarySlipLabel: data\.salarySlipId\?\.startDate[\s\S]*?salarySlipLabel\(data\.salarySlipId/,
    "the label is built from the populated slip");
assert.equal(correction.match(/\n {4}toView:/g)?.length, 1, "one toView, so nothing replaces the slip label");
const correctionView = correction.match(/renderViewExtra: \(\{ values \}\) => \([\s\S]*?\n {4}\),/)?.[0] ?? "";
for (const [title, rows] of [["Earning arrears", "earningArrears"], ["Deduction arrears", "deductionArrears"], ["Accrual arrears", "accrualArrears"]]) {
    assert.match(correctionView, new RegExp(`title="${title}" rows=\\{values\\.${rows}\\} columns=\\{PAYSLIP_LINE_COLUMNS\\}`), `${title} with amounts on the correction view`);
}
assert.match(viewFields, /name: "payrollDate", label: "Payroll Date"/, "the payroll date its arrears are paid on is shown");

console.log("payroll-views: payslip view lists every line; correction view names its slip, status and amounts");
