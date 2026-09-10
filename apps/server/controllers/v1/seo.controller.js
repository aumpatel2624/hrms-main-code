import { normalizePath } from "@demo-panel/shared/seo";
import SeoPage from "../../models/SeoPage.js";
import SeoSettings from "../../models/SeoSettings.js";
import SeoRedirect from "../../models/SeoRedirect.js";
import SeoNotFound from "../../models/SeoNotFound.js";
import { runListQuery } from "../../utils/listQuery.js";
import { getReferencingCounts, formatReferenceMessage } from "../../utils/referenceHelper.js";
import { generateSiteKey } from "../../middlewares/siteKey.js";
import { invalidateSeoCache } from "../../utils/seoCache.js";

/**
 * SEO management: the fixed URLs of the public site, the site-wide defaults,
 * redirects, and the 404 log.
 *
 * Every write here invalidates the resolver cache — the public endpoint is on
 * the hot path of every page render, so it reads from memory, and a saved
 * change that took a minute to appear would look like a bug.
 */

const ok = (res, status, payload = {}) => res.status(status).json({ isOk: true, status, ...payload });
const fail = (res, status, message) => res.status(status).json({ isOk: false, status, message });

const serverError = (res, label, error) => {
  console.error(`Error in ${label}:`, error);
  return fail(res, 500, "Internal server error");
};

// ---- shaping ------------------------------------------------------------
// Client bodies are never spread into a model. Each group is picked field by
// field, so a payload carrying `isDeleted` or `_id` cannot reach Mongo.

const pickDefined = (source, keys) =>
  Object.fromEntries(
    keys.filter((key) => source?.[key] !== undefined).map((key) => [key, source[key]]),
  );

const ROBOTS_KEYS = ["index", "follow", "noarchive", "nosnippet", "noimageindex", "maxSnippet", "maxImagePreview"];

const pickPage = (body = {}) => ({
  ...pickDefined(body, ["pageName", "focusKeyword", "title", "description", "canonicalUrl", "isActive"]),
  ...(body.path !== undefined && { path: normalizePath(body.path) }),
  ...(body.robots !== undefined && { robots: pickDefined(body.robots, ROBOTS_KEYS) }),
  ...(body.og !== undefined && { og: pickDefined(body.og, ["title", "description", "image", "imageAlt", "type"]) }),
  ...(body.twitter !== undefined && { twitter: pickDefined(body.twitter, ["card", "title", "description", "image"]) }),
  ...(body.jsonLd !== undefined && { jsonLd: pickDefined(body.jsonLd, ["schemaType", "body"]) }),
  ...(body.sitemap !== undefined && { sitemap: pickDefined(body.sitemap, ["include", "priority", "changefreq"]) }),
});

/**
 * Structured data is stored as text so an author's formatting survives, which
 * means this is the only place syntax gets checked before it reaches a page.
 * Tokens are stripped first — `{{title}}` is not valid JSON on its own but is
 * perfectly valid here.
 */
const jsonLdError = (page) => {
  const body = String(page?.jsonLd?.body ?? "").trim();
  if (!body) return null;
  try {
    JSON.parse(body.replace(/\{\{\s*[\w.]+\s*\}\}/g, "x"));
    return null;
  } catch (error) {
    return `Structured data is not valid JSON: ${error.message}`;
  }
};

// ---- pages --------------------------------------------------------------

export const createSeoPage = async (req, res) => {
  try {
    const page = pickPage(req.body);
    if (!page.path) return fail(res, 400, "Path is required");
    if (!page.pageName) return fail(res, 400, "Page name is required");

    const invalid = jsonLdError(page);
    if (invalid) return fail(res, 400, invalid);

    // The unique index is what actually holds under concurrency; this exists
    // to return a sentence a human can act on instead of a driver error.
    const existing = await SeoPage.findOne({ path: page.path }).lean();
    if (existing) return fail(res, 409, `${page.path} already has an SEO page`);

    const created = await SeoPage.create(page);
    invalidateSeoCache();
    return ok(res, 201, { message: "SEO page created successfully", data: created });
  } catch (error) {
    if (error?.code === 11000) return fail(res, 409, "That path already has an SEO page");
    return serverError(res, "createSeoPage", error);
  }
};

export const listSeoPages = async (req, res) => {
  try {
    const pages = await SeoPage.find({ isActive: true }).sort({ path: 1 }).lean();
    return ok(res, 200, { data: pages });
  } catch (error) {
    return serverError(res, "listSeoPages", error);
  }
};

export const getSeoPageById = async (req, res) => {
  try {
    const page = await SeoPage.findById(req.params.seoPageId).lean();
    if (!page) return fail(res, 404, "SEO page not found");
    return ok(res, 200, { data: page });
  } catch (error) {
    return serverError(res, "getSeoPageById", error);
  }
};

