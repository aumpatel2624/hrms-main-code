// Clearing a required field that has a default (an Employee's Status, a
// claim's Posting Date) on edit used to answer Mongoose's "Path `status` is
// required."; the form now gets the field's own name.
import assert from "node:assert/strict";
import "./validationMessages.js";
import Employee from "./Employee.js";
import { fieldLabel } from "./validationMessages.js";

assert.equal(fieldLabel("status"), "Status");
assert.equal(fieldLabel("postingDate"), "Posting Date");
assert.equal(fieldLabel("employeeId"), "Employee");
assert.equal(fieldLabel("earnings.0.salaryComponentId"), "Salary Component");

// The real Employee model, its Status cleared as an edit form sends it.
const employee = new Employee({ status: null });
const error = employee.validateSync();
assert.equal(error.errors.status.message, "Status is required");
assert.ok(!/Path `/.test(error.message), error.message);

console.log("validationMessages: all assertions passed");
