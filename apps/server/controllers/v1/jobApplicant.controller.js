/**
 * Job Applicant (ADR-019, HRMS module 3) — a candidate's application.
 * Closed-opening and duplicate-application guards enforced server-side on
 * create (source only had these client-adjacent; there's no client form
 * step here to rely on).
 */
import { runListQuery } from "../../utils/listQuery.js";
import JobApplicant from "../../models/JobApplicant.js";
import JobOpening from "../../models/JobOpening.js";
import {
  getReferencingCounts,
  formatReferenceMessage,
} from "../../utils/referenceHelper.js";

const REQUIRED_FIELDS = ["applicantName", "emailId"];
const OPTIONAL_FIELDS = [
  "phoneNumber", "jobOpeningId", "designationId", "countryId", "status", "applicantRating",
  "resumeLink", "resumeAttachment", "coverLetter", "notes", "sourceId", "currency",
  "lowerRange", "upperRange", "isActive",
];
const pickFields = (body) =>
  Object.fromEntries(
    [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].filter((k) => body[k] !== undefined).map((k) => [k, body[k]]),
  );

const deriveNameFromEmail = (email) =>
  email.split("@")[0].split(".").filter(Boolean).map((p) => p[0].toUpperCase() + p.slice(1)).join(" ");

export const createJobApplicant = async (req, res) => {
  try {
    let { applicantName, emailId } = req.body;
    if (!emailId) {
      return res.status(400).json({ isOk: false, status: 400, message: "Email address is required" });
    }
    if (!applicantName) applicantName = deriveNameFromEmail(emailId);

    const fields = { ...pickFields(req.body), applicantName };
    const { jobOpeningId } = fields;

    if (jobOpeningId) {
      const opening = await JobOpening.findById(jobOpeningId);
      if (opening) {
        if (opening.status === "Closed") {
          return res.status(409).json({
            isOk: false, status: 409, error: "ClosedJobOpening",
            message: "Cannot create a Job Applicant against a closed Job Opening",
          });
        }
        if (!fields.designationId && opening.designationId) fields.designationId = opening.designationId;
        if (opening.preventDuplicateApplicant) {
          const duplicate = await JobApplicant.findOne({ emailId: emailId.toLowerCase(), jobOpeningId });
          if (duplicate) {
            return res.status(409).json({
              isOk: false, status: 409, error: "DuplicationError",
              message: "You have already applied for this position.",
            });
          }
        }
      }
    }

    await JobApplicant.create(fields);
    return res.status(201).json({ isOk: true, status: 201, message: "Job Applicant created successfully" });
  } catch (error) {
    console.log("Error in createJobApplicant", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateJobApplicant = async (req, res) => {
  try {
    const { applicantId } = req.params;
    const doc = await JobApplicant.findById(applicantId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Job Applicant not found" });
    }
    Object.assign(doc, pickFields(req.body));
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Job Applicant updated successfully" });
  } catch (error) {
    console.log("Error in updateJobApplicant", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteJobApplicant = async (req, res) => {
  try {
    const { applicantId } = req.params;
    const doc = await JobApplicant.findById(applicantId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Job Applicant not found" });
    }
    const referenceInfo = await getReferencingCounts("JobApplicant", applicantId);
    if (referenceInfo.totalReferences > 0) {
      return res.status(409).json({
        isOk: false, status: 409, message: "Cannot delete Job Applicant. It is being used by other records.",
        totalReferences: referenceInfo.totalReferences, references: referenceInfo.details,
        formattedMessage: formatReferenceMessage(referenceInfo.details),
      });
    }
    await JobApplicant.findByIdAndUpdate(applicantId, { isDeleted: true });
    return res.status(200).json({ isOk: true, status: 200, message: "Job Applicant deleted successfully" });
  } catch (error) {
    console.log("Error in deleteJobApplicant", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getJobApplicantById = async (req, res) => {
  try {
    const doc = await JobApplicant.findById(req.params.applicantId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Job Applicant not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getJobApplicantById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listJobApplicants = async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.jobOpeningId) filter.jobOpeningId = req.query.jobOpeningId;
    const docs = await JobApplicant.find(filter).select("applicantName emailId status jobOpeningId");
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    console.log("Error in listJobApplicants", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listJobApplicantsByParams = async (req, res) => {
  try {
    const list = await runListQuery(JobApplicant, req.body, {
      searchFields: ["applicantName", "emailId"],
      filterable: {
        applicantName: "string", emailId: "string", jobOpeningId: "objectId", designationId: "objectId",
        status: "enum", sourceId: "objectId", isActive: "boolean", createdAt: "date",
      },
      stages: [
        { $lookup: { from: "jobopenings", localField: "jobOpeningId", foreignField: "_id", as: "jobOpening" } },
        { $lookup: { from: "jobapplicantsources", localField: "sourceId", foreignField: "_id", as: "source" } },
        {
          $addFields: {
            jobOpeningTitle: { $arrayElemAt: ["$jobOpening.jobTitle", 0] },
            sourceName: { $arrayElemAt: ["$source.sourceName", 0] },
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
