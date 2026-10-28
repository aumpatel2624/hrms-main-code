// 28 Oct re-test: error messages people see named records by id — "Salary
// Component 64f… not found", "…under Staffing Plan 64f…". Each now names the
// record or describes it plainly. Reads the source: no message interpolates
// an id.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { evaluateComponentTable } from "../../utils/payrollCtc.js";

const files = [
  "controllers/v1/jobOffer.controller.js",
  "controllers/v1/jobOpening.controller.js",
  "controllers/v1/staffingPlan.controller.js",
  "controllers/v1/payroll.controller.js",
  "controllers/v1/performanceGoals.controller.js",
  "controllers/v1/payrollBenefits.controller.js",
  "controllers/v1/payrollTax.controller.js",
  "utils/hraExemptionCalc.js",
  "utils/payrollCtc.js",
];
for (const file of files) {
  const source = readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
  // throwError(400, `…${x.someId}…`), new Error(`…${plan._id}…`), return `…${companyId}…`
  const messages = [...source.matchAll(/(?:throwError\(\d+,\s*|new Error\(|return\s+)`([^`]*)`/g)].map((m) => m[1]);
  const withIds = messages.filter((message) => /\$\{[^}]*(?:Id|_id)\s*\}/.test(message));
  assert.deepEqual(withIds, [], `${file} puts an id in a message`);
}

// A formula error names the row by its component, not its id.
assert.throws(
  () => evaluateComponentTable([{ salaryComponentId: { _id: "64f000000000000000000001", salaryComponentName: "Basic" }, amountBasedOnFormula: true, formula: "nope +" }], {}),
  /^Error: Row "Basic": formula error/,
);

console.log("idFreeMessages.test.js: all assertions passed");
