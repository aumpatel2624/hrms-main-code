// Explicit opt-in integration walk for Module 13: Payroll — Benefits (ADR-029)
// Exercises all 5 doctypes, 3 payout methods, preview calculations, ledger postings,
// cancellation cascades, and baseline restoration.
import "../apps/server/models/softDelete.js";
import "../apps/server/models/auditPlugin.js";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Employee from "../apps/server/models/Employee.js";
import PayrollPeriod from "../apps/server/models/PayrollPeriod.js";
import PayrollSettings from "../apps/server/models/PayrollSettings.js";
import SalaryComponent from "../apps/server/models/SalaryComponent.js";
import SalaryStructure from "../apps/server/models/SalaryStructure.js";
import SalaryStructureAssignment from "../apps/server/models/SalaryStructureAssignment.js";
import SalarySlip from "../apps/server/models/SalarySlip.js";
import AdditionalSalary from "../apps/server/models/AdditionalSalary.js";
import EmployeeBenefitApplication from "../apps/server/models/EmployeeBenefitApplication.js";
import EmployeeBenefitClaim from "../apps/server/models/EmployeeBenefitClaim.js";
import EmployeeBenefitLedger from "../apps/server/models/EmployeeBenefitLedger.js";
import PayrollCorrection from "../apps/server/models/PayrollCorrection.js";

dotenv.config({ path: "apps/server/.env", quiet: true });
if (process.env.RUN_PAYROLL_BENEFITS_VERIFY !== "1") {
  throw new Error("Set RUN_PAYROLL_BENEFITS_VERIFY=1 to run this local fixture walk");
}

const base = `http://127.0.0.1:${process.env.PORT || 7002}/api/v1`;
const prefix = `ben-verify-${Date.now()}`;
const owned = [];
const tracked = (Model, doc) => {
  if (doc && doc._id) owned.push([Model, doc._id]);
  return doc;
};
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

let originalMandatorySetting = false;

