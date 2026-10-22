import assert from "node:assert/strict";
import { normalizeOption } from "./select-options.js";

// Object options pass through untouched.
const obj = { value: "a1", label: "Alpha" };
assert.equal(normalizeOption(obj), obj, "object option is returned as-is");

// Plain enum strings become { value, label }.
assert.deepEqual(normalizeOption("IN"), { value: "IN", label: "IN" }, "string option");
assert.deepEqual(normalizeOption(5), { value: 5, label: "5" }, "number option");

// A bare null/undefined ("unset") must not stay null — crud-view read `.value`
// off it and crashed every Employee Checkin view page (logType: ["IN", "OUT", null]).
assert.deepEqual(normalizeOption(null), { value: null, label: "—" }, "null option");
assert.deepEqual(normalizeOption(undefined), { value: null, label: "—" }, "undefined option");

// The view's lookup: the Employee Checkin logType options resolve a stored value to its label.
const logTypes = ["IN", "OUT", null].map(normalizeOption);
assert.equal(logTypes.find((o) => String(o.value) === "IN")?.label, "IN", "IN resolves");
assert.equal(logTypes.find((o) => String(o.value) === "OUT")?.label, "OUT", "OUT resolves");

console.log("select-options: all assertions passed");
