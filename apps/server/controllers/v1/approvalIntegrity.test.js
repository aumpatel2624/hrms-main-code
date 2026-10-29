// Approvals and attendance integrity, found by the pre-production simulation:
//   1. nobody approves or rejects their own leave; below HR only the named
//      Leave Approver decides it,
//   2. a self-service check-in is the caller's own, stamped now,
//   3. an Attendance Request marks nothing until it is approved,
//   4. the named Expense / Shift approver reads and decides the records naming
//      them, even when their role has no access to the screen,
//   5. a Left or Inactive employee cannot sign in.
// Drives the real mounted routes (authMiddleware → checkPermission → handler)
// over in-memory stand-ins and the seeded tier/functional matrices, like
// employeePrivacy.test.js.
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { SCOPES } from "@demo-panel/shared/scopes";
import AdminUser from "../../models/AdminUser.js";
import Attendance from "../../models/Attendance.js";
import AttendanceRequest from "../../models/AttendanceRequest.js";
import Company from "../../models/Company.js";
import CompensatoryLeaveRequest from "../../models/CompensatoryLeaveRequest.js";
import Department from "../../models/Department.js";
import Employee from "../../models/Employee.js";
import EmployeeCheckin from "../../models/EmployeeCheckin.js";
import ExpenseClaim from "../../models/ExpenseClaim.js";
import LeaveApplication from "../../models/LeaveApplication.js";
import LeaveType from "../../models/LeaveType.js";
import LoginAttempt from "../../models/LoginAttempt.js";
import MenuMaster from "../../models/MenuMaster.js";
import ShiftAssignment from "../../models/ShiftAssignment.js";
import ShiftRequest from "../../models/ShiftRequest.js";
import UserRoles from "../../models/UserRoles.js";
import { buildRoleRows } from "../../seed/org-tiers.data.js";
import leaveRoutes from "../../routes/v1/leavesTransactions.routes.js";
import shiftRoutes from "../../routes/v1/shiftAttendance.routes.js";
import requestRoutes from "../../routes/v1/shiftAttendanceTransactions.routes.js";
import expenseRoutes from "../../routes/v1/expenses.routes.js";
import { login } from "./auth.controller.js";

// ---------------------------------------------------------------- stand-ins --
const same = (a, b) => String(a) === String(b);
const OPERATORS = {
  $in: (value, arg) => arg.some((x) => same(value, x)),
  $nin: (value, arg) => !arg.some((x) => same(value, x)),
  $ne: (value, arg) => !same(value, arg),
  $lte: (value, arg) => value <= arg,
  $gte: (value, arg) => value >= arg,
};
const isOperators = (cond) => cond && typeof cond === "object" && !Array.isArray(cond) && !(cond instanceof mongoose.Types.ObjectId)
  && Object.keys(cond).length > 0 && Object.keys(cond).every((key) => key.startsWith("$"));
const matches = (row, filter = {}) => Object.entries(filter).every(([key, cond]) => {
  if (key === "$and") return cond.every((part) => matches(row, part));
  if (key === "$or") return cond.some((part) => matches(row, part));
  if (!isOperators(cond)) return same(row[key] ?? null, cond ?? null);
  return Object.entries(cond).every(([op, arg]) => {
    if (!OPERATORS[op]) throw new Error(`stand-in query: unsupported ${op}`);
    return OPERATORS[op](row[key], arg);
  });
});
const query = (result) => {
  const chain = {
    select: () => chain, populate: () => chain, lean: () => chain, sort: () => chain,
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return chain;
};
// Rows double as documents: save/populate/toObject act on the row itself, so
// a test reads a decision straight off the fixture.
const asDoc = (row) => Object.assign(row, {
  save: async () => row,
  populate: async () => row,
  validate: async () => {},
  toObject: () => Object.fromEntries(Object.entries(row).filter(([, value]) => typeof value !== "function")),
});
const stub = (Model, rows) => {
  rows.forEach(asDoc);
  Model.find = (filter) => query(rows.filter((row) => matches(row, filter)));
  Model.findOne = (filter) => query(rows.find((row) => matches(row, filter)) ?? null);
  Model.findById = (id) => query(rows.find((row) => same(row._id, id)) ?? null);
  Model.exists = async (filter) => (rows.find((row) => matches(row, filter)) ? { _id: oid() } : null);
  // A decision's single-step status change (utils/statusClaim.js), on the row itself.
  Model.findOneAndUpdate = async (filter, update) => {
    const row = rows.find((candidate) => matches(candidate, filter)) ?? null;
    if (row) Object.assign(row, update.$set ?? update);
    return row;
  };
  Model.updateOne = async (filter, update) => {
    const row = rows.find((candidate) => matches(candidate, filter));
    if (row) Object.assign(row, update.$set ?? update);
    return { matchedCount: row ? 1 : 0 };
  };
  // runListQuery's pipeline: only its $match stages narrow; the page is the rest.
  Model.aggregate = async (pipeline) => {
    let found = rows;
    for (const stage of pipeline) {
      if (stage.$match) found = found.filter((row) => matches(row, stage.$match));
      if (stage.$facet) return [{ count: found.length, data: found.map((row) => row.toObject()) }];
    }
    throw new Error("stand-in aggregate: no $facet");
  };
  return rows;
};
const fakeRes = () => ({
  statusCode: 200, body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = JSON.parse(JSON.stringify(body)); return this; },
  clearCookie() {},
});

