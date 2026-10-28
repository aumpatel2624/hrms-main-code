// ADR-051: no form makes anyone type or paste an internal id. The pre-production
// simulation found fourteen row editors (Salary Structure's components, Leave
// Policy's leave types, Expense Claim's expense types…) that were plain text
// boxes for a MongoDB id. Each is now a dropdown of names fed by a `row…`
// lookup. advanced.jsx is JSX and cannot be imported here, so this reads its
// source: every column or field named `…Id` must not be a text box, and every
// row dropdown's `optionsFrom` must name a lookup that is defined.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./advanced.jsx", import.meta.url), "utf8");

// `{ name: "salaryComponentId", label: "…", type: "text" … }` — an id typed by hand.
const typedIds = [...source.matchAll(/\{\s*name:\s*"(\w+Id)",[^{}]*?type:\s*"text"/g)].map((m) => m[1]);
assert.deepEqual(typedIds, [], `free-text id fields: ${typedIds.join(", ")}`);

// The fourteen screens' row columns are dropdowns now.
const rowPickers = [...source.matchAll(/name:\s*"(\w+Id)",\s*label:\s*"[^"]*",\s*type:\s*"select",\s*optionsFrom:\s*"(row\w+)"/g)];
const pickedFields = new Set(rowPickers.map((m) => m[1]));
for (const field of ["salaryComponentId", "leaveTypeId", "expenseTypeId", "designationId", "employeeId", "skillId",
    "allowUserId", "kraId", "criteriaId", "exemptionSubCategoryId"]) {
    assert.ok(pickedFields.has(field), `${field} rows are a dropdown`);
}

// Every row dropdown's list is defined somewhere (`rowX: loader`), and handed to the rows.
for (const key of new Set(rowPickers.map((m) => m[2]))) {
    assert.match(source, new RegExp(`\\b${key}:\\s*\\S`), `lookup ${key} is defined`);
}
assert.ok(!/<SimpleArrayField(?:(?!\/>)[\s\S])*columns=\{(?:SALARY_DETAIL|EXPENSE)_COLUMNS\}(?:(?!lookups=)(?!\/>)[\s\S])*\/>/.test(source),
    "Salary Structure and Expense Claim rows receive the form's lookups");

// Re-check N2: the Interview form's Interviewers are current staff, each with
// their company — not every employee of every company, leavers included.
const interviewConfig = source.slice(source.indexOf("export const interviewConfig"), source.indexOf("export const", source.indexOf("export const interviewConfig") + 1));
assert.match(interviewConfig, /interviewers:\s*companyLabelledOptions\(getCurrentEmployees,\s*getAllCompanies,\s*nameWithCompany\("employeeName"\)\)/,
    "Interviewers lists current staff with their company");

// The Payroll Correction list names the slip (employee and period), never its raw id.
const correctionConfig = source.slice(source.indexOf("export const payrollCorrectionConfig"), source.indexOf("export const", source.indexOf("export const payrollCorrectionConfig") + 1));
const slipColumn = correctionConfig.match(/\{ name: "Salary Slip", selector:[\s\S]*?\) \},/)?.[0] ?? "";
assert.match(slipColumn, /salarySlipLabel\(/, "Salary Slip column uses salarySlipLabel");
assert.doesNotMatch(slipColumn, /String\(r\.salarySlipId/, "Salary Slip column does not print the slip id");

// 28 Oct re-test: no list, filter, picker or results table shows a raw id.
const configOf = (name) => source.slice(source.indexOf(`export const ${name}`), source.indexOf("export const", source.indexOf(`export const ${name}`) + 1));

// A list column whose linked record is gone reads "(deleted)", not the id.
const idFallbacks = [...source.matchAll(/selector: \(row\) => row\.\w+ \|\| row\.(\w+Id)\b/g)].map((m) => m[1]);
assert.deepEqual(idFallbacks, [], `list columns falling back to a raw id: ${idFallbacks.join(", ")}`);

// Filters read "Employee", not "Employee id"…
const idLabels = [...source.matchAll(/label: "([^"]* [iI][dD])"/g)].map((m) => m[1]);
assert.deepEqual(idLabels, [], `labels ending in "id": ${idLabels.join(", ")}`);
// …and every reference filter has a list of names to offer: its own
// `filterLookups`, or the form's plain dropdown of the same name.
const starts = [...source.matchAll(/export const (\w+Config)\b/g)];
const emptyFilters = starts.flatMap((m, i) => {
    const body = source.slice(m.index, starts[i + 1]?.index ?? source.length);
    const filters = body.match(/filterFields:\s*\[([\s\S]*?)\n    \]/)?.[1] ?? "";
    const lookups = new Map([...(body.match(/\n    lookups:\s*\{([\s\S]*?)\n    \},/)?.[1] ?? "").matchAll(/\n        (\w+):([^\n]*)/g)].map((x) => [x[1], x[2]]));
    const filterLookups = body.match(/\n    filterLookups:\s*\{([^\n]*)\}/)?.[1] ?? "";
    return [...filters.matchAll(/name:\s*"(\w+)",\s*label:\s*"[^"]*",\s*type:\s*"objectId"/g)].map((x) => x[1])
        .filter((field) => !new RegExp(`\\b${field}:`).test(filterLookups)
            && !(lookups.has(field) && !/ofChosenCompany/.test(lookups.get(field))))
        .map((field) => `${m[1]}.${field}`);
});
assert.deepEqual(emptyFilters, [], `reference filters with nothing to offer: ${emptyFilters.join(", ")}`);
assert.match(readFileSync(new URL("../components/ui/filter-panel.jsx", import.meta.url), "utf8"), /lookups\?\.\[field\.optionsFrom \?\? field\.name\]/,
    "a filter finds its options under its own name");

// Look-alike pickers carry what tells their options apart.
assert.doesNotMatch(configOf("salarySlipConfig"), /salaryStructureAssignmentId: asOptions\(getAllSalaryStructureAssignments, "currency"\)/, "not every option \"INR\"");
assert.match(configOf("salarySlipConfig"), /salaryStructureAssignmentLabel/);
for (const name of ["leaveAdjustmentConfig", "leaveEncashmentConfig"]) {
    assert.match(configOf(name), /leaveAllocationId: leaveAllocationOptions/, `${name}: allocation names its employee and leave type`);
}
for (const name of ["employeeOtherIncomeConfig", "employeeBenefitApplicationConfig", "employeeTaxExemptionDeclarationConfig", "employeeTaxExemptionProofSubmissionConfig"]) {
    assert.match(configOf(name), /payrollPeriodId: payrollPeriodOptions/, `${name}: payroll period names its company`);
}
assert.match(source, /const payrollPeriodOptions = labelledOptions\(getAllPayrollPeriods, \[\[getAllCompanies, "companyName"\]\], payrollPeriodLabel\)/);
assert.match(configOf("goalConfig"), /parentGoalId: labelledOptions\(getAllGoals, \[\[getAllCompanies, "companyName"\]\], goalLabel\)/, "parent goal names its employee");
assert.match(configOf("shiftScheduleAssignmentConfig"), /shiftScheduleId: labelledOptions\([^\n]*shiftScheduleLabel\)/, "schedule reads as a shift and a frequency");

// Bulk tools' results tables say what happened, not the new record's id.
const pages = new URL("../pages/", import.meta.url);
for (const page of ["Payroll/BulkSalaryStructureAssignmentTool.jsx", "Leaves/LeaveControlPanel.jsx", "ShiftAttendance/ShiftAssignmentTool.jsx", "ShiftAttendance/EmployeeAttendanceTool.jsx"]) {
    const tool = readFileSync(new URL(page, pages), "utf8");
    const printed = [...tool.matchAll(/\{[^{}\n]*\|\| (?:row|req)\.(\w+Id)\b[^{}\n]*\}/g)].map((m) => m[1]);
    assert.deepEqual(printed, [], `${page} prints ${printed.join(", ")}`);
}
assert.doesNotMatch(readFileSync(new URL("ShiftAttendance/ShiftAssignmentTool.jsx", pages), "utf8"), /label: s\.frequency/, "Shift Assignment Tool schedule is readable");

// Dashboard Builder: field names in words, reference values picked by name.
const sectionEditor = readFileSync(new URL("Setup/DashboardSectionEditor.jsx", pages), "utf8");
assert.doesNotMatch(sectionEditor, /\(\{ value: field, label: field \}\)/, "filter fields are not raw keys");
assert.match(sectionEditor, /type === "objectId"[\s\S]{0,200}<SelectField/, "a reference filter value is a dropdown");

// Audit Log: a reference field's before/after shows the server's label.
const auditLog = readFileSync(new URL("Master/AuditLog.jsx", pages), "utf8");
assert.match(auditLog, /<Value value=\{change\.from\} label=\{change\.fromLabel\} \/>/);
assert.match(auditLog, /<Value value=\{change\.to\} label=\{change\.toLabel\} \/>/);

console.log("row-pickers.test.js: all assertions passed");
