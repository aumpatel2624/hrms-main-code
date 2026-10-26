import express from "express";
import { body } from "express-validator";
import { ANY_ROLE } from "@demo-panel/shared/roles";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { allowOnlyFields, handleValidationErrors } from "../../middlewares/inputValidator.js";
import { MAX_TERM, MIN_TERM } from "../../utils/globalSearch.js";
import { globalSearch } from "../../controllers/v1/globalSearch.controller.js";

const router = express.Router();

/**
 * @swagger
 * /global-search:
 *   post:
 *     summary: Search every screen the caller can read for a term
 *     description: >
 *       Replays each screen's own list search (its permission gate, data scope
 *       and searchFields) as the caller, returning a few rows per screen that
 *       matched. Deliberately no checkPermission here — there is no "global
 *       search" screen; each replayed screen applies its own gate, and a screen
 *       the caller cannot read contributes nothing.
 *     tags: [Search]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [match]
 *             properties:
 *               match: { type: string, minLength: 2, maxLength: 100 }
 *     responses:
 *       200: { description: "[{ screen, count, rows }] for each screen with a match" }
 *       400: { description: Term missing, too short or too long }
 */
router.post(
  "/global-search",
  authMiddleware(ANY_ROLE),
  allowOnlyFields(["match"]),
  body("match").isString().withMessage("Search term must be text").bail()
    .trim().isLength({ min: MIN_TERM, max: MAX_TERM }).withMessage(`Search term must be ${MIN_TERM}-${MAX_TERM} characters`),
  handleValidationErrors,
  globalSearch,
);

export default router;
