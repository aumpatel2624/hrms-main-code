import mongoose from "mongoose";

/**
 * A URL the public site was asked for and could not serve, reported back by
 * the site itself.
 *
 * One row per path with a hit counter rather than one row per request: a
 * broken link on a busy page would otherwise write thousands of near-identical
 * documents, and the useful signal is "which URLs, how often", not each visit.
 */
const SeoNotFoundSchema = new mongoose.Schema(
  {
    path: { type: String, required: true, trim: true },
    hits: { type: Number, default: 1 },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    // Only the most recent is kept — a full history would be a second
    // unbounded collection for very little extra insight.
    lastReferrer: { type: String, trim: true, default: "" },
    lastUserAgent: { type: String, trim: true, default: "" },

    // Set when someone creates a redirect for this path, so the log can show
    // outstanding work instead of everything that ever 404'd.
    isResolved: { type: Boolean, default: false },

    isActive: { type: Boolean, default: true, required: true },
  },
  { timestamps: true },
);

SeoNotFoundSchema.index({ path: 1 }, { unique: true });
SeoNotFoundSchema.index({ isResolved: 1 });
SeoNotFoundSchema.index({ hits: -1 });
SeoNotFoundSchema.index({ lastSeenAt: -1 });
SeoNotFoundSchema.index({ createdAt: -1 });

export default mongoose.model("SeoNotFound", SeoNotFoundSchema);