// ----------------------------------------------------------------- fixtures --
const oid = () => new mongoose.Types.ObjectId();
const companyId = oid();
// "Legacy Approver" stands for a role with no rows on the request screens —
// the simulation's named approvers held such roles.
const roles = { Employee: oid(), "Team Lead": oid(), "HR Head": oid(), CEO: oid(), "Legacy Approver": oid() };
const password = "Demo@1234";
const passwordHash = bcrypt.hashSync(password, 4);
const person = (employeeName, roleName, extra = {}) => ({
  _id: oid(), employeeName, email: `${employeeName}@work.example`, password: passwordHash, roleId: roles[roleName],
  companyId, departmentId: oid(), reportsToId: null, status: "Active", isActive: true, ...extra,
});
const nikhil = person("nikhil", "Legacy Approver");
const tara = person("tara", "Team Lead");
const manju = person("manju", "Team Lead");
const hema = person("hema", "HR Head");
const chitra = person("chitra", "CEO"); // the seeded role with company-wide ("all") check-in write
const asha = person("asha", "Employee", {
  reportsToId: manju._id, leaveApproverId: tara._id, expenseApproverId: nikhil._id, shiftRequestApproverId: nikhil._id,
});
const varun = person("varun", "Employee", { status: "Left" });
const kunal = person("kunal", "Employee", { status: "Inactive" });
stub(Employee, [nikhil, tara, manju, hema, chitra, asha, varun, kunal]);
stub(Department, []);
stub(AdminUser, []);
Company.exists = async () => ({ _id: companyId });

const SEEDED = ["Employee", "Team Lead", "HR Head", "CEO"];
const menuUrls = [...new Set(SEEDED.flatMap((role) => buildRoleRows(role).menuRows.map((row) => row.menuUrl)))];
const menus = menuUrls.map((menuUrl) => ({ _id: oid(), menuUrl }));
const menuIdByUrl = new Map(menus.map((menu) => [menu.menuUrl, menu._id]));
stub(MenuMaster, menus);
stub(UserRoles, [
  ...SEEDED.map((roleName) => ({
    roleId: roles[roleName], isActive: true, dataScope: SCOPES.ALL,
    roles: buildRoleRows(roleName).menuRows.map(({ menuUrl, ...permissions }) => ({ menuId: menuIdByUrl.get(menuUrl), ...permissions })),
  })),
  { roleId: roles["Legacy Approver"], isActive: true, dataScope: SCOPES.ALL, roles: [] },
]);

// ------------------------------------------------------------------ helpers --
const routeOf = (router, method, path) => {
  const layer = router.stack.find((entry) => entry.route?.path === path && entry.route.methods[method]);
  assert.ok(layer, `${method.toUpperCase()} ${path} is mounted`);
  return layer.route.stack.map((entry) => entry.handle);
};
const call = async (router, method, path, caller, { params = {}, body = {} } = {}) => {
  const req = {
    session: { user: { id: String(caller._id), role: "USER", roleId: String(caller.roleId), departmentId: null } },
    params, body, query: {},
  };
  const res = fakeRes();
  for (const handle of routeOf(router, method, path)) {
    let advanced = false;
    await handle(req, res, () => { advanced = true; });
    if (!advanced) break;
  }
  return res;
};
const expectStatus = (res, status, label) => assert.equal(res.statusCode, status, `${label}: ${JSON.stringify(res.body)}`);

