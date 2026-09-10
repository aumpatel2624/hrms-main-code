import express from "express";
import fs from "fs";
import { ANY_ROLE } from "@demo-panel/shared/roles";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { checkPermission } from "../../middlewares/checkPermission.js";
import { createSecureImageUpload } from "../../middlewares/secureUpload.js";
import {
  allowOnlyFields,
  allowedSearchFields,
  searchValidation,
  allowedSeoPageFields,
  seoPageValidation,
  allowedSeoSettingsFields,
  seoSettingsValidation,
  allowedSeoRedirectFields,
  seoRedirectValidation,
  allowedSeoNotFoundRedirectFields,
  seoNotFoundRedirectValidation,
  allowedSeoImportFields,
  seoImportValidation,
} from "../../middlewares/inputValidator.js";
import {
  createSeoPage,
  listSeoPages,
  getSeoPageById,
  updateSeoPage,
  deleteSeoPage,
  listSeoPageByParams,
  getSeoSettings,
  updateSeoSettings,
  getSiteKey,
  rotateSiteKey,
  createSeoRedirect,
  listSeoRedirects,
  getSeoRedirectById,
  updateSeoRedirect,
  deleteSeoRedirect,
  listSeoRedirectByParams,
  importSeoRedirects,
  listSeoNotFoundByParams,
  deleteSeoNotFound,
  redirectSeoNotFound,
} from "../../controllers/v1/seo.controller.js";

const router = express.Router();

// ============ SOCIAL IMAGE UPLOAD ============

const seoImageDir = "uploads/cms/seo";
if (!fs.existsSync(seoImageDir)) {
  fs.mkdirSync(seoImageDir, { recursive: true });
}

/**
 * Same hardened pipeline the email signature upload uses — magic-byte checks,
 * double-extension defence, UUID filenames, compression. Social images are
 * 1200x630, so the limit is higher than a signature's.
 */
const seoImageUpload = createSecureImageUpload({
  destination: seoImageDir,
  fieldName: "image",
  maxSize: 5 * 1024 * 1024,
  compress: true,
  quality: 88,
});

/**
 * @swagger
 * /seo-pages/upload-image:
 *   post:
 *     summary: Upload a social share image
 *     tags: [SEO]
 *     responses:
 *       200:
 *         description: Image uploaded, returns its absolute URL
 */
router.post(
  "/seo-pages/upload-image",
  authMiddleware(ANY_ROLE),
  checkPermission("/seo-pages", "write"),
  seoImageUpload,
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ isOk: false, status: 400, message: "No file uploaded" });
    }
    // Absolute: social crawlers reject relative image paths outright. The
    // request's own host is the fallback, because an unset env var here would
    // otherwise produce the literal string "undefined/uploads/..." — which is
    // exactly what the email-signature upload does today.
    const origin = process.env.REACT_APP_API_URL || `${req.protocol}://${req.get("host")}`;
    const url = `${origin}/uploads/cms/seo/${req.file.filename}`;
    return res.status(200).json({ isOk: true, status: 200, message: "Image uploaded", data: { url } });
  },
);

// ============ SEO PAGES ============

/**
 * @swagger
 * /seo-pages/search:
 *   post:
 *     summary: Paginated, filtered list of SEO pages
 *     tags: [SEO]
 *     responses:
 *       200:
 *         description: Matching pages
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
router.post(
  "/seo-pages/search",
  authMiddleware(ANY_ROLE),
  checkPermission("/seo-pages", "read"),
  allowOnlyFields(allowedSearchFields),
  searchValidation,
  listSeoPageByParams,
);

/**
 * @swagger
 * /seo-pages:
 *   post:
 *     summary: Create the SEO record for one URL
 *     tags: [SEO]
 *     responses:
 *       201:
 *         description: Created
 *       409:
 *         description: That path already has an SEO page
 *   get:
 *     summary: Every active SEO page, unpaginated
 *     tags: [SEO]
 *     responses:
 *       200:
 *         description: All active SEO pages
 */
router.post(
  "/seo-pages",
  authMiddleware(ANY_ROLE),
  checkPermission("/seo-pages", "write"),
  allowOnlyFields(allowedSeoPageFields),
  seoPageValidation,
  createSeoPage,
);

router.get("/seo-pages", authMiddleware(ANY_ROLE), checkPermission("/seo-pages", "read"), listSeoPages);

/**
 * @swagger
 * /seo-pages/{seoPageId}:
 *   get:
 *     summary: One SEO page
 *     tags: [SEO]
 *   put:
 *     summary: Update one SEO page
 *     tags: [SEO]
 *   delete:
 *     summary: Soft delete one SEO page
 *     tags: [SEO]
 */
router.get(
  "/seo-pages/:seoPageId",
  authMiddleware(ANY_ROLE),
  checkPermission("/seo-pages", "read"),
  getSeoPageById,
);

router.put(
  "/seo-pages/:seoPageId",
  authMiddleware(ANY_ROLE),
  checkPermission("/seo-pages", "edit"),
  allowOnlyFields(allowedSeoPageFields),
  seoPageValidation,
  updateSeoPage,
);

router.delete(
  "/seo-pages/:seoPageId",
  authMiddleware(ANY_ROLE),
  checkPermission("/seo-pages", "delete"),
  deleteSeoPage,
);

// ============ SEO SETTINGS ============

