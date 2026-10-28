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
//      self-service create is always the caller's own,
//   6. an "Own department" role reaches only its department's employees — on
//      Employee and on the six employee-owned request screens (F3),
//   8. below "all" scope a Travel Request or Grievance is filed as the caller,
//      and Travel Request (list and by id) and the Compensatory Leave Request
//      list reach the same people for a team- or approver-scoped role,
//   9. a team- or approver-scoped role (custom roles only) sees grievances
//      raised by its team — never one naming it as accused or responsible —
//      cannot move a Travel Request to someone else, and by id reaches the
//      same Leave Applications and Compensatory Leave Requests its team list
//      shows (the reportsToId chain, not the people it approves for),
//  10. an Employee Referral (list, by id, edit, delete, create job applicant)
//      is the referrer's, their team's for a team-scoped role, or HR's — and
//      below "all" a referral is always made, and stays, as the caller,
//  11. below "all" only the applicant edits, cancels or deletes a Leave
//      Application or Compensatory Leave Request — a team lead or named Leave
//      Approver decides it but cannot change it; HR still can,
//  12. below "all" a grievance's accused and Employee Responsible are fixed
//      once it is raised, and only the applicant edits a Shift Request or
//      cancels an Attendance Request; HR still can.
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
import ShiftRequest from "../../models/ShiftRequest.js";
import ShiftType from "../../models/ShiftType.js";
import AttendanceRequest from "../../models/AttendanceRequest.js";
import TravelRequest from "../../models/TravelRequest.js";
import EmployeeGrievance from "../../models/EmployeeGrievance.js";
import EmployeeReferral from "../../models/EmployeeReferral.js";
import UserRoles from "../../models/UserRoles.js";
import { invalidateRoleCache } from "../../middlewares/checkPermission.js";
import { buildRoleRows, withEmployeeSelfService } from "../../seed/org-tiers.data.js";
import employeeRoutes from "../../routes/v1/employee.routes.js";
import expenseRoutes from "../../routes/v1/expenses.routes.js";
import leaveRoutes from "../../routes/v1/leavesTransactions.routes.js";
import shiftRoutes from "../../routes/v1/shiftAttendance.routes.js";
import shiftRequestRoutes from "../../routes/v1/shiftAttendanceTransactions.routes.js";
import travelRoutes from "../../routes/v1/travel.routes.js";
import careerRoutes from "../../routes/v1/employeeCareerEvents.routes.js";
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

  // The list agrees with by id: a Team Lead's team-scope list has their reports' leave.
  const listLeaves = async (caller) => {
    const res = await call(leaveRoutes, "post", "/leave-applications/search", caller, { body: {} });
    expectStatus(res, 200, `${caller.employeeName} lists leave applications`);
    return listedIds(res);
  };
  assert.deepEqual(await listLeaves(manju), [open, approved].map((doc) => String(doc._id)).sort(), "the Team Lead lists their report's leave");
  assert.deepEqual(await listLeaves(bilal), [], "another employee lists none of it");

  expectStatus(await applyLeave(bilal, asha), 201, "an employee applies naming someone else");
  assert.ok(same(createdLeaves.at(-1).employeeId, bilal._id), "the application is the caller's own");

  const comp = { _id: oid(), employeeId: asha._id, status: "open" };
  stub(CompensatoryLeaveRequest, [comp]);
  const viewComp = (caller) => call(leaveRoutes, "get", "/compensatory-leave-requests/:compensatoryLeaveRequestId", caller, { params: { compensatoryLeaveRequestId: String(comp._id) } });
  expectStatus(await viewComp(bilal), 403, "another employee opens asha's compensatory leave by id");
  expectStatus(await viewComp(asha), 200, "the applicant's compensatory leave");
}

// ------------------------------- 6. a department-scoped role's employee list --
{
  // F3: a custom role whose Employee screen is "Own department" listed everyone.
  const deptRoleId = oid();
  const softwareDev = oid();
  const viewer = person("dina", "Employee", { roleId: deptRoleId, departmentId: softwareDev });
  const colleague = person("colin", "Employee", { departmentId: softwareDev });
  people.push(asDoc(viewer), asDoc(colleague));
  stub(UserRoles, [...tierMatrices, { roleId: deptRoleId, isActive: true, dataScope: SCOPES.ALL, roles: [row("/employee", {}, SCOPES.DEPARTMENT)] }]);
  invalidateRoleCache();
  const res = await call(employeeRoutes, "post", "/employees/search", viewer);
  expectStatus(res, 200, "department-scoped role lists employees");
  assert.deepEqual(listedIds(res), [viewer, colleague].map((p) => String(p._id)).sort(), "only their own department");
  const byId = (employee) => call(employeeRoutes, "get", "/employees/:employeeId", viewer, { params: { employeeId: String(employee._id) } });
  expectStatus(await byId(colleague), 200, "a colleague in the department by id");
  expectStatus(await byId(asha), 404, "someone in another department by id");
}

