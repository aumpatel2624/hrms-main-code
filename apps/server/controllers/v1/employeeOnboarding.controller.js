/**
 * Employee Onboarding + Employee Onboarding Template (ADR-020, HRMS module
 * 4). No docstatus/naming-series/Project-Task — activities are embedded
 * rows with their own status; boardingStatus derives from them directly.
 * Template selection copies activities in server-side (source only did this
 * client-side). makeEmployee builds a prefilled payload only, same pattern
 * as jobOffer.controller.js's makeEmployeeFromJobOffer.
 */
import { runListQuery } from "../../utils/listQuery.js";
import EmployeeOnboarding from "../../models/EmployeeOnboarding.js";
import EmployeeOnboardingTemplate from "../../models/EmployeeOnboardingTemplate.js";
import JobApplicant from "../../models/JobApplicant.js";
import Employee from "../../models/Employee.js";
import {
  getReferencingCounts,
  formatReferenceMessage,
} from "../../utils/referenceHelper.js";

const deriveBoardingStatus = (activities = []) => {
  if (!activities.length) return "Pending";
  const completed = activities.filter((a) => a.status === "Completed").length;
  if (completed === 0) return "Pending";
  if (completed === activities.length) return "Completed";
  return "In Process";
};

const REQUIRED_FIELDS = ["jobApplicantId", "jobOfferId", "dateOfJoining", "boardingBeginsOn"];
const OPTIONAL_FIELDS = [
  "employeeOnboardingTemplateId", "companyId", "departmentId", "designationId",
  "employeeGradeId", "activities", "isActive",
];
const pickFields = (body) =>
  Object.fromEntries(
    [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].filter((k) => body[k] !== undefined).map((k) => [k, body[k]]),
  );

// ------------------------------------------------------------ Employee Onboarding --

