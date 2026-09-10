import mongoose from "mongoose";
import {
  CHANGE_FREQUENCIES,
  MAX_IMAGE_PREVIEW,
  OG_TYPES,
  SCHEMA_TYPES,
  TWITTER_CARDS,
} from "@demo-panel/shared/seo";

/**
 * Search-engine and social metadata for one fixed URL of the public site.
 *
 * Only URLs that have no owning record live here — the home page, /about, a
 * pricing page. Content that a collection owns (a product, an article) carries
 * its own SEO fields on that collection; this screen would otherwise become a
 * second place to edit the same page, and the two would drift.
 *
 * Every group below is embedded rather than referenced: none of them is ever
 * queried on its own, all of them are read with the page, and each is a fixed
 * handful of fields. That is exactly the case 20-schema.md allows embedding.
 */

export const RobotsSchema = new mongoose.Schema(
  {
    index: { type: Boolean, default: true },
    follow: { type: Boolean, default: true },
    noarchive: { type: Boolean, default: false },
    nosnippet: { type: Boolean, default: false },
    noimageindex: { type: Boolean, default: false },
    // -1 is Google's "no limit". Any other number caps the snippet length.
    maxSnippet: { type: Number, default: -1 },
    maxImagePreview: { type: String, enum: MAX_IMAGE_PREVIEW, default: "large" },
  },
  { _id: false },
);

const OgSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    image: { type: String, trim: true, default: "" },
    imageAlt: { type: String, trim: true, default: "" },
    type: { type: String, enum: OG_TYPES, default: "website" },
  },
  { _id: false },
);

const TwitterSchema = new mongoose.Schema(
  {
    card: { type: String, enum: TWITTER_CARDS, default: "summary_large_image" },
    title: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    image: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const JsonLdSchema = new mongoose.Schema(
  {
    schemaType: { type: String, enum: SCHEMA_TYPES, default: "None" },
    // Stored as a string, not an object: the author's formatting survives a
    // round trip, and a half-finished block can be saved without Mongo
    // rejecting it. The controller checks it parses before accepting a write.
    body: { type: String, default: "" },
  },
  { _id: false },
);

const SitemapSchema = new mongoose.Schema(
  {
    include: { type: Boolean, default: true },
    priority: { type: Number, default: 0.5, min: 0, max: 1 },
    changefreq: { type: String, enum: CHANGE_FREQUENCIES, default: "weekly" },
  },
  { _id: false },
);

const SeoPageSchema = new mongoose.Schema(
  {
    // Always stored through normalizePath: lowercased, leading slash, no
    // trailing slash, no query string. The controller normalises on write so
    // /About/ and /about can never become two rows.
    path: { type: String, required: true, trim: true },
    // The label this page is known by in the panel. Also the fallback for
    // {{title}}, so a page with no explicit title still renders sensibly.
    pageName: { type: String, required: true, trim: true },
    focusKeyword: { type: String, trim: true, default: "" },

    title: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    // Blank means "this page is its own canonical" — the resolver builds the
    // URL from the site's base URL. Only set this when a page is a duplicate.
    canonicalUrl: { type: String, trim: true, default: "" },

    robots: { type: RobotsSchema, default: () => ({}) },
    og: { type: OgSchema, default: () => ({}) },
    twitter: { type: TwitterSchema, default: () => ({}) },
    jsonLd: { type: JsonLdSchema, default: () => ({}) },
    sitemap: { type: SitemapSchema, default: () => ({}) },

    isActive: { type: Boolean, default: true, required: true },
  },
  { timestamps: true },
);

// One row per URL. The soft-delete plugin rewrites this as a partial index so
// a deleted page does not block re-creating the same path.
SeoPageSchema.index({ path: 1 }, { unique: true });
// Everything below is filterable or sortable on the list screen.
SeoPageSchema.index({ pageName: 1 });
SeoPageSchema.index({ isActive: 1 });
SeoPageSchema.index({ "robots.index": 1 });
SeoPageSchema.index({ "sitemap.include": 1 });
SeoPageSchema.index({ createdAt: -1 });
SeoPageSchema.index({ updatedAt: -1 });

export default mongoose.model("SeoPage", SeoPageSchema);
