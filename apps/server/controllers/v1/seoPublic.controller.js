import { absoluteUrl, normalizePath } from "@demo-panel/shared/seo";
import { buildRobotsTxt, buildSitemapXml, resolveSeo, toTags } from "@demo-panel/shared/seoResolve";
import SeoPage from "../../models/SeoPage.js";
import SeoRedirect from "../../models/SeoRedirect.js";
import SeoNotFound from "../../models/SeoNotFound.js";
import SeoUrl from "../../models/SeoUrl.js";
import {
  getCachedPage,
  getCachedRedirect,
  getCachedSettings,
  getCachedSitemap,
  invalidateSeoCache,
  setCachedSitemap,
} from "../../utils/seoCache.js";

/**
 * The public face of the SEO module — the only endpoints in this codebase that
 * are not behind a session.
 *
 * They have to be: the public website is a separate application with no login,
 * and it needs these on every page render. The reads expose nothing private —
 * meta tags are visible in any page's source — and they are resolve-by-path
 * only, never a listing, so the set of URLs cannot be enumerated from here.
 * The two write endpoints are guarded by the site key (middlewares/siteKey.js).
 */

const ok = (res, status, payload = {}) => res.status(status).json({ isOk: true, status, ...payload });
const fail = (res, status, message) => res.status(status).json({ isOk: false, status, message });

const serverError = (res, label, error) => {
  console.error(`Error in ${label}:`, error);
  return fail(res, 500, "Internal server error");
};

/**
 * Everything the site needs to render one page's head, in one call.
 *
 * A matching redirect short-circuits: the site cannot intercept traffic on our
 * behalf, so the redirect verdict rides along with the metadata request rather
 * than costing a second round trip on every page view.
 *
 * ponytail: no rate limiter. Every lookup here is an in-memory map read behind
 * the cache, so hammering it costs a hash lookup. Add one if it ever fronts
 * something that queries per request.
 */
export const resolvePublicSeo = async (req, res) => {
  try {
    const path = normalizePath(req.body?.path ?? req.query?.path ?? "/");
    const settings = await getCachedSettings();

    const redirect = await getCachedRedirect(path);
    if (redirect) {
      // Fire and forget: a hit counter must never delay the response, and
      // losing one under load is cheaper than making every visitor wait.
      SeoRedirect.updateOne(
        { _id: redirect._id },
        { $inc: { hits: 1 }, $set: { lastHitAt: new Date() } },
      ).catch((error) => console.error("Failed to record redirect hit:", error));

      return ok(res, 200, {
        data: {
          path,
          redirect: {
            to: redirect.statusCode === 410 ? null : redirect.toPath,
            status: redirect.statusCode,
          },
        },
      });
    }

    const page = await getCachedPage(path);
    const resolved = resolveSeo(page ?? {}, settings, path);

    return ok(res, 200, {
      data: {
        path,
        // Present so the site can tell "we have SEO for this" from "these are
        // the site-wide defaults", e.g. to fall back to its own record fields.
        found: Boolean(page),
        redirect: null,
        tags: toTags(resolved, settings),
      },
    });
  } catch (error) {
    return serverError(res, "resolvePublicSeo", error);
  }
};

/**
 * sitemap.xml, built from the hand-authored pages plus whatever URL list the
 * site last pushed.
 *
 * A page wins over a pushed URL for the same path — it carries a deliberate
 * priority and change frequency, where a pushed URL only knows it exists.
 */
export const publicSitemap = async (req, res) => {
  try {
    const settings = await getCachedSettings();

    if (settings.globalNoindex) {
      // Serving a sitemap while asking not to be indexed is a contradiction
      // that only leads to crawl requests.
      return res.status(404).type("text/plain").send("Sitemap disabled\n");
    }

    const cached = getCachedSitemap();
    if (cached) return res.type("application/xml").send(cached);

    const [pages, urls] = await Promise.all([
      SeoPage.find({ isActive: true, "sitemap.include": true, "robots.index": true })
        .select("path sitemap updatedAt")
        .lean(),
      SeoUrl.find({ isActive: true }).select("path lastmod").lean(),
    ]);

    const entries = new Map();
    for (const url of urls) {
      entries.set(url.path, { path: url.path, lastmod: url.lastmod });
    }
    for (const page of pages) {
      entries.set(page.path, {
        path: page.path,
        lastmod: page.updatedAt,
        priority: page.sitemap?.priority,
        changefreq: page.sitemap?.changefreq,
      });
    }

    const xml = buildSitemapXml(
      [...entries.values()].sort((a, b) => a.path.localeCompare(b.path)),
      settings.baseUrl,
    );
    setCachedSitemap(xml);
    return res.type("application/xml").send(xml);
  } catch (error) {
    console.error("Error in publicSitemap:", error);
    return res.status(500).type("text/plain").send("Internal server error\n");
  }
};

