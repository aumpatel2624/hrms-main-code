/**
 * Employee Separation + Employee Separation Template, Exit Interview,
 * Full and Final Statement (ADR-020, HRMS module 4).
 */
import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { checkPermission } from "../../middlewares/checkPermission.js";
import { ANY_ROLE } from "@demo-panel/shared/roles";
import {
  createEmployeeSeparation, updateEmployeeSeparation, deleteEmployeeSeparation,
  getEmployeeSeparationById, listEmployeeSeparations, listEmployeeSeparationsByParams,
  createEmployeeSeparationTemplate, updateEmployeeSeparationTemplate, deleteEmployeeSeparationTemplate,
  getEmployeeSeparationTemplateById, listEmployeeSeparationTemplates, listEmployeeSeparationTemplatesByParams,
} from "../../controllers/v1/employeeSeparation.controller.js";
import {
  createExitInterview, updateExitInterview, deleteExitInterview,
  getExitInterviewById, listExitInterviews, listExitInterviewsByParams,
} from "../../controllers/v1/exitInterview.controller.js";
import {
  createFullAndFinalStatement, updateFullAndFinalStatement, deleteFullAndFinalStatement,
  getFullAndFinalStatementById, listFullAndFinalStatements, listFullAndFinalStatementsByParams,
  markStatementAsPaid,
} from "../../controllers/v1/fullAndFinalStatement.controller.js";

const router = express.Router();

// ---- Employee Separation ----
router.post("/employee-separations", authMiddleware(ANY_ROLE), checkPermission("/employee-separation", "write"), createEmployeeSeparation);
router.get("/employee-separations", authMiddleware(ANY_ROLE), listEmployeeSeparations);
router.get("/employee-separations/:separationId", authMiddleware(ANY_ROLE), checkPermission("/employee-separation", "read"), getEmployeeSeparationById);
router.put("/employee-separations/:separationId", authMiddleware(ANY_ROLE), checkPermission("/employee-separation", "edit"), updateEmployeeSeparation);
router.delete("/employee-separations/:separationId", authMiddleware(ANY_ROLE), checkPermission("/employee-separation", "delete"), deleteEmployeeSeparation);
router.post("/employee-separations/search", authMiddleware(ANY_ROLE), checkPermission("/employee-separation", "read"), listEmployeeSeparationsByParams);

// ---- Employee Separation Template ----
router.post("/employee-separation-templates", authMiddleware(ANY_ROLE), checkPermission("/employee-separation-template", "write"), createEmployeeSeparationTemplate);
router.get("/employee-separation-templates", authMiddleware(ANY_ROLE), listEmployeeSeparationTemplates);
router.get("/employee-separation-templates/:templateId", authMiddleware(ANY_ROLE), checkPermission("/employee-separation-template", "read"), getEmployeeSeparationTemplateById);
router.put("/employee-separation-templates/:templateId", authMiddleware(ANY_ROLE), checkPermission("/employee-separation-template", "edit"), updateEmployeeSeparationTemplate);
router.delete("/employee-separation-templates/:templateId", authMiddleware(ANY_ROLE), checkPermission("/employee-separation-template", "delete"), deleteEmployeeSeparationTemplate);
router.post("/employee-separation-templates/search", authMiddleware(ANY_ROLE), checkPermission("/employee-separation-template", "read"), listEmployeeSeparationTemplatesByParams);

// ---- Exit Interview ----
router.post("/exit-interviews", authMiddleware(ANY_ROLE), checkPermission("/exit-interview", "write"), createExitInterview);
router.get("/exit-interviews", authMiddleware(ANY_ROLE), listExitInterviews);
router.get("/exit-interviews/:interviewId", authMiddleware(ANY_ROLE), checkPermission("/exit-interview", "read"), getExitInterviewById);
router.put("/exit-interviews/:interviewId", authMiddleware(ANY_ROLE), checkPermission("/exit-interview", "edit"), updateExitInterview);
router.delete("/exit-interviews/:interviewId", authMiddleware(ANY_ROLE), checkPermission("/exit-interview", "delete"), deleteExitInterview);
router.post("/exit-interviews/search", authMiddleware(ANY_ROLE), checkPermission("/exit-interview", "read"), listExitInterviewsByParams);

// ---- Full and Final Statement ----
router.post("/full-and-final-statements", authMiddleware(ANY_ROLE), checkPermission("/full-and-final-statement", "write"), createFullAndFinalStatement);
router.get("/full-and-final-statements", authMiddleware(ANY_ROLE), listFullAndFinalStatements);
router.get("/full-and-final-statements/:statementId", authMiddleware(ANY_ROLE), checkPermission("/full-and-final-statement", "read"), getFullAndFinalStatementById);
router.put("/full-and-final-statements/:statementId", authMiddleware(ANY_ROLE), checkPermission("/full-and-final-statement", "edit"), updateFullAndFinalStatement);
router.delete("/full-and-final-statements/:statementId", authMiddleware(ANY_ROLE), checkPermission("/full-and-final-statement", "delete"), deleteFullAndFinalStatement);
router.post("/full-and-final-statements/search", authMiddleware(ANY_ROLE), checkPermission("/full-and-final-statement", "read"), listFullAndFinalStatementsByParams);
router.post("/full-and-final-statements/:statementId/mark-as-paid", authMiddleware(ANY_ROLE), checkPermission("/full-and-final-statement", "edit"), markStatementAsPaid);

export default router;