// ------------- 7. "Own department" on the six employee-owned request screens --
{
  // F3, the rest of it: Leave Applications, Expense Claims, Travel Requests,
  // Grievances, Shift Requests and Attendance Requests ignored the scope.
  const deptRoleId = oid();
  const finance = oid();
  const viewer = person("devi", "Employee", { roleId: deptRoleId, departmentId: finance });
  const colleague = person("cara", "Employee", { departmentId: finance });
  people.push(asDoc(viewer), asDoc(colleague));
  const screens = [
    { menuUrl: "/leave-application", Model: LeaveApplication, router: leaveRoutes, path: "/leave-applications", param: "leaveApplicationId" },
    { menuUrl: "/expense-claim", Model: ExpenseClaim, router: expenseRoutes, path: "/expense-claims", param: "id" },
    { menuUrl: "/travel-request", Model: TravelRequest, router: travelRoutes, path: "/travel-requests", param: "travelRequestId" },
    { menuUrl: "/employee-grievance", Model: EmployeeGrievance, router: careerRoutes, path: "/employee-grievances", param: "grievanceId", owner: "raisedByEmployeeId" },
    { menuUrl: "/shift-request", Model: ShiftRequest, router: shiftRequestRoutes, path: "/shift-requests", param: "shiftRequestId" },
    { menuUrl: "/attendance-request", Model: AttendanceRequest, router: shiftRequestRoutes, path: "/attendance-requests", param: "attendanceRequestId" },
  ];
  stub(UserRoles, [...tierMatrices, { roleId: deptRoleId, isActive: true, dataScope: SCOPES.ALL, roles: screens.map((screen) => row(screen.menuUrl, {}, SCOPES.DEPARTMENT)) }]);
  invalidateRoleCache();
  for (const { menuUrl, Model, router, path, param, owner = "employeeId" } of screens) {
    const record = (employee, extra = {}) => ({ _id: oid(), [owner]: employee._id, companyId, leaveTypeId: leaveType._id, status: "open", isActive: true, ...extra });
    const own = record(viewer);
    const colleagues = record(colleague);
    const outsiders = record(asha);
    const rows = [own, colleagues, outsiders];
    // A grievance against the viewer, or naming them as the Employee
    // Responsible, must not name its complainant to them.
    const isGrievance = owner === "raisedByEmployeeId";
    const against = isGrievance ? record(colleague, { grievanceAgainstEmployeeId: viewer._id }) : null;
    const responsible = isGrievance ? record(colleague, { employeeResponsibleId: viewer._id }) : null;
    if (isGrievance) rows.push(against, responsible);
    stub(Model, rows);
    const res = await call(router, "post", `${path}/search`, viewer, { body: {} });
    expectStatus(res, 200, `${menuUrl}: a department-scoped role lists`);
    assert.deepEqual(listedIds(res), [own, colleagues].map((doc) => String(doc._id)).sort(), `${menuUrl}: only their own department's`);
    const byId = (doc) => call(router, "get", `${path}/:${param}`, viewer, { params: { [param]: String(doc._id) } });
    expectStatus(await byId(own), 200, `${menuUrl}: their own by id`);
    expectStatus(await byId(colleagues), 200, `${menuUrl}: a department colleague's by id`);
    assert.ok([403, 404].includes((await byId(outsiders)).statusCode), `${menuUrl}: another department's by id is refused`);
    if (against) expectStatus(await byId(against), 403, `${menuUrl}: one raised against the viewer by id`);
    if (responsible) expectStatus(await byId(responsible), 403, `${menuUrl}: one naming the viewer as responsible by id`);
  }
}

