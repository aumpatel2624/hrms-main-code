// Explicit opt-in integration walk for Module 15: Payroll — Gratuity (ADR-031)
// Exercises Gratuity Rule (slab overlap/empty-array validation), a real
// end-to-end Gratuity submit (both slab-walk modes) producing an
// AdditionalSalary with a hand-computed amount, cancel cascading to that
// AdditionalSalary, the relievingDate/submitted-Salary-Slip submit guards,
// and the FullAndFinalStatement auto-suggest retrofit.
import "../apps/server/models/softDelete.js";
import "../apps/server/models/auditPlugin.js";
import assert from "node:assert/strict";
import fs from "node:fs";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Employee from "../apps/server/models/Employee.js";
import Company from "../apps/server/models/Company.js";
import SalaryComponent from "../apps/server/models/SalaryComponent.js";
import SalaryStructure from "../apps/server/models/SalaryStructure.js";
import SalaryStructureAssignment from "../apps/server/models/SalaryStructureAssignment.js";
import SalarySlip from "../apps/server/models/SalarySlip.js";
import Attendance from "../apps/server/models/Attendance.js";
import GratuityRule from "../apps/server/models/GratuityRule.js";
import Gratuity from "../apps/server/models/Gratuity.js";
import AdditionalSalary from "../apps/server/models/AdditionalSalary.js";
import FullAndFinalStatement from "../apps/server/models/FullAndFinalStatement.js";

dotenv.config({ path: "apps/server/.env", quiet: true });
if (process.env.RUN_GRATUITY_VERIFY !== "1") {
  throw new Error("Set RUN_GRATUITY_VERIFY=1 to run this local fixture walk");
}

const base = `http://127.0.0.1:${process.env.PORT || 7002}/api/v1`;
const prefix = `gratuity-verify-${Date.now()}`;
const DAY_MS = 86400000;
const owned = [];
const tracked = (Model, doc) => {
  if (doc && doc._id) owned.push([Model, doc._id]);
  return doc;
};
const createRaw = async (Model, data) => tracked(Model, await Model.create(data));
let cookie = "";
let calls = 0;