// ----------------------------------------------- 1. leave self-approval --
{
  const leave = (employee, approver) => ({ _id: oid(), employeeId: employee._id, leaveApproverId: approver._id, status: "open" });
  const ashaLeave = leave(asha, tara);
  const ashaSecond = leave(asha, tara);
  const hemaLeave = leave(hema, tara);
  stub(LeaveApplication, [ashaLeave, ashaSecond, hemaLeave]);
  stub(LeaveType, []); // an approval that got past the guard stops here (404), not in the database
  const decide = (verb, caller, doc) => call(leaveRoutes, "post", `/leave-applications/:leaveApplicationId/${verb}`, caller, { params: { leaveApplicationId: String(doc._id) } });

  expectStatus(await decide("approve", asha, ashaLeave), 403, "applicant approves own leave");
  expectStatus(await decide("reject", asha, ashaLeave), 403, "applicant rejects own leave");
  expectStatus(await decide("approve", hema, hemaLeave), 403, "HR approves own leave");
  expectStatus(await decide("reject", manju, ashaLeave), 403, "a manager who is not the named approver");
  assert.equal(ashaLeave.status, "open", "no refused call changed the application");

  expectStatus(await decide("reject", tara, ashaLeave), 200, "the named Leave Approver");
  assert.equal(ashaLeave.status, "rejected");
  expectStatus(await decide("reject", hema, ashaSecond), 200, "HR on someone else's leave");

  const compLeave = { _id: oid(), employeeId: asha._id, status: "open" };
  stub(CompensatoryLeaveRequest, [compLeave]);
  const compRes = await call(leaveRoutes, "post", "/compensatory-leave-requests/:compensatoryLeaveRequestId/approve", asha, { params: { compensatoryLeaveRequestId: String(compLeave._id) } });
  expectStatus(compRes, 403, "applicant approves own compensatory leave");
  assert.equal(compLeave.status, "open");
}

// ------------------------------------------------ 2. back-dated check-ins --
{
  const saved = [];
  stub(EmployeeCheckin, []);
  EmployeeCheckin.prototype.save = async function save() { saved.push(this); return this; };
  ShiftAssignment.find = () => query([]);
  const punch = (caller, body) => call(shiftRoutes, "post", "/employee-checkins", caller, { body });

  expectStatus(await punch(asha, { employeeId: String(asha._id), time: "2026-10-26T09:00:00.000Z", logType: "IN" }), 400, "employee back-dates a punch");
  expectStatus(await punch(asha, { employeeId: String(asha._id), time: new Date(Date.now() + 3600000).toISOString(), logType: "IN" }), 400, "employee forward-dates a punch");
  expectStatus(await punch(manju, { employeeId: String(asha._id), logType: "IN" }), 403, "team lead punches for a team member");
  assert.equal(saved.length, 0, "nothing was saved, under anyone");

  const before = Date.now();
  expectStatus(await punch(asha, { employeeId: String(asha._id), time: new Date(before - 30000).toISOString(), logType: "IN" }), 201, "employee punches now");
  assert.ok(same(saved[0].employeeId, asha._id) && saved[0].time.getTime() >= before, "stamped with the server's time, for the caller");

  expectStatus(await punch(chitra, { employeeId: String(asha._id), time: "2026-10-26T09:00:00.000Z", logType: "IN" }), 201, "an all-scope caller records a past punch");
  assert.ok(same(saved[1].employeeId, asha._id) && saved[1].time.toISOString() === "2026-10-26T09:00:00.000Z", "and keeps the time it entered");
}

// ------------------------------------------- 3. attendance request approval --
{
  const requests = stub(AttendanceRequest, []);
  // The model's own defaults (status) apply, as in a real create.
  AttendanceRequest.create = async (data) => { const doc = asDoc(new AttendanceRequest(data).toObject()); requests.push(doc); return doc; };
  const marked = [];
  stub(Attendance, []);
  Attendance.findOneAndUpdate = async (filter, update) => { marked.push(update); return update; };

  const created = await call(requestRoutes, "post", "/attendance-requests", asha, {
    body: { employeeId: String(asha._id), fromDate: "2026-10-06", toDate: "2026-10-06", reason: "On Duty", includeHolidays: true },
  });
  expectStatus(created, 201, "employee raises On Duty");
  const [request] = requests;
  assert.equal(request.status, "open", "the request waits for a decision");
  assert.ok(same(request.approverId, nikhil._id), "named approver: the employee's Shift Approver");
  assert.equal(marked.length, 0, "creating marks no attendance");

  const decide = (verb, caller) => call(requestRoutes, "post", `/attendance-requests/:attendanceRequestId/${verb}`, caller, { params: { attendanceRequestId: String(request._id) } });
  expectStatus(await decide("approve", asha), 403, "employee approves own request");
  expectStatus(await decide("approve", manju), 403, "a manager who is not the named approver");
  assert.equal(marked.length, 0);
  expectStatus(await decide("approve", nikhil), 200, "the named approver, whose role lacks the screen");
  assert.equal(request.status, "active");
  assert.equal(marked.length, 1, "approval marks the day");
  assert.equal(marked[0].status, "Present");
}

