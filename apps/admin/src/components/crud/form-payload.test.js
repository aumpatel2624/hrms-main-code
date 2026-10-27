import assert from "node:assert/strict";
import { formPayload } from "./form-payload.js";
import { holidayListAssignmentPayload } from "../../entities/holiday-list-assignment-payload.js";

const fields = [
    { name: "name", type: "text" },
    { name: "departmentId", type: "select" },
    { name: "status", type: "select", options: ["Open", "Closed"] },
    { name: "postingDate", type: "date" },
    { name: "isActive", type: "checkbox" },
];
const blank = { name: "", departmentId: "", status: "", postingDate: "", isActive: true };

// Create: a blank dropdown or date is left out, so the server's default applies.
const created = formPayload(fields, blank, "add");
assert.deepEqual(created, { name: "", isActive: true }, "blank choices omitted on create");

// Edit: a blank dropdown or date goes as null, so a deliberate clear clears.
const edited = formPayload(fields, blank, "edit");
assert.equal(edited.departmentId, null, "cleared reference sent as null");
assert.equal(edited.status, null, "cleared choice sent as null");
assert.equal(edited.postingDate, null, "cleared date sent as null");
assert.equal(edited.name, "", "text fields untouched");

// Chosen values, and keys the form has no field for, pass through.
assert.deepEqual(
    formPayload(fields, { departmentId: "d1", status: "Open", extra: "" }, "add"),
    { departmentId: "d1", status: "Open", extra: "" },
    "chosen values kept",
);

// Holiday List Assignment: each mode sends only its own field.
const hlaFields = [
    { name: "holidayListId", type: "select" },
    { name: "applicableFor", type: "select" },
    { name: "employeeId", type: "select" },
    { name: "companyId", type: "select" },
    { name: "fromDate", type: "date" },
];
const save = (values, mode) => formPayload(hlaFields, holidayListAssignmentPayload(values), mode);

const byCompany = save({ holidayListId: "h1", applicableFor: "Company", employeeId: "", companyId: "c1", fromDate: "2026-01-01" }, "add");
assert.equal(byCompany.companyId, "c1", "company mode keeps company");
assert.equal(byCompany.employeeId, null, "company mode sends no employee");

const byEmployee = save({ holidayListId: "h1", applicableFor: "Employee", employeeId: "e1", companyId: "", fromDate: "2026-01-01" }, "add");
assert.equal(byEmployee.employeeId, "e1", "employee mode keeps employee");
assert.equal(byEmployee.companyId, null, "employee mode sends no company");

// Switching an existing assignment from Employee to Company clears the employee.
const switched = save({ holidayListId: "h1", applicableFor: "Company", employeeId: "e1", companyId: "c1", fromDate: "2026-01-01" }, "edit");
assert.equal(switched.employeeId, null, "stale employee cleared on edit");
assert.equal(switched.companyId, "c1", "company kept on edit");

console.log("form-payload: all assertions passed");