export const updateSeoPage = async (req, res) => {
  try {
    const page = pickPage(req.body);

    const invalid = jsonLdError(page);
    if (invalid) return fail(res, 400, invalid);

    if (page.path) {
      const clash = await SeoPage.findOne({ path: page.path, _id: { $ne: req.params.seoPageId } }).lean();
      if (clash) return fail(res, 409, `${page.path} already has an SEO page`);
    }

    const updated = await SeoPage.findByIdAndUpdate(req.params.seoPageId, page, { new: true });
    if (!updated) return fail(res, 404, "SEO page not found");

    invalidateSeoCache();
    return ok(res, 200, { message: "SEO page updated successfully", data: updated });
  } catch (error) {
    if (error?.code === 11000) return fail(res, 409, "That path already has an SEO page");
    return serverError(res, "updateSeoPage", error);
  }
};

export const deleteSeoPage = async (req, res) => {
  try {
    const referenceInfo = await getReferencingCounts("SeoPage", req.params.seoPageId);
    if (referenceInfo.totalReferences > 0) {
      return res.status(409).json({
        isOk: false,
        status: 409,
        message: "Cannot delete this SEO page. It is being used by other records.",
        totalReferences: referenceInfo.totalReferences,
        references: referenceInfo.details,
        formattedMessage: formatReferenceMessage(referenceInfo.details),
      });
    }

    const deleted = await SeoPage.findByIdAndUpdate(req.params.seoPageId, { isDeleted: true });
    if (!deleted) return fail(res, 404, "SEO page not found");

    invalidateSeoCache();
    return ok(res, 200, { message: "SEO page deleted successfully" });
  } catch (error) {
    return serverError(res, "deleteSeoPage", error);
  }
};

export const listSeoPageByParams = async (req, res) => {
  try {
    const list = await runListQuery(SeoPage, req.body, {
      searchFields: ["path", "pageName", "title", "description", "focusKeyword"],
      filterable: {
        path: "string",
        pageName: "string",
        title: "string",
        description: "string",
        focusKeyword: "string",
        "robots.index": "boolean",
        "sitemap.include": "boolean",
        isActive: "boolean",
        createdAt: "date",
        updatedAt: "date",
      },
    });
    return ok(res, 200, { data: list });
  } catch (error) {
    return serverError(res, "listSeoPageByParams", error);
  }
};

// ---- settings -----------------------------------------------------------

/**
 * The settings singleton, created on first read.
 *
 * Upserting here rather than in the seeder means a database that predates this
 * module still opens the settings screen with a usable document instead of an
 * empty form that silently saves nothing.
 */
export const getSettingsDoc = async () => {
  const existing = await SeoSettings.findOne({ key: "default" });
  if (existing) return existing;
  return SeoSettings.create({ key: "default" });
};

export const getSeoSettings = async (req, res) => {
  try {
    const settings = await getSettingsDoc();
    // The site key is a secret and this endpoint is matrix-free, because the
    // page editor needs the defaults to render its preview. It has its own
    // permission-gated endpoint below.
    const { siteKey, ...safe } = settings.toObject();
    return ok(res, 200, { data: { ...safe, hasSiteKey: Boolean(siteKey) } });
  } catch (error) {
    return serverError(res, "getSeoSettings", error);
  }
};

export const updateSeoSettings = async (req, res) => {
  try {
    const body = req.body ?? {};
    const update = {
      ...pickDefined(body, [
        "siteName",
        "titleSeparator",
        "defaultTitleTemplate",
        "defaultDescription",
        "defaultOgImage",
        "defaultTwitterCard",
        "globalNoindex",
        "robotsTxt",
        "isActive",
      ]),
      // Trailing slashes here would double up in every canonical URL.
      ...(body.baseUrl !== undefined && { baseUrl: String(body.baseUrl).trim().replace(/\/+$/, "") }),
      ...(body.robots !== undefined && { robots: pickDefined(body.robots, ROBOTS_KEYS) }),
      ...(body.verification !== undefined && {
        verification: pickDefined(body.verification, ["google", "bing", "yandex", "pinterest", "facebookDomain"]),
      }),
      ...(body.organization !== undefined && {
        organization: {
          ...pickDefined(body.organization, ["type", "name", "logo"]),
          // Bounded by hand: a company has a handful of social profiles, and an
          // unbounded array in a document is a size ceiling waiting to happen.
          ...(body.organization.sameAs !== undefined && {
            sameAs: (Array.isArray(body.organization.sameAs) ? body.organization.sameAs : [])
              .map((entry) => String(entry).trim())
              .filter(Boolean)
              .slice(0, 20),
          }),
        },
      }),
    };

    if (update.baseUrl && !/^https?:\/\//i.test(update.baseUrl)) {
      return fail(res, 400, "Base URL must start with http:// or https://");
    }

    await getSettingsDoc();
    const settings = await SeoSettings.findOneAndUpdate({ key: "default" }, update, { new: true });

    invalidateSeoCache();
    const { siteKey, ...safe } = settings.toObject();
    return ok(res, 200, {
      message: "SEO settings updated successfully",
      data: { ...safe, hasSiteKey: Boolean(siteKey) },
    });
  } catch (error) {
    return serverError(res, "updateSeoSettings", error);
  }
};

