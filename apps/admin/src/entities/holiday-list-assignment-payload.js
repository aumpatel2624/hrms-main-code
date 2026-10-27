// A Holiday List Assignment is for one Employee or one Company, chosen by
// Applicable For. The other field is greyed out but still in the form, so it
// always goes as null — the server refuses an assignment with both set.
export function holidayListAssignmentPayload(values) {
    const other = values.applicableFor === "Employee" ? "companyId" : "employeeId";
    return { ...values, [other]: null };
}
