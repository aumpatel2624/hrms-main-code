// The 28 Oct re-test's smaller daily-use faults (report section 4, P6 and P7).
// advanced.jsx and the pages are JSX and cannot be imported here, so this
// reads their sources, like request-decisions.test.js.
//   1. an onboarding's Create Employee opens Add Employee prefilled (P6),
//   2. a Promotion says its Revised CTC does not change pay,
//   3. HR's Leave Application and Employee Separation offer only current staff,
//   4. an approved / rejected / cancelled request's edit page has no save,
//   5. /user-roles is refused to a role without that screen.
// And the 29 Oct functional test (P6, P12, P13):
//   6. a rejected Attendance Request has no save; Grant Allocations says what
//      it does; the onboarding shows its employee and stops offering Create
//      Employee once linked; the Leave Allocation list shows leave type and
//      dates; a cancelled payroll entry says how to run the period again.
// And the 29 Oct verification run (N1, N3, M2):
//   7. a closed grievance's edit page offers no save to the complainant;
//      HR keeps it,
//   8. the payroll setup screens send only what they edit (the payloads are
//      tested against the server in payrollIntegrity.test.js, section 8);
//      Leave Allocation says its company is the employee's.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const source = read("./advanced.jsx");
const form = read("../components/crud/crud-form.jsx");
const userRoles = read("../pages/Setup/UserRoles.jsx");
const payrollEntry = read("../pages/Payroll/PayrollEntry.jsx");

const configOf = (name) => {
    const start = source.indexOf(`export const ${name}`);
    assert.ok(start >= 0, `${name} exists`);
    return source.slice(start, source.indexOf("export const", start + 1));
};

// 1. The prefill goes to the Add Employee form, which reads it.
assert.match(configOf("employeeOnboardingConfig"),
    /makeEmployeeFromOnboarding\(id\)\}\s*onResult=\{\(res\) => navigate\("\/employee\/add", \{ state: \{ prefill: res\.data\?\.data \} \}\)\}/,
    "Create Employee opens Add Employee with the onboarding's details");
assert.match(form, /prefilledFormValues\(config\.fields, initialState, routeState\?\.prefill\)/, "an add form starts from handed-over values");
assert.match(form, /config\.renderExtra\?\.\(\{[^}]*navigate \}\)/, "screen actions can open another screen");

// 2.
assert.match(configOf("employeePromotionConfig"), /name: "revisedCtc"[^}]*hint: "[^"]*does not change pay[^"]*Salary Structure Assignment/,
    "Revised CTC says a new Salary Structure Assignment is needed");

// 3. The approvers' current-staff picker; a saved leaver still shows on edit.
for (const name of ["leaveApplicationConfig", "employeeSeparationConfig"]) {
    const body = configOf(name);
    assert.match(body, /employeeId: currentEmployeeOptions\("employeeId"\)/, `${name}: only current staff`);
    assert.match(body, /lookupDeps: \[[^\]]*"employeeId"/, `${name}: reloads with the saved employee`);
}
// Leavers stay reachable where they are needed.
for (const name of ["exitInterviewConfig", "fullAndFinalStatementConfig"]) {
    assert.doesNotMatch(configOf(name), /employeeId: currentEmployeeOptions/, `${name} still offers leavers`);
}

// 4. The same rule the server applies to edits.
for (const name of ["leaveApplicationConfig", "compensatoryLeaveRequestConfig", "shiftRequestConfig"]) {
    assert.match(configOf(name), /canSave: \(values\) => values\.status === "open"/, `${name}: saves only while open`);
}
assert.match(form, /const canSave = !isEdit \|\| \(config\.canSave\?\.\(values, \{ allScope: currentPagePermissions\.dataScope === SCOPES\.ALL \}\) \?\? true\);/, "the form asks the config");
assert.match(form, /canSubmit=\{canSave\}/, "and hides its save action");
assert.match(form, /if \(!canSave\) return;/, "and does not submit");

// 5. Asked of the menu, not the possibly stale current-page permissions.
assert.match(userRoles, /const canManageRoles = isAdmin \|\| getPermissionsForMenu\(findMenuIdForPath\("\/user-roles"\)\)\.read;/, "a role without the screen");
assert.match(userRoles, /if \(!canManageRoles\) \{\s*return \(/, "is refused");

// 6.
assert.match(configOf("attendanceRequestConfig"), /canSave: \(\) => false/, "an Attendance Request is never saved after creation");
const grant = configOf("leavePolicyAssignmentConfig");
assert.match(grant, /<SimpleActionButton\s+label="Grant Allocations"/, "Grant Allocations is labelled as itself");
assert.doesNotMatch(grant, /AdjustAllocationPanel/, "not as an Adjust Allocation box");
const onboarding = configOf("employeeOnboardingConfig");
assert.match(onboarding, /name: "employeeId"[^}]*disabled: \(\) => true/, "the onboarding shows its linked employee");
assert.match(onboarding, /\{!values\.employeeId && \(\s*<SimpleActionButton\s+label="Create Employee"/, "Create Employee only while unlinked");
assert.match(onboarding, /employeeId: refId\(data\.employeeId\)/, "the populated employee loads as its id");
const allocationColumns = configOf("leaveAllocationConfig");
for (const column of ["row.leaveTypeName", "row.fromDate", "row.toDate"]) {
    assert.ok(allocationColumns.includes(`selector: (row) => ${column}`), `the Leave Allocation list shows ${column}`);
}
assert.match(payrollEntry, /entry\.status === "cancelled" && <p[^>]*>[^<]*delete this entry \(its cancelled slips are deleted with it\), then create a new entry/, "a cancelled entry says how to run again");
assert.match(payrollEntry, /deletePayrollEntry\(id\)/, "and offers the delete there");

// 7. The same rule the server applies: below HR, only Open or Investigated.
assert.match(configOf("employeeGrievanceConfig"), /canSave: \(values, \{ allScope \}\) => allScope \|\| \["Open", "Investigated"\]\.includes\(values\.status\)/,
    "a closed grievance offers save to HR only");

// 8.
for (const [name, payload] of [
    ["salaryComponentConfig", "salaryComponentPayload"], ["salaryStructureConfig", "salaryStructurePayload"],
    ["payrollPeriodConfig", "payrollPeriodPayload"], ["gratuityRuleConfig", "gratuityRulePayload"],
    ["incomeTaxSlabConfig", "incomeTaxSlabPayload"], ["employeeTaxExemptionSubCategoryConfig", "taxExemptionSubCategoryPayload"],
]) {
    assert.ok(configOf(name).includes(`toPayload: ${payload},`), `${name} sends ${payload}`);
}
assert.match(configOf("leaveAllocationConfig"), /name: "companyId"[^}]*hint: "Always saved as the employee's company\."/, "Leave Allocation's company is the employee's");

console.log("daily-use.test.js: all assertions passed");
