// Who decides a request, and that it is decided once — the 29 Oct security
// test (S3, S4, S9) and functional test (P1, P5):
//   1. the approver is always the configured chain's — own approver, else
//      the department's, else the Reports To manager, else HR — never one the
//      applicant names, on leave, expense, shift and compensatory leave,
//   2. HR sets approvers on Employee and Department: current staff of the
//      same company only,
//   3. two decisions pressed at the same moment: one wins, the other is
//      refused and nothing is written twice,
//   4. only HR sets a grievance's status and its investigation and
//      resolution; the complainant may withdraw it.
// Drives the real mounted routes over in-memory stand-ins and the seeded
// tier/functional matrices, like approvalIntegrity.test.js.
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { SCOPES } from "@demo-panel/shared/scopes";
import AdditionalSalary from "../../models/AdditionalSalary.js";
import AdminUser from "../../models/AdminUser.js";
import Arrear from "../../models/Arrear.js";
import Attendance from "../../models/Attendance.js";
import Company from "../../models/Company.js";
import CompensatoryLeaveRequest from "../../models/CompensatoryLeaveRequest.js";
import Department from "../../models/Department.js";
import Employee from "../../models/Employee.js";
import EmployeeGrievance from "../../models/EmployeeGrievance.js";
import ExpenseClaim from "../../models/ExpenseClaim.js";
import HolidayList from "../../models/HolidayList.js";
import HolidayListAssignment from "../../models/HolidayListAssignment.js";
import LeaveAllocation from "../../models/LeaveAllocation.js";
import LeaveApplication from "../../models/LeaveApplication.js";
import LeaveBlockList from "../../models/LeaveBlockList.js";
import LeaveLedgerEntry from "../../models/LeaveLedgerEntry.js";
import LeavePeriod from "../../models/LeavePeriod.js";
import LeaveType from "../../models/LeaveType.js";
import MenuMaster from "../../models/MenuMaster.js";
import ShiftAssignment from "../../models/ShiftAssignment.js";
import ShiftRequest from "../../models/ShiftRequest.js";
import ShiftType from "../../models/ShiftType.js";
import UserRoles from "../../models/UserRoles.js";
import { buildRoleRows } from "../../seed/org-tiers.data.js";
import { configuredApprover } from "../../utils/approvers.js";
import leaveRoutes from "../../routes/v1/leavesTransactions.routes.js";
import requestRoutes from "../../routes/v1/shiftAttendanceTransactions.routes.js";
import expenseRoutes from "../../routes/v1/expenses.routes.js";
import careerRoutes from "../../routes/v1/employeeCareerEvents.routes.js";
import { submitArrear } from "./payrollAdjustments.controller.js";
import { updateEmployee } from "./employee.controller.js";
import { updateDepartment } from "./department.controller.js";

// ---------------------------------------------------------------- stand-ins --
const same = (a, b) => String(a) === String(b);
const OPERATORS = {
  $in: (value, arg) => arg.some((x) => (Array.isArray(value) ? value.some((v) => same(v, x)) : same(value, x))),
  $nin: (value, arg) => !arg.some((x) => same(value, x)),
  $ne: (value, arg) => !same(value ?? null, arg ?? null),
  $lte: (value, arg) => value <= arg,
  $gte: (value, arg) => value >= arg,
  $lt: (value, arg) => value < arg,
  $exists: (value, arg) => (value !== undefined) === arg,
};
const isOperators = (cond) => cond && typeof cond === "object" && !Array.isArray(cond) && !(cond instanceof mongoose.Types.ObjectId)
  && !(cond instanceof Date) && Object.keys(cond).length > 0 && Object.keys(cond).every((key) => key.startsWith("$"));
