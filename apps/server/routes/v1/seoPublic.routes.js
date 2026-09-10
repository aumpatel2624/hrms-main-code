import express from "express";
import {
  allowOnlyFields,
  allowedPublicResolveFields,
  publicResolveValidation,
  allowedPublicUrlFields,
  publicUrlsValidation,
  allowedPublicNotFoundFields,
  publicNotFoundValidation,
} from "../../middlewares/inputValidator.js";
import { requireSiteKey } from "../../middlewares/siteKey.js";
import {
  resolvePublicSeo,
  publicSitemap,
  publicRobotsTxt,
  receivePublicUrls,
  receivePublicNotFound,
} from "../../controllers/v1/seoPublic.controller.js";

/**
 * The only unauthenticated routes in this codebase.
 *
 * The public website is a separate application with no session, and it needs
 * these on every page render. Reads are open because meta tags, sitemaps and
 * robots.txt are public by definition — and because resolve answers one path at
 * a time, never a listing, the set of URLs cannot be enumerated through it.
 *
 * The two writes are a different matter: without a guard, anyone could stuff the
 * sitemap with URLs that do not exist and drown the 404 log. Both require the
 * site key generated on the SEO settings screen.
 */
const router = express.Router();

/**
 * @swagger
 * /public/seo/resolve:
 *   post:
 *     summary: Finished meta tags for one path, plus any redirect that applies
 *     tags: [SEO Public]
 *     responses:
 *       200:
 *         description: Either a redirect verdict or a Helmet-ready tag set
 */
router.post(
  "/public/seo/resolve",
  allowOnlyFields(allowedPublicResolveFields),
  publicResolveValidation,
  resolvePublicSeo,
);

/**
 * @swagger
 * /public/seo/sitemap.xml:
 *   get:
 *     summary: Generated sitemap covering managed pages and pushed URLs
 *     tags: [SEO Public]
 */
router.get("/public/seo/sitemap.xml", publicSitemap);

/**
 * @swagger
 * /public/seo/robots.txt:
 *   get:
 *     summary: The editable robots.txt, with its Sitemap line kept current
 *     tags: [SEO Public]
 */
router.get("/public/seo/robots.txt", publicRobotsTxt);

/**
 * @swagger
 * /public/seo/urls:
 *   post:
 *     summary: The site reports the URLs it has, for the sitemap
 *     tags: [SEO Public]
 *     responses:
 *       401:
 *         description: Missing or invalid site key
 */
router.post(
  "/public/seo/urls",
  requireSiteKey,
  allowOnlyFields(allowedPublicUrlFields),
  publicUrlsValidation,
  receivePublicUrls,
);

/**
 * @swagger
 * /public/seo/404:
 *   post:
 *     summary: The site reports a URL it could not serve
 *     tags: [SEO Public]
 *     responses:
 *       401:
 *         description: Missing or invalid site key
 */
router.post(
  "/public/seo/404",
  requireSiteKey,
  allowOnlyFields(allowedPublicNotFoundFields),
  publicNotFoundValidation,
  receivePublicNotFound,
);

export default router;
