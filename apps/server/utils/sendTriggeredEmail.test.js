import assert from "node:assert/strict";
import { extractTokens, validateMergeTokens, fillMergeFields } from "./sendTriggeredEmail.js";

// extractTokens finds every {{TOKEN}}, including repeats.
assert.deepEqual(extractTokens("Hi {{USERNAME}}, code {{OTP_CODE}}"), ["USERNAME", "OTP_CODE"]);
assert.deepEqual(extractTokens("{{A}} and {{A}} again"), ["A", "A"]);
assert.deepEqual(extractTokens("no tokens here"), []);
assert.deepEqual(extractTokens(""), []);
assert.deepEqual(extractTokens(undefined), []);

// validateMergeTokens: empty result means every token used is declared.
assert.deepEqual(
  validateMergeTokens(
    { emailSubject: "Hi {{USERNAME}}", emailSignature: "Code: {{OTP_CODE}}" },
    { USERNAME: "name", OTP_CODE: "code" },
  ),
  [],
);

// An undeclared token is reported.
assert.deepEqual(
  validateMergeTokens(
    { emailSubject: "Hi {{USERNAME}}", emailSignature: "{{NOT_REAL}}" },
    { USERNAME: "name" },
  ),
  ["NOT_REAL"],
);

// No trigger declared (mergeFields undefined/empty) — any token used is undeclared.
assert.deepEqual(
  validateMergeTokens({ emailSubject: "{{X}}", emailSignature: "" }, undefined),
  ["X"],
);

// A template using no tokens at all is always valid.
assert.deepEqual(
  validateMergeTokens({ emailSubject: "Welcome", emailSignature: "Hello" }, { USERNAME: "name" }),
  [],
);

// fillMergeFields replaces every occurrence, not just the first.
assert.equal(
  fillMergeFields("{{A}} then {{A}} again", { A: "x" }),
  "x then x again",
);
assert.equal(fillMergeFields("Hi {{USERNAME}}", { USERNAME: "Dev" }), "Hi Dev");
assert.equal(fillMergeFields("no tokens", { USERNAME: "Dev" }), "no tokens");
assert.equal(fillMergeFields("", { USERNAME: "Dev" }), "");
// A token with no entry in `values` is left as the literal placeholder —
// only tokens actually supplied are replaced.
assert.equal(fillMergeFields("Hi {{USERNAME}}", {}), "Hi {{USERNAME}}");

console.log("sendTriggeredEmail: all checks passed");
