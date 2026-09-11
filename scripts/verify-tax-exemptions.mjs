// Explicit opt-in integration walk for Module 30: Payroll — Tax & Exemptions (ADR-030)
// Exercises income tax slabs, exemption categories/subcategories, declarations,
// proof submissions, and the full tax calculation pipeline including annualization.
import "../apps/server/models/softDelete.js";
import "../apps/server/models/auditPlugin.js";
import assert from "node:assert/strict";
import fs from "node:fs";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import Employee from "../apps/server/models/Employee.js";
import User from "../apps/server/models/User.js";
import RoleMaster from "../apps/server/models/RoleMaster.js";
import Company from "../apps/server/models/Company.js";
import PayrollPeriod from "../apps/server/models/PayrollPeriod.js";
import SalaryComponent from "../apps/server/models/SalaryComponent.js";
import SalaryStructure from "../apps/server/models/SalaryStructure.js";
import SalaryStructureAssignment from "../apps/server/models/SalaryStructureAssignment.js";
import SalarySlip from "../apps/server/models/SalarySlip.js";
import IncomeTaxSlab from "../apps/server/models/IncomeTaxSlab.js";
import EmployeeTaxExemptionCategory from "../apps/server/models/EmployeeTaxExemptionCategory.js";
import EmployeeTaxExemptionSubCategory from "../apps/server/models/EmployeeTaxExemptionSubCategory.js";
import EmployeeTaxExemptionDeclaration from "../apps/server/models/EmployeeTaxExemptionDeclaration.js";
import EmployeeTaxExemptionProofSubmission from "../apps/server/models/EmployeeTaxExemptionProofSubmission.js";
import Attendance from "../apps/server/models/Attendance.js";

dotenv.config({ path: "apps/server/.env", quiet: true });
if (process.env.RUN_TAX_EXEMPTIONS_VERIFY !== "1") {
  throw new Error("Set RUN_TAX_EXEMPTIONS_VERIFY=1 to run this local fixture walk");
}

const base = `http://127.0.0.1:${process.env.PORT || 7002}/api/v1`;
const prefix = `tax-verify-${Date.now()}`;
const owned = [];
const tracked = (Model, doc) => {
  if (doc && doc._id) owned.push([Model, doc._id]);
  return doc;
};
const createRaw = async (Model, data) => tracked(Model, await Model.create(data));
let cookie = "";
let calls = 0;
let modifiedEmployeeId = null;
let origUserId = null;
let secondEmployeeId = null;

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
    if (response.status === expected) {
      data = { raw: text };
    } else {
      throw new Error(`${method} ${path} (${response.status}) returned non-JSON: ${text.slice(0, 300)}`);
    }
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
console.log(`Starting verify walk. Baseline employee count: ${baseline}`);

