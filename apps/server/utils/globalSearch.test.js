// No database: every Mongoose read is answered from the in-memory fixtures
// below, so the real routes, permission gate, scope resolvers and controllers
// run unchanged. What is under test is that the global search replays them —
// not a copy of them.
import "../models/softDelete.js";
import "../models/auditPlugin.js";

import assert from "node:assert/strict";
import fs from "node:fs";
import express from "express";
import mongoose from "mongoose";
import { ROLES } from "@demo-panel/shared/roles";
import { GLOBAL_SEARCH_SCREENS } from "../config/globalSearch.js";
import { buildRoleRows } from "../seed/org-tiers.data.js";
import { buildSearchTargets, replayRoute, runGlobalSearch, stripSecrets } from "./globalSearch.js";

const oid = () => new mongoose.Types.ObjectId();

// ── an in-memory stand-in for the few query shapes the search path issues ──

const get = (doc, path) => path.split(".").reduce((value, key) => value?.[key], doc);
const same = (a, b) => (Array.isArray(a) ? a.some((x) => same(x, b)) : String(a ?? null) === String(b ?? null));
const isOperators = (cond) => cond?.constructor === Object && Object.keys(cond).some((key) => key.startsWith("$"));

const fits = (value, cond) => {
  if (cond instanceof RegExp) return cond.test(value ?? "");
  if (!isOperators(cond)) return same(value, cond);
  return Object.entries(cond).every(([op, arg]) => {
    switch (op) {
      case "$in": return arg.some((x) => same(value, x));
      case "$nin": return !arg.some((x) => same(value, x));
      case "$eq": return same(value, arg);
      case "$ne": return !same(value, arg);
      case "$regex": return new RegExp(arg, cond.$options ?? "").test(value ?? "");
      case "$options": return true;
      case "$not": return !fits(value, arg);
      default: throw new Error(`test matcher: unsupported ${op}`);
    }
  });
};

const matches = (doc, filter = {}) => Object.entries(filter).every(([key, cond]) => {
  if (key === "$and") return cond.every((part) => matches(doc, part));
  if (key === "$or") return cond.some((part) => matches(doc, part));
  return fits(get(doc, key), cond);
});

let db = {};
let pipelines = [];
let queries = [];

mongoose.Query.prototype.exec = async function exec() {
  queries.push(this.getFilter());
  const rows = (db[this.model.modelName] ?? []).filter((doc) => matches(doc, this.getFilter()));
  if (this.op === "find") return rows;
  if (this.op === "countDocuments") return rows.length;
  if (this.op === "findOne") return rows[0] ?? null;
  throw new Error(`test stub: unsupported query ${this.op}`);
};

mongoose.Model.aggregate = async function aggregate(pipeline) {
  pipelines.push(pipeline);
  let rows = db[this.modelName] ?? [];
  for (const stage of pipeline) {
    if (stage.$match) rows = rows.filter((doc) => matches(doc, stage.$match));
    if (stage.$facet) {
      const page = stage.$facet.stage2;
      const skip = page.find((s) => s.$skip !== undefined)?.$skip ?? 0;
      const limit = page.find((s) => s.$limit !== undefined)?.$limit ?? rows.length;
      return rows.length ? [{ count: rows.length, data: rows.slice(skip, skip + limit) }] : [];
    }
  }
  return rows;
};

// ── the real routes, mounted the way server.js mounts them ──

const app = express();
const serverSource = fs.readFileSync(new URL("../server.js", import.meta.url), "utf8");
for (const [, file] of serverSource.matchAll(/from "\.\/(routes\/v1\/[^"]+)"/g)) {
  const { default: router } = await import(new URL(`../${file}`, import.meta.url));
  app.use("/api/v1", router);
}
const targets = buildSearchTargets(app._router);

// ── fixtures: two companies, two plain employees, an HR executive, an HR head ──

const menus = [...new Set([...GLOBAL_SEARCH_SCREENS.map(({ screen }) => screen), ...buildRoleRows("HR Head").menuRows.map((row) => row.menuUrl)])]
  .map((menuUrl) => ({ _id: oid(), menuUrl }));
const menuId = (url) => menus.find((menu) => menu.menuUrl === url)?._id;

