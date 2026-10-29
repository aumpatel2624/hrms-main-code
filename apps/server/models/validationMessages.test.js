// Clearing a required field that has a default (an Employee's Status, a
// claim's Posting Date) on edit used to answer Mongoose's "Path `status` is
// required."; the form now gets the field's own name.
import assert from "node:assert/strict";
import "./validationMessages.js";
import Employee from "./Employee.js";
import LeaveApplication from "./LeaveApplication.js";
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

// Free text has a length limit, and the message names the field without
// echoing the value back: a 200,000-character leave reason was accepted
// (29 Oct security test, low).
const long = new LeaveApplication({ description: "x".repeat(200000) }).validateSync();
assert.equal(long.errors.description.message, "Description can be at most 2000 characters");
assert.ok(!long.message.includes("xxxx"), "the value is not repeated in the message");
assert.equal(new LeaveApplication({ description: "Family function" }).validateSync()?.errors?.description, undefined);

console.log("validationMessages: all assertions passed");
