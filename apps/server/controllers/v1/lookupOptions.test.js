// ADR-051: the row dropdowns on self-service forms. An ordinary Employee filing
// an Expense Claim, Travel Request, Benefit Application, Tax Declaration or
// Performance Feedback picks Expense Types, Salary Components, Sub-Categories,
// KRAs and Criteria by name — so each list's names-only route must answer them,
// with the id and name and nothing else, while the master screens stay closed.
// Drives the real mounted routes (authMiddleware → handler) over in-memory
// stand-ins and the seeded Employee matrix, like approvalIntegrity.test.js.
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { SCOPES } from "@demo-panel/shared/scopes";
import Employee from "../../models/Employee.js";
import EmployeeFeedbackCriteria from "../../models/EmployeeFeedbackCriteria.js";
import EmployeeTaxExemptionSubCategory from "../../models/EmployeeTaxExemptionSubCategory.js";
import ExpenseClaimType from "../../models/ExpenseClaimType.js";
import KRA from "../../models/KRA.js";
import MenuMaster from "../../models/MenuMaster.js";
import SalaryComponent from "../../models/SalaryComponent.js";
import UserRoles from "../../models/UserRoles.js";
import { buildRoleRows } from "../../seed/org-tiers.data.js";
import expenseRoutes from "../../routes/v1/expenses.routes.js";
import payrollRoutes from "../../routes/v1/payroll.routes.js";
import payrollTaxRoutes from "../../routes/v1/payrollTax.routes.js";
import performanceRoutes from "../../routes/v1/performance.routes.js";

// ---------------------------------------------------------------- stand-ins --
const oid = () => new mongoose.Types.ObjectId();
const same = (a, b) => String(a) === String(b);
const matches = (row, filter = {}) => Object.entries(filter).every(([key, cond]) => {
  if (key === "$and") return cond.every((part) => matches(row, part));
  if (cond && typeof cond === "object" && "$in" in cond) return cond.$in.some((x) => same(row[key], x));
  return same(row[key], cond);
});
// find() honours select(), so a test sees exactly the fields a route sends.
const query = (rows, { one = false } = {}) => {
  let fields = null;
  const project = (row) => (fields
    ? Object.fromEntries(Object.entries(row).filter(([key]) => key === "_id" || fields.includes(key)))
    : row);
  const chain = {
    select: (spec) => { fields = spec.split(" "); return chain; },
    sort: () => chain, lean: () => chain, populate: () => chain,
    then: (resolve, reject) => Promise.resolve(one ? (rows[0] ?? null) : rows.map(project)).then(resolve, reject),
  };
  return chain;
};
const stub = (Model, rows) => {
  Model.find = (filter) => query(rows.filter((row) => matches(row, filter)));
  Model.findOne = (filter) => query(rows.filter((row) => matches(row, filter)), { one: true });
  Model.findById = (id) => query(rows.filter((row) => same(row._id, id)), { one: true });
};
const fakeRes = () => ({
  statusCode: 200, body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = JSON.parse(JSON.stringify(body)); return this; },
  clearCookie() {},
});

// ----------------------------------------------------------------- fixtures --
const apidel = oid();
const nuva = oid();
const employeeRole = oid();
const asha = { _id: oid(), employeeName: "asha", roleId: employeeRole, companyId: apidel, departmentId: oid(), status: "Active", isActive: true };
stub(Employee, [asha]);

const menus = buildRoleRows("Employee").menuRows.map(({ menuUrl }) => ({ _id: oid(), menuUrl }))
  .concat(["/expense-claim-type", "/salary-component", "/kra", "/employee-feedback-criteria", "/employee-tax-exemption-sub-category"]
    .map((menuUrl) => ({ _id: oid(), menuUrl })));
const menuIdByUrl = new Map(menus.map((menu) => [menu.menuUrl, menu._id]));
stub(MenuMaster, menus);
stub(UserRoles, [{
  roleId: employeeRole, isActive: true, dataScope: SCOPES.OWN,
  roles: buildRoleRows("Employee").menuRows.map(({ menuUrl, ...permissions }) => ({ menuId: menuIdByUrl.get(menuUrl), ...permissions })),
}]);

