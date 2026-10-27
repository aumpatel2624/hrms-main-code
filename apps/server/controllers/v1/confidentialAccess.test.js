// ADR-047: the remaining leaks from the pre-production simulation.
//   L2  Employee Performance Feedback — only the reviewee, the reviewer and
//       an "all"-scoped caller (HR, ADMIN) read a review; only the reviewer
//       and HR/ADMIN change it.
//   L5  Interviews — an Interviewer reaches only interviews they are assigned
//       to (and only their own feedback); no joined applicant record is sent.
//   L6  GET /employees (every picker's source) — group-wide for HR/ADMIN,
//       the caller's own company for anyone else.
//   L7  Login — one answer for an unknown email and a wrong password; the
//       attempt-status-by-email endpoint needs an admin session.
// Runs the real checkPermission + handlers over in-memory stand-ins and the
// seeded tier matrices, like employeePrivacy.test.js.
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import Employee from "../../models/Employee.js";
import AdminUser from "../../models/AdminUser.js";
import MenuMaster from "../../models/MenuMaster.js";
import UserRoles from "../../models/UserRoles.js";
import Appraisal from "../../models/Appraisal.js";
import AppraisalCycle from "../../models/AppraisalCycle.js";
import EmployeePerformanceFeedback from "../../models/EmployeePerformanceFeedback.js";
import Interview from "../../models/Interview.js";
import InterviewFeedback from "../../models/InterviewFeedback.js";
import authService from "../../services/authService.js";
import authRoutes from "../../routes/v1/auth.routes.js";
import { checkPermission } from "../../middlewares/checkPermission.js";
import { buildRoleRows } from "../../seed/org-tiers.data.js";
import { stripCredentials } from "../../utils/jsonSecrets.js";
import { SCOPES } from "@demo-panel/shared/scopes";
import { listEmployees } from "./employee.controller.js";
import { login } from "./auth.controller.js";
import {
  createEmployeePerformanceFeedback, getEmployeePerformanceFeedbackById,
  searchEmployeePerformanceFeedbacks, updateEmployeePerformanceFeedback,
} from "./performanceGoals.controller.js";
import { getInterviewById, listInterviews, listInterviewsByParams, updateInterview } from "./interview.controller.js";
import {
  createInterviewFeedback, getInterviewFeedbackById, listInterviewFeedbacksByParams,
} from "./interviewFeedback.controller.js";

// ---------------------------------------------------------------- stand-ins --
const same = (a, b) => (Array.isArray(a) ? a.some((x) => String(x) === String(b)) : String(a) === String(b));
const matches = (row, filter = {}) => Object.entries(filter).every(([key, cond]) => {
  if (key === "$and") return cond.every((part) => matches(row, part));
  if (key === "$or") return cond.some((part) => matches(row, part));
  if (cond && typeof cond === "object" && "$in" in cond) return cond.$in.some((x) => same(row[key], x));
  return same(row[key], cond);
});
// A thenable query: populate/select/lean chain onto the one result.
const query = (result) => {
  const chain = {
    populate: () => chain, select: () => chain, lean: () => chain,
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return chain;
};
const stub = (Model, rows) => {
  Model.find = (filter) => query(rows.filter((row) => matches(row, filter)));
  Model.findOne = (filter) => query(rows.find((row) => matches(row, filter)) ?? null);
  Model.findById = (id) => query(rows.find((row) => same(row._id, id)) ?? null);
};
// Records behave enough like Mongoose documents for the handlers.
const doc = (fields) => ({ ...fields, save: async () => {}, toObject() { return { ...this }; } });
// Just enough of runListQuery's aggregation: the scope $match, $lookups
// (only `employees` has rows), the name/canEdit $addFields, $project
// exclusions, and the paged branch.
const valueAt = (row, path) => path.slice(1).split(".").reduce((value, key) => value?.[key], row);
const evaluate = (row, expr) => {
  if (expr === true) return true;
  if (expr.$eq) return same(valueAt(row, expr.$eq[0]), expr.$eq[1]);
  if (expr.$ifNull) return valueAt(row, expr.$ifNull[0]) ?? expr.$ifNull[1];
  if (expr.$arrayElemAt) return valueAt(row, expr.$arrayElemAt[0].replace(/\.[^.]+$/, ""))?.[0]?.[expr.$arrayElemAt[0].split(".").pop()];
  throw new Error(`stand-in aggregate: unsupported expression ${JSON.stringify(expr)}`);
};
const exclude = (rows, spec) => rows.map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => !(key in spec))));
const aggregateOver = (records, joined = {}) => async (pipeline) => {
  let rows = records.map((row) => ({ ...row }));
  for (const stage of pipeline) {
    if (stage.$match) rows = rows.filter((row) => matches(row, stage.$match));
    if (stage.$lookup) {
      const { from, localField, as } = stage.$lookup;
      rows = rows.map((row) => ({ ...row, [as]: (joined[from] ?? []).filter((other) => same(other._id, row[localField])) }));
    }
    if (stage.$unwind) {
      const field = (stage.$unwind.path ?? stage.$unwind).slice(1);
      rows = rows.map((row) => ({ ...row, [field]: row[field]?.[0] }));
    }
    if (stage.$addFields) {
      rows = rows.map((row) => ({ ...row, ...Object.fromEntries(Object.entries(stage.$addFields).map(([key, expr]) => [key, evaluate(row, expr)])) }));
    }
    if (stage.$project) rows = exclude(rows, stage.$project);
    if (stage.$facet) {
      const spec = stage.$facet.stage2.find((s) => s.$project)?.$project ?? {};
      return [{ count: rows.length, data: exclude(rows, spec) }];
    }
  }
  throw new Error("stand-in aggregate: no $facet");
};
// Serialised as server.js does, so the body is what reaches the browser.
const fakeRes = () => ({
  statusCode: 200, body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = JSON.parse(JSON.stringify(body, stripCredentials)); return this; },
  clearCookie() {},
});

