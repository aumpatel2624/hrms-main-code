// ADR-043: an Employee's own payslips and leave balance. Runs the real
// checkPermission + controller handlers, with each model's find/findOne/
// findById swapped for an in-memory stand-in — no database, so it stays in
// `npm test`'s dependency-free chain. The role matrices are the seeded
// org-tier/functional rows (buildRoleRows), so the grants are tested too.
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { SCOPES } from "@demo-panel/shared/scopes";
import Employee from "../../models/Employee.js";
import Department from "../../models/Department.js";
import SalarySlip from "../../models/SalarySlip.js";
import SalaryWithholding from "../../models/SalaryWithholding.js";
import LeaveAllocation from "../../models/LeaveAllocation.js";
import LeaveLedgerEntry from "../../models/LeaveLedgerEntry.js";
import LeaveType from "../../models/LeaveType.js";
import MenuMaster from "../../models/MenuMaster.js";
import UserRoles from "../../models/UserRoles.js";
import { checkPermission } from "../../middlewares/checkPermission.js";
import { buildRoleRows } from "../../seed/org-tiers.data.js";
import { getSalarySlipById, listSalarySlips } from "./payrollRun.controller.js";
import { getMyLeaveBalance } from "./leavesTransactions.controller.js";

// ---------------------------------------------------------------- stand-ins --
const same = (a, b) => String(a) === String(b);
const isOperators = (cond) => cond && typeof cond === "object" && !Array.isArray(cond)
  && Object.keys(cond).length > 0 && Object.keys(cond).every((key) => key.startsWith("$"));
const OPERATORS = {
  $in: (value, arg) => arg.some((x) => same(value, x)),
  $ne: (value, arg) => !same(value, arg),
  $lte: (value, arg) => value <= arg,
  $gte: (value, arg) => value >= arg,
};
const matches = (row, filter = {}) => Object.entries(filter).every(([key, cond]) => {
  if (key === "$and") return cond.every((part) => matches(row, part));
  if (!isOperators(cond)) return same(row[key], cond);
  return Object.entries(cond).every(([op, arg]) => {
    if (!OPERATORS[op]) throw new Error(`stand-in query: unsupported ${op}`);
    return OPERATORS[op](row[key], arg);
  });
});
const query = (result) => {
  let rows = result;
  const chain = {
    select: () => chain, populate: () => chain, lean: () => chain,
    sort: (spec) => {
      const [[field, dir]] = Object.entries(spec);
      rows = [...rows].sort((a, b) => String(a[field]).localeCompare(String(b[field])) * dir);
      return chain;
    },
    then: (resolve, reject) => Promise.resolve(rows).then(resolve, reject),
  };
  return chain;
};
const stub = (Model, rows) => {
  Model.find = (filter) => query(rows.filter((row) => matches(row, filter)));
  Model.findOne = (filter) => query(rows.find((row) => matches(row, filter)) ?? null);
  Model.findById = (id) => query(rows.find((row) => same(row._id, id)) ?? null);
};
const fakeRes = () => ({
  statusCode: 200, body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
  clearCookie() {},
});

// ----------------------------------------------------------------- fixtures --
const oid = () => new mongoose.Types.ObjectId();
const companyId = oid();
const person = (employeeName, roleId, reportsToId = null) => ({ _id: oid(), employeeName, employeeCode: employeeName.toUpperCase(), companyId, roleId, reportsToId });

const roles = { Employee: oid(), "Team Lead": oid(), "HR Head": oid() };
const manager = person("manju", roles["Team Lead"]);
const asha = person("asha", roles.Employee, manager._id);
const bilal = person("bilal", roles.Employee, manager._id); // asha's colleague, same manager
const chen = person("chen", roles.Employee); // outside manju's team
const hr = person("hema", roles["HR Head"]);
stub(Employee, [manager, asha, bilal, chen, hr]);
stub(Department, []);

const PAYROLL_HR_ONLY = ["/payroll-entry", "/payroll-period", "/payroll-settings", "/salary-withholding"];
const menuUrls = [...new Set([...PAYROLL_HR_ONLY, ...Object.keys(roles).flatMap((role) => buildRoleRows(role).menuRows.map((row) => row.menuUrl))])];
const menus = menuUrls.map((menuUrl) => ({ _id: oid(), menuUrl, menuGroup: oid() }));
const menuIdByUrl = new Map(menus.map((menu) => [menu.menuUrl, menu._id]));
stub(MenuMaster, menus);
stub(UserRoles, Object.entries(roles).map(([roleName, roleId]) => ({
  roleId, isActive: true, dataScope: SCOPES.ALL,
  roles: buildRoleRows(roleName).menuRows.map(({ menuUrl, ...permissions }) => ({ menuId: menuIdByUrl.get(menuUrl), ...permissions })),
})));

const slip = (employee, status) => ({ _id: oid(), employeeId: employee._id, companyId, status, startDate: new Date("2026-09-01"), endDate: new Date("2026-09-30"), netPay: 1000 });
const ashaSubmitted = slip(asha, "submitted");
const ashaDraft = slip(asha, "draft");
const ashaCancelled = slip(asha, "cancelled");
const bilalSubmitted = slip(bilal, "submitted");
stub(SalarySlip, [ashaSubmitted, ashaDraft, ashaCancelled, bilalSubmitted]);
SalaryWithholding.exists = async () => null;