const call = async (method, path, body, expected = 200, auth = cookie) => {
  const response = await fetch(base + path, {
    method,
    headers: { "content-type": "application/json", cookie: auth },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    if (response.status === expected) {
      data = { raw: text };
    } else {
      throw new Error(`${method} ${path} (${response.status}) returned non-JSON: ${text.slice(0, 300)}`);
    }
  }
  calls++;
  assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(data)}`);
  return data;
};

const login = async (email, password) => {
  const response = await fetch(base + "/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password, locationConsent: true, ipConsent: true }),
  });
  assert.equal(response.status, 200, "Fixture login failed");
  return response.headers.getSetCookie().map((s) => s.split(";")[0]).join("; ");
};

const create = async (Model, path, data, expected = 201, auth = cookie) => {
  const res = await call("POST", path, data, expected, auth);
  return tracked(Model, res.data);
};

await mongoose.connect(process.env.DATABASE, { autoIndex: false });
const baseline = await Employee.countDocuments();
console.log(`Starting verify walk. Baseline employee count: ${baseline}`);

let employeeId = null;
let origDateOfJoining = null;
let origRelievingDate = null;

try {
  cookie = await login(process.env.SEED_ADMIN_EMAIL || "admin@example.com", process.env.SEED_ADMIN_PASSWORD || "Admin@123");

  const employee = await Employee.findOne({ status: "Active" }).lean();
  assert.ok(employee, "Fixture employee exists");
  employeeId = employee._id;
  const companyId = String(employee.companyId);
  origDateOfJoining = employee.dateOfJoining;
  origRelievingDate = employee.relievingDate;

  // =========================================================================
  // 1. Gratuity Rule — empty-array rejection
  // =========================================================================
  console.log("Testing Gratuity Rule empty-array rejection...");

  await call("POST", "/gratuity-rules", {
    name: `${prefix} No Components`,
    calculateGratuityAmountBasedOn: "Current Slab",
    applicableEarningsComponent: [],
    gratuityRuleSlabs: [{ fromYear: 0, toYear: null, fractionOfApplicableEarnings: 1 }],
  }, 400);

  await call("POST", "/gratuity-rules", {
    name: `${prefix} No Slabs`,
    calculateGratuityAmountBasedOn: "Current Slab",
    applicableEarningsComponent: [{ salaryComponentId: new mongoose.Types.ObjectId() }],
    gratuityRuleSlabs: [],
  }, 400);

  console.log("Gratuity Rule empty-array rejection passed.");

  // =========================================================================
  // 2. Gratuity Rule Slab — overlap rejection
  // =========================================================================
  console.log("Testing Gratuity Rule Slab overlap rejection...");

  await call("POST", "/gratuity-rules", {
    name: `${prefix} Overlapping Slabs`,
    calculateGratuityAmountBasedOn: "Current Slab",
    applicableEarningsComponent: [{ salaryComponentId: new mongoose.Types.ObjectId() }],
    gratuityRuleSlabs: [
      { fromYear: 0, toYear: 5, fractionOfApplicableEarnings: 0.1 },
      { fromYear: 3, toYear: 9, fractionOfApplicableEarnings: 0.2 }, // overlaps!
    ],
  }, 400);

  console.log("Gratuity Rule Slab overlap rejection passed.");

  // =========================================================================
  // 3. Fixtures: Salary Components, Structure, Assignment, submitted Slip
  // =========================================================================
  console.log("Setting up Salary Component / Structure / Assignment / Slip fixtures...");

  const basicComp = await create(SalaryComponent, "/salary-components", {
    companyId,
    salaryComponentName: `${prefix} Basic`,
    abbreviation: "GVB",
    type: "Earning",
    dependsOnPaymentDays: true,
  });

  const allowanceComp = await create(SalaryComponent, "/salary-components", {
    companyId,
    salaryComponentName: `${prefix} Allowance`,
    abbreviation: "GVA",
    type: "Earning",
    dependsOnPaymentDays: true,
  });

  const structure = await create(SalaryStructure, "/salary-structures", {
    companyId,
    payrollFrequency: "Monthly",
    currency: "USD",
    earnings: [
      { salaryComponentId: basicComp._id, amount: 50000, dependsOnPaymentDays: true },
      { salaryComponentId: allowanceComp._id, amount: 20000, dependsOnPaymentDays: true },
    ],
  });

  const assignment = await create(SalaryStructureAssignment, "/salary-structure-assignments", {
    employeeId,
    salaryStructureId: structure._id,
    fromDate: "2020-06-01",
    base: 50000,
  });

  // Full attendance for the slip period so dependsOnPaymentDays components
  // are not prorated down — defaultAmount on the submitted slip should equal
  // the full configured amount.
  for (let d = 1; d <= 30; d++) {
    const dateStr = `2020-06-${String(d).padStart(2, "0")}`;
    await createRaw(Attendance, { employeeId, companyId, attendanceDate: new Date(dateStr), status: "Present" }); // eslint-disable-line no-await-in-loop
  }

  const slip = await create(SalarySlip, "/salary-slips", {
    employeeId,
    startDate: "2020-06-01",
    endDate: "2020-06-30",
  });
  assert.equal(assignment._id && slip.status, "draft", "Salary Slip created in draft status");

  console.log("Fixtures ready.");

  // =========================================================================
  // 4. Gratuity submit rejected: no relievingDate set yet
  // =========================================================================
  console.log("Testing submit rejection when employee has no relieving date...");

  const ruleForNoRelieveTest = await create(GratuityRule, "/gratuity-rules", {
    name: `${prefix} Rule (pre-relieve check)`,
    calculateGratuityAmountBasedOn: "Current Slab",
    applicableEarningsComponent: [{ salaryComponentId: basicComp._id }],
    gratuityRuleSlabs: [{ fromYear: 0, toYear: null, fractionOfApplicableEarnings: 0.5 }],
  });

  const gratuityBeforeRelieve = await create(Gratuity, "/gratuities", {
    employeeId,
    gratuityRuleId: ruleForNoRelieveTest._id,
    payrollDate: "2026-01-01",
    salaryComponentId: basicComp._id,
  });

  await call("POST", `/gratuities/${gratuityBeforeRelieve._id}/submit`, undefined, 400);

  console.log("Submit correctly rejected: no relieving date set.");

  // Now set the employee's tenure window using a controlled millisecond span
  // (exactly 3650 calendar days = 10 years at 365 days/year), independent of
  // calendar/leap-year arithmetic.
  const dateOfJoining = new Date("2016-01-01T00:00:00.000Z");
  const relievingDate = new Date(dateOfJoining.getTime() + 3650 * DAY_MS);
  await Employee.updateOne({ _id: employeeId }, { dateOfJoining, relievingDate });

  // =========================================================================
  // 5. Gratuity submit rejected: relieving date set, but no submitted Slip
  // =========================================================================
  console.log("Testing submit rejection when no submitted Salary Slip exists yet...");

  await call("POST", `/gratuities/${gratuityBeforeRelieve._id}/submit`, undefined, 400);

  console.log("Submit correctly rejected: no submitted Salary Slip.");

  // Submit the Salary Slip now.
  await call("POST", `/salary-slips/${slip._id}/submit`, undefined, 200);

  // =========================================================================
  // 6. Gratuity — "Current Slab" mode end-to-end submit
  // =========================================================================
  console.log("Testing Gratuity submit: Current Slab mode...");

  const currentSlabRule = await create(GratuityRule, "/gratuity-rules", {
    name: `${prefix} Current Slab Rule`,
    calculateGratuityAmountBasedOn: "Current Slab",
    totalWorkingDaysPerYear: 365,
    workExperienceCalculationFunction: "Round off Work Experience",
    minimumYearForGratuity: 0,
    applicableEarningsComponent: [{ salaryComponentId: basicComp._id }],
    gratuityRuleSlabs: [
      { fromYear: 0, toYear: 9, fractionOfApplicableEarnings: 0.2 },
      { fromYear: 10, toYear: null, fractionOfApplicableEarnings: 0.5 },
    ],
  });

  const gratuity1 = await create(Gratuity, "/gratuities", {
    employeeId,
    gratuityRuleId: currentSlabRule._id,
    payrollDate: "2026-06-01",
    salaryComponentId: basicComp._id,
  });

  const submitted1 = await call("POST", `/gratuities/${gratuity1._id}/submit`, undefined, 200);

  // 3650 calendar days / 365 days-per-year = 10.0 years exactly -> rounds to 10.
  // Falls into slab [10, null] @ fraction 0.5. totalComponentAmount = 50000
  // (only Basic is applicable; Allowance is deliberately excluded).
  // amount = 50000 * 10 * 0.5 = 250000
  assert.equal(submitted1.data.currentWorkExperience, 10, "currentWorkExperience should be 10");
  assert.equal(submitted1.data.amount, 250000, "Current Slab amount should be 250000");
  assert.equal(submitted1.data.status, "submitted", "Gratuity should be submitted");
  assert.ok(submitted1.data.additionalSalaryId, "additionalSalaryId should be set");

  const addSal1 = await AdditionalSalary.findById(submitted1.data.additionalSalaryId).lean();
  assert.ok(addSal1, "Linked Additional Salary exists");
  assert.equal(addSal1.amount, 250000, "Additional Salary amount should match computed gratuity amount");
  assert.equal(addSal1.refDoctype, "Gratuity", "Additional Salary refDoctype should be Gratuity");
  assert.equal(String(addSal1.refDocnameId), String(gratuity1._id), "Additional Salary should reference this Gratuity");
  assert.equal(addSal1.status, "active", "Additional Salary should be active");

  console.log("Current Slab mode submit verified (amount = 250000).");

  // =========================================================================
  // 7. Gratuity — cancel cascades to the linked Additional Salary
  // =========================================================================
  console.log("Testing Gratuity cancel cascade...");

  await call("POST", `/gratuities/${gratuity1._id}/cancel`, undefined, 200);
  const cancelledAddSal = await AdditionalSalary.findById(submitted1.data.additionalSalaryId).lean();
  assert.equal(cancelledAddSal.status, "cancelled", "Linked Additional Salary must be cancelled too");

  console.log("Cancel cascade verified.");

  // =========================================================================
  // 8. Gratuity — "Sum of all previous slabs" mode end-to-end submit
  // =========================================================================
  console.log("Testing Gratuity submit: Sum of all previous slabs mode...");

  const sumSlabsRule = await create(GratuityRule, "/gratuity-rules", {
    name: `${prefix} Sum Of Previous Slabs Rule`,
    calculateGratuityAmountBasedOn: "Sum of all previous slabs",
    totalWorkingDaysPerYear: 365,
    workExperienceCalculationFunction: "Round off Work Experience",
    minimumYearForGratuity: 0,
    applicableEarningsComponent: [{ salaryComponentId: basicComp._id }],
    gratuityRuleSlabs: [
      { fromYear: 0, toYear: 4, fractionOfApplicableEarnings: 0.1 },
      { fromYear: 5, toYear: 9, fractionOfApplicableEarnings: 0.15 },
      { fromYear: 10, toYear: null, fractionOfApplicableEarnings: 0.2 },
    ],
  });

  const gratuity2 = await create(Gratuity, "/gratuities", {
    employeeId,
    gratuityRuleId: sumSlabsRule._id,
    payrollDate: "2026-06-01",
    salaryComponentId: basicComp._id,
  });

  const submitted2 = await call("POST", `/gratuities/${gratuity2._id}/submit`, undefined, 200);

  // workExperience=10, totalComponentAmount=50000.
  // [0,4]: width=5 -> 5*50000*0.1=25000; yearsLeft=5
  // [5,9]: width=5 -> 5*50000*0.15=37500 (=62500); yearsLeft=0
  // [10,null]: +0*50000*0.2=0 (=62500)
  assert.equal(submitted2.data.currentWorkExperience, 10, "currentWorkExperience should be 10");
  assert.equal(submitted2.data.amount, 62500, "Sum of all previous slabs amount should be 62500");

  console.log("Sum of all previous slabs mode submit verified (amount = 62500).");

  // =========================================================================
  // 9. FullAndFinalStatement auto-suggest retrofit
  // =========================================================================
  console.log("Testing FullAndFinalStatement auto-suggest retrofit...");

  const ffs = await create(FullAndFinalStatement, "/full-and-final-statements", {
    employeeId,
    transactionDate: "2026-06-15",
  });

  const ffsDoc = await FullAndFinalStatement.findById(ffs._id).lean();
  assert.equal(ffsDoc.payables.length, 1, "Should auto-suggest exactly one payable row");
  assert.equal(ffsDoc.payables[0].component, "Gratuity", "Auto-suggested row should be labeled Gratuity");
  assert.equal(ffsDoc.payables[0].amount, 62500, "Auto-suggested amount should match the submitted Gratuity (62500)");
  assert.equal(ffsDoc.payables[0].status, "Unsettled", "Auto-suggested row should start Unsettled");
  assert.equal(ffsDoc.totalPayableAmount, 62500, "Total payable should include the auto-suggested row");

  console.log("FullAndFinalStatement auto-suggest retrofit verified.");

  // =========================================================================
  // 10. GL/no-eval sanity checks
  // =========================================================================
  console.log("Performing GL/no-eval sanity checks on source files...");

  const filesToCheck = [
    "apps/server/utils/gratuityCalc.js",
    "apps/server/models/Gratuity.js",
    "apps/server/models/GratuityRule.js",
    "apps/server/controllers/v1/gratuity.controller.js",
  ];

  for (const filePath of filesToCheck) {
    const content = fs.readFileSync(filePath, "utf-8");
    assert.ok(
      !content.includes("eval(") && !content.includes("new Function("),
      `${filePath} must not contain eval() or new Function()`,
    );
    assert.ok(
      !content.includes("costCenter") && !content.includes("modeOfPayment") &&
      !content.includes("expenseAccount") && !content.includes("payableAccount") &&
      !content.includes("journalEntry") && !content.includes("JournalEntry"),
      `${filePath} must not contain any GL-adjacent field name`,
    );
  }

  console.log("GL/no-eval sanity checks passed.");

  console.log(`\n🎉 All integration walk checks passed! (${calls} API calls executed)`);
} finally {
  console.log("\nCleaning up fixture records in reverse order...");

  if (employeeId) {
    try {
      await Employee.updateOne({ _id: employeeId }, { dateOfJoining: origDateOfJoining, relievingDate: origRelievingDate });
    } catch (e) {
      // ignore
    }
  }

  // Cascade-delete any Additional Salary rows created by Gratuity submits,
  // keyed off every Gratuity id we tracked (owned[] already includes the
  // Gratuity docs themselves further down the reverse walk).
  try {
    await AdditionalSalary.deleteMany({ refDoctype: "Gratuity", refDocnameId: { $in: owned.filter(([M]) => M === Gratuity).map(([, id]) => id) } });
  } catch (e) {
    // ignore
  }

  for (let i = owned.length - 1; i >= 0; i--) {
    const [Model, id] = owned[i];
    try {
      await Model.deleteOne({ _id: id });
    } catch (e) {
      // ignore
    }
  }

  const postCount = await Employee.countDocuments();
  assert.equal(postCount, baseline, `Employee count (${postCount}) must match baseline (${baseline})`);
  console.log(`Verified employee baseline preserved: ${postCount}/${baseline}`);
  await mongoose.disconnect();
}
