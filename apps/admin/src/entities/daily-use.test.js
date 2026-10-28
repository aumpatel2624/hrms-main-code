// The 28 Oct re-test's smaller daily-use faults (report section 4, P6 and P7).
// advanced.jsx and the pages are JSX and cannot be imported here, so this
// reads their sources, like request-decisions.test.js.
//   1. an onboarding's Create Employee opens Add Employee prefilled (P6),
//   2. a Promotion says its Revised CTC does not change pay,
//   3. HR's Leave Application and Employee Separation offer only current staff,
//   4. an approved / rejected / cancelled request's edit page has no save,
//   5. /user-roles is refused to a role without that screen.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const source = read("./advanced.jsx");
const form = read("../components/crud/crud-form.jsx");
const userRoles = read("../pages/Setup/UserRoles.jsx");

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
assert.match(form, /const canSave = !isEdit \|\| \(config\.canSave\?\.\(values\) \?\? true\);/, "the form asks the config");
assert.match(form, /canSubmit=\{canSave\}/, "and hides its save action");
assert.match(form, /if \(!canSave\) return;/, "and does not submit");

// 5. Asked of the menu, not the possibly stale current-page permissions.
assert.match(userRoles, /const canManageRoles = isAdmin \|\| getPermissionsForMenu\(findMenuIdForPath\("\/user-roles"\)\)\.read;/, "a role without the screen");
assert.match(userRoles, /if \(!canManageRoles\) \{\s*return \(/, "is refused");

console.log("daily-use.test.js: all assertions passed");