// --------------------------------------------- 4. named expense / shift approvers --
{
  const claim = (employee, approver) => ({ _id: oid(), employeeId: employee._id, companyId, expenseApproverId: approver._id, status: "draft", expenses: [], taxes: [] });
  const named = claim(asha, nikhil);
  const other = claim(manju, hema);
  stub(ExpenseClaim, [named, other]);

  const listed = await call(expenseRoutes, "post", "/expense-claims/search", nikhil);
  expectStatus(listed, 200, "named approver opens the Expense Claim list");
  assert.deepEqual(listed.body.data[0].data.map((row) => String(row._id)), [String(named._id)], "exactly the claims naming them");
  expectStatus(await call(expenseRoutes, "get", "/expense-claims/:id", nikhil, { params: { id: String(other._id) } }), 403, "a claim not naming them");
  expectStatus(await call(expenseRoutes, "post", "/expense-claims/:id/approve", nikhil, { params: { id: String(other._id) } }), 403, "approving a claim not naming them");
  expectStatus(await call(expenseRoutes, "post", "/expense-claims/:id/approve", nikhil, { params: { id: String(named._id) } }), 200, "approving the claim naming them");
  assert.equal(named.status, "approved");
  expectStatus(await call(expenseRoutes, "post", "/expense-claims/:id/submit", nikhil, { params: { id: String(named._id) } }), 403, "being named grants nothing beyond approve/reject");

  const selfNamed = claim(asha, asha);
  stub(ExpenseClaim, [selfNamed]);
  expectStatus(await call(expenseRoutes, "post", "/expense-claims/:id/approve", asha, { params: { id: String(selfNamed._id) } }), 403, "employee named as approver of own claim");
  assert.equal(selfNamed.status, "draft");

  const shift = { _id: oid(), employeeId: asha._id, companyId, approverId: nikhil._id, status: "open" };
  const otherShift = { _id: oid(), employeeId: manju._id, companyId, approverId: hema._id, status: "open" };
  stub(ShiftRequest, [shift, otherShift]);
  const shiftListed = await call(requestRoutes, "post", "/shift-requests/search", nikhil);
  expectStatus(shiftListed, 200, "named approver opens the Shift Request list");
  assert.deepEqual(shiftListed.body.data[0].data.map((row) => String(row._id)), [String(shift._id)]);
  const open = (caller) => call(requestRoutes, "get", "/shift-requests/:shiftRequestId", caller, { params: { shiftRequestId: String(shift._id) } });
  assert.equal((await open(nikhil)).body.data.canDecide, true, "Approve/Reject offered to the named approver");
  assert.equal((await open(asha)).body.data.canDecide, false, "and hidden from the requester");
  const decideShift = (caller) => call(requestRoutes, "post", "/shift-requests/:shiftRequestId/reject", caller, { params: { shiftRequestId: String(shift._id) } });
  expectStatus(await decideShift(asha), 403, "requester decides own shift request");
  expectStatus(await decideShift(manju), 403, "a manager who is not the named approver");
  expectStatus(await decideShift(nikhil), 200, "the named Shift Approver");
  assert.equal(shift.status, "rejected");
}

// --------------------------------------------------------- 5. leavers' sign-in --
{
  stub(LoginAttempt, []);
  LoginAttempt.findOneAndUpdate = async () => ({});
  const signIn = async (employee) => {
    const res = fakeRes();
    const req = { body: { email: employee.email, password, locationConsent: true, ipConsent: true }, headers: {}, ip: "127.0.0.1", session: { regenerate: (done) => done() } };
    await login(req, res);
    return { res, req };
  };
  for (const leaver of [varun, kunal]) {
    const { res, req } = await signIn(leaver);
    expectStatus(res, 403, `${leaver.status} employee signs in`);
    assert.equal(req.session.user, undefined, `${leaver.status}: no session`);
  }
  const { res, req } = await signIn(asha);
  expectStatus(res, 200, "an active employee still signs in");
  assert.equal(req.session.user.id, String(asha._id));
}

console.log("approvalIntegrity.test.js passed");