// ----------------------------------------------------------------- fixtures --
const oid = () => new mongoose.Types.ObjectId();
const apidel = oid();
const nuva = oid();
const roles = { Employee: oid(), "Team Lead": oid(), "HR Head": oid(), Interviewer: oid() };
const person = (employeeName, roleId, companyId = apidel, reportsToId = null) => ({
  _id: oid(), employeeCode: employeeName.toUpperCase(), employeeName, email: `${employeeName}@work.example`,
  roleId, companyId, departmentId: oid(), designationId: oid(), reportsToId, isActive: true, status: "Active",
});
const lead = person("uday", roles["Team Lead"]);
const ekta = person("ekta", roles.Employee, apidel, lead._id);
const harsh = person("harsh", roles.Employee, apidel, lead._id); // the intern
const hr = person("hema", roles["HR Head"]);
const tushar = person("tushar", roles.Interviewer);
const nuvaPerson = person("neel", roles.Employee, nuva);
const admin = { _id: oid(), role: "ADMIN", isActive: true };
const employees = [lead, ekta, harsh, hr, tushar, nuvaPerson];
stub(Employee, employees);
stub(AdminUser, [admin]); // authMiddleware re-reads the account

// The tier matrices (Employee "own", Team Lead "team", HR Head "all") plus
// the Interviewer role as the base seed now grants it: own-scoped Interview
// and Interview Feedback, no Employee screen.
const menuUrls = [...new Set([
  ...["Employee", "Team Lead", "HR Head"].flatMap((role) => buildRoleRows(role).menuRows.map((row) => row.menuUrl)),
  "/interview", "/interview-feedback",
])];
const menus = menuUrls.map((menuUrl) => ({ _id: oid(), menuUrl, menuGroup: oid() }));
const menuIdByUrl = new Map(menus.map((menu) => [menu.menuUrl, menu._id]));
const full = { read: true, write: true, edit: true, delete: true, print: true, mail: true };
const matrix = {
  ...Object.fromEntries(["Employee", "Team Lead", "HR Head"].map((role) => [role, buildRoleRows(role).menuRows])),
  Interviewer: [{ menuUrl: "/interview", ...full, dataScope: SCOPES.OWN }, { menuUrl: "/interview-feedback", ...full, dataScope: SCOPES.OWN }],
};
stub(MenuMaster, menus);
stub(UserRoles, Object.entries(roles).map(([roleName, roleId]) => ({
  roleId, isActive: true, dataScope: SCOPES.ALL,
  roles: matrix[roleName].map(({ menuUrl, ...permissions }) => ({ menuId: menuIdByUrl.get(menuUrl), ...permissions })),
})));

