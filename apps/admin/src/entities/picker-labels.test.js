import assert from "node:assert/strict";
import { companyLabelledOptions, interviewLabel, jobOfferLabel, leavePeriodLabel, nameWithCompany, ofChosenCompany, ofThisCompany, salarySlipLabel, salaryStructureLabel, withSavedLeavers } from "./picker-labels.js";

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
