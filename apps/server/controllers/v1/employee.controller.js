/**
 * Employee (ADR-018, HRMS module 2) — the hub every later HRMS module
 * foreign-keys to. Its own file, unlike the grouped Organization Setup
 * masters, since it is substantially bigger (required refs, self-referential
 * reportsToId, several optional fields other modules will read).
 */
import bcrypt from "bcrypt";
import { runListQuery } from "../../utils/listQuery.js";
import Employee, { NO_ACCESS_STATUSES } from "../../models/Employee.js";
import JobApplicant from "../../models/JobApplicant.js";
import JobOffer from "../../models/JobOffer.js";
import EmployeeOnboarding from "../../models/EmployeeOnboarding.js";
import Department from "../../models/Department.js";
import Designation from "../../models/Designation.js";
import Branch from "../../models/Branch.js";
import { companyMismatch } from "../../utils/companyMatch.js";
import {
  getReferencingCounts,
  formatReferenceMessage,
} from "../../utils/referenceHelper.js";
import { ROLES } from "@demo-panel/shared/roles";
import { SCOPES } from "@demo-panel/shared/scopes";
import { resolveRequestEmployee } from "../../utils/requestEmployee.js";
import { menuDataScope, resolveUserScope } from "../../middlewares/checkPermission.js";
import { buildScopeFilter } from "../../utils/scope.js";
import { employeeFieldsFor } from "../../utils/employeeFields.js";
import { getSubordinateEmployeeIds } from "../../utils/subordinates.js";

// Pre-launch, org-chart manager visibility (SCOPES.TEAM): a plain Employee
// gets no grant on this screen at all (HR-only master data, INV-8c); a
// manager (someone with direct reports, Employee.reportsToId) instead sees
// their own profile plus their whole downward reporting chain — the model
// IS the Employee, so the "owner" field buildScopeFilter matches against is
// its own `_id`, same convention scope.js's own docstring uses for `User`.
const employeeTeamScopeFilter = async (req) => {
  if (!req.user || req.user.role === ROLES.ADMIN) return null;
  // OWN (the org-tier "Employee" role) is the same filter with no team:
  // buildScopeFilter narrows to `_id === req.user.id`.
  if (req.user.dataScope === SCOPES.OWN) return buildScopeFilter(req.user, { owner: "_id" });
  // DEPARTMENT (F3): the caller's own department as their record has it now.
  if (req.user.dataScope === SCOPES.DEPARTMENT) {
    const departmentId = (await resolveRequestEmployee(req))?.departmentId;
    return { departmentId: departmentId ?? { $in: [] } };
  }
  if (req.user.dataScope !== SCOPES.TEAM) return null;
  await resolveRequestEmployee(req);
  const teamIds = await getSubordinateEmployeeIds(req.user.employeeId);
  return buildScopeFilter(req.user, { owner: "_id", teamIds });
};

const failure = (res, error) => {
  if (error.status) {
    return res.status(error.status).json({ isOk: false, status: error.status, message: error.message });
  }
  if (error.name === "ValidationError" || error.name === "CastError" || error.code === 11000) {
    return res.status(400).json({
      isOk: false,
      status: 400,
      message: error.code === 11000 ? "A record with these unique values already exists" : error.message,
    });
  }
  console.error("Employee request failed", error);
  return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
};

// ADR-040: email/password/roleId are required — Employee is the login
// identity now (the former separate `User` collection was merged in; this
// company confirmed every employee always has exactly one login).
const REQUIRED_FIELDS = [
  "employeeCode", "employeeName", "companyId", "departmentId", "designationId", "branchId", "dateOfJoining",
  "email", "password", "roleId",
];

const OPTIONAL_FIELDS = [
  "reportsToId", "status", "relievingDate", "dateOfBirth", "gender",
  "employmentTypeId", "gradeId", "expenseApproverId", "leaveApproverId", "shiftRequestApproverId",
  "healthInsuranceProviderId", "healthInsuranceNo", "shiftPreference", "workMode",
  "ifscCode", "panNumber", "micrCode", "providentFundAccount",
  "jobApplicantId", "isActive",
  "mobileNumber", "countryId", "stateId", "cityId", "address",
];

// Reverse hook (ADR-019): an Employee created from an accepted Job Offer
// flips the linked Job Applicant and its most recent non-Cancelled Job
// Offer to Accepted. Source's equivalent (`update_job_applicant_and_offer`)
// fires unconditionally on every Employee insert and no-ops when
// job_applicant is empty — same shape here, called from createEmployee only.
const syncJobApplicantAndOffer = async (jobApplicantId) => {
  if (!jobApplicantId) return;
  const applicant = await JobApplicant.findById(jobApplicantId);
  if (applicant && applicant.status !== "Accepted") {
    applicant.status = "Accepted";
    await applicant.save();
  }
  const offer = await JobOffer.findOne({ jobApplicantId, status: { $ne: "Cancelled" } }).sort({ createdAt: -1 });
  if (offer && offer.status !== "Accepted") {
    offer.status = "Accepted";
    await offer.save();
  }
};