// ------------------------------------------------------------------ helpers --
const call = async (caller, handler, { menuUrl, action = "read", params = {}, body = {}, query = {} } = {}) => {
  const req = {
    user: { id: String(caller._id), role: caller.role || "USER" },
    session: { user: { roleId: caller.roleId ? String(caller.roleId) : undefined, departmentId: null } },
    params, body, query,
  };
  const res = fakeRes();
  let allowed = !menuUrl;
  if (menuUrl) await checkPermission(menuUrl, action)(req, res, () => { allowed = true; });
  if (allowed) await handler(req, res);
  return res;
};
const rowsOf = (res) => {
  assert.equal(res.statusCode, 200, JSON.stringify(res.body));
  return res.body.data[0]?.data ?? [];
};

// ===================================================== L2: performance feedback
{
  const menuUrl = "/employee-performance-feedback";
  // Uday reviewed Ekta: the confidential review the intern could read.
  const review = doc({
    _id: oid(), employeeId: ekta._id, reviewerId: lead._id, companyId: apidel, appraisalId: oid(),
    status: "draft", totalScore: 1.75, feedback: "Below expectations. Recommending a performance improvement plan.",
    feedbackRatings: [],
  });
  // HR reviewed Harsh: Uday is Harsh's manager but not this review's reviewer.
  const hrReview = doc({
    _id: oid(), employeeId: harsh._id, reviewerId: hr._id, companyId: apidel, appraisalId: oid(),
    status: "draft", totalScore: 3, feedback: "Solid first quarter.", feedbackRatings: [],
  });
  const reviews = [review, hrReview];
  stub(EmployeePerformanceFeedback, reviews);
  EmployeePerformanceFeedback.aggregate = aggregateOver(reviews, { employees });
  const search = async (caller) => rowsOf(await call(caller, searchEmployeePerformanceFeedbacks, { menuUrl }));
  const open = (caller, target) => call(caller, getEmployeePerformanceFeedbackById, { menuUrl, params: { id: String(target._id) } });
  const edit = (caller, target) => call(caller, updateEmployeePerformanceFeedback, { menuUrl, action: "edit", params: { id: String(target._id) }, body: { feedback: "edited" } });
  const ids = (rows) => rows.map((row) => String(row._id)).sort();

  // The intern, a colleague of Ekta's, neither lists nor opens her review.
  assert.deepEqual(ids(await search(harsh)), [String(hrReview._id)], "intern lists only his own review");
  assert.equal((await open(harsh, review)).statusCode, 404, "intern cannot open a colleague's review");
  assert.equal((await edit(harsh, review)).statusCode, 404, "intern cannot edit a colleague's review");

  // A manager (team scope) sees the review he wrote, not every review of
  // his team: HR's review of Harsh stays between Harsh and HR.
  assert.deepEqual(ids(await search(lead)), [String(review._id)], "team lead lists only the review he wrote");
  assert.equal((await open(lead, hrReview)).statusCode, 404, "team lead cannot open HR's review of his report");

  // The reviewee reads their own review but is not offered, or allowed, Edit.
  const ektaRows = await search(ekta);
  assert.deepEqual(ids(ektaRows), [String(review._id)], "reviewee lists her own review");
  assert.equal(ektaRows[0].canEdit, false, "reviewee's row is not editable");
  const ektaOpen = await open(ekta, review);
  assert.equal(ektaOpen.statusCode, 200);
  assert.equal(ektaOpen.body.data.canEdit, false, "reviewee's detail is not editable");
  assert.equal((await edit(ekta, review)).statusCode, 404, "reviewee cannot edit her review");

  // The reviewer reads and edits it.
  assert.equal((await search(lead))[0].canEdit, true, "reviewer's row is editable");
  assert.equal((await open(lead, review)).body.data.canEdit, true, "reviewer's detail is editable");
  assert.equal((await edit(lead, review)).statusCode, 200, "reviewer edits his review");

  // HR and ADMIN see and may edit everything, as before.
  assert.deepEqual(ids(await search(hr)), ids(reviews), "HR lists every review");
  assert.ok((await search(hr)).every((row) => row.canEdit === true), "HR's rows are editable");
  assert.equal((await open(admin, review)).statusCode, 200, "ADMIN opens any review");

  // Nobody below HR writes a review in someone else's name.
  Appraisal.findById = (id) => query({ _id: id, employeeId: ekta._id, appraisalCycleId: null });
  AppraisalCycle.findById = () => query(null);
  EmployeePerformanceFeedback.create = async (fields) => fields;
  const forged = await call(harsh, createEmployeePerformanceFeedback, {
    menuUrl, action: "write",
    body: { employeeId: String(ekta._id), reviewerId: String(lead._id), appraisalId: String(oid()), feedback: "forged", feedbackRatings: [] },
  });
  assert.equal(forged.statusCode, 403, "an employee cannot file feedback as another reviewer");
}

