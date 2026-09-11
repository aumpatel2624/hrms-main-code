import express from "express";
import { ANY_ROLE } from "@demo-panel/shared/roles";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { checkPermission } from "../../middlewares/checkPermission.js";
import { allowOnlyFields } from "../../middlewares/inputValidator.js";
import * as controller from "../../controllers/v1/performanceGoals.controller.js";

const router = express.Router();

// ============================================================================
// 1. Goal (ADR-032, transactional half, feat/performance-goals) — SCOPES.OWN
// ============================================================================

/**
 * @swagger
 * /goals:
 *   post:
 *     summary: createGoal
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.post("/goals", authMiddleware(ANY_ROLE), checkPermission("/goal", "write"), allowOnlyFields(controller.GOAL_CREATE_FIELDS), controller.createGoal);

/**
 * @swagger
 * /goals:
 *   get:
 *     summary: listGoals
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.get("/goals", authMiddleware(ANY_ROLE), checkPermission("/goal", "read"), controller.listGoals);

/**
 * @swagger
 * /goals/search:
 *   post:
 *     summary: searchGoals
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.post("/goals/search", authMiddleware(ANY_ROLE), checkPermission("/goal", "read"), controller.searchGoals);

/**
 * @swagger
 * /goals/bulk-status:
 *   post:
 *     summary: bulkUpdateGoalStatus
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.post("/goals/bulk-status", authMiddleware(ANY_ROLE), checkPermission("/goal", "edit"), controller.bulkUpdateGoalStatus);

/**
 * @swagger
 * /goals/{id}:
 *   get:
 *     summary: getGoalById
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.get("/goals/:id", authMiddleware(ANY_ROLE), checkPermission("/goal", "read"), controller.getGoalById);

/**
 * @swagger
 * /goals/{id}:
 *   put:
 *     summary: updateGoal
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.put("/goals/:id", authMiddleware(ANY_ROLE), checkPermission("/goal", "edit"), allowOnlyFields(controller.GOAL_UPDATE_FIELDS), controller.updateGoal);

/**
 * @swagger
 * /goals/{id}/archive:
 *   post:
 *     summary: archiveGoal
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.post("/goals/:id/archive", authMiddleware(ANY_ROLE), checkPermission("/goal", "edit"), controller.archiveGoal);

/**
 * @swagger
 * /goals/{id}/unarchive:
 *   post:
 *     summary: unarchiveGoal
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.post("/goals/:id/unarchive", authMiddleware(ANY_ROLE), checkPermission("/goal", "edit"), controller.unarchiveGoal);

/**
 * @swagger
 * /goals/{id}/close:
 *   post:
 *     summary: closeGoal
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.post("/goals/:id/close", authMiddleware(ANY_ROLE), checkPermission("/goal", "edit"), controller.closeGoal);

/**
 * @swagger
 * /goals/{id}/reopen:
 *   post:
 *     summary: reopenGoal
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.post("/goals/:id/reopen", authMiddleware(ANY_ROLE), checkPermission("/goal", "edit"), controller.reopenGoal);

/**
 * @swagger
 * /goals/{id}:
 *   delete:
 *     summary: deleteGoal
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.delete("/goals/:id", authMiddleware(ANY_ROLE), checkPermission("/goal", "delete"), controller.deleteGoal);

// ============================================================================
// 2. Employee Performance Feedback (ADR-032, transactional half)
// ============================================================================

/**
 * @swagger
 * /employee-performance-feedbacks:
 *   post:
 *     summary: createEmployeePerformanceFeedback
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/employee-performance-feedbacks",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-performance-feedback", "write"),
  allowOnlyFields(controller.EMPLOYEE_PERFORMANCE_FEEDBACK_CREATE_FIELDS),
  controller.createEmployeePerformanceFeedback,
);

/**
 * @swagger
 * /employee-performance-feedbacks:
 *   get:
 *     summary: listEmployeePerformanceFeedbacks
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/employee-performance-feedbacks",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-performance-feedback", "read"),
  controller.listEmployeePerformanceFeedbacks,
);

/**
 * @swagger
 * /employee-performance-feedbacks/search:
 *   post:
 *     summary: searchEmployeePerformanceFeedbacks
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/employee-performance-feedbacks/search",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-performance-feedback", "read"),
  controller.searchEmployeePerformanceFeedbacks,
);

/**
 * @swagger
 * /employee-performance-feedbacks/{id}:
 *   get:
 *     summary: getEmployeePerformanceFeedbackById
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/employee-performance-feedbacks/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-performance-feedback", "read"),
  controller.getEmployeePerformanceFeedbackById,
);

/**
 * @swagger
 * /employee-performance-feedbacks/{id}:
 *   put:
 *     summary: updateEmployeePerformanceFeedback
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.put(
  "/employee-performance-feedbacks/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-performance-feedback", "edit"),
  allowOnlyFields(controller.EMPLOYEE_PERFORMANCE_FEEDBACK_UPDATE_FIELDS),
  controller.updateEmployeePerformanceFeedback,
);

/**
 * @swagger
 * /employee-performance-feedbacks/{id}/submit:
 *   post:
 *     summary: submitEmployeePerformanceFeedback
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/employee-performance-feedbacks/:id/submit",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-performance-feedback", "edit"),
  controller.submitEmployeePerformanceFeedback,
);

/**
 * @swagger
 * /employee-performance-feedbacks/{id}/cancel:
 *   post:
 *     summary: cancelEmployeePerformanceFeedback
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/employee-performance-feedbacks/:id/cancel",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-performance-feedback", "edit"),
  controller.cancelEmployeePerformanceFeedback,
);

/**
 * @swagger
 * /employee-performance-feedbacks/{id}:
 *   delete:
 *     summary: deleteEmployeePerformanceFeedback
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.delete(
  "/employee-performance-feedbacks/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-performance-feedback", "delete"),
  controller.deleteEmployeePerformanceFeedback,
);

export default router;
