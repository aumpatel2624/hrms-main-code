/**
 * Interview pipeline (ADR-019, HRMS module 3): Interview Type, Interview,
 * Interview Feedback. Note the asymmetric permission grant on Feedback —
 * HR User/HR Manager are read-only there, only Interviewer writes
 * (matches source's own permission table, see ADR-019 point 9).
 */
import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { checkPermission } from "../../middlewares/checkPermission.js";
import { ANY_ROLE } from "@demo-panel/shared/roles";
import {
  createInterviewType, updateInterviewType, deleteInterviewType,
  getInterviewTypeById, listInterviewTypes, listInterviewTypesByParams,
} from "../../controllers/v1/recruitmentMasters.controller.js";
import {
  createInterview, updateInterview, rescheduleInterview, deleteInterview,
  getInterviewById, listInterviews, listInterviewsByParams,
} from "../../controllers/v1/interview.controller.js";
import {
  createInterviewFeedback, updateInterviewFeedback, deleteInterviewFeedback,
  getInterviewFeedbackById, listInterviewFeedbacks, listInterviewFeedbacksByParams,
} from "../../controllers/v1/interviewFeedback.controller.js";

const router = express.Router();

// ---- Interview Type ----
router.post("/interview-types", authMiddleware(ANY_ROLE), checkPermission("/interview-type", "write"), createInterviewType);
router.get("/interview-types", authMiddleware(ANY_ROLE), listInterviewTypes);
router.get("/interview-types/:interviewTypeId", authMiddleware(ANY_ROLE), checkPermission("/interview-type", "read"), getInterviewTypeById);
router.put("/interview-types/:interviewTypeId", authMiddleware(ANY_ROLE), checkPermission("/interview-type", "edit"), updateInterviewType);
router.delete("/interview-types/:interviewTypeId", authMiddleware(ANY_ROLE), checkPermission("/interview-type", "delete"), deleteInterviewType);
router.post("/interview-types/search", authMiddleware(ANY_ROLE), checkPermission("/interview-type", "read"), listInterviewTypesByParams);

// ---- Interview ----
router.post("/interviews", authMiddleware(ANY_ROLE), checkPermission("/interview", "write"), createInterview);
router.get("/interviews", authMiddleware(ANY_ROLE), listInterviews);
router.get("/interviews/:interviewId", authMiddleware(ANY_ROLE), checkPermission("/interview", "read"), getInterviewById);
router.put("/interviews/:interviewId", authMiddleware(ANY_ROLE), checkPermission("/interview", "edit"), updateInterview);
router.post("/interviews/:interviewId/reschedule", authMiddleware(ANY_ROLE), checkPermission("/interview", "edit"), rescheduleInterview);
router.delete("/interviews/:interviewId", authMiddleware(ANY_ROLE), checkPermission("/interview", "delete"), deleteInterview);
router.post("/interviews/search", authMiddleware(ANY_ROLE), checkPermission("/interview", "read"), listInterviewsByParams);

// ---- Interview Feedback ----
router.post("/interview-feedbacks", authMiddleware(ANY_ROLE), checkPermission("/interview-feedback", "write"), createInterviewFeedback);
router.get("/interview-feedbacks", authMiddleware(ANY_ROLE), listInterviewFeedbacks);
router.get("/interview-feedbacks/:feedbackId", authMiddleware(ANY_ROLE), checkPermission("/interview-feedback", "read"), getInterviewFeedbackById);
router.put("/interview-feedbacks/:feedbackId", authMiddleware(ANY_ROLE), checkPermission("/interview-feedback", "edit"), updateInterviewFeedback);
router.delete("/interview-feedbacks/:feedbackId", authMiddleware(ANY_ROLE), checkPermission("/interview-feedback", "delete"), deleteInterviewFeedback);
router.post("/interview-feedbacks/search", authMiddleware(ANY_ROLE), checkPermission("/interview-feedback", "read"), listInterviewFeedbacksByParams);

export default router;