// ============================================================ L5: interviews
{
  const applicant = (applicantName) => ({
    _id: oid(), applicantName, emailId: `${applicantName}@mail.example`, phoneNumber: `99${applicantName.length}0000000`,
    notes: `Current CTC 5.4 LPA; expects 6.5 LPA (${applicantName})`,
  });
  const kiran = applicant("kiran");
  const meera = applicant("meera");
  const type = { _id: oid(), interviewTypeName: "Technical" };
  const assigned = doc({ _id: oid(), interviewTypeId: type._id, jobApplicantId: kiran._id, interviewers: [tushar._id], status: "Pending", scheduledOn: new Date("2026-10-01"), isActive: true });
  const notAssigned = doc({ _id: oid(), interviewTypeId: type._id, jobApplicantId: meera._id, interviewers: [lead._id], status: "Pending", scheduledOn: new Date("2026-10-01"), isActive: true });
  const interviews = [assigned, notAssigned];
  stub(Interview, interviews);
  Interview.aggregate = aggregateOver(interviews, { jobapplicants: [kiran, meera], interviewtypes: [type] });
  const menuUrl = "/interview";
  const search = async (caller) => rowsOf(await call(caller, listInterviewsByParams, { menuUrl }));

  // The interviewer lists, opens and edits only the interview he is on.
  const mine = await search(tushar);
  assert.deepEqual(mine.map((row) => String(row._id)), [String(assigned._id)], "interviewer lists only his assigned interview");
  assert.equal(mine[0].jobApplicantName, "kiran", "the applicant's name still shows");
  assert.equal((await call(tushar, listInterviews, { menuUrl })).body.data.length, 1, "the interview picker lists only his interview");
  assert.equal((await call(tushar, getInterviewById, { menuUrl, params: { interviewId: String(notAssigned._id) } })).statusCode, 404, "cannot open an interview he is not on");
  assert.equal((await call(tushar, getInterviewById, { menuUrl, params: { interviewId: String(assigned._id) } })).statusCode, 200, "opens his own interview");
  assert.equal((await call(tushar, updateInterview, { menuUrl, action: "edit", params: { interviewId: String(notAssigned._id) }, body: {} })).statusCode, 404, "cannot edit an interview he is not on");

  // HR sees every interview; no caller receives the joined applicant record.
  const all = await search(hr);
  assert.equal(all.length, 2, "HR lists every interview");
  for (const rows of [mine, all]) {
    const text = JSON.stringify(rows);
    for (const secret of ["@mail.example", "LPA", "9950000000"]) assert.ok(!text.includes(secret), `applicant record leaked: ${secret}`);
    for (const row of rows) assert.ok(!("jobApplicant" in row) && !("interviewType" in row), "joined documents are dropped");
  }

  // Interview feedback: only his own scorecards, and only in his own name.
  const feedbackMenu = "/interview-feedback";
  const ownCard = doc({ _id: oid(), interviewId: assigned._id, interviewerId: tushar._id, result: "Cleared", feedback: "good", isActive: true });
  const otherCard = doc({ _id: oid(), interviewId: notAssigned._id, interviewerId: lead._id, result: "Rejected", feedback: "weak", isActive: true });
  const cards = [ownCard, otherCard];
  stub(InterviewFeedback, cards);
  InterviewFeedback.aggregate = aggregateOver(cards, { employees, interviews });
  InterviewFeedback.create = async (fields) => fields;
  const cardsSeen = rowsOf(await call(tushar, listInterviewFeedbacksByParams, { menuUrl: feedbackMenu }));
  assert.deepEqual(cardsSeen.map((row) => String(row._id)), [String(ownCard._id)], "interviewer lists only his own feedback");
  assert.equal((await call(tushar, getInterviewFeedbackById, { menuUrl: feedbackMenu, params: { feedbackId: String(otherCard._id) } })).statusCode, 404, "cannot open another interviewer's feedback");
  assert.equal(rowsOf(await call(hr, listInterviewFeedbacksByParams, { menuUrl: feedbackMenu })).length, 2, "HR lists all feedback");
  const asSomeoneElse = await call(tushar, createInterviewFeedback, {
    menuUrl: feedbackMenu, action: "write", body: { interviewId: String(notAssigned._id), interviewerId: String(lead._id), result: "Cleared" },
  });
  assert.equal(asSomeoneElse.statusCode, 403, "cannot submit feedback in another interviewer's name");
  // Once HR assigns him, his own feedback goes through (the run's 403).
  stub(InterviewFeedback, [otherCard]);
  const submitted = await call(tushar, createInterviewFeedback, {
    menuUrl: feedbackMenu, action: "write", body: { interviewId: String(assigned._id), interviewerId: String(tushar._id), result: "Cleared" },
  });
  assert.equal(submitted.statusCode, 201, "his assigned interview accepts his feedback");
}