// ---- 8. creates pinned to the caller; travel and comp leave scope agree --
{
  const scopeRoles = Object.fromEntries([SCOPES.ALL, SCOPES.DEPARTMENT, SCOPES.TEAM, SCOPES.APPROVER].map((scope) => [scope, oid()]));
  const pages = ["/travel-request", "/employee-grievance", "/compensatory-leave-request"];
  stub(UserRoles, [...tierMatrices, ...Object.entries(scopeRoles).map(([scope, roleId]) => ({
    roleId, isActive: true, dataScope: SCOPES.ALL, roles: pages.map((menuUrl) => row(menuUrl, { write: true, edit: true }, scope)),
  }))]);
  invalidateRoleCache();
  const lead = person("tomas", "Employee", { roleId: scopeRoles[SCOPES.TEAM] });
  const report = person("rita", "Employee", { reportsToId: lead._id });
  const approverCaller = person("abe", "Employee", { roleId: scopeRoles[SCOPES.APPROVER] });
  const deptCaller = person("dora", "Employee", { roleId: scopeRoles[SCOPES.DEPARTMENT] });
  const hrCaller = person("harsh", "Employee", { roleId: scopeRoles[SCOPES.ALL] });
  people.push(...[lead, report, approverCaller, deptCaller, hrCaller].map(asDoc));

  // A department-, team- or approver-scoped create named someone else and was filed as them.
  const createdTravel = [];
  const createdGrievances = [];
  TravelRequest.create = async (data) => { createdTravel.push(data); return data; };
  EmployeeGrievance.create = async (data) => { createdGrievances.push(data); return data; };
  const fileTravel = (caller) => call(travelRoutes, "post", "/travel-requests", caller, {
    body: { employeeId: String(bilal._id), travelType: "Domestic", purposeOfTravelId: String(oid()) },
  });
  const fileGrievance = (caller) => call(careerRoutes, "post", "/employee-grievances", caller, {
    body: { raisedByEmployeeId: String(bilal._id), subject: "s", date: "2026-10-20", grievanceTypeId: String(oid()), description: "d",
      grievanceAgainstEmployeeId: String(tara._id), employeeResponsibleId: String(hema._id) },
  });
  for (const caller of [deptCaller, lead, approverCaller]) {
    expectStatus(await fileTravel(caller), 201, `${caller.employeeName} files a travel request naming bilal`);
    assert.ok(same(createdTravel.at(-1).employeeId, caller._id), `${caller.employeeName}: the travel request is their own`);
    expectStatus(await fileGrievance(caller), 201, `${caller.employeeName} raises a grievance naming bilal`);
    const grievance = createdGrievances.at(-1);
    assert.ok(same(grievance.raisedByEmployeeId, caller._id), `${caller.employeeName}: the grievance is raised by them`);
    assert.ok(same(grievance.grievanceAgainstEmployeeId, tara._id) && same(grievance.employeeResponsibleId, hema._id),
      `${caller.employeeName}: who it is against and who is responsible stay as chosen`);
  }
  // HR (an "all" row) still files on someone's behalf.
  expectStatus(await fileTravel(hrCaller), 201, "HR files a travel request for bilal");
  assert.ok(same(createdTravel.at(-1).employeeId, bilal._id), "HR's travel request is bilal's");
  expectStatus(await fileGrievance(hrCaller), 201, "HR raises a grievance for bilal");
  assert.ok(same(createdGrievances.at(-1).raisedByEmployeeId, bilal._id), "HR's grievance is raised by bilal");

  // Travel Request: the list and by id reach the same people.
  const travel = (employee) => ({ _id: oid(), employeeId: employee._id, companyId, status: "Open", isActive: true });
  const leadsOwn = travel(lead);
  const reports = travel(report);
  const outsiders = travel(bilal);
  const approversOwn = travel(approverCaller);
  stub(TravelRequest, [leadsOwn, reports, outsiders, approversOwn]);
  const listTravel = async (caller) => listedIds(await call(travelRoutes, "post", "/travel-requests/search", caller, { body: {} }));
  const viewTravel = (caller, doc) => call(travelRoutes, "get", "/travel-requests/:travelRequestId", caller, { params: { travelRequestId: String(doc._id) } });
  assert.deepEqual(await listTravel(lead), [leadsOwn, reports].map((doc) => String(doc._id)).sort(), "team scope lists their own and their report's travel");
  expectStatus(await viewTravel(lead, reports), 200, "team scope opens their report's travel by id");
  expectStatus(await viewTravel(lead, outsiders), 403, "team scope opens someone outside the team's travel by id");
  assert.deepEqual(await listTravel(approverCaller), [String(approversOwn._id)], "approver scope lists their own travel (there is no travel approver)");
  expectStatus(await viewTravel(approverCaller, approversOwn), 200, "approver scope opens their own travel by id");
  expectStatus(await viewTravel(approverCaller, outsiders), 403, "approver scope opens someone else's travel by id");

  // Compensatory Leave Request: the team-scope list has the report's, as by id does.
  const compOf = (employee) => ({ _id: oid(), employeeId: employee._id, companyId, status: "open", isActive: true });
  const reportsComp = compOf(report);
  const outsidersComp = compOf(bilal);
  stub(CompensatoryLeaveRequest, [reportsComp, outsidersComp]);
  const compRes = await call(leaveRoutes, "post", "/compensatory-leave-requests/search", lead, { body: {} });
  expectStatus(compRes, 200, "team scope lists compensatory leave");
  assert.deepEqual(listedIds(compRes), [String(reportsComp._id)], "team scope lists their report's compensatory leave");
  expectStatus(await call(leaveRoutes, "get", "/compensatory-leave-requests/:compensatoryLeaveRequestId", lead,
    { params: { compensatoryLeaveRequestId: String(reportsComp._id) } }), 200, "and opens it by id");
}

