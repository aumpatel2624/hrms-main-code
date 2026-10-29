// Production error replies carry a plain sentence, never raw database wording
// (29 Oct security test, low), and the signature image link is built from
// the server's own public URL, never "undefined/…".
import assert from "node:assert/strict";
import { plainErrorMessage, plainErrorMessages } from "./plainErrorMessages.js";
import { publicServerUrl } from "../utils/publicServerUrl.js";

const cast = 'Cast to ObjectId failed for value "abc" (type string) at path "_id" for model "LeaveApplication"';
assert.equal(plainErrorMessage(cast), "That record could not be found");
assert.equal(plainErrorMessage('Cast to ObjectId failed for value "abc" (type string) at path "employeeId" for model "LeaveApplication"'), "Employee is not valid");
assert.equal(
  plainErrorMessage('LeaveApplication validation failed: description: Description can be at most 2000 characters, fromDate: Cast to date failed for value "x" (type string) at path "fromDate"'),
  "Description can be at most 2000 characters, From Date is not valid",
);
assert.equal(plainErrorMessage("EmployeeGrievance validation failed: status: `Done` is not a valid enum value for path `status`."), "Status is not valid");
assert.equal(plainErrorMessage("E11000 duplicate key error collection: hrms.employees index: email_1"), "A record with these unique values already exists");
for (const own of ["Leave Application not found", "Only an open application can be approved (current status: approved)", "Status is required"]) {
  assert.equal(plainErrorMessage(own), own, "a controller's own message passes untouched");
}

// The middleware rewrites only failures, and logs the original.
const logged = [];
const originalError = console.error;
console.error = (line) => logged.push(line);
const sent = [];
const res = { json: (body) => { sent.push(body); return res; } };
plainErrorMessages({ method: "GET", originalUrl: "/api/v1/leave-applications/abc" }, res, () => {});
res.json({ isOk: false, status: 400, message: cast });
res.json({ isOk: true, status: 200, message: cast, data: [] });
console.error = originalError;
assert.equal(sent[0].message, "That record could not be found");
assert.equal(sent[0].status, 400);
assert.equal(sent[1].message, cast, "a success body is not touched");
assert.ok(logged[0].includes('for model "LeaveApplication"'), "the detail goes to the log");

const req = { protocol: "https", get: (header) => (header === "host" ? "hr.example.com" : undefined) };
delete process.env.PUBLIC_SERVER_URL;
assert.equal(publicServerUrl(req), "https://hr.example.com", "falls back to the request's own host");
process.env.PUBLIC_SERVER_URL = "https://panel.example.com/";
assert.equal(publicServerUrl(req), "https://panel.example.com");
delete process.env.PUBLIC_SERVER_URL;

console.log("plainErrorMessages.test.js passed");
