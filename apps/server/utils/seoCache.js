import SeoPage from "../models/SeoPage.js";
import SeoSettings from "../models/SeoSettings.js";
import SeoRedirect from "../models/SeoRedirect.js";

/**
 * In-memory cache for the public resolver.
 *
 * `POST /public/seo/resolve` runs on every page render of the public site, so
 * it must not cost three queries. Same shape as the permission cache in
 * checkPermission.js: a short TTL, and every admin write calls
 * invalidateSeoCache() so a saved change is live immediately rather than up to
 * a minute later — which would read as a bug to whoever just saved it.
 *
 * Fine for the single-process deployment this starter ships. A multi-process
 * deploy accepts up to TTL_MS of staleness on the processes that did not serve
 * the write.
 *
 * ponytail: whole-map caches, not per-key. SeoPage holds the site's fixed URLs
 * — tens of rows, not thousands, because content-owned URLs carry their own SEO.
 * If a project ever puts thousands of rows here, switch to an LRU keyed by path.
 */

const TTL_MS = 60 * 1000;

let settingsCache = { at: 0, doc: null };
let pageCache = { at: 0, byPath: null };
let redirectCache = { at: 0, byPath: null };
let sitemapCache = { at: 0, xml: null };

/** Sitemaps are rebuilt from thousands of rows, so they get a longer window. */
const SITEMAP_TTL_MS = 5 * 60 * 1000;

export const invalidateSeoCache = () => {
  settingsCache = { at: 0, doc: null };
  pageCache = { at: 0, byPath: null };
  redirectCache = { at: 0, byPath: null };
  sitemapCache = { at: 0, xml: null };
};

const fresh = (cache, ttl = TTL_MS) => Date.now() - cache.at <= ttl;

export const getCachedSettings = async () => {
  if (settingsCache.doc && fresh(settingsCache)) return settingsCache.doc;

  const doc = (await SeoSettings.findOne({ key: "default" }).lean()) ?? {};
  settingsCache = { at: Date.now(), doc };
  return doc;
};

export const getCachedPage = async (path) => {
  if (!pageCache.byPath || !fresh(pageCache)) {
    const pages = await SeoPage.find({ isActive: true }).lean();
    pageCache = { at: Date.now(), byPath: new Map(pages.map((page) => [page.path, page])) };
  }
  return pageCache.byPath.get(path) ?? null;
};

export const getCachedRedirect = async (path) => {
  if (!redirectCache.byPath || !fresh(redirectCache)) {
    const redirects = await SeoRedirect.find({ isActive: true }).lean();
    redirectCache = {
      at: Date.now(),
      byPath: new Map(redirects.map((redirect) => [redirect.fromPath, redirect])),
    };
  }
  return redirectCache.byPath.get(path) ?? null;
};

export const getCachedSitemap = () => (sitemapCache.xml && fresh(sitemapCache, SITEMAP_TTL_MS) ? sitemapCache.xml : null);

export const setCachedSitemap = (xml) => {
  sitemapCache = { at: Date.now(), xml };
};