const roleDoc = (name) => ({
  _id: oid(),
  roleId: oid(),
  isActive: true,
  dataScope: "all", // what seed/org-tiers.js writes
  roles: buildRoleRows(name).menuRows.filter((row) => menuId(row.menuUrl)).map((row) => ({ ...row, menuId: menuId(row.menuUrl) })),
});
const employeeRole = roleDoc("Employee");
const hrExecutiveRole = roleDoc("HR Executive");
const hrHeadRole = roleDoc("HR Head");

const acme = oid();
const globex = oid();
const person = (employeeName, employeeCode, role, companyId = acme) => ({
  _id: oid(), employeeName, employeeCode, companyId, roleId: role.roleId, isActive: true, password: "hash",
});
const asha = person("Asha Wedding", "E-001", employeeRole);
const ravi = person("Ravi Wedding", "E-002", employeeRole);
const hrExec = person("Hema Exec", "E-003", hrExecutiveRole);
const hrHead = person("Harish Head", "E-004", hrHeadRole);

db = {
  MenuMaster: menus,
  UserRoles: [employeeRole, hrExecutiveRole, hrHeadRole],
  Employee: [asha, ravi, hrExec, hrHead],
  LeaveApplication: [
    { _id: oid(), employeeId: asha._id, companyId: acme, description: "Wedding in Jaipur", isActive: true },
    { _id: oid(), employeeId: ravi._id, companyId: acme, description: "Wedding in Pune", isActive: true },
  ],
  EmployeeGrievance: [
    { _id: oid(), raisedByEmployeeId: asha._id, subject: "Wedding leave refused", isActive: true },
    { _id: oid(), raisedByEmployeeId: ravi._id, subject: "Wedding bonus missing", isActive: true },
  ],
  ExpenseClaim: [
    { _id: oid(), employeeId: asha._id, companyId: acme, isActive: true },
    { _id: oid(), employeeId: ravi._id, companyId: acme, isActive: true },
  ],
  SalarySlip: [
    { _id: oid(), employeeId: asha._id, companyId: acme, isActive: true },
    { _id: oid(), employeeId: ravi._id, companyId: acme, isActive: true },
  ],
  SalaryComponent: [
    { _id: oid(), companyId: acme, salaryComponentName: "Wedding Allowance", abbreviation: "WA", isActive: true },
    { _id: oid(), companyId: globex, salaryComponentName: "Wedding Gift", abbreviation: "WG", isActive: true },
  ],
};

const requestAs = (employee) => Object.assign(Object.create(express.request), {
  app,
  headers: {},
  session: { user: employee
    ? { id: String(employee._id), role: ROLES.USER, roleId: String(employee.roleId), departmentId: null }
    : { id: String(oid()), role: ROLES.ADMIN } },
});

const search = async (employee, term) => {
  const { groups, failed } = await runGlobalSearch(requestAs(employee), term, targets);
  assert.equal(failed, 0, "no screen errored");
  return Object.fromEntries(groups.map(({ screen, count, rows }) => [screen, { count, rows }]));
};
const ids = (group) => (group?.rows ?? []).map((row) => String(row._id)).sort();
const idsOf = (...docs) => docs.map((doc) => String(doc._id)).sort();

// 1. The registry: every entry is a real, gated route that applies the term.
assert.equal(new Set(GLOBAL_SEARCH_SCREENS.map(({ screen }) => screen)).size, GLOBAL_SEARCH_SCREENS.length, "no screen listed twice");
for (const [index, target] of targets.entries()) {
  // A fresh term each time: ref lookups are memoised per term.
  const term = `zq-term-${index}`;
  pipelines = [];
  queries = [];
  const { status } = await replayRoute(target.handlers, requestAs(null), { match: term, skip: 0, per_page: 5 });
  assert.equal(status, 200, `${target.route} answers an admin`);
  assert.ok(JSON.stringify([pipelines, queries]).includes(term), `${target.route} must apply the search term (searchFields or searchRefs)`);
}
assert.throws(() => buildSearchTargets(app._router, [{ screen: "/employee", route: "/employee-property-changes/search" }]), /not gated/,
  "a route without the screen's own read gate is refused");

// 2. A plain Employee finds their own records and nobody else's.
const asAsha = await search(asha, "wedding");
const ownGroups = ["/employee", "/employee-grievance", "/expense-claim", "/leave-application", "/salary-slip"];
assert.deepEqual(ids(asAsha["/leave-application"]), idsOf(db.LeaveApplication[0]), "own leave application only");
assert.deepEqual(ids(asAsha["/employee-grievance"]), idsOf(db.EmployeeGrievance[0]), "own grievance only");
assert.deepEqual(ids(asAsha["/employee"]), idsOf(asha), "own employee record only");
assert.deepEqual(await search(asha, "Ravi"), {}, "a colleague's name finds nothing on any screen");

