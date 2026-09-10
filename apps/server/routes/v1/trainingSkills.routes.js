/**
 * Training Program, Training Event, Training Feedback, Skill, Employee
 * Skill Map (ADR-022, HRMS module 6).
 */
import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { checkPermission } from "../../middlewares/checkPermission.js";
import { ANY_ROLE } from "@demo-panel/shared/roles";
import {
  createTrainingProgram, updateTrainingProgram, deleteTrainingProgram,
  getTrainingProgramById, listTrainingPrograms, listTrainingProgramsByParams,
  createTrainingEvent, updateTrainingEvent, deleteTrainingEvent,
  getTrainingEventById, listTrainingEvents, listTrainingEventsByParams,
  markTrainingEventCompleted, markTrainingEventScheduled,
  createTrainingFeedback, deleteTrainingFeedback,
  getTrainingFeedbackById, listTrainingFeedbacks, listTrainingFeedbacksByParams,
  createSkill, updateSkill, deleteSkill,
  getSkillById, listSkills, listSkillsByParams,
  createEmployeeSkillMap, updateEmployeeSkillMap, deleteEmployeeSkillMap,
  getEmployeeSkillMapById, listEmployeeSkillMaps, listEmployeeSkillMapsByParams,
  populateEmployeeSkillMapFromDesignation,
} from "../../controllers/v1/trainingSkills.controller.js";

const router = express.Router();

// ---- Training Program ----
router.post("/training-programs", authMiddleware(ANY_ROLE), checkPermission("/training-program", "write"), createTrainingProgram);
router.get("/training-programs", authMiddleware(ANY_ROLE), listTrainingPrograms);
router.get("/training-programs/:trainingProgramId", authMiddleware(ANY_ROLE), checkPermission("/training-program", "read"), getTrainingProgramById);
router.put("/training-programs/:trainingProgramId", authMiddleware(ANY_ROLE), checkPermission("/training-program", "edit"), updateTrainingProgram);
router.delete("/training-programs/:trainingProgramId", authMiddleware(ANY_ROLE), checkPermission("/training-program", "delete"), deleteTrainingProgram);
router.post("/training-programs/search", authMiddleware(ANY_ROLE), checkPermission("/training-program", "read"), listTrainingProgramsByParams);

// ---- Training Event ----
router.post("/training-events", authMiddleware(ANY_ROLE), checkPermission("/training-event", "write"), createTrainingEvent);
router.get("/training-events", authMiddleware(ANY_ROLE), listTrainingEvents);
router.get("/training-events/:trainingEventId", authMiddleware(ANY_ROLE), checkPermission("/training-event", "read"), getTrainingEventById);
router.put("/training-events/:trainingEventId", authMiddleware(ANY_ROLE), checkPermission("/training-event", "edit"), updateTrainingEvent);
router.delete("/training-events/:trainingEventId", authMiddleware(ANY_ROLE), checkPermission("/training-event", "delete"), deleteTrainingEvent);
router.post("/training-events/search", authMiddleware(ANY_ROLE), checkPermission("/training-event", "read"), listTrainingEventsByParams);
router.post("/training-events/:trainingEventId/mark-completed", authMiddleware(ANY_ROLE), checkPermission("/training-event", "edit"), markTrainingEventCompleted);
router.post("/training-events/:trainingEventId/mark-scheduled", authMiddleware(ANY_ROLE), checkPermission("/training-event", "edit"), markTrainingEventScheduled);

// ---- Training Feedback ----
router.post("/training-feedbacks", authMiddleware(ANY_ROLE), checkPermission("/training-feedback", "write"), createTrainingFeedback);
router.get("/training-feedbacks", authMiddleware(ANY_ROLE), listTrainingFeedbacks);
router.get("/training-feedbacks/:trainingFeedbackId", authMiddleware(ANY_ROLE), checkPermission("/training-feedback", "read"), getTrainingFeedbackById);
router.delete("/training-feedbacks/:trainingFeedbackId", authMiddleware(ANY_ROLE), checkPermission("/training-feedback", "delete"), deleteTrainingFeedback);
router.post("/training-feedbacks/search", authMiddleware(ANY_ROLE), checkPermission("/training-feedback", "read"), listTrainingFeedbacksByParams);

// ---- Skill ----
router.post("/skills", authMiddleware(ANY_ROLE), checkPermission("/skill", "write"), createSkill);
router.get("/skills", authMiddleware(ANY_ROLE), listSkills);
router.get("/skills/:skillId", authMiddleware(ANY_ROLE), checkPermission("/skill", "read"), getSkillById);
router.put("/skills/:skillId", authMiddleware(ANY_ROLE), checkPermission("/skill", "edit"), updateSkill);
router.delete("/skills/:skillId", authMiddleware(ANY_ROLE), checkPermission("/skill", "delete"), deleteSkill);
router.post("/skills/search", authMiddleware(ANY_ROLE), checkPermission("/skill", "read"), listSkillsByParams);

// ---- Employee Skill Map ----
router.post("/employee-skill-maps", authMiddleware(ANY_ROLE), checkPermission("/employee-skill-map", "write"), createEmployeeSkillMap);
router.get("/employee-skill-maps", authMiddleware(ANY_ROLE), listEmployeeSkillMaps);
router.get("/employee-skill-maps/:skillMapId", authMiddleware(ANY_ROLE), checkPermission("/employee-skill-map", "read"), getEmployeeSkillMapById);
router.put("/employee-skill-maps/:skillMapId", authMiddleware(ANY_ROLE), checkPermission("/employee-skill-map", "edit"), updateEmployeeSkillMap);
router.delete("/employee-skill-maps/:skillMapId", authMiddleware(ANY_ROLE), checkPermission("/employee-skill-map", "delete"), deleteEmployeeSkillMap);
router.post("/employee-skill-maps/search", authMiddleware(ANY_ROLE), checkPermission("/employee-skill-map", "read"), listEmployeeSkillMapsByParams);
router.post("/employee-skill-maps/:skillMapId/populate-from-designation", authMiddleware(ANY_ROLE), checkPermission("/employee-skill-map", "edit"), populateEmployeeSkillMapFromDesignation);

export default router;
