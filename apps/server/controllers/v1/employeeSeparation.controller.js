/**
 * Employee Separation + Employee Separation Template (ADR-020, HRMS module
 * 4). Same activities/boardingStatus shape as Employee Onboarding. Adds a
 * duplicate-active-separation-per-employee guard the source spec flagged as
 * missing (a deliberate improvement, recorded in ADR-020, not silently
 * added). department/designation/grade/company/resignationLetterDate are
 * fetched from Employee — authoritative over the template, matching
 * source's own resolved inconsistency (Employee wins).
 */
import { runListQuery } from "../../utils/listQuery.js";
import EmployeeSeparation from "../../models/EmployeeSeparation.js";
import EmployeeSeparationTemplate from "../../models/EmployeeSeparationTemplate.js";
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

const REQUIRED_FIELDS = ["employeeId", "boardingBeginsOn"];
const OPTIONAL_FIELDS = ["employeeSeparationTemplateId", "activities", "exitInterviewSummary", "isActive"];
const pickFields = (body) =>
  Object.fromEntries(
    [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].filter((k) => body[k] !== undefined).map((k) => [k, body[k]]),
  );

// ------------------------------------------------------------ Employee Separation --

export const createEmployeeSeparation = async (req, res) => {
  try {
    const missing = REQUIRED_FIELDS.filter((k) => !req.body[k]);
    if (missing.length) {
      return res.status(400).json({ isOk: false, status: 400, message: `Missing required field(s): ${missing.join(", ")}` });
    }
    const { employeeId, employeeSeparationTemplateId } = req.body;

    const duplicate = await EmployeeSeparation.findOne({ employeeId });
    if (duplicate) {
      return res.status(409).json({
        isOk: false, status: 409,
        message: "An Employee Separation already exists for this Employee",
      });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee not found" });
    }

    const fields = pickFields(req.body);

    if (employeeSeparationTemplateId && !fields.activities) {
      const template = await EmployeeSeparationTemplate.findById(employeeSeparationTemplateId);
      // Plain objects, not the template's own live subdocuments — see the
      // matching note in employeeOnboarding.controller.js.
      if (template) fields.activities = template.activities.map((a) => a.toObject());
    }

    fields.boardingStatus = deriveBoardingStatus(fields.activities);

    const doc = await EmployeeSeparation.create(fields);
    return res.status(201).json({ isOk: true, status: 201, message: "Employee Separation created successfully", data: { _id: doc._id } });
  } catch (error) {
    console.log("Error in createEmployeeSeparation", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateEmployeeSeparation = async (req, res) => {
  try {
    const { separationId } = req.params;
    const doc = await EmployeeSeparation.findById(separationId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee Separation not found" });
    }
    Object.assign(doc, pickFields(req.body));
    doc.boardingStatus = deriveBoardingStatus(doc.activities);
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Employee Separation updated successfully" });
  } catch (error) {
    console.log("Error in updateEmployeeSeparation", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteEmployeeSeparation = async (req, res) => {
  try {
    const { separationId } = req.params;
    const doc = await EmployeeSeparation.findById(separationId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee Separation not found" });
    }
    const referenceInfo = await getReferencingCounts("EmployeeSeparation", separationId);
    if (referenceInfo.totalReferences > 0) {
      return res.status(409).json({
        isOk: false, status: 409, message: "Cannot delete Employee Separation. It is being used by other records.",
        totalReferences: referenceInfo.totalReferences, references: referenceInfo.details,
        formattedMessage: formatReferenceMessage(referenceInfo.details),
      });
    }
    await EmployeeSeparation.findByIdAndUpdate(separationId, { isDeleted: true });
    return res.status(200).json({ isOk: true, status: 200, message: "Employee Separation deleted successfully" });
  } catch (error) {
    console.log("Error in deleteEmployeeSeparation", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getEmployeeSeparationById = async (req, res) => {
  try {
    const doc = await EmployeeSeparation.findById(req.params.separationId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee Separation not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getEmployeeSeparationById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listEmployeeSeparations = async (req, res) => {
  try {
    const docs = await EmployeeSeparation.find({ isActive: true }).select("employeeId boardingStatus");
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    console.log("Error in listEmployeeSeparations", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listEmployeeSeparationsByParams = async (req, res) => {
  try {
    const list = await runListQuery(EmployeeSeparation, req.body, {
      searchFields: [],
      filterable: {
        employeeId: "objectId", boardingStatus: "enum", isActive: "boolean", createdAt: "date",
      },
      stages: [
        { $lookup: { from: "employees", localField: "employeeId", foreignField: "_id", as: "employee" } },
        { $addFields: { employeeName: { $arrayElemAt: ["$employee.employeeName", 0] } } },
      ],
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// ----------------------------------------------------- Employee Separation Template --

export const createEmployeeSeparationTemplate = async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ isOk: false, status: 400, message: "Title is required" });
    }
    const existing = await EmployeeSeparationTemplate.findOne({ title });
    if (existing) {
      return res.status(400).json({ isOk: false, status: 400, message: "Employee Separation Template already exists" });
    }
    await EmployeeSeparationTemplate.create(req.body);
    return res.status(201).json({ isOk: true, status: 201, message: "Employee Separation Template created successfully" });
  } catch (error) {
    console.log("Error in createEmployeeSeparationTemplate", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateEmployeeSeparationTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const doc = await EmployeeSeparationTemplate.findById(templateId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee Separation Template not found" });
    }
    Object.assign(doc, req.body);
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Employee Separation Template updated successfully" });
  } catch (error) {
    console.log("Error in updateEmployeeSeparationTemplate", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteEmployeeSeparationTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const doc = await EmployeeSeparationTemplate.findById(templateId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee Separation Template not found" });
    }
    const referenceInfo = await getReferencingCounts("EmployeeSeparationTemplate", templateId);
    if (referenceInfo.totalReferences > 0) {
      return res.status(409).json({
        isOk: false, status: 409, message: "Cannot delete Employee Separation Template. It is being used by other records.",
        totalReferences: referenceInfo.totalReferences, references: referenceInfo.details,
        formattedMessage: formatReferenceMessage(referenceInfo.details),
      });
    }
    await EmployeeSeparationTemplate.findByIdAndUpdate(templateId, { isDeleted: true });
    return res.status(200).json({ isOk: true, status: 200, message: "Employee Separation Template deleted successfully" });
  } catch (error) {
    console.log("Error in deleteEmployeeSeparationTemplate", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getEmployeeSeparationTemplateById = async (req, res) => {
  try {
    const doc = await EmployeeSeparationTemplate.findById(req.params.templateId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee Separation Template not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getEmployeeSeparationTemplateById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listEmployeeSeparationTemplates = async (req, res) => {
  try {
    const docs = await EmployeeSeparationTemplate.find({ isActive: true }).select("title");
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    console.log("Error in listEmployeeSeparationTemplates", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listEmployeeSeparationTemplatesByParams = async (req, res) => {
  try {
    const list = await runListQuery(EmployeeSeparationTemplate, req.body, {
      searchFields: ["title"],
      filterable: { title: "string", companyId: "objectId", isActive: "boolean", createdAt: "date" },
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};