/**
 * @swagger
 * /seo-settings:
 *   get:
 *     summary: Site-wide SEO defaults (never includes the site key)
 *     tags: [SEO]
 *   put:
 *     summary: Update the site-wide SEO defaults
 *     tags: [SEO]
 */
// Deliberately matrix-free, like the dropdown GETs: the SEO page editor reads
// these defaults to render its live preview, so gating them would break that
// screen for anyone without settings access. The site key is stripped from the
// response and has its own gated endpoint below.
router.get("/seo-settings", authMiddleware(ANY_ROLE), getSeoSettings);

router.put(
  "/seo-settings",
  authMiddleware(ANY_ROLE),
  checkPermission("/seo-settings", "edit"),
  allowOnlyFields(allowedSeoSettingsFields),
  seoSettingsValidation,
  updateSeoSettings,
);

/**
 * @swagger
 * /seo-settings/site-key:
 *   get:
 *     summary: Reveal the site key the public website authenticates with
 *     tags: [SEO]
 *   post:
 *     summary: Generate a new site key, invalidating the old one
 *     tags: [SEO]
 */
router.get(
  "/seo-settings/site-key",
  authMiddleware(ANY_ROLE),
  checkPermission("/seo-settings", "read"),
  getSiteKey,
);

router.post(
  "/seo-settings/site-key",
  authMiddleware(ANY_ROLE),
  checkPermission("/seo-settings", "edit"),
  rotateSiteKey,
);

// ============ REDIRECTS ============

/**
 * @swagger
 * /seo-redirects/search:
 *   post:
 *     summary: Paginated, filtered list of redirects
 *     tags: [SEO]
 */
router.post(
  "/seo-redirects/search",
  authMiddleware(ANY_ROLE),
  checkPermission("/seo-redirects", "read"),
  allowOnlyFields(allowedSearchFields),
  searchValidation,
  listSeoRedirectByParams,
);

/**
 * @swagger
 * /seo-redirects/import:
 *   post:
 *     summary: Bulk create redirects from CSV rows
 *     tags: [SEO]
 */
router.post(
  "/seo-redirects/import",
  authMiddleware(ANY_ROLE),
  checkPermission("/seo-redirects", "write"),
  allowOnlyFields(allowedSeoImportFields),
  seoImportValidation,
  importSeoRedirects,
);

/**
 * @swagger
 * /seo-redirects:
 *   post:
 *     summary: Create a redirect
 *     tags: [SEO]
 *   get:
 *     summary: Every active redirect, unpaginated
 *     tags: [SEO]
 */
router.post(
  "/seo-redirects",
  authMiddleware(ANY_ROLE),
  checkPermission("/seo-redirects", "write"),
  allowOnlyFields(allowedSeoRedirectFields),
  seoRedirectValidation,
  createSeoRedirect,
);

router.get(
  "/seo-redirects",
  authMiddleware(ANY_ROLE),
  checkPermission("/seo-redirects", "read"),
  listSeoRedirects,
);

/**
 * @swagger
 * /seo-redirects/{seoRedirectId}:
 *   get:
 *     summary: One redirect
 *     tags: [SEO]
 *   put:
 *     summary: Update one redirect
 *     tags: [SEO]
 *   delete:
 *     summary: Soft delete one redirect
 *     tags: [SEO]
 */
router.get(
  "/seo-redirects/:seoRedirectId",
  authMiddleware(ANY_ROLE),
  checkPermission("/seo-redirects", "read"),
  getSeoRedirectById,
);

router.put(
  "/seo-redirects/:seoRedirectId",
  authMiddleware(ANY_ROLE),
  checkPermission("/seo-redirects", "edit"),
  allowOnlyFields(allowedSeoRedirectFields),
  seoRedirectValidation,
  updateSeoRedirect,
);

router.delete(
  "/seo-redirects/:seoRedirectId",
  authMiddleware(ANY_ROLE),
  checkPermission("/seo-redirects", "delete"),
  deleteSeoRedirect,
);

// ============ 404 LOG ============

/**
 * @swagger
 * /seo-not-found/search:
 *   post:
 *     summary: Paginated, filtered list of logged 404s
 *     tags: [SEO]
 */
router.post(
  "/seo-not-found/search",
  authMiddleware(ANY_ROLE),
  checkPermission("/seo-404", "read"),
  allowOnlyFields(allowedSearchFields),
  searchValidation,
  listSeoNotFoundByParams,
);

/**
 * @swagger
 * /seo-not-found/{seoNotFoundId}/redirect:
 *   post:
 *     summary: Create a redirect for a logged 404 and mark it resolved
 *     tags: [SEO]
 */
router.post(
  "/seo-not-found/:seoNotFoundId/redirect",
  authMiddleware(ANY_ROLE),
  checkPermission("/seo-404", "write"),
  allowOnlyFields(allowedSeoNotFoundRedirectFields),
  seoNotFoundRedirectValidation,
  redirectSeoNotFound,
);

/**
 * @swagger
 * /seo-not-found/{seoNotFoundId}:
 *   delete:
 *     summary: Remove one entry from the 404 log
 *     tags: [SEO]
 */
router.delete(
  "/seo-not-found/:seoNotFoundId",
  authMiddleware(ANY_ROLE),
  checkPermission("/seo-404", "delete"),
  deleteSeoNotFound,
);

export default router;
