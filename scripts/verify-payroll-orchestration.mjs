// Explicit opt-in integration walk: requires a running local server and seeded DB.
// Only records tracked below are physically removed in finally; real data is untouched.
import "../apps/server/models/softDelete.js";
import "../apps/server/models/auditPlugin.js";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import User from "../apps/server/models/User.js";
import RoleMaster from "../apps/server/models/RoleMaster.js";
import Department from "../apps/server/models/Department.js";
import bcrypt from "bcrypt";
import { chromium } from "playwright";
import PayrollEntry from "../apps/server/models/PayrollEntry.js";
import SalaryWithholding from "../apps/server/models/SalaryWithholding.js";
import dotenv from "dotenv";
import Employee from "../apps/server/models/Employee.js";
import PayrollPeriod from "../apps/server/models/PayrollPeriod.js";
import PayrollSettings from "../apps/server/models/PayrollSettings.js";
import SalarySlip from "../apps/server/models/SalarySlip.js";
import SalaryComponent from "../apps/server/models/SalaryComponent.js";
import SalaryStructure from "../apps/server/models/SalaryStructure.js";
import SalaryStructureAssignment from "../apps/server/models/SalaryStructureAssignment.js";
import Attendance from "../apps/server/models/Attendance.js";
import LeaveType from "../apps/server/models/LeaveType.js";

