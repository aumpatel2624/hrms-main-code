// The form is filled from the whole saved record (ids, company, totals,
// timestamps), but the update accepts only these fields: Employee, Salary
// Structure and From Date are fixed once saved, since a new From Date is a new
// assignment. Sending the record back was refused as "Unexpected fields".
const EDITABLE = ["base", "variable", "leaveEncashmentAmountPerDay", "incomeTaxSlabId", "taxDeductedTillDate", "taxableEarningsTillDate"];

export function salaryStructureAssignmentPayload(values, mode) {
    if (mode !== "edit") return values;
    return Object.fromEntries(Object.entries(values).filter(([key]) => EDITABLE.includes(key)));
}
