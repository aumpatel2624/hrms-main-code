import assert from "node:assert/strict";
import { companyLabelledOptions, fieldLabel, goalLabel, interviewLabel, jobOfferLabel, labelledOptions, leaveAllocationLabel, leavePeriodLabel, linkedName, nameWithCompany, ofChosenCompany, ofThisCompany, payrollPeriodLabel, readableFrequency, salarySlipLabel, salaryStructureAssignmentLabel, salaryStructureLabel, shiftScheduleLabel, withSavedLeavers } from "./picker-labels.js";

const companies = { data: { data: [{ _id: "c-apd", companyName: "Apidel" }, { _id: "c-nuv", companyName: "Nuva" }] } };
const periods = { data: { data: [
    { _id: "p1", companyId: "c-apd", fromDate: "2026-01-01T00:00:00.000Z", toDate: "2026-12-31T00:00:00.000Z" },
    { _id: "p2", companyId: "c-nuv", fromDate: "2026-01-01T00:00:00.000Z", toDate: "2026-12-31T00:00:00.000Z" },
] } };

// Two companies' identical leave periods are told apart.
const periodOptions = await companyLabelledOptions(async () => periods, async () => companies, leavePeriodLabel)();
assert.deepEqual(periodOptions, [
    { value: "p1", label: "2026-01-01 – 2026-12-31 (Apidel)" },
    { value: "p2", label: "2026-01-01 – 2026-12-31 (Nuva)" },
]);

// Salary structures: frequency, currency and company.
const structures = { data: { data: [{ _id: "s1", companyId: "c-nuv", payrollFrequency: "Monthly", currency: "INR" }] } };
const structureOptions = await companyLabelledOptions(async () => structures, async () => companies, salaryStructureLabel)();
assert.equal(structureOptions[0].label, "Monthly — INR (Nuva)");
// A named structure leads with its name; an unnamed (older) one reads as before.
assert.equal(salaryStructureLabel({ salaryStructureName: "Interns", payrollFrequency: "Monthly", currency: "INR", companyId: "c-nuv" }, new Map([["c-nuv", "Nuva"]])),
    "Interns — Monthly — INR (Nuva)");

// A company the list does not know leaves the label as it was.
assert.equal(salaryStructureLabel({ payrollFrequency: "Monthly", currency: "INR", companyId: "gone" }, new Map()), "Monthly — INR");

// Job offers and interviews name the applicant (populated by the server).
assert.equal(
    jobOfferLabel({ status: "Accepted", jobApplicantId: { applicantName: "Kiran" }, companyId: { companyName: "Apidel" } }),
    "Accepted — Kiran (Apidel)",
);
assert.equal(
    interviewLabel({ jobApplicantId: { applicantName: "Kiran" }, scheduledOn: "2026-10-14T05:30:00.000Z", status: "Pending" }),
    "Kiran — 2026-10-14 (Pending)",
);

// Row dropdowns (ADR-051): two companies' "Basic" components are told apart,
// whether companyId arrives as an id or populated.
const components = { data: { data: [
    { _id: "sc1", salaryComponentName: "Basic", companyId: "c-apd" },
    { _id: "sc2", salaryComponentName: "Basic", companyId: { _id: "c-nuv", companyName: "Nuva" } },
] } };
const componentOptions = await companyLabelledOptions(async () => components, async () => companies, nameWithCompany("salaryComponentName"))();
assert.deepEqual(componentOptions.map((o) => o.label), ["Basic (Apidel)", "Basic (Nuva)"]);

// Employee form: the organization pickers ask for the chosen company only.
const asked = [];
const departments = ofChosenCompany(async (companyId) => {
    asked.push(companyId);
    return { data: { data: [{ _id: "d1", departmentName: "Engineering" }] } };
}, (row) => row.departmentName);
assert.deepEqual(await departments({ companyId: "" }), [], "no company chosen: nothing offered");
assert.deepEqual(await departments({ companyId: "c-apd" }), [{ value: "d1", label: "Engineering" }]);
await departments({ companyId: { _id: "c-nuv", companyName: "Nuva" } }); // an edit form's populated company
assert.deepEqual(asked, ["c-apd", "c-nuv"], "only the chosen company is requested");

// Payroll Correction's slip: employee name and period, not a pasted id.
const slipNames = new Map([["e1", "Asha"]]);
assert.equal(salarySlipLabel({ employeeId: "e1", startDate: "2026-09-01T00:00:00.000Z", endDate: "2026-09-30T00:00:00.000Z" }, slipNames),
    "Asha — 2026-09-01 – 2026-09-30");
assert.equal(salarySlipLabel({ employeeId: { _id: "e1" }, startDate: "2026-10-01", endDate: "2026-10-31" }, slipNames), "Asha — 2026-10-01 – 2026-10-31");