try {
  cookie = await login(process.env.SEED_ADMIN_EMAIL || "admin@example.com", process.env.SEED_ADMIN_PASSWORD || "Admin@123");

  const employee = await Employee.findOne({ status: "Active", dateOfJoining: { $ne: null } }).lean();
  assert.ok(employee, "Fixture employee exists");
  const companyId = String(employee.companyId);
  const employeeId = String(employee._id);

  // Find a second employee for SCOPES.OWN foreign record test
  const otherEmployee = await Employee.findOne({ status: "Active", companyId: employee.companyId, _id: { $ne: employee._id } }).lean();
  assert.ok(otherEmployee, "Second fixture employee exists");
  secondEmployeeId = String(otherEmployee._id);

  // =========================================================================
  // 1. Salary Components: Basic and IncomeTax
  // =========================================================================
  console.log("Creating salary components...");

  const basicComp = await create(SalaryComponent, "/salary-components", {
    companyId,
    salaryComponentName: `${prefix} Basic`,
    abbreviation: "BSC",
    type: "Earning",
    dependsOnPaymentDays: true,
    isTaxApplicable: true,
  });

  const incomeTaxComp = await create(SalaryComponent, "/salary-components", {
    companyId,
    salaryComponentName: `${prefix} IncomeTax`,
    abbreviation: "IT",
    type: "Deduction",
    dependsOnPaymentDays: false,
    variableBasedOnTaxableSalary: true,
  });

  console.log("Salary components created successfully.");

  // =========================================================================
  // 2. Income Tax Slab Creation & Bracket Overlap Validation
  // =========================================================================
  console.log("Testing Income Tax Slab creation and bracket overlap validation...");

  const taxSlab = await create(IncomeTaxSlab, "/income-tax-slabs", {
    name: `${prefix} FY2026-27 Slab`,
    companyId,
    effectiveFromDate: "2026-04-01",
    allowTaxExemption: true,
    standardDeduction: 50000,
    taxReliefLimit: 0,
    slabs: [
      { fromAmount: 0, toAmount: 300000, percentDeduction: 0 },
      { fromAmount: 300000, toAmount: null, percentDeduction: 10 },
    ],
  });
  assert.ok(taxSlab._id, "Income Tax Slab created");

  // Bracket overlap rejection test
  await call("POST", "/income-tax-slabs", {
    name: `${prefix} OverlapSlab`,
    companyId,
    effectiveFromDate: "2026-05-01",
    allowTaxExemption: true,
    standardDeduction: 50000,
    taxReliefLimit: 0,
    slabs: [
      { fromAmount: 0, toAmount: 300000, percentDeduction: 0 },
      { fromAmount: 200000, toAmount: 500000, percentDeduction: 5 }, // overlaps!
    ],
  }, 400);

  console.log("Income Tax Slab overlap validation passed.");

  // =========================================================================
  // 3. Payroll Period & Salary Structure
  // =========================================================================
  console.log("Setting up Payroll Period and Salary Structure...");

  const period = await create(PayrollPeriod, "/payroll-periods", {
    companyId,
    startDate: "2026-04-01",
    endDate: "2027-03-31",
  });

  const structure = await create(SalaryStructure, "/salary-structures", {
    companyId,
    payrollFrequency: "Monthly",
    currency: "USD",
    earnings: [{ salaryComponentId: basicComp._id, amount: 50000, dependsOnPaymentDays: true }],
    deductions: [{ salaryComponentId: incomeTaxComp._id, amount: 0, dependsOnPaymentDays: false }],
  });

  // =========================================================================
  // 4. Income Tax Slab ID Required Validation
  // =========================================================================
  console.log("Testing incomeTaxSlabId required validation...");

  // Try to create assignment WITHOUT incomeTaxSlabId (should fail)
  await call("POST", "/salary-structure-assignments", {
    employeeId,
    salaryStructureId: structure._id,
    fromDate: "2026-04-01",
    base: 50000,
  }, 400);

  console.log("Income Tax Slab ID required validation passed.");

  // =========================================================================
  // 5. Real Salary Structure Assignment with Tax Slab
  // =========================================================================
  console.log("Creating Salary Structure Assignment with tax slab...");

  const assignment = await create(SalaryStructureAssignment, "/salary-structure-assignments", {
    employeeId,
    salaryStructureId: structure._id,
    fromDate: "2026-04-01",
    base: 50000,
    incomeTaxSlabId: taxSlab._id,
  });

  console.log("Salary Structure Assignment created.");

  // =========================================================================
  // 6. Salary Slip Creation & Tax Calculation Verification
  // =========================================================================
  console.log("Testing Salary Slip creation and tax calculation...");

  // Mark all 30 days of April 2026 as Present for full attendance
  for (let d = 1; d <= 30; d++) {
    const dateStr = `2026-04-${String(d).padStart(2, "0")}`;
    await createRaw(Attendance, { employeeId, companyId, attendanceDate: new Date(dateStr), status: "Present" }); // eslint-disable-line no-await-in-loop
  }

  const slip1 = await create(SalarySlip, "/salary-slips", {
    employeeId,
    startDate: "2026-04-01",
    endDate: "2026-04-30",
  });

  // Verify expected tax calculation numbers
  assert.equal(slip1.remainingSubPeriods, 12, `remainingSubPeriods should be 12, got ${slip1.remainingSubPeriods}`);
  assert.equal(slip1.annualTaxableEarning, 550000, `annualTaxableEarning should be 550000, got ${slip1.annualTaxableEarning}`);
  assert.equal(slip1.annualIncomeTax, 25000, `annualIncomeTax should be 25000, got ${slip1.annualIncomeTax}`);
  assert.equal(slip1.incomeTaxDeduction, 2083.33, `incomeTaxDeduction should be 2083.33, got ${slip1.incomeTaxDeduction}`);
  assert.equal(slip1.totalTaxDeductedTillDate, 2083.33, `totalTaxDeductedTillDate should be 2083.33, got ${slip1.totalTaxDeductedTillDate}`);

  // Verify deduction component
  const incomeTaxDeduction = (slip1.deductions || []).find((d) => String(d.salaryComponentId) === String(incomeTaxComp._id));
  assert.ok(incomeTaxDeduction, "IncomeTax deduction component found");
  assert.equal(incomeTaxDeduction.amount, 2083.33, `IncomeTax deduction should be 2083.33, got ${incomeTaxDeduction.amount}`);

  // Verify net pay calculation
  const expectedNetPay = 50000 - 2083.33;
  assert.equal(slip1.netPay, expectedNetPay, `netPay should be ${expectedNetPay}, got ${slip1.netPay}`);

  console.log("Salary Slip tax calculation verified.");

  // =========================================================================
  // 7. Tax Exemption Categories & Sub-Categories
  // =========================================================================
  console.log("Creating tax exemption categories and sub-categories...");

  const taxCategory = await create(EmployeeTaxExemptionCategory, "/employee-tax-exemption-categories", {
    name: `${prefix} 80C`,
    maxAmount: 150000,
  });

  const taxSubCategory = await create(EmployeeTaxExemptionSubCategory, "/employee-tax-exemption-sub-categories", {
    name: `${prefix} PF`,
    exemptionCategoryId: taxCategory._id,
    maxAmount: 150000,
  });

  console.log("Tax exemption categories created.");

  // =========================================================================
  // 8. Sub-Category Ceiling Validation
  // =========================================================================
  console.log("Testing sub-category ceiling validation...");

  // Try to create sub-category with maxAmount > parent category
  await call("POST", "/employee-tax-exemption-sub-categories", {
    name: `${prefix} OverSub`,
    exemptionCategoryId: taxCategory._id,
    maxAmount: 200000, // > parent's 150000
  }, 400);

  console.log("Sub-category ceiling validation passed.");

  // =========================================================================
  // 9. SCOPES.OWN Enforcement Setup (Employee Role User)
  // =========================================================================
  console.log("Setting up Employee role user for SCOPES.OWN testing...");

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

  console.log("Employee role user created and logged in.");

  // =========================================================================
  // 10. Declaration SCOPES.OWN Testing
  // =========================================================================
  console.log("Testing Declaration creation and SCOPES.OWN enforcement...");

  // As empCookie, create declaration for own employee (omit employeeId)
  const empDeclaration = await create(EmployeeTaxExemptionDeclaration, "/employee-tax-exemption-declarations", {
    payrollPeriodId: period._id,
    declarations: [{ exemptionSubCategoryId: taxSubCategory._id, amount: 100000 }],
  }, 201, empCookie);
  assert.equal(String(empDeclaration.employeeId), employeeId, "Employee auto-scoped to own ID");
  assert.equal(empDeclaration.totalExemptionAmount, 100000, "totalExemptionAmount should be 100000");

  // As admin, create a declaration for the second employee
  const otherDeclaration = await create(EmployeeTaxExemptionDeclaration, "/employee-tax-exemption-declarations", {
    employeeId: secondEmployeeId,
    payrollPeriodId: period._id,
    declarations: [{ exemptionSubCategoryId: taxSubCategory._id, amount: 50000 }],
  }, 201, cookie);

  // As empCookie, try to read other employee's declaration -> 403
  await call("GET", `/employee-tax-exemption-declarations/${otherDeclaration._id}`, undefined, 403, empCookie);

  console.log("Declaration SCOPES.OWN enforcement verified.");

  // =========================================================================
  // 11. Proof Submission SCOPES.OWN Testing
  // =========================================================================
  console.log("Testing Proof Submission creation and SCOPES.OWN enforcement...");

  // As empCookie, create proof submission for own employee (omit employeeId)
  const empProofSubmission = await create(EmployeeTaxExemptionProofSubmission, "/employee-tax-exemption-proof-submissions", {
    payrollPeriodId: period._id,
    taxExemptionProofs: [{ exemptionSubCategoryId: taxSubCategory._id, amount: 80000, typeOfProof: "Receipt" }],
  }, 201, empCookie);
  assert.equal(String(empProofSubmission.employeeId), employeeId, "Employee auto-scoped to own ID");
  assert.equal(empProofSubmission.exemptionAmount, 80000, "exemptionAmount should be 80000");

  console.log("Proof Submission SCOPES.OWN verified.");

  // =========================================================================
  // 12. GL/No-Eval Sanity Checks
  // =========================================================================
  console.log("Performing GL/no-eval sanity checks on source files...");

  const filesToCheck = [
    "apps/server/utils/incomeTaxCalc.js",
    "apps/server/models/IncomeTaxSlab.js",
    "apps/server/models/EmployeeTaxExemptionDeclaration.js",
    "apps/server/models/EmployeeTaxExemptionProofSubmission.js",
    "apps/server/controllers/v1/payrollTax.controller.js",
  ];

  for (const filePath of filesToCheck) {
    const content = fs.readFileSync(filePath, "utf-8");
    assert.ok(
      !content.includes("eval(") && !content.includes("new Function("),
      `${filePath} must not contain eval() or new Function()`
    );
  }

  // Additional GL checks for model files
  const modelFiles = [
    "apps/server/models/IncomeTaxSlab.js",
    "apps/server/models/EmployeeTaxExemptionDeclaration.js",
    "apps/server/models/EmployeeTaxExemptionProofSubmission.js",
  ];

  for (const filePath of modelFiles) {
    const content = fs.readFileSync(filePath, "utf-8");
    assert.ok(
      !content.includes("docstatus") && !content.includes("journalEntry") && !content.includes("JournalEntry"),
      `${filePath} must not contain GL surface (docstatus, journalEntry, JournalEntry)`
    );
  }

  console.log("GL/no-eval sanity checks passed.");

  console.log(`\n🎉 All integration walk checks passed! (${calls} API calls executed)`);
} finally {
  console.log("\nCleaning up fixture records in reverse order...");

  // Restore employee.userId if modified
  if (modifiedEmployeeId && origUserId !== undefined) {
    try {
      await Employee.updateOne({ _id: modifiedEmployeeId }, { userId: origUserId });
    } catch (e) {
      // ignore
    }
  }

  // Soft-delete or remove tracked fixture records
  for (let i = owned.length - 1; i >= 0; i--) {
    const [Model, id] = owned[i];
    try {
      await Model.deleteOne({ _id: id });
    } catch (e) {
      // ignore
    }
  }

  const postCount = await Employee.countDocuments();
  assert.equal(postCount, baseline, `Employee count (${postCount}) must match baseline (${baseline})`);
  console.log(`Verified employee baseline preserved: ${postCount}/${baseline}`);
  await mongoose.disconnect();
}
