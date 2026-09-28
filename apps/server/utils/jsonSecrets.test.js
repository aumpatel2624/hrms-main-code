import assert from "node:assert/strict";
import { stripCredentials } from "./jsonSecrets.js";

const row = {
  employeeName: "Test Employee",
  password: "$2b$10$hash",
  reportsTo: [{ employeeName: "Manager", password: "$2b$10$hash2", email: "m" }],
};
const out = JSON.parse(JSON.stringify(row, stripCredentials));
assert.equal(out.password, undefined, "top-level password removed");
assert.equal(out.reportsTo[0].password, undefined, "password embedded by a $lookup removed");
assert.equal(out.reportsTo[0].email, "m", "other fields kept");
assert.equal(out.employeeName, "Test Employee");
console.log("jsonSecrets.test.js passed");
