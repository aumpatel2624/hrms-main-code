// Cross-company and wrong-record saves, found by the pre-production
// simulation (report section 5, U1–U3) and the ADR-048 work:
//   1. an Employee Transfer (and Promotion) stays inside the employee's
//      company — another company's department, designation or branch is refused,
//   2. an Employee Onboarding's Job Offer is the same applicant's, and its
//      company, department and designation are the offer's company,
//   3. a Leave Policy Assignment (single, bulk) and a Leave Allocation use a
//      Leave Period of the employee's own company,
//   4. an Employee's department, designation and branch are its company's,
//   5. below "all" scope (a Team Lead's "team") a leave application or an
//      expense claim is the caller's own, whoever the body names,
//   6. the approver resolvers skip a Left / Inactive / Suspended approver and
//      fall through to the next one,
//   7. an Interview's interviewers work for the interview's company (re-check
//      N2) — its job opening's, else its designation's,
//   8. a Company's Basic and HRA Salary Components are its own (re-test P3),
//      and a house rent declaration for a company without them is a clear 400,
//   9. an Employee made from a completed onboarding is linked back to it
//      (re-test P6), once, and only in the onboarding's company.
// Drives the real mounted routes (authMiddleware → checkPermission → handler)
// over in-memory stand-ins and the seeded matrices, like accessLifecycle.test.js.
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { SCOPES } from "@demo-panel/shared/scopes";
import AdminUser from "../../models/AdminUser.js";
import Attendance from "../../models/Attendance.js";
import Branch from "../../models/Branch.js";
import Company from "../../models/Company.js";
import Department from "../../models/Department.js";
import Designation from "../../models/Designation.js";
import Employee from "../../models/Employee.js";
import EmployeeOnboarding from "../../models/EmployeeOnboarding.js";
import EmployeeOnboardingTemplate from "../../models/EmployeeOnboardingTemplate.js";
import EmployeePromotion from "../../models/EmployeePromotion.js";
import EmployeePropertyChange from "../../models/EmployeePropertyChange.js";
import EmployeeTransfer from "../../models/EmployeeTransfer.js";
import ExpenseClaim from "../../models/ExpenseClaim.js";
import ExpenseClaimType from "../../models/ExpenseClaimType.js";
import Interview from "../../models/Interview.js";
import JobApplicant from "../../models/JobApplicant.js";
import JobOffer from "../../models/JobOffer.js";
import JobOpening from "../../models/JobOpening.js";
import LeaveAllocation from "../../models/LeaveAllocation.js";
import LeaveApplication from "../../models/LeaveApplication.js";
import LeaveBlockList from "../../models/LeaveBlockList.js";
import LeaveLedgerEntry from "../../models/LeaveLedgerEntry.js";
import LeavePeriod from "../../models/LeavePeriod.js";
import LeavePolicyAssignment from "../../models/LeavePolicyAssignment.js";
import LeaveType from "../../models/LeaveType.js";
import MenuMaster from "../../models/MenuMaster.js";
import SalaryComponent from "../../models/SalaryComponent.js";
import UserRoles from "../../models/UserRoles.js";
import { invalidateRoleCache } from "../../middlewares/checkPermission.js";
import { buildRoleRows } from "../../seed/org-tiers.data.js";
import { resolveApprovers } from "../../utils/approvers.js";
import { calculateAnnualEligibleHraExemption } from "../../utils/hraExemptionCalc.js";
import careerRoutes from "../../routes/v1/employeeCareerEvents.routes.js";
import employeeRoutes from "../../routes/v1/employee.routes.js";
import expenseRoutes from "../../routes/v1/expenses.routes.js";
import interviewRoutes from "../../routes/v1/interviews.routes.js";
import leaveSetupRoutes from "../../routes/v1/leaves.routes.js";
import leaveRoutes from "../../routes/v1/leavesTransactions.routes.js";
import onboardingRoutes from "../../routes/v1/onboarding.routes.js";
import organizationRoutes from "../../routes/v1/organizationSetup.routes.js";

