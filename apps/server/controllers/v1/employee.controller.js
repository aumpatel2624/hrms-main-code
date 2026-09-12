/**
 * Employee (ADR-018, HRMS module 2) — the hub every later HRMS module
 * foreign-keys to. Its own file, unlike the grouped Organization Setup
 * masters, since it is substantially bigger (required refs, self-referential
 * reportsToId, several optional fields other modules will read).
 */
import { runListQuery } from "../../utils/listQuery.js";
import Employee from "../../models/Employee.js";
import JobApplicant from "../../models/JobApplicant.js";
import JobOffer from "../../models/JobOffer.js";
import {
  getReferencingCounts,
  formatReferenceMessage,
} from "../../utils/referenceHelper.js";

const REQUIRED_FIELDS = ["employeeCode", "employeeName", "companyId", "departmentId", "designationId", "branchId", "dateOfJoining"];

const OPTIONAL_FIELDS = [
  "userId", "reportsToId", "status", "relievingDate", "dateOfBirth", "gender",
  "employmentTypeId", "gradeId", "expenseApproverId", "leaveApproverId", "shiftRequestApproverId",
  "healthInsuranceProviderId", "healthInsuranceNo", "shiftPreference", "workMode",
  "ifscCode", "panNumber", "micrCode", "providentFundAccount",
  "jobApplicantId", "isActive",
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

    const fields = pickFields(req.body);
    await Employee.create(fields);
    await syncJobApplicantAndOffer(fields.jobApplicantId);
    return res.status(201).json({ isOk: true, status: 201, message: "Employee created successfully" });
  } catch (error) {
    console.log("Error in createEmployee", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
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

    Object.assign(employee, pickFields(req.body));
    await employee.save();

    return res.status(200).json({ isOk: true, status: 200, message: "Employee updated successfully" });
  } catch (error) {
    console.log("Error in updateEmployee", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
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
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getEmployeeById = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: employee });
  } catch (error) {
    console.log("Error in getEmployeeById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// Dropdown source (reports-to picker, and any other form embedding an
// employee select) — matrix-free like the other module-1 list GETs.
export const listEmployees = async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.companyId) filter.companyId = req.query.companyId;
    if (req.query.departmentId) filter.departmentId = req.query.departmentId;
    const employees = await Employee.find(filter).select("employeeCode employeeName departmentId designationId");
    return res.status(200).json({ isOk: true, status: 200, data: employees });
  } catch (error) {
    console.log("Error in listEmployees", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listEmployeeByParams = async (req, res) => {
  try {
    const list = await runListQuery(Employee, req.body, {
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
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};
