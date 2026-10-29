// Payouts the 29 Oct functional test checked by hand (ADR-068):
//   P4. gratuity was based on the last slip's prorated Basic, and was paid
//       twice — once by payroll's Additional Salary, once by the full and final,
//   P7. a Payroll Correction submitted with ₹0 arrears and no warning when no
//       component was an arrear component, and valued a reversed day off the
//       slip's prorated amount.
// (P2 proration is payrollPaymentDays.test.js, Case 5b; P11 is
// jobs/attendanceScheduler.test.js.) Drives the real mounted routes as an
// Admin over in-memory stand-ins, like payrollIntegrity.test.js.
import assert from "node:assert/strict";
import mongoose from "mongoose";
import AdminUser from "../../models/AdminUser.js";
import AdditionalSalary from "../../models/AdditionalSalary.js";
import Attendance from "../../models/Attendance.js";
import Company from "../../models/Company.js";
import Employee from "../../models/Employee.js";
import FullAndFinalStatement from "../../models/FullAndFinalStatement.js";
import Gratuity from "../../models/Gratuity.js";
import GratuityRule from "../../models/GratuityRule.js";
import PayrollCorrection from "../../models/PayrollCorrection.js";
import PayrollSettings from "../../models/PayrollSettings.js";
import SalaryComponent from "../../models/SalaryComponent.js";
import SalarySlip from "../../models/SalarySlip.js";
import SalaryStructure from "../../models/SalaryStructure.js";
import SalaryStructureAssignment from "../../models/SalaryStructureAssignment.js";
import gratuityRoutes from "../../routes/v1/gratuity.routes.js";
import payrollBenefitsRoutes from "../../routes/v1/payrollBenefits.routes.js";
import separationRoutes from "../../routes/v1/separation.routes.js";

// ---------------------------------------------------------------- stand-ins --
const same = (a, b) => String(a) === String(b);
const OPERATORS = {
  $in: (value, arg) => arg.some((x) => same(value, x)),
  $ne: (value, arg) => (arg === null ? value != null : !same(value, arg)),
  $lte: (value, arg) => value <= arg,
  $gte: (value, arg) => value >= arg,
};
const isOperators = (cond) => cond && typeof cond === "object" && !Array.isArray(cond) && !(cond instanceof mongoose.Types.ObjectId)
  && !(cond instanceof Date) && Object.keys(cond).length > 0 && Object.keys(cond).every((key) => key.startsWith("$"));
const matches = (row, filter = {}) => Object.entries(filter).every(([key, cond]) => {
  if (key === "$and") return cond.every((part) => matches(row, part));
  if (key === "$or") return cond.some((part) => matches(row, part));
  const value = row[key];
  if (!isOperators(cond)) return same(value ?? null, cond ?? null);
  return Object.entries(cond).every(([op, arg]) => {
    if (!OPERATORS[op]) throw new Error(`stand-in query: unsupported ${op}`);
    return OPERATORS[op](value, arg);
  });
});
const query = (result) => {
  const chain = {
    select: () => chain, populate: () => chain, lean: () => chain, sort: () => chain,
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return chain;
};
const asDoc = (row) => Object.assign(row, { save: async () => row });
const stub = (Model, rows) => {
  rows.forEach(asDoc);
  Model.find = (filter) => query(rows.filter((row) => matches(row, filter)));
  Model.findOne = (filter) => query(rows.find((row) => matches(row, filter)) ?? null);
  Model.findById = (id) => query(rows.find((row) => same(row._id, id)) ?? null);
  return rows;
};
const fakeRes = () => ({
  statusCode: 200, body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = JSON.parse(JSON.stringify(body)); return this; },
  clearCookie() {},
});
const routeOf = (router, method, path) => {
  const layer = router.stack.find((entry) => entry.route?.path === path && entry.route.methods[method]);
  assert.ok(layer, `${method.toUpperCase()} ${path} is mounted`);
  return layer.route.stack.map((entry) => entry.handle);
};
const call = async (router, method, path, { params = {}, body = {} } = {}) => {
  const req = { session: { user: { id: String(admin._id), role: "ADMIN" } }, method: method.toUpperCase(), path, params, body, query: {} };
  const res = fakeRes();
  for (const handle of routeOf(router, method, path)) {
    let advanced = false;
    await handle(req, res, () => { advanced = true; });
    if (!advanced) break;
  }
  return res;
};
const expectStatus = (res, status, label) => assert.equal(res.statusCode, status, `${label}: ${JSON.stringify(res.body)}`);

