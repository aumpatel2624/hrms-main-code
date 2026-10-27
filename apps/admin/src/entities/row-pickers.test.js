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
// Payroll Correction's single Salary Slip field is the one left (not a row; noted in the PR).
assert.deepEqual(typedIds.filter((name) => name !== "salarySlipId"), [], `free-text id fields: ${typedIds.join(", ")}`);

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

console.log("row-pickers.test.js: all assertions passed");
