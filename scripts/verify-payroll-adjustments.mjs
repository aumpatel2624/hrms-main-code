// Explicit opt-in integration walk for Module 12: Payroll — Adjustments & Incentives (ADR-028)
// Requires a running local server and seeded DB. Only records tracked below are physically
// removed in finally; real data is untouched.
import "../apps/server/models/softDelete.js";
import "../apps/server/models/auditPlugin.js";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import Employee from "../apps/server/models/Employee.js";
import User from "../apps/server/models/User.js";
import RoleMaster from "../apps/server/models/RoleMaster.js";
import PayrollPeriod from "../apps/server/models/PayrollPeriod.js";
import SalaryComponent from "../apps/server/models/SalaryComponent.js";
import SalaryStructure from "../apps/server/models/SalaryStructure.js";
import SalaryStructureAssignment from "../apps/server/models/SalaryStructureAssignment.js";
import SalarySlip from "../apps/server/models/SalarySlip.js";
import Attendance from "../apps/server/models/Attendance.js";
import AdditionalSalary from "../apps/server/models/AdditionalSalary.js";
import Arrear from "../apps/server/models/Arrear.js";
import RetentionBonus from "../apps/server/models/RetentionBonus.js";
import EmployeeIncentive from "../apps/server/models/EmployeeIncentive.js";
import EmployeeOtherIncome from "../apps/server/models/EmployeeOtherIncome.js";

dotenv.config({ path: "apps/server/.env", quiet: true });
if (process.env.RUN_PAYROLL_ADJUSTMENTS_VERIFY !== "1") {
  throw new Error("Set RUN_PAYROLL_ADJUSTMENTS_VERIFY=1 to run this local fixture walk");
}

const base = `http://127.0.0.1:${process.env.PORT || 7002}/api/v1`;
const prefix = `adj-verify-${Date.now()}`;
const owned = [];
const tracked = (Model, doc) => {
  if (doc && doc._id) owned.push([Model, doc._id]);
  return doc;
};
const createRaw = async (Model, data) => tracked(Model, await Model.create(data));
let cookie = "";
let calls = 0;