// ------ 9. team and approver scope on grievances, travel edits and leave --
{
  const scopeRoles = Object.fromEntries([SCOPES.ALL, SCOPES.DEPARTMENT, SCOPES.TEAM, SCOPES.APPROVER].map((scope) => [scope, oid()]));
  const pages = ["/travel-request", "/employee-grievance", "/leave-application", "/compensatory-leave-request"];
  stub(UserRoles, [...tierMatrices, ...Object.entries(scopeRoles).map(([scope, roleId]) => ({
    roleId, isActive: true, dataScope: SCOPES.ALL, roles: pages.map((menuUrl) => row(menuUrl, { write: true, edit: true }, scope)),
  }))]);
  invalidateRoleCache();
  const finance = oid();
  const lead = person("nina", "Employee", { roleId: scopeRoles[SCOPES.TEAM] });
  const report = person("ravi", "Employee", { reportsToId: lead._id });
  // Approves nina's leave but does not report to her.
  const approvee = person("arun", "Employee", { leaveApproverId: lead._id });
  const approverCaller = person("ali", "Employee", { roleId: scopeRoles[SCOPES.APPROVER] });
  const deptCaller = person("dev", "Employee", { roleId: scopeRoles[SCOPES.DEPARTMENT], departmentId: finance });
  const deptColleague = person("dina", "Employee", { departmentId: finance });
  const hrCaller = person("hari", "Employee", { roleId: scopeRoles[SCOPES.ALL] });
  people.push(...[lead, report, approvee, approverCaller, deptCaller, deptColleague, hrCaller].map(asDoc));
  const ids = (...docs) => docs.map((doc) => String(doc._id)).sort();

  // Grievances: team and approver scope listed and opened every one.
  const grievance = (raisedBy, extra = {}) => ({ _id: oid(), raisedByEmployeeId: raisedBy._id, subject: "s", status: "Open", isActive: true, ...extra });
  const leadsOwn = grievance(lead);
  const reports = grievance(report);
  const outsiders = grievance(bilal);
  const againstLead = grievance(report, { grievanceAgainstEmployeeId: lead._id });
  const leadResponsible = grievance(report, { employeeResponsibleId: lead._id });
  const leadComplains = grievance(lead, { grievanceAgainstEmployeeId: report._id });
  const approversOwn = grievance(approverCaller);
  const againstApprover = grievance(bilal, { grievanceAgainstEmployeeId: approverCaller._id });
  stub(EmployeeGrievance, [leadsOwn, reports, outsiders, againstLead, leadResponsible, leadComplains, approversOwn, againstApprover]);
  const listGrievances = async (caller) => listedIds(await call(careerRoutes, "post", "/employee-grievances/search", caller, { body: {} }));
  const viewGrievance = async (caller, doc) => (await call(careerRoutes, "get", "/employee-grievances/:grievanceId", caller,
    { params: { grievanceId: String(doc._id) } })).statusCode;
  assert.deepEqual(await listGrievances(lead), ids(leadsOwn, reports, leadComplains),
    "team scope lists its own and its report's grievances, none naming it as accused or responsible");
  for (const doc of [leadsOwn, reports, leadComplains]) assert.equal(await viewGrievance(lead, doc), 200, "team scope opens a listed grievance by id");
  for (const doc of [outsiders, againstLead, leadResponsible]) assert.equal(await viewGrievance(lead, doc), 403, "team scope opens an unlisted grievance by id");
  assert.deepEqual(await listGrievances(approverCaller), ids(approversOwn), "approver scope lists its own grievances (there is no grievance approver)");
  assert.equal(await viewGrievance(approverCaller, approversOwn), 200, "approver scope opens its own grievance by id");
  for (const doc of [outsiders, againstApprover]) assert.equal(await viewGrievance(approverCaller, doc), 403, "approver scope opens someone else's grievance by id");

  // Travel Request: a department-, team- or approver-scoped edit moved the request to someone else.
  const travel = (employee) => asDoc({ _id: oid(), employeeId: employee._id, companyId, travelType: "Domestic", status: "Open", isActive: true });
  const editable = [[deptCaller, travel(deptColleague)], [lead, travel(report)], [approverCaller, travel(approverCaller)]];
  const hrsTravel = travel(report);
  stub(TravelRequest, [...editable.map(([, doc]) => doc), hrsTravel]);
  const moveTravel = (caller, doc) => call(travelRoutes, "put", "/travel-requests/:travelRequestId", caller, {
    params: { travelRequestId: String(doc._id) }, body: { employeeId: String(bilal._id), travelType: "International" },
  });
  for (const [caller, doc] of editable) {
    const before = doc.employeeId;
    expectStatus(await moveTravel(caller, doc), 200, `${caller.employeeName} edits a travel request naming bilal`);
    assert.ok(same(doc.employeeId, before), `${caller.employeeName}: the travel request stays with its employee`);
    assert.equal(doc.travelType, "International", `${caller.employeeName}: the rest of the edit is kept`);
  }
  expectStatus(await moveTravel(hrCaller, hrsTravel), 200, "HR edits a travel request naming bilal");
  assert.ok(same(hrsTravel.employeeId, bilal._id), "HR can move a travel request to someone else");

  // Leave Application and Compensatory Leave Request: team scope by id
  // reached the people the caller approves for, which its list does not.
  const leaveOf = (employee) => ({ _id: oid(), employeeId: employee._id, leaveTypeId: leaveType._id, companyId, status: "open", isActive: true,
    fromDate: new Date("2026-11-02"), toDate: new Date("2026-11-02"), leaveApproverId: tara._id });
  const reportsLeave = leaveOf(report);
  const approveesLeave = leaveOf(approvee);
  stub(LeaveApplication, [reportsLeave, approveesLeave]);
  const leaveList = await call(leaveRoutes, "post", "/leave-applications/search", lead, { body: {} });
  expectStatus(leaveList, 200, "team scope lists leave applications");
  assert.deepEqual(listedIds(leaveList), ids(reportsLeave), "team scope lists its report's leave, not its approvee's");
  const viewLeave = async (doc) => (await call(leaveRoutes, "get", "/leave-applications/:leaveApplicationId", lead,
    { params: { leaveApplicationId: String(doc._id) } })).statusCode;
  assert.equal(await viewLeave(reportsLeave), 200, "team scope opens its report's leave by id");
  assert.equal(await viewLeave(approveesLeave), 403, "team scope opens its approvee's leave by id");

  const compOf = (employee) => ({ _id: oid(), employeeId: employee._id, companyId, status: "open", isActive: true });
  const reportsComp = compOf(report);
  const approveesComp = compOf(approvee);
  stub(CompensatoryLeaveRequest, [reportsComp, approveesComp]);
  const compList = await call(leaveRoutes, "post", "/compensatory-leave-requests/search", lead, { body: {} });
  assert.deepEqual(listedIds(compList), ids(reportsComp), "team scope lists its report's compensatory leave, not its approvee's");
  const viewComp = async (doc) => (await call(leaveRoutes, "get", "/compensatory-leave-requests/:compensatoryLeaveRequestId", lead,
    { params: { compensatoryLeaveRequestId: String(doc._id) } })).statusCode;
  assert.equal(await viewComp(reportsComp), 200, "team scope opens its report's compensatory leave by id");
  assert.equal(await viewComp(approveesComp), 403, "team scope opens its approvee's compensatory leave by id");
}