// Department, Designation and Branch are the employee's own company's.
const organizationMismatch = (fields) => companyMismatch(fields.companyId, [
  { Model: Department, id: fields.departmentId, label: "Department" },
  { Model: Designation, id: fields.designationId, label: "Designation" },
  { Model: Branch, id: fields.branchId, label: "Branch" },
]);

const pickFields = (body) =>
  Object.fromEntries(
    [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]
      .filter((key) => body[key] !== undefined)
      .map((key) => [key, body[key]]),
  );

export const createEmployee = async (req, res) => {
  try {
    const missing = REQUIRED_FIELDS.filter((key) => !req.body[key]);
    if (missing.length) {
      return res.status(400).json({
        isOk: false,
        status: 400,
        message: `Missing required field(s): ${missing.join(", ")}`,
      });
    }

    const existing = await Employee.findOne({ employeeCode: req.body.employeeCode });
    if (existing) {
      return res.status(400).json({ isOk: false, status: 400, message: "Employee code already exists" });
    }
    if (await Employee.findOne({ email: String(req.body.email || "").toLowerCase() })) {
      return res.status(400).json({ isOk: false, status: 400, message: "Email already exists" });
    }

    const fields = pickFields(req.body);
    const mismatch = await organizationMismatch(fields);
    if (mismatch) return res.status(400).json({ isOk: false, status: 400, message: mismatch });
    // An employee made from a completed onboarding (its Create Employee
    // button prefills this form) is linked back to it: once, and only in the
    // onboarding's own company.
    const onboarding = fields.jobApplicantId ? await EmployeeOnboarding.findOne({ jobApplicantId: fields.jobApplicantId }) : null;
    if (onboarding?.employeeId) {
      return res.status(409).json({ isOk: false, status: 409, message: "This hire's onboarding already has an Employee" });
    }
    if (onboarding?.companyId && String(onboarding.companyId) !== String(fields.companyId)) {
      return res.status(400).json({ isOk: false, status: 400, message: "Company must be the company of this hire's onboarding" });
    }
    fields.password = await bcrypt.hash(fields.password, 10);
    const employee = await Employee.create(fields);
    if (onboarding) await EmployeeOnboarding.updateOne({ _id: onboarding._id }, { employeeId: employee._id });
    await syncJobApplicantAndOffer(fields.jobApplicantId);
    return res.status(201).json({ isOk: true, status: 201, message: "Employee created successfully" });
  } catch (error) {
    console.log("Error in createEmployee", error);
    return failure(res, error);
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee not found" });
    }

    if (req.body.employeeCode && req.body.employeeCode !== employee.employeeCode) {
      const duplicate = await Employee.findOne({ employeeCode: req.body.employeeCode, _id: { $ne: employeeId } });
      if (duplicate) {
        return res.status(400).json({ isOk: false, status: 400, message: "Employee code already exists" });
      }
    }
    if (req.body.email && req.body.email !== employee.email) {
      const duplicate = await Employee.findOne({ email: String(req.body.email || "").toLowerCase(), _id: { $ne: employeeId } });
      if (duplicate) {
        return res.status(400).json({ isOk: false, status: 400, message: "Email already exists" });
      }
    }

    // Password changes only ever go through resetEmployeePassword below —
    // never silently accepted on a general profile update.
    const fields = pickFields(req.body);
    delete fields.password;
    const { companyId, departmentId, designationId, branchId } = employee;
    const mismatch = await organizationMismatch({ companyId, departmentId, designationId, branchId, ...fields });
    if (mismatch) return res.status(400).json({ isOk: false, status: 400, message: mismatch });
    Object.assign(employee, fields);
    await employee.save();

    return res.status(200).json({ isOk: true, status: 200, message: "Employee updated successfully" });
  } catch (error) {
    console.log("Error in updateEmployee", error);
    return failure(res, error);
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee not found" });
    }

    const referenceInfo = await getReferencingCounts("Employee", employeeId);
    if (referenceInfo.totalReferences > 0) {
      return res.status(409).json({
        isOk: false,
        status: 409,
        message: "Cannot delete employee. It is being used by other records.",
        totalReferences: referenceInfo.totalReferences,
        references: referenceInfo.details,
        formattedMessage: formatReferenceMessage(referenceInfo.details),
      });
    }

    await Employee.findByIdAndUpdate(employeeId, { isDeleted: true });
    return res.status(200).json({ isOk: true, status: 200, message: "Employee deleted successfully" });
  } catch (error) {
    console.log("Error in deleteEmployee", error);
    return failure(res, error);
  }
};