const matches = (row, filter = {}) => Object.entries(filter).every(([key, cond]) => {
  if (key === "$and") return cond.every((part) => matches(row, part));
  if (key === "$or") return cond.some((part) => matches(row, part));
  if (!isOperators(cond)) {
    const value = row[key] ?? null;
    return Array.isArray(value) ? value.some((v) => same(v, cond)) : same(value, cond ?? null);
  }
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
// Rows double as documents: save/populate/toObject act on the row itself.
const asDoc = (row) => Object.assign(row, {
  save: async () => row,
  populate: async () => row,
  validate: async () => {},
  deleteOne: async () => row,
  toObject: () => Object.fromEntries(Object.entries(row).filter(([, value]) => typeof value !== "function")),
});
// Each request loads its own copy, as from the database, and its save writes
// the copy back — two requests in flight never share one object.
const plain = (row) => Object.fromEntries(Object.entries(row).filter(([, value]) => typeof value !== "function"));
const loaded = (row) => {
  if (!row) return null;
  const doc = plain(row);
  return Object.assign(doc, {
    save: async () => { Object.assign(row, plain(doc)); return doc; },
    populate: async () => doc,
    validate: async () => {},
    deleteOne: async () => doc,
    toObject: () => plain(doc),
  });
};
const stub = (Model, rows) => {
  rows.forEach(asDoc);
  Model.find = (filter) => query(rows.filter((row) => matches(row, filter)));
  Model.findOne = (filter) => query(loaded(rows.find((row) => matches(row, filter))));
  Model.findById = (id) => query(loaded(rows.find((row) => same(row._id, id))));
  Model.exists = async (filter) => (rows.find((row) => matches(row, filter)) ? { _id: oid() } : null);
  Model.countDocuments = async (filter) => rows.filter((row) => matches(row, filter)).length;
  Model.create = async (data) => { const row = asDoc({ _id: oid(), ...data }); rows.push(row); return row; };
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
  Model.updateMany = async (filter, update) => {
    rows.filter((row) => matches(row, filter)).forEach((row) => Object.assign(row, update.$set ?? update));
    return {};
  };
  return rows;
};
const fakeRes = () => ({
  statusCode: 200, body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = JSON.parse(JSON.stringify(body)); return this; },
});

// ----------------------------------------------------------------- fixtures --
const oid = () => new mongoose.Types.ObjectId();
const companyId = oid();
const otherCompanyId = oid();
const roles = { Employee: oid(), "Team Lead": oid(), "HR Head": oid() };
const plainDept = { _id: oid(), departmentName: "Warehouse", companyId, parentDepartmentId: null, leaveApprovers: [], expenseApprovers: [], shiftRequestApprovers: [] };
const approvedDept = { _id: oid(), departmentName: "Finance", companyId, parentDepartmentId: null, leaveApprovers: [], expenseApprovers: [], shiftRequestApprovers: [] };
const person = (employeeName, roleName, extra = {}) => ({
  _id: oid(), employeeName, employeeCode: employeeName.toUpperCase(), email: `${employeeName}@work.example`, roleId: roles[roleName],
  companyId, departmentId: plainDept._id, reportsToId: null, status: "Active", isActive: true, ...extra,
});
const hema = person("hema", "HR Head");
const manju = person("manju", "Team Lead");
const tara = person("tara", "Team Lead");
const deepa = person("deepa", "Team Lead", { departmentId: approvedDept._id });
const gone = person("gone", "Team Lead", { status: "Left" });
const outsider = person("outsider", "Team Lead", { companyId: otherCompanyId });
const dhara = person("dhara", "Employee"); // nobody configured, reports to nobody
const chirag = person("chirag", "Employee"); // dhara's peer
const ravi = person("ravi", "Employee", { reportsToId: manju._id });
const isha = person("isha", "Employee", { departmentId: approvedDept._id, reportsToId: manju._id });
const omar = person("omar", "Employee", { reportsToId: manju._id, leaveApproverId: tara._id, expenseApproverId: tara._id, shiftRequestApproverId: tara._id });
const nora = person("nora", "Employee", { reportsToId: gone._id });
approvedDept.leaveApprovers = [deepa._id];
approvedDept.expenseApprovers = [deepa._id];
approvedDept.shiftRequestApprovers = [deepa._id];
const employees = stub(Employee, [hema, manju, tara, deepa, gone, outsider, dhara, chirag, ravi, isha, omar, nora]);
stub(Department, [plainDept, approvedDept]);
stub(AdminUser, []);
Company.exists = async () => ({ _id: companyId });
Company.findById = () => query({ _id: companyId, defaultCurrency: "INR" });

const SEEDED = ["Employee", "Team Lead", "HR Head"];
const menuUrls = [...new Set(SEEDED.flatMap((role) => buildRoleRows(role).menuRows.map((row) => row.menuUrl)))];
const menus = menuUrls.map((menuUrl) => ({ _id: oid(), menuUrl }));
const menuIdByUrl = new Map(menus.map((menu) => [menu.menuUrl, menu._id]));
stub(MenuMaster, menus);
stub(UserRoles, SEEDED.map((roleName) => ({
  roleId: roles[roleName], isActive: true, dataScope: SCOPES.ALL,
  roles: buildRoleRows(roleName).menuRows.map(({ menuUrl, ...permissions }) => ({ menuId: menuIdByUrl.get(menuUrl), ...permissions })),
})));

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
const hrReq = (body, params) => ({ user: { id: String(hema._id), role: "USER", dataScope: SCOPES.ALL }, body, params });

// ---------------------------------------- 1. the configured approver chain --
{
  for (const type of ["leave", "expense", "shiftRequest"]) {
    assert.ok(same(await configuredApprover(omar._id, type), tara._id), `${type}: the employee's own approver wins`);
    assert.ok(same(await configuredApprover(isha._id, type), deepa._id), `${type}: else the department's`);
    assert.ok(same(await configuredApprover(ravi._id, type), manju._id), `${type}: else the Reports To manager`);
    assert.equal(await configuredApprover(nora._id, type), null, `${type}: a manager who has left decides nothing`);
    assert.equal(await configuredApprover(dhara._id, type), null, `${type}: else HR`);
  }

  // Dhara names her peer on a ₹50 claim; it goes to HR, and Chirag cannot approve it.
  const claims = stub(ExpenseClaim, []);
  const filed = await call(expenseRoutes, "post", "/expense-claims", dhara, {
    body: { postingDate: "2026-11-02", expenseApproverId: String(chirag._id), expenses: [{ expenseTypeId: String(oid()), description: "Bus", amount: 50 }] },
  });
  expectStatus(filed, 201, "employee files an expense claim");
  assert.equal(claims[0].expenseApproverId, null, "the named peer is ignored: nobody is configured, so HR decides");
  expectStatus(await call(expenseRoutes, "post", "/expense-claims/:id/approve", chirag, { params: { id: String(claims[0]._id) } }), 403, "the peer approves");
  expectStatus(await call(expenseRoutes, "put", "/expense-claims/:id", dhara, {
    params: { id: String(claims[0]._id) }, body: { expenseApproverId: String(chirag._id) },
  }), 200, "editing the claim");
  assert.equal(claims[0].expenseApproverId, null, "an edit cannot name an approver either");
  const raviClaim = await call(expenseRoutes, "post", "/expense-claims", ravi, {
    body: { expenseApproverId: String(chirag._id), expenses: [{ expenseTypeId: String(oid()), description: "Taxi", amount: 80 }] },
  });
  expectStatus(raviClaim, 201, "an employee with a manager files a claim");
  expectStatus(await call(expenseRoutes, "post", "/expense-claims", ravi, {
    body: { expenses: [{ expenseTypeId: String(oid()), description: "Taxi", amount: 80, expenseDate: "9999-01-01" }] },
  }), 400, "an expense dated in year 9999");
  assert.ok(same(claims[1].expenseApproverId, manju._id), "it goes to the Reports To manager, not the named peer");
  expectStatus(await call(expenseRoutes, "post", "/expense-claims/:id/approve", manju, { params: { id: String(claims[1]._id) } }), 200, "the manager approves");

  // Leave: the same, with nobody configured for Dhara's department.
  const leaveType = { _id: oid(), leaveTypeName: "Leave Without Pay", isLwp: true, includeHoliday: true };
  stub(LeaveType, [leaveType]);
  stub(LeaveBlockList, []);
  const leaves = stub(LeaveApplication, []);
  const apply = (caller, day) => call(leaveRoutes, "post", "/leave-applications", caller, {
    body: { leaveTypeId: String(leaveType._id), fromDate: day, toDate: day, leaveApproverId: String(chirag._id), description: "Family" },
  });
  expectStatus(await apply(dhara, "2026-11-20"), 201, "employee applies, naming a peer");
  assert.equal(leaves[0].leaveApproverId, null, "the named peer is ignored; HR decides");
  expectStatus(await call(leaveRoutes, "post", "/leave-applications/:leaveApplicationId/approve", chirag, {
    params: { leaveApplicationId: String(leaves[0]._id) },
  }), 403, "the peer approves the leave");
  const impossible = await apply(dhara, "2026-02-30");
  expectStatus(impossible, 400, "a leave on 30 Feb");
  assert.equal(impossible.body.message, "From Date is not a real calendar date");
  expectStatus(await apply(dhara, "9999-12-30"), 400, "a leave in year 9999");
  assert.equal(leaves.length, 1, "neither was saved");
  expectStatus(await apply(ravi, "2026-11-21"), 201, "an employee with a manager applies");
  assert.ok(same(leaves[1].leaveApproverId, manju._id), "it goes to the Reports To manager");

  // Shift request: the named peer is ignored.
  const shiftType = { _id: oid(), shiftTypeName: "Morning" };
  stub(ShiftType, [shiftType]);
  stub(ShiftAssignment, []);
  const shifts = stub(ShiftRequest, []);
  expectStatus(await call(requestRoutes, "post", "/shift-requests", omar, {
    body: { shiftTypeId: String(shiftType._id), fromDate: "2026-11-23", toDate: "2026-11-24", approverId: String(chirag._id) },
  }), 201, "employee requests a shift, naming a peer");
  assert.ok(same(shifts[0].approverId, tara._id), "it goes to the configured Shift Approver");

  // Compensatory leave names nobody: the Reports To manager decides it, a peer does not.
  const comp = { _id: oid(), employeeId: ravi._id, companyId, status: "open" };
  stub(CompensatoryLeaveRequest, [comp]);
  const decideComp = (caller) => call(leaveRoutes, "post", "/compensatory-leave-requests/:compensatoryLeaveRequestId/reject", caller, {
    params: { compensatoryLeaveRequestId: String(comp._id) },
  });
  expectStatus(await decideComp(chirag), 403, "a peer decides compensatory leave");
  expectStatus(await decideComp(manju), 200, "the Reports To manager decides it");
}

// ------------------------------- 2. HR sets approvers: current staff, own company --
{
  const save = async (fields, employee = dhara) => {
    const res = fakeRes();
    await updateEmployee(hrReq(fields, { employeeId: String(employee._id) }), res);
    return res;
  };
  expectStatus(await save({ leaveApproverId: String(outsider._id) }), 400, "an approver from another company");
  expectStatus(await save({ expenseApproverId: String(gone._id) }), 400, "an approver who has left");
  expectStatus(await save({ shiftRequestApproverId: String(dhara._id) }), 400, "the employee as their own approver");
  assert.equal(dhara.leaveApproverId ?? null, null, "nothing refused was saved");
  expectStatus(await save({ leaveApproverId: String(manju._id) }), 200, "a current colleague");
  assert.ok(same(dhara.leaveApproverId, manju._id));
  delete dhara.leaveApproverId;

  const saveDept = async (body) => {
    const res = fakeRes();
    await updateDepartment(hrReq({ departmentName: plainDept.departmentName, companyId: String(companyId), ...body }, { departmentId: String(plainDept._id) }), res);
    return res;
  };
  expectStatus(await saveDept({ leaveApprovers: [String(outsider._id)] }), 400, "a department approver from another company");
  expectStatus(await saveDept({ expenseApprovers: [String(gone._id)] }), 400, "a department approver who has left");
  expectStatus(await saveDept({ shiftRequestApprovers: [String(tara._id)] }), 200, "current colleagues");
  assert.deepEqual(plainDept.shiftRequestApprovers.map(String), [String(tara._id)]);
  plainDept.shiftRequestApprovers = [];
  assert.ok(employees.length > 0);
}

// ----------------------------------- 3. two decisions at the same moment --
{
  const leaveType = { _id: oid(), leaveTypeName: "Leave Without Pay", isLwp: true, includeHoliday: true };
  stub(LeaveType, [leaveType]);
  stub(LeaveAllocation, []);
  stub(Attendance, []);
  const ledger = stub(LeaveLedgerEntry, []);
  const day = new Date("2026-11-20");
  const leave = { _id: oid(), employeeId: ravi._id, leaveTypeId: leaveType._id, companyId, leaveApproverId: manju._id, status: "open", fromDate: day, toDate: day, totalLeaveDays: 1, halfDay: false };
  stub(LeaveApplication, [leave]);
  const decide = (verb, caller) => call(leaveRoutes, "post", `/leave-applications/:leaveApplicationId/${verb}`, caller, { params: { leaveApplicationId: String(leave._id) } });

  const both = await Promise.all([decide("approve", manju), decide("approve", hema)]);
  assert.deepEqual(both.map((res) => res.statusCode).sort(), [200, 409], `one approval wins: ${JSON.stringify(both.map((res) => res.body))}`);
  assert.equal(ledger.length, 1, "one 1-day leave writes one ledger entry, not two");
  assert.equal(leave.status, "approved");

  const cancels = await Promise.all([1, 2].map(() => call(leaveRoutes, "post", "/leave-applications/:leaveApplicationId/cancel", ravi, { params: { leaveApplicationId: String(leave._id) } })));
  assert.deepEqual(cancels.map((res) => res.statusCode).sort(), [200, 409], "one cancel wins");
  assert.equal(leave.status, "cancelled");

  const second = { ...leave, _id: oid(), status: "open" };
  stub(LeaveApplication, [second]);
  const mixed = await Promise.all([
    call(leaveRoutes, "post", "/leave-applications/:leaveApplicationId/approve", manju, { params: { leaveApplicationId: String(second._id) } }),
    call(leaveRoutes, "post", "/leave-applications/:leaveApplicationId/reject", hema, { params: { leaveApplicationId: String(second._id) } }),
  ]);
  assert.deepEqual(mixed.map((res) => res.statusCode).sort(), [200, 409], "an approve and a reject at once: one wins");
  assert.equal(ledger.length, second.status === "approved" ? 2 : 1, "a rejected leave writes no ledger entry");

  // Compensatory leave: one approval credits the worked holiday once.
  const compType = { _id: oid(), leaveTypeName: "Compensatory Off", isCompensatory: true };
  stub(LeaveType, [compType]);
  const holiday = new Date("2026-11-08");
  stub(HolidayListAssignment, [{ _id: oid(), applicableFor: "Company", companyId, fromDate: new Date("2026-01-01"), holidayListId: "list" }]);
  stub(HolidayList, [{ _id: "list", holidays: [{ holidayDate: holiday }] }]);
  stub(Attendance, [{ _id: oid(), employeeId: ravi._id, attendanceDate: holiday, status: "Present" }]);
  stub(LeavePeriod, [{ _id: oid(), companyId, isActive: true, fromDate: new Date("2026-01-01"), toDate: new Date("2026-12-31") }]);
  const allocations = stub(LeaveAllocation, []);
  const compLedger = stub(LeaveLedgerEntry, []);
  const comp = { _id: oid(), employeeId: ravi._id, leaveTypeId: compType._id, companyId, status: "open", workFromDate: holiday, workEndDate: holiday, halfDay: false };
  stub(CompensatoryLeaveRequest, [comp]);
  const approveComp = (caller) => call(leaveRoutes, "post", "/compensatory-leave-requests/:compensatoryLeaveRequestId/approve", caller, {
    params: { compensatoryLeaveRequestId: String(comp._id) },
  });
  const comps = await Promise.all([approveComp(manju), approveComp(manju)]); // one person, two tabs
  assert.deepEqual(comps.map((res) => res.statusCode).sort(), [200, 409], `one compensatory approval wins: ${JSON.stringify(comps.map((res) => res.body))}`);
  assert.equal(compLedger.length, 1, "the day is credited once");
  assert.equal(allocations.length, 1);

  // A payroll submit that writes pay lines: one Submit wins, the lines are written once.
  const arrear = { _id: oid(), employeeId: ravi._id, companyId, status: "draft", payrollDate: new Date("2026-11-30"), earningArrears: [{ salaryComponentId: oid(), amount: 1000 }], deductionArrears: [] };
  stub(Arrear, [arrear]);
  const lines = stub(AdditionalSalary, []);
  const submits = await Promise.all([1, 2].map(async () => { const res = fakeRes(); await submitArrear({ ...hrReq({}, { id: String(arrear._id) }) }, res); return res; }));
  assert.deepEqual(submits.map((res) => res.statusCode).sort(), [200, 409], "one arrear Submit wins");
  assert.equal(lines.length, 1, "its Additional Salary is created once");
}

// --------------------------------------------- 4. grievance: only HR resolves --
{
  const grievances = stub(EmployeeGrievance, []);
  EmployeeGrievance.create = async (data) => { const row = asDoc({ _id: oid(), status: "Open", ...data }); grievances.push(row); return row; };
  const typeId = String(oid());
  const filed = await call(careerRoutes, "post", "/employee-grievances", dhara, {
    body: {
      subject: "Shift roster", date: "2026-10-29", grievanceTypeId: typeId, description: "Unfair roster",
      status: "Resolved", resolvedByUserId: String(hema._id), resolutionDate: "2026-10-29", resolutionDetail: "Settled by HR", causeOfGrievance: "Roster",
    },
  });
  expectStatus(filed, 201, "employee files a grievance");
  const [grievance] = grievances;
  assert.equal(grievance.status, "Open", "the complainant cannot file it as Resolved");
  for (const field of ["resolvedByUserId", "resolutionDate", "resolutionDetail", "causeOfGrievance"]) {
    assert.equal(grievance[field], undefined, `${field} is HR's to set`);
  }

  const edit = (caller, body) => call(careerRoutes, "put", "/employee-grievances/:grievanceId", caller, { params: { grievanceId: String(grievance._id) }, body });
  expectStatus(await edit(hema, { status: "Investigated", causeOfGrievance: "Roster written by hand" }), 200, "HR investigates");
  expectStatus(await edit(dhara, { causeOfGrievance: "Mine now", status: "Resolved", description: "Unfair roster, again" }), 200, "the complainant edits");
  assert.equal(grievance.causeOfGrievance, "Roster written by hand", "HR's finding is not overwritten");
  assert.equal(grievance.status, "Investigated", "nor its status");
  assert.equal(grievance.description, "Unfair roster, again", "the complainant's own text still changes");

  expectStatus(await edit(dhara, { status: "Cancelled" }), 200, "the complainant withdraws it");
  assert.equal(grievance.status, "Cancelled");
  grievance.status = "Resolved";
  expectStatus(await edit(dhara, { status: "Cancelled" }), 400, "withdrawing what HR has resolved");
  assert.equal(grievance.status, "Resolved");
}

console.log("decisionIntegrity.test.js passed");
