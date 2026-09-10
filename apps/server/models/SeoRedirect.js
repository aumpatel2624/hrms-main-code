import mongoose from "mongoose";
import { REDIRECT_STATUSES } from "@demo-panel/shared/seo";

/**
 * One "this URL moved" rule.
 *
 * The panel cannot intercept traffic it never sees, so these are not enforced
 * here — the resolve endpoint reports the matching rule and the public site
 * performs the redirect. That keeps redirects live the moment they are saved,
 * with no deploy and no web-server config.
 */
const SeoRedirectSchema = new mongoose.Schema(
  {
    // Normalised through normalizePath on write, same as SeoPage.path.
    fromPath: { type: String, required: true, trim: true },
    // Empty when statusCode is 410 (Gone) — that status has no destination.
    // May be a path or an absolute URL for an off-site move.
    toPath: { type: String, trim: true, default: "" },
    statusCode: { type: Number, enum: REDIRECT_STATUSES, default: 301, required: true },

    // Incremented by the resolve endpoint, so a redirect nobody hits is
    // visible as dead weight rather than living forever.
    hits: { type: Number, default: 0 },
    lastHitAt: { type: Date, default: null },
    notes: { type: String, trim: true, default: "" },

    isActive: { type: Boolean, default: true, required: true },
  },
  { timestamps: true },
);

SeoRedirectSchema.index({ fromPath: 1 }, { unique: true });
SeoRedirectSchema.index({ statusCode: 1 });
SeoRedirectSchema.index({ isActive: 1 });
SeoRedirectSchema.index({ hits: -1 });
SeoRedirectSchema.index({ createdAt: -1 });

export default mongoose.model("SeoRedirect", SeoRedirectSchema);
