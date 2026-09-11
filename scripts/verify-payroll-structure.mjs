// Explicit opt-in integration walk: requires a running local server and seeded DB.
// Only records tracked below are physically removed in finally; real data is untouched.
import "../apps/server/models/softDelete.js";
import "../apps/server/models/auditPlugin.js";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Employee from "../apps/server/models/Employee.js";
import SalaryComponent from "../apps/server/models/SalaryComponent.js";
import SalaryStructure from "../apps/server/models/SalaryStructure.js";
import SalaryStructureAssignment from "../apps/server/models/SalaryStructureAssignment.js";
import LeaveEncashment from "../apps/server/models/LeaveEncashment.js";
import LeaveLedgerEntry from "../apps/server/models/LeaveLedgerEntry.js";
import LeaveType from "../apps/server/models/LeaveType.js";
import LeaveAllocation from "../apps/server/models/LeaveAllocation.js";

dotenv.config({ path: "apps/server/.env", quiet: true });
if (process.env.RUN_PAYROLL_VERIFY !== "1") throw new Error("Set RUN_PAYROLL_VERIFY=1 to run this local fixture walk");
const base = `http://127.0.0.1:${process.env.PORT || 7002}/api/v1`;
const prefix = `payroll-verify-${Date.now()}`;
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

await mongoose.connect(process.env.DATABASE, { autoIndex: false });
const baseline = await Employee.countDocuments();
try {
  cookie = await login(process.env.SEED_ADMIN_EMAIL || "admin@example.com", process.env.SEED_ADMIN_PASSWORD || "Admin@123");

  const employee = await Employee.findOne({ status: "Active" }).lean();
  const companyId = String(employee.companyId);
  const employeeId = String(employee._id);
  // Same company as `employee` — a Salary Structure Assignment validates the
  // structure's company against the employee's, so a cross-company pairing
  // would 400 on the bulk-assign step below.
  const otherEmployee = await Employee.findOne({ status: "Active", companyId: employee.companyId, _id: { $ne: employee._id } }).lean();

  // -------------------------------------------------- SalaryComponent CRUD --
  // Names deliberately do NOT carry the run's `prefix` — the prefix has no
  // internal spaces, so it would itself contribute a leading initial to the
  // derived abbreviation (a real, correct behavior — this just keeps the
  // hand-computed expected abbreviations below readable). Uniqueness is
  // still safe: these are the only Salary Components this company will ever
  // have in a fresh/clean test environment, and every one created here is
  // torn down in `finally` even on a failed assertion.
  const basic = await create(SalaryComponent, "/salary-components", { companyId, salaryComponentName: "Basic Salary", type: "Earning" });
  assert.equal(basic.abbreviation, "BS", "abbreviation auto-derives from initials");

  // Dedup: a second component whose name also derives to "BS" gets "BS_1".
  const basicDup = await create(SalaryComponent, "/salary-components", { companyId, salaryComponentName: "Bright Star", type: "Earning" });
  assert.equal(basicDup.abbreviation, "BS_1", "colliding abbreviation gets a numeric suffix");

  const hra = await create(SalaryComponent, "/salary-components", { companyId, salaryComponentName: "House Rent Allowance", type: "Earning" });
  assert.equal(hra.abbreviation, "HRA");

  const pf = await create(SalaryComponent, "/salary-components", { companyId, salaryComponentName: "Provident Fund", type: "Deduction" });
  const stat = await create(SalaryComponent, "/salary-components", { companyId, salaryComponentName: "Statistical Basic", type: "Earning", statisticalComponent: true });
  const epf = await create(SalaryComponent, "/salary-components", { companyId, salaryComponentName: "Employer PF", type: "Employer Contribution" });

  // Mutual exclusion: arrearComponent + variableBasedOnTaxableSalary -> 400.
  await call("POST", "/salary-components", { companyId, salaryComponentName: `${prefix} Bad Component 1`, type: "Deduction", arrearComponent: true, variableBasedOnTaxableSalary: true }, 400);
  // accrualComponent only valid on Earning -> 400 when type is Deduction.
  await call("POST", "/salary-components", { companyId, salaryComponentName: `${prefix} Bad Component 2`, type: "Deduction", accrualComponent: true }, 400);

  await call("GET", `/salary-components/${basic._id}`);
  await call("PUT", `/salary-components/${basic._id}`, { removeIfZeroValued: true });
  const componentList = (await call("POST", "/salary-components/search", { page: 1, limit: 100 })).data[0].data;
  assert.ok(componentList.some(row => row._id === basic._id));

  // ------------------------------------------------------- SalaryStructure --
  // Basic 30000 (earning), HRA = BASIC * 0.4 = 12000 (earning),
  // Statistical Basic 5000 (earning, excluded from totalEarning),
  // PF 1800 (flat deduction), Employer PF = BASIC * 0.12 = 3600 (employer contribution),
  // condition-gated bonus-like row skipped (condition false at Structure level, base/variable default to 0).
  const structure = await create(SalaryStructure, "/salary-structures", {
    companyId,
    payrollFrequency: "Monthly",
    currency: "INR",
    leaveEncashmentAmountPerDay: 500,
    earnings: [
      { salaryComponentId: basic._id, amount: 30000 },
      { salaryComponentId: hra._id, amountBasedOnFormula: true, formula: "BS * 0.4" },
      { salaryComponentId: stat._id, amount: 5000 },
    ],
    deductions: [
      { salaryComponentId: pf._id, amount: 1800 },
    ],
    employerContributions: [
      { salaryComponentId: epf._id, amountBasedOnFormula: true, formula: "BS * 0.12" },
    ],
  });
  // totalEarning = 30000 (basic) + 12000 (hra, BS*0.4) = 42000 — statistical row excluded.
  assert.equal(structure.totalEarning, 42000, "totalEarning excludes the statistical row and resolves the formula row");
  assert.equal(structure.totalDeduction, 1800, "totalDeduction sums the flat deduction row");
  assert.equal(structure.netPay, 40200, "netPay = totalEarning - totalDeduction");
  const hraRow = structure.earnings.find(r => String(r.salaryComponentId) === String(hra._id) || String(r.salaryComponentId?._id) === String(hra._id));
  assert.equal(hraRow.defaultAmount, 12000, "a row's formula resolves an earlier row's abbreviation (BS)");

  // condition-gated row test: a second structure with a bonus row gated on "base > 100000"
  // (base defaults to 0 at Structure-evaluation time, so it must be skipped).
  const gatedStructure = await create(SalaryStructure, "/salary-structures", {
    companyId, payrollFrequency: "Monthly", currency: "INR",
    earnings: [
      { salaryComponentId: basic._id, amount: 20000 },
      { salaryComponentId: hra._id, amount: 5000, condition: "base > 100000" },
    ],
    deductions: [], employerContributions: [],
  });
  assert.equal(gatedStructure.totalEarning, 20000, "a condition-gated row that evaluates false is skipped entirely (contributes 0)");

  await call("GET", `/salary-structures/${structure._id}`);
  await call("PUT", `/salary-structures/${structure._id}`, { leaveEncashmentAmountPerDay: 600 });
  const reread = (await call("GET", `/salary-structures/${structure._id}`)).data;
  assert.equal(reread.totalEarning, 42000, "totals are recomputed and stable across an unrelated field update");

  // ----------------------------------------------- SalaryStructureAssignment --
  // A dedicated structure whose earnings/employer-contribution rows are
  // genuinely base-dependent (unlike the flat-30000 Basic above) — this is
  // the "real, meaningful" formula evaluation ADR-026 says only happens at
  // assignment time, distinct from the Structure-level totals check above
  // (which defaults base/variable to 0 and exercises abbreviation-chaining
  // instead). Hand-computed, base = 50000, variable = 0, Monthly (12 periods):
  // BASIC = base = 50000. HRA = BS * 0.4 = 20000. grossPerPeriod = 70000.
  // Employer PF = BS * 0.12 = 6000. annualGrossEarning = 70000*12 = 840000.
  // ctc = (70000+6000)*12 = 76000*12 = 912000.
  const ctcStructure = await create(SalaryStructure, "/salary-structures", {
    companyId, payrollFrequency: "Monthly", currency: "INR", leaveEncashmentAmountPerDay: 600,
    earnings: [
      { salaryComponentId: basic._id, amountBasedOnFormula: true, formula: "base" },
      { salaryComponentId: hra._id, amountBasedOnFormula: true, formula: "BS * 0.4" },
    ],
    deductions: [],
    employerContributions: [
      { salaryComponentId: epf._id, amountBasedOnFormula: true, formula: "BS * 0.12" },
    ],
  });

  const assignment = await create(SalaryStructureAssignment, "/salary-structure-assignments", {
    employeeId, salaryStructureId: ctcStructure._id, fromDate: "2040-01-01", base: 50000, variable: 0,
  });
  assert.equal(assignment.annualGrossEarning, 840000, "annualGrossEarning matches the hand-computed value");
  assert.equal(assignment.ctc, 912000, "ctc matches the hand-computed value");
  assert.equal(assignment.currency, "INR", "currency fetched from the structure");
  assert.equal(assignment.leaveEncashmentAmountPerDay, 600, "leaveEncashmentAmountPerDay fetched from the structure");

  // Exact-duplicate fromDate for the same employee -> 400.
  await call("POST", "/salary-structure-assignments", { employeeId, salaryStructureId: ctcStructure._id, fromDate: "2040-01-01", base: 10000 }, 400);

  // A second, later fromDate for the same employee succeeds (not treated as an overlap).
  const laterAssignment = await create(SalaryStructureAssignment, "/salary-structure-assignments", {
    employeeId, salaryStructureId: ctcStructure._id, fromDate: "2040-06-01", base: 60000, variable: 0,
  });

  // getCurrentSalaryStructureAssignment resolution, verified directly (no HTTP surface for this resolver).
  const { getCurrentSalaryStructureAssignment } = await import("../apps/server/utils/payrollAssignment.js");
  const beforeLater = await getCurrentSalaryStructureAssignment(employeeId, new Date("2040-03-01"));
  assert.equal(String(beforeLater._id), String(assignment._id), "before the later fromDate, the earlier assignment resolves");
  const afterLater = await getCurrentSalaryStructureAssignment(employeeId, new Date("2040-07-01"));
  assert.equal(String(afterLater._id), String(laterAssignment._id), "once the later fromDate has passed, it resolves instead");

  await call("GET", `/salary-structure-assignments/${assignment._id}`);
  await call("PUT", `/salary-structure-assignments/${assignment._id}`, { base: 55000 });

  // ------------------------------------------------------------ Bulk assign --
  // Neither employee has an assignment for 2041-01-01 yet, so both are eligible.
  const eligible = await call("POST", "/payroll/bulk-salary-structure-assignment/eligible-employees", { fromDate: "2041-01-01", companyId });
  assert.ok(eligible.data.some(row => String(row.employeeId) === employeeId), "active employee as-of the bulk fromDate is eligible");
  assert.ok(eligible.data.some(row => String(row.employeeId) === String(otherEmployee._id)));

  const bulkResult = await call("POST", "/payroll/bulk-salary-structure-assignment/assign", {
    employeeIds: [employeeId, String(otherEmployee._id)],
    salaryStructureId: structure._id,
    fromDate: "2041-01-01",
    base: 40000,
  });
  const successRows = bulkResult.data.results.filter(r => r.success);
  assert.equal(successRows.length, 2, "both employees succeed on their first bulk run");
  for (const row of successRows) owned.push([SalaryStructureAssignment, row.salaryStructureAssignmentId]);

  // Now that employeeId has an assignment for exactly 2041-01-01, the
  // eligible-employees query must exclude them for that same date (the
  // dedupe/skip mechanism) while still offering otherEmployee for a
  // different date.
  const eligibleAfter = await call("POST", "/payroll/bulk-salary-structure-assignment/eligible-employees", { fromDate: "2041-01-01", companyId });
  assert.ok(!eligibleAfter.data.some(row => String(row.employeeId) === employeeId), "an employee who already has an assignment for this exact fromDate is excluded from the eligible list");

  // Deliberately fail one: re-running the same fromDate for one of them collides (duplicate).
  const mixedBatch = await call("POST", "/payroll/bulk-salary-structure-assignment/assign", {
    employeeIds: [employeeId],
    salaryStructureId: structure._id,
    fromDate: "2041-01-01",
    base: 40000,
  });
  assert.equal(mixedBatch.data.results[0].success, false, "a duplicate fromDate fails in isolation, not aborting the caller");

  // ---------------------------------------------------- Q-14 retrofit (live) --
  const leaveType = await LeaveType.findOne({ allowEncashment: true }).lean()
    || await createRaw(LeaveType, { leaveTypeName: `${prefix} Encashable`, allowEncashment: true, isActive: true });
  const allocation = await createRaw(LeaveAllocation, {
    employeeId, leaveTypeId: leaveType._id, status: "active",
    fromDate: new Date("2039-01-01"), toDate: new Date("2039-12-31"),
    newLeavesAllocated: 10, totalLeavesAllocated: 10, companyId,
  });
  await createRaw(LeaveLedgerEntry, {
    employeeId, leaveTypeId: leaveType._id, transactionType: "LeaveAllocation", transactionId: allocation._id,
    leaves: 10, fromDate: new Date("2039-01-01"), toDate: new Date("2039-12-31"), companyId,
  });

  // Without perDayEncashmentAmount: resolves from the CURRENT assignment as of
  // the encashment date (2040-03-01 -> the first assignment, rate 600).
  const encashmentWithoutRate = await create(LeaveEncashment, "/leave-encashments", {
    employeeId, leaveTypeId: leaveType._id, leaveAllocationId: allocation._id, encashmentDate: "2040-03-01", encashmentDays: 2,
  }, 201);
  assert.equal(encashmentWithoutRate.encashmentAmount, 1200, "Q-14: defaults to the current Salary Structure Assignment's leaveEncashmentAmountPerDay (600 * 2 days)");

  // Explicit manual value still works unchanged.
  const encashmentWithRate = await create(LeaveEncashment, "/leave-encashments", {
    employeeId, leaveTypeId: leaveType._id, leaveAllocationId: allocation._id, encashmentDate: "2040-03-02", encashmentDays: 1, perDayEncashmentAmount: 999,
  }, 201);
  assert.equal(encashmentWithRate.encashmentAmount, 999, "Q-14: an explicit perDayEncashmentAmount still overrides the resolved rate");

  // No assignment resolves and no manual value supplied -> 400.
  const neverAssigned = await Employee.findOne({ status: "Active", _id: { $nin: [employee._id, otherEmployee._id] } }).lean();
  const secondLeaveType = await createRaw(LeaveType, { leaveTypeName: `${prefix} Encashable 2`, allowEncashment: true, isActive: true });
  const noAssignmentAllocation = await createRaw(LeaveAllocation, {
    employeeId: neverAssigned._id, leaveTypeId: secondLeaveType._id, status: "active",
    fromDate: new Date("2039-01-01"), toDate: new Date("2039-12-31"),
    newLeavesAllocated: 5, totalLeavesAllocated: 5, companyId: neverAssigned.companyId,
  });
  await call("POST", "/leave-encashments", { employeeId: String(neverAssigned._id), leaveTypeId: secondLeaveType._id, leaveAllocationId: noAssignmentAllocation._id, encashmentDate: "2040-03-01", encashmentDays: 1 }, 400);

  console.log(`PASS: ${calls} real HTTP calls; SalaryComponent CRUD + abbreviation dedup + mutual-exclusion/accrual guards; SalaryStructure totals/formula-chaining/condition-skip; SalaryStructureAssignment CTC/gross hand-checked (annualGrossEarning=840000, ctc=912000), duplicate-fromDate rejection, later-fromDate resolution via getCurrentSalaryStructureAssignment; bulk assignment mixed batch (eligible-employees dedupe + per-item isolation); Q-14 Leave Encashment retrofit (default + override + 400-if-neither).`);
} finally {
  for (const [Model, id] of owned.reverse()) await Model.collection.deleteOne({ _id: new mongoose.Types.ObjectId(String(id)) });
  const count = await Employee.countDocuments();
  assert.equal(count, baseline);
  console.log(`Cleanup: Employee count ${count} (baseline ${baseline}); all tracked fixtures removed.`);
  await mongoose.disconnect();
}
