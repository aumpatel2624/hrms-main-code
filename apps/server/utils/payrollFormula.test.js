import assert from "node:assert";
import { evaluateFormula, evaluateCondition } from "./payrollFormula.js";

// --------------------------------------------------------------- arithmetic --
assert.strictEqual(evaluateFormula("2 + 3 * 4", {}), 14, "multiplication binds tighter than addition");
assert.strictEqual(evaluateFormula("(2 + 3) * 4", {}), 20, "parentheses override precedence");
assert.strictEqual(evaluateFormula("10 / 2 - 1", {}), 4, "division and subtraction, left to right");
assert.strictEqual(evaluateFormula("-5 + 3", {}), -2, "unary minus");
assert.strictEqual(evaluateFormula("-(2 + 3)", {}), -5, "unary minus over a parenthesized expression");
assert.strictEqual(evaluateFormula("2 * -3", {}), -6, "unary minus as a multiplicative operand");

// ------------------------------------------------------------------- vars --
assert.strictEqual(evaluateFormula("basic * 0.4", { basic: 50000 }), 20000, "variable reference resolves from context");
assert.strictEqual(evaluateFormula("base + variable", { base: 1000, variable: 250 }), 1250, "base/variable context keys");
assert.throws(() => evaluateFormula("basic + 1", {}), /Undefined variable "basic"/, "undefined variable raises a clear error");

// -------------------------------------------------------------- functions --
assert.strictEqual(evaluateFormula("round(4.5)", {}), 5, "round()");
assert.strictEqual(evaluateFormula("ceil(4.1)", {}), 5, "ceil()");
assert.strictEqual(evaluateFormula("floor(4.9)", {}), 4, "floor()");
assert.strictEqual(evaluateFormula("min(5, 2, 9)", {}), 2, "min() variadic");
assert.strictEqual(evaluateFormula("max(5, 2, 9)", {}), 9, "max() variadic");
assert.throws(() => evaluateFormula("round(1, 2)", {}), /Function "round" called with 2 argument/, "round() rejects extra args");
assert.throws(() => evaluateFormula("bogus(1)", {}), /Unknown function "bogus"/, "unknown function name raises a clear error");

// ------------------------------------------------------------- comparison --
assert.strictEqual(evaluateCondition("5 == 5", {}), true, "==");
assert.strictEqual(evaluateCondition("5 != 5", {}), false, "!=");
assert.strictEqual(evaluateCondition("3 < 5", {}), true, "<");
assert.strictEqual(evaluateCondition("5 > 3", {}), true, ">");
assert.strictEqual(evaluateCondition("5 <= 5", {}), true, "<=");
assert.strictEqual(evaluateCondition("5 >= 6", {}), false, ">=");

// ----------------------------------------------------------------- boolean --
assert.strictEqual(evaluateCondition("1 < 2 and 3 < 4", {}), true, "and combined with comparisons");
assert.strictEqual(evaluateCondition("1 > 2 or 3 < 4", {}), true, "or combined with comparisons");
assert.strictEqual(evaluateCondition("not (1 > 2)", {}), true, "not over a parenthesized comparison");
assert.strictEqual(evaluateCondition("not 1 > 2", {}), true, "not binds tighter than comparison per grammar (not evaluates its operand as a full not-expr, then compares)");

// ---------------------------------------------------------------- combined --
assert.strictEqual(
  evaluateCondition("basic * 0.4 > 5000 and hra <= 20000", { basic: 20000, hra: 8000 }),
  true,
  "arithmetic + comparison + boolean + variables combined",
);
assert.strictEqual(
  evaluateCondition("basic * 0.4 > 5000 and hra <= 20000", { basic: 1000, hra: 8000 }),
  false,
  "combined expression, false branch",
);

// ----------------------------------------------------------- malformed --
assert.throws(() => evaluateFormula("2 +", {}), /Unexpected end of expression/, "trailing operator is a parse error");
assert.throws(() => evaluateFormula("2 + * 3", {}), /Unexpected token/, "double operator is a parse error");
assert.throws(() => evaluateFormula("(2 + 3", {}), /Expected "\)"/, "unbalanced parenthesis is a parse error");
assert.throws(() => evaluateFormula("2 3", {}), /Unexpected token/, "two adjacent literals is a parse error");

// ----------------------------------------------------------- formula vs condition --
assert.throws(() => evaluateFormula("3 > 2", {}), /evaluated to a non-numeric value/, "evaluateFormula rejects a boolean result");
assert.strictEqual(evaluateCondition("5", {}), true, "evaluateCondition treats a nonzero number as truthy");
assert.strictEqual(evaluateCondition("0", {}), false, "evaluateCondition treats zero as falsy");

console.log("payrollFormula.test.js: all assertions passed");