const casual = { _id: oid(), leaveTypeName: "Casual Leave" };
const sick = { _id: oid(), leaveTypeName: "Sick Leave" };
stub(LeaveType, [casual, sick]);
const period = { status: "active", fromDate: new Date("2026-01-01"), toDate: new Date("2099-12-31") };
stub(LeaveAllocation, [
  { ...period, _id: oid(), employeeId: asha._id, leaveTypeId: casual._id, newLeavesAllocated: 12 },
  { ...period, _id: oid(), employeeId: asha._id, leaveTypeId: sick._id, newLeavesAllocated: 6 },
  { ...period, _id: oid(), employeeId: chen._id, leaveTypeId: casual._id, newLeavesAllocated: 10 },
]);
const ledger = [
  { employeeId: asha._id, leaveTypeId: casual._id, leaves: 12 },
  { employeeId: asha._id, leaveTypeId: casual._id, leaves: -3 },
  { employeeId: asha._id, leaveTypeId: casual._id, leaves: -2, isDeleted: true }, // a cancelled leave
  { employeeId: asha._id, leaveTypeId: sick._id, leaves: 6 },
  { employeeId: chen._id, leaveTypeId: casual._id, leaves: 10 },
].map((row) => ({ ...row, createdAt: new Date("2026-02-01") }));
LeaveLedgerEntry.aggregate = async ([{ $match }]) => {
  const rows = ledger.filter((row) => matches(row, $match));
  return rows.length ? [{ _id: null, balance: rows.reduce((sum, row) => sum + row.leaves, 0) }] : [];
};

// ------------------------------------------------------------------ helpers --
// A fresh signed-in request for `employee`, run through checkPermission first.
const call = async (employee, menuUrl, action, handler, { params = {}, query: q = {} } = {}) => {
  const req = {
    user: { id: String(employee._id), role: "USER" },
    session: { user: { roleId: String(employee.roleId), departmentId: null } },
    params, query: q,
  };
  const res = fakeRes();
  let allowed = false;
  await checkPermission(menuUrl, action)(req, res, () => { allowed = true; });
  if (allowed) await handler(req, res);
  return res;
};
const readSlip = (employee, doc) => call(employee, "/salary-slip", "read", getSalarySlipById, { params: { salarySlipId: String(doc._id) } });
const listSlips = async (employee) => (await call(employee, "/salary-slip", "read", listSalarySlips)).body.data.map((row) => String(row._id)).sort();
const balance = (employee, target) => call(employee, "/my-leave-balance", "read", getMyLeaveBalance, { query: target ? { employeeId: String(target._id) } : {} });
const noop = async (req, res) => res.status(200).json({ isOk: true });

// --------------------------------------------------------------- payslips --
{
  // An employee reads their own submitted slip …
  const own = await readSlip(asha, ashaSubmitted);
  assert.equal(own.statusCode, 200);
  assert.equal(String(own.body.data._id), String(ashaSubmitted._id));
  // … but not a colleague's, and not their own draft or cancelled one.
  assert.equal((await readSlip(asha, bilalSubmitted)).statusCode, 404, "a colleague's slip is invisible");
  assert.equal((await readSlip(asha, ashaDraft)).statusCode, 404, "a draft HR is still working on is invisible");
  assert.equal((await readSlip(asha, ashaCancelled)).statusCode, 404, "a cancelled slip is invisible");
  assert.deepEqual(await listSlips(asha), [String(ashaSubmitted._id)], "the list is own + submitted only");

  // Read-only: every write route is refused before the handler runs.
  for (const action of ["write", "edit", "delete"]) {
    assert.equal((await call(asha, "/salary-slip", action, noop)).statusCode, 403, `employee ${action} on /salary-slip`);
  }
  // Nothing else from payroll is opened up.
  for (const menuUrl of PAYROLL_HR_ONLY) {
    assert.equal((await call(asha, menuUrl, "read", noop)).statusCode, 403, `employee read on ${menuUrl}`);
  }

  // HR keeps seeing every slip, drafts included.
  assert.equal((await readSlip(hr, ashaDraft)).statusCode, 200);
  assert.equal((await listSlips(hr)).length, 4);
}

// ----------------------------------------------------------- leave balance --
{
  // An employee reads their own balance: allocated / used / left per leave type.
  const own = await balance(asha);
  assert.equal(own.statusCode, 200);
  assert.equal(own.body.data.employeeId, String(asha._id));
  assert.deepEqual(own.body.data.balances.map(({ leaveTypeName, allocated, used, available }) => ({ leaveTypeName, allocated, used, available })), [
    { leaveTypeName: "Casual Leave", allocated: 12, used: 3, available: 9 },
    { leaveTypeName: "Sick Leave", allocated: 6, used: 0, available: 6 },
  ]);
  assert.deepEqual(own.body.data.people.map((row) => row.employeeName), ["asha"], "an employee can pick only themself");
  // … but not a colleague's.
  assert.equal((await balance(asha, bilal)).statusCode, 403, "a colleague's balance is refused");

  // A manager reads a direct report's balance, but not someone outside their team.
  const report = await balance(manager, asha);
  assert.equal(report.statusCode, 200);
  assert.equal(report.body.data.balances.length, 2);
  assert.deepEqual(report.body.data.people.map((row) => row.employeeName).sort(), ["asha", "bilal", "manju"]);
  assert.equal((await balance(manager, chen)).statusCode, 403, "outside the reporting line is refused");

  // HR reads anyone's.
  const anyone = await balance(hr, chen);
  assert.equal(anyone.statusCode, 200);
  assert.deepEqual(anyone.body.data.balances.map((row) => row.available), [10]);
  assert.equal(anyone.body.data.people.length, 5);

  // A malformed id is a 400, not a crash.
  assert.equal((await call(hr, "/my-leave-balance", "read", getMyLeaveBalance, { query: { employeeId: "nope" } })).statusCode, 400);
}

console.log("selfService.test.js passed");