// ------------------------------------------------- 10. employee referrals --
{
  const ownRole = oid();
  const teamRole = oid();
  const allRole = oid();
  const manage = { write: true, edit: true, delete: true };
  stub(UserRoles, [
    ...tierMatrices,
    { roleId: ownRole, isActive: true, dataScope: SCOPES.ALL, roles: [row("/employee-referral", manage, SCOPES.OWN)] },
    { roleId: teamRole, isActive: true, dataScope: SCOPES.ALL, roles: [row("/employee-referral", manage, SCOPES.TEAM)] },
    { roleId: allRole, isActive: true, dataScope: SCOPES.ALL, roles: [row("/employee-referral", manage, SCOPES.ALL)] },
  ]);
  invalidateRoleCache();
  const owner = person("omkar", "Employee", { roleId: ownRole });
  const lead = person("lata", "Employee", { roleId: teamRole });
  const report = person("raj", "Employee", { reportsToId: lead._id });
  const recruiter = person("rhea", "Employee", { roleId: allRole });
  people.push(...[owner, lead, report, recruiter].map(asDoc));
  const ids = (...docs) => docs.map((doc) => String(doc._id)).sort();

  const referral = (referrer) => ({ _id: oid(), referrerId: referrer._id, fullName: `${referrer.employeeName}'s friend`,
    email: `${referrer.employeeName}.friend@example.com`, contactNo: "99999", status: "Pending", isActive: true });
  const tarasOwn = referral(tara);
  const bilals = referral(bilal);
  const ownersOwn = referral(owner);
  const leadsOwn = referral(lead);
  const reports = referral(report);
  const all = stub(EmployeeReferral, [tarasOwn, bilals, ownersOwn, leadsOwn, reports]);
  const search = async (caller) => listedIds(await call(careerRoutes, "post", "/employee-referrals/search", caller, { body: {} }));
  const getList = async (caller) => (await call(careerRoutes, "get", "/employee-referrals", caller)).body.data.map((r) => String(r._id)).sort();
  const byId = (method, path, caller, doc, body = {}) => call(careerRoutes, method, path, caller, { params: { referralId: String(doc._id) }, body });
  const view = async (caller, doc) => (await byId("get", "/employee-referrals/:referralId", caller, doc)).statusCode;

  // The seeded Employee tier (own): only the referrals they made.
  assert.deepEqual(await search(tara), ids(tarasOwn), "an employee lists only their own referrals");
  assert.deepEqual(await getList(tara), ids(tarasOwn), "and the plain list too");
  assert.equal(await view(tara, tarasOwn), 200, "an employee opens their own referral");
  assert.equal(await view(tara, bilals), 403, "an employee opens a colleague's referral");
  // Team scope: their own and their report's.
  assert.deepEqual(await search(lead), ids(leadsOwn, reports), "team scope lists its own and its report's referrals");
  assert.equal(await view(lead, reports), 200, "team scope opens its report's referral");
  assert.equal(await view(lead, bilals), 403, "team scope opens an outsider's referral");
  // HR (the seeded HR Head row) sees every one.
  assert.deepEqual(await search(hema), ids(...all), "HR lists every referral");
  assert.equal(await view(hema, bilals), 200, "HR opens anyone's referral");

  // Edit, delete and create-job-applicant on a colleague's referral are refused.
  expectStatus(await byId("put", "/employee-referrals/:referralId", owner, bilals, { contactNo: "11111" }), 403, "own scope edits a colleague's referral");
  assert.equal(bilals.contactNo, "99999", "the colleague's referral is unchanged");
  expectStatus(await byId("delete", "/employee-referrals/:referralId", owner, bilals), 403, "own scope deletes a colleague's referral");
  expectStatus(await byId("post", "/employee-referrals/:referralId/create-job-applicant", owner, bilals), 403,
    "own scope makes a job applicant from a colleague's referral");
  // Their own edit is kept, but never moves the referral to someone else.
  expectStatus(await byId("put", "/employee-referrals/:referralId", owner, ownersOwn, { contactNo: "22222", referrerId: String(bilal._id) }), 200,
    "own scope edits their own referral naming bilal");
  assert.ok(same(ownersOwn.referrerId, owner._id) && ownersOwn.contactNo === "22222", "the edit is kept, the referrer is not moved");
  expectStatus(await byId("put", "/employee-referrals/:referralId", hema, bilals, { referrerId: String(tara._id) }), 200, "HR edits anyone's referral");
  assert.ok(same(bilals.referrerId, tara._id), "HR can move a referral to someone else");

  // A create below "all" is the caller's own whatever the body names; HR's is as chosen.
  const created = [];
  EmployeeReferral.create = async (data) => { created.push(data); return data; };
  const refer = (caller, n) => call(careerRoutes, "post", "/employee-referrals", caller, {
    body: { firstName: "New", lastName: `Hire${n}`, date: "2026-10-28", forDesignationId: String(oid()), email: `new${n}@example.com`, referrerId: String(bilal._id) },
  });
  expectStatus(await refer(tara, 1), 201, "an employee refers someone naming bilal");
  assert.ok(same(created.at(-1).referrerId, tara._id), "the employee's referral is their own");
  expectStatus(await refer(recruiter, 2), 201, "HR refers someone for bilal");
  assert.ok(same(created.at(-1).referrerId, bilal._id), "HR's referral is bilal's");
}

