import express from "express";
import { ANY_ROLE } from "@demo-panel/shared/roles";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { checkPermission } from "../../middlewares/checkPermission.js";
import {
  allowOnlyFields,
  allowedSearchFields,
  searchValidation,
} from "../../middlewares/inputValidator.js";
import {
  listAuditLogByParams,
  getAuditLogById,
  getRecordHistory,
  listAuditedModels,
} from "../../controllers/v1/auditLog.controller.js";

/**
 * The audit trail, read-only.
 *
 * Deliberately no POST, PUT or DELETE: the collection is written by
 * `models/auditPlugin.js` and by nothing else. If a project ever needs
 * retention, that is a scheduled job or a TTL index — not an endpoint that lets
 * someone erase the record of what they did.
 */
const router = express.Router();

/**
 * @swagger
 * /audit-logs/models:
 *   get:
 *     summary: Distinct model names present in the audit log
 *     tags: [Audit]
 */
router.get(
  "/audit-logs/models",
  authMiddleware(ANY_ROLE),
  checkPermission("/audit-log", "read"),
  listAuditedModels,
);

/**
 * @swagger
 * /audit-logs/search:
 *   post:
 *     summary: Paginated, filtered list of recorded changes
 *     tags: [Audit]
 *     responses:
 *       200:
 *         description: Matching entries
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
router.post(
  "/audit-logs/search",
  authMiddleware(ANY_ROLE),
  checkPermission("/audit-log", "read"),
  allowOnlyFields(allowedSearchFields),
  searchValidation,
  listAuditLogByParams,
);

/**
 * @swagger
 * /audit-logs/record/{model}/{documentId}:
 *   get:
 *     summary: Every recorded change to one record, newest first
 *     tags: [Audit]
 */
router.get(
  "/audit-logs/record/:model/:documentId",
  authMiddleware(ANY_ROLE),
  checkPermission("/audit-log", "read"),
  getRecordHistory,
);

/**
 * @swagger
 * /audit-logs/{auditLogId}:
 *   get:
 *     summary: One recorded change, with its full field-level diff
 *     tags: [Audit]
 */
router.get(
  "/audit-logs/:auditLogId",
  authMiddleware(ANY_ROLE),
  checkPermission("/audit-log", "read"),
  getAuditLogById,
);

export default router;
