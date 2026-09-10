import mongoose from "mongoose";

/**
 * A URL the public site told us it has, so the sitemap can list it.
 *
 * Deliberately not the same collection as SeoPage. These are machine-pushed
 * and there can be thousands of them; mixing them into the screen a human
 * works in would bury the dozen pages anyone actually edits.
 */
const SeoUrlSchema = new mongoose.Schema(
  {
    path: { type: String, required: true, trim: true },
    lastmod: { type: Date, default: Date.now },
    // "push" from the site's own report, "manual" if someone added it here.
    source: { type: String, trim: true, default: "push" },

    isActive: { type: Boolean, default: true, required: true },
  },
  { timestamps: true },
);

SeoUrlSchema.index({ path: 1 }, { unique: true });
SeoUrlSchema.index({ lastmod: -1 });
SeoUrlSchema.index({ createdAt: -1 });

export default mongoose.model("SeoUrl", SeoUrlSchema);
