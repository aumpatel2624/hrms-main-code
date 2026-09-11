// Explicit opt-in integration walk: requires a running local server and seeded DB.
// Only records tracked below are physically removed in finally; real data is untouched.
import "../apps/server/models/softDelete.js";
import "../apps/server/models/auditPlugin.js";
import assert from "node:assert/strict";
import mongoose from "mongoose";
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
if (process.env.RUN_PAYROLL_RUN_VERIFY !== "1") throw new Error("Set RUN_PAYROLL_RUN_VERIFY=1 to run this local fixture walk");
const base = `http://127.0.0.1:${process.env.PORT || 7002}/api/v1`;
const prefix = `payroll-run-verify-${Date.now()}`;
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

try {
  cookie = await login(process.env.SEED_ADMIN_EMAIL || "admin@example.com", process.env.SEED_ADMIN_PASSWORD || "Admin@123");

  // ============================================================ PayrollSettings --
  if (!priorSettings) {
    const firstRead = await call("GET", "/payroll-settings");
    assert.equal(firstRead.data.payrollBasedOn, "Attendance", "first-ever GET creates the default row (payrollBasedOn)");
    assert.equal(firstRead.data.considerUnmarkedAttendanceAs, "Absent");
    assert.equal(firstRead.data.dailyWagesFractionForHalfDay, 0.5);
    assert.equal(firstRead.data.showLeaveBalancesInSalarySlip, true);
  } else {
    await call("GET", "/payroll-settings");
  }
  const updated = await call("PUT", "/payroll-settings", { dailyWagesFractionForHalfDay: 0.75 });
  assert.equal(updated.data.dailyWagesFractionForHalfDay, 0.75, "PUT updates the singleton");
  const reread = await call("GET", "/payroll-settings");
  assert.equal(reread.data.dailyWagesFractionForHalfDay, 0.75, "GET reflects the update");
  // Restore the exact settings the rest of this script's calculations assume
  // (defaults: Attendance-based, unmarked -> Absent, half day fraction 0.5).
  await call("PUT", "/payroll-settings", {
    payrollBasedOn: "Attendance", considerUnmarkedAttendanceAs: "Absent",
    includeHolidaysInTotalWorkingDays: false, dailyWagesFractionForHalfDay: 0.5,
    showLeaveBalancesInSalarySlip: true,
  });

  const employee = await Employee.findOne({ status: "Active", dateOfJoining: { $ne: null } }).lean();
  const companyId = String(employee.companyId);
  const employeeId = String(employee._id);
  const otherEmployee = await Employee.findOne({ status: "Active", companyId: employee.companyId, dateOfJoining: { $ne: null }, _id: { $ne: employee._id } }).lean();
  const otherCompanyEmployee = await Employee.findOne({ status: "Active", companyId: { $ne: employee.companyId }, dateOfJoining: { $ne: null } }).lean();

  // =============================================================== PayrollPeriod --
  const period = await create(PayrollPeriod, "/payroll-periods", { companyId, startDate: "2040-01-01", endDate: "2040-01-31" });
  await call("GET", `/payroll-periods/${period._id}`);
  // Overlapping range, SAME company -> 400.
  await call("POST", "/payroll-periods", { companyId, startDate: "2040-01-15", endDate: "2040-02-15" }, 400);
  // Same overlapping range, a DIFFERENT company -> allowed (ADR-027: only same-company overlap is rejected).
  if (otherCompanyEmployee) {
    const otherCompanyPeriod = await create(PayrollPeriod, "/payroll-periods", { companyId: String(otherCompanyEmployee.companyId), startDate: "2040-01-15", endDate: "2040-02-15" });
    assert.ok(otherCompanyPeriod._id, "a different company's overlapping period is allowed");
  }
  await call("PUT", `/payroll-periods/${period._id}`, { endDate: "2040-02-05" });
  await call("POST", "/payroll-periods", { companyId, startDate: "2040-03-01", endDate: "2040-02-01" }, 400); // start after end
  const periodList = (await call("POST", "/payroll-periods/search", { page: 1, limit: 100 })).data[0].data;
  assert.ok(periodList.some(row => row._id === period._id));
  await call("DELETE", `/payroll-periods/${period._id}`);

  // ==================================================== SalaryStructure fixture --
  // Basic Salary (Earning, dependsOnPaymentDays) 30000; HRA (Earning, formula
  // "BS * 0.4", NOT itself flagged dependsOnPaymentDays — proves the
  // cascading-proration behavior); Professional Tax (Deduction, flat, NOT
  // dependsOnPaymentDays) 1000.
  // Explicit abbreviations — the run's prefix has internal spaces, so
  // auto-derivation would pick up the prefix's own initials too (the exact
  // trap verify-payroll-structure.mjs's own comment warns about).
  const basic = await create(SalaryComponent, "/salary-components", { companyId, salaryComponentName: `${prefix} Basic`, abbreviation: "BS", type: "Earning", dependsOnPaymentDays: true });
  const hra = await create(SalaryComponent, "/salary-components", { companyId, salaryComponentName: `${prefix} HRA`, abbreviation: "HRA", type: "Earning" });
  const pt = await create(SalaryComponent, "/salary-components", { companyId, salaryComponentName: `${prefix} PT`, abbreviation: "PT", type: "Deduction" });

  const structure = await create(SalaryStructure, "/salary-structures", {
    companyId, payrollFrequency: "Monthly", currency: "INR",
    earnings: [
      { salaryComponentId: basic._id, amount: 30000 },
      { salaryComponentId: hra._id, amountBasedOnFormula: true, formula: "BS * 0.4" },
    ],
    deductions: [{ salaryComponentId: pt._id, amount: 1000 }],
    employerContributions: [],
  });

  const assignment = await create(SalaryStructureAssignment, "/salary-structure-assignments", {
    employeeId, salaryStructureId: structure._id, fromDate: "2039-01-01", base: 0, variable: 0,
  });

  // ===================================================== SalarySlip: full attendance --
  // Mark every day Present so paymentDays === workingDays === totalWorkingDays
  // (ratio 1) regardless of the real employee's holiday calendar — this is
  // what makes the hand-check below independent of exactly how many holidays
  // fall in the range.
  const fullDates = [];
  for (let d = 1; d <= 28; d++) fullDates.push(`2040-02-${String(d).padStart(2, "0")}`);
  for (const date of fullDates) await createRaw(Attendance, { employeeId, companyId, attendanceDate: new Date(date), status: "Present" }); // eslint-disable-line no-await-in-loop

  const fullSlip = await create(SalarySlip, "/salary-slips", { employeeId, startDate: "2040-02-01", endDate: "2040-02-28" });
  assert.equal(fullSlip.paymentDays, fullSlip.totalWorkingDays, "full attendance: paymentDays === totalWorkingDays");
  assert.equal(fullSlip.lwpDays, 0);
  assert.equal(fullSlip.absentDays, 0);
  assert.equal(fullSlip.halfDayDays, 0);
  // ratio 1 -> nothing scaled: Basic 30000 + HRA (30000*0.4=12000) - PT 1000 = 41000.
  assert.equal(fullSlip.grossPay, 42000, "full attendance: grossPay = 30000 + 12000 (unscaled)");
  assert.equal(fullSlip.totalDeduction, 1000);
  assert.equal(fullSlip.netPay, 41000, "full attendance: netPay = 42000 - 1000");

  // Exact-duplicate (employeeId, startDate, endDate) -> 400.
  await call("POST", "/salary-slips", { employeeId, startDate: "2040-02-01", endDate: "2040-02-28" }, 400);

  // ============================================= SalarySlip: LWP day + unmarked day --
  // A separate, later 10-day period. One day marked "On Leave" against an LWP
  // Leave Type (lwpDays += 1); one day left with NO Attendance row at all
  // (considerUnmarkedAttendanceAs defaults to "Absent" -> absentDays += 1).
  // Every other day marked Present. The exact day count (workingDays) is read
  // back from the server rather than assumed, so this hand-check is immune
  // to however many holidays this employee's calendar happens to carry in
  // this range — only the KNOWN delta (2 fewer payment days) is asserted.
  const lwpLeaveType = await createRaw(LeaveType, { leaveTypeName: `${prefix} LWP Type`, isLwp: true, isActive: true });
  const periodDates = [];
  for (let d = 1; d <= 10; d++) periodDates.push(`2040-03-${String(d).padStart(2, "0")}`);
  const lwpDate = periodDates[2]; // 2040-03-03
  const unmarkedDate = periodDates[5]; // 2040-03-06 — deliberately no Attendance row created for this date
  for (const date of periodDates) {
    if (date === unmarkedDate) continue;
    const status = date === lwpDate ? "On Leave" : "Present";
    await createRaw(Attendance, { // eslint-disable-line no-await-in-loop
      employeeId, companyId, attendanceDate: new Date(date), status,
      ...(date === lwpDate ? { leaveTypeId: lwpLeaveType._id } : {}),
    });
  }

  const lwpSlip = await create(SalarySlip, "/salary-slips", { employeeId, startDate: periodDates[0], endDate: periodDates[9] });
  assert.equal(lwpSlip.lwpDays, 1, "the On Leave/LWP-type day counts as one LWP day");
  assert.equal(lwpSlip.absentDays, 1, "the unmarked day counts as Absent (considerUnmarkedAttendanceAs default)");
  assert.equal(lwpSlip.halfDayDays, 0);
  assert.equal(lwpSlip.paymentDays, round2(lwpSlip.workingDays - 2), "paymentDays = workingDays - lwpDays(1) - absentDays(1)");

  // Hand-recompute the expected component amounts from the SAME ratio the
  // server used, independently of the production code path, and compare.
  const ratio = lwpSlip.paymentDays / lwpSlip.totalWorkingDays;
  const expectedBasic = round2(30000 * ratio); // dependsOnPaymentDays -> scaled
  const expectedHra = round2(expectedBasic * 0.4); // formula cascades from the scaled Basic
  const expectedGross = round2(expectedBasic + expectedHra);
  const expectedNet = round2(expectedGross - 1000); // PT not dependsOnPaymentDays -> unscaled
  assert.equal(lwpSlip.grossPay, expectedGross, `LWP slip grossPay hand-check (ratio ${ratio})`);
  assert.equal(lwpSlip.totalDeduction, 1000, "PT (not dependsOnPaymentDays) is unscaled");
  assert.equal(lwpSlip.netPay, expectedNet, `LWP slip netPay hand-check (ratio ${ratio})`);

  const lwpSlipEarningsBasic = lwpSlip.earnings.find(r => r.abbreviation === "BS" || String(r.salaryComponentId) === String(basic._id) || String(r.salaryComponentId?._id) === String(basic._id));
  assert.equal(lwpSlipEarningsBasic.defaultAmount, expectedBasic, "the stored Basic row itself carries the scaled amount");

  // ===================================================================== Submit --
  // A deliberately negative-net-pay slip: a huge flat deduction dwarfing a
  // tiny flat earning. Uses otherEmployee (own structure/assignment) so it
  // doesn't collide with employee's fixtures above.
  const negBasic = await create(SalaryComponent, "/salary-components", { companyId, salaryComponentName: `${prefix} Neg Basic`, abbreviation: "NB", type: "Earning" });
  const negPt = await create(SalaryComponent, "/salary-components", { companyId, salaryComponentName: `${prefix} Neg PT`, abbreviation: "NPT", type: "Deduction" });
  const negStructure = await create(SalaryStructure, "/salary-structures", {
    companyId, payrollFrequency: "Monthly", currency: "INR",
    earnings: [{ salaryComponentId: negBasic._id, amount: 100 }],
    deductions: [{ salaryComponentId: negPt._id, amount: 100000 }],
    employerContributions: [],
  });
  const negAssignment = await create(SalaryStructureAssignment, "/salary-structure-assignments", {
    employeeId: String(otherEmployee._id), salaryStructureId: negStructure._id, fromDate: "2039-01-01", base: 0, variable: 0,
  });
  const negativeSlip = await create(SalarySlip, "/salary-slips", { employeeId: String(otherEmployee._id), startDate: "2040-04-01", endDate: "2040-04-30" });
  assert.ok(negativeSlip.netPay < 0, "fixture slip really is negative net pay");
  await call("POST", `/salary-slips/${negativeSlip._id}/submit`, undefined, 400); // rejected — draft may be negative, submit enforces >= 0
  await call("POST", `/salary-slips/${negativeSlip._id}/cancel`); // cancel has no netPay guard
  const cancelledNeg = (await call("GET", `/salary-slips/${negativeSlip._id}`)).data;
  assert.equal(cancelledNeg.status, "cancelled");
  await call("POST", `/salary-slips/${negativeSlip._id}/cancel`, undefined, 400); // already cancelled

  // Valid submit: the full-attendance slip above (positive net pay).
  const submitted = await call("POST", `/salary-slips/${fullSlip._id}/submit`);
  assert.equal(submitted.data.status, "submitted");
  await call("POST", `/salary-slips/${fullSlip._id}/submit`, undefined, 400); // only a draft can be submitted
  await call("POST", `/salary-slips/${fullSlip._id}/cancel`); // Submitted -> Cancelled is a valid transition
  const cancelledFull = (await call("GET", `/salary-slips/${fullSlip._id}`)).data;
  assert.equal(cancelledFull.status, "cancelled");

  console.log(`PASS: ${calls} real HTTP calls; PayrollSettings singleton (first-GET-creates-default confirmed${priorSettings ? " [row pre-existed, create-path not exercised]" : ""}, GET/PUT round-trip); PayrollPeriod CRUD + company-scoped overlap guard (same company 400, different company allowed); SalarySlip full-attendance hand-check (grossPay 42000, netPay 41000), LWP+unmarked hand-check (ratio ${ratio}, netPay ${expectedNet}), exact-duplicate rejection, negative-net-pay submit rejection + cancel, valid submit + submit-twice rejection + Submitted->Cancelled.`);
} finally {
  for (const [Model, id] of owned.reverse()) await Model.collection.deleteOne({ _id: new mongoose.Types.ObjectId(String(id)) }); // eslint-disable-line no-await-in-loop
  if (!priorSettings) {
    await PayrollSettings.collection.deleteOne({ key: "default" });
  } else {
    await PayrollSettings.findOneAndUpdate({ key: "default" }, {
      payrollBasedOn: priorSettings.payrollBasedOn,
      considerUnmarkedAttendanceAs: priorSettings.considerUnmarkedAttendanceAs,
      includeHolidaysInTotalWorkingDays: priorSettings.includeHolidaysInTotalWorkingDays,
      considerMarkedAttendanceOnHolidays: priorSettings.considerMarkedAttendanceOnHolidays,
      dailyWagesFractionForHalfDay: priorSettings.dailyWagesFractionForHalfDay,
      disableRoundedTotal: priorSettings.disableRoundedTotal,
      showLeaveBalancesInSalarySlip: priorSettings.showLeaveBalancesInSalarySlip,
    });
  }
  const count = await Employee.countDocuments();
  assert.equal(count, baseline);
  console.log(`Cleanup: Employee count ${count} (baseline ${baseline}); all tracked fixtures removed; PayrollSettings restored.`);
  await mongoose.disconnect();
}
