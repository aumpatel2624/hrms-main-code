/**
 * Interview Feedback (ADR-019, HRMS module 3) — a per-interviewer scorecard.
 * Three server-side guards on create: interviewer must be assigned to the
 * parent Interview, not before its scheduledOn date, one feedback per
 * interviewer per interview (also a DB unique index — belt and suspenders).
 */
import { runListQuery } from "../../utils/listQuery.js";
import InterviewFeedback from "../../models/InterviewFeedback.js";
import Interview from "../../models/Interview.js";
import {
  getReferencingCounts,
  formatReferenceMessage,
} from "../../utils/referenceHelper.js";

export const createInterviewFeedback = async (req, res) => {
  try {
    const { interviewId, interviewerId, result, feedback } = req.body;
    if (!interviewId || !interviewerId || !result) {
      return res.status(400).json({ isOk: false, status: 400, message: "interviewId, interviewerId and result are required" });
    }

    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return res.status(404).json({ isOk: false, status: 404, message: "Interview not found" });
    }
    const isAssigned = (interview.interviewers || []).some((id) => String(id) === String(interviewerId));
    if (!isAssigned) {
      return res.status(403).json({
        isOk: false, status: 403,
        message: "Only an interviewer assigned to this Interview may submit feedback for it",
      });
    }
    if (new Date() < new Date(interview.scheduledOn)) {
      return res.status(400).json({
        isOk: false, status: 400,
        message: "Submission of Interview Feedback before the Interview Scheduled Date is not allowed",
      });
    }
    const duplicate = await InterviewFeedback.findOne({ interviewId, interviewerId });
    if (duplicate) {
      return res.status(409).json({
        isOk: false, status: 409,
        message: "Feedback already submitted for this Interview by this interviewer",
      });
    }

    // No automatic Pending -> Under Review transition on the parent Interview
    // here — source has no code path that does this either (flagged in the
    // Port-Spec's own Port Notes as "do not invent without confirming
    // product intent"); moving to Under Review is a manual HR action.
    await InterviewFeedback.create({ interviewId, interviewerId, result, feedback });

    return res.status(201).json({ isOk: true, status: 201, message: "Interview Feedback created successfully" });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ isOk: false, status: 409, message: "Feedback already submitted for this Interview by this interviewer" });
    }
    console.log("Error in createInterviewFeedback", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateInterviewFeedback = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const doc = await InterviewFeedback.findById(feedbackId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Interview Feedback not found" });
    }
    if (req.body.result !== undefined) doc.result = req.body.result;
    if (req.body.feedback !== undefined) doc.feedback = req.body.feedback;
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Interview Feedback updated successfully" });
  } catch (error) {
    console.log("Error in updateInterviewFeedback", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteInterviewFeedback = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const doc = await InterviewFeedback.findById(feedbackId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Interview Feedback not found" });
    }
    const referenceInfo = await getReferencingCounts("InterviewFeedback", feedbackId);
    if (referenceInfo.totalReferences > 0) {
      return res.status(409).json({
        isOk: false, status: 409, message: "Cannot delete Interview Feedback. It is being used by other records.",
        totalReferences: referenceInfo.totalReferences, references: referenceInfo.details,
        formattedMessage: formatReferenceMessage(referenceInfo.details),
      });
    }
    await InterviewFeedback.findByIdAndUpdate(feedbackId, { isDeleted: true });
    return res.status(200).json({ isOk: true, status: 200, message: "Interview Feedback deleted successfully" });
  } catch (error) {
    console.log("Error in deleteInterviewFeedback", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getInterviewFeedbackById = async (req, res) => {
  try {
    const doc = await InterviewFeedback.findById(req.params.feedbackId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Interview Feedback not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getInterviewFeedbackById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listInterviewFeedbacks = async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.interviewId) filter.interviewId = req.query.interviewId;
    const docs = await InterviewFeedback.find(filter).select("interviewId interviewerId result");
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    console.log("Error in listInterviewFeedbacks", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listInterviewFeedbacksByParams = async (req, res) => {
  try {
    const list = await runListQuery(InterviewFeedback, req.body, {
      searchFields: [],
      filterable: {
        interviewId: "objectId", interviewerId: "objectId", result: "enum",
        isActive: "boolean", createdAt: "date",
      },
      stages: [
        { $lookup: { from: "interviews", localField: "interviewId", foreignField: "_id", as: "interview" } },
        { $addFields: { interviewJobApplicantId: { $arrayElemAt: ["$interview.jobApplicantId", 0] } } },
      ],
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};
