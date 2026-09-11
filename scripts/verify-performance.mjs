// Explicit opt-in integration walk for Module 16: Performance, foundation
// half (ADR-032). Exercises Appraisal Template weightage-sum rejection, the
// Appraisal Cycle kraEvaluationMethod immutability guard, eligible-employee
// resolution + duplicate-appraisee skip on the bulk create-appraisals
// action, Appraisal creation correctly copying template rows into whichever
// of appraisalKra/goals is active (including the manual-mode KRA-ref ->
// free-text label translation), submit computing all four scores against
// hand-computed numbers in both automated and manual mode (including the
// finalScoreFormula path), cancel, the complete-cycle draft guard, and a
// no-eval/no-GL sanity check.
//
// Goal and Employee Performance Feedback are the deliberately separate
// second branch (ADR-032) — nothing here exercises either; avgFeedbackScore
// is expected to stay 0 throughout.
import "../apps/server/models/softDelete.js";
import "../apps/server/models/auditPlugin.js";
import assert from "node:assert/strict";
import fs from "node:fs";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Employee from "../apps/server/models/Employee.js";
import Designation from "../apps/server/models/Designation.js";
import KRA from "../apps/server/models/KRA.js";
import EmployeeFeedbackCriteria from "../apps/server/models/EmployeeFeedbackCriteria.js";
import AppraisalTemplate from "../apps/server/models/AppraisalTemplate.js";
import AppraisalCycle from "../apps/server/models/AppraisalCycle.js";
import Appraisal from "../apps/server/models/Appraisal.js";

dotenv.config({ path: "apps/server/.env", quiet: true });
if (process.env.RUN_PERFORMANCE_VERIFY !== "1") {
  throw new Error("Set RUN_PERFORMANCE_VERIFY=1 to run this local fixture walk");
}

const base = `http://127.0.0.1:${process.env.PORT || 7002}/api/v1`;
const prefix = `perf-verify-${Date.now()}`;
const owned = [];
const tracked = (Model, doc) => {
  if (doc && doc._id) owned.push([Model, doc._id]);
  return doc;
};
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
let designationId = null;
let origAppraisalTemplateId = undefined;

