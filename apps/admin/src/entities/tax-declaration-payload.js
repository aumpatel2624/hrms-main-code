// The Tax Exemption Declaration form also shows what the server computes —
// the totals, the HRA figures and the status — and, on edit, the stored record.
// The server takes only what a person enters (EMPLOYEE_TAX_EXEMPTION_DECLARATION_FIELDS
// in payrollTax.controller.js) and refuses the save if anything else is sent.
export const TAX_DECLARATION_FIELDS = ["employeeId", "payrollPeriodId", "currency", "declarations", "monthlyHouseRent", "rentedInMetroCity"];

export function taxDeclarationPayload(values) {
    return Object.fromEntries(TAX_DECLARATION_FIELDS.filter((key) => key in values).map((key) => [key, values[key]]));
}
