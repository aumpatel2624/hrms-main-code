import crypto from "node:crypto";
import SeoSettings from "../models/SeoSettings.js";

/**
 * Shared-secret guard for the two public endpoints the website *writes* to:
 * its URL list (which becomes the sitemap) and its 404 reports.
 *
 * The public read endpoints stay open — meta tags are visible in the page
 * source anyway, so there is nothing to protect. Writes are different: without
 * this, anyone with curl could fill the sitemap with URLs that do not exist
 * and bury the 404 log in noise, and Google would see both.
 */

export const SITE_KEY_HEADER = "x-api-key";

export const generateSiteKey = () => `sk_${crypto.randomBytes(24).toString("hex")}`;

/** Constant-time compare so a wrong key cannot be found one character at a time. */
const matches = (candidate, expected) => {
  const a = Buffer.from(String(candidate ?? ""), "utf8");
  const b = Buffer.from(String(expected ?? ""), "utf8");
  if (a.length !== b.length || a.length === 0) return false;
  return crypto.timingSafeEqual(a, b);
};

export const requireSiteKey = async (req, res, next) => {
  try {
    const settings = await SeoSettings.findOne({ key: "default" }, { siteKey: 1 }).lean();

    // Fail closed. An install where nobody has generated a key yet must not
    // have two open write endpoints by accident.
    if (!settings?.siteKey) {
      return res.status(503).json({
        isOk: false,
        status: 503,
        message: "No site key has been generated yet",
      });
    }

    if (!matches(req.headers[SITE_KEY_HEADER], settings.siteKey)) {
      return res.status(401).json({
        isOk: false,
        status: 401,
        message: "Invalid or missing site key",
      });
    }

    return next();
  } catch (error) {
    console.error("Error in requireSiteKey:", error);
    return res.status(500).json({
      isOk: false,
      status: 500,
      message: "Internal server error",
    });
  }
};