// ----------------------------------------------------------------- fixtures --
const oid = () => new mongoose.Types.ObjectId();
const companyId = oid();
const admin = { _id: oid(), isActive: true };
stub(AdminUser, [admin]);
stub(Company, []);
stub(Attendance, []);
stub(PayrollSettings, [{ _id: oid(), key: "default", payrollBasedOn: "Attendance" }]);
const additionalSalaries = [];
AdditionalSalary.create = async (data) => asDoc(additionalSalaries[additionalSalaries.push({ _id: oid(), ...data }) - 1]);

const basic = { _id: oid(), salaryComponentName: "Basic", abbreviation: "B", type: "Earning", arrearComponent: false };
const hra = { _id: oid(), salaryComponentName: "HRA", abbreviation: "H", type: "Earning", arrearComponent: false };
const components = stub(SalaryComponent, [basic, hra]);
const row = (component, extra) => ({
  salaryComponentId: component._id, abbreviation: component.abbreviation, dependsOnPaymentDays: true,
  amountBasedOnFormula: false, condition: "", formula: "", ...extra,
});

// --------------------------------------------- P4. gratuity, paid once, on full Basic --
{
  // Nikhil Kapadia NUV013: 4 Dec 2016 to 31 Oct 2026, Basic ₹22,500 a month.
  const nikhil = { _id: oid(), employeeName: "Nikhil Kapadia", companyId, status: "Left",
    dateOfJoining: new Date("2016-12-04"), relievingDate: new Date("2026-10-31") };
  stub(Employee, [nikhil]);
  const structure = { _id: oid(), companyId, earnings: [row(basic, { amount: 22500 })], deductions: [], employerContributions: [] };
  stub(SalaryStructure, [structure]);
  const assignment = { _id: oid(), employeeId: nikhil._id, salaryStructureId: structure._id, base: 22500 };
  stub(SalaryStructureAssignment, [assignment]);
  // His last submitted slip pays a prorated Basic of ₹18,000 (20 of 25 days).
  const slip = (month, status) => ({
    _id: oid(), employeeId: nikhil._id, salaryStructureAssignmentId: assignment._id, status,
    startDate: new Date(`2026-${month}-01`), endDate: new Date(`2026-${month}-${month === "09" ? 30 : 31}`),
    earnings: [{ salaryComponentId: basic._id, abbreviation: "B", defaultAmount: 18000 }],
  });
  const september = slip("09", "submitted");
  const october = slip("10", "submitted");
  stub(SalarySlip, [october, september]);

  const indianRule = { _id: oid(), name: "Indian Standard Gratuity Rule", calculateGratuityAmountBasedOn: "Current Slab",
    workExperienceCalculationFunction: "Round off Work Experience", totalWorkingDaysPerYear: 365, minimumYearForGratuity: 5,
    applicableEarningsComponent: [], gratuityRuleSlabs: [{ fromYear: 0, toYear: null, fractionOfApplicableEarnings: 15 / 26 }] };
  stub(GratuityRule, [indianRule]);
  const gratuity = { _id: oid(), employeeId: nikhil._id, companyId, gratuityRuleId: indianRule._id,
    payrollDate: new Date("2026-10-31"), salaryComponentId: basic._id, status: "draft" };
  stub(Gratuity, [gratuity]);
  const submit = () => call(gratuityRoutes, "post", "/gratuities/:id/submit", { params: { id: String(gratuity._id) } });

  // A seeded rule with no component: refused, naming what HR must set.
  let res = await submit();
  expectStatus(res, 400, "a rule with no applicable component");
  assert.match(res.body.message, /Indian Standard Gratuity Rule" has no applicable earning component/);
  indianRule.applicableEarningsComponent = [{ salaryComponentId: basic._id }];

  // October's slip already exists, so payroll would never pay it: refused.
  res = await submit();
  expectStatus(res, 400, "a slip already covers the payroll date");
  assert.match(res.body.message, /Nikhil Kapadia already has a salary slip for 2026-10-01 – 2026-10-31/);
  assert.equal(additionalSalaries.length, 0, "no Additional Salary that payroll would never pay");

  // HR cancels October's slip, submits the gratuity, then re-runs October.
  october.status = "cancelled";
  res = await submit();
  expectStatus(res, 200, "gratuity submits");
  // 3,618 days ÷ 365 = 9.9 → 10 years; 15/26 × full Basic 22,500 × 10.
  assert.equal(gratuity.currentWorkExperience, 10);
  assert.equal(gratuity.amount, 129807.69, "based on the full monthly Basic, not the slip's prorated ₹18,000");
  assert.equal(additionalSalaries.length, 1);
  assert.equal(additionalSalaries[0].amount, 129807.69);
  assert.equal(additionalSalaries[0].refDoctype, "Gratuity");

  // The full and final shows it as paid through payroll, outside its total.
  let saved = null;
  FullAndFinalStatement.prototype.save = async function save() { saved = this; return this; };
  res = await call(separationRoutes, "post", "/full-and-final-statements", {
    body: { employeeId: String(nikhil._id), transactionDate: "2026-11-05",
      payables: [{ component: "Leave encashment", amount: 15000, status: "Unsettled" }] },
  });
  expectStatus(res, 201, "full and final created");
  const gratuityLine = saved.payables.find((line) => line.component === "Gratuity");
  assert.equal(gratuityLine.amount, 129807.69);
  assert.equal(gratuityLine.paidThroughPayroll, true);
  assert.equal(gratuityLine.status, "Settled");
  assert.match(gratuityLine.description, /Paid through payroll/);
  assert.equal(saved.totalPayableAmount, 15000, "the gratuity is not paid a second time by the statement");
}
console.log("payrollPayouts: gratuity is based on the full Basic and paid once, through payroll (P4)");

// --------------------------------------- P7. a Payroll Correction pays something --
{
  // Harsh Pawar: Basic ₹10,000 a month, paid 18 of 25 days in October after
  // 1 LWP day; the slip carries the prorated ₹7,200.
  const harsh = { _id: oid(), employeeName: "Harsh Pawar", companyId, status: "Active", dateOfJoining: new Date("2024-01-01") };
  stub(Employee, [harsh]);
  const structure = { _id: oid(), companyId, earnings: [row(basic, { amount: 10000 })], deductions: [], employerContributions: [] };
  stub(SalaryStructure, [structure]);
  const assignment = { _id: oid(), employeeId: harsh._id, salaryStructureId: structure._id, base: 10000 };
  stub(SalaryStructureAssignment, [assignment]);
  const slip = { _id: oid(), employeeId: harsh._id, companyId, salaryStructureAssignmentId: assignment._id, status: "submitted",
    startDate: new Date("2026-10-01"), endDate: new Date("2026-10-31"), totalWorkingDays: 25, paymentDays: 18, lwpDays: 1,
    earnings: [{ salaryComponentId: basic._id, abbreviation: "B", defaultAmount: 7200, amount: 7200 }], deductions: [] };
  stub(SalarySlip, [slip]);
  const correction = { _id: oid(), salarySlipId: slip._id, employeeId: harsh._id, companyId, daysToReverse: 1,
    earningArrears: [], deductionArrears: [], accrualArrears: [], status: "draft" };
  stub(PayrollCorrection, [correction]);
  additionalSalaries.length = 0;
  const submit = () => call(payrollBenefitsRoutes, "post", "/payroll-corrections/:id/submit", { params: { id: String(correction._id) } });

  // No component is an arrear component: refused, saying what to tick.
  let res = await submit();
  expectStatus(res, 400, "no arrear component");
  assert.match(res.body.message, /tick "Arrear component"/);
  assert.equal(correction.status, "draft");
  assert.equal(additionalSalaries.length, 0);

  // HR marks Basic as the arrear component; the draft's saved ₹0 is recomputed.
  components.find((c) => c === basic).arrearComponent = true;
  res = await submit();
  expectStatus(res, 200, "correction submits");
  assert.equal(correction.status, "submitted");
  assert.equal(additionalSalaries.length, 1);
  assert.equal(additionalSalaries[0].amount, 400, "₹10,000 ÷ 25 working days, not the prorated ₹7,200 ÷ 25 = ₹288");
}
console.log("payrollPayouts: a payroll correction repays a day of the full Basic, or says what to set (P7)");

console.log("payrollPayouts: all cases passed");