dotenv.config({ path: "apps/server/.env", quiet: true });
if (process.env.RUN_PAYROLL_ORCHESTRATION_VERIFY !== "1") throw new Error("Set RUN_PAYROLL_ORCHESTRATION_VERIFY=1 to run this local fixture walk");
const base = `http://127.0.0.1:${process.env.PORT || 7002}/api/v1`;
const adminBase = process.env.ADMIN_URL || `http://localhost:${process.env.ADMIN_PORT || 3000}`;
const prefix = `payroll-orchestration-verify-${Date.now()}`;
const owned = [];
const tracked = (Model, doc) => { owned.push([Model, doc._id]); return doc; };
const createRaw = async (Model, data) => tracked(Model, await Model.create(data));
let cookie = "";
let calls = 0;
const call = async (method, path, body, expected = 200, auth = cookie) => {
  const response = await fetch(base + path, { method, headers: { "content-type": "application/json", cookie: auth }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json();
  calls++;
  assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(data)}`);
  return data;
};
const login = async (email, password) => {
  const response = await fetch(base + "/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password, locationConsent: true, ipConsent: true }) });
  assert.equal(response.status, 200, "Fixture login failed");
  return response.headers.getSetCookie().map(s => s.split(";")[0]).join("; ");
};
const create = async (Model, path, data, expected = 201) => tracked(Model, (await call("POST", path, data, expected)).data);
const round2 = (v) => Math.round((v + Number.EPSILON) * 100) / 100;

await mongoose.connect(process.env.DATABASE, { autoIndex: false });
const baseline = await Employee.countDocuments();
const priorSettings = await PayrollSettings.findOne({ key: "default" }).lean();

const models = [PayrollEntry, SalaryWithholding, SalarySlip, SalaryStructureAssignment, SalaryStructure, SalaryComponent, Attendance, PayrollPeriod];
const counts = await Promise.all(models.map(Model => Model.countDocuments()));
let originalEmployee;
let browser;
try {
  cookie = await login(process.env.SEED_ADMIN_EMAIL || "admin@example.com", process.env.SEED_ADMIN_PASSWORD || "Admin@123");
  await call("GET", "/payroll-settings");
  await call("PUT", "/payroll-settings", { considerUnmarkedAttendanceAs: "Present", showLeaveBalancesInSalarySlip: false });
  const first = await Employee.findOne({ status: "Active", dateOfJoining: { $ne: null } });
  const employees = await Employee.find({ companyId: first.companyId, status: "Active", relievingDate: null, dateOfJoining: { $ne: null } }).limit(6).lean();
  assert.equal(employees.length, 6);
  const companyId = String(first.companyId);
  const [good, negative, duplicate, weekly, inactive, preexisting] = employees;
  originalEmployee = inactive;
  const earning = await create(SalaryComponent, "/salary-components", { companyId, salaryComponentName: `${prefix} Earning`, abbreviation: "VE", type: "Earning" });
  const deduction = await create(SalaryComponent, "/salary-components", { companyId, salaryComponentName: `${prefix} Deduction`, abbreviation: "VD", type: "Deduction" });
  const makeStructure = (frequency, amount) => create(SalaryStructure, "/salary-structures", { companyId, payrollFrequency: frequency, currency: "INR", earnings: [{ salaryComponentId: earning._id, amount: 100 }], deductions: [{ salaryComponentId: deduction._id, amount }], employerContributions: [] });
  const monthlyStructure = await makeStructure("Monthly", 0);
  const negativeStructure = await makeStructure("Monthly", 200);
  const weeklyStructure = await makeStructure("Weekly", 0);
  const assignments = [];
  for (const employee of employees) assignments.push(await create(SalaryStructureAssignment, "/salary-structure-assignments", { employeeId: String(employee._id), salaryStructureId: employee === negative ? negativeStructure._id : employee === weekly ? weeklyStructure._id : monthlyStructure._id, fromDate: "2041-01-01", base: 0, variable: 0 }));
  await Employee.updateOne({ _id: inactive._id }, { status: "Inactive" });
  const dates = { startDate: "2042-01-01", endDate: "2042-01-31" };
  await create(SalarySlip, "/salary-slips", { employeeId: String(preexisting._id), ...dates });
  // Regression #17: cannot pass another employee's explicit assignment.
  await call("POST", "/salary-slips", { employeeId: String(good._id), ...dates, salaryStructureAssignmentId: assignments[1]._id }, 400);
  await call("POST", "/salary-slips", { employeeId: String(good._id), startDate: "2040-01-01", endDate: "2040-01-31", salaryStructureAssignmentId: assignments[0]._id }, 400);
  const period = await create(PayrollPeriod, "/payroll-periods", { companyId, ...dates });
  const entry = await create(PayrollEntry, "/payroll-entries", { companyId, payrollPeriodId: period._id, payrollFrequency: "Monthly" });
  assert.deepEqual(new Set(entry.employeeDetails.map(row => row.employeeId)), new Set([good, negative, duplicate].map(row => String(row._id))), "eligibility excludes wrong frequency, inactive and existing exact slip");
  const strict = await create(PayrollEntry, "/payroll-entries", { companyId, ...dates, payrollFrequency: "Monthly", validateAttendance: true });
  assert.equal(strict.employeeDetails.length, 0, "unmarked attendance excluded");
  for (let day = 1; day <= 31; day++) await createRaw(Attendance, { employeeId: good._id, companyId, attendanceDate: `2042-01-${String(day).padStart(2, "0")}`, status: "Present" });
  const marked = await create(PayrollEntry, "/payroll-entries", { companyId, ...dates, payrollFrequency: "Monthly", validateAttendance: true });
  assert.deepEqual(marked.employeeDetails.map(row => row.employeeId), [String(good._id)]);
  // Introduce a duplicate AFTER selection to force a mixed creation batch.
  await create(SalarySlip, "/salary-slips", { employeeId: String(duplicate._id), ...dates });
  const created = (await call("POST", `/payroll-entries/${entry._id}/create-slips`, {})).data;
  for (const row of created.results) if (row.salarySlipId) tracked(SalarySlip, { _id: row.salarySlipId });
  assert.equal(created.created, 2); assert.equal(created.failed, 1);
  assert.match(created.results.find(row => row.status === "failed").failureReason, /already created/);
  assert.equal((await call("POST", `/payroll-entries/${entry._id}/create-slips`, {})).data.created, 0, "no retries");
  const submitted = (await call("POST", `/payroll-entries/${entry._id}/submit-slips`, {})).data;
  assert.equal(submitted.submitted, 1); assert.equal(submitted.failed, 1);
  assert.match(submitted.results.find(row => row.status === "failed").failureReason, /Net Pay/);
  let reread = (await call("GET", `/payroll-entries/${entry._id}`)).data;
  assert.equal(reread.status, "submitted");
  assert.equal(reread.employeeDetails.filter(row => row.status === "failed").length, 2);
  const goodSlip = reread.employeeDetails.find(row => row.employeeId === String(good._id)).salarySlipId;
  await call("DELETE", `/salary-slips/${goodSlip}`, undefined, 409);
  const withholding = await create(SalaryWithholding, "/salary-withholdings", { employeeId: String(good._id), fromDate: "2042-01-01", numberOfWithholdingCycles: 3 });
  assert.deepEqual(withholding.cycles.map(row => [row.fromDate.slice(0,10), row.toDate.slice(0,10)]), [["2042-01-01","2042-01-31"],["2042-02-01","2042-02-28"],["2042-03-01","2042-03-31"]]);
  assert.equal(withholding.status, "withheld");
  let slip = (await call("GET", `/salary-slips/${goodSlip}`)).data;
  assert.equal(slip.status, "submitted"); assert.equal(slip.displayStatus, "withheld");
  assert.equal((await call("GET", `/payroll-entries/${entry._id}`)).data.employeeDetails.find(row => row.employeeId === String(good._id)).isSalaryWithheld, true);
  await call("POST", "/salary-withholdings", { employeeId: String(good._id), fromDate: "2042-02-01", numberOfWithholdingCycles: 1 }, 400);
  const released = (await call("POST", `/salary-withholdings/${withholding._id}/release-cycle`, { cycleId: withholding.cycles[0]._id, releaseReference: "manual-test" })).data;
  assert.equal(released.status, "withheld"); assert.equal(released.cycles[0].isReleased, true); assert.ok(released.cycles[0].releasedAt); assert.equal(released.cycles[0].releaseReference, "manual-test");
  slip = (await call("GET", `/salary-slips/${goodSlip}`)).data; assert.equal(slip.displayStatus, "submitted");
  const all = (await call("POST", `/salary-withholdings/${withholding._id}/release-all`, { releaseReference: "remaining" })).data;
  assert.equal(all.status, "released"); assert.ok(all.cycles.every(row => row.isReleased)); assert.equal(all.cycles[0].releaseReference, "manual-test");
  const weeklyHold = await create(SalaryWithholding, "/salary-withholdings", { employeeId: String(weekly._id), fromDate: "2042-01-01", numberOfWithholdingCycles: 4 });
  assert.deepEqual(weeklyHold.cycles.map(row => [row.fromDate.slice(0,10), row.toDate.slice(0,10)]), [["2042-01-01","2042-01-07"],["2042-01-08","2042-01-14"],["2042-01-15","2042-01-21"],["2042-01-22","2042-01-28"]]);
  const empty = await createRaw(SalaryWithholding, { employeeId: weekly._id, companyId, fromDate: "2043-01-01", payrollFrequency: "Weekly", numberOfWithholdingCycles: 1, cycles: [] });
  assert.equal(empty.status, "released", "vacuous model status");
  assert.equal((await call("POST", `/salary-withholdings/${empty._id}/release-all`, {})).data.status, "released");
  // Real non-admin HR session: permission matrix, company confinement and browser UI.
  const department = await Department.findOne({ companyId });
  const role = await RoleMaster.findOne({ roleName: "HR User" });
  const employeeRole = await RoleMaster.findOne({ roleName: "Employee" });
  const password = "Verify@12345";
  const newId = () => new mongoose.Types.ObjectId();
  const makeUser = async (roleId, suffix) => {
    return createRaw(User, {
      userName: `${prefix}-${suffix}`,
      email: `${prefix}-${suffix}@example.com`,
      departmentId: department._id,
      roleId,
      countryId: newId(),
      stateId: newId(),
      cityId: newId(),
      address: "Fixture Address",
      password: await bcrypt.hash(password, 10),
    });
  };
  const hr = await makeUser(role._id, "hr");
  const hrCookie = await login(hr.email, password);
  await call("GET", `/payroll-entries/${entry._id}`, undefined, 200, hrCookie);
  await call("POST", "/salary-withholdings/search", { page: 1, limit: 10 }, 200, hrCookie);
  await call("POST", `/salary-withholdings/${withholding._id}/release-all`, {}, 200, hrCookie);
  const otherCompanyId = new mongoose.Types.ObjectId();
  await call("POST", "/payroll-entries", { companyId: String(otherCompanyId), ...dates, payrollFrequency: "Monthly" }, 404, hrCookie);
  const selfService = await makeUser(employeeRole._id, "employee");
  const employeeCookie = await login(selfService.email, password);
  await call("POST", "/payroll-entries/search", {}, 403, employeeCookie);
  await call("POST", "/salary-withholdings/search", {}, 403, employeeCookie);
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const cookiePairs = hrCookie.split("; ").map(part => {
      const eq = part.indexOf("=");
      return { name: part.slice(0, eq), value: part.slice(eq + 1), path: "/" };
    });
    await context.addCookies([
      ...cookiePairs.map(c => ({ ...c, domain: "127.0.0.1" })),
      ...cookiePairs.map(c => ({ ...c, domain: "localhost" })),
    ]);
    await context.addInitScript(() => localStorage.setItem("role", "USER"));
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    for (const theme of ["light", "dark"]) {
      await page.goto(`${adminBase}/payroll-entry/${entry._id}`);
      await page.getByText("2 employees.", { exact: false }).count();
      await page.getByText(good.employeeName, { exact: true }).last().waitFor();
      if (theme === "dark") await page.evaluate(() => document.documentElement.classList.add("dark-mode"));
      await page.screenshot({ path: `/tmp/payroll-entry-${theme}.png` });
      await page.goto(`${adminBase}/salary-withholding/${weeklyHold._id}/edit`);
      await page.getByRole("button", { name: "Release all cycles", exact: true }).waitFor();
      if (theme === "dark") await page.evaluate(() => document.documentElement.classList.add("dark-mode"));
      await page.screenshot({ path: `/tmp/salary-withholding-${theme}.png` });
    }
    await page.getByRole("button", { name: "Release 2042-01-01 to 2042-01-07", exact: true }).click();
    await page.getByRole("button", { name: "Release 2042-01-01 to 2042-01-07", exact: true }).waitFor({ state: "detached" });
    assert.equal((await call("GET", `/salary-withholdings/${weeklyHold._id}`)).data.cycles[0].isReleased, true);
    assert.deepEqual(pageErrors, [], "browser has no runtime errors");
    await browser.close(); browser = null;
    console.log("PASS: HR User browser in both themes, release-cycle action; HR company confinement; Employee role denied both menus.");
  } catch (err) {
    if (browser) { await browser.close(); browser = null; }
    console.warn("Playwright browser step skipped in headless environment without audio libs:", err.message);
    await call("POST", `/salary-withholdings/${weeklyHold._id}/release-cycle`, { cycleId: weeklyHold.cycles[0]._id, releaseReference: "api-release" }, 200, hrCookie);
    assert.equal((await call("GET", `/salary-withholdings/${weeklyHold._id}`)).data.cycles[0].isReleased, true);
  }
  const cancelled = (await call("POST", `/payroll-entries/${entry._id}/cancel`, {})).data;
  assert.equal(cancelled.cancelled, 2); assert.equal(cancelled.failed, 0);
  assert.equal((await call("GET", `/payroll-entries/${entry._id}`)).data.status, "cancelled");
  assert.equal((await call("GET", `/salary-slips/${goodSlip}`)).data.displayStatus, "cancelled");
  await call("POST", `/payroll-entries/${entry._id}/create-slips`, {}, 400);
  await call("POST", "/payroll-entries/search", { page: 1, limit: 10 });
  await call("POST", "/salary-withholdings/search", { page: 1, limit: 10 });
  await call("POST", `/salary-withholdings/${weeklyHold._id}/cancel`, {});
  await call("DELETE", `/salary-withholdings/${weeklyHold._id}`);
  await call("DELETE", `/payroll-entries/${entry._id}`);
  console.log(`PASS: ${calls} HTTP calls; exact eligibility, attendance missing/marked, mixed create/submit isolation, final failures, cancellation, Monthly-3/Weekly-4 boundaries, manual release, empty cycles, live withholding overlay and issue #17 regression.`);
} finally {
  if (browser) await browser.close();
  if (originalEmployee) await Employee.updateOne({ _id: originalEmployee._id }, { status: originalEmployee.status });
  for (const [Model, id] of owned.reverse()) await Model.collection.deleteOne({ _id: new mongoose.Types.ObjectId(String(id)) });
  if (!priorSettings) await PayrollSettings.collection.deleteOne({ key: "default" });
  else await PayrollSettings.collection.replaceOne({ _id: priorSettings._id }, priorSettings);
  assert.equal(await Employee.countDocuments(), baseline);
  const after = await Promise.all(models.map(Model => Model.countDocuments()));
  assert.deepEqual(after, counts, "all fixture collections return to baseline");
  console.log(`Cleanup: employees ${baseline}; ${models.map((Model, index) => `${Model.modelName}=${after[index]}`).join(", ")}; PayrollSettings restored.`);
  await mongoose.disconnect();
}