export const createEmployeeOnboarding = async (req, res) => {
  try {
    const missing = REQUIRED_FIELDS.filter((k) => !req.body[k]);
    if (missing.length) {
      return res.status(400).json({ isOk: false, status: 400, message: `Missing required field(s): ${missing.join(", ")}` });
    }
    const { jobApplicantId, employeeOnboardingTemplateId } = req.body;

    const duplicate = await EmployeeOnboarding.findOne({ jobApplicantId });
    if (duplicate) {
      return res.status(409).json({
        isOk: false, status: 409,
        message: "An Employee Onboarding already exists for this Job Applicant",
      });
    }

    const fields = pickFields(req.body);

    // Template selection copies activities in server-side (source only did
    // this client-side — ADR-020).
    if (employeeOnboardingTemplateId && !fields.activities) {
      const template = await EmployeeOnboardingTemplate.findById(employeeOnboardingTemplateId);
      if (template) {
        // Plain objects, not the template's own live subdocuments — assigning
        // another document's Mongoose subdocuments directly crashes the global
        // audit plugin's pre-save hook (this.constructor.findById is not a
        // function on an EmbeddedDocument; a real bug found live, not in source).
        fields.activities = template.activities.map((a) => a.toObject());
        fields.companyId = fields.companyId ?? template.companyId;
        fields.departmentId = fields.departmentId ?? template.departmentId;
        fields.designationId = fields.designationId ?? template.designationId;
        fields.employeeGradeId = fields.employeeGradeId ?? template.employeeGradeId;
      }
    }

    const applicant = await JobApplicant.findById(jobApplicantId);
    if (applicant) fields.employeeName = applicant.applicantName;

    // Auto-resolve employeeId if an Employee already exists for this
    // applicant (source: set_employee) — no error if not found.
    const existingEmployee = await Employee.findOne({ jobApplicantId });
    if (existingEmployee) fields.employeeId = existingEmployee._id;

    fields.boardingStatus = deriveBoardingStatus(fields.activities);

    await EmployeeOnboarding.create(fields);
    return res.status(201).json({ isOk: true, status: 201, message: "Employee Onboarding created successfully" });
  } catch (error) {
    console.log("Error in createEmployeeOnboarding", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateEmployeeOnboarding = async (req, res) => {
  try {
    const { onboardingId } = req.params;
    const doc = await EmployeeOnboarding.findById(onboardingId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee Onboarding not found" });
    }
    Object.assign(doc, pickFields(req.body));
    doc.boardingStatus = deriveBoardingStatus(doc.activities);
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Employee Onboarding updated successfully" });
  } catch (error) {
    console.log("Error in updateEmployeeOnboarding", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteEmployeeOnboarding = async (req, res) => {
  try {
    const { onboardingId } = req.params;
    const doc = await EmployeeOnboarding.findById(onboardingId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee Onboarding not found" });
    }
    const referenceInfo = await getReferencingCounts("EmployeeOnboarding", onboardingId);
    if (referenceInfo.totalReferences > 0) {
      return res.status(409).json({
        isOk: false, status: 409, message: "Cannot delete Employee Onboarding. It is being used by other records.",
        totalReferences: referenceInfo.totalReferences, references: referenceInfo.details,
        formattedMessage: formatReferenceMessage(referenceInfo.details),
      });
    }
    await EmployeeOnboarding.findByIdAndUpdate(onboardingId, { isDeleted: true });
    return res.status(200).json({ isOk: true, status: 200, message: "Employee Onboarding deleted successfully" });
  } catch (error) {
    console.log("Error in deleteEmployeeOnboarding", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getEmployeeOnboardingById = async (req, res) => {
  try {
    const doc = await EmployeeOnboarding.findById(req.params.onboardingId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee Onboarding not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getEmployeeOnboardingById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listEmployeeOnboardings = async (req, res) => {
  try {
    const docs = await EmployeeOnboarding.find({ isActive: true }).select("jobApplicantId employeeName boardingStatus");
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    console.log("Error in listEmployeeOnboardings", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listEmployeeOnboardingsByParams = async (req, res) => {
  try {
    const list = await runListQuery(EmployeeOnboarding, req.body, {
      searchFields: ["employeeName"],
      filterable: {
        jobApplicantId: "objectId", companyId: "objectId", departmentId: "objectId",
        boardingStatus: "enum", dateOfJoining: "date", isActive: "boolean", createdAt: "date",
      },
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const markOnboardingAsCompleted = async (req, res) => {
  try {
    const doc = await EmployeeOnboarding.findById(req.params.onboardingId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee Onboarding not found" });
    }
    doc.activities.forEach((a) => { a.status = "Completed"; });
    doc.boardingStatus = "Completed";
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Employee Onboarding marked as completed" });
  } catch (error) {
    console.log("Error in markOnboardingAsCompleted", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// Prefilled Employee payload only — never auto-creates (source:
// validate_employee_creation guards the equivalent make_employee call).
export const makeEmployeeFromOnboarding = async (req, res) => {
  try {
    const doc = await EmployeeOnboarding.findById(req.params.onboardingId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee Onboarding not found" });
    }
    const incomplete = doc.activities.filter((a) => a.requiredForEmployeeCreation && a.status !== "Completed");
    if (incomplete.length) {
      return res.status(409).json({
        isOk: false, status: 409,
        message: `All mandatory activities must be completed before creating the Employee: ${incomplete.map((a) => a.activityName).join(", ")}`,
      });
    }
    const applicant = await JobApplicant.findById(doc.jobApplicantId);
    const payload = {
      employeeName: doc.employeeName || applicant?.applicantName,
      personalEmail: applicant?.emailId,
      companyId: doc.companyId,
      departmentId: doc.departmentId,
      designationId: doc.designationId,
      gradeId: doc.employeeGradeId,
      dateOfJoining: doc.dateOfJoining,
      jobApplicantId: doc.jobApplicantId,
    };
    return res.status(200).json({ isOk: true, status: 200, data: payload });
  } catch (error) {
    console.log("Error in makeEmployeeFromOnboarding", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// ----------------------------------------------------- Employee Onboarding Template --

export const createEmployeeOnboardingTemplate = async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ isOk: false, status: 400, message: "Title is required" });
    }
    const existing = await EmployeeOnboardingTemplate.findOne({ title });
    if (existing) {
      return res.status(400).json({ isOk: false, status: 400, message: "Employee Onboarding Template already exists" });
    }
    await EmployeeOnboardingTemplate.create(req.body);
    return res.status(201).json({ isOk: true, status: 201, message: "Employee Onboarding Template created successfully" });
  } catch (error) {
    console.log("Error in createEmployeeOnboardingTemplate", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateEmployeeOnboardingTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const doc = await EmployeeOnboardingTemplate.findById(templateId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee Onboarding Template not found" });
    }
    Object.assign(doc, req.body);
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Employee Onboarding Template updated successfully" });
  } catch (error) {
    console.log("Error in updateEmployeeOnboardingTemplate", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteEmployeeOnboardingTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const doc = await EmployeeOnboardingTemplate.findById(templateId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee Onboarding Template not found" });
    }
    const referenceInfo = await getReferencingCounts("EmployeeOnboardingTemplate", templateId);
    if (referenceInfo.totalReferences > 0) {
      return res.status(409).json({
        isOk: false, status: 409, message: "Cannot delete Employee Onboarding Template. It is being used by other records.",
        totalReferences: referenceInfo.totalReferences, references: referenceInfo.details,
        formattedMessage: formatReferenceMessage(referenceInfo.details),
      });
    }
    await EmployeeOnboardingTemplate.findByIdAndUpdate(templateId, { isDeleted: true });
    return res.status(200).json({ isOk: true, status: 200, message: "Employee Onboarding Template deleted successfully" });
  } catch (error) {
    console.log("Error in deleteEmployeeOnboardingTemplate", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getEmployeeOnboardingTemplateById = async (req, res) => {
  try {
    const doc = await EmployeeOnboardingTemplate.findById(req.params.templateId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee Onboarding Template not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getEmployeeOnboardingTemplateById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listEmployeeOnboardingTemplates = async (req, res) => {
  try {
    const docs = await EmployeeOnboardingTemplate.find({ isActive: true }).select("title");
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    console.log("Error in listEmployeeOnboardingTemplates", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listEmployeeOnboardingTemplatesByParams = async (req, res) => {
  try {
    const list = await runListQuery(EmployeeOnboardingTemplate, req.body, {
      searchFields: ["title"],
      filterable: { title: "string", companyId: "objectId", isActive: "boolean", createdAt: "date" },
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};