const call = async (method, path, body, expected = 200, auth = cookie) => {
  const response = await fetch(base + path, {
    method,
    headers: { "content-type": "application/json", cookie: auth },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error(`${method} ${path} (${response.status}) returned non-JSON: ${text.slice(0, 300)}`);
  }
  calls++;
  assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(data)}`);
  return data;
};

const login = async (email, password) => {
  const response = await fetch(base + "/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password, locationConsent: true, ipConsent: true }),
  });
  assert.equal(response.status, 200, "Fixture login failed");
  return response.headers.getSetCookie().map((s) => s.split(";")[0]).join("; ");
};

const create = async (Model, path, data, expected = 201, auth = cookie) => {
  const res = await call("POST", path, data, expected, auth);
  return tracked(Model, res.data);
};

await mongoose.connect(process.env.DATABASE, { autoIndex: false });
const baseline = await Employee.countDocuments();
let modifiedEmployeeId = null;
let origUserId = null;

try {
  cookie = await login(process.env.SEED_ADMIN_EMAIL || "admin@example.com", process.env.SEED_ADMIN_PASSWORD || "Admin@123");

  const employee = await Employee.findOne({ status: "Active", dateOfJoining: { $ne: null } }).lean();
  assert.ok(employee, "Fixture employee exists");
  const companyId = String(employee.companyId);
  const employeeId = String(employee._id);

  const otherEmployee = await Employee.findOne({ status: "Active", companyId: employee.companyId, _id: { $ne: employee._id } }).lean();
  assert.ok(otherEmployee, "Second fixture employee exists");

  // =========================================================================
  // Master Setup: Salary Components
  // =========================================================================
  const statComp = await create(SalaryComponent, "/salary-components", {
    companyId,
    salaryComponentName: `${prefix} Stat`,
    abbreviation: "STAT",
    type: "Earning",
    statisticalComponent: true,
  });

  const empContribComp = await create(SalaryComponent, "/salary-components", {
    companyId,
    salaryComponentName: `${prefix} EmpContrib`,
    abbreviation: "EC",
    type: "Employer Contribution",
  });

  const basicComp = await create(SalaryComponent, "/salary-components", {
    companyId,
    salaryComponentName: `${prefix} Basic`,
    abbreviation: "BS",
    type: "Earning",
    dependsOnPaymentDays: true,
  });

  const bonusComp = await create(SalaryComponent, "/salary-components", {
    companyId,
    salaryComponentName: `${prefix} RetentionBonusComp`,
    abbreviation: "RBC",
    type: "Earning",
  });

  const incentiveComp = await create(SalaryComponent, "/salary-components", {
    companyId,
    salaryComponentName: `${prefix} IncentiveComp`,
    abbreviation: "INC",
    type: "Earning",
  });

  const ptComp = await create(SalaryComponent, "/salary-components", {
    companyId,
    salaryComponentName: `${prefix} PT`,
    abbreviation: "PT",
    type: "Deduction",
  });

  const oldComp = await create(SalaryComponent, "/salary-components", {
    companyId,
    salaryComponentName: `${prefix} Old`,
    abbreviation: "OLD",
    type: "Earning",
  });

  // =========================================================================
  // 1. AdditionalSalary Validations & Overwrite Uniqueness
  // =========================================================================
  // A. Statistical component reject 400
  await call("POST", "/additional-salaries", {
    employeeId,
    salaryComponentId: statComp._id,
    amount: 1000,
    payrollDate: "2041-01-15",
  }, 400);

  // B. Employer Contribution reject 400
  await call("POST", "/additional-salaries", {
    employeeId,
    salaryComponentId: empContribComp._id,
    amount: 1000,
    payrollDate: "2041-01-15",
  }, 400);

  // C. Date mutual exclusion reject 400
  // isRecurring: true with payrollDate
  await call("POST", "/additional-salaries", {
    employeeId,
    salaryComponentId: basicComp._id,
    amount: 1000,
    isRecurring: true,
    payrollDate: "2041-01-15",
    fromDate: "2041-01-01",
    toDate: "2041-03-31",
  }, 400);

  // isRecurring: false without payrollDate
  await call("POST", "/additional-salaries", {
    employeeId,
    salaryComponentId: basicComp._id,
    amount: 1000,
    isRecurring: false,
  }, 400);

  // isRecurring: true with fromDate > toDate
  await call("POST", "/additional-salaries", {
    employeeId,
    salaryComponentId: basicComp._id,
    amount: 1000,
    isRecurring: true,
    fromDate: "2041-04-01",
    toDate: "2041-03-01",
  }, 400);

  // D. Save-time overwrite uniqueness validation
  // Create first overwrite one-off in Jan 2041
  const as1 = await create(AdditionalSalary, "/additional-salaries", {
    employeeId,
    salaryComponentId: basicComp._id,
    amount: 40000,
    isRecurring: false,
    payrollDate: "2041-01-15",
    overwriteSalaryStructureAmount: true,
  });
  assert.equal(as1.overwriteSalaryStructureAmount, true);

  // Second one-off overwrite for SAME employee + SAME component in SAME month -> 400
  await call("POST", "/additional-salaries", {
    employeeId,
    salaryComponentId: basicComp._id,
    amount: 42000,
    isRecurring: false,
    payrollDate: "2041-01-20",
    overwriteSalaryStructureAmount: true,
  }, 400);

  // Recurring overwrite overlapping that same month (Jan 2041) -> 400
  await call("POST", "/additional-salaries", {
    employeeId,
    salaryComponentId: basicComp._id,
    amount: 45000,
    isRecurring: true,
    fromDate: "2041-01-01",
    toDate: "2041-03-31",
    overwriteSalaryStructureAmount: true,
  }, 400);

  // Additive row for same employee + component in same month -> allowed! (201)
  const asAdditive = await create(AdditionalSalary, "/additional-salaries", {
    employeeId,
    salaryComponentId: basicComp._id,
    amount: 5000,
    isRecurring: false,
    payrollDate: "2041-01-15",
    overwriteSalaryStructureAmount: false,
  });
  assert.equal(asAdditive.overwriteSalaryStructureAmount, false);

  // =========================================================================
  // 2. RetentionBonus Lifecycle & Cancellation Cascade
  // =========================================================================
  const rb = await create(RetentionBonus, "/retention-bonuses", {
    employeeId,
    salaryComponentId: bonusComp._id,
    bonusAmount: 25000,
    bonusPaymentDate: "2041-02-15",
  });
  assert.equal(rb.status, "draft");

  // Submit creates active AdditionalSalary
  const rbSubmitted = await call("POST", `/retention-bonuses/${rb._id}/submit`);
  assert.equal(rbSubmitted.data.status, "submitted");

  const rbAs = await AdditionalSalary.findOne({
    refDoctype: "RetentionBonus",
    refDocnameId: rb._id,
  });
  assert.ok(rbAs, "RetentionBonus submit created AdditionalSalary");
  assert.equal(rbAs.status, "active");
  assert.equal(rbAs.amount, 25000);
  assert.equal(String(rbAs.salaryComponentId), String(bonusComp._id));
  tracked(AdditionalSalary, rbAs);

  // Cancel cascades to cancel AdditionalSalary
  const rbCancelled = await call("POST", `/retention-bonuses/${rb._id}/cancel`);
  assert.equal(rbCancelled.data.status, "cancelled");

  const rbAsReread = await AdditionalSalary.findById(rbAs._id);
  assert.equal(rbAsReread.status, "cancelled", "RetentionBonus cancellation cascaded to AdditionalSalary");

  // =========================================================================
  // 3. EmployeeIncentive Lifecycle & Cancellation Cascade (Bug Fix)
  // =========================================================================
  const ei = await create(EmployeeIncentive, "/employee-incentives", {
    employeeId,
    salaryComponentId: incentiveComp._id,
    incentiveAmount: 18000,
    incentiveDate: "2041-02-15",
  });
  assert.equal(ei.status, "draft");

  // Submit creates active AdditionalSalary
  const eiSubmitted = await call("POST", `/employee-incentives/${ei._id}/submit`);
  assert.equal(eiSubmitted.data.status, "submitted");

  const eiAs = await AdditionalSalary.findOne({
    refDoctype: "EmployeeIncentive",
    refDocnameId: ei._id,
  });
  assert.ok(eiAs, "EmployeeIncentive submit created AdditionalSalary");
  assert.equal(eiAs.status, "active");
  assert.equal(eiAs.amount, 18000);
  assert.equal(String(eiAs.salaryComponentId), String(incentiveComp._id));
  tracked(AdditionalSalary, eiAs);

  // Cancel cascades to cancel AdditionalSalary (ADR-028 fix for ERPNext upstream gap)
  const eiCancelled = await call("POST", `/employee-incentives/${ei._id}/cancel`);
  assert.equal(eiCancelled.data.status, "cancelled");

  const eiAsReread = await AdditionalSalary.findById(eiAs._id);
  assert.equal(eiAsReread.status, "cancelled", "EmployeeIncentive cancellation cascaded to AdditionalSalary");

  // =========================================================================
  // 4. Arrear Calculation, Positive-Only Delta, & Cancellation Cascade
  // =========================================================================
  // Setup historical structure & slip
  const oldStruct = await create(SalaryStructure, "/salary-structures", {
    companyId,
    payrollFrequency: "Monthly",
    currency: "INR",
    earnings: [
      { salaryComponentId: basicComp._id, amount: 30000 },
      { salaryComponentId: oldComp._id, amount: 10000 },
    ],
    deductions: [],
    employerContributions: [],
  });

  const oldAssign = await create(SalaryStructureAssignment, "/salary-structure-assignments", {
    employeeId,
    salaryStructureId: oldStruct._id,
    fromDate: "2040-01-01",
    base: 0,
    variable: 0,
  });

  // Mark 30 days attendance Present for 2040-06 (June 2040)
  for (let d = 1; d <= 30; d++) {
    const dateStr = `2040-06-${String(d).padStart(2, "0")}`;
    await createRaw(Attendance, { employeeId, companyId, attendanceDate: new Date(dateStr), status: "Present" }); // eslint-disable-line no-await-in-loop
  }

  // Create & submit historical Salary Slip
  const histSlip = await create(SalarySlip, "/salary-slips", {
    employeeId,
    startDate: "2040-06-01",
    endDate: "2040-06-30",
  });
  assert.equal(histSlip.grossPay, 40000);
  await call("POST", `/salary-slips/${histSlip._id}/submit`);

  // Setup revised structure:
  // basicComp: 30000 -> 36000 (positive delta +6000)
  // oldComp: 10000 -> 7000 (negative delta -3000 -> must be excluded from arrear!)
  const newStruct = await create(SalaryStructure, "/salary-structures", {
    companyId,
    payrollFrequency: "Monthly",
    currency: "INR",
    earnings: [
      { salaryComponentId: basicComp._id, amount: 36000 },
      { salaryComponentId: oldComp._id, amount: 7000 },
    ],
    deductions: [],
    employerContributions: [],
  });

  const newAssign = await create(SalaryStructureAssignment, "/salary-structure-assignments", {
    employeeId,
    salaryStructureId: newStruct._id,
    fromDate: "2040-06-01",
    base: 0,
    variable: 0,
  });

  // Calculate arrear preview via POST /arrears/calculate
  const calcResult = await call("POST", "/arrears/calculate", {
    employeeId,
    startDate: "2040-06-01",
    endDate: "2040-06-30",
  });

  // Assert positive-only delta:
  // basicComp has delta 6000
  const earningArrears = calcResult.data.earningArrears;
  assert.equal(earningArrears.length, 1, "only positive delta components are included");
  assert.equal(String(earningArrears[0].salaryComponentId), String(basicComp._id));
  assert.equal(earningArrears[0].amount, 6000);

  // Create Arrear draft
  const arrear = await create(Arrear, "/arrears", {
    employeeId,
    startDate: "2040-06-01",
    endDate: "2040-06-30",
    payrollDate: "2040-07-15",
    earningArrears,
    deductionArrears: [],
  });
  assert.equal(arrear.status, "draft");

  // Submit Arrear -> creates active AdditionalSalary for basicComp delta
  await call("POST", `/arrears/${arrear._id}/submit`);
  const arrearAsList = await AdditionalSalary.find({
    refDoctype: "Arrear",
    refDocnameId: arrear._id,
  });
  assert.equal(arrearAsList.length, 1, "Arrear submit created 1 AdditionalSalary row");
  assert.equal(arrearAsList[0].status, "active");
  assert.equal(arrearAsList[0].amount, 6000);
  assert.equal(String(arrearAsList[0].salaryComponentId), String(basicComp._id));
  for (const asRow of arrearAsList) tracked(AdditionalSalary, asRow);

  // Cancel Arrear -> cascades to cancel AdditionalSalary rows
  await call("POST", `/arrears/${arrear._id}/cancel`);
  const cancelledArrearAsList = await AdditionalSalary.find({
    refDoctype: "Arrear",
    refDocnameId: arrear._id,
  });
  assert.ok(cancelledArrearAsList.every((row) => row.status === "cancelled"), "Arrear cancellation cascaded to AdditionalSalary");

  // =========================================================================
  // 5. EmployeeOtherIncome Self-Service & Negative Amount Support
  // =========================================================================
  const period = await create(PayrollPeriod, "/payroll-periods", {
    companyId,
    startDate: "2041-04-01",
    endDate: "2041-04-30",
  });

  const employeeRole = await RoleMaster.findOne({ roleName: "Employee" }).lean();
  assert.ok(employeeRole, "Employee RoleMaster exists");

  const empUser = await createRaw(User, {
    userName: `${prefix} employee user`,
    email: `${prefix}-emp@example.test`,
    password: await bcrypt.hash("EmpPass@123", 10),
    roleId: employeeRole._id,
    departmentId: employee.departmentId,
    countryId: new mongoose.Types.ObjectId(),
    stateId: new mongoose.Types.ObjectId(),
    cityId: new mongoose.Types.ObjectId(),
    address: "Fixture Address",
  });

  // Link employee to this user temporarily
  origUserId = employee.userId || null;
  modifiedEmployeeId = employee._id;
  await Employee.updateOne({ _id: employee._id }, { userId: empUser._id });

  // Log in as the Employee role user
  const empCookie = await login(empUser.email, "EmpPass@123");

  // Employee creates own record with negative amount (e.g. business/loss deduction)
  const empIncome = await create(EmployeeOtherIncome, "/employee-other-incomes", {
    payrollPeriodId: period._id,
    source: "Freelance Consultancy Loss",
    amount: -1500,
    date: "2041-04-10",
  }, 201, empCookie);
  assert.equal(String(empIncome.employeeId), employeeId, "Employee role automatically scoped to own employee ID");
  assert.equal(empIncome.amount, -1500, "Negative amount accepted for Employee Other Income");

  // Employee can read own record
  const empIncomeRead = await call("GET", `/employee-other-incomes/${empIncome._id}`, undefined, 200, empCookie);
  assert.equal(empIncomeRead.data._id, empIncome._id);

  // Admin creates record for other employee
  const otherEmpIncome = await create(EmployeeOtherIncome, "/employee-other-incomes", {
    employeeId: String(otherEmployee._id),
    payrollPeriodId: period._id,
    source: "Side Project",
    amount: 5000,
    date: "2041-04-12",
  }, 201, cookie);

  // Employee tries to read other employee's record -> 403
  await call("GET", `/employee-other-incomes/${otherEmpIncome._id}`, undefined, 403, empCookie);

  // Employee tries to delete own record -> 403 (Employees cannot delete)
  await call("DELETE", `/employee-other-incomes/${empIncome._id}`, undefined, 403, empCookie);

  // =========================================================================
  // 6. SalarySlip Live Retrofit with AdditionalSalary
  // =========================================================================
  // Structure: Basic 30000 (dependsOnPaymentDays: true), PT 1000 (Deduction)
  const slipStruct = await create(SalaryStructure, "/salary-structures", {
    companyId,
    payrollFrequency: "Monthly",
    currency: "INR",
    earnings: [{ salaryComponentId: basicComp._id, amount: 30000 }],
    deductions: [{ salaryComponentId: ptComp._id, amount: 1000 }],
    employerContributions: [],
  });

  await create(SalaryStructureAssignment, "/salary-structure-assignments", {
    employeeId,
    salaryStructureId: slipStruct._id,
    fromDate: "2041-05-01",
    base: 0,
    variable: 0,
  });

  // Mark all 31 days of 2041-05 Present
  for (let d = 1; d <= 31; d++) {
    const dateStr = `2041-05-${String(d).padStart(2, "0")}`;
    await createRaw(Attendance, { employeeId, companyId, attendanceDate: new Date(dateStr), status: "Present" }); // eslint-disable-line no-await-in-loop
  }

  // Inject adjustments for 2041-05:
  // 1. Overwrite Basic Salary to 38000
  await create(AdditionalSalary, "/additional-salaries", {
    employeeId,
    salaryComponentId: basicComp._id,
    amount: 38000,
    payrollDate: "2041-05-15",
    overwriteSalaryStructureAmount: true,
  });

  // 2. Additive Earning: Incentive component 7000 (brand-new earning)
  await create(AdditionalSalary, "/additional-salaries", {
    employeeId,
    salaryComponentId: incentiveComp._id,
    amount: 7000,
    payrollDate: "2041-05-15",
    overwriteSalaryStructureAmount: false,
  });

  // 3. Additive Deduction: PT + 500 (existing deduction, 1000 base + 500 additive = 1500)
  await create(AdditionalSalary, "/additional-salaries", {
    employeeId,
    salaryComponentId: ptComp._id,
    amount: 500,
    payrollDate: "2041-05-15",
    overwriteSalaryStructureAmount: false,
  });

  // Generate Salary Slip
  const liveSlip = await create(SalarySlip, "/salary-slips", {
    employeeId,
    startDate: "2041-05-01",
    endDate: "2041-05-31",
  });

  // Verify slip earnings & deductions
  const slipBasic = liveSlip.earnings.find((e) => String(e.salaryComponentId) === String(basicComp._id));
  assert.ok(slipBasic, "Basic component found in slip earnings");
  assert.equal(slipBasic.amount, 38000, "Overwrite amount 38000 applied");
  assert.equal(slipBasic.dependsOnPaymentDays, false, "Adjustment row has dependsOnPaymentDays: false");

  const slipIncentive = liveSlip.earnings.find((e) => String(e.salaryComponentId) === String(incentiveComp._id));
  assert.ok(slipIncentive, "Incentive component found in slip earnings");
  assert.equal(slipIncentive.amount, 7000, "Additive amount 7000 applied");
  assert.equal(slipIncentive.dependsOnPaymentDays, false, "Additive row has dependsOnPaymentDays: false");

  const slipPt = liveSlip.deductions.find((d) => String(d.salaryComponentId) === String(ptComp._id));
  assert.ok(slipPt, "PT found in slip deductions");
  assert.equal(slipPt.amount, 1500, "Deduction additive amount 1000 + 500 = 1500 applied");
  assert.equal(slipPt.dependsOnPaymentDays, false, "Deduction adjustment has dependsOnPaymentDays: false");

  // Verify exact totals
  assert.equal(liveSlip.grossPay, 45000, "grossPay = 38000 + 7000");
  assert.equal(liveSlip.totalDeduction, 1500, "totalDeduction = 1500");
  assert.equal(liveSlip.netPay, 43500, "netPay = 45000 - 1500");

  console.log(
    `PASS: ${calls} real HTTP calls; AdditionalSalary validations (statistical 400, employer contrib 400, mutual exclusion 400, overwrite overlap 400, additive co-existence); RetentionBonus submit+cancel cascade; EmployeeIncentive submit+cancel cascade; Arrear calculation (positive-only delta, negative delta dropped) + submit+cancel cascade; EmployeeOtherIncome self-service (own-scope auto-bound, negative amount accepted, foreign read 403, delete 403); SalarySlip live retrofit (overwrite 38000, additive earning 7000, additive deduction 1500, dependsOnPaymentDays=false, grossPay 45000, netPay 43500).`
  );
} finally {
  for (const [Model, id] of owned.reverse()) {
    await Model.collection.deleteOne({ _id: new mongoose.Types.ObjectId(String(id)) }); // eslint-disable-line no-await-in-loop
  }
  await AdditionalSalary.collection.deleteMany({
    refDoctype: { $in: ["RetentionBonus", "EmployeeIncentive", "Arrear"] },
  });
  if (modifiedEmployeeId) {
    await Employee.updateOne({ _id: modifiedEmployeeId }, { userId: origUserId });
  }
  const count = await Employee.countDocuments();
  assert.equal(count, baseline, `Employee count (${count}) must match baseline (${baseline})`);
  console.log(`Cleanup: Employee count ${count} (baseline ${baseline}); all tracked fixtures removed.`);
  await mongoose.disconnect();
}
