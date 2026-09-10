/**
 * Employee Referral (ADR-021, HRMS module 5). Source's three confirmed bugs
 * are not reproduced: `status` persists whatever it's set to (source
 * force-resets to "Pending" on every save); `departmentId` fetches from
 * `referrerId` (source's fetch_from pointed at a nonexistent field);
 * `createAdditionalSalary` isn't built (Payroll doesn't exist yet — a
 * deferred-module decision, not a bug fix).
 */
import { runListQuery } from "../../utils/listQuery.js";
import EmployeeReferral from "../../models/EmployeeReferral.js";
import Employee from "../../models/Employee.js";
import JobApplicant from "../../models/JobApplicant.js";
import JobApplicantSource from "../../models/JobApplicantSource.js";
import {
  getReferencingCounts,
  formatReferenceMessage,
} from "../../utils/referenceHelper.js";

const REQUIRED_FIELDS = ["firstName", "lastName", "date", "forDesignationId", "email", "referrerId"];
const OPTIONAL_FIELDS = [
  "status", "contactNo", "currentEmployer", "currentJobTitle", "resume", "resumeLink",
  "workReferences", "isApplicableForReferralBonus", "qualificationReason", "isActive",
];
const pickFields = (body) =>
  Object.fromEntries(
    [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].filter((k) => body[k] !== undefined).map((k) => [k, body[k]]),
  );

const computeFullName = (first, last) => [first, last].filter(Boolean).join(" ");

export const createEmployeeReferral = async (req, res) => {
  try {
    const missing = REQUIRED_FIELDS.filter((k) => !req.body[k]);
    if (missing.length) {
      return res.status(400).json({ isOk: false, status: 400, message: `Missing required field(s): ${missing.join(", ")}` });
    }
    const { email, referrerId } = req.body;

    const duplicate = await EmployeeReferral.findOne({ email, status: { $ne: "Cancelled" } });
    if (duplicate) {
      return res.status(409).json({ isOk: false, status: 409, message: `Employee Referral already exists for email: ${email}` });
    }

    const fields = pickFields(req.body);
    fields.fullName = computeFullName(fields.firstName, fields.lastName);

    const referrer = await Employee.findById(referrerId);
    if (referrer) {
      fields.referrerName = referrer.employeeName;
      fields.departmentId = referrer.departmentId;
    }

    await EmployeeReferral.create(fields);
    return res.status(201).json({ isOk: true, status: 201, message: "Employee Referral created successfully" });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ isOk: false, status: 409, message: "Employee Referral already exists for this email" });
    }
    console.log("Error in createEmployeeReferral", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateEmployeeReferral = async (req, res) => {
  try {
    const { referralId } = req.params;
    const doc = await EmployeeReferral.findById(referralId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee Referral not found" });
    }
    const fields = pickFields(req.body);
    if (fields.firstName || fields.lastName) {
      fields.fullName = computeFullName(fields.firstName ?? doc.firstName, fields.lastName ?? doc.lastName);
    }
    Object.assign(doc, fields);
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Employee Referral updated successfully" });
  } catch (error) {
    console.log("Error in updateEmployeeReferral", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteEmployeeReferral = async (req, res) => {
  try {
    const { referralId } = req.params;
    const doc = await EmployeeReferral.findById(referralId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee Referral not found" });
    }
    const referenceInfo = await getReferencingCounts("EmployeeReferral", referralId);
    if (referenceInfo.totalReferences > 0) {
      return res.status(409).json({
        isOk: false, status: 409, message: "Cannot delete Employee Referral. It is being used by other records.",
        totalReferences: referenceInfo.totalReferences, references: referenceInfo.details,
        formattedMessage: formatReferenceMessage(referenceInfo.details),
      });
    }
    await EmployeeReferral.findByIdAndUpdate(referralId, { isDeleted: true });
    return res.status(200).json({ isOk: true, status: 200, message: "Employee Referral deleted successfully" });
  } catch (error) {
    console.log("Error in deleteEmployeeReferral", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getEmployeeReferralById = async (req, res) => {
  try {
    const doc = await EmployeeReferral.findById(req.params.referralId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee Referral not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getEmployeeReferralById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listEmployeeReferrals = async (_req, res) => {
  try {
    const docs = await EmployeeReferral.find({ isActive: true }).select("fullName status email");
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    console.log("Error in listEmployeeReferrals", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listEmployeeReferralsByParams = async (req, res) => {
  try {
    const list = await runListQuery(EmployeeReferral, req.body, {
      searchFields: ["fullName", "email"],
      filterable: {
        status: "enum", referrerId: "objectId", forDesignationId: "objectId",
        date: "date", isActive: "boolean", createdAt: "date",
      },
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// Real, working version of source's create_job_applicant (which had a
// case-sensitivity bug in its status branch, not reproduced here).
export const createJobApplicantFromReferral = async (req, res) => {
  try {
    const doc = await EmployeeReferral.findById(req.params.referralId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee Referral not found" });
    }
    const referralSource = await JobApplicantSource.findOne({ sourceName: "Referral" });

    const applicant = await JobApplicant.create({
      applicantName: doc.fullName,
      emailId: doc.email,
      phoneNumber: doc.contactNo,
      designationId: doc.forDesignationId,
      sourceId: referralSource?._id ?? null,
      status: "Open",
    });

    doc.status = "In Process";
    await doc.save();

    return res.status(201).json({
      isOk: true, status: 201, message: "Job Applicant created from Employee Referral",
      data: { jobApplicantId: applicant._id },
    });
  } catch (error) {
    console.log("Error in createJobApplicantFromReferral", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};