export const getSiteKey = async (req, res) => {
  try {
    const settings = await getSettingsDoc();
    return ok(res, 200, { data: { siteKey: settings.siteKey || "" } });
  } catch (error) {
    return serverError(res, "getSiteKey", error);
  }
};

export const rotateSiteKey = async (req, res) => {
  try {
    await getSettingsDoc();
    const settings = await SeoSettings.findOneAndUpdate(
      { key: "default" },
      { siteKey: generateSiteKey(), siteKeyRotatedAt: new Date() },
      { new: true },
    );
    return ok(res, 200, {
      message: "Site key regenerated. Update it on the website before its next publish.",
      data: { siteKey: settings.siteKey },
    });
  } catch (error) {
    return serverError(res, "rotateSiteKey", error);
  }
};

// ---- redirects ----------------------------------------------------------

const pickRedirect = (body = {}) => ({
  ...pickDefined(body, ["statusCode", "notes", "isActive"]),
  ...(body.fromPath !== undefined && { fromPath: normalizePath(body.fromPath) }),
  // A destination may be an off-site absolute URL, so only paths are normalised.
  ...(body.toPath !== undefined && {
    toPath: /^https?:\/\//i.test(String(body.toPath).trim())
      ? String(body.toPath).trim()
      : String(body.toPath).trim()
        ? normalizePath(body.toPath)
        : "",
  }),
});

/** 410 Gone has no destination; everything else must have one that is not itself. */
const redirectError = (redirect) => {
  if (!redirect.fromPath) return "From path is required";
  if (Number(redirect.statusCode) === 410) return null;
  if (!redirect.toPath) return "To path is required";
  if (redirect.toPath === redirect.fromPath) return "A redirect cannot point at itself";
  return null;
};

export const createSeoRedirect = async (req, res) => {
  try {
    const redirect = { statusCode: 301, ...pickRedirect(req.body) };
    const invalid = redirectError(redirect);
    if (invalid) return fail(res, 400, invalid);

    const existing = await SeoRedirect.findOne({ fromPath: redirect.fromPath }).lean();
    if (existing) return fail(res, 409, `A redirect from ${redirect.fromPath} already exists`);

    const created = await SeoRedirect.create(redirect);
    invalidateSeoCache();
    return ok(res, 201, { message: "Redirect created successfully", data: created });
  } catch (error) {
    if (error?.code === 11000) return fail(res, 409, "A redirect from that path already exists");
    return serverError(res, "createSeoRedirect", error);
  }
};

export const listSeoRedirects = async (req, res) => {
  try {
    const redirects = await SeoRedirect.find({ isActive: true }).sort({ fromPath: 1 }).lean();
    return ok(res, 200, { data: redirects });
  } catch (error) {
    return serverError(res, "listSeoRedirects", error);
  }
};

export const getSeoRedirectById = async (req, res) => {
  try {
    const redirect = await SeoRedirect.findById(req.params.seoRedirectId).lean();
    if (!redirect) return fail(res, 404, "Redirect not found");
    return ok(res, 200, { data: redirect });
  } catch (error) {
    return serverError(res, "getSeoRedirectById", error);
  }
};

export const updateSeoRedirect = async (req, res) => {
  try {
    const current = await SeoRedirect.findById(req.params.seoRedirectId).lean();
    if (!current) return fail(res, 404, "Redirect not found");

    const redirect = { ...current, ...pickRedirect(req.body) };
    const invalid = redirectError(redirect);
    if (invalid) return fail(res, 400, invalid);

    const clash = await SeoRedirect.findOne({
      fromPath: redirect.fromPath,
      _id: { $ne: req.params.seoRedirectId },
    }).lean();
    if (clash) return fail(res, 409, `A redirect from ${redirect.fromPath} already exists`);

    const updated = await SeoRedirect.findByIdAndUpdate(
      req.params.seoRedirectId,
      pickRedirect(req.body),
      { new: true },
    );

    invalidateSeoCache();
    return ok(res, 200, { message: "Redirect updated successfully", data: updated });
  } catch (error) {
    if (error?.code === 11000) return fail(res, 409, "A redirect from that path already exists");
    return serverError(res, "updateSeoRedirect", error);
  }
};