// --------------------- 11. only the applicant changes their leave request --
{
  // A team lead (team scope) and a named Leave Approver (own scope) could
  // edit, cancel and delete a report's or approvee's request by id.
  stub(UserRoles, tierMatrices);
  invalidateRoleCache();
  const leaveOf = (status, day) => ({ _id: oid(), employeeId: asha._id, leaveApproverId: tara._id, leaveTypeId: leaveType._id, companyId, status,
    fromDate: new Date(day), toDate: new Date(day), totalLeaveDays: 1, description: "" });
  const open = leaveOf("open", "2026-11-02");
  const approved = leaveOf("approved", "2026-11-09");
  stub(LeaveApplication, [open, approved]);
  const leaveId = (doc) => ({ leaveApplicationId: String(doc._id) });
  const editLeave = (caller) => call(leaveRoutes, "put", "/leave-applications/:leaveApplicationId", caller, { params: leaveId(open), body: { description: `by ${caller.employeeName}` } });
  const cancelLeave = (caller) => call(leaveRoutes, "post", "/leave-applications/:leaveApplicationId/cancel", caller, { params: leaveId(approved) });

  const comp = asDoc({ _id: oid(), employeeId: asha._id, companyId, status: "open", reason: "weekend release", isActive: true });
  stub(CompensatoryLeaveRequest, [comp]);
  const compId = { compensatoryLeaveRequestId: String(comp._id) };
  const editComp = (caller) => call(leaveRoutes, "put", "/compensatory-leave-requests/:compensatoryLeaveRequestId", caller, { params: compId, body: { reason: `by ${caller.employeeName}` } });
  const deleteComp = (caller) => call(leaveRoutes, "delete", "/compensatory-leave-requests/:compensatoryLeaveRequestId", caller, { params: compId });

  for (const [caller, label] of [[manju, "the applicant's team lead"], [tara, "the named Leave Approver"]]) {
    expectStatus(await call(leaveRoutes, "get", "/leave-applications/:leaveApplicationId", caller, { params: leaveId(open) }), 200, `${label} still opens the leave`);
    expectStatus(await editLeave(caller), 403, `${label} edits the leave`);
    expectStatus(await cancelLeave(caller), 403, `${label} cancels the approved leave`);
    expectStatus(await editComp(caller), 403, `${label} edits the compensatory leave`);
    expectStatus(await deleteComp(caller), 403, `${label} deletes the compensatory leave`);
  }
  assert.equal(open.description, "", "the leave was not edited");
  assert.equal(approved.status, "approved", "the leave was not cancelled");
  assert.equal(comp.reason, "weekend release", "the compensatory leave was not edited");

  expectStatus(await editLeave(asha), 200, "the applicant edits their open leave");
  assert.equal(open.description, "by asha");
  expectStatus(await editComp(asha), 200, "the applicant edits their compensatory leave");
  assert.equal(comp.reason, "by asha");
  expectStatus(await editLeave(hema), 200, "HR edits it");
  expectStatus(await cancelLeave(hema), 200, "HR cancels the approved leave");
  assert.equal(approved.status, "cancelled");
}