// ======================================================= L6: employee picker
{
  const names = async (caller, params = {}) => {
    const res = await call(caller, listEmployees, { query: params });
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    return res.body.data.map((row) => row.employeeName).sort();
  };
  const apidelNames = employees.filter((e) => same(e.companyId, apidel)).map((e) => e.employeeName).sort();
  const allNames = employees.map((e) => e.employeeName).sort();

  assert.deepEqual(await names(harsh), apidelNames, "an employee's pickers list their own company only");
  assert.deepEqual(await names(lead), apidelNames, "a team lead's pickers list their own company only");
  assert.deepEqual(await names(nuvaPerson), ["neel"], "another company's employee sees only that company");
  // Interviewer has no Employee screen grant, yet his pickers still fill.
  assert.deepEqual(await names(tushar), apidelNames, "an interviewer's pickers still work, own company only");
  assert.deepEqual(await names(harsh, { companyId: String(nuva) }), [], "asking for another company's people returns none");
  assert.deepEqual(await names(hr), allNames, "HR stays group-wide");
  assert.deepEqual(await names(admin), allNames, "ADMIN stays group-wide");
}

// ================================================================ L7: login
{
  const password = await bcrypt.hash("right-password", 4);
  const account = { ...person("zalak", roles.Employee), password, toObject() { return { ...this }; } };
  AdminUser.findOne = async () => null;
  // Sign-in matches the email or the Employee Code ($or).
  Employee.findOne = (filter) => query(filter.$or.some((cond) => cond.email === account.email) ? account : null);
  authService.isAccountLocked = async () => false;
  authService.recordFailedAttempt = async () => ({ isLocked: false, attemptsRemaining: 3 });
  const attempt = async (email, pass) => {
    const res = fakeRes();
    await login({ body: { email, password: pass, locationConsent: true, ipConsent: true }, headers: {}, session: {} }, res);
    return res;
  };

  const unknown = await attempt("nobody@work.example", "whatever");
  const wrong = await attempt(account.email, "wrong-password");
  assert.equal(unknown.statusCode, 401, "unknown email answers like a wrong password");
  assert.deepEqual(unknown.body, wrong.body, "unknown email and wrong password are indistinguishable");
  assert.equal(wrong.body.message, "Invalid email or password");

  // Lockout is unchanged: the failure that locks the account still answers 423.
  authService.recordFailedAttempt = async () => ({ isLocked: true, lockUntil: new Date() });
  assert.equal((await attempt(account.email, "wrong-password")).statusCode, 423, "lockout unchanged");

  // The attempt-status endpoint answers no one without an admin session.
  const layer = authRoutes.stack.find((l) => l.route?.path === "/auth/login-status-by-email" && l.route.methods.post);
  const runRoute = async (session) => {
    const req = { body: { email: account.email }, session, headers: {} };
    const res = fakeRes();
    for (const { handle } of layer.route.stack) {
      let next = false;
      await handle(req, res, () => { next = true; });
      if (!next) break;
    }
    return res;
  };
  authService.getLoginAttemptStatus = async () => ({ attemptCount: 2, isLocked: false });
  const anonymous = await runRoute(undefined);
  assert.equal(anonymous.statusCode, 401, "no account details without sign-in");
  assert.ok(!JSON.stringify(anonymous.body).includes("attemptCount"));
  assert.equal((await runRoute({ user: { id: String(ekta._id), role: "USER" } })).statusCode, 403, "a signed-in employee cannot probe accounts either");
  assert.equal((await runRoute({ user: { id: String(admin._id), role: "ADMIN" } })).statusCode, 200, "an admin still can");
}

console.log("confidentialAccess.test.js passed");
