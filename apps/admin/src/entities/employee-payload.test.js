import assert from "node:assert/strict";
import { employeePayload } from "./employee-payload.js";

// A blank Reports To (and any other blank reference) goes as null, not "".
const created = employeePayload({ employeeName: "MD", reportsToId: "", gradeId: "", companyId: "c1", password: "pw" }, "add");
assert.equal(created.reportsToId, null, "blank reportsToId sent as null");
assert.equal(created.gradeId, null, "blank gradeId sent as null");
assert.equal(created.companyId, "c1", "chosen reference kept");
assert.equal(created.password, "pw", "password sent on create");

// Edit: same rule, and the password never travels.
const edited = employeePayload({ reportsToId: "", panNumber: "", password: "" }, "edit");
assert.equal(edited.reportsToId, null, "blank reportsToId cleared on edit");
assert.equal(edited.panNumber, "", "non-reference text fields untouched");
assert.ok(!("password" in edited), "password dropped on edit");

console.log("employee-payload: all assertions passed");
