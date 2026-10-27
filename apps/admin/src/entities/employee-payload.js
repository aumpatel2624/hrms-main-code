// The Employee form's payload. An empty optional select ("Reports To" for
// the top of a company, an unset grade, ...) arrives as "" and the server
// cannot cast "" to an ObjectId, so empty references go as null — the same
// rule the other entity configs apply. Password is set on create; changes
// after that go through the reset section, never a general profile update
// (matches the server's own createEmployee/updateEmployee split, ADR-040).
export function employeePayload(values, mode) {
    const payload = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key, value === "" && key.endsWith("Id") ? null : value]),
    );
    if (mode === "edit") delete payload.password;
    return payload;
}
