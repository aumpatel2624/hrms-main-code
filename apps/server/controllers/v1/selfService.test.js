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
import { previewDashboardWidget } from "./dashboard.controller.js";

// ---------------------------------------------------------------- stand-ins --
const same = (a, b) => String(a) === String(b);
const isOperators = (cond) => cond && typeof cond === "object" && !Array.isArray(cond)
  && Object.keys(cond).length > 0 && Object.keys(cond).every((key) => key.startsWith("$"));
const OPERATORS = {
  $in: (value, arg) => arg.some((x) => same(value, x)),
  $ne: (value, arg) => !same(value, arg),
  $lte: (value, arg) => value <= arg,
  $gte: (value, arg) => value >= arg,
  $gt: (value, arg) => value > arg,
  $lt: (value, arg) => value < arg,
};
const matches = (row, filter = {}) => Object.entries(filter).every(([key, cond]) => {
  if (key === "$and") return cond.every((part) => matches(row, part));
  if (key === "$or") return cond.some((part) => matches(row, part));
  if (key === "$nor") return !cond.some((part) => matches(row, part));
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
const otherCompanyId = oid();
const person = (employeeName, roleId, reportsToId = null, extra = {}) => ({ _id: oid(), employeeName, employeeCode: employeeName.toUpperCase(), companyId, roleId, reportsToId, ...extra });

const roles = { Employee: oid(), "Team Lead": oid(), "HR Head": oid() };
const manager = person("manju", roles["Team Lead"]);
const asha = person("asha", roles.Employee, manager._id);
const bilal = person("bilal", roles.Employee, manager._id); // asha's colleague, same manager
const chen = person("chen", roles.Employee); // outside manju's team
const hr = person("hema", roles["HR Head"]);
// The base seed's Leave Approver role: lena manages rui, and is the named
// leave approver (leaveApproverId) of dev, who does not report to her.
const leaveApproverRoles = { [SCOPES.TEAM]: oid(), [SCOPES.APPROVER]: oid() };
const lena = person("lena", leaveApproverRoles[SCOPES.TEAM]);
const rui = person("rui", roles.Employee, lena._id);
const dev = person("dev", roles.Employee, null, { leaveApproverId: lena._id });
const zoe = person("zoe", roles.Employee, null, { companyId: otherCompanyId }); // another company
const admin = { _id: oid(), role: "ADMIN" };
stub(Employee, [manager, asha, bilal, chen, hr, lena, rui, dev, zoe]);
stub(Department, []);

const PAYROLL_HR_ONLY = ["/payroll-entry", "/payroll-period", "/payroll-settings", "/salary-withholding"];
const menuUrls = [...new Set([...PAYROLL_HR_ONLY, ...Object.keys(roles).flatMap((role) => buildRoleRows(role).menuRows.map((row) => row.menuUrl))])];
const menus = menuUrls.map((menuUrl) => ({ _id: oid(), menuUrl, menuGroup: oid() }));
const menuIdByUrl = new Map(menus.map((menu) => [menu.menuUrl, menu._id]));
stub(MenuMaster, menus);
stub(UserRoles, [
  ...Object.entries(roles).map(([roleName, roleId]) => ({
    roleId, isActive: true, dataScope: SCOPES.ALL,
    roles: buildRoleRows(roleName).menuRows.map(({ menuUrl, ...permissions }) => ({ menuId: menuIdByUrl.get(menuUrl), ...permissions })),
  })),
  // Leave Approver's /my-leave-balance row as seedLeaveRoles writes it (team),
  // and as a database seeded before ADR-043's fix still holds it (approver).
  ...Object.entries(leaveApproverRoles).map(([dataScope, roleId]) => ({
    roleId, isActive: true, dataScope: SCOPES.ALL,
    roles: [{ menuId: menuIdByUrl.get("/my-leave-balance"), read: true, write: false, edit: false, delete: false, dataScope }],
  })),
]);

const slip = (employee, status) => ({ _id: oid(), employeeId: employee._id, companyId, status, startDate: new Date("2026-09-01"), endDate: new Date("2026-09-30"), netPay: 1000 });
const ashaSubmitted = slip(asha, "submitted");
const ashaDraft = slip(asha, "draft");
const ashaCancelled = slip(asha, "cancelled");
const bilalSubmitted = slip(bilal, "submitted");
const slips = [ashaSubmitted, ashaDraft, ashaCancelled, bilalSubmitted];
stub(SalarySlip, slips);
SalaryWithholding.exists = async () => null;
// Dashboard widgets aggregate: every $match, then one $group of a count or a field sum.
SalarySlip.aggregate = async (pipeline) => {
  const rows = slips.filter((row) => pipeline.every((stage) => !stage.$match || matches(row, stage.$match)));
  const { _id: by, value } = pipeline.find((stage) => stage.$group).$group;
  const groups = new Map();
  for (const row of rows) {
    const label = by ? row[by.slice(1)] : null;
    groups.set(label, (groups.get(label) ?? 0) + (value.$sum === 1 ? 1 : row[value.$sum.slice(1)]));
  }
  return [...groups].map(([label, total]) => ({ label, value: total }));
};

const casual = { _id: oid(), leaveTypeName: "Casual Leave" };
const sick = { _id: oid(), leaveTypeName: "Sick Leave" };
stub(LeaveType, [casual, sick]);
const period = { status: "active", fromDate: new Date("2026-01-01"), toDate: new Date("2099-12-31") };
stub(LeaveAllocation, [
  { ...period, _id: oid(), employeeId: asha._id, leaveTypeId: casual._id },
  { ...period, _id: oid(), employeeId: asha._id, leaveTypeId: casual._id }, // a second one, e.g. compensatory leave
  { ...period, _id: oid(), employeeId: asha._id, leaveTypeId: sick._id },
  { ...period, _id: oid(), employeeId: chen._id, leaveTypeId: casual._id },
]);
const grant = { transactionType: "LeaveAllocation", fromDate: period.fromDate };
const taken = { transactionType: "LeaveApplication", fromDate: new Date("2026-01-20") };
const ledger = [
  { ...grant, employeeId: asha._id, leaveTypeId: casual._id, leaves: 12 },
  { ...taken, employeeId: asha._id, leaveTypeId: casual._id, leaves: -3 },
  { ...taken, employeeId: asha._id, leaveTypeId: casual._id, leaves: -2, isDeleted: true }, // a cancelled leave
  { ...grant, employeeId: asha._id, leaveTypeId: sick._id, leaves: 6 },
  { ...grant, employeeId: chen._id, leaveTypeId: casual._id, leaves: 10 },
].map((row) => ({ ...row, createdAt: new Date("2026-02-01") }));
LeaveLedgerEntry.aggregate = async ([{ $match }]) => {
  const rows = ledger.filter((row) => matches(row, $match));
  return rows.length ? [{ _id: null, balance: rows.reduce((sum, row) => sum + row.leaves, 0) }] : [];
};

// ------------------------------------------------------------------ helpers --
// A fresh signed-in request for `employee`, run through checkPermission first.
const call = async (employee, menuUrl, action, handler, { params = {}, query: q = {} } = {}) => {
  const req = {
    user: { id: String(employee._id), role: employee.role || "USER" },
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
const widget = async (employee, definition) => {
  const req = {
    user: { id: String(employee._id), role: "USER" },
    session: { user: { roleId: String(employee.roleId), departmentId: null } },
    body: { title: "Payslips", source: "salary-slips", ...definition },
  };
  const res = fakeRes();
  await previewDashboardWidget(req, res);
  assert.equal(res.statusCode, 200, JSON.stringify(res.body));
  return res.body.data.rows.map(({ label, value }) => ({ label, value })).sort((a, b) => String(a.label).localeCompare(String(b.label)));
};

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

  // A dashboard widget with no status filter holds the employee to the same
  // rule: their own submitted slips only — HR's still counts every slip.
  const netPay = { chartType: "stat", metric: { type: "sum", field: "netPay" } };
  const byStatus = { chartType: "bar", groupBy: "status" };
  assert.deepEqual(await widget(asha, netPay), [{ label: null, value: 1000 }], "net pay counts no draft or cancelled slip");
  assert.deepEqual(await widget(asha, byStatus), [{ label: "submitted", value: 1 }], "no draft or cancelled bar");
  assert.deepEqual(await widget(hr, netPay), [{ label: null, value: 4000 }]);
  assert.deepEqual(await widget(hr, byStatus), [
    { label: "cancelled", value: 1 }, { label: "draft", value: 1 }, { label: "submitted", value: 2 },
  ]);
}

// ----------------------------------------------------------- leave balance --
{
  // An employee reads their own balance — the ledger sum, one row per leave
  // type they hold a current allocation for.
  const own = await balance(asha);
  assert.equal(own.statusCode, 200);
  assert.equal(own.body.data.employeeId, String(asha._id));
  assert.deepEqual(own.body.data.balances.map((row) => ({ leaveTypeName: row.leaveTypeName, balance: row.balance })), [
    { leaveTypeName: "Casual Leave", balance: 9 },
    { leaveTypeName: "Sick Leave", balance: 6 },
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

  // A leave approver reads their own reporting chain, but being someone's
  // named leave approver opens nothing — whichever scope their row carries.
  assert.equal((await balance(lena, rui)).statusCode, 200, "a direct report's balance");
  for (const roleId of Object.values(leaveApproverRoles)) {
    assert.equal((await balance({ ...lena, roleId }, dev)).statusCode, 403, "a named approvee outside the chain is refused");
  }

  // HR reads anyone's in their own company — not another company's.
  const anyone = await balance(hr, chen);
  assert.equal(anyone.statusCode, 200);
  assert.deepEqual(anyone.body.data.balances.map((row) => row.balance), [10]);
  assert.equal(anyone.body.data.people.length, 8);
  assert.ok(!anyone.body.data.people.some((row) => same(row._id, zoe._id)), "another company's people are not offered");
  assert.equal((await balance(hr, zoe)).statusCode, 403, "another company's employee is refused");
  // ADMIN is not confined to a company.
  const unconfined = await balance(admin, zoe);
  assert.equal(unconfined.statusCode, 200);
  assert.equal(unconfined.body.data.people.length, 9);

  // A malformed id is a 400, not a crash.
  assert.equal((await call(hr, "/my-leave-balance", "read", getMyLeaveBalance, { query: { employeeId: "nope" } })).statusCode, 400);
}

console.log("selfService.test.js passed");
