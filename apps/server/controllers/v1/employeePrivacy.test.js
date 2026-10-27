// Field-level privacy on Employee reads: only the employee themself and an
// "all"-scoped caller (HR, ADMIN) see the personal and financial fields —
// a manager (team scope) or an ordinary employee (own scope) gets the work
// directory only, including the manager joined into the Employee list's
// Reports To column. Runs the real checkPermission + handlers over in-memory
// stand-ins and the seeded tier/functional matrices, like selfService.test.js.
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Employee from "../../models/Employee.js";
import MenuMaster from "../../models/MenuMaster.js";
import UserRoles from "../../models/UserRoles.js";
import { checkPermission } from "../../middlewares/checkPermission.js";
import { buildRoleRows } from "../../seed/org-tiers.data.js";
import { stripCredentials } from "../../utils/jsonSecrets.js";
import { SCOPES } from "@demo-panel/shared/scopes";
import { getEmployeeById, listEmployeeByParams } from "./employee.controller.js";

// ---------------------------------------------------------------- stand-ins --
const same = (a, b) => String(a) === String(b);
const matches = (row, filter = {}) => Object.entries(filter).every(([key, cond]) => {
  if (key === "$and") return cond.every((part) => matches(row, part));
  if (cond && typeof cond === "object" && "$in" in cond) return cond.$in.some((x) => same(row[key], x));
  return same(row[key], cond);
});
// `select` honours "-field" exclusions (getEmployeeById's "-password").
const query = (result) => {
  let row = result;
  const chain = {
    select: (spec) => {
      const excluded = String(spec).split(" ").filter((key) => key.startsWith("-")).map((key) => key.slice(1));
      if (row && !Array.isArray(row) && excluded.length) row = Object.fromEntries(Object.entries(row).filter(([key]) => !excluded.includes(key)));
      return chain;
    },
    lean: () => chain,
    then: (resolve, reject) => Promise.resolve(row).then(resolve, reject),
  };
  return chain;
};
const stub = (Model, rows) => {
  Model.find = (filter) => query(rows.filter((row) => matches(row, filter)));
  Model.findOne = (filter) => query(rows.find((row) => matches(row, filter)) ?? null);
  Model.findById = (id) => query(rows.find((row) => same(row._id, id)) ?? null);
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
const roles = { Employee: oid(), "Team Lead": oid(), "HR Head": oid() };
let n = 0;
const person = (employeeName, roleId, reportsToId = null) => {
  n += 1;
  return {
    _id: oid(), employeeCode: `E00${n}`, employeeName, email: `${employeeName}@work.example`,
    roleId, companyId: oid(), departmentId: oid(), designationId: oid(), branchId: oid(), reportsToId,
    status: "Active", isActive: true, dateOfJoining: new Date("2024-04-01"),
    // Every personal / financial field, each value unique to this person so a
    // leak shows up anywhere in the response body.
    password: `hash-${n}`, mobileNumber: `98000000${n}`, address: `${n} Home Street`,
    countryId: oid(), stateId: oid(), cityId: oid(), dateOfBirth: new Date(`1990-01-0${n}`), gender: "Female",
    healthInsuranceProviderId: oid(), healthInsuranceNo: `INS-${n}`, ctc: 100000 * n,
    ifscCode: `IFSC000${n}`, panNumber: `PANAB${n}`, micrCode: `MICR00${n}`, providentFundAccount: `PF-${n}`,
    gradeId: oid(), jobApplicantId: oid(),
  };
};
const manager = person("manju", roles["Team Lead"]);
const asha = person("asha", roles.Employee, manager._id);
const hr = person("hema", roles["HR Head"]);
const admin = { _id: oid(), role: "ADMIN" };
const employees = [manager, asha, hr];
stub(Employee, employees);

// Just enough of the aggregation runListQuery builds for the Employee list:
// the scope $match, the $lookups (only `employees` has rows here), the
// $arrayElemAt name fields, and the paged branch's $project exclusions.
Employee.aggregate = async (pipeline) => {
  let rows = employees.map((row) => ({ ...row }));
  for (const stage of pipeline) {
    if (stage.$match) rows = rows.filter((row) => matches(row, stage.$match));
    if (stage.$lookup) {
      const { from, localField, as } = stage.$lookup;
      rows = rows.map((row) => ({ ...row, [as]: from === "employees" ? employees.filter((e) => same(e._id, row[localField])) : [] }));
    }
    if (stage.$addFields) {
      rows = rows.map((row) => ({
        ...row,
        ...Object.fromEntries(Object.entries(stage.$addFields).map(([key, { $arrayElemAt: [path] }]) => {
          const [joined, field] = path.slice(1).split(".");
          return [key, row[joined]?.[0]?.[field]];
        })),
      }));
    }
    if (stage.$facet) {
      const exclusions = stage.$facet.stage2.find((s) => s.$project)?.$project ?? {};
      return [{ count: rows.length, data: rows.map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => !(key in exclusions)))) }];
    }
  }
  throw new Error("stand-in aggregate: no $facet");
};

