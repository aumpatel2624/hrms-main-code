// The Tax Exemption Declaration form also shows what the server computes —
// the totals, the HRA figures and the status — and, on edit, the stored record.
// The server takes only what a person enters (EMPLOYEE_TAX_EXEMPTION_DECLARATION_FIELDS
// in payrollTax.controller.js) and refuses the save if anything else is sent.
export const TAX_DECLARATION_FIELDS = ["employeeId", "payrollPeriodId", "currency", "declarations", "monthlyHouseRent", "rentedInMetroCity"];

export function taxDeclarationPayload(values) {
    return Object.fromEntries(TAX_DECLARATION_FIELDS.filter((key) => key in values).map((key) => [key, values[key]]));
}

// The Proof Submission form has the same shape: computed HRA figures, totals and
// status on screen, EMPLOYEE_TAX_EXEMPTION_PROOF_SUBMISSION_FIELDS on the server.
export const TAX_PROOF_SUBMISSION_FIELDS = [
    "employeeId", "payrollPeriodId", "submissionDate", "currency", "taxExemptionProofs", "attachments",
    "houseRentPaymentAmount", "rentedFrom", "rentedTo", "rentedInMetroCity",
];

export function taxProofSubmissionPayload(values) {
    return Object.fromEntries(TAX_PROOF_SUBMISSION_FIELDS.filter((key) => key in values).map((key) => [key, values[key]]));
}
