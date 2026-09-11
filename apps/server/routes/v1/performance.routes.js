import express from "express";
import { ANY_ROLE } from "@demo-panel/shared/roles";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { checkPermission } from "../../middlewares/checkPermission.js";
import { allowOnlyFields } from "../../middlewares/inputValidator.js";
import * as controller from "../../controllers/v1/performance.controller.js";

const router = express.Router();

// ============================================================================
// 1. KRA
// ============================================================================

/**
 * @swagger
 * /kras:
 *   post:
 *     summary: createKRA
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.post("/kras", authMiddleware(ANY_ROLE), checkPermission("/kra", "write"), allowOnlyFields(controller.KRA_FIELDS), controller.createKRA);

/**
 * @swagger
 * /kras:
 *   get:
 *     summary: listKRAs
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.get("/kras", authMiddleware(ANY_ROLE), checkPermission("/kra", "read"), controller.listKRAs);

/**
 * @swagger
 * /kras/search:
 *   post:
 *     summary: searchKRAs
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.post("/kras/search", authMiddleware(ANY_ROLE), checkPermission("/kra", "read"), controller.searchKRAs);

/**
 * @swagger
 * /kras/{id}:
 *   get:
 *     summary: getKRAById
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.get("/kras/:id", authMiddleware(ANY_ROLE), checkPermission("/kra", "read"), controller.getKRAById);

/**
 * @swagger
 * /kras/{id}:
 *   put:
 *     summary: updateKRA
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.put("/kras/:id", authMiddleware(ANY_ROLE), checkPermission("/kra", "edit"), allowOnlyFields(controller.KRA_FIELDS), controller.updateKRA);

/**
 * @swagger
 * /kras/{id}:
 *   delete:
 *     summary: deleteKRA
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.delete("/kras/:id", authMiddleware(ANY_ROLE), checkPermission("/kra", "delete"), controller.deleteKRA);

// ============================================================================
// 2. Employee Feedback Criteria
// ============================================================================

/**
 * @swagger
 * /employee-feedback-criteria:
 *   post:
 *     summary: createEmployeeFeedbackCriteria
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/employee-feedback-criteria",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-feedback-criteria", "write"),
  allowOnlyFields(controller.EMPLOYEE_FEEDBACK_CRITERIA_FIELDS),
  controller.createEmployeeFeedbackCriteria,
);

/**
 * @swagger
 * /employee-feedback-criteria:
 *   get:
 *     summary: listEmployeeFeedbackCriteria
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/employee-feedback-criteria",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-feedback-criteria", "read"),
  controller.listEmployeeFeedbackCriteria,
);

/**
 * @swagger
 * /employee-feedback-criteria/search:
 *   post:
 *     summary: searchEmployeeFeedbackCriteria
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/employee-feedback-criteria/search",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-feedback-criteria", "read"),
  controller.searchEmployeeFeedbackCriteria,
);

/**
 * @swagger
 * /employee-feedback-criteria/{id}:
 *   get:
 *     summary: getEmployeeFeedbackCriteriaById
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/employee-feedback-criteria/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-feedback-criteria", "read"),
  controller.getEmployeeFeedbackCriteriaById,
);

/**
 * @swagger
 * /employee-feedback-criteria/{id}:
 *   put:
 *     summary: updateEmployeeFeedbackCriteria
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.put(
  "/employee-feedback-criteria/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-feedback-criteria", "edit"),
  allowOnlyFields(controller.EMPLOYEE_FEEDBACK_CRITERIA_FIELDS),
  controller.updateEmployeeFeedbackCriteria,
);

/**
 * @swagger
 * /employee-feedback-criteria/{id}:
 *   delete:
 *     summary: deleteEmployeeFeedbackCriteria
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.delete(
  "/employee-feedback-criteria/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-feedback-criteria", "delete"),
  controller.deleteEmployeeFeedbackCriteria,
);

// ============================================================================
// 3. Appraisal Template
// ============================================================================

/**
 * @swagger
 * /appraisal-templates:
 *   post:
 *     summary: createAppraisalTemplate
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/appraisal-templates",
  authMiddleware(ANY_ROLE),
  checkPermission("/appraisal-template", "write"),
  allowOnlyFields(controller.APPRAISAL_TEMPLATE_FIELDS),
  controller.createAppraisalTemplate,
);

/**
 * @swagger
 * /appraisal-templates:
 *   get:
 *     summary: listAppraisalTemplates
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/appraisal-templates",
  authMiddleware(ANY_ROLE),
  checkPermission("/appraisal-template", "read"),
  controller.listAppraisalTemplates,
);

/**
 * @swagger
 * /appraisal-templates/search:
 *   post:
 *     summary: searchAppraisalTemplates
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/appraisal-templates/search",
  authMiddleware(ANY_ROLE),
  checkPermission("/appraisal-template", "read"),
  controller.searchAppraisalTemplates,
);

/**
 * @swagger
 * /appraisal-templates/{id}:
 *   get:
 *     summary: getAppraisalTemplateById
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/appraisal-templates/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/appraisal-template", "read"),
  controller.getAppraisalTemplateById,
);

/**
 * @swagger
 * /appraisal-templates/{id}:
 *   put:
 *     summary: updateAppraisalTemplate
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.put(
  "/appraisal-templates/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/appraisal-template", "edit"),
  allowOnlyFields(controller.APPRAISAL_TEMPLATE_FIELDS),
  controller.updateAppraisalTemplate,
);

/**
 * @swagger
 * /appraisal-templates/{id}:
 *   delete:
 *     summary: deleteAppraisalTemplate
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.delete(
  "/appraisal-templates/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/appraisal-template", "delete"),
  controller.deleteAppraisalTemplate,
);

// ============================================================================
// 4. Appraisal Cycle
// ============================================================================

/**
 * @swagger
 * /appraisal-cycles:
 *   post:
 *     summary: createAppraisalCycle
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/appraisal-cycles",
  authMiddleware(ANY_ROLE),
  checkPermission("/appraisal-cycle", "write"),
  allowOnlyFields(controller.APPRAISAL_CYCLE_FIELDS),
  controller.createAppraisalCycle,
);

/**
 * @swagger
 * /appraisal-cycles:
 *   get:
 *     summary: listAppraisalCycles
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/appraisal-cycles",
  authMiddleware(ANY_ROLE),
  checkPermission("/appraisal-cycle", "read"),
  controller.listAppraisalCycles,
);

/**
 * @swagger
 * /appraisal-cycles/search:
 *   post:
 *     summary: searchAppraisalCycles
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/appraisal-cycles/search",
  authMiddleware(ANY_ROLE),
  checkPermission("/appraisal-cycle", "read"),
  controller.searchAppraisalCycles,
);

/**
 * @swagger
 * /appraisal-cycles/{id}:
 *   get:
 *     summary: getAppraisalCycleById
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/appraisal-cycles/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/appraisal-cycle", "read"),
  controller.getAppraisalCycleById,
);

/**
 * @swagger
 * /appraisal-cycles/{id}:
 *   put:
 *     summary: updateAppraisalCycle
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.put(
  "/appraisal-cycles/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/appraisal-cycle", "edit"),
  allowOnlyFields(controller.APPRAISAL_CYCLE_FIELDS),
  controller.updateAppraisalCycle,
);

/**
 * @swagger
 * /appraisal-cycles/{id}/eligible-employees:
 *   post:
 *     summary: getEligibleEmployeesForCycle
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/appraisal-cycles/:id/eligible-employees",
  authMiddleware(ANY_ROLE),
  checkPermission("/appraisal-cycle", "edit"),
  controller.getEligibleEmployeesForCycle,
);

/**
 * @swagger
 * /appraisal-cycles/{id}/create-appraisals:
 *   post:
 *     summary: createAppraisalsForCycle
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/appraisal-cycles/:id/create-appraisals",
  authMiddleware(ANY_ROLE),
  checkPermission("/appraisal-cycle", "edit"),
  controller.createAppraisalsForCycle,
);

/**
 * @swagger
 * /appraisal-cycles/{id}/complete:
 *   post:
 *     summary: completeAppraisalCycle
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/appraisal-cycles/:id/complete",
  authMiddleware(ANY_ROLE),
  checkPermission("/appraisal-cycle", "edit"),
  controller.completeAppraisalCycle,
);

/**
 * @swagger
 * /appraisal-cycles/{id}:
 *   delete:
 *     summary: deleteAppraisalCycle
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.delete(
  "/appraisal-cycles/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/appraisal-cycle", "delete"),
  controller.deleteAppraisalCycle,
);

// ============================================================================
// 5. Appraisal
// ============================================================================

/**
 * @swagger
 * /appraisals:
 *   post:
 *     summary: createAppraisal
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/appraisals",
  authMiddleware(ANY_ROLE),
  checkPermission("/appraisal", "write"),
  allowOnlyFields(["employeeId", "appraisalCycleId", "appraisalTemplateId"]),
  controller.createAppraisal,
);

/**
 * @swagger
 * /appraisals:
 *   get:
 *     summary: listAppraisals
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.get("/appraisals", authMiddleware(ANY_ROLE), checkPermission("/appraisal", "read"), controller.listAppraisals);

/**
 * @swagger
 * /appraisals/search:
 *   post:
 *     summary: searchAppraisals
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.post("/appraisals/search", authMiddleware(ANY_ROLE), checkPermission("/appraisal", "read"), controller.searchAppraisals);

/**
 * @swagger
 * /appraisals/{id}:
 *   get:
 *     summary: getAppraisalById
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.get("/appraisals/:id", authMiddleware(ANY_ROLE), checkPermission("/appraisal", "read"), controller.getAppraisalById);

/**
 * @swagger
 * /appraisals/{id}:
 *   put:
 *     summary: updateAppraisal
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.put(
  "/appraisals/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/appraisal", "edit"),
  allowOnlyFields(controller.APPRAISAL_FIELDS),
  controller.updateAppraisal,
);

/**
 * @swagger
 * /appraisals/{id}/submit:
 *   post:
 *     summary: submitAppraisal
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.post("/appraisals/:id/submit", authMiddleware(ANY_ROLE), checkPermission("/appraisal", "edit"), controller.submitAppraisal);

/**
 * @swagger
 * /appraisals/{id}/cancel:
 *   post:
 *     summary: cancelAppraisal
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.post("/appraisals/:id/cancel", authMiddleware(ANY_ROLE), checkPermission("/appraisal", "edit"), controller.cancelAppraisal);

/**
 * @swagger
 * /appraisals/{id}:
 *   delete:
 *     summary: deleteAppraisal
 *     tags: [Performance]
 *     security: [{ bearerAuth: [] }]
 */
router.delete("/appraisals/:id", authMiddleware(ANY_ROLE), checkPermission("/appraisal", "delete"), controller.deleteAppraisal);

export default router;
