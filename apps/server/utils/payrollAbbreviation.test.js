import assert from "node:assert";
import { deriveAbbreviation } from "./payrollAbbreviation.js";

assert.strictEqual(deriveAbbreviation("Basic Salary"), "BS", "two-word name derives initials");
assert.strictEqual(deriveAbbreviation("House Rent Allowance"), "HRA", "three-word name derives initials");
assert.strictEqual(deriveAbbreviation("Provident Fund"), "PF", "two-word name, different words");
assert.strictEqual(deriveAbbreviation("Tax"), "T", "single-word name derives its own initial");
assert.strictEqual(deriveAbbreviation("  Basic   Salary  "), "BS", "extra whitespace is collapsed before deriving");
assert.strictEqual(deriveAbbreviation("basic salary"), "BS", "lowercase input is uppercased");

console.log("payrollAbbreviation.test.js: all assertions passed");