try {
  cookie = await login(process.env.SEED_ADMIN_EMAIL || "admin@example.com", process.env.SEED_ADMIN_PASSWORD || "Admin@123");

  const employee = await Employee.findOne({ status: "Active", dateOfJoining: { $ne: null } }).lean();
  assert.ok(employee, "Fixture employee exists");
  const companyId = String(employee.companyId);
  const employeeId = String(employee._id);

  const settingsDoc = await PayrollSettings.findOne({ key: "default" });
  if (settingsDoc) originalMandatorySetting = settingsDoc.mandatoryBenefitApplication;

  // =========================================================================
  // 1. Validation guards on SalaryComponent flags (ADR-029)
  // =========================================================================
  console.log("Checking SalaryComponent validation guards...");

  // Must reject flexible benefit with missing payoutMethod
  await call("POST", "/salary-components", {
    companyId,
    salaryComponentName: `${prefix} Invalid1`,
    abbreviation: "INV1",
    type: "Earning",
    isFlexibleBenefit: true,
  }, 400);

  // Must reject accrual payout method with accrualComponent = false
  await call("POST", "/salary-components", {
    companyId,
    salaryComponentName: `${prefix} Invalid2`,
    abbreviation: "INV2",
    type: "Earning",
    isFlexibleBenefit: true,
    payoutMethod: "Accrue per cycle, pay only on claim",
    accrualComponent: false,
  }, 400);

  // Must reject flexible benefit on Deduction type
  await call("POST", "/salary-components", {
    companyId,
    salaryComponentName: `${prefix} Invalid3`,
    abbreviation: "INV3",
    type: "Deduction",
    isFlexibleBenefit: true,
    payoutMethod: "Allow claim for full benefit amount",
  }, 400);

  // Valid components for the 3 payout methods:
  // Method 1: Accrue and payout at end of payroll period
  const compAutoEnd = await create(SalaryComponent, "/salary-components", {
    companyId,
    salaryComponentName: `${prefix} AutoEnd`,
    abbreviation: "AUTOEND",
    type: "Earning",
    isFlexibleBenefit: true,
    accrualComponent: true,
    doNotIncludeInTotal: true,
    payoutMethod: "Accrue and payout at end of payroll period",
    maxBenefitAmount: 12000,
  });

  // Method 2: Accrue per cycle, pay only on claim
  const compAccrueClaim = await create(SalaryComponent, "/salary-components", {
    companyId,
    salaryComponentName: `${prefix} AccrueClaim`,
    abbreviation: "ACCLAIM",
    type: "Earning",
    isFlexibleBenefit: true,
    accrualComponent: true,
    doNotIncludeInTotal: true,
    payoutMethod: "Accrue per cycle, pay only on claim",
    finalCycleAccrualPayout: true,
    maxBenefitAmount: 24000,
  });

  // Method 3: Allow claim for full benefit amount
  const compFullClaim = await create(SalaryComponent, "/salary-components", {
    companyId,
    salaryComponentName: `${prefix} FullClaim`,
    abbreviation: "FULLCLM",
    type: "Earning",
    isFlexibleBenefit: true,
    accrualComponent: false,
    payoutMethod: "Allow claim for full benefit amount",
    maxBenefitAmount: 18000,
  });

  // Standard Basic component
  const compBasic = await create(SalaryComponent, "/salary-components", {
    companyId,
    salaryComponentName: `${prefix} Basic`,
    abbreviation: "BSC",
    type: "Earning",
    dependsOnPaymentDays: true,
  });

  console.log("Salary components created successfully.");

  // =========================================================================
  // 2. Payroll Period & Salary Structure with Benefit Details
  // =========================================================================
  console.log("Setting up Payroll Period, Salary Structure, and Assignment...");

  const periodStart = new Date("2026-01-01");
  const periodEnd = new Date("2026-12-31");
  const period = await create(PayrollPeriod, "/payroll-periods", {
    companyId,
    startDate: periodStart.toISOString(),
    endDate: periodEnd.toISOString(),
  });

  const structure = await create(SalaryStructure, "/salary-structures", {
    companyId,
    payrollFrequency: "Monthly",
    currency: "USD",
    maxBenefits: 40000,
    employeeBenefits: [
      { salaryComponentId: compAutoEnd._id, amount: 6000 },
      { salaryComponentId: compAccrueClaim._id, amount: 12000 },
      { salaryComponentId: compFullClaim._id, amount: 18000 },
    ],
    earnings: [
      { salaryComponentId: compBasic._id, amount: 5000, dependsOnPaymentDays: true },
      { salaryComponentId: compAutoEnd._id, amount: 500, accrualComponent: true, doNotIncludeInTotal: true },
      { salaryComponentId: compAccrueClaim._id, amount: 1000, accrualComponent: true, doNotIncludeInTotal: true },
    ],
  });

  const assignment = await create(SalaryStructureAssignment, "/salary-structure-assignments", {
    employeeId,
    salaryStructureId: structure._id,
    fromDate: "2026-01-01",
    base: 5000,
    maxBenefits: 40000,
    employeeBenefits: [
      { salaryComponentId: compAutoEnd._id, amount: 6000 },
      { salaryComponentId: compAccrueClaim._id, amount: 12000 },
      { salaryComponentId: compFullClaim._id, amount: 18000 },
    ],
  });

  // Verify partial update bug fix: updating base does NOT wipe out maxBenefits or employeeBenefits
  await call("PUT", `/salary-structure-assignments/${assignment._id}`, {
    base: 5500,
  }, 200);
  const reloadedAssignment = await SalaryStructureAssignment.findById(assignment._id).lean();
  assert.equal(reloadedAssignment.base, 5500);
  assert.equal(reloadedAssignment.maxBenefits, 40000);
  assert.equal(reloadedAssignment.employeeBenefits.length, 3);
  console.log("SalaryStructureAssignment partial update preserved benefit configuration.");

  // =========================================================================
  // 3. Employee Benefit Application Lifecycle
  // =========================================================================
  console.log("Testing Employee Benefit Application...");

  // Reject electing non-flexible component
  await call("POST", "/employee-benefit-applications", {
    employeeId,
    payrollPeriodId: period._id,
    employeeBenefits: [{ salaryComponentId: compBasic._id, amount: 1000 }],
  }, 400);

  // Reject electing 'Accrue and payout at end of payroll period'
  await call("POST", "/employee-benefit-applications", {
    employeeId,
    payrollPeriodId: period._id,
    employeeBenefits: [{ salaryComponentId: compAutoEnd._id, amount: 1000 }],
  }, 400);

  // Reject exceeding max benefits ceiling
  await call("POST", "/employee-benefit-applications", {
    employeeId,
    payrollPeriodId: period._id,
    employeeBenefits: [
      { salaryComponentId: compAccrueClaim._id, amount: 24000 },
      { salaryComponentId: compFullClaim._id, amount: 18000 }, // sum 42000 > 40000
    ],
  }, 400);

  // Create valid draft application
  const app = await create(EmployeeBenefitApplication, "/employee-benefit-applications", {
    employeeId,
    payrollPeriodId: period._id,
    employeeBenefits: [
      { salaryComponentId: compAccrueClaim._id, amount: 12000 },
      { salaryComponentId: compFullClaim._id, amount: 15000 },
    ],
    remarks: "2026 Benefits Election",
  });

  // Verify server-calculated fields
  assert.equal(app.totalAmount, 27000);
  assert.equal(app.remainingBenefit, 13000); // 40000 - 27000
  assert.equal(app.status, "draft");

  // Submit application
  const submitAppRes = await call("POST", `/employee-benefit-applications/${app._id}/submit`, {}, 200);
  assert.equal(submitAppRes.data.status, "submitted");

  // Duplicate active/submitted application for same period should be rejected
  await call("POST", "/employee-benefit-applications", {
    employeeId,
    payrollPeriodId: period._id,
    employeeBenefits: [{ salaryComponentId: compFullClaim._id, amount: 5000 }],
  }, 400);

  console.log("Employee Benefit Application created, validated, and submitted.");

  // =========================================================================
  // 4. Employee Benefit Claim & Eligibility Engine
  // =========================================================================
  console.log("Testing Employee Benefit Claim and Eligibility calculation...");

  // Check eligibility for compFullClaim (Method 3: full amount claimable from day 1)
  const fullEligRes = await call("POST", "/employee-benefit-claims/calculate-eligibility", {
    employeeId,
    salaryComponentId: compFullClaim._id,
    claimDate: "2026-03-15",
  }, 200);
  assert.equal(fullEligRes.data.eligibleAmount, 15000); // as allocated in submitted app

  // Check eligibility for compAccrueClaim (Method 2: pro-rata preview for cycle)
  const accrueEligRes = await call("POST", "/employee-benefit-claims/calculate-eligibility", {
    employeeId,
    salaryComponentId: compAccrueClaim._id,
    claimDate: "2026-03-15",
  }, 200);
  assert.ok(accrueEligRes.data.eligibleAmount > 0, "Pro-rata preview computed positive eligible amount");

  // Reject claim exceeding eligible amount
  await call("POST", "/employee-benefit-claims", {
    employeeId,
    salaryComponentId: compFullClaim._id,
    claimDate: "2026-03-15",
    claimedAmount: 20000, // > 15000
  }, 400);

  // Create valid claim
  const claim = await create(EmployeeBenefitClaim, "/employee-benefit-claims", {
    employeeId,
    salaryComponentId: compFullClaim._id,
    claimDate: "2026-03-15",
    claimedAmount: 5000,
    remarks: "Medical checkup claim",
  });
  assert.equal(claim.status, "draft");

  // Submit claim -> generates active AdditionalSalary (4th producer)
  const submitClaimRes = await call("POST", `/employee-benefit-claims/${claim._id}/submit`, {}, 200);
  assert.equal(submitClaimRes.data.status, "submitted");
  assert.ok(submitClaimRes.data.additionalSalaryId, "Linked AdditionalSalary generated");

  const linkedAddSal = await AdditionalSalary.findById(submitClaimRes.data.additionalSalaryId).lean();
  tracked(AdditionalSalary, linkedAddSal);
  assert.equal(linkedAddSal.amount, 5000);
  assert.equal(linkedAddSal.type, "Earning");
  assert.equal(linkedAddSal.refDoctype, "EmployeeBenefitClaim");
  assert.equal(linkedAddSal.status, "active");
  assert.equal(String(linkedAddSal.refDocnameId), String(claim._id));

  // Cancel claim -> cascades to cancel linked AdditionalSalary (uniform cancellation pattern)
  const cancelClaimRes = await call("POST", `/employee-benefit-claims/${claim._id}/cancel`, {}, 200);
  assert.equal(cancelClaimRes.data.status, "cancelled");
  const cancelledAddSal = await AdditionalSalary.findById(linkedAddSal._id).lean();
  assert.equal(cancelledAddSal.status, "cancelled");
  console.log("Claim submission generated AdditionalSalary and cancel cascade verified.");

  // Create and submit a real claim to test Salary Slip payout
  const payoutClaim = await create(EmployeeBenefitClaim, "/employee-benefit-claims", {
    employeeId,
    salaryComponentId: compFullClaim._id,
    claimDate: "2026-01-15",
    claimedAmount: 4000,
  });
  const payoutSubmitRes = await call("POST", `/employee-benefit-claims/${payoutClaim._id}/submit`, {}, 200);
  const payoutAddSalId = payoutSubmitRes.data.additionalSalaryId;
  tracked(AdditionalSalary, { _id: payoutAddSalId });

  // =========================================================================
  // 5. Salary Slip Lifecycle & Benefit Ledger Posting
  // =========================================================================
  console.log("Testing Salary Slip lifecycle and Employee Benefit Ledger postings...");

  // Cycle 1: 2026-01-01 to 2026-01-31
  const slip1 = await create(SalarySlip, "/salary-slips", {
    employeeId,
    startDate: "2026-01-01",
    endDate: "2026-01-31",
  });

  // Verify the payoutClaim (AdditionalSalary 4000) was merged into earnings
  const claimEarning = (slip1.earnings || []).find((e) => String(e.salaryComponentId) === String(compFullClaim._id));
  assert.ok(claimEarning, "Claim AdditionalSalary was merged into SalarySlip earnings");
  assert.equal(claimEarning.amount, 4000);

  // Submit SalarySlip 1 -> writes Accruals and Payouts to EmployeeBenefitLedger
  await call("POST", `/salary-slips/${slip1._id}/submit`, {}, 200);

  const ledgerEntriesSlip1 = await EmployeeBenefitLedger.find({ salarySlipId: slip1._id, isDeleted: { $ne: true } }).lean();
  assert.ok(ledgerEntriesSlip1.length > 0, "Ledger entries posted for SalarySlip submit");

  const accrualEntry = ledgerEntriesSlip1.find((l) => l.transactionType === "Accrual" && String(l.salaryComponentId) === String(compAutoEnd._id));
  assert.ok(accrualEntry, "Accrual ledger entry posted for accrualComponent");

  const payoutEntry = ledgerEntriesSlip1.find((l) => l.transactionType === "Payout" && String(l.salaryComponentId) === String(compFullClaim._id));
  assert.ok(payoutEntry, "Payout ledger entry posted for claim paid on slip");
  assert.equal(payoutEntry.amount, 4000);

  // Cancel SalarySlip 1 -> ledger cascade soft-deletes ledger rows
  await call("POST", `/salary-slips/${slip1._id}/cancel`, {}, 200);
  const remainingSlip1Entries = await EmployeeBenefitLedger.find({ salarySlipId: slip1._id, isDeleted: { $ne: true } }).lean();
  assert.equal(remainingSlip1Entries.length, 0, "SalarySlip cancellation soft-deleted linked ledger entries");
  console.log("Salary Slip ledger submit posting and cancellation cascade verified.");

  // Submit cycle 2 slip (2026-02-01 to 2026-02-28) so we have ledger balance for final cycle test
  const slip2 = await create(SalarySlip, "/salary-slips", {
    employeeId,
    startDate: "2026-02-01",
    endDate: "2026-02-28",
  });
  await call("POST", `/salary-slips/${slip2._id}/submit`, {}, 200);

  // Final cycle slip: 2026-12-01 to 2026-12-31 (matches period.endDate)
  const finalSlip = await create(SalarySlip, "/salary-slips", {
    employeeId,
    startDate: "2026-12-01",
    endDate: "2026-12-31",
  });
  await call("POST", `/salary-slips/${finalSlip._id}/submit`, {}, 200);

  // Final cycle should have triggered automatic payout for compAutoEnd (Method 1)
  const finalLedgerEntries = await EmployeeBenefitLedger.find({ salarySlipId: finalSlip._id, isDeleted: { $ne: true } }).lean();
  const autoPayout = finalLedgerEntries.find(
    (l) => l.transactionType === "Payout" && String(l.salaryComponentId) === String(compAutoEnd._id)
  );
  assert.ok(autoPayout, "Final cycle automatic payout posted to Benefit Ledger for Method 1");
  console.log("Final cycle automatic payout verified.");

  // =========================================================================
  // 6. Payroll Correction (Q-20) Lifecycle
  // =========================================================================
  console.log("Testing Payroll Correction (Q-20)...");

  // Create a slip with simulated LWP days
  const lwpSlip = await create(SalarySlip, "/salary-slips", {
    employeeId,
    startDate: "2026-05-01",
    endDate: "2026-05-31",
  });
  // Simulate 3 LWP days on draft and save directly
  await SalarySlip.findByIdAndUpdate(lwpSlip._id, {
    lwpDays: 3,
    paymentDays: 28,
    totalWorkingDays: 31,
  });
  await call("POST", `/salary-slips/${lwpSlip._id}/submit`, {}, 200);

  // Test breakup calculation preview
  const breakupRes = await call("POST", "/payroll-corrections/calculate-breakup", {
    salarySlipId: lwpSlip._id,
    daysToReverse: 2,
  }, 200);
  assert.equal(breakupRes.data.daysToReverse, 2);
  assert.equal(breakupRes.data.remainingLwpDays, 1); // 3 - 2 = 1

  // Reject reversing more days than available (e.g. 4 > 3)
  await call("POST", "/payroll-corrections/calculate-breakup", {
    salarySlipId: lwpSlip._id,
    daysToReverse: 4,
  }, 400);

  // Create PayrollCorrection draft for 2 days
  const correction = await create(PayrollCorrection, "/payroll-corrections", {
    salarySlipId: lwpSlip._id,
    daysToReverse: 2,
    remarks: "Late approved medical leave regularisation",
  });
  assert.equal(correction.status, "draft");
  assert.equal(correction.daysToReverse, 2);

  // Second correction trying to reverse 2 more days (2 + 2 = 4 > 3) must be rejected
  await call("POST", "/payroll-corrections", {
    salarySlipId: lwpSlip._id,
    daysToReverse: 2,
  }, 400);

  // Submit PayrollCorrection -> creates AdditionalSalary + EmployeeBenefitLedger
  const submitCorrRes = await call("POST", `/payroll-corrections/${correction._id}/submit`, {}, 200);
  assert.equal(submitCorrRes.data.status, "submitted");

  const corrAddSalaries = await AdditionalSalary.find({ refDoctype: "PayrollCorrection", refDocnameId: correction._id }).lean();
  for (const a of corrAddSalaries) tracked(AdditionalSalary, a);

  // Cancel PayrollCorrection -> cancels AdditionalSalary and soft-deletes ledger entries
  await call("POST", `/payroll-corrections/${correction._id}/cancel`, {}, 200);

  const cancelledCorrAddSalaries = await AdditionalSalary.find({ refDoctype: "PayrollCorrection", refDocnameId: correction._id, status: "active" }).lean();
  assert.equal(cancelledCorrAddSalaries.length, 0, "Payroll Correction cancel cancelled linked AdditionalSalary records");

  const cancelledCorrLedger = await EmployeeBenefitLedger.find({ refDoctype: "PayrollCorrection", refDocnameId: correction._id, isDeleted: { $ne: true } }).lean();
  assert.equal(cancelledCorrLedger.length, 0, "Payroll Correction cancel reversed linked EmployeeBenefitLedger records");
  console.log("Payroll Correction breakup, submission, and cancellation cascade verified.");

  // =========================================================================
  // 7. Read-Only API Protection on EmployeeBenefitLedger
  // =========================================================================
  console.log("Verifying EmployeeBenefitLedger read-only API protection...");

  // List & Get work
  const ledgerList = await call("GET", "/employee-benefit-ledgers", undefined, 200);
  assert.ok(Array.isArray(ledgerList.data));

  // POST, PUT, DELETE must return 404 (routes do not exist)
  await call("POST", "/employee-benefit-ledgers", { amount: 100 }, 404);
  await call("PUT", `/employee-benefit-ledgers/${ledgerEntriesSlip1[0]?._id || employeeId}`, { amount: 100 }, 404);
  await call("DELETE", `/employee-benefit-ledgers/${ledgerEntriesSlip1[0]?._id || employeeId}`, undefined, 404);
  console.log("EmployeeBenefitLedger read-only API protection verified.");

  console.log(`\n🎉 All integration walk checks passed! (${calls} API calls executed)`);
} finally {
  console.log("\nCleaning up fixture records in reverse order...");
  // Restore PayrollSettings
  await PayrollSettings.updateOne({ key: "default" }, { mandatoryBenefitApplication: originalMandatorySetting });

  // Soft-delete or remove tracked fixture records
  for (let i = owned.length - 1; i >= 0; i--) {
    const [Model, id] = owned[i];
    try {
      await Model.deleteOne({ _id: id });
    } catch (e) {
      // ignore
    }
  }

  // Clean any remaining benefit ledgers created in tests
  await EmployeeBenefitLedger.deleteMany({ remarks: { $regex: /Accrual from Salary Slip|Payout via Employee Benefit Claim|Final cycle automatic payout/ } });

  const postCount = await Employee.countDocuments();
  assert.equal(postCount, baseline, `Employee count (${postCount}) must match baseline (${baseline})`);
  console.log(`Verified employee baseline preserved: ${postCount}/${baseline}`);
  await mongoose.disconnect();
}
