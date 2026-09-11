// Explicit opt-in integration walk for Module 16: Performance, transactional
// half (ADR-032, feat/performance-goals). Exercises Goal's parent-cycle
// guard, the server-side bulk status-transition guard, the recursive
// parent-progress rollup across 3 levels of nesting, KRA propagation to
// children, SCOPES.OWN enforcement, real Goal data wired into
// `submitAppraisal`'s automated-mode scoring, and Employee Performance
// Feedback's submit/cancel recompute of Appraisal.avgFeedbackScore/
// finalScore against hand-computed numbers — including a real HTTP DELETE
// check on both new doctypes (issue #26: several controllers previously
// called a non-existent `doc.softDelete()`; this script exercises the real
// HTTP DELETE endpoint directly, not a Mongoose bypass, to catch that class
// of bug).
import "../apps/server/models/softDelete.js";
import "../apps/server/models/auditPlugin.js";
import assert from "node:assert/strict";
import fs from "node:fs";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import Employee from "../apps/server/models/Employee.js";
import User from "../apps/server/models/User.js";
import RoleMaster from "../apps/server/models/RoleMaster.js";
import KRA from "../apps/server/models/KRA.js";
import EmployeeFeedbackCriteria from "../apps/server/models/EmployeeFeedbackCriteria.js";
import AppraisalTemplate from "../apps/server/models/AppraisalTemplate.js";
import AppraisalCycle from "../apps/server/models/AppraisalCycle.js";
import Appraisal from "../apps/server/models/Appraisal.js";
import Goal from "../apps/server/models/Goal.js";
import EmployeePerformanceFeedback from "../apps/server/models/EmployeePerformanceFeedback.js";

dotenv.config({ path: "apps/server/.env", quiet: true });
if (process.env.RUN_PERFORMANCE_GOALS_VERIFY !== "1") {
  throw new Error("Set RUN_PERFORMANCE_GOALS_VERIFY=1 to run this local fixture walk");
}

const base = `http://127.0.0.1:${process.env.PORT || 7002}/api/v1`;
const prefix = `perf-goals-verify-${Date.now()}`;
const owned = [];
const tracked = (Model, doc) => {
  if (doc && doc._id) owned.push([Model, doc._id]);
  return doc;
};
const createRaw = async (Model, data) => tracked(Model, await Model.create(data));
let cookie = "";
let calls = 0;
let modifiedEmployeeId = null;
let origUserId = null;

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

