/**
 * Interview (ADR-019, HRMS module 3) — one scheduled round. Duplicate-type
 * and designation-mismatch guards enforced on create; `rescheduleInterview`
 * is the one path allowed to change scheduledOn/fromTime/toTime after
 * creation (they're otherwise treated as set-once, matching source).
 */
import { runListQuery } from "../../utils/listQuery.js";
import Interview from "../../models/Interview.js";
import JobApplicant from "../../models/JobApplicant.js";
import {
  getReferencingCounts,
  formatReferenceMessage,
} from "../../utils/referenceHelper.js";

const REQUIRED_FIELDS = ["interviewTypeId", "jobApplicantId", "scheduledOn", "fromTime", "toTime"];
const OPTIONAL_FIELDS = ["jobOpeningId", "designationId", "status", "interviewers", "interviewSummary", "isActive"];
const pickFields = (body) =>
  Object.fromEntries(
    [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].filter((k) => body[k] !== undefined).map((k) => [k, body[k]]),
  );

export const createInterview = async (req, res) => {
  try {
    const missing = REQUIRED_FIELDS.filter((k) => !req.body[k]);
    if (missing.length) {
      return res.status(400).json({ isOk: false, status: 400, message: `Missing required field(s): ${missing.join(", ")}` });
    }
    const { interviewTypeId, jobApplicantId } = req.body;

    const duplicate = await Interview.findOne({ interviewTypeId, jobApplicantId, status: { $ne: "Cancelled" } });
    if (duplicate) {
      return res.status(409).json({
        isOk: false, status: 409,
        message: "Job Applicants are not allowed to appear twice for the same Interview Type",
      });
    }

    const fields = pickFields(req.body);
    const applicant = await JobApplicant.findById(jobApplicantId);
    if (applicant) {
      if (!fields.jobOpeningId && applicant.jobOpeningId) fields.jobOpeningId = applicant.jobOpeningId;
      if (fields.designationId) {
        if (applicant.designationId && String(fields.designationId) !== String(applicant.designationId)) {
          return res.status(400).json({
            isOk: false, status: 400,
            message: "Interview Type is only for the Designation the Job Applicant applied for",
          });
        }
      } else if (applicant.designationId) {
        fields.designationId = applicant.designationId;
      }
    }

    await Interview.create(fields);
    return res.status(201).json({ isOk: true, status: 201, message: "Interview created successfully" });
  } catch (error) {
    console.log("Error in createInterview", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateInterview = async (req, res) => {
  try {
    const { interviewId } = req.params;
    const doc = await Interview.findById(interviewId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Interview not found" });
    }
    // scheduledOn/fromTime/toTime are set-once outside of the dedicated
    // reschedule action (see rescheduleInterview below).
    const { scheduledOn, fromTime, toTime, ...rest } = pickFields(req.body);
    Object.assign(doc, rest);
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Interview updated successfully" });
  } catch (error) {
    console.log("Error in updateInterview", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const rescheduleInterview = async (req, res) => {
  try {
    const { interviewId } = req.params;
    const { scheduledOn, fromTime, toTime } = req.body;
    const doc = await Interview.findById(interviewId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Interview not found" });
    }
    if (scheduledOn) doc.scheduledOn = scheduledOn;
    if (fromTime) doc.fromTime = fromTime;
    if (toTime) doc.toTime = toTime;
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Interview rescheduled successfully" });
  } catch (error) {
    console.log("Error in rescheduleInterview", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteInterview = async (req, res) => {
  try {
    const { interviewId } = req.params;
    const doc = await Interview.findById(interviewId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Interview not found" });
    }
    const referenceInfo = await getReferencingCounts("Interview", interviewId);
    if (referenceInfo.totalReferences > 0) {
      return res.status(409).json({
        isOk: false, status: 409, message: "Cannot delete Interview. It is being used by other records.",
        totalReferences: referenceInfo.totalReferences, references: referenceInfo.details,
        formattedMessage: formatReferenceMessage(referenceInfo.details),
      });
    }
    await Interview.findByIdAndUpdate(interviewId, { isDeleted: true });
    return res.status(200).json({ isOk: true, status: 200, message: "Interview deleted successfully" });
  } catch (error) {
    console.log("Error in deleteInterview", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getInterviewById = async (req, res) => {
  try {
    const doc = await Interview.findById(req.params.interviewId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Interview not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getInterviewById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listInterviews = async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.jobApplicantId) filter.jobApplicantId = req.query.jobApplicantId;
    const docs = await Interview.find(filter).select("interviewTypeId jobApplicantId status scheduledOn");
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    console.log("Error in listInterviews", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listInterviewsByParams = async (req, res) => {
  try {
    const list = await runListQuery(Interview, req.body, {
      searchFields: [],
      filterable: {
        interviewTypeId: "objectId", jobApplicantId: "objectId", designationId: "objectId",
        status: "enum", scheduledOn: "date", isActive: "boolean", createdAt: "date",
      },
      stages: [
        { $lookup: { from: "interviewtypes", localField: "interviewTypeId", foreignField: "_id", as: "interviewType" } },
        { $lookup: { from: "jobapplicants", localField: "jobApplicantId", foreignField: "_id", as: "jobApplicant" } },
        {
          $addFields: {
            interviewTypeName: { $arrayElemAt: ["$interviewType.interviewTypeName", 0] },
            jobApplicantName: { $arrayElemAt: ["$jobApplicant.applicantName", 0] },
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
