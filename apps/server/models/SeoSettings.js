import mongoose from "mongoose";
import { TITLE_SEPARATORS, TWITTER_CARDS } from "@demo-panel/shared/seo";
import { RobotsSchema } from "./SeoPage.js";

/**
 * Site-wide SEO defaults — one document, ever.
 *
 * Every field here is a fallback: the resolver uses it only where the page
 * being resolved left the corresponding field blank. That is what stops
 * someone typing the site name into a hundred page titles by hand.
 *
 * The singleton is enforced by a unique index on a constant `key` rather than
 * by convention, because "there is only one row" enforced only in a controller
 * becomes two rows the first time two people save at once.
 */

const OrganizationSchema = new mongoose.Schema(
  {
    // Drives the JSON-LD block on the home page. A consultancy is a Person,
    // a company is an Organization, and Google treats them differently.
    type: { type: String, enum: ["Organization", "Person"], default: "Organization" },
    name: { type: String, trim: true, default: "" },
    logo: { type: String, trim: true, default: "" },
    // Social profile URLs, emitted as schema.org sameAs. Bounded by hand in
    // the controller — a company has a handful of profiles, not thousands.
    sameAs: { type: [String], default: [] },
  },
  { _id: false },
);

const VerificationSchema = new mongoose.Schema(
  {
    google: { type: String, trim: true, default: "" },
    bing: { type: String, trim: true, default: "" },
    yandex: { type: String, trim: true, default: "" },
    pinterest: { type: String, trim: true, default: "" },
    facebookDomain: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const SeoSettingsSchema = new mongoose.Schema(
  {
    // Constant. The only reason this field exists is to hang a unique index on.
    key: { type: String, default: "default", required: true },

    siteName: { type: String, trim: true, default: "" },
    // Absolute, no trailing slash — canonical URLs, og:url and the sitemap are
    // all built from it. Without it there are no absolute URLs and social
    // crawlers reject relative image paths outright.
    baseUrl: { type: String, trim: true, default: "" },
    titleSeparator: { type: String, enum: TITLE_SEPARATORS, default: "|" },

    defaultTitleTemplate: { type: String, trim: true, default: "{{title}} {{sep}} {{siteName}}" },
    defaultDescription: { type: String, trim: true, default: "" },
    defaultOgImage: { type: String, trim: true, default: "" },
    defaultTwitterCard: { type: String, enum: TWITTER_CARDS, default: "summary_large_image" },

    organization: { type: OrganizationSchema, default: () => ({}) },
    verification: { type: VerificationSchema, default: () => ({}) },
    robots: { type: RobotsSchema, default: () => ({}) },

    /**
     * Kill switch. Forces noindex on every resolved page regardless of its own
     * settings — the one thing you want on a staging deployment, and three
     * lines cheaper than discovering the staging site got indexed.
     */
    globalNoindex: { type: Boolean, default: false },

    robotsTxt: {
      type: String,
      default: "User-agent: *\nAllow: /\n",
    },

    /**
     * Shared secret the public site sends on the two write endpoints (its URL
     * list and its 404 reports). Reads stay open — meta tags are public by
     * definition — but without this anyone could write your sitemap.
     * Stored in the clear because the panel has to be able to show it.
     */
    siteKey: { type: String, default: "" },
    siteKeyRotatedAt: { type: Date, default: null },

    isActive: { type: Boolean, default: true, required: true },
  },
  { timestamps: true },
);

SeoSettingsSchema.index({ key: 1 }, { unique: true });

export default mongoose.model("SeoSettings", SeoSettingsSchema);