try {
  cookie = await login(process.env.SEED_ADMIN_EMAIL || "admin@example.com", process.env.SEED_ADMIN_PASSWORD || "Admin@123");

  const employee = await Employee.findOne({ status: "Active" }).lean();
  assert.ok(employee, "Fixture employee exists");
  employeeId = employee._id;
  designationId = employee.designationId;
  const companyId = String(employee.companyId);

  const origDesignation = await Designation.findById(designationId).lean();
  origAppraisalTemplateId = origDesignation.appraisalTemplateId;

  // =========================================================================
  // 1. KRA / Employee Feedback Criteria fixtures
  // =========================================================================
  console.log("Setting up KRA / Employee Feedback Criteria fixtures...");

  const kra1 = await create(KRA, "/kras", { name: `${prefix} KRA One` });
  const kra2 = await create(KRA, "/kras", { name: `${prefix} KRA Two` });
  const c1 = await create(EmployeeFeedbackCriteria, "/employee-feedback-criteria", { criteria: `${prefix} Criteria One` });
  const c2 = await create(EmployeeFeedbackCriteria, "/employee-feedback-criteria", { criteria: `${prefix} Criteria Two` });

  console.log("Fixtures ready.");

  // =========================================================================
  // 2. Appraisal Template — weightage-sum-not-100 rejection
  // =========================================================================
  console.log("Testing Appraisal Template weightage-sum rejection...");

  await call("POST", "/appraisal-templates", {
    templateTitle: `${prefix} Bad Goals Template`,
    goals: [{ kraId: kra1._id, weightage: 60 }, { kraId: kra2._id, weightage: 30 }], // sums to 90
    ratingCriteria: [{ criteriaId: c1._id, weightage: 100 }],
  }, 400);

  await call("POST", "/appraisal-templates", {
    templateTitle: `${prefix} Bad Rating Template`,
    goals: [{ kraId: kra1._id, weightage: 100 }],
    ratingCriteria: [{ criteriaId: c1._id, weightage: 60 }, { criteriaId: c2._id, weightage: 60 }], // sums to 120
  }, 400);

  console.log("Appraisal Template weightage-sum rejection verified.");

  const template = await create(AppraisalTemplate, "/appraisal-templates", {
    templateTitle: `${prefix} Template`,
    goals: [{ kraId: kra1._id, weightage: 60 }, { kraId: kra2._id, weightage: 40 }],
    ratingCriteria: [{ criteriaId: c1._id, weightage: 50 }, { criteriaId: c2._id, weightage: 50 }],
  });

  // Point the fixture employee's Designation at this template so "get
  // eligible employees" resolves a real default — restored in finally.
  await Designation.updateOne({ _id: designationId }, { appraisalTemplateId: template._id });

  // =========================================================================
  // 3. Appraisal Cycle A (Automated mode) — eligible employees + create
  // =========================================================================
  console.log("Testing Appraisal Cycle A (Automated mode)...");

  const cycleA = await create(AppraisalCycle, "/appraisal-cycles", {
    cycleName: `${prefix} Cycle A`,
    companyId,
    startDate: "2026-01-01",
    endDate: "2026-06-30",
    designationId,
    kraEvaluationMethod: "Automated Based on Goal Progress",
  });

  const eligibleA = await call("POST", `/appraisal-cycles/${cycleA._id}/eligible-employees`, undefined, 200);
  const rowA = eligibleA.data.appraisees.find((r) => String(r.employeeId) === String(employeeId));
  assert.ok(rowA, "Fixture employee should appear in Cycle A's eligible-employees list");
  assert.equal(String(rowA.appraisalTemplateId), String(template._id), "Default template should resolve from the Designation");

  const createdA = await call("POST", `/appraisal-cycles/${cycleA._id}/create-appraisals`, {}, 200);
  const resultA = createdA.data.results.find((r) => String(r.employeeId) === String(employeeId));
  assert.ok(resultA?.success, "Create-appraisals should succeed for the fixture employee");
  const appraisalAId = resultA.appraisalId;
  tracked(Appraisal, { _id: appraisalAId });

  // Duplicate-appraisee skip: running create-appraisals again for the same
  // cycle should skip (not fail, not create a second Appraisal).
  const createdAAgain = await call("POST", `/appraisal-cycles/${cycleA._id}/create-appraisals`, {}, 200);
  const resultAAgain = createdAAgain.data.results.find((r) => String(r.employeeId) === String(employeeId));
  assert.equal(resultAAgain?.skipped, true, "Second create-appraisals run must skip the existing Appraisal, not duplicate it");

  // Standalone single-create must reject the duplicate outright (409), not skip.
  await call("POST", "/appraisals", { employeeId, appraisalCycleId: cycleA._id }, 409);

  const appraisalA = await Appraisal.findById(appraisalAId).lean();
  assert.equal(appraisalA.rateGoalsManually, false, "Cycle A is Automated mode");
  assert.equal(appraisalA.appraisalKra.length, 2, "Template's 2 goal rows should copy into appraisalKra");
  const kraRow1 = appraisalA.appraisalKra.find((r) => String(r.kraId) === String(kra1._id));
  const kraRow2 = appraisalA.appraisalKra.find((r) => String(r.kraId) === String(kra2._id));
  assert.equal(kraRow1.weightage, 60);
  assert.equal(kraRow2.weightage, 40);
  assert.equal(appraisalA.selfRatings.length, 2, "Template's 2 rating-criteria rows should copy into selfRatings");
  assert.equal(new Date(appraisalA.startDate).toISOString().slice(0, 10), "2026-01-01", "startDate should default from the cycle");
  assert.equal(new Date(appraisalA.endDate).toISOString().slice(0, 10), "2026-06-30", "endDate should default from the cycle");
  assert.equal(appraisalA.status, "draft");

  console.log("Cycle A eligible-employees + create-appraisals + duplicate-skip verified.");

  // =========================================================================
  // 4. Appraisal A submit — Automated mode, default (average) final score
  // =========================================================================
  console.log("Testing Appraisal A submit (Automated mode, default final score)...");

  await call("PUT", `/appraisals/${appraisalAId}`, {
    selfRatings: [
      { criteriaId: c1._id, weightage: 50, rating: 0.8 },
      { criteriaId: c2._id, weightage: 50, rating: 0.6 },
    ],
  }, 200);

  const submittedA = await call("POST", `/appraisals/${appraisalAId}/submit`, undefined, 200);
  // No Goal collection exists yet (second branch) -> goalCompletion/goalScore
  // stay 0 for every appraisalKra row -> totalScore 0. This is the honest
  // foundation-half answer, not a placeholder bug.
  assert.equal(submittedA.data.totalScore, 0, "Goal score must be 0 with no Goal data available yet");
  // selfScore = 0.8*5*0.5 + 0.6*5*0.5 = 2 + 1.5 = 3.5
  assert.equal(submittedA.data.selfScore, 3.5, "Self score should be 3.5");
  assert.equal(submittedA.data.avgFeedbackScore, 0, "Average feedback score stays 0 in this half");
  // Default final score = (0 + 3.5 + 0) / 3 = 1.1666... -> 1.17
  assert.equal(submittedA.data.finalScore, 1.17, "Default final score should be the simple average, rounded to 2dp");
  assert.equal(submittedA.data.status, "submitted");

  console.log("Appraisal A submit verified (selfScore 3.5, finalScore 1.17).");

  // =========================================================================
  // 5. kraEvaluationMethod immutability once a non-cancelled Appraisal exists
  // =========================================================================
  console.log("Testing kraEvaluationMethod immutability guard...");

  await call("PUT", `/appraisal-cycles/${cycleA._id}`, { kraEvaluationMethod: "Manual Rating" }, 400);

  console.log("kraEvaluationMethod immutability guard verified.");

  // =========================================================================
  // 6. Appraisal Cycle B (Manual Rating mode) — manual-mode copy translation
  // =========================================================================
  console.log("Testing Appraisal Cycle B (Manual Rating mode)...");

  const cycleB = await create(AppraisalCycle, "/appraisal-cycles", {
    cycleName: `${prefix} Cycle B`,
    companyId,
    startDate: "2026-07-01",
    endDate: "2026-12-31",
    designationId,
    kraEvaluationMethod: "Manual Rating",
  });

  await call("POST", `/appraisal-cycles/${cycleB._id}/eligible-employees`, undefined, 200);
  const createdB = await call("POST", `/appraisal-cycles/${cycleB._id}/create-appraisals`, {}, 200);
  const resultB = createdB.data.results.find((r) => String(r.employeeId) === String(employeeId));
  assert.ok(resultB?.success, "Create-appraisals should succeed under Cycle B too (different cycle, no duplicate conflict)");
  const appraisalBId = resultB.appraisalId;
  tracked(Appraisal, { _id: appraisalBId });

  const appraisalB = await Appraisal.findById(appraisalBId).lean();
  assert.equal(appraisalB.rateGoalsManually, true, "Cycle B is Manual Rating mode");
  assert.equal(appraisalB.goals.length, 2, "Template's 2 goal rows should copy into goals (manual mode)");
  // Genuine translation step: the template's rows are KRA refs, but manual
  // mode's `label` is free text seeded from the referenced KRA's *name*.
  const goalRow1 = appraisalB.goals.find((g) => g.weightage === 60);
  const goalRow2 = appraisalB.goals.find((g) => g.weightage === 40);
  assert.equal(goalRow1.label, `${prefix} KRA One`, "Manual-mode goal label should be seeded from the KRA's name, not its id");
  assert.equal(goalRow2.label, `${prefix} KRA Two`);
  assert.equal(appraisalB.appraisalKra.length, 0, "Manual mode must not populate appraisalKra");

  console.log("Cycle B manual-mode copy translation verified.");

  // Score cap rejection: a goal score above NUMBER_OF_STARS (5) must be
  // rejected at update time, not silently clamped.
  await call("PUT", `/appraisals/${appraisalBId}`, {
    goals: [
      { label: goalRow1.label, weightage: 60, score: 6 },
      { label: goalRow2.label, weightage: 40, score: 3 },
    ],
  }, 400);

  await call("PUT", `/appraisals/${appraisalBId}`, {
    goals: [
      { label: goalRow1.label, weightage: 60, score: 4 },
      { label: goalRow2.label, weightage: 40, score: 3 },
    ],
    selfRatings: [
      { criteriaId: c1._id, weightage: 50, rating: 1 },
      { criteriaId: c2._id, weightage: 50, rating: 0.4 },
    ],
  }, 200);

  // Formula-based final score, set on the cycle before submit.
  await call("PUT", `/appraisal-cycles/${cycleB._id}`, {
    calculateFinalScoreBasedOnFormula: true,
    finalScoreFormula: "goalScore + selfScore * 2",
  }, 200);

  const submittedB = await call("POST", `/appraisals/${appraisalBId}/submit`, undefined, 200);
  // Manual goal score: 4*60/100 + 3*40/100 = 2.4 + 1.2 = 3.6
  assert.equal(submittedB.data.totalScore, 3.6, "Manual goal score should be 3.6");
  // selfScore = 1*5*0.5 + 0.4*5*0.5 = 2.5 + 1 = 3.5
  assert.equal(submittedB.data.selfScore, 3.5, "Self score should be 3.5");
  // finalScoreFormula: goalScore + selfScore*2 = 3.6 + 7.0 = 10.6
  assert.equal(submittedB.data.finalScore, 10.6, "Formula-based final score should evaluate goalScore + selfScore*2");

  console.log("Appraisal B submit verified (manual mode, formula-based final score 10.6).");

  // =========================================================================
  // 7. Cancel, and kraEvaluationMethod becomes mutable again once the only
  //    Appraisal under the cycle is cancelled.
  // =========================================================================
  console.log("Testing cancel + post-cancel kraEvaluationMethod mutability...");

  const cancelledB = await call("POST", `/appraisals/${appraisalBId}/cancel`, undefined, 200);
  assert.equal(cancelledB.data.status, "cancelled");
  await call("POST", `/appraisals/${appraisalBId}/cancel`, undefined, 400); // already cancelled

  // Cycle B's only Appraisal is now cancelled -> the immutability guard must
  // no longer block changing kraEvaluationMethod.
  await call("PUT", `/appraisal-cycles/${cycleB._id}`, { kraEvaluationMethod: "Automated Based on Goal Progress" }, 200);

  console.log("Cancel + post-cancel mutability verified.");

  // =========================================================================
  // 8. Complete Cycle — blocked while a draft Appraisal exists
  // =========================================================================
  console.log("Testing Complete Cycle draft guard...");

  const cycleC = await create(AppraisalCycle, "/appraisal-cycles", {
    cycleName: `${prefix} Cycle C`,
    companyId,
    startDate: "2027-01-01",
    endDate: "2027-06-30",
    designationId,
    kraEvaluationMethod: "Automated Based on Goal Progress",
  });
  await call("POST", `/appraisal-cycles/${cycleC._id}/eligible-employees`, undefined, 200);
  const createdC = await call("POST", `/appraisal-cycles/${cycleC._id}/create-appraisals`, {}, 200);
  const resultC = createdC.data.results.find((r) => String(r.employeeId) === String(employeeId));
  assert.ok(resultC?.success);
  const appraisalCId = resultC.appraisalId;
  tracked(Appraisal, { _id: appraisalCId });

  await call("POST", `/appraisal-cycles/${cycleC._id}/complete`, undefined, 400); // still draft

  await call("POST", `/appraisals/${appraisalCId}/submit`, undefined, 200);
  const completedC = await call("POST", `/appraisal-cycles/${cycleC._id}/complete`, undefined, 200);
  assert.equal(completedC.data.status, "Completed");

  // No transactions against a Completed cycle.
  await call("POST", `/appraisal-cycles/${cycleC._id}/create-appraisals`, {}, 400);

  // Direct-status-write guard: setting status: "Completed" from a
  // non-Completed state via plain update (not the guarded action) must be
  // rejected on a fresh cycle.
  const freshCycle = await create(AppraisalCycle, "/appraisal-cycles", {
    cycleName: `${prefix} Cycle D`,
    companyId,
    startDate: "2027-07-01",
    endDate: "2027-12-31",
  });
  await call("PUT", `/appraisal-cycles/${freshCycle._id}`, { status: "Completed" }, 400);

  console.log("Complete Cycle draft guard + Completed-cycle transaction guard + direct-status-write guard verified.");

  // =========================================================================
  // 9. No-eval / no-GL sanity checks
  // =========================================================================
  console.log("Performing GL/no-eval sanity checks on source files...");

  const filesToCheck = [
    "apps/server/utils/appraisalCalc.js",
    "apps/server/models/KRA.js",
    "apps/server/models/EmployeeFeedbackCriteria.js",
    "apps/server/models/AppraisalTemplate.js",
    "apps/server/models/AppraisalCycle.js",
    "apps/server/models/Appraisal.js",
    "apps/server/controllers/v1/performance.controller.js",
    "apps/server/routes/v1/performance.routes.js",
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

  console.log(`\n🎉 All Performance verify walk checks passed! (${calls} API calls executed)`);
} finally {
  console.log("\nCleaning up fixture records in reverse order...");

  if (designationId && origAppraisalTemplateId !== undefined) {
    try {
      await Designation.updateOne({ _id: designationId }, { appraisalTemplateId: origAppraisalTemplateId });
    } catch (e) {
      // ignore
    }
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
