import express from "express";
import { ANY_ROLE } from "@demo-panel/shared/roles";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { checkPermission } from "../../middlewares/checkPermission.js";
import { allowOnlyFields } from "../../middlewares/inputValidator.js";
import * as controller from "../../controllers/v1/gratuity.controller.js";

const router = express.Router();

// ============================================================================
// 1. Gratuity Rule
// ============================================================================

/**
 * @swagger
 * /gratuity-rules:
 *   post:
 *     summary: createGratuityRule
 *     tags: [Gratuity]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/gratuity-rules",
  authMiddleware(ANY_ROLE),
  checkPermission("/gratuity-rule", "write"),
  allowOnlyFields(controller.GRATUITY_RULE_FIELDS),
  controller.createGratuityRule,
);

/**
 * @swagger
 * /gratuity-rules:
 *   get:
 *     summary: listGratuityRules
 *     tags: [Gratuity]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/gratuity-rules",
  authMiddleware(ANY_ROLE),
  checkPermission("/gratuity-rule", "read"),
  controller.listGratuityRules,
);

/**
 * @swagger
 * /gratuity-rules/search:
 *   post:
 *     summary: searchGratuityRules
 *     tags: [Gratuity]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/gratuity-rules/search",
  authMiddleware(ANY_ROLE),
  checkPermission("/gratuity-rule", "read"),
  controller.searchGratuityRules,
);

/**
 * @swagger
 * /gratuity-rules/{id}:
 *   get:
 *     summary: getGratuityRuleById
 *     tags: [Gratuity]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/gratuity-rules/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/gratuity-rule", "read"),
  controller.getGratuityRuleById,
);

/**
 * @swagger
 * /gratuity-rules/{id}:
 *   put:
 *     summary: updateGratuityRule
 *     tags: [Gratuity]
 *     security: [{ bearerAuth: [] }]
 */
router.put(
  "/gratuity-rules/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/gratuity-rule", "edit"),
  allowOnlyFields(controller.GRATUITY_RULE_FIELDS),
  controller.updateGratuityRule,
);

/**
 * @swagger
 * /gratuity-rules/{id}:
 *   delete:
 *     summary: deleteGratuityRule
 *     tags: [Gratuity]
 *     security: [{ bearerAuth: [] }]
 */
router.delete(
  "/gratuity-rules/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/gratuity-rule", "delete"),
  controller.deleteGratuityRule,
);

// ============================================================================
// 2. Gratuity
// ============================================================================

/**
 * @swagger
 * /gratuities:
 *   post:
 *     summary: createGratuity
 *     tags: [Gratuity]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/gratuities",
  authMiddleware(ANY_ROLE),
  checkPermission("/gratuity", "write"),
  allowOnlyFields(controller.GRATUITY_FIELDS),
  controller.createGratuity,
);

/**
 * @swagger
 * /gratuities:
 *   get:
 *     summary: listGratuities
 *     tags: [Gratuity]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/gratuities",
  authMiddleware(ANY_ROLE),
  checkPermission("/gratuity", "read"),
  controller.listGratuities,
);

/**
 * @swagger
 * /gratuities/search:
 *   post:
 *     summary: searchGratuities
 *     tags: [Gratuity]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/gratuities/search",
  authMiddleware(ANY_ROLE),
  checkPermission("/gratuity", "read"),
  controller.searchGratuities,
);

/**
 * @swagger
 * /gratuities/{id}:
 *   get:
 *     summary: getGratuityById
 *     tags: [Gratuity]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/gratuities/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/gratuity", "read"),
  controller.getGratuityById,
);

/**
 * @swagger
 * /gratuities/{id}:
 *   put:
 *     summary: updateGratuity
 *     tags: [Gratuity]
 *     security: [{ bearerAuth: [] }]
 */
router.put(
  "/gratuities/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/gratuity", "edit"),
  controller.updateGratuity,
);

/**
 * @swagger
 * /gratuities/{id}/submit:
 *   post:
 *     summary: submitGratuity
 *     tags: [Gratuity]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/gratuities/:id/submit",
  authMiddleware(ANY_ROLE),
  checkPermission("/gratuity", "edit"),
  controller.submitGratuity,
);

/**
 * @swagger
 * /gratuities/{id}/cancel:
 *   post:
 *     summary: cancelGratuity
 *     tags: [Gratuity]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/gratuities/:id/cancel",
  authMiddleware(ANY_ROLE),
  checkPermission("/gratuity", "edit"),
  controller.cancelGratuity,
);

/**
 * @swagger
 * /gratuities/{id}:
 *   delete:
 *     summary: deleteGratuity
 *     tags: [Gratuity]
 *     security: [{ bearerAuth: [] }]
 */
router.delete(
  "/gratuities/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/gratuity", "delete"),
  controller.deleteGratuity,
);

export default router;
