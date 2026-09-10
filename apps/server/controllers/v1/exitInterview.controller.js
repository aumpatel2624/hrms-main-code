/**
 * Exit Interview (ADR-020, HRMS module 4). No docstatus, no email-thread/Web
 * Form questionnaire flow. Two real guards from source: the linked
 * Employee must have a relievingDate set, and only one non-cancelled Exit
 * Interview may exist per Employee at a time.
 */
import { runListQuery } from "../../utils/listQuery.js";
import ExitInterview from "../../models/ExitInterview.js";
import Employee from "../../models/Employee.js";
import {
  getReferencingCounts,
  formatReferenceMessage,
} from "../../utils/referenceHelper.js";

const REQUIRED_FIELDS = ["employeeId"];
const OPTIONAL_FIELDS = [
  "status", "date", "interviewers", "interviewSummary", "employeeStatus", "isActive",
];
const pickFields = (body) =>
  Object.fromEntries(
    [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].filter((k) => body[k] !== undefined).map((k) => [k, body[k]]),
  );

const validateAgainstEmployee = async (employeeId) => {
  const employee = await Employee.findById(employeeId);
  if (!employee) return { ok: false, status: 404, message: "Employee not found" };
  if (!employee.relievingDate) {
    return { ok: false, status: 400, message: `Please set the relieving date for employee ${employee.employeeName} first` };
  }
  return { ok: true };
};

export const createExitInterview = async (req, res) => {
  try {
    const missing = REQUIRED_FIELDS.filter((k) => !req.body[k]);
    if (missing.length) {
      return res.status(400).json({ isOk: false, status: 400, message: `Missing required field(s): ${missing.join(", ")}` });
    }
    const { employeeId } = req.body;

    const employeeCheck = await validateAgainstEmployee(employeeId);
    if (!employeeCheck.ok) {
      return res.status(employeeCheck.status).json({ isOk: false, status: employeeCheck.status, message: employeeCheck.message });
    }

    const duplicate = await ExitInterview.findOne({ employeeId, status: { $ne: "Cancelled" } });
    if (duplicate) {
      return res.status(409).json({
        isOk: false, status: 409,
        message: "An Exit Interview already exists for this Employee",
      });
    }

    const fields = pickFields(req.body);
    if (fields.status === "Scheduled" && (!fields.date || !fields.interviewers?.length)) {
      return res.status(400).json({ isOk: false, status: 400, message: "Date and interviewers are required when status is Scheduled" });
    }
    if (fields.status === "Completed" && !fields.employeeStatus) {
      return res.status(400).json({ isOk: false, status: 400, message: "Final decision is required when status is Completed" });
    }

    await ExitInterview.create(fields);
    return res.status(201).json({ isOk: true, status: 201, message: "Exit Interview created successfully" });
  } catch (error) {
    console.log("Error in createExitInterview", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateExitInterview = async (req, res) => {
  try {
    const { interviewId } = req.params;
    const doc = await ExitInterview.findById(interviewId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Exit Interview not found" });
    }
    const fields = pickFields(req.body);
    const nextStatus = fields.status ?? doc.status;
    if (nextStatus === "Scheduled" && !(fields.date ?? doc.date) && !fields.interviewers?.length && !doc.interviewers?.length) {
      return res.status(400).json({ isOk: false, status: 400, message: "Date and interviewers are required when status is Scheduled" });
    }
    if (nextStatus === "Completed" && !(fields.employeeStatus ?? doc.employeeStatus)) {
      return res.status(400).json({ isOk: false, status: 400, message: "Final decision is required when status is Completed" });
    }
    Object.assign(doc, fields);
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Exit Interview updated successfully" });
  } catch (error) {
    console.log("Error in updateExitInterview", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteExitInterview = async (req, res) => {
  try {
    const { interviewId } = req.params;
    const doc = await ExitInterview.findById(interviewId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Exit Interview not found" });
    }
    const referenceInfo = await getReferencingCounts("ExitInterview", interviewId);
    if (referenceInfo.totalReferences > 0) {
      return res.status(409).json({
        isOk: false, status: 409, message: "Cannot delete Exit Interview. It is being used by other records.",
        totalReferences: referenceInfo.totalReferences, references: referenceInfo.details,
        formattedMessage: formatReferenceMessage(referenceInfo.details),
      });
    }
    await ExitInterview.findByIdAndUpdate(interviewId, { isDeleted: true });
    return res.status(200).json({ isOk: true, status: 200, message: "Exit Interview deleted successfully" });
  } catch (error) {
    console.log("Error in deleteExitInterview", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getExitInterviewById = async (req, res) => {
  try {
    const doc = await ExitInterview.findById(req.params.interviewId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Exit Interview not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getExitInterviewById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listExitInterviews = async (req, res) => {
  try {
    const docs = await ExitInterview.find({ isActive: true }).select("employeeId status");
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    console.log("Error in listExitInterviews", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listExitInterviewsByParams = async (req, res) => {
  try {
    const list = await runListQuery(ExitInterview, req.body, {
      searchFields: [],
      filterable: { employeeId: "objectId", status: "enum", date: "date", isActive: "boolean", createdAt: "date" },
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
