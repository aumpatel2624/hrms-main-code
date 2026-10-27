// Access lifecycle and roles, found by the pre-production simulation:
//   1. an open session follows the account as it is now: unticking Is Active,
//      leaving, being suspended or deleted ends it on the next request, and a
//      demotion takes effect at once (role read from the record, not sign-in),
//   2. a Suspended employee cannot sign in,
//   3. approver / reviewer / interviewer pickers offer only current employees,
//   4. Leave Approver, Expense Approver and Interviewer keep employee
//      self-service (seed/org-tiers.data.js withEmployeeSelfService),
//   5. a Leave Application (and Compensatory Leave Request) by id is the
//      applicant's, its named approver's, the caller's team's, or HR's — and a
//      self-service create is always the caller's own.
// Drives the real mounted routes (authMiddleware → checkPermission → handler)
// over in-memory stand-ins and the seeded matrices, like approvalIntegrity.test.js.
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { SCOPES } from "@demo-panel/shared/scopes";
import AdminUser from "../../models/AdminUser.js";
import Attendance from "../../models/Attendance.js";
import Company from "../../models/Company.js";
import CompensatoryLeaveRequest from "../../models/CompensatoryLeaveRequest.js";
import Department from "../../models/Department.js";
import Employee from "../../models/Employee.js";
import EmployeeCheckin from "../../models/EmployeeCheckin.js";
import ExpenseClaim from "../../models/ExpenseClaim.js";
import ExpenseClaimType from "../../models/ExpenseClaimType.js";
import LeaveAllocation from "../../models/LeaveAllocation.js";
import LeaveApplication from "../../models/LeaveApplication.js";
import LeaveBlockList from "../../models/LeaveBlockList.js";
import LeaveLedgerEntry from "../../models/LeaveLedgerEntry.js";
import LeaveType from "../../models/LeaveType.js";
import LoginAttempt from "../../models/LoginAttempt.js";
import MenuMaster from "../../models/MenuMaster.js";
import ShiftAssignment from "../../models/ShiftAssignment.js";
import UserRoles from "../../models/UserRoles.js";
import { invalidateRoleCache } from "../../middlewares/checkPermission.js";
import { buildRoleRows, withEmployeeSelfService } from "../../seed/org-tiers.data.js";
import employeeRoutes from "../../routes/v1/employee.routes.js";
import expenseRoutes from "../../routes/v1/expenses.routes.js";
import leaveRoutes from "../../routes/v1/leavesTransactions.routes.js";
import shiftRoutes from "../../routes/v1/shiftAttendance.routes.js";
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
  Model.updateMany = async () => ({});
  Model.aggregate = async (pipeline) => {
    let found = rows;
    for (const stage of pipeline) {
      if (stage.$match) found = found.filter((row) => matches(row, stage.$match));
      if (stage.$facet) return [{ count: found.length, data: found.map((row) => row.toObject()) }];
    }
    return [];
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
const TIERS = ["Employee", "Team Lead", "HR Head"];
const APPROVER_ROLES = ["Leave Approver", "Expense Approver", "Interviewer"];
const roles = Object.fromEntries([...TIERS, ...APPROVER_ROLES].map((name) => [name, oid()]));
const password = "Demo@1234";
const passwordHash = bcrypt.hashSync(password, 4);
const person = (employeeName, roleName, extra = {}) => ({
  _id: oid(), employeeName, email: `${employeeName}@work.example`, password: passwordHash, roleId: roles[roleName],
  companyId, departmentId: oid(), reportsToId: null, status: "Active", isActive: true, ...extra,
});
const manju = person("manju", "Team Lead");
const tara = person("tara", "Employee");
const hema = person("hema", "HR Head");
const bilal = person("bilal", "Employee");
const asha = person("asha", "Employee", { reportsToId: manju._id, leaveApproverId: tara._id });
const lena = person("lena", "Leave Approver");
const esha = person("esha", "Expense Approver");
const ivan = person("ivan", "Interviewer");
const rahul = person("rahul", "Employee"); // signed in as HR Head, since demoted
const varun = person("varun", "Employee", { status: "Left" });
const kunal = person("kunal", "Employee", { status: "Inactive" });
const sita = person("sita", "Employee", { status: "Suspended" });
const omar = person("omar", "Employee", { isActive: false }); // Is Active unticked
const people = [manju, tara, hema, bilal, asha, lena, esha, ivan, rahul, varun, kunal, sita, omar];
for (const someone of people) someone.leaveApproverId ??= hema._id;
stub(Employee, people);
stub(Department, []);
const formerAdmin = { _id: oid(), adminName: "former", email: "former@work.example", isActive: false };
stub(AdminUser, [formerAdmin]);
Company.exists = async () => ({ _id: companyId });

const menuUrls = [...new Set([...TIERS.flatMap((role) => buildRoleRows(role).menuRows.map((row) => row.menuUrl)), "/interview", "/interview-feedback"])];
const menuIdByUrl = new Map(menuUrls.map((menuUrl) => [menuUrl, oid()]));
stub(MenuMaster, menuUrls.map((menuUrl) => ({ _id: menuIdByUrl.get(menuUrl), menuUrl })));
const groupIdByUrl = new Map([["/dashboard", oid()], ["/documentation", oid()]]);
const matrixRows = (roleName) => {
  const { menuRows, linkRows } = buildRoleRows(roleName);
  return [
    ...linkRows.map(({ menuUrl, ...permissions }) => ({ menuId: null, menuGroupId: groupIdByUrl.get(menuUrl), ...permissions })),
    ...menuRows.map(({ menuUrl, ...permissions }) => ({ menuId: menuIdByUrl.get(menuUrl), ...permissions })),
  ];
};
const row = (menuUrl, flags, dataScope = null) => ({ menuId: menuIdByUrl.get(menuUrl), read: true, ...flags, dataScope });
const tierMatrices = TIERS.map((roleName) => ({ roleId: roles[roleName], isActive: true, dataScope: SCOPES.ALL, roles: matrixRows(roleName) }));
const employeeMatrix = tierMatrices[0];
// The approver roles as seed/index.js leaves them (seedLeaveRoles,
// seedExpenseRoles, seedRecruitmentRoles) — 2, 1 and 2 rows.
const full = { write: true, edit: true, delete: true };
const seededApproverRows = {
  "Leave Approver": [row("/leave-application", { edit: true }, SCOPES.APPROVER), row("/my-leave-balance", {}, SCOPES.TEAM)],
  "Expense Approver": [row("/expense-claim", { edit: true, print: true }, SCOPES.APPROVER)],
  Interviewer: [row("/interview", full, SCOPES.OWN), row("/interview-feedback", full, SCOPES.OWN)],
};
const useApproverMatrices = (rowsFor) => {
  stub(UserRoles, [
    ...tierMatrices,
    ...APPROVER_ROLES.map((roleName) => ({ roleId: roles[roleName], isActive: true, dataScope: SCOPES.ALL, roles: rowsFor(roleName) })),
  ]);
  invalidateRoleCache();
};
useApproverMatrices((roleName) => withEmployeeSelfService(seededApproverRows[roleName], employeeMatrix).rows);

// ------------------------------------------------------------------ helpers --
const routeOf = (router, method, path) => {
  const layer = router.stack.find((entry) => entry.route?.path === path && entry.route.methods[method]);
  assert.ok(layer, `${method.toUpperCase()} ${path} is mounted`);
  return layer.route.stack.map((entry) => entry.handle);
};
// `session` is what the caller signed in with; it outlives later changes to
// their record, exactly as an open browser tab does.
const sessionOf = (caller, role = "USER") => ({
  user: { id: String(caller._id), role, roleId: String(caller.roleId), departmentId: null },
  destroy(callback) { this.destroyed = true; callback?.(); },
});
const call = async (router, method, path, caller, { params = {}, body = {}, query: q = {}, session = sessionOf(caller) } = {}) => {
  const req = { session, params, body, query: q };
  const res = fakeRes();
  for (const handle of routeOf(router, method, path)) {
    let advanced = false;
    await handle(req, res, () => { advanced = true; });
    if (!advanced) break;
  }
  return res;
};
const expectStatus = (res, status, label) => assert.equal(res.statusCode, status, `${label}: ${JSON.stringify(res.body)}`);
const listedIds = (res) => res.body.data[0].data.map((r) => String(r._id)).sort();

// Stand-ins for the self-service writes below.
const leaveType = { _id: oid(), leaveTypeName: "Leave Without Pay", isLwp: true, includeHoliday: true, isActive: true };
stub(LeaveType, [leaveType]);
stub(LeaveAllocation, []);
stub(LeaveBlockList, []);
stub(LeaveLedgerEntry, []);
stub(Attendance, []);
const createdLeaves = [];
const createdClaims = [];
const savedCheckins = [];
const expenseType = { _id: oid(), name: "Travel", description: "Travel" };
stub(ExpenseClaimType, [expenseType]);
stub(EmployeeCheckin, []);
EmployeeCheckin.prototype.save = async function save() { savedCheckins.push(this); return this; };
ShiftAssignment.find = () => query([]);
const applyLeave = (caller, employee = caller) => call(leaveRoutes, "post", "/leave-applications", caller, {
  body: { employeeId: String(employee._id), leaveTypeId: String(leaveType._id), fromDate: "2026-11-02", toDate: "2026-11-02" },
});
const fileExpense = (caller, employee = caller) => call(expenseRoutes, "post", "/expense-claims", caller, {
  body: { employeeId: String(employee._id), expenses: [{ expenseTypeId: String(expenseType._id), expenseDate: "2026-10-20", amount: 500 }] },
});
const checkIn = (caller) => call(shiftRoutes, "post", "/employee-checkins", caller, { body: { employeeId: String(caller._id), logType: "IN" } });
const resetWrites = () => {
  stub(LeaveApplication, []);
  LeaveApplication.create = async (data) => { const doc = asDoc({ _id: oid(), ...data }); createdLeaves.push(doc); return doc; };
  stub(ExpenseClaim, []);
  ExpenseClaim.create = async (data) => { createdClaims.push(data); return { _id: oid(), ...data }; };
};
resetWrites();

// ---------------------------------------- 1. open sessions follow the record --
{
  const search = (caller, session) => call(employeeRoutes, "post", "/employees/search", caller, { session });

  // Demoted from HR Head to Employee after signing in.
  const rahulSession = sessionOf({ ...rahul, roleId: roles["HR Head"] });
  const demoted = await search(rahul, rahulSession);
  expectStatus(demoted, 200, "demoted user lists employees");
  assert.deepEqual(listedIds(demoted), [String(rahul._id)], "a demoted user sees what their role is now, not what it was at sign-in");
  assert.equal(rahulSession.user.roleId, String(roles.Employee), "the session carries the current role");
  assert.equal(listedIds(await search(hema)).length, people.length, "HR still lists everyone");

  // Left, Inactive, Suspended, Is Active unticked: the open session ends.
  for (const leaver of [varun, kunal, sita, omar]) {
    const label = leaver.isActive ? leaver.status : "Is Active unticked";
    const session = sessionOf(leaver);
    expectStatus(await applyLeave(leaver, leaver), 401, `${label}: leave application through an open session`);
    expectStatus(await call(expenseRoutes, "post", "/expense-claims", leaver, { session, body: { employeeId: String(leaver._id), expenses: [] } }), 401, `${label}: expense claim`);
    assert.equal(session.destroyed, true, `${label}: the session is ended`);
    expectStatus(await checkIn(leaver), 401, `${label}: check-in`);
  }
  assert.equal(createdLeaves.length + createdClaims.length + savedCheckins.length, 0, "a leaver's open session created nothing");

  // An admin account switched off, or an employee record deleted since sign-in.
  expectStatus(await call(employeeRoutes, "get", "/employees", formerAdmin, { session: sessionOf(formerAdmin, "ADMIN") }), 401, "deactivated admin");
  expectStatus(await call(employeeRoutes, "get", "/employees", { _id: oid(), roleId: roles.Employee }), 401, "deleted employee");
}

// --------------------------------------------------- 2. suspended sign-in --
{
  stub(LoginAttempt, []);
  LoginAttempt.findOneAndUpdate = async () => ({});
  const signIn = async (employee) => {
    const res = fakeRes();
    const req = { body: { email: employee.email, password, locationConsent: true, ipConsent: true }, headers: {}, ip: "127.0.0.1", session: {} };
    await login(req, res);
    return { res, req };
  };
  const { res, req } = await signIn(sita);
  expectStatus(res, 403, "Suspended employee signs in");
  assert.equal(req.session.user, undefined, "Suspended: no session");
  expectStatus((await signIn(asha)).res, 200, "an active employee still signs in");
  // The field says "Email or Employee Code": the code works too, in either case.
  asha.employeeCode = "DMY008";
  for (const code of ["DMY008", "dmy008"]) {
    const res = fakeRes();
    const req = { body: { email: code, password, locationConsent: true, ipConsent: true }, headers: {}, ip: "127.0.0.1", session: {} };
    await login(req, res);
    expectStatus(res, 200, `sign in with Employee Code ${code}`);
    assert.ok(same(req.session.user.id, asha._id), "as the employee with that code");
  }
}

// ------------------------------------------------------------- 3. pickers --
{
  const names = async (q) => (await call(employeeRoutes, "get", "/employees", hema, { query: q })).body.data.map((e) => e.employeeName).sort();
  const current = await names({ current: "true" });
  for (const gone of [varun, kunal, sita, omar]) assert.ok(!current.includes(gone.employeeName), `${gone.employeeName} is not offered as an approver or reviewer`);
  assert.ok(current.includes(asha.employeeName) && current.includes(tara.employeeName), "current employees are");
  assert.ok((await names({})).includes(varun.employeeName), "the plain list still has leavers (Full and Final, Exit Interview)");
}

// ------------------------------------------ 4. approver roles' self-service --
{
  // As seeded today the approver roles cannot do employee self-service at all.
  useApproverMatrices((roleName) => seededApproverRows[roleName]);
  expectStatus(await applyLeave(lena), 403, "seeded Leave Approver applies for leave");
  expectStatus(await fileExpense(lena), 403, "seeded Leave Approver files an expense");
  expectStatus(await checkIn(esha), 403, "seeded Expense Approver checks in");

  useApproverMatrices((roleName) => withEmployeeSelfService(seededApproverRows[roleName], employeeMatrix).rows);
  for (const caller of [lena, esha, ivan]) {
    resetWrites();
    expectStatus(await applyLeave(caller, bilal), 201, `${caller.employeeName} applies for leave`);
    expectStatus(await fileExpense(caller, bilal), 201, `${caller.employeeName} files an expense`);
    expectStatus(await checkIn(caller), 201, `${caller.employeeName} checks in`);
    assert.ok(same(createdLeaves.at(-1).employeeId, caller._id) && same(createdClaims.at(-1).employeeId, caller._id),
      `${caller.employeeName}: the leave and the claim are their own, whoever the body named`);
  }

  // Their approver pages are kept, not overwritten by the Employee rows.
  const merged = (roleName) => withEmployeeSelfService(seededApproverRows[roleName], employeeMatrix).rows;
  const rowOf = (roleName, menuUrl) => merged(roleName).find((r) => same(r.menuId, menuIdByUrl.get(menuUrl)));
  assert.equal(rowOf("Leave Approver", "/leave-application").dataScope, SCOPES.APPROVER, "Leave Approver still reaches who they approve");
  assert.equal(rowOf("Leave Approver", "/leave-application").write, true, "and can now apply");
  assert.equal(rowOf("Interviewer", "/interview").delete, true, "Interviewer keeps full Interview access");
  assert.equal(rowOf("Interviewer", "/salary-slip").dataScope, SCOPES.OWN, "and sees their own payslips");
  assert.ok(merged("Interviewer").some((r) => r.menuId === null && same(r.menuGroupId, groupIdByUrl.get("/dashboard"))), "and the dashboard link");
  // Re-running the seed on an install that already has it changes nothing.
  assert.equal(withEmployeeSelfService(merged("Leave Approver"), employeeMatrix).changes, 0);
  // An all-scope row is never widened by the Employee's actions.
  const hrLike = [row("/leave-application", {}, SCOPES.ALL)];
  assert.equal(withEmployeeSelfService(hrLike, employeeMatrix).rows[0].write, undefined);
}

// ------------------------------------- 5. a leave application by id --
{
  resetWrites();
  const leave = (status) => ({ _id: oid(), employeeId: asha._id, leaveApproverId: tara._id, leaveTypeId: leaveType._id, companyId, status, fromDate: new Date("2026-11-02"), toDate: new Date("2026-11-02"), totalLeaveDays: 1 });
  const open = leave("open");
  const approved = leave("approved");
  stub(LeaveApplication, [open, approved]);
  const byId = (doc) => ({ params: { leaveApplicationId: String(doc._id) } });
  const view = (caller, doc = open) => call(leaveRoutes, "get", "/leave-applications/:leaveApplicationId", caller, byId(doc));

  expectStatus(await view(bilal), 403, "another employee opens asha's leave by id");
  expectStatus(await call(leaveRoutes, "put", "/leave-applications/:leaveApplicationId", bilal, { ...byId(open), body: { description: "changed" } }), 403, "another employee edits it");
  expectStatus(await call(leaveRoutes, "post", "/leave-applications/:leaveApplicationId/cancel", bilal, byId(approved)), 403, "another employee cancels it");
  assert.equal(approved.status, "approved", "nothing was cancelled");

  expectStatus(await view(asha), 200, "the applicant");
  expectStatus(await view(tara), 200, "the named Leave Approver");
  expectStatus(await view(manju), 200, "the applicant's manager (team scope)");
  expectStatus(await view(lena), 403, "a Leave Approver who approves for someone else");
  expectStatus(await view(hema), 200, "HR");

  expectStatus(await applyLeave(bilal, asha), 201, "an employee applies naming someone else");
  assert.ok(same(createdLeaves.at(-1).employeeId, bilal._id), "the application is the caller's own");

  const comp = { _id: oid(), employeeId: asha._id, status: "open" };
  stub(CompensatoryLeaveRequest, [comp]);
  const viewComp = (caller) => call(leaveRoutes, "get", "/compensatory-leave-requests/:compensatoryLeaveRequestId", caller, { params: { compensatoryLeaveRequestId: String(comp._id) } });
  expectStatus(await viewComp(bilal), 403, "another employee opens asha's compensatory leave by id");
  expectStatus(await viewComp(asha), 200, "the applicant's compensatory leave");
}

console.log("accessLifecycle.test.js passed");