export const publicRobotsTxt = async (req, res) => {
  try {
    const settings = await getCachedSettings();
    const sitemapUrl = settings.baseUrl ? absoluteUrl(settings.baseUrl, "/sitemap.xml") : "";
    return res.type("text/plain").send(buildRobotsTxt(settings, sitemapUrl));
  } catch (error) {
    console.error("Error in publicRobotsTxt:", error);
    return res.status(500).type("text/plain").send("Internal server error\n");
  }
};

/**
 * The site reports the URLs it has, so the sitemap can list pages this panel
 * has never heard of — product pages, articles, anything a collection owns.
 *
 * `replace: true` prunes paths missing from the payload, which is what makes a
 * full publish keep the sitemap honest when pages are removed. Without it the
 * sitemap only ever grows and eventually advertises URLs that 404.
 */
export const receivePublicUrls = async (req, res) => {
  try {
    const submitted = Array.isArray(req.body?.urls) ? req.body.urls : [];
    if (!submitted.length) return fail(res, 400, "No urls submitted");
    if (submitted.length > 5000) return fail(res, 400, "Send at most 5000 urls per request");

    const rows = [];
    const seen = new Set();
    for (const entry of submitted) {
      const path = normalizePath(typeof entry === "string" ? entry : entry?.path);
      if (!path || seen.has(path)) continue;
      seen.add(path);

      const lastmodValue = typeof entry === "object" ? entry?.lastmod : null;
      const lastmod = lastmodValue ? new Date(lastmodValue) : new Date();
      rows.push({ path, lastmod: Number.isNaN(lastmod.getTime()) ? new Date() : lastmod });
    }

    if (!rows.length) return fail(res, 400, "No usable urls submitted");

    await SeoUrl.bulkWrite(
      rows.map((row) => ({
        updateOne: {
          filter: { path: row.path, isDeleted: { $ne: true } },
          update: { $set: { lastmod: row.lastmod, isActive: true }, $setOnInsert: { source: "push", isDeleted: false } },
          upsert: true,
        },
      })),
    );

    let pruned = 0;
    if (req.body?.replace === true) {
      const result = await SeoUrl.updateMany(
        { path: { $nin: [...seen] }, source: "push" },
        { $set: { isDeleted: true } },
      );
      pruned = result.modifiedCount ?? 0;
    }

    invalidateSeoCache();
    return ok(res, 200, {
      message: `Recorded ${rows.length} url(s)`,
      data: { received: rows.length, pruned },
    });
  } catch (error) {
    return serverError(res, "receivePublicUrls", error);
  }
};

/**
 * The site reports a URL it could not serve.
 *
 * One row per path with a counter, not one per request — a broken link on a
 * busy page would otherwise write thousands of near-identical documents, and
 * "which URLs, how often" is the only question this log needs to answer.
 */
export const receivePublicNotFound = async (req, res) => {
  try {
    const path = normalizePath(req.body?.path);
    if (!path || path === "/") return fail(res, 400, "A path is required");

    const now = new Date();
    await SeoNotFound.findOneAndUpdate(
      { path },
      {
        $inc: { hits: 1 },
        $set: {
          lastSeenAt: now,
          lastReferrer: String(req.body?.referrer ?? "").slice(0, 500),
          lastUserAgent: String(req.headers["user-agent"] ?? "").slice(0, 500),
        },
        $setOnInsert: { firstSeenAt: now, isResolved: false, isActive: true },
      },
      { upsert: true, setDefaultsOnInsert: true },
    );

    return ok(res, 200, { message: "Recorded" });
  } catch (error) {
    return serverError(res, "receivePublicNotFound", error);
  }
};