// ------ 12. grievance blame and shift / attendance requests stay the owner's --
{
  // A team lead could edit a report's grievance to move who it is against or
  // who is responsible; a department colleague or approver-scoped role could
  // edit anyone's Shift Request or cancel anyone's Attendance Request.
  const scopeRoles = Object.fromEntries([SCOPES.ALL, SCOPES.OWN, SCOPES.DEPARTMENT, SCOPES.TEAM, SCOPES.APPROVER].map((scope) => [scope, oid()]));
  const pages = ["/employee-grievance", "/shift-request", "/attendance-request"];
  stub(UserRoles, [...tierMatrices, ...Object.entries(scopeRoles).map(([scope, roleId]) => ({
    roleId, isActive: true, dataScope: SCOPES.ALL, roles: pages.map((menuUrl) => row(menuUrl, { write: true, edit: true }, scope)),
  }))]);
  invalidateRoleCache();
  const finance = oid();
  const lead = person("leela", "Employee", { roleId: scopeRoles[SCOPES.TEAM] });
  const applicant = person("rohan", "Employee", { roleId: scopeRoles[SCOPES.OWN], reportsToId: lead._id, departmentId: finance });
  const deptCaller = person("diya", "Employee", { roleId: scopeRoles[SCOPES.DEPARTMENT], departmentId: finance });
  const approverCaller = person("amar", "Employee", { roleId: scopeRoles[SCOPES.APPROVER] });
  const hrCaller = person("hiral", "Employee", { roleId: scopeRoles[SCOPES.ALL] });
  people.push(...[lead, applicant, deptCaller, approverCaller, hrCaller].map(asDoc));

  // Grievance: the edit is kept, the accused and responsible are not moved.
  const grievance = asDoc({ _id: oid(), raisedByEmployeeId: applicant._id, grievanceAgainstEmployeeId: bilal._id, employeeResponsibleId: tara._id,
    grievanceAgainstText: "Bilal", subject: "s", status: "Open", isActive: true });
  stub(EmployeeGrievance, [grievance]);
  const editGrievance = (caller, subject) => call(careerRoutes, "put", "/employee-grievances/:grievanceId", caller, {
    params: { grievanceId: String(grievance._id) }, body: { subject, grievanceAgainstEmployeeId: String(lead._id), employeeResponsibleId: String(applicant._id), grievanceAgainstText: "Lead" },
  });
  for (const caller of [lead, applicant]) {
    expectStatus(await editGrievance(caller, `by ${caller.employeeName}`), 200, `${caller.employeeName} edits the grievance naming someone else`);
    assert.equal(grievance.subject, `by ${caller.employeeName}`, `${caller.employeeName}: the rest of the edit is kept`);
    assert.ok(same(grievance.grievanceAgainstEmployeeId, bilal._id) && same(grievance.employeeResponsibleId, tara._id) && grievance.grievanceAgainstText === "Bilal",
      `${caller.employeeName}: who it is against and who is responsible are unchanged`);
  }
  expectStatus(await editGrievance(hrCaller, "by hiral"), 200, "HR edits the grievance");
  assert.ok(same(grievance.grievanceAgainstEmployeeId, lead._id) && same(grievance.employeeResponsibleId, applicant._id) && grievance.grievanceAgainstText === "Lead",
    "HR can change who it is against and who is responsible");

  // Shift Request edit and Attendance Request cancel: only the applicant, or HR.
  const shiftType = { _id: oid(), shiftTypeName: "Day" };
  stub(ShiftType, [shiftType]);
  const shift = { _id: oid(), employeeId: applicant._id, shiftTypeId: shiftType._id, companyId, approverId: approverCaller._id, status: "open",
    fromDate: new Date("2026-11-02"), toDate: new Date("2026-11-02") };
  stub(ShiftRequest, [shift]);
  const editShift = (caller) => call(shiftRequestRoutes, "put", "/shift-requests/:shiftRequestId", caller, {
    params: { shiftRequestId: String(shift._id) }, body: { toDate: "2026-11-03", approverId: String(approverCaller._id) },
  });
  const attendanceOf = () => ({ _id: oid(), employeeId: applicant._id, companyId, approverId: approverCaller._id, status: "open",
    fromDate: new Date("2026-11-02"), toDate: new Date("2026-11-02"), reason: "On Duty" });
  const attendance = attendanceOf();
  const hrsAttendance = attendanceOf();
  stub(AttendanceRequest, [attendance, hrsAttendance]);
  const cancelAttendance = (caller, doc) => call(shiftRequestRoutes, "post", "/attendance-requests/:attendanceRequestId/cancel", caller,
    { params: { attendanceRequestId: String(doc._id) } });

  for (const [caller, label] of [[deptCaller, "a department colleague"], [lead, "the applicant's team lead"], [approverCaller, "the named approver (approver scope)"]]) {
    expectStatus(await editShift(caller), 403, `${label} edits the shift request`);
    expectStatus(await cancelAttendance(caller, attendance), 403, `${label} cancels the attendance request`);
  }
  assert.equal(shift.toDate.toISOString(), new Date("2026-11-02").toISOString(), "the shift request was not edited");
  assert.equal(attendance.status, "open", "the attendance request was not cancelled");

  expectStatus(await editShift(applicant), 200, "the applicant edits their shift request");
  assert.equal(String(shift.toDate), "2026-11-03", "the applicant's edit is kept");
  expectStatus(await editShift(hrCaller), 200, "HR edits it");
  expectStatus(await cancelAttendance(applicant, attendance), 200, "the applicant cancels their attendance request");
  assert.equal(attendance.status, "cancelled");
  expectStatus(await cancelAttendance(hrCaller, hrsAttendance), 200, "HR cancels an attendance request");
  assert.equal(hrsAttendance.status, "cancelled");
}

console.log("accessLifecycle.test.js passed");