// ...including the records found through the employee's name or code (ADR-044).
const byOwnName = await search(asha, "asha");
assert.deepEqual(ids(byOwnName["/expense-claim"]), idsOf(db.ExpenseClaim[0]), "own expense claim by own name");
assert.deepEqual(ids(byOwnName["/salary-slip"]), idsOf(db.SalarySlip[0]), "own salary slip by own name");
assert.deepEqual(ids(byOwnName["/leave-application"]), idsOf(db.LeaveApplication[0]), "own leave application by own name");
assert.deepEqual(ids((await search(asha, "e-001"))["/salary-slip"]), idsOf(db.SalarySlip[0]), "own salary slip by own employee code");

// 3. A screen the role cannot read never contributes, even when rows match.
assert.equal(asAsha["/salary-component"], undefined, "Employee has no read on Salary Component");
assert.deepEqual(Object.keys(asAsha).sort(), ownGroups);

// 4. HR finds records across the company; company confinement still holds.
const asHr = await search(hrExec, "wedding");
assert.deepEqual(ids(asHr["/leave-application"]), idsOf(...db.LeaveApplication), "HR sees every leave application");
assert.deepEqual(ids(asHr["/employee-grievance"]), idsOf(...db.EmployeeGrievance), "HR sees every grievance");
assert.deepEqual(ids(asHr["/employee"]), idsOf(asha, ravi), "HR sees every matching employee");
const asHrHead = await search(hrHead, "wedding");
assert.deepEqual(ids(asHrHead["/salary-component"]), idsOf(db.SalaryComponent[0]), "only the caller's company's components");
assert.deepEqual(ids(asHrHead["/expense-claim"]), idsOf(...db.ExpenseClaim), "HR finds every expense claim by name");
assert.deepEqual(ids(asHrHead["/salary-slip"]), idsOf(...db.SalarySlip), "HR finds every salary slip by name");
const ravisByHrExec = await search(hrExec, "ravi");
assert.deepEqual(ids(ravisByHrExec["/leave-application"]), idsOf(db.LeaveApplication[1]), "HR Executive finds a colleague's leave by name");
assert.equal(ravisByHrExec["/salary-slip"], undefined, "HR Executive's salary slip grant is own-only");

// 5. Admin sees everything, as on the screens; results are capped per screen.
db.LeaveApplication.push(...Array.from({ length: 6 }, (_, i) => ({ _id: oid(), employeeId: ravi._id, companyId: acme, description: `Wedding ${i}`, isActive: true })));
const asAdmin = await search(null, "wedding");
assert.deepEqual(ids(asAdmin["/salary-component"]), idsOf(...db.SalaryComponent));
assert.equal(asAdmin["/leave-application"].count, 8, "count is the full match count");
assert.equal(asAdmin["/leave-application"].rows.length, 5, "rows are capped per screen");

// 6. No credential or lock state comes back, and the scope of one screen
// never leaks into the next (each replay gets its own req.user).
assert.ok(asAdmin["/employee"].rows.every((row) => !("password" in row)), "no password on employee rows");
assert.deepEqual(stripSecrets({ a: 1, password: "x", nested: [{ resetToken: "t", lockUntil: 1, otp: 2, name: "n" }] }), { a: 1, nested: [{ name: "n" }] });

// 7. The endpoint's own validation: a term is 2-100 characters of text.
const searchRoute = app._router.stack
  .flatMap((layer) => layer.handle?.stack ?? []).find((layer) => layer.route?.path === "/global-search").route;
const handlers = searchRoute.stack.map((layer) => layer.handle);
assert.equal((await replayRoute(handlers, requestAs(asha), { match: "a" })).status, 400, "one character is refused");
assert.equal((await replayRoute(handlers, requestAs(asha), { match: { $ne: "" } })).status, 400, "an object is refused");
assert.equal((await replayRoute(handlers, requestAs(asha), { match: "wedding", per_page: 500 })).status, 400, "no other body keys");
const viaRoute = await replayRoute(handlers, requestAs(asha), { match: "  wedding " });
assert.equal(viaRoute.status, 200);
assert.deepEqual(viaRoute.body.data.map((group) => group.screen).sort(), ownGroups);

console.log("globalSearch: all checks passed");
process.exit(0);