try {
  cookie = await login(process.env.SEED_ADMIN_EMAIL || "admin@example.com", process.env.SEED_ADMIN_PASSWORD || "Admin@123");

  const employee = await Employee.findOne({ status: "Active" }).lean();
  assert.ok(employee, "Fixture employee exists");
  const employeeId = String(employee._id);
  const companyId = String(employee.companyId);

  const others = await Employee.find({ status: "Active", companyId: employee.companyId, _id: { $ne: employee._id } }).limit(2).lean();
  assert.ok(others.length >= 2, "At least 2 other fixture employees exist");
  const otherEmployeeId = String(others[0]._id);
  const reviewer1Id = String(others[0]._id);
  const reviewer2Id = String(others[1]._id);

  // =========================================================================
  // 1. Fixtures: KRA, Appraisal Template, Appraisal Cycle, Appraisal
  // =========================================================================
  console.log("Setting up KRA / Template / Cycle / Appraisal fixtures...");

  const kra1 = await create(KRA, "/kras", { name: `${prefix} KRA One` });
  const criteria1 = await create(EmployeeFeedbackCriteria, "/employee-feedback-criteria", { criteria: `${prefix} Criteria One` });

  const template = await create(AppraisalTemplate, "/appraisal-templates", {
    templateTitle: `${prefix} Template`,
    goals: [{ kraId: kra1._id, weightage: 100 }],
    ratingCriteria: [{ criteriaId: criteria1._id, weightage: 100 }],
  });

  const cycle = await create(AppraisalCycle, "/appraisal-cycles", {
    cycleName: `${prefix} Cycle`,
    companyId,
    startDate: "2026-01-01",
    endDate: "2026-06-30",
    kraEvaluationMethod: "Automated Based on Goal Progress",
  });

  const appraisal = await create(Appraisal, "/appraisals", {
    employeeId,
    appraisalCycleId: cycle._id,
    appraisalTemplateId: template._id,
  });

  console.log("Fixtures ready.");

  // =========================================================================
  // 2. Goal — basic create, top-level kraId-required-with-cycle validation
  // =========================================================================
  console.log("Testing Goal top-level kraId-required-with-cycle validation...");

  await call("POST", "/goals", {
    goalName: `${prefix} Should Fail`,
    employeeId,
    appraisalCycleId: cycle._id,
    startDate: "2026-01-01",
    // kraId omitted — must be rejected for a top-level goal tagged to a cycle.
  }, 400);

  console.log("kraId-required-with-cycle validation verified.");

  // =========================================================================
  // 3. Recursive parent-progress rollup across 3 levels of nesting
  // =========================================================================
  console.log("Testing recursive parent-progress rollup (3 levels)...");

  const root = await create(Goal, "/goals", {
    goalName: `${prefix} Root`, isGroup: true, employeeId, startDate: "2026-01-01",
  });
  const mid = await create(Goal, "/goals", {
    goalName: `${prefix} Mid`, isGroup: true, employeeId, parentGoalId: root._id, startDate: "2026-01-01",
  });
  const leaf = await create(Goal, "/goals", {
    goalName: `${prefix} Leaf Group`, isGroup: true, employeeId, parentGoalId: mid._id, startDate: "2026-01-01",
  });
  const leafA = await create(Goal, "/goals", {
    goalName: `${prefix} Leaf A`, employeeId, parentGoalId: leaf._id, progress: 100, startDate: "2026-01-01",
  });
  const leafB = await create(Goal, "/goals", {
    goalName: `${prefix} Leaf B`, employeeId, parentGoalId: leaf._id, progress: 50, startDate: "2026-01-01",
  });

  // leaf.progress = avg(100, 50) = 75; mid inherits 75 (its only child); root inherits 75.
  const leafReload = await call("GET", `/goals/${leaf._id}`, undefined, 200);
  assert.equal(leafReload.data.progress, 75, "Leaf-group progress should be the average of its 2 children");
  assert.equal(leafReload.data.status, "In Progress");
  const midReload = await call("GET", `/goals/${mid._id}`, undefined, 200);
  assert.equal(midReload.data.progress, 75, "Mid-level rollup should bubble up from its only child");
  const rootReload = await call("GET", `/goals/${root._id}`, undefined, 200);
  assert.equal(rootReload.data.progress, 75, "Root rollup should bubble up 2 levels");

  console.log("3-level recursive parent-progress rollup verified (75/75/75).");

  // =========================================================================
  // 4. KRA propagation to children
  // =========================================================================
  console.log("Testing KRA propagation from a group goal to its direct children...");

  // Only a genuinely TOP-LEVEL goal's kraId is independently editable (a
  // goal with its own parent has its kraId locked/inherited from that
  // parent instead — `root` has no parent, so it's the right fixture here;
  // `mid` is root's DIRECT child, exactly what propagation should reach).
  const kra2 = await create(KRA, "/kras", { name: `${prefix} KRA Two` });
  await call("PUT", `/goals/${root._id}`, { kraId: kra2._id }, 200);
  const midReloadAfterKra = await call("GET", `/goals/${mid._id}`, undefined, 200);
  const kraIdOnChild = midReloadAfterKra.data.kraId?._id || midReloadAfterKra.data.kraId;
  assert.equal(String(kraIdOnChild), String(kra2._id), "A direct child's kraId should propagate from its group parent");
  // Propagation is only ONE level (a raw bulk update, matching source's
  // `update_kra_in_child_goals` exactly) — the grandchild `leaf` must NOT
  // have been touched by root's change.
  const leafReloadAfterKra = await call("GET", `/goals/${leaf._id}`, undefined, 200);
  assert.equal(leafReloadAfterKra.data.kraId, null, "Propagation must not cascade past direct children");

  console.log("KRA propagation verified.");

  // =========================================================================
  // 5. Parent-cycle guard — rejects a descendant as a proposed parent
  // =========================================================================
  console.log("Testing the parent-cycle guard...");

  // root's current parent is none; try to make root a child of leaf (its own
  // grandchild) — must be rejected as a would-be infinite loop.
  await call("PUT", `/goals/${root._id}`, { parentGoalId: leaf._id }, 400);
  // A goal cannot be its own parent either.
  await call("PUT", `/goals/${mid._id}`, { parentGoalId: mid._id }, 400);

  console.log("Parent-cycle guard verified.");

  // =========================================================================
  // 6. Explicit action endpoints — close/reopen, progress read-only when Closed
  // =========================================================================
  console.log("Testing close/reopen actions and progress read-only-when-Closed...");

  const closed = await call("POST", `/goals/${leafA._id}/close`, undefined, 200);
  assert.equal(closed.data.status, "Closed");
  // Progress is read-only while Closed — a client-supplied value is ignored, not an error.
  await call("PUT", `/goals/${leafA._id}`, { progress: 10 }, 200);
  const stillClosed = await call("GET", `/goals/${leafA._id}`, undefined, 200);
  assert.equal(stillClosed.data.progress, 100, "progress must stay unchanged while status is Closed");
  assert.equal(stillClosed.data.status, "Closed");

  const reopened = await call("POST", `/goals/${leafA._id}/reopen`, undefined, 200);
  assert.equal(reopened.data.status, "Completed", "Reopen should recompute status from the existing progress (100 -> Completed)");

  // Cannot reopen a goal that isn't Closed.
  await call("POST", `/goals/${leafA._id}/reopen`, undefined, 400);

  console.log("close/reopen + progress-read-only-when-Closed verified.");

  // =========================================================================
  // 7. Server-side bulk status-transition guard
  // =========================================================================
  console.log("Testing the server-side bulk status-transition guard...");

  // leafA is currently "Completed" (progress 100). Bulk-target "Archived" is
  // only eligible from Pending/In Progress/Closed — Completed must be
  // rejected (per-row, not a top-level 400).
  const bulkReject = await call("POST", "/goals/bulk-status", { status: "Archived", goals: [leafA._id] }, 200);
  assert.equal(bulkReject.data.results[0].success, false, "Bulk-archiving a Completed goal must be rejected");

  // leafB is "In Progress" (progress 50) — a valid bulk target.
  const bulkAccept = await call("POST", "/goals/bulk-status", { status: "Completed", goals: [leafB._id] }, 200);
  assert.equal(bulkAccept.data.results[0].success, true, "Bulk-completing an In Progress goal must succeed");
  const leafBReload = await call("GET", `/goals/${leafB._id}`, undefined, 200);
  assert.equal(leafBReload.data.status, "Completed");
  assert.equal(leafBReload.data.progress, 100, "Bulk target Completed must force progress to 100");

  // Group goals are always excluded from bulk updates.
  const bulkGroupReject = await call("POST", "/goals/bulk-status", { status: "Closed", goals: [leaf._id] }, 200);
  assert.equal(bulkGroupReject.data.results[0].success, false, "Group goals must be excluded from bulk status updates");

  console.log("Server-side bulk status-transition guard verified.");

  // =========================================================================
  // 8. Wire real Goal data into Appraisal.submitAppraisal
  // =========================================================================
  console.log("Testing real Goal data wired into submitAppraisal (Automated mode)...");

  // Two TOP-LEVEL goals tagged to this employee+cycle+kra1 (matching the
  // template's single automated-mode KRA row, weightage 100).
  const goalX = await create(Goal, "/goals", {
    goalName: `${prefix} Goal X`, employeeId, appraisalCycleId: cycle._id, kraId: kra1._id, progress: 80, startDate: "2026-01-01",
  });
  const goalY = await create(Goal, "/goals", {
    goalName: `${prefix} Goal Y`, employeeId, appraisalCycleId: cycle._id, kraId: kra1._id, progress: 40, startDate: "2026-01-01",
  });

  await call("PUT", `/appraisals/${appraisal._id}`, {
    selfRatings: [{ criteriaId: criteria1._id, weightage: 100, rating: 0.6 }],
  }, 200);

  const submitted = await call("POST", `/appraisals/${appraisal._id}/submit`, undefined, 200);
  // goalCompletion = avg(80, 40) = 60; goalScore = 60*100/100 = 60 (goalScorePercentage);
  // totalScore (0-5 scale) = 60/20 = 3.
  assert.equal(submitted.data.totalScore, 3, "Goal score should reflect the real average of the 2 tagged top-level Goals (60/20 = 3)");
  // selfScore = 0.6*5*1 = 3
  assert.equal(submitted.data.selfScore, 3, "Self score should be 3");

  console.log("Real Goal data -> submitAppraisal wiring verified (totalScore 3).");

  // =========================================================================
  // 9. SCOPES.OWN Enforcement (Employee Role User)
  // =========================================================================
  console.log("Setting up Employee role user for Goal SCOPES.OWN testing...");

  const employeeRole = await RoleMaster.findOne({ roleName: "Employee" }).lean();
  assert.ok(employeeRole, "Employee RoleMaster exists");

  const empUser = await createRaw(User, {
    userName: `${prefix} employee user`,
    email: `${prefix}-emp@example.test`,
    password: await bcrypt.hash("EmpPass@123", 10),
    roleId: employeeRole._id,
    departmentId: employee.departmentId,
    countryId: new mongoose.Types.ObjectId(),
    stateId: new mongoose.Types.ObjectId(),
    cityId: new mongoose.Types.ObjectId(),
    address: "Fixture Address",
  });

  origUserId = employee.userId || null;
  modifiedEmployeeId = employee._id;
  await Employee.updateOne({ _id: employee._id }, { userId: empUser._id });

  const empCookie = await login(empUser.email, "EmpPass@123");
  console.log("Employee role user created and logged in.");

  console.log("Testing Goal SCOPES.OWN enforcement...");

  const ownGoal = await create(Goal, "/goals", {
    goalName: `${prefix} Own Goal`, startDate: "2026-01-01",
    // employeeId omitted deliberately — must auto-scope to the logged-in Employee.
  }, 201, empCookie);
  assert.equal(String(ownGoal.employeeId), employeeId, "Employee should be auto-scoped to their own employeeId");

  const foreignGoal = await create(Goal, "/goals", {
    goalName: `${prefix} Foreign Goal`, employeeId: otherEmployeeId, startDate: "2026-01-01",
  }, 201, cookie);

  await call("GET", `/goals/${foreignGoal._id}`, undefined, 403, empCookie);
  await call("GET", `/goals/${ownGoal._id}`, undefined, 200, empCookie);

  console.log("Goal SCOPES.OWN enforcement verified (own read succeeds, foreign read 403s).");

  // =========================================================================
  // 10. Employee Performance Feedback — submit/cancel recompute avgFeedbackScore/finalScore
  // =========================================================================
  console.log("Testing Employee Performance Feedback submit/cancel recompute...");

  // Self-appraisal rejection.
  await call("POST", "/employee-performance-feedbacks", {
    employeeId, reviewerId: employeeId, appraisalId: appraisal._id, feedback: "Should fail",
  }, 400);

  // Appraisal-mismatch rejection (appraisal belongs to `employee`, not `otherEmployeeId`).
  await call("POST", "/employee-performance-feedbacks", {
    employeeId: otherEmployeeId, reviewerId: reviewer1Id, appraisalId: appraisal._id, feedback: "Should fail",
  }, 400);

  const feedback1 = await create(EmployeePerformanceFeedback, "/employee-performance-feedbacks", {
    employeeId, reviewerId: reviewer1Id, appraisalId: appraisal._id,
    feedbackRatings: [{ criteriaId: criteria1._id, weightage: 100, rating: 0.8 }],
    feedback: "Great work",
  });
  // totalScore = 0.8*5*1 = 4
  assert.equal(feedback1.totalScore, 4, "Feedback totalScore should be 4 (0.8*5*1)");

  const feedback2 = await create(EmployeePerformanceFeedback, "/employee-performance-feedbacks", {
    employeeId, reviewerId: reviewer2Id, appraisalId: appraisal._id,
    feedbackRatings: [{ criteriaId: criteria1._id, weightage: 100, rating: 0.4 }],
    feedback: "Room to grow",
  });
  // totalScore = 0.4*5*1 = 2
  assert.equal(feedback2.totalScore, 2, "Feedback totalScore should be 2 (0.4*5*1)");

  await call("POST", `/employee-performance-feedbacks/${feedback1._id}/submit`, undefined, 200);
  let appraisalAfter = await Appraisal.findById(appraisal._id).lean();
  assert.equal(appraisalAfter.avgFeedbackScore, 4, "avgFeedbackScore should be 4 with only feedback1 submitted");
  // finalScore = (totalScore(3) + selfScore(3) + avgFeedbackScore(4)) / 3 = 10/3 = 3.33
  assert.equal(appraisalAfter.finalScore, 3.33, "finalScore should recompute using the new avgFeedbackScore");

  await call("POST", `/employee-performance-feedbacks/${feedback2._id}/submit`, undefined, 200);
  appraisalAfter = await Appraisal.findById(appraisal._id).lean();
  // avg(4, 2) = 3
  assert.equal(appraisalAfter.avgFeedbackScore, 3, "avgFeedbackScore should be the average of both submitted feedback rows (3)");
  // finalScore = (3 + 3 + 3) / 3 = 3
  assert.equal(appraisalAfter.finalScore, 3, "finalScore should recompute to 3");

  await call("POST", `/employee-performance-feedbacks/${feedback2._id}/cancel`, undefined, 200);
  appraisalAfter = await Appraisal.findById(appraisal._id).lean();
  assert.equal(appraisalAfter.avgFeedbackScore, 4, "Cancelling feedback2 should recompute avgFeedbackScore back down to feedback1's alone (4)");
  assert.equal(appraisalAfter.finalScore, 3.33, "finalScore should recompute back to 3.33 after the cancel");

  console.log("Employee Performance Feedback submit/cancel recompute verified (avgFeedbackScore 4 -> 3 -> 4).");

  // =========================================================================
  // 11. Explicit HTTP DELETE checks (real endpoint, not a Mongoose bypass) —
  //     issue #26: several controllers previously called a non-existent
  //     `doc.softDelete()`. This is the actual regression check.
  // =========================================================================
  console.log("Testing real HTTP DELETE on both new doctypes...");

  const disposableGoal = await create(Goal, "/goals", {
    goalName: `${prefix} Disposable Goal`, employeeId, startDate: "2026-01-01",
  });
  const goalDeleteRes = await fetch(`${base}/goals/${disposableGoal._id}`, { method: "DELETE", headers: { cookie } });
  assert.equal(goalDeleteRes.status, 200, "DELETE /goals/:id must return a real 200, not 500");
  const goalDeleteBody = await goalDeleteRes.json();
  assert.equal(goalDeleteBody.isOk, true);
  // The global soft-delete plugin excludes isDeleted:true rows from every
  // find by default — mentioning isDeleted in the filter is the documented
  // escape hatch to see past that and confirm the flag was actually set.
  const goalAfterDelete = await Goal.findOne({ _id: disposableGoal._id, isDeleted: { $in: [true, false] } }).lean();
  assert.ok(goalAfterDelete, "Soft-deleted Goal row must still exist in the DB (not hard-deleted)");
  assert.equal(goalAfterDelete.isDeleted, true, "Delete must set isDeleted, not call a non-existent softDelete()");
  await call("GET", `/goals/${disposableGoal._id}`, undefined, 404); // soft-deleted -> invisible

  const disposableFeedback = await create(EmployeePerformanceFeedback, "/employee-performance-feedbacks", {
    employeeId, reviewerId: reviewer1Id, appraisalId: appraisal._id,
    feedbackRatings: [{ criteriaId: criteria1._id, weightage: 100, rating: 0.5 }],
    feedback: "Disposable draft feedback",
  });
  const feedbackDeleteRes = await fetch(`${base}/employee-performance-feedbacks/${disposableFeedback._id}`, { method: "DELETE", headers: { cookie } });
  assert.equal(feedbackDeleteRes.status, 200, "DELETE /employee-performance-feedbacks/:id must return a real 200, not 500");
  const feedbackDeleteBody = await feedbackDeleteRes.json();
  assert.equal(feedbackDeleteBody.isOk, true);
  const feedbackAfterDelete = await EmployeePerformanceFeedback.findOne({ _id: disposableFeedback._id, isDeleted: { $in: [true, false] } }).lean();
  assert.ok(feedbackAfterDelete, "Soft-deleted Employee Performance Feedback row must still exist in the DB (not hard-deleted)");
  assert.equal(feedbackAfterDelete.isDeleted, true, "Delete must set isDeleted, not call a non-existent softDelete()");

  console.log("Real HTTP DELETE verified on both Goal and Employee Performance Feedback.");

  // =========================================================================
  // 12. No-eval / no-GL / no-softDelete() sanity checks
  // =========================================================================
  console.log("Performing no-eval / no-GL / no-softDelete() sanity checks on source files...");

  const filesToCheck = [
    "apps/server/utils/appraisalCalc.js",
    "apps/server/utils/goalTree.js",
    "apps/server/models/Goal.js",
    "apps/server/models/EmployeePerformanceFeedback.js",
    "apps/server/controllers/v1/performanceGoals.controller.js",
    "apps/server/routes/v1/performanceGoals.routes.js",
    "apps/server/controllers/v1/performance.controller.js",
  ];

  for (const filePath of filesToCheck) {
    const content = fs.readFileSync(filePath, "utf-8");
    assert.ok(!content.includes("eval(") && !content.includes("new Function("), `${filePath} must not contain eval() or new Function()`);
    assert.ok(!content.includes(".softDelete()"), `${filePath} must not call the non-existent .softDelete()`);
    assert.ok(
      !content.includes("costCenter") && !content.includes("modeOfPayment") &&
      !content.includes("expenseAccount") && !content.includes("payableAccount") &&
      !content.includes("journalEntry") && !content.includes("JournalEntry"),
      `${filePath} must not contain any GL-adjacent field name`,
    );
  }

  console.log("Sanity checks passed.");

  console.log(`\n🎉 All Performance (Goal/Feedback) verify walk checks passed! (${calls} API calls executed)`);
} finally {
  console.log("\nCleaning up fixture records in reverse order...");

  if (modifiedEmployeeId) {
    try {
      await Employee.updateOne({ _id: modifiedEmployeeId }, { userId: origUserId });
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
