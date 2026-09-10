import express from "express";
import { listPublicJobs, getPublicJobByRoute } from "../../controllers/v1/jobsPublic.controller.js";

/**
 * The second public router in this codebase (see seoPublic.routes.js for
 * the first, ADR-004). A deliberate exception to "resolve-by-key, never a
 * listing" (30-api.md's public-endpoint gate) — reasoned through in
 * ADR-019: published, open job postings are public by nature, the response
 * is field-allowlisted in code (never a raw document), and the filter set
 * is a fixed allowlist. No public write endpoint here (OPEN-QUESTIONS.md Q-7).
 */
const router = express.Router();

/**
 * @swagger
 * /public/jobs:
 *   get:
 *     summary: Published, open job postings — filterable, searchable, paginated
 *     tags: [Recruitment Public]
 */
router.get("/public/jobs", listPublicJobs);

/**
 * @swagger
 * /public/jobs/{company}/{jobSlug}:
 *   get:
 *     summary: One published job posting by its two-segment slug (company/job-title)
 *     tags: [Recruitment Public]
 */
// route is always "scrub(company)/scrub(jobTitle)" (see jobOpening.controller.js
// ensureRoute) — two fixed segments, not a wildcard, since Express 4's default
// path-to-regexp can't cleanly capture a slash-containing single param.
router.get("/public/jobs/:company/:jobSlug", getPublicJobByRoute);

export default router;