// ---------------------------------------------------------------- stand-ins --
const same = (a, b) => String(a) === String(b);
const OPERATORS = {
  $in: (value, arg) => arg.some((x) => same(value, x)),
  $nin: (value, arg) => !arg.some((x) => same(value, x)),
  $ne: (value, arg) => !same(value ?? null, arg ?? null),
  $exists: (value, arg) => (value !== undefined) === arg,
  $lte: (value, arg) => value <= arg,
  $gte: (value, arg) => value >= arg,
};
const isOperators = (cond) => cond && typeof cond === "object" && !Array.isArray(cond) && !(cond instanceof mongoose.Types.ObjectId)
  && Object.keys(cond).length > 0 && Object.keys(cond).every((key) => key.startsWith("$"));
const matches = (row, filter = {}) => Object.entries(filter).every(([key, cond]) => {
  if (key === "$and") return cond.every((part) => matches(row, part));
  if (key === "$or") return cond.some((part) => matches(row, part));
  if (!isOperators(cond)) return same(row[key] ?? null, cond ?? null);
  return Object.entries(cond).every(([op, arg]) => {
    if (!OPERATORS[op]) throw new Error(`stand-in query: unsupported ${op}`);
    return OPERATORS[op](row[key], arg);
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
  populate: async () => row,
  validate: async () => {},
  toObject: () => Object.fromEntries(Object.entries(row).filter(([, value]) => typeof value !== "function")),
});
const stub = (Model, rows = []) => {
  rows.forEach(asDoc);
  Model.find = (filter) => query(rows.filter((row) => matches(row, filter)));
  Model.findOne = (filter) => query(rows.find((row) => matches(row, filter)) ?? null);
  Model.findById = (id) => query(rows.find((row) => same(row._id, id)) ?? null);
  Model.exists = async (filter) => (rows.find((row) => matches(row, filter)) ? { _id: oid() } : null);
  Model.create = async (data) => { const doc = asDoc({ _id: oid(), ...data }); rows.push(doc); return doc; };
  Model.insertMany = async (docs) => docs;
  Model.updateMany = async () => ({});
  Model.updateOne = async (filter, update) => {
    const row = rows.find((candidate) => matches(candidate, filter));
    if (row) Object.assign(row, update);
    return {};
  };
  return rows;
};
const fakeRes = () => ({
  statusCode: 200, body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = JSON.parse(JSON.stringify(body)); return this; },
  clearCookie() {},
});

// ----------------------------------------------------------------- fixtures --
const oid = () => new mongoose.Types.ObjectId();
const apidel = oid();
const nuva = oid();
const shreeraj = oid();
Company.exists = async () => ({ _id: apidel });

const engApd = { _id: oid(), departmentName: "Software Development", companyId: apidel };
const engNuv = { _id: oid(), departmentName: "Engineering - NUV", companyId: nuva };
const internApd = { _id: oid(), designationName: "Intern", companyId: apidel };
const internNuv = { _id: oid(), designationName: "Intern - NUV", companyId: nuva };
const vadodara = { _id: oid(), branchName: "Vadodara", companyId: apidel };
const ahmedabad = { _id: oid(), branchName: "Nuva Ahmedabad HQ", companyId: nuva };
stub(Designation, [internApd, internNuv]);
stub(Branch, [vadodara, ahmedabad]);

const TIERS = ["Employee", "Team Lead", "CEO"];
const roles = Object.fromEntries(TIERS.map((name) => [name, oid()]));
const person = (employeeName, roleName, extra = {}) => ({
  _id: oid(), employeeName, employeeCode: employeeName.toUpperCase(), email: `${employeeName}@work.example`, roleId: roles[roleName],
  companyId: apidel, departmentId: engApd._id, designationId: internApd._id, branchId: vadodara._id,
  reportsToId: null, status: "Active", isActive: true, dateOfJoining: new Date("2026-01-05"), ...extra,
});
const hema = person("hema", "CEO"); // "all" scope on leave and expenses, like HR
const manju = person("manju", "Team Lead");
const bilal = person("bilal", "Employee", { reportsToId: manju._id });
const tara = person("tara", "Employee");
const varun = person("varun", "Employee", { status: "Left" });
const kunal = person("kunal", "Employee", { status: "Inactive" });
const sita = person("sita", "Employee", { status: "Suspended" });
// nina's own approvers have left; her department's lists name a leaver and tara.
const approverDept = { _id: oid(), departmentName: "Operations", companyId: apidel, leaveApprovers: [kunal._id, tara._id], expenseApprovers: [sita._id] };
const nina = person("nina", "Employee", { departmentId: approverDept._id, leaveApproverId: varun._id, expenseApproverId: varun._id });
const apdIntern = person("apd011", "Employee");
const nuvIntern = person("nuv011", "Employee", { companyId: nuva, departmentId: engNuv._id, designationId: internNuv._id, branchId: ahmedabad._id });
const people = [hema, manju, bilal, tara, varun, kunal, sita, nina, apdIntern, nuvIntern];
for (const someone of people) someone.leaveApproverId ??= hema._id;
stub(Employee, people);
stub(Department, [engApd, engNuv, approverDept]);
const admin = { _id: oid(), adminName: "hr-admin", email: "admin@work.example", isActive: true };
stub(AdminUser, [admin]);

const menuUrls = [...new Set(TIERS.flatMap((role) => buildRoleRows(role).menuRows.map((row) => row.menuUrl)))];
const menuIdByUrl = new Map(menuUrls.map((menuUrl) => [menuUrl, oid()]));
stub(MenuMaster, menuUrls.map((menuUrl) => ({ _id: menuIdByUrl.get(menuUrl), menuUrl })));
stub(UserRoles, TIERS.map((roleName) => ({
  roleId: roles[roleName], isActive: true, dataScope: SCOPES.ALL,
  roles: buildRoleRows(roleName).menuRows.map(({ menuUrl, ...permissions }) => ({ menuId: menuIdByUrl.get(menuUrl), ...permissions })),
})));
invalidateRoleCache();

// ------------------------------------------------------------------ helpers --
const routeOf = (router, method, path) => {
  const layer = router.stack.find((entry) => entry.route?.path === path && entry.route.methods[method]);
  assert.ok(layer, `${method.toUpperCase()} ${path} is mounted`);
  return layer.route.stack.map((entry) => entry.handle);
};
const sessionOf = (caller) => (caller === admin
  ? { user: { id: String(admin._id), role: "ADMIN" } }
  : { user: { id: String(caller._id), role: "USER", roleId: String(caller.roleId), departmentId: null } });
const call = async (router, method, path, caller, { params = {}, body = {} } = {}) => {
  const req = { session: sessionOf(caller), params, body, query: {} };
  const res = fakeRes();
  for (const handle of routeOf(router, method, path)) {
    let advanced = false;
    await handle(req, res, () => { advanced = true; });
    if (!advanced) break;
  }
  return res;
};
const expectStatus = (res, status, label) => assert.equal(res.statusCode, status, `${label}: ${JSON.stringify(res.body)}`);
const expectRefused = (res, pattern, label) => {
  expectStatus(res, 400, label);
  assert.match(res.body.message, pattern, label);
};

// ------------------------------------- 1. transfers stay inside the company --
{
  const transfers = stub(EmployeeTransfer, []);
  stub(EmployeePropertyChange, []);
  const transfer = (employee, body) => call(careerRoutes, "post", "/employee-transfers", admin, {
    body: { employeeId: String(employee._id), transferDate: "2026-10-20", ...body },
  });

  expectRefused(await transfer(apdIntern, { newDepartmentId: String(engNuv._id), newDesignationId: String(internNuv._id), newBranchId: String(ahmedabad._id) }),
    /New Department must belong to the employee's company/, "Apidel intern into Nuva's department");
  expectRefused(await transfer(apdIntern, { newBranchId: String(ahmedabad._id) }), /New Branch/, "into Nuva's branch alone");
  expectRefused(await transfer(nuvIntern, { newDesignationId: String(internApd._id) }), /New Designation/, "Nuva intern into Apidel's designation");
  assert.equal(transfers.length, 0, "no transfer was recorded");
  assert.ok(same(apdIntern.departmentId, engApd._id) && same(apdIntern.branchId, vadodara._id), "the employee is unchanged");

  const otherDept = { _id: oid(), departmentName: "QA", companyId: apidel };
  stub(Department, [engApd, engNuv, approverDept, otherDept]);
  expectStatus(await transfer(apdIntern, { newDepartmentId: String(otherDept._id) }), 201, "a transfer inside Apidel");
  assert.ok(same(apdIntern.departmentId, otherDept._id), "applied to the employee");
  apdIntern.departmentId = engApd._id;

  stub(EmployeePromotion, []);
  expectRefused(await call(careerRoutes, "post", "/employee-promotions", admin, {
    body: { employeeId: String(apdIntern._id), promotionDate: "2026-10-20", newDepartmentId: String(engNuv._id) },
  }), /New Department/, "promotion into Nuva's department");
}

// ------------------------------------------- 2. onboarding on its own offer --
{
  const kiranApd = { _id: oid(), applicantName: "Kiran ApplicantAPD" };
  const kiranNuv = { _id: oid(), applicantName: "Kiran ApplicantNUV" };
  const offerApd = { _id: oid(), jobApplicantId: kiranApd._id, companyId: apidel, status: "Accepted" };
  const offerNuv = { _id: oid(), jobApplicantId: kiranNuv._id, companyId: nuva, status: "Accepted" };
  stub(JobOffer, [offerApd, offerNuv]);
  stub(EmployeeOnboardingTemplate, []);
  // The simulation's record: Apidel's onboarding of Kiran APD on Nuva's offer for Kiran NUV.
  const wrong = { _id: oid(), jobApplicantId: kiranApd._id, jobOfferId: offerNuv._id, companyId: apidel, activities: [], dateOfJoining: new Date("2026-11-01"), boardingBeginsOn: new Date("2026-10-25") };
  const onboardings = stub(EmployeeOnboarding, [wrong]);
  const onboard = (body) => call(onboardingRoutes, "post", "/employee-onboardings", admin, {
    body: { dateOfJoining: "2026-11-01", boardingBeginsOn: "2026-10-25", ...body },
  });
  const ids = (applicant, offer) => ({ jobApplicantId: String(applicant._id), jobOfferId: String(offer._id) });

  const kiranNew = { _id: oid(), applicantName: "Kiran New" };
  stub(JobApplicant, [kiranApd, kiranNuv, kiranNew]);
  expectRefused(await onboard({ ...ids(kiranNew, offerNuv), companyId: String(apidel) }), /same Job Applicant/, "another applicant's offer");
  expectRefused(await onboard({ ...ids(kiranNuv, offerNuv), companyId: String(apidel) }), /Company must be the Job Offer's company/, "another company's offer");
  expectRefused(await onboard({ ...ids(kiranNuv, offerNuv), departmentId: String(engApd._id) }), /Department must belong to the Job Offer's company/, "the offer's company, another company's department");
  assert.equal(onboardings.length, 1, "nothing was saved");

  expectStatus(await onboard(ids(kiranNuv, offerNuv)), 201, "the applicant's own offer");
  assert.ok(same(onboardings.at(-1).companyId, nuva), "a blank company takes the offer's");

  const edit = (body) => call(onboardingRoutes, "put", "/employee-onboardings/:onboardingId", admin, { params: { onboardingId: String(wrong._id) }, body });
  expectRefused(await edit({ activities: [] }), /same Job Applicant/, "editing the existing wrong record says what is wrong");
  expectStatus(await edit({ jobOfferId: String(offerApd._id) }), 200, "HR corrects it to the applicant's own offer");
  assert.ok(same(wrong.jobOfferId, offerApd._id), "corrected");
}

// ------------------------------- 3. leave periods of the employee's company --
{
  const periodApd = { _id: oid(), companyId: apidel, fromDate: new Date("2026-01-01"), toDate: new Date("2026-12-31"), isActive: true };
  const periodShr = { _id: oid(), companyId: shreeraj, fromDate: new Date("2026-01-01"), toDate: new Date("2026-12-31"), isActive: true };
  stub(LeavePeriod, [periodApd, periodShr]);
  const policyId = String(oid());
  // The simulation's record: a Nuva employee on Shreeraj Traders' period.
  const wrong = { _id: oid(), employeeId: nuvIntern._id, companyId: nuva, leavePolicyId: policyId, assignmentBasedOn: "Leave Period", leavePeriodId: periodShr._id, effectiveFrom: periodShr.fromDate, effectiveTo: periodShr.toDate };
  const assignments = stub(LeavePolicyAssignment, [wrong]);
  const assign = (period) => call(leaveSetupRoutes, "post", "/leave-policy-assignments", admin, {
    body: { employeeId: String(apdIntern._id), leavePolicyId: policyId, assignmentBasedOn: "Leave Period", leavePeriodId: String(period._id) },
  });

  expectRefused(await assign(periodShr), /Leave Period must belong to the employee's company/, "another company's leave period");
  assert.equal(assignments.length, 1, "nothing was saved");
  expectStatus(await assign(periodApd), 201, "the employee's own company's period");

  const edit = (body) => call(leaveSetupRoutes, "put", "/leave-policy-assignments/:leavePolicyAssignmentId", admin, { params: { leavePolicyAssignmentId: String(wrong._id) }, body });
  expectRefused(await edit({ carryForward: true }), /Leave Period/, "editing the existing wrong assignment");
  assignments.splice(1); // the assignment just created would overlap the one below
  expectStatus(await edit({ employeeId: String(apdIntern._id), leavePeriodId: String(periodApd._id) }), 200, "HR moves it to an Apidel employee");
  assert.ok(same(wrong.companyId, apidel), "the stored company follows the employee");

  const bulk = await call(leaveRoutes, "post", "/leave-control-panel/bulk-policy-assignments", admin, {
    body: { items: [{ employeeId: String(nuvIntern._id), leavePolicyId: policyId, assignmentBasedOn: "Leave Period", leavePeriodId: String(periodApd._id) }] },
  });
  expectStatus(bulk, 200, "bulk run");
  assert.equal(bulk.body.data.results[0].success, false, "Leave Control Panel: another company's period is refused per employee");
  assert.match(bulk.body.data.results[0].error, /Leave Period must belong/);

  const casual = { _id: oid(), leaveTypeName: "Casual Leave", isLwp: false };
  stub(LeaveType, [casual]);
  const allocations = stub(LeaveAllocation, []);
  stub(LeaveLedgerEntry, []);
  const allocate = (extra) => call(leaveSetupRoutes, "post", "/leave-allocations", admin, {
    body: { employeeId: String(apdIntern._id), leaveTypeId: String(casual._id), fromDate: "2026-01-01", toDate: "2026-12-31", ...extra },
  });
  expectRefused(await allocate({ leavePeriodId: String(periodShr._id) }), /Leave Period/, "allocation on another company's period");
  expectRefused(await allocate({ companyId: String(nuva) }), /Company must be the employee's company/, "allocation under another company");
  assert.equal(allocations.length, 0, "no allocation was saved");
  expectStatus(await allocate({ leavePeriodId: String(periodApd._id), companyId: String(apidel) }), 201, "allocation in the employee's company");
}

// ------------------------------- 4. the employee's own organization records --
{
  const save = (body) => call(employeeRoutes, "post", "/employees", admin, {
    body: {
      employeeCode: "APD099", employeeName: "New Joiner", email: "joiner@work.example", password: "Demo@1234", roleId: String(roles.Employee),
      companyId: String(apidel), departmentId: String(engApd._id), designationId: String(internApd._id), branchId: String(vadodara._id), dateOfJoining: "2026-11-01", ...body,
    },
  });
  expectRefused(await save({ departmentId: String(engNuv._id) }), /Department must belong to the employee's company/, "new Apidel employee in Nuva's department");
  expectRefused(await save({ branchId: String(ahmedabad._id) }), /Branch/, "in Nuva's branch");

  const edit = (body) => call(employeeRoutes, "put", "/employees/:employeeId", admin, { params: { employeeId: String(apdIntern._id) }, body });
  expectRefused(await edit({ designationId: String(internNuv._id) }), /Designation/, "edited to Nuva's designation");
  expectRefused(await edit({ companyId: String(nuva) }), /Department/, "moved to Nuva keeping Apidel's department");
  assert.ok(same(apdIntern.companyId, apidel) && same(apdIntern.designationId, internApd._id), "the employee is unchanged");
  expectStatus(await edit({ employeeName: "APD011 renamed" }), 200, "an edit inside the company still saves");
}

// ------------------------------------- 5. team scope files for itself only --
{
  const leaveType = { _id: oid(), leaveTypeName: "Leave Without Pay", isLwp: true, includeHoliday: true, isActive: true };
  stub(LeaveType, [leaveType]);
  stub(LeaveAllocation, []);
  stub(LeaveBlockList, []);
  stub(LeaveLedgerEntry, []);
  stub(Attendance, []);
  const leaves = stub(LeaveApplication, []);
  const expenseType = { _id: oid(), name: "Travel", description: "Travel" };
  stub(ExpenseClaimType, [expenseType]);
  const claims = stub(ExpenseClaim, []);
  let day = 1;
  const applyLeave = (caller, employee) => {
    const date = `2026-11-${String(day += 1).padStart(2, "0")}`;
    return call(leaveRoutes, "post", "/leave-applications", caller, {
      body: { employeeId: String(employee._id), leaveTypeId: String(leaveType._id), fromDate: date, toDate: date },
    });
  };
  const fileExpense = (caller, employee) => call(expenseRoutes, "post", "/expense-claims", caller, {
    body: { employeeId: String(employee._id), expenses: [{ expenseTypeId: String(expenseType._id), expenseDate: "2026-10-20", amount: 500 }] },
  });

  expectStatus(await applyLeave(manju, bilal), 201, "Team Lead applies leave naming a report");
  assert.ok(same(leaves.at(-1).employeeId, manju._id), "the leave is the Team Lead's own");
  expectStatus(await fileExpense(manju, bilal), 201, "Team Lead files a claim naming a report");
  assert.ok(same(claims.at(-1).employeeId, manju._id), "the claim is the Team Lead's own");

  expectStatus(await applyLeave(hema, bilal), 201, "an all-scope caller applies leave for an employee");
  assert.ok(same(leaves.at(-1).employeeId, bilal._id), "all scope still files on someone's behalf");
  expectStatus(await fileExpense(hema, bilal), 201, "an all-scope caller files a claim for an employee");
  assert.ok(same(claims.at(-1).employeeId, bilal._id), "and the claim is that employee's");

  // ---------------------------------- 6. leaver approvers are skipped --
  assert.deepEqual(await resolveApprovers(nina._id, "leave"), [String(tara._id)],
    "a Left direct approver falls through to the department; its Inactive approver is skipped too");
  assert.deepEqual(await resolveApprovers(nina._id, "expense"), [], "a Suspended department approver is skipped");
  assert.deepEqual(await resolveApprovers(bilal._id, "leave"), [String(hema._id)], "a current direct approver still wins");

  expectStatus(await applyLeave(nina, nina), 201, "nina applies for leave");
  assert.ok(same(leaves.at(-1).leaveApproverId, tara._id), "it goes to the current department approver, not the leaver");
  expectStatus(await fileExpense(nina, nina), 201, "nina files a claim");
  assert.equal(claims.at(-1).expenseApproverId, null, "with nobody current to approve it, the claim waits for HR, not a leaver");
}

// --------------------------- 7. interviewers from the interview's company --
{
  const opening = { _id: oid(), jobTitle: "Intern", companyId: apidel, designationId: internApd._id };
  stub(JobOpening, [opening]);
  const kiran = { _id: oid(), applicantName: "kiran", jobOpeningId: opening._id, designationId: internApd._id };
  const noor = { _id: oid(), applicantName: "noor", jobOpeningId: null, designationId: internNuv._id };
  stub(JobApplicant, [kiran, noor]);
  const interviews = stub(Interview, []);
  const schedule = (applicant, interviewers) => call(interviewRoutes, "post", "/interviews", admin, {
    body: { interviewTypeId: String(oid()), jobApplicantId: String(applicant._id), scheduledOn: "2026-11-20", fromTime: "10:00", toTime: "11:00",
      interviewers: interviewers.map((someone) => String(someone._id)) },
  });

  expectRefused(await schedule(kiran, [tara, nuvIntern]), /Interviewer must belong to the interview's company/,
    "Nuva's employee on an Apidel opening's interview");
  expectRefused(await schedule(noor, [tara]), /Interviewer/, "Apidel's employee on a Nuva designation's interview");
  assert.equal(interviews.length, 0, "no interview was recorded");

  expectStatus(await schedule(kiran, [tara, manju]), 201, "Apidel interviewers on an Apidel interview");
  expectStatus(await schedule(noor, [nuvIntern]), 201, "a Nuva interviewer on a Nuva interview");
  const [saved] = interviews;
  const edit = (body) => call(interviewRoutes, "put", "/interviews/:interviewId", admin, { params: { interviewId: String(saved._id) }, body });
  expectRefused(await edit({ interviewers: [String(nuvIntern._id)] }), /Interviewer/, "editing in another company's interviewer");
  assert.deepEqual(saved.interviewers.map(String), [String(tara._id), String(manju._id)], "the interviewers are unchanged");
  expectStatus(await edit({ interviewers: [String(bilal._id)], interviewSummary: "Strong" }), 200, "editing in an Apidel interviewer");
  assert.deepEqual(saved.interviewers.map(String), [String(bilal._id)]);
}

// ------------------------------ 8. a company's own Basic and HRA components --
{
  const basicApd = { _id: oid(), salaryComponentName: "Basic Salary - APD", companyId: apidel };
  const hraApd = { _id: oid(), salaryComponentName: "House Rent Allowance - APD", companyId: apidel };
  const basicTsl = { _id: oid(), salaryComponentName: "Basic - TSL", companyId: shreeraj };
  stub(SalaryComponent, [basicApd, hraApd, basicTsl]);
  const techno = { _id: shreeraj, companyName: "Techno Sales", companyCode: "TSL", basicComponentId: null, hraComponentId: null, isActive: true };
  const companies = stub(Company, [techno]);
  const edit = (body) => call(organizationRoutes, "put", "/companies/:companyId", admin, {
    params: { companyId: String(techno._id) }, body: { companyName: "Techno Sales", companyCode: "TSL", isActive: true, ...body },
  });

  expectRefused(await edit({ basicComponentId: String(basicApd._id), hraComponentId: String(hraApd._id) }), /Basic Salary Component must be one of this company's own/,
    "Techno Sales saved with Apidel's components");
  expectRefused(await edit({ basicComponentId: String(basicTsl._id), hraComponentId: String(hraApd._id) }), /HRA Salary Component must be one of this company's own/,
    "its own Basic with Apidel's HRA");
  assert.equal(techno.basicComponentId, null, "nothing was stored");
  expectStatus(await edit({ basicComponentId: String(basicTsl._id), hraComponentId: "" }), 200, "its own Basic, no HRA yet");
  assert.ok(same(techno.basicComponentId, basicTsl._id));

  const create = (body) => call(organizationRoutes, "post", "/companies", admin, { body: { companyName: "Kaveri Foods", isActive: true, ...body } });
  expectRefused(await create({ basicComponentId: String(basicApd._id) }), /Basic Salary Component/, "a new company with Apidel's Basic");
  expectStatus(await create({}), 201, "a new company without components");
  assert.equal(companies.length, 2);

  // House rent declared for a company with no HRA component: HR's setup, a 400 that says so.
  const period = { startDate: new Date("2026-04-01"), endDate: new Date("2027-03-31") };
  await assert.rejects(
    calculateAnnualEligibleHraExemption({ employeeId: apdIntern._id, companyId: techno._id, payrollPeriod: period, monthlyHouseRent: 9000, rentedInMetroCity: false }),
    (error) => error.status === 400 && /HR must set the Basic Salary Component and the HRA Salary Component on the company "Techno Sales"/.test(error.message),
    "a missing HRA component is a 400 naming the company and the setting",
  );
}

// ------------------------- 9. an onboarded hire's employee links back to it --
{
  const ravi = { _id: oid(), applicantName: "Ravi ApplicantTRP", status: "Open" };
  stub(JobApplicant, [ravi]);
  stub(JobOffer, []);
  const onboarding = { _id: oid(), jobApplicantId: ravi._id, companyId: apidel, employeeId: null, boardingStatus: "Completed", dateOfJoining: new Date("2026-11-02"),
    activities: [{ activityName: "Laptop", status: "Completed", requiredForEmployeeCreation: true }] };
  stub(EmployeeOnboarding, [onboarding]);
  stub(Department, [engApd, engNuv, approverDept]);

  // Create Employee hands the Add Employee form the hire's details.
  const prefill = await call(onboardingRoutes, "post", "/employee-onboardings/:onboardingId/make-employee", admin, { params: { onboardingId: String(onboarding._id) } });
  expectStatus(prefill, 200, "Create Employee on a completed onboarding");
  assert.ok(same(prefill.body.data.jobApplicantId, ravi._id), "the form carries the hire's applicant");

  const save = (body) => call(employeeRoutes, "post", "/employees", admin, {
    body: {
      ...prefill.body.data, email: "ravi@work.example", password: "Demo@1234", roleId: String(roles.Employee),
      employeeCode: "APD120", departmentId: String(engApd._id), designationId: String(internApd._id), branchId: String(vadodara._id), ...body,
    },
  });
  expectRefused(await save({ employeeCode: "NUV120", email: "ravi.nuv@work.example", companyId: String(nuva), departmentId: String(engNuv._id),
    designationId: String(internNuv._id), branchId: String(ahmedabad._id) }), /company of this hire's onboarding/, "saved under another company");
  assert.equal(onboarding.employeeId, null, "not linked");

  expectStatus(await save({}), 201, "HR saves the prefilled form");
  const created = people.find((someone) => someone.employeeCode === "APD120");
  assert.ok(created, "the employee exists");
  assert.ok(same(onboarding.employeeId, created._id), "the onboarding names its employee");
  assert.equal(ravi.status, "Accepted", "the applicant is hired");

  const again = await save({ employeeCode: "APD121", email: "ravi2@work.example" });
  expectStatus(again, 409, "a second employee for the same hire");
  assert.ok(same(onboarding.employeeId, created._id), "the link is unchanged");
}

console.log("companyIntegrity.test.js passed");