// Approver pickers: a saved approver who has left stays, labelled, not blank.
const currentStaff = [{ _id: "e1", employeeName: "Asha" }];
const everyone = [...currentStaff, { _id: "e9", employeeName: "Varun" }];
assert.deepEqual(withSavedLeavers(currentStaff, ["e9"], everyone), [
    { value: "e1", label: "Asha" }, { value: "e9", label: "Varun (left)" },
]);
assert.deepEqual(withSavedLeavers(currentStaff, ["e1"], everyone), [{ value: "e1", label: "Asha" }], "a current approver is not repeated");
assert.deepEqual(withSavedLeavers(currentStaff, [], []), [{ value: "e1", label: "Asha" }], "new forms offer only current employees");

// Look-alike pickers (28 Oct re-test): every option told apart.
const employees = { data: { data: [{ _id: "e1", employeeName: "Ekta Bansal" }, { _id: "e2", employeeName: "Varun" }] } };
const leaveTypes = { data: { data: [{ _id: "lt1", leaveTypeName: "Casual Leave" }] } };
const allocations = { data: { data: [
    { _id: "a1", employeeId: "e1", leaveTypeId: "lt1", fromDate: "2026-01-01T00:00:00.000Z", toDate: "2026-12-31T00:00:00.000Z" },
    { _id: "a2", employeeId: "e2", leaveTypeId: "lt1", fromDate: "2026-01-01T00:00:00.000Z", toDate: "2026-12-31T00:00:00.000Z" },
] } };
const allocationOptions = await labelledOptions(async () => allocations,
    [[async () => employees, "employeeName"], [async () => leaveTypes, "leaveTypeName"]], leaveAllocationLabel)();
assert.deepEqual(allocationOptions.map((o) => o.label), [
    "Ekta Bansal — Casual Leave — 2026-01-01 – 2026-12-31",
    "Varun — Casual Leave — 2026-01-01 – 2026-12-31",
]);

const names = new Map([["e1", "Ekta Bansal"], ["s1", "Standard Monthly"], ["c-apd", "Apidel"], ["st1", "Morning"]]);
assert.equal(salaryStructureAssignmentLabel({ employeeId: "e1", salaryStructureId: "s1", fromDate: "2026-09-01T00:00:00.000Z", currency: "INR" }, names),
    "Ekta Bansal — from 2026-09-01 — Standard Monthly");
assert.equal(payrollPeriodLabel({ companyId: "c-apd", startDate: "2026-04-01T00:00:00.000Z", endDate: "2027-03-31T00:00:00.000Z" }, names),
    "2026-04-01 – 2027-03-31 (Apidel)");
assert.equal(goalLabel({ goalName: "Ship the billing module", employeeIdLabel: "Ekta Bansal", companyId: "c-apd" }, names),
    "Ship the billing module — Ekta Bansal (Apidel)");
assert.equal(readableFrequency("every-1-week"), "Every week");
assert.equal(readableFrequency("every-3-weeks"), "Every 3 weeks");
assert.equal(shiftScheduleLabel({ shiftTypeId: "st1", frequency: "every-2-weeks", repeatOnDays: ["Monday", "Wednesday"], companyId: "c-apd" }, names),
    "Morning — Every 2 weeks on Mon, Wed (Apidel)");

// Goal's own list answers with runListQuery's `[{ count, data }]` wrapper.
const goals = { data: { data: [{ count: 1, data: [{ _id: "g1", goalName: "Grow", employeeIdLabel: "Varun", companyId: "c-nuv" }] }] } };
assert.deepEqual(await labelledOptions(async () => goals, [[async () => companies, "companyName"]], goalLabel)(),
    [{ value: "g1", label: "Grow — Varun (Nuva)" }]);

// A list cell whose linked record is gone reads "(deleted)", never the id.
assert.equal(linkedName("Asha", "e1"), "Asha");
assert.equal(linkedName("", "64f000000000000000000001"), "(deleted)");
assert.equal(linkedName(undefined, null), "—");

// Dashboard Builder filter fields read as words, not keys.
assert.equal(fieldLabel("employeeId"), "Employee");
assert.equal(fieldLabel("raisedByEmployeeId"), "Raised by employee");
assert.equal(fieldLabel("createdAt"), "Created at");
assert.equal(fieldLabel("isActive"), "Active");

// Re-test P3: the Company form's Basic and HRA pickers list that company's own components only.
const companyComponents = [
    { _id: "s1", salaryComponentName: "Basic Salary - APD", companyId: "c-apd" },
    { _id: "s2", salaryComponentName: "Basic - TSL", companyId: { _id: "c-tsl" } },
];
let loads = 0;
const ownComponents = ofThisCompany(async () => { loads += 1; return { data: { data: companyComponents } }; }, (row) => row.salaryComponentName);
assert.deepEqual(await ownComponents({}, { id: "c-tsl", mode: "edit" }), [{ value: "s2", label: "Basic - TSL" }], "Techno Sales sees only its own");
assert.deepEqual(await ownComponents({}, { id: "c-apd", mode: "view" }), [{ value: "s1", label: "Basic Salary - APD" }]);
assert.deepEqual(await ownComponents({}, { mode: "add" }), [], "a company not yet saved has none");
assert.equal(loads, 2, "nothing is requested for a new company");

console.log("picker-labels: all assertions passed");
