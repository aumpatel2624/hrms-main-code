/**
 * Job Opening (ADR-019, HRMS module 3) — a vacancy posting. `route` is the
 * public-listing slug, server-generated when publish is set. Closing an
 * opening linked to a Job Requisition marks that requisition Filled
 * (application-code side effect, not a docstatus hook — ADR-016).
 */
import { runListQuery } from "../../utils/listQuery.js";
import JobOpening from "../../models/JobOpening.js";
import Company from "../../models/Company.js";
import JobRequisition from "../../models/JobRequisition.js";
import {
  getReferencingCounts,
  formatReferenceMessage,
} from "../../utils/referenceHelper.js";

const REQUIRED_FIELDS = ["jobTitle", "designationId", "companyId"];
const OPTIONAL_FIELDS = [
  "status", "postedOn", "closesOn", "closedOn", "departmentId", "employmentTypeId", "branchId",
  "jobRequisitionId", "vacancies", "staffingPlanId", "plannedVacancies", "publish",
  "preventDuplicateApplicant", "route", "publishSalaryRange", "publishApplicationsReceived",
  "description", "currency", "lowerRange", "upperRange", "salaryPer", "isActive",
];
const pickFields = (body) =>
  Object.fromEntries(
    [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].filter((k) => body[k] !== undefined).map((k) => [k, body[k]]),
  );

const scrub = (value) =>
  String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

// Server-authoritative slug generation (source has a client/server
// discrepancy on underscore-vs-hyphen handling in job_title — server wins,
// per ADR-019 Port Notes).
const ensureRoute = async (doc) => {
  if (doc.publish && !doc.route) {
    const company = await Company.findById(doc.companyId);
    doc.route = `${scrub(company?.companyName)}/${scrub(doc.jobTitle).replace(/_/g, "-")}`;
  }
};

// Closing an opening linked to a requisition marks that requisition Filled
// (source: `update_job_requisition_status`).
const syncRequisitionOnClose = async (doc, previousStatus) => {
  if (doc.status === "Closed" && previousStatus !== "Closed" && doc.jobRequisitionId) {
    await JobRequisition.findByIdAndUpdate(doc.jobRequisitionId, { status: "Filled", completedOn: new Date() });
  }
  if (doc.status === "Closed" && previousStatus !== "Closed" && !doc.closedOn) {
    doc.closedOn = new Date();
  }
  if (doc.status === "Open" && previousStatus === "Closed") {
    doc.closedOn = null;
  }
};

export const createJobOpening = async (req, res) => {
  try {
    const missing = REQUIRED_FIELDS.filter((k) => !req.body[k]);
    if (missing.length) {
      return res.status(400).json({ isOk: false, status: 400, message: `Missing required field(s): ${missing.join(", ")}` });
    }
    const doc = new JobOpening(pickFields(req.body));
    await ensureRoute(doc);
    await syncRequisitionOnClose(doc, null);
    await doc.save();
    return res.status(201).json({ isOk: true, status: 201, message: "Job Opening created successfully" });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ isOk: false, status: 400, message: "A Job Opening with this route already exists" });
    }
    console.log("Error in createJobOpening", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateJobOpening = async (req, res) => {
  try {
    const { openingId } = req.params;
    const doc = await JobOpening.findById(openingId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Job Opening not found" });
    }
    const previousStatus = doc.status;
    Object.assign(doc, pickFields(req.body));
    await ensureRoute(doc);
    await syncRequisitionOnClose(doc, previousStatus);
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Job Opening updated successfully" });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ isOk: false, status: 400, message: "A Job Opening with this route already exists" });
    }
    console.log("Error in updateJobOpening", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteJobOpening = async (req, res) => {
  try {
    const { openingId } = req.params;
    const doc = await JobOpening.findById(openingId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Job Opening not found" });
    }
    const referenceInfo = await getReferencingCounts("JobOpening", openingId);
    if (referenceInfo.totalReferences > 0) {
      return res.status(409).json({
        isOk: false, status: 409, message: "Cannot delete Job Opening. It is being used by other records.",
        totalReferences: referenceInfo.totalReferences, references: referenceInfo.details,
        formattedMessage: formatReferenceMessage(referenceInfo.details),
      });
    }
    await JobOpening.findByIdAndUpdate(openingId, { isDeleted: true });
    return res.status(200).json({ isOk: true, status: 200, message: "Job Opening deleted successfully" });
  } catch (error) {
    console.log("Error in deleteJobOpening", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getJobOpeningById = async (req, res) => {
  try {
    const doc = await JobOpening.findById(req.params.openingId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Job Opening not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getJobOpeningById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listJobOpenings = async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.status) filter.status = req.query.status;
    const docs = await JobOpening.find(filter).select("jobTitle designationId companyId status publish");
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    console.log("Error in listJobOpenings", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listJobOpeningsByParams = async (req, res) => {
  try {
    const list = await runListQuery(JobOpening, req.body, {
      searchFields: ["jobTitle", "description"],
      filterable: {
        jobTitle: "string", designationId: "objectId", status: "enum", companyId: "objectId",
        departmentId: "objectId", employmentTypeId: "objectId", branchId: "objectId",
        publish: "boolean", postedOn: "date", isActive: "boolean", createdAt: "date",
      },
      stages: [
        { $lookup: { from: "designations", localField: "designationId", foreignField: "_id", as: "designation" } },
        { $lookup: { from: "companies", localField: "companyId", foreignField: "_id", as: "company" } },
        { $lookup: { from: "departments", localField: "departmentId", foreignField: "_id", as: "department" } },
        {
          $addFields: {
            designationName: { $arrayElemAt: ["$designation.designationName", 0] },
            companyName: { $arrayElemAt: ["$company.companyName", 0] },
            departmentName: { $arrayElemAt: ["$department.departmentName", 0] },
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