export const deleteSeoRedirect = async (req, res) => {
  try {
    const deleted = await SeoRedirect.findByIdAndUpdate(req.params.seoRedirectId, { isDeleted: true });
    if (!deleted) return fail(res, 404, "Redirect not found");

    invalidateSeoCache();
    return ok(res, 200, { message: "Redirect deleted successfully" });
  } catch (error) {
    return serverError(res, "deleteSeoRedirect", error);
  }
};

export const listSeoRedirectByParams = async (req, res) => {
  try {
    const list = await runListQuery(SeoRedirect, req.body, {
      searchFields: ["fromPath", "toPath", "notes"],
      filterable: {
        fromPath: "string",
        toPath: "string",
        statusCode: "number",
        hits: "number",
        notes: "string",
        isActive: "boolean",
        lastHitAt: "date",
        createdAt: "date",
      },
    });
    return ok(res, 200, { data: list });
  } catch (error) {
    return serverError(res, "listSeoRedirectByParams", error);
  }
};

/**
 * Bulk create from a pasted CSV, which is how redirects arrive after a site
 * migration — a spreadsheet of old and new URLs, hundreds of rows long.
 *
 * Rows that clash with an existing redirect are skipped rather than failing the
 * whole import: a partial import someone can re-run beats an all-or-nothing one
 * that rejects 400 good rows because of two duplicates.
 */
export const importSeoRedirects = async (req, res) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (!rows.length) return fail(res, 400, "No rows to import");
    if (rows.length > 2000) return fail(res, 400, "Import is limited to 2000 rows at a time");

    const results = { created: 0, skipped: 0, errors: [] };

    for (const [index, row] of rows.entries()) {
      const redirect = { statusCode: 301, ...pickRedirect(row) };
      const invalid = redirectError(redirect);
      if (invalid) {
        results.skipped += 1;
        if (results.errors.length < 20) results.errors.push(`Row ${index + 1}: ${invalid}`);
        continue;
      }

      const existing = await SeoRedirect.findOne({ fromPath: redirect.fromPath }).lean();
      if (existing) {
        results.skipped += 1;
        if (results.errors.length < 20) {
          results.errors.push(`Row ${index + 1}: ${redirect.fromPath} already has a redirect`);
        }
        continue;
      }

      await SeoRedirect.create(redirect);
      results.created += 1;
    }

    invalidateSeoCache();
    return ok(res, 200, {
      message: `Imported ${results.created} redirect(s), skipped ${results.skipped}`,
      data: results,
    });
  } catch (error) {
    return serverError(res, "importSeoRedirects", error);
  }
};

// ---- 404 log ------------------------------------------------------------

export const listSeoNotFoundByParams = async (req, res) => {
  try {
    const list = await runListQuery(SeoNotFound, req.body, {
      searchFields: ["path", "lastReferrer"],
      filterable: {
        path: "string",
        hits: "number",
        lastReferrer: "string",
        isResolved: "boolean",
        isActive: "boolean",
        lastSeenAt: "date",
        createdAt: "date",
      },
    });
    return ok(res, 200, { data: list });
  } catch (error) {
    return serverError(res, "listSeoNotFoundByParams", error);
  }
};

export const deleteSeoNotFound = async (req, res) => {
  try {
    const deleted = await SeoNotFound.findByIdAndUpdate(req.params.seoNotFoundId, { isDeleted: true });
    if (!deleted) return fail(res, 404, "Log entry not found");
    return ok(res, 200, { message: "Log entry deleted successfully" });
  } catch (error) {
    return serverError(res, "deleteSeoNotFound", error);
  }
};

/**
 * The "fix this" button on the 404 log: create the redirect and tick the row
 * off in one call, so the list shows outstanding work rather than history.
 */
export const redirectSeoNotFound = async (req, res) => {
  try {
    const entry = await SeoNotFound.findById(req.params.seoNotFoundId);
    if (!entry) return fail(res, 404, "Log entry not found");

    const redirect = {
      statusCode: 301,
      ...pickRedirect({ ...req.body, fromPath: entry.path }),
      fromPath: normalizePath(entry.path),
    };
    const invalid = redirectError(redirect);
    if (invalid) return fail(res, 400, invalid);

    const existing = await SeoRedirect.findOne({ fromPath: redirect.fromPath }).lean();
    if (existing) return fail(res, 409, `A redirect from ${redirect.fromPath} already exists`);

    const created = await SeoRedirect.create(redirect);
    entry.isResolved = true;
    await entry.save();

    invalidateSeoCache();
    return ok(res, 201, { message: "Redirect created from the logged 404", data: created });
  } catch (error) {
    if (error?.code === 11000) return fail(res, 409, "A redirect from that path already exists");
    return serverError(res, "redirectSeoNotFound", error);
  }
};
