/**
 * Job Requisition (ADR-019, HRMS module 3) — headcount request, first stage
 * of the hiring funnel. `makeJobOpening` maps this into a draft Job Opening
 * payload for the client to review/save; it does not auto-create+save one.
 */
import { runListQuery } from "../../utils/listQuery.js";
import JobRequisition from "../../models/JobRequisition.js";
import {
  getReferencingCounts,
  formatReferenceMessage,
} from "../../utils/referenceHelper.js";

const REQUIRED_FIELDS = ["designationId", "companyId", "noOfPositions", "expectedCompensation", "requestedById"];
const OPTIONAL_FIELDS = [
  "departmentId", "status", "postingDate", "expectedBy", "completedOn",
  "description", "reasonForRequesting", "isActive",
];
const pickFields = (body) =>
  Object.fromEntries(
    [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].filter((k) => body[k] !== undefined).map((k) => [k, body[k]]),
  );

// completedOn required when status = Filled; time-to-fill computed the same
// moment (source: `set_time_to_fill`, only set when status is Filled and
// completedOn is present — otherwise left unchanged, not cleared).
const applyStatusRules = (doc) => {
  if (doc.status === "Filled" && !doc.completedOn) {
    throw Object.assign(new Error("completedOn is required when status is Filled"), { statusCode: 400 });
  }
  if (doc.status === "Filled" && doc.completedOn) {
    doc.timeToFillSeconds = Math.floor((new Date(doc.completedOn) - new Date(doc.postingDate)) / 1000);
  }
};

export const createJobRequisition = async (req, res) => {
  try {
    const missing = REQUIRED_FIELDS.filter((k) => req.body[k] === undefined || req.body[k] === null || req.body[k] === "");
    if (missing.length) {
      return res.status(400).json({ isOk: false, status: 400, message: `Missing required field(s): ${missing.join(", ")}` });
    }
    const doc = new JobRequisition(pickFields(req.body));
    try {
      applyStatusRules(doc);
    } catch (e) {
      return res.status(e.statusCode || 400).json({ isOk: false, status: e.statusCode || 400, message: e.message });
    }
    await doc.save();
    return res.status(201).json({ isOk: true, status: 201, message: "Job Requisition created successfully" });
  } catch (error) {
    console.log("Error in createJobRequisition", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateJobRequisition = async (req, res) => {
  try {
    const { requisitionId } = req.params;
    const doc = await JobRequisition.findById(requisitionId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Job Requisition not found" });
    }
    Object.assign(doc, pickFields(req.body));
    try {
      applyStatusRules(doc);
    } catch (e) {
      return res.status(e.statusCode || 400).json({ isOk: false, status: e.statusCode || 400, message: e.message });
    }
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Job Requisition updated successfully" });
  } catch (error) {
    console.log("Error in updateJobRequisition", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteJobRequisition = async (req, res) => {
  try {
    const { requisitionId } = req.params;
    const doc = await JobRequisition.findById(requisitionId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Job Requisition not found" });
    }
    const referenceInfo = await getReferencingCounts("JobRequisition", requisitionId);
    if (referenceInfo.totalReferences > 0) {
      return res.status(409).json({
        isOk: false, status: 409, message: "Cannot delete Job Requisition. It is being used by other records.",
        totalReferences: referenceInfo.totalReferences, references: referenceInfo.details,
        formattedMessage: formatReferenceMessage(referenceInfo.details),
      });
    }
    await JobRequisition.findByIdAndUpdate(requisitionId, { isDeleted: true });
    return res.status(200).json({ isOk: true, status: 200, message: "Job Requisition deleted successfully" });
  } catch (error) {
    console.log("Error in deleteJobRequisition", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getJobRequisitionById = async (req, res) => {
  try {
    const doc = await JobRequisition.findById(req.params.requisitionId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Job Requisition not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getJobRequisitionById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listJobRequisitions = async (req, res) => {
  try {
    const docs = await JobRequisition.find({ isActive: true }).select("designationId companyId status noOfPositions");
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    console.log("Error in listJobRequisitions", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listJobRequisitionsByParams = async (req, res) => {
  try {
    const list = await runListQuery(JobRequisition, req.body, {
      searchFields: [],
      filterable: {
        designationId: "objectId", departmentId: "objectId", companyId: "objectId",
        status: "enum", requestedById: "objectId", postingDate: "date", isActive: "boolean", createdAt: "date",
      },
      stages: [
        { $lookup: { from: "designations", localField: "designationId", foreignField: "_id", as: "designation" } },
        { $lookup: { from: "companies", localField: "companyId", foreignField: "_id", as: "company" } },
        { $lookup: { from: "employees", localField: "requestedById", foreignField: "_id", as: "requestedBy" } },
        {
          $addFields: {
            designationName: { $arrayElemAt: ["$designation.designationName", 0] },
            companyName: { $arrayElemAt: ["$company.companyName", 0] },
            requestedByName: { $arrayElemAt: ["$requestedBy.employeeName", 0] },
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

// Maps this requisition to a draft Job Opening payload — client reviews and
// POSTs it to /job-openings itself (source: `make_job_opening` mapped-doc
// pattern, never auto-saved).
export const makeJobOpeningFromRequisition = async (req, res) => {
  try {
    const { requisitionId } = req.params;
    const doc = await JobRequisition.findById(requisitionId).populate("designationId");
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Job Requisition not found" });
    }
    const payload = {
      designationId: doc.designationId?._id || doc.designationId,
      jobTitle: doc.designationId?.designationName || "",
      departmentId: doc.departmentId,
      companyId: doc.companyId,
      jobRequisitionId: doc._id,
      vacancies: doc.noOfPositions,
      status: "Open",
      lowerRange: doc.expectedCompensation,
      description: doc.description,
    };
    return res.status(200).json({ isOk: true, status: 200, data: payload });
  } catch (error) {
    console.log("Error in makeJobOpeningFromRequisition", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};