const menuUrls = [...new Set(Object.keys(roles).flatMap((role) => buildRoleRows(role).menuRows.map((row) => row.menuUrl)))];
const menus = menuUrls.map((menuUrl) => ({ _id: oid(), menuUrl, menuGroup: oid() }));
const menuIdByUrl = new Map(menus.map((menu) => [menu.menuUrl, menu._id]));
stub(MenuMaster, menus);
stub(UserRoles, Object.entries(roles).map(([roleName, roleId]) => ({
  roleId, isActive: true, dataScope: SCOPES.ALL,
  roles: buildRoleRows(roleName).menuRows.map(({ menuUrl, ...permissions }) => ({ menuId: menuIdByUrl.get(menuUrl), ...permissions })),
})));

// ------------------------------------------------------------------ helpers --
const call = async (caller, handler, { params = {}, body = {} } = {}) => {
  const req = {
    user: { id: String(caller._id), role: caller.role || "USER" },
    session: { user: { roleId: String(caller.roleId), departmentId: null } },
    params, body,
  };
  const res = fakeRes();
  let allowed = false;
  await checkPermission("/employee", "read")(req, res, () => { allowed = true; });
  if (allowed) await handler(req, res);
  return res;
};
const read = (caller, target) => call(caller, getEmployeeById, { params: { employeeId: String(target._id) } });
const list = async (caller) => {
  const res = await call(caller, listEmployeeByParams);
  assert.equal(res.statusCode, 200, JSON.stringify(res.body));
  return res.body.data[0].data;
};

const SENSITIVE = [
  "password", "mobileNumber", "address", "countryId", "stateId", "cityId", "dateOfBirth", "gender",
  "healthInsuranceProviderId", "healthInsuranceNo", "ctc", "ifscCode", "panNumber", "micrCode",
  "providentFundAccount", "gradeId", "jobApplicantId", "roleId",
];
const DIRECTORY = ["_id", "employeeCode", "employeeName", "email", "companyId", "departmentId", "designationId", "branchId", "reportsToId", "status"];
const secretsOf = (employee) => SENSITIVE.filter((key) => key !== "gender" && key !== "dateOfBirth").map((key) => String(employee[key]));
const assertNoSecretsOf = (body, employee, label) => {
  const text = JSON.stringify(body);
  for (const secret of secretsOf(employee)) assert.ok(!text.includes(secret), `${label}: leaked ${secret}`);
};
const assertDirectoryOnly = (row, label) => {
  for (const key of SENSITIVE) assert.ok(!(key in row), `${label}: ${key} must not be sent`);
  for (const key of DIRECTORY) assert.ok(key in row, `${label}: ${key} is kept`);
};
const assertFull = (row, employee, label) => {
  for (const key of SENSITIVE.filter((k) => k !== "password")) assert.equal(JSON.stringify(row[key]), JSON.stringify(employee[key]), `${label}: ${key}`);
};

// --------------------------------------------------------- detail endpoint --
{
  // A team lead opening a team member's record gets the work directory only.
  const teamMember = await read(manager, asha);
  assert.equal(teamMember.statusCode, 200);
  assertDirectoryOnly(teamMember.body.data, "team lead → team member");
  assertNoSecretsOf(teamMember.body, asha, "team lead → team member");

  // The employee themself, HR and ADMIN still get the full record.
  assertFull((await read(asha, asha)).body.data, asha, "own record");
  assertFull((await read(manager, manager)).body.data, manager, "team lead's own record");
  assertFull((await read(hr, asha)).body.data, asha, "HR");
  assertFull((await read(admin, asha)).body.data, asha, "ADMIN");

  // An ordinary employee cannot open their manager's record at all.
  assert.equal((await read(asha, manager)).statusCode, 404);
}

// ------------------------------------------------------------ list / search --
{
  // The ordinary employee's Employee screen: only their own row, in full —
  // and their manager reaches the browser as a name, never as a record.
  const own = await list(asha);
  assert.deepEqual(own.map((row) => row.employeeName), ["asha"]);
  assertFull(own[0], asha, "own row");
  assert.equal(own[0].reportsToName, "manju", "the Reports To name still shows");
  assertNoSecretsOf(own, manager, "employee → manager via Reports To");

  // A team lead's list: their own row in full, the team member's trimmed.
  const team = await list(manager);
  const member = team.find((row) => same(row._id, asha._id));
  assertDirectoryOnly(member, "team lead list → team member");
  assert.equal(member.reportsToName, "manju");
  assertNoSecretsOf(team.filter((row) => !same(row._id, manager._id)), asha, "team lead list → team member");
  assertFull(team.find((row) => same(row._id, manager._id)), manager, "team lead's own row");

  // HR sees every row in full, but no row carries the manager's joined record.
  const all = await list(hr);
  assert.equal(all.length, 3);
  assertFull(all.find((row) => same(row._id, asha._id)), asha, "HR list");
  for (const row of all) {
    assert.ok(!("reportsTo" in row), "the joined manager record is never sent");
    assert.ok(!("password" in row), "no password hash in the list");
  }
}

console.log("employeePrivacy.test.js passed");