export const getEmployeeById = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const scopeFilter = await employeeTeamScopeFilter(req);
    const employee = await Employee.findOne({ $and: [{ _id: employeeId }, scopeFilter ?? {}] }).select("-password").lean();
    if (!employee) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: employeeFieldsFor(req.user, employee) });
  } catch (error) {
    console.log("Error in getEmployeeById", error);
    return failure(res, error);
  }
};

// Dropdown source (reports-to picker, approver pickers, and any other form
// embedding an employee select). Not tied to the Employee screen's grant —
// roles without that screen (Leave/Expense Approver, Interviewer) fill their
// pickers from it too — but it is the whole staff list, so (ADR-047) the
// session must still resolve to a live account, and only ADMIN and a caller
// whose Employee-screen scope is "all" (HR) get every company; anyone else
// gets their own company's people.
export const listEmployees = async (req, res) => {
  try {
    if (!(await resolveUserScope(req))) {
      res.clearCookie("sessionId");
      return res.status(401).json({ isOk: false, status: 401, message: "Session invalid or expired" });
    }
    const filter = { isActive: true };
    if (req.query.companyId) filter.companyId = req.query.companyId;
    if (req.query.departmentId) filter.departmentId = req.query.departmentId;
    // ?current=true: approver / reviewer / interviewer pickers — someone who
    // has left cannot decide anything. Other pickers (Full and Final, Exit
    // Interview…) still need the leavers.
    if (req.query.current === "true") filter.status = { $nin: NO_ACCESS_STATUSES };
    const groupWide = (await menuDataScope(req, "/employee", "read")) === SCOPES.ALL;
    const company = groupWide ? {} : { companyId: (await resolveRequestEmployee(req))?.companyId ?? { $in: [] } };
    const employees = await Employee.find({ $and: [filter, company] }).select("employeeCode employeeName companyId departmentId designationId");
    return res.status(200).json({ isOk: true, status: 200, data: employees });
  } catch (error) {
    console.log("Error in listEmployees", error);
    return failure(res, error);
  }
};

export const listEmployeeByParams = async (req, res) => {
  try {
    const scopeFilter = await employeeTeamScopeFilter(req);
    const list = await runListQuery(Employee, req.body, {
      scopeFilter,
      searchFields: ["employeeCode", "employeeName"],
      filterable: {
        employeeCode: "string",
        employeeName: "string",
        companyId: "objectId",
        departmentId: "objectId",
        designationId: "objectId",
        branchId: "objectId",
        status: "enum",
        dateOfJoining: "date",
        isActive: "boolean",
        createdAt: "date",
      },
      stages: [
        { $lookup: { from: "companies", localField: "companyId", foreignField: "_id", as: "company" } },
        { $lookup: { from: "departments", localField: "departmentId", foreignField: "_id", as: "department" } },
        { $lookup: { from: "designations", localField: "designationId", foreignField: "_id", as: "designation" } },
        { $lookup: { from: "branches", localField: "branchId", foreignField: "_id", as: "branch" } },
        { $lookup: { from: "employees", localField: "reportsToId", foreignField: "_id", as: "reportsTo" } },
        {
          $addFields: {
            companyName: { $arrayElemAt: ["$company.companyName", 0] },
            departmentName: { $arrayElemAt: ["$department.departmentName", 0] },
            designationName: { $arrayElemAt: ["$designation.designationName", 0] },
            branchName: { $arrayElemAt: ["$branch.branchName", 0] },
            reportsToName: { $arrayElemAt: ["$reportsTo.employeeName", 0] },
          },
        },
      ],
      // reportsTo is the manager's whole joined document — only its name
      // (reportsToName above) is for the browser.
      project: { password: 0, reportsTo: 0 },
    });
    for (const page of list) page.data = page.data.map((row) => employeeFieldsFor(req.user, row));
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log(error);
    return failure(res, error);
  }
};

// ADR-040: password reset lives here, not on a general profile update —
// same "findByIdAndUpdate, not save()" reasoning the old User controller's
// resetUserPassword used: save() re-validates the whole document, so an
// employee record that predates a later-added required field could never
// have its password reset over an unrelated validation error.
export const resetEmployeePassword = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ isOk: false, status: 400, message: "Password is required" });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee not found" });
    }

    const hashed = await bcrypt.hash(password, 10);
    await employee.updateOne({ $set: { password: hashed } });

    return res.status(200).json({ isOk: true, status: 200, message: "Password reset successfully" });
  } catch (error) {
    console.log("Error in resetEmployeePassword", error);
    return failure(res, error);
  }
};
