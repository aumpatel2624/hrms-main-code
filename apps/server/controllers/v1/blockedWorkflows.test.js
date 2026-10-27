// Everyday tasks the pre-production simulation could not finish on screen:
//   1. a Tax Exemption Declaration, by HR or by the employee, with the
//      employee's own company's payroll periods in the picker,
//   2. a team lead's performance feedback — the Appraisal picker lists their
//      reports' appraisals, and nothing more,
//   3. a shift change for someone whose current assignment is open-ended,
//   4. the USA shift as an Employee shift preference.
// Drives the real mounted routes (authMiddleware → checkPermission → handler)
// over in-memory stand-ins and the seeded Employee matrix, like
// approvalIntegrity.test.js.
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { SCOPES } from "@demo-panel/shared/scopes";
import Appraisal from "../../models/Appraisal.js";
import AppraisalCycle from "../../models/AppraisalCycle.js";
import Company from "../../models/Company.js";
import Department from "../../models/Department.js";
import Employee from "../../models/Employee.js";
import EmployeeTaxExemptionCategory from "../../models/EmployeeTaxExemptionCategory.js";
import EmployeeTaxExemptionDeclaration from "../../models/EmployeeTaxExemptionDeclaration.js";
import EmployeeTaxExemptionSubCategory from "../../models/EmployeeTaxExemptionSubCategory.js";
import MenuMaster from "../../models/MenuMaster.js";
import PayrollPeriod from "../../models/PayrollPeriod.js";
import ShiftAssignment from "../../models/ShiftAssignment.js";
import ShiftRequest from "../../models/ShiftRequest.js";
import ShiftType from "../../models/ShiftType.js";
import UserRoles from "../../models/UserRoles.js";
import { buildRoleRows } from "../../seed/org-tiers.data.js";
import payrollRunRoutes from "../../routes/v1/payrollRun.routes.js";
import payrollTaxRoutes from "../../routes/v1/payrollTax.routes.js";
import performanceGoalsRoutes from "../../routes/v1/performanceGoals.routes.js";
import requestRoutes from "../../routes/v1/shiftAttendanceTransactions.routes.js";
import { taxDeclarationPayload } from "../../../admin/src/entities/tax-declaration-payload.js";

