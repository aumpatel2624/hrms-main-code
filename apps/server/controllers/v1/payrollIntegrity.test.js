// Payroll faults found by the pre-production simulation:
//   1. a blank Base saved as null, so every formula on `base` paid 0; it now
//      takes the employee's grade default base, or is refused,
//   2. editing a Salary Structure Assignment was always refused with
//      "Unexpected fields in request body",
//   3. a cancelled run's slips still counted as existing, so the month could
//      not be run again, and they could not be deleted while linked,
//   4. an entry whose slips all failed to submit was still marked "submitted".
// And from the 28 Oct re-test (P2): a saved Payroll Correction would not open.
// And from the 29 Oct verification run (N1): editing a Salary Component (so
// Arrear component could never be ticked), Salary Structure, Payroll Period,
// Gratuity Rule, Income Tax Slab or Tax Exemption Sub Category was refused
// with "Unexpected fields in request body", like 2. was. A cancelled entry
// still listed each employee's outcome as "submitted" (9.).
// (Formula rows ignoring payment days is salarySlipCalc.test.js, Scenario C2.)
// Drives the real mounted routes as an Admin over in-memory stand-ins, like
// approvalIntegrity.test.js.
import assert from "node:assert/strict";
import mongoose from "mongoose";
import AdminUser from "../../models/AdminUser.js";
import Employee from "../../models/Employee.js";
import EmployeeGrade from "../../models/EmployeeGrade.js";
import PayrollCorrection from "../../models/PayrollCorrection.js";
import PayrollEntry from "../../models/PayrollEntry.js";
import SalarySlip from "../../models/SalarySlip.js";
import SalaryComponent from "../../models/SalaryComponent.js";
import SalaryStructure from "../../models/SalaryStructure.js";
import SalaryStructureAssignment from "../../models/SalaryStructureAssignment.js";
import SalaryWithholding from "../../models/SalaryWithholding.js";
import payrollBenefitsRoutes from "../../routes/v1/payrollBenefits.routes.js";
import payrollRoutes from "../../routes/v1/payroll.routes.js";
import payrollRunRoutes from "../../routes/v1/payrollRun.routes.js";
import { resolveEligiblePayrollEmployees } from "./payrollOrchestration.controller.js";
import { SALARYCOMPONENT_FIELDS, SALARYSTRUCTURE_FIELDS } from "./payroll.controller.js";
import { PAYROLLPERIOD_FIELDS } from "./payrollRun.controller.js";
import { GRATUITY_RULE_FIELDS } from "./gratuity.controller.js";
import { EMPLOYEE_TAX_EXEMPTION_SUB_CATEGORY_FIELDS, INCOMETAXSLAB_FIELDS } from "./payrollTax.controller.js";
import { allowOnlyFields } from "../../middlewares/inputValidator.js";
import { formPayload } from "../../../admin/src/components/crud/form-payload.js";
import { salaryStructureAssignmentPayload } from "../../../admin/src/entities/salary-structure-assignment-payload.js";
import {
  gratuityRulePayload, incomeTaxSlabPayload, payrollPeriodPayload, salaryComponentPayload, salaryStructurePayload, taxExemptionSubCategoryPayload,
} from "../../../admin/src/entities/setup-payloads.js";

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
// "employeeDetails.salarySlipId": any element of the array matches.
const valuesAt = (row, key) => key.split(".").reduce((values, part) => values.flatMap((value) => {
  const next = value?.[part];
  return Array.isArray(next) ? next : [next];
}), [row]);
const matches = (row, filter = {}) => Object.entries(filter).every(([key, cond]) => {
  if (key === "$and") return cond.every((part) => matches(row, part));
  if (key === "$or") return cond.some((part) => matches(row, part));
  return valuesAt(row, key).some((value) => {
    if (!isOperators(cond)) return same(value ?? null, cond ?? null);
    return Object.entries(cond).every(([op, arg]) => {
      if (!OPERATORS[op]) throw new Error(`stand-in query: unsupported ${op}`);
      return OPERATORS[op](value, arg);
    });
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
  toObject: () => Object.fromEntries(Object.entries(row).filter(([, value]) => typeof value !== "function")),
});
const stub = (Model, rows) => {
  rows.forEach(asDoc);
  Model.find = (filter) => query(rows.filter((row) => matches(row, filter)));
  Model.findOne = (filter) => query(rows.find((row) => matches(row, filter)) ?? null);
  Model.findById = (id) => query(rows.find((row) => same(row._id, id)) ?? null);
  Model.exists = async (filter) => (rows.find((row) => matches(row, filter)) ? { _id: row._id } : null);
  Model.countDocuments = async (filter) => rows.filter((row) => matches(row, filter)).length;
  Model.findByIdAndUpdate = async (id, update) => Object.assign(rows.find((row) => same(row._id, id)), update);
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
// Every model referencing SalarySlip is counted by the delete guard; none but
// PayrollEntry holds a row here.
for (const name of mongoose.modelNames()) mongoose.model(name).countDocuments = async () => 0;
const companyId = oid();
const admin = { _id: oid(), isActive: true };
stub(AdminUser, [admin]);
const grade = { _id: oid(), gradeName: "G4", defaultBasePay: 250000 };
const noDefaultGrade = { _id: oid(), gradeName: "G0", defaultBasePay: null };
const person = (employeeName, gradeId) => ({
  _id: oid(), employeeName, companyId, gradeId, status: "Active", dateOfJoining: new Date("2026-01-01"), relievingDate: null,
});
const asha = person("asha", grade._id);
const ravi = person("ravi", noDefaultGrade._id);
stub(Employee, [asha, ravi]);
stub(EmployeeGrade, [grade, noDefaultGrade]);
const formulaStructure = {
  _id: oid(), companyId, payrollFrequency: "Monthly", currency: "INR",
  earnings: [{ abbreviation: "BS", amountBasedOnFormula: true, formula: "base * 0.5" }], deductions: [], employerContributions: [],
};
const flatStructure = {
  _id: oid(), companyId, payrollFrequency: "Monthly", currency: "INR",
  earnings: [{ abbreviation: "BS", amountBasedOnFormula: false, amount: 30000 }], deductions: [], employerContributions: [],
};
stub(SalaryStructure, [formulaStructure, flatStructure]);
const assignments = stub(SalaryStructureAssignment, []);
SalaryStructureAssignment.create = async (data) => asDoc(assignments[assignments.push({ _id: oid(), ...data }) - 1]);
SalaryWithholding.exists = async () => null;

// ------------------------------------------------------- 1. blank base --
{
  const bulk = (employeeIds, salaryStructureId, extra = {}) => call(payrollRoutes, "post", "/payroll/bulk-salary-structure-assignment/assign",
    { body: { employeeIds, salaryStructureId, fromDate: "2026-09-01", ...extra } });

  const res = await bulk([asha._id, ravi._id], formulaStructure._id);
  expectStatus(res, 200, "bulk run");
  const [ashaResult, raviResult] = res.body.data.results;
  assert.equal(ashaResult.success, true);
  assert.equal(assignments.find((row) => same(row._id, ashaResult.salaryStructureAssignmentId)).base, 250000, "the grade default base the tool shows is saved");
  assert.equal(raviResult.success, false, "no base and no grade default: refused, not saved as null");
  assert.match(raviResult.error, /Enter a Base for ravi/);
  assert.ok(!assignments.some((row) => same(row.employeeId, ravi._id)), "nothing saved for ravi");

  const typed = await bulk([ravi._id], formulaStructure._id, { base: 40000 });
  assert.equal(typed.body.data.results[0].success, true);
  assert.equal(assignments.find((row) => same(row.employeeId, ravi._id)).base, 40000, "a typed base is kept as typed");

  const single = await call(payrollRoutes, "post", "/salary-structure-assignments",
    { body: { employeeId: String(ravi._id), salaryStructureId: String(formulaStructure._id), fromDate: "2026-10-01", base: "" } });
  expectStatus(single, 400, "single assignment, blank base, no grade default");
  assert.match(single.body.message, /Enter a Base/);

  const flat = await call(payrollRoutes, "post", "/salary-structure-assignments",
    { body: { employeeId: String(ravi._id), salaryStructureId: String(flatStructure._id), fromDate: "2026-11-01" } });
  expectStatus(flat, 201, "a structure that never reads base needs none");
  assert.equal(flat.body.data.base, null);
}
console.log("payrollIntegrity: a blank base takes the grade default or is refused");

// ------------------------------------------------- 2. edit an assignment --
{
  const saved = assignments.find((row) => same(row.employeeId, asha._id));
  // What the edit screen holds: the whole record, through the config's toForm.
  const formValues = {
    ...saved.toObject(), _id: String(saved._id), employeeId: String(asha._id), salaryStructureId: String(formulaStructure._id),
    fromDate: "2026-09-01", incomeTaxSlabId: "", currency: "INR", ctc: 0, annualGrossEarning: 0,
    createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z", __v: 0, base: "260000",
  };
  const fields = [{ name: "employeeId", type: "select" }, { name: "salaryStructureId", type: "select" }, { name: "fromDate", type: "date" }, { name: "incomeTaxSlabId", type: "select" }];
  const put = (body) => call(payrollRoutes, "put", "/salary-structure-assignments/:salaryStructureAssignmentId",
    { params: { salaryStructureAssignmentId: String(saved._id) }, body });

  const before = await put(formPayload(fields, formValues, "edit"));
  expectStatus(before, 400, "the whole record, as the form sent it before");
  assert.equal(before.body.message, "Unexpected fields in request body");

  const after = await put(formPayload(fields, salaryStructureAssignmentPayload(formValues, "edit"), "edit"));
  expectStatus(after, 200, "only the editable fields");
  assert.equal(saved.base, "260000", "the corrected base is saved");
  assert.equal(saved.incomeTaxSlabId, null);

  const cleared = await put({ base: "" });
  expectStatus(cleared, 200, "clearing the base");
  assert.equal(saved.base, 250000, "a cleared base falls back to the grade default");

  const add = salaryStructureAssignmentPayload({ employeeId: "e", base: "1" }, "add");
  assert.deepEqual(add, { employeeId: "e", base: "1" }, "create sends the form as it is");
}
console.log("payrollIntegrity: editing an assignment saves");

// --------------------------------------- 3. re-running a cancelled month --
const sepStart = new Date("2026-09-01");
const sepEnd = new Date("2026-09-30");
{
  assignments.length = 0;
  assignments.push(asDoc({ _id: oid(), employeeId: asha._id, salaryStructureId: formulaStructure._id, fromDate: new Date("2026-09-01"), base: 250000 }));
  assignments.push(asDoc({ _id: oid(), employeeId: ravi._id, salaryStructureId: formulaStructure._id, fromDate: new Date("2026-09-01"), base: 40000 }));
  const cancelledSlip = { _id: oid(), employeeId: asha._id, companyId, startDate: sepStart, endDate: sepEnd, status: "cancelled" };
  const submittedSlip = { _id: oid(), employeeId: ravi._id, companyId, startDate: sepStart, endDate: sepEnd, status: "submitted" };
  const slips = stub(SalarySlip, [cancelledSlip, submittedSlip]);
  const cancelledEntry = {
    _id: oid(), companyId, status: "cancelled", startDate: sepStart, endDate: sepEnd,
    employeeDetails: [{ employeeId: asha._id, salarySlipId: cancelledSlip._id }, { employeeId: ravi._id, salarySlipId: submittedSlip._id }],
  };
  stub(PayrollEntry, [cancelledEntry]);

  const eligible = await resolveEligiblePayrollEmployees({ companyId, payrollFrequency: "Monthly", startDate: sepStart, endDate: sepEnd });
  assert.deepEqual(eligible.map((row) => row.employeeName), ["asha"], "the cancelled slip's employee is selected again; the submitted one is not");

  const remove = (slip) => call(payrollRunRoutes, "delete", "/salary-slips/:salarySlipId", { params: { salarySlipId: String(slip._id) } });
  expectStatus(await remove(cancelledSlip), 200, "a cancelled slip linked only from a cancelled entry");
  assert.equal(cancelledSlip.isDeleted, true);

  const openSlip = { _id: oid(), employeeId: asha._id, companyId, startDate: new Date("2026-10-01"), endDate: new Date("2026-10-31"), status: "cancelled" };
  slips.push(asDoc(openSlip));
  stub(PayrollEntry, [cancelledEntry, { _id: oid(), companyId, status: "draft", employeeDetails: [{ employeeId: asha._id, salarySlipId: openSlip._id }] }]);
  expectStatus(await remove(openSlip), 409, "a cancelled slip still linked from an entry that is not cancelled");
  assert.notEqual(openSlip.isDeleted, true);
}
console.log("payrollIntegrity: a cancelled month can be run again");

// ------------------------------------------- 4. an entry whose slips all fail --
{
  const negative = (employee) => ({ _id: oid(), employeeId: employee._id, companyId, startDate: sepStart, endDate: sepEnd, status: "draft", netPay: -200 });
  const slips = [negative(asha), negative(ravi)];
  stub(SalarySlip, slips);
  const entry = {
    _id: oid(), companyId, status: "draft", startDate: sepStart, endDate: sepEnd,
    employeeDetails: slips.map((slip) => asDoc({ employeeId: slip.employeeId, salarySlipId: slip._id, status: "created", failureReason: "" })),
  };
  stub(PayrollEntry, [entry]);

  const res = await call(payrollRunRoutes, "post", "/payroll-entries/:id/submit-slips", { params: { id: String(entry._id) } });
  expectStatus(res, 200, "submit");
  assert.equal(res.body.data.failed, 2);
  assert.equal(entry.status, "failed", "not \"submitted\" when nobody was paid");
  assert.ok(entry.employeeDetails.every((row) => row.status === "failed" && /Net Pay cannot be less than 0/.test(row.failureReason)), "each row says why");
  assert.ok(slips.every((slip) => slip.status === "draft"), "no slip was submitted");
}
console.log("payrollIntegrity: an entry whose slips all fail is marked failed");

// ------------------------------------ 5. a submitted slip is never deleted --
{
  const slip = (status) => ({ _id: oid(), employeeId: asha._id, companyId, startDate: sepStart, endDate: sepEnd, status });
  const submitted = slip("submitted");
  const withheld = slip("withheld");
  const draft = slip("draft");
  stub(SalarySlip, [submitted, withheld, draft]);
  stub(PayrollEntry, []);
  const remove = (row) => call(payrollRunRoutes, "delete", "/salary-slips/:salarySlipId", { params: { salarySlipId: String(row._id) } });
  for (const row of [submitted, withheld]) {
    const res = await remove(row);
    expectStatus(res, 409, `a ${row.status} slip with no other references`);
    assert.match(res.body.message, /Cancel it first/);
    assert.notEqual(row.isDeleted, true);
  }
  expectStatus(await remove(draft), 200, "a draft slip");
  assert.equal(draft.isDeleted, true);
}
console.log("payrollIntegrity: a submitted slip cannot be deleted");

// ------------------------- 6. deleting a cancelled entry takes its slips --
{
  const slip = (employee, status) => ({ _id: oid(), employeeId: employee._id, companyId, startDate: sepStart, endDate: sepEnd, status });
  const entryOf = (status, slips) => ({ _id: oid(), companyId, status, startDate: sepStart, endDate: sepEnd,
    employeeDetails: slips.map((row) => ({ employeeId: row.employeeId, salarySlipId: row._id })) });
  const remove = (entry) => call(payrollRunRoutes, "delete", "/payroll-entries/:id", { params: { id: String(entry._id) } });

  const cancelled = [slip(asha, "cancelled"), slip(ravi, "cancelled")];
  const entry = entryOf("cancelled", cancelled);
  stub(SalarySlip, cancelled);
  stub(PayrollEntry, [entry]);
  const res = await remove(entry);
  expectStatus(res, 200, "delete a cancelled entry");
  assert.equal(res.body.data.deletedSalarySlips, 2);
  assert.equal(entry.isDeleted, true);
  assert.ok(cancelled.every((row) => row.isDeleted === true), "its cancelled slips are deleted with it");

  const mixed = [slip(asha, "cancelled"), slip(ravi, "submitted")];
  const odd = entryOf("cancelled", mixed);
  stub(SalarySlip, mixed);
  stub(PayrollEntry, [odd]);
  const refused = await remove(odd);
  expectStatus(refused, 409, "a cancelled entry still linking a submitted slip");
  assert.match(refused.body.message, /not cancelled/);
  assert.ok(odd.isDeleted !== true && mixed.every((row) => row.isDeleted !== true), "nothing deleted");

  const draft = entryOf("draft", []);
  stub(PayrollEntry, [draft]);
  expectStatus(await remove(draft), 400, "an entry that is not cancelled");
}
console.log("payrollIntegrity: deleting a cancelled entry deletes its cancelled slips");

// ------------------------------- 7. a saved Payroll Correction opens (P2) --
{
  // Mongoose refuses to populate a path its schema lacks (strictPopulate), so
  // GET /payroll-corrections/:id answered 500 while it populated payrollPeriodId.
  const correction = asDoc({ _id: oid(), employeeId: asha._id, companyId, salarySlipId: oid(), payrollPeriodId: oid(), status: "draft" });
  const populated = [];
  const strictQuery = (result) => {
    const chain = {
      populate: (path) => {
        if (!PayrollCorrection.schema.path(path)) throw new Error(`Cannot populate path \`${path}\` because it is not in your schema.`);
        populated.push(path);
        return chain;
      },
      then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    };
    return chain;
  };
  PayrollCorrection.findById = (id) => strictQuery(same(id, correction._id) ? correction : null);
  PayrollCorrection.findOne = async () => correction;

  const opened = await call(payrollBenefitsRoutes, "get", "/payroll-corrections/:id", { params: { id: String(correction._id) } });
  expectStatus(opened, 200, "a saved correction opens");
  assert.ok(populated.includes("payrollPeriodId"), "with its payroll period");

  // What create writes is kept, not silently dropped by the schema.
  const period = oid();
  const kept = new PayrollCorrection({ payrollPeriodId: period, remarks: "LWP reversed after review" }).toObject();
  assert.ok(same(kept.payrollPeriodId, period), "payrollPeriodId is stored");
  assert.equal(kept.remarks, "LWP reversed after review", "remarks are stored");
}
console.log("payrollIntegrity: a saved payroll correction opens");

// ------------------------------------- 8. the payroll setup screens save (N1) --
{
  // What every edit screen holds besides its own fields: the saved record,
  // through the config's toForm.
  const saved = { _id: String(oid()), isDeleted: false, createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z", __v: 0 };

  // HR Manager ticks Arrear component on "Basic Salary - APD": the real route.
  const basicApd = asDoc({
    _id: oid(), salaryComponentName: "Basic Salary - APD", abbreviation: "BS", type: "Earning", companyId, componentType: "",
    isTaxApplicable: true, dependsOnPaymentDays: true, doNotIncludeInTotal: false, statisticalComponent: false, roundToNearestInteger: false,
    exemptedFromIncomeTax: false, removeIfZeroValued: false, variableBasedOnTaxableSalary: false, arrearComponent: false, accrualComponent: false,
    isFlexibleBenefit: false, maxBenefitAmount: 0, payoutMethod: "", finalCycleAccrualPayout: false, isActive: true,
  });
  stub(SalaryComponent, [basicApd]);
  const formValues = { ...saved, ...basicApd.toObject(), _id: String(basicApd._id), companyId: String(companyId), arrearComponent: true };
  const fields = [{ name: "type", type: "select" }, { name: "companyId", type: "select" }, { name: "componentType", type: "select" }];
  const put = (body) => call(payrollRoutes, "put", "/salary-components/:salaryComponentId", { params: { salaryComponentId: String(basicApd._id) }, body });

  const before = await put(formPayload(fields, formValues, "edit"));
  expectStatus(before, 400, "the whole record, as the form sent it before");
  assert.equal(before.body.message, "Unexpected fields in request body");
  assert.equal(basicApd.arrearComponent, false);

  const after = await put(formPayload(fields, salaryComponentPayload(formValues), "edit"));
  expectStatus(after, 200, "only the fields the screen edits");
  assert.equal(basicApd.arrearComponent, true, "Arrear component is ticked");

  // The other five, each against the list its route enforces.
  const accepts = (allowed, body) => {
    const res = fakeRes();
    let passed = false;
    allowOnlyFields(allowed)({ body }, res, () => { passed = true; });
    return passed || res.body.unexpectedFields;
  };
  const screens = [
    ["Salary Structure", SALARYSTRUCTURE_FIELDS, salaryStructurePayload, {
      salaryStructureName: "Staff", companyId: String(companyId), payrollFrequency: "Monthly", currency: "INR", leaveEncashmentAmountPerDay: 0,
      isActive: true, earnings: [{ _id: String(oid()), salaryComponentId: String(basicApd._id), amount: 22500 }], deductions: [], employerContributions: [],
      totalEarning: 22500, totalDeduction: 0, netPay: 22500, maxBenefits: 0, employeeBenefits: [],
    }],
    ["Payroll Period", PAYROLLPERIOD_FIELDS, payrollPeriodPayload, { companyId: String(companyId), startDate: "2026-10-01", endDate: "2026-10-31", isActive: true }],
    ["Gratuity Rule", GRATUITY_RULE_FIELDS, gratuityRulePayload, {
      name: "Indian Standard Gratuity Rule", disable: false, calculateGratuityAmountBasedOn: "Current Slab", totalWorkingDaysPerYear: 365,
      workExperienceCalculationFunction: "Round off Work Experience", minimumYearForGratuity: 5,
      applicableEarningsComponent: [{ salaryComponentId: String(basicApd._id) }], gratuityRuleSlabs: [],
    }],
    ["Income Tax Slab", INCOMETAXSLAB_FIELDS, incomeTaxSlabPayload, {
      name: "New regime", companyId: String(companyId), effectiveFromDate: "2026-04-01", allowTaxExemption: false, standardDeduction: 75000,
      taxReliefLimit: 0, marginalReliefLimit: null, disabled: false, currency: "INR", slabs: [], otherTaxesAndCharges: [],
    }],
    ["Tax Exemption Sub Category", EMPLOYEE_TAX_EXEMPTION_SUB_CATEGORY_FIELDS, taxExemptionSubCategoryPayload, {
      name: "PPF", exemptionCategoryId: String(oid()), maxAmount: 150000, description: "", isActive: true,
    }],
  ];
  for (const [screen, allowed, payload, record] of screens) {
    const values = { ...saved, ...record };
    assert.notEqual(accepts(allowed, values), true, `${screen}: the whole record is refused`);
    const sent = payload(values);
    assert.equal(accepts(allowed, sent), true, `${screen}: what the screen now sends is accepted`);
    for (const key of Object.keys(record).filter((key) => allowed.includes(key) && !["maxBenefits", "employeeBenefits"].includes(key))) {
      assert.ok(key in sent, `${screen}: ${key} is still sent`);
    }
  }
}
console.log("payrollIntegrity: the payroll setup screens' edits save (N1)");

// ------------------- 9. a cancelled entry's rows say cancelled (29 Oct) --
{
  const slip = (employee) => ({ _id: oid(), employeeId: employee._id, companyId, startDate: sepStart, endDate: sepEnd, status: "cancelled" });
  const paid = slip(asha);
  stub(SalarySlip, [paid]);
  const entry = {
    _id: oid(), companyId, status: "submitted", startDate: sepStart, endDate: sepEnd,
    employeeDetails: [
      asDoc({ employeeId: asha._id, salarySlipId: paid._id, status: "submitted", failureReason: "" }),
      asDoc({ employeeId: ravi._id, status: "pending", failureReason: "" }),
    ],
  };
  stub(PayrollEntry, [entry]);
  const res = await call(payrollRunRoutes, "post", "/payroll-entries/:id/cancel", { params: { id: String(entry._id) } });
  expectStatus(res, 200, "cancel the entry");
  assert.equal(entry.status, "cancelled");
  assert.deepEqual(entry.employeeDetails.map((row) => row.status), ["cancelled", "cancelled"], "no row still says submitted or pending");
}
console.log("payrollIntegrity: a cancelled entry's rows say cancelled");

console.log("payrollIntegrity: all cases passed");