stub(ExpenseClaimType, [{ _id: oid(), name: "Travel", description: "Fares and cabs" }]);
stub(SalaryComponent, [
  { _id: oid(), salaryComponentName: "Basic", companyId: apidel, isActive: true, formula: "base * .5", amount: 0 },
  { _id: oid(), salaryComponentName: "Basic", companyId: nuva, isActive: true, formula: "base * .4", amount: 0 },
  { _id: oid(), salaryComponentName: "Old Allowance", companyId: apidel, isActive: false },
]);
stub(KRA, [{ _id: oid(), name: "Delivery", description: "Ships on time" }]);
stub(EmployeeFeedbackCriteria, [{ _id: oid(), criteria: "Teamwork", description: "Helps others" }]);
stub(EmployeeTaxExemptionSubCategory, [{ _id: oid(), name: "PPF", exemptionCategoryId: oid(), maxAmount: 150000 }]);

// ------------------------------------------------------------------ helpers --
const call = async (router, path, caller) => {
  const layer = router.stack.find((entry) => entry.route?.path === path && entry.route.methods.get);
  assert.ok(layer, `GET ${path} is mounted`);
  const req = { session: { user: { id: String(caller._id), role: "USER" } }, params: {}, body: {}, query: {} };
  const res = fakeRes();
  for (const { handle } of layer.route.stack) {
    let advanced = false;
    await handle(req, res, () => { advanced = true; });
    if (!advanced) break;
  }
  return res;
};
const fieldsOf = (res) => [...new Set(res.body.data.flatMap((row) => Object.keys(row)))].sort();

// ------------------------------------------------------------ the dropdowns --
// The 23 Oct F6 case: an Employee filing an Expense Claim can list Expense Types.
{
  const res = await call(expenseRoutes, "/expense-claim-types/options", asha);
  assert.equal(res.statusCode, 200, JSON.stringify(res.body));
  assert.deepEqual(res.body.data.map((row) => row.name), ["Travel"]);
  assert.deepEqual(fieldsOf(res), ["_id", "name"], "names only — no description");
  // The master screen itself is still closed to them.
  assert.equal((await call(expenseRoutes, "/expense-claim-types", asha)).statusCode, 403);
}

// Salary Components: names and company, the caller's own company, active only — never the formula.
{
  const res = await call(payrollRoutes, "/salary-components/options", asha);
  assert.equal(res.statusCode, 200, JSON.stringify(res.body));
  assert.deepEqual(res.body.data.map((row) => [row.salaryComponentName, String(row.companyId)]), [["Basic", String(apidel)]]);
  assert.deepEqual(fieldsOf(res), ["_id", "companyId", "salaryComponentName"]);
  assert.equal((await call(payrollRoutes, "/salary-components", asha)).statusCode, 403);
}

// KRA, Feedback Criteria and Tax Exemption Sub-Category: names only.
for (const [router, path, field] of [
  [performanceRoutes, "/kras/options", "name"],
  [performanceRoutes, "/employee-feedback-criteria/options", "criteria"],
  [payrollTaxRoutes, "/employee-tax-exemption-sub-categories/options", "name"],
]) {
  const res = await call(router, path, asha);
  assert.equal(res.statusCode, 200, `${path}: ${JSON.stringify(res.body)}`);
  assert.equal(res.body.data.length, 1, path);
  assert.deepEqual(fieldsOf(res), ["_id", field].sort(), path);
}

// Each names-only route is mounted ahead of its /:id route, or Express would read "options" as an id.
for (const [router, base] of [
  [expenseRoutes, "/expense-claim-types"], [payrollRoutes, "/salary-components"], [performanceRoutes, "/kras"],
  [performanceRoutes, "/employee-feedback-criteria"], [payrollTaxRoutes, "/employee-tax-exemption-sub-categories"],
]) {
  const paths = router.stack.filter((entry) => entry.route?.methods.get).map((entry) => entry.route.path);
  const byId = paths.findIndex((path) => path.startsWith(`${base}/:`));
  assert.ok(paths.indexOf(`${base}/options`) < byId, `${base}/options before ${base}/:id`);
}

console.log("lookupOptions.test.js: all assertions passed");