// ---------------------------------------------------------------- stand-ins --
const same = (a, b) => String(a) === String(b);
const OPERATORS = {
  $in: (value, arg) => arg.some((x) => same(value, x)),
  $nin: (value, arg) => !arg.some((x) => same(value, x)),
  $ne: (value, arg) => !same(value ?? null, arg ?? null),
  $lte: (value, arg) => value != null && value <= arg,
  $gte: (value, arg) => value != null && value >= arg,
};
const isOperators = (cond) => cond && typeof cond === "object" && !Array.isArray(cond) && !(cond instanceof mongoose.Types.ObjectId)
  && !(cond instanceof Date) && Object.keys(cond).length > 0 && Object.keys(cond).every((key) => key.startsWith("$"));
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
  validate: async () => {},
  toObject: () => Object.fromEntries(Object.entries(row).filter(([, value]) => typeof value !== "function")),
});
const stub = (Model, rows) => {
  rows.forEach(asDoc);
  Model.find = (filter) => query(rows.filter((row) => matches(row, filter)));
  Model.findOne = (filter) => query(rows.find((row) => matches(row, filter)) ?? null);
  Model.findById = (id) => query(rows.find((row) => same(row._id, id)) ?? null);
  Model.exists = async (filter) => (rows.find((row) => matches(row, filter)) ? { _id: oid() } : null);
  // A new document's save lands in the same rows, as a plain row.
  Model.prototype.save = async function save() { rows.push(asDoc(this.toObject())); return this; };
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
const apidel = oid();
const nuva = oid();
const roles = { Employee: oid(), "HR Manager": oid() };
const person = (employeeName, roleName, companyId, extra = {}) => ({
  _id: oid(), employeeName, roleId: roles[roleName], companyId, departmentId: null, reportsToId: null,
  status: "Active", isActive: true, ...extra,
});
// The simulation's team leads held the plain Employee role.
const ravi = person("ravi", "Employee", apidel);
const hema = person("hema", "HR Manager", apidel);
const ekta = person("ekta", "Employee", apidel, { reportsToId: ravi._id, shiftRequestApproverId: ravi._id });
const pooja = person("pooja", "Employee", apidel, { shiftRequestApproverId: hema._id });
const naman = person("naman", "Employee", nuva, { shiftRequestApproverId: hema._id });
stub(Employee, [ravi, hema, ekta, pooja, naman]);
stub(Department, []);
Company.exists = async () => ({ _id: apidel });

// HR Manager carries what `npm run seed` grants it on these screens; Employee
// is the seeded tier matrix.
const hrManagerRows = ["/employee-tax-exemption-declaration", "/employee-performance-feedback", "/shift-request", "/payroll-period"]
  .map((menuUrl) => ({ menuUrl, read: true, write: true, edit: true, delete: true, print: true, mail: true }));
const menuUrls = [...new Set([...buildRoleRows("Employee").menuRows, ...hrManagerRows].map((row) => row.menuUrl))];
const menus = menuUrls.map((menuUrl) => ({ _id: oid(), menuUrl }));
const menuIdByUrl = new Map(menus.map((menu) => [menu.menuUrl, menu._id]));
const matrix = (rows) => rows.map(({ menuUrl, ...permissions }) => ({ menuId: menuIdByUrl.get(menuUrl), ...permissions }));
stub(MenuMaster, menus);
stub(UserRoles, [
  { roleId: roles.Employee, isActive: true, dataScope: SCOPES.ALL, roles: matrix(buildRoleRows("Employee").menuRows) },
  { roleId: roles["HR Manager"], isActive: true, dataScope: SCOPES.ALL, roles: matrix(hrManagerRows) },
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
const day = (iso) => new Date(`${iso}T00:00:00.000Z`);
const isoDay = (value) => (value ? new Date(value).toISOString().slice(0, 10) : null);

// ------------------------------------------- 1. Tax Exemption Declaration --
{
  const apidelPeriod = { _id: oid(), companyId: apidel, startDate: day("2026-04-01"), endDate: day("2027-03-31"), isActive: true };
  const nuvaPeriod = { _id: oid(), companyId: nuva, startDate: day("2026-04-01"), endDate: day("2027-03-31"), isActive: true };
  stub(PayrollPeriod, [apidelPeriod, nuvaPeriod]);

  // The Employee's Payroll Period picker: their own company's periods only.
  const periods = await call(payrollRunRoutes, "get", "/payroll-periods", ekta);
  expectStatus(periods, 200, "an employee loads the Payroll Period picker");
  assert.deepEqual(periods.body.data.map((row) => String(row._id)), [String(apidelPeriod._id)], "only their own company's periods");

  const category = { _id: oid(), maxAmount: 150000, isActive: true };
  const subCategory = { _id: oid(), exemptionCategoryId: category._id, maxAmount: 150000 };
  stub(EmployeeTaxExemptionCategory, [category]);
  stub(EmployeeTaxExemptionSubCategory, [subCategory]);
  const declarations = stub(EmployeeTaxExemptionDeclaration, []);

  // What the form holds on save: the entered fields and the read-only ones.
  const formValues = (employeeId, payrollPeriodId) => ({
    employeeId: String(employeeId), payrollPeriodId: String(payrollPeriodId), currency: "INR", monthlyHouseRent: "", rentedInMetroCity: false,
    annualHraExemption: "", monthlyHraExemption: "", hraAmount: "", totalDeclaredAmount: "", totalExemptionAmount: "", status: "",
    declarations: [{ exemptionSubCategoryId: String(subCategory._id), amount: 50000 }],
  });
  const declare = (caller, body) => call(payrollTaxRoutes, "post", "/employee-tax-exemption-declarations", caller, { body });

  expectStatus(await declare(hema, formValues(ekta._id, apidelPeriod._id)), 400, "the form's read-only fields are refused");
  assert.equal(declarations.length, 0);

  expectStatus(await declare(hema, taxDeclarationPayload(formValues(ekta._id, apidelPeriod._id))), 201, "HR declares for an employee");
  assert.ok(same(declarations[0].employeeId, ekta._id) && declarations[0].totalDeclaredAmount === 50000);

  expectStatus(await declare(pooja, taxDeclarationPayload(formValues(ekta._id, apidelPeriod._id))), 201, "an employee declares");
  assert.ok(same(declarations[1].employeeId, pooja._id), "for themselves, whatever the form named");

  expectStatus(await declare(naman, taxDeclarationPayload(formValues(naman._id, apidelPeriod._id))), 400, "another company's payroll period");
  assert.equal(declarations.length, 2, "nothing saved on the wrong period");
}

// --------------------------------------------- 2. feedback Appraisal picker --
{
  const cycle = { _id: oid(), cycleName: "FY26 H2" };
  stub(AppraisalCycle, [cycle]);
  const appraisal = (employee) => ({
    _id: oid(), employeeId: employee._id, companyId: employee.companyId, appraisalCycleId: cycle._id, status: "draft", finalScore: 4.2,
  });
  const forEkta = appraisal(ekta);
  const forRavi = appraisal(ravi);
  const forPooja = appraisal(pooja);
  const forNaman = appraisal(naman);
  stub(Appraisal, [forEkta, forRavi, forPooja, forNaman]);
  const options = (caller) => call(performanceGoalsRoutes, "get", "/employee-performance-feedbacks/appraisal-options", caller);

  const lead = await options(ravi);
  expectStatus(lead, 200, "a team lead loads the Appraisal picker");
  assert.deepEqual(lead.body.data.map((row) => String(row._id)), [String(forEkta._id)], "their report's appraisal, not their own or a peer's");
  assert.deepEqual(Object.keys(lead.body.data[0]).sort(), ["_id", "appraisalCycleIdLabel", "employeeId", "employeeIdLabel", "status"], "the label only, no scores");
  assert.equal(lead.body.data[0].employeeIdLabel, "ekta");
  assert.equal(lead.body.data[0].appraisalCycleIdLabel, "FY26 H2");

  const hr = await options(hema);
  expectStatus(hr, 200, "HR loads the Appraisal picker");
  assert.deepEqual(hr.body.data.map((row) => String(row._id)).sort(), [forEkta, forRavi, forPooja].map((row) => String(row._id)).sort(), "their company's, not Nuva's");

  const report = await options(ekta);
  expectStatus(report, 200, "someone with no reports");
  assert.deepEqual(report.body.data, [], "has nothing to pick");
}

// ----------------------------------------------------------- 3. shift change --
{
  const india = { _id: oid(), companyId: apidel, shiftTypeName: "India", isActive: true };
  const uk = { _id: oid(), companyId: apidel, shiftTypeName: "UK", isActive: true };
  stub(ShiftType, [india, uk]);
  const assignments = stub(ShiftAssignment, [
    { _id: oid(), employeeId: ekta._id, shiftTypeId: india._id, shiftLocationId: null, companyId: apidel, startDate: day("2026-08-31"), endDate: null, status: "active" },
    { _id: oid(), employeeId: pooja._id, shiftTypeId: india._id, shiftLocationId: null, companyId: apidel, startDate: day("2026-08-31"), endDate: null, status: "active" },
    { _id: oid(), employeeId: naman._id, shiftTypeId: india._id, shiftLocationId: null, companyId: nuva, startDate: day("2026-11-01"), endDate: day("2026-11-30"), status: "active" },
  ]);
  const requests = stub(ShiftRequest, []);
  ShiftRequest.create = async (data) => { const doc = asDoc({ _id: oid(), status: "open", ...data }); requests.push(doc); return doc; };
  const request = (caller, body) => call(requestRoutes, "post", "/shift-requests", caller, { body });
  const approve = (caller, doc) => call(requestRoutes, "post", "/shift-requests/:shiftRequestId/approve", caller, { params: { shiftRequestId: String(doc._id) } });
  const shiftsOf = (employee) => assignments.filter((row) => same(row.employeeId, employee._id) && row.status === "active")
    .map((row) => [String(row.shiftTypeId) === String(uk._id) ? "UK" : "India", isoDay(row.startDate), isoDay(row.endDate)])
    .sort((a, b) => a[1].localeCompare(b[1]));

  // A permanent move to UK from 2 Nov, approved by the named approver (a team lead on the Employee role).
  expectStatus(await request(ekta, { employeeId: String(ekta._id), shiftTypeId: String(uk._id), fromDate: "2026-11-02" }), 201, "a shift change while on an open-ended shift");
  expectStatus(await approve(ravi, requests[0]), 200, "the named Shift Approver approves it");
  assert.equal(requests[0].status, "approved");
  assert.deepEqual(shiftsOf(ekta), [["India", "2026-08-31", "2026-11-01"], ["UK", "2026-11-02", null]], "India ends the day before; UK starts");

  // A dated change (10–20 Nov), approved by HR: the old shift resumes after it.
  expectStatus(await request(pooja, { employeeId: String(pooja._id), shiftTypeId: String(uk._id), fromDate: "2026-11-10", toDate: "2026-11-20" }), 201, "a temporary shift change");
  expectStatus(await approve(hema, requests[1]), 200, "HR approves it");
  assert.deepEqual(shiftsOf(pooja), [["India", "2026-08-31", "2026-11-09"], ["UK", "2026-11-10", "2026-11-20"], ["India", "2026-11-21", null]], "India resumes the day after");

  // A real overlap with a dated assignment is still refused.
  expectStatus(await request(naman, { employeeId: String(naman._id), shiftTypeId: String(uk._id), fromDate: "2026-11-15" }), 400, "overlap with a dated assignment");
  assert.equal(requests.length, 2);
}

// ---------------------------------------------------------- 4. USA shift --
{
  const errors = new Employee({ shiftPreference: "USA" }).validateSync()?.errors ?? {};
  assert.equal(errors.shiftPreference, undefined, "USA is a valid shift preference");
  assert.ok(new Employee({ shiftPreference: "Mars" }).validateSync()?.errors?.shiftPreference, "an unknown one is still refused");
}

console.log("blockedWorkflows: tax declaration, payroll period picker, feedback appraisal picker, shift change and USA shift checks passed");
