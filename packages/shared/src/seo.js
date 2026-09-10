/**
 * SEO grammar shared by the server resolver and the admin editor.
 *
 * Everything here is pure and dependency-free so the same rules run in both
 * places: the editor scores a page live as you type, and the server scores the
 * identical way when it lists them. A rule that lived in only one of the two
 * would let the panel show green for something the site renders badly.
 */

// ---- vocabularies -------------------------------------------------------
// These strings are stored in Mongo and offered in dropdowns, so they must
// match character-for-character on both sides.

/** og:type values worth offering. The full list is long and mostly unused. */
export const OG_TYPES = Object.freeze(["website", "article", "product", "profile", "video.other"]);

export const TWITTER_CARDS = Object.freeze(["summary", "summary_large_image"]);

/** How much of a page Google may show. "none" suppresses image previews. */
export const MAX_IMAGE_PREVIEW = Object.freeze(["none", "standard", "large"]);

/** Redirect status codes the panel offers. 410 is "gone", it has no target. */
export const REDIRECT_STATUSES = Object.freeze([301, 302, 307, 308, 410]);

export const CHANGE_FREQUENCIES = Object.freeze([
    "always",
    "hourly",
    "daily",
    "weekly",
    "monthly",
    "yearly",
    "never",
]);

/** Title separators, in the order a picker should show them. */
export const TITLE_SEPARATORS = Object.freeze(["|", "-", "–", "—", "•", "·", "»", "~"]);

/**
 * What Google actually truncates at. Titles are cut on rendered pixel width,
 * which is why "Illinois" and "lll" are not the same length — descriptions are
 * near enough to a character count that showing pixels would just confuse.
 */
export const SEO_LIMITS = Object.freeze({
    titlePx: { min: 250, max: 580 },
    descriptionChars: { min: 70, max: 158 },
    ogImage: { width: 1200, height: 630 },
});

/** Structured-data skeletons the editor drops into the JSON box. */
export const SCHEMA_PRESETS = Object.freeze({
    None: null,
    Article: {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "{{title}}",
        description: "{{description}}",
        image: "{{ogImage}}",
        datePublished: "",
        dateModified: "",
        author: { "@type": "Person", name: "" },
    },
    Product: {
        "@context": "https://schema.org",
        "@type": "Product",
        name: "{{title}}",
        description: "{{description}}",
        image: "{{ogImage}}",
        brand: { "@type": "Brand", name: "{{siteName}}" },
        offers: { "@type": "Offer", price: "", priceCurrency: "", availability: "https://schema.org/InStock" },
    },
    FAQPage: {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
            { "@type": "Question", name: "", acceptedAnswer: { "@type": "Answer", text: "" } },
        ],
    },
    BreadcrumbList: {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "{{siteUrl}}" },
            { "@type": "ListItem", position: 2, name: "{{title}}", item: "{{url}}" },
        ],
    },
    LocalBusiness: {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: "{{siteName}}",
        image: "{{ogImage}}",
        telephone: "",
        address: {
            "@type": "PostalAddress",
            streetAddress: "",
            addressLocality: "",
            postalCode: "",
            addressCountry: "",
        },
    },
    WebPage: {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "{{title}}",
        description: "{{description}}",
        url: "{{url}}",
    },
});

export const SCHEMA_TYPES = Object.freeze(Object.keys(SCHEMA_PRESETS));

/** Tokens usable in title templates, descriptions and JSON-LD. */
export const SEO_TOKENS = Object.freeze([
    { token: "{{title}}", label: "This page's title" },
    { token: "{{description}}", label: "This page's description" },
    { token: "{{siteName}}", label: "Site name from SEO settings" },
    { token: "{{sep}}", label: "Title separator from SEO settings" },
    { token: "{{path}}", label: "The page path, e.g. /about" },
    { token: "{{url}}", label: "Full page URL" },
    { token: "{{siteUrl}}", label: "Site base URL" },
    { token: "{{ogImage}}", label: "Resolved social image URL" },
]);

// ---- paths --------------------------------------------------------------

/**
 * One canonical spelling for a URL path, so "/About/", "About" and
 * "/about?ref=x" all resolve to the same stored row.
 *
 * Lowercased because a CMS that treats /About and /about as two pages will
 * silently serve one of them wrong. Query strings and fragments are dropped —
 * they are not part of a page's identity for SEO purposes.
 */
export const normalizePath = (raw) => {
    let path = String(raw ?? "").trim();
    if (!path) return "/";

    // Accept a full URL and keep only its path.
    const schemeMatch = path.match(/^[a-z][a-z0-9+.-]*:\/\/[^/]+(\/.*)?$/i);
    if (schemeMatch) path = schemeMatch[1] || "/";

    path = path.split("#")[0].split("?")[0];
    if (!path.startsWith("/")) path = `/${path}`;
    path = path.replace(/\/{2,}/g, "/");
    if (path.length > 1) path = path.replace(/\/+$/, "");
    return (path || "/").toLowerCase();
};

/** Join a base URL and a path into one absolute URL, without doubling slashes. */
export const absoluteUrl = (baseUrl, path = "/") => {
    const base = String(baseUrl ?? "").trim().replace(/\/+$/, "");
    const rest = normalizePath(path);
    if (!base) return rest;
    return rest === "/" ? `${base}/` : `${base}${rest}`;
};

// ---- templates ----------------------------------------------------------

/**
 * Replace {{token}} occurrences from `vars`. Unknown tokens collapse to an
 * empty string rather than rendering literally — a visitor should never see
 * "{{sitename}}" in a browser tab because someone mistyped it.
 */
export const renderTemplate = (template, vars = {}) => {
    if (!template) return "";
    return String(template)
        .replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key) => {
            const value = vars[key];
            return value === null || value === undefined ? "" : String(value);
        })
        // A blank token can leave "Title |" or doubled separators behind.
        .replace(/\s{2,}/g, " ")
        .trim()
        .replace(/^[|\-–—•·»~]+\s*/, "")
        .replace(/\s*[|\-–—•·»~]+$/, "")
        .trim();
};

// ---- text measurement ---------------------------------------------------

/**
 * Approximate Arial advance widths as a fraction of the font size.
 *
 * The browser could measure this exactly with canvas, but then the admin and
 * the server would disagree about whether a title fits, and the same page
 * would score differently in a list than in the editor. One approximation used
 * by both is worth more than exactness in one of them.
 */
const CHAR_WIDTHS = {
    " ": 0.28, "!": 0.28, '"': 0.36, "'": 0.19, "(": 0.33, ")": 0.33, "*": 0.39, "+": 0.58,
    ",": 0.28, "-": 0.33, ".": 0.28, "/": 0.28, ":": 0.28, ";": 0.28, "<": 0.58, "=": 0.58,
    ">": 0.58, "?": 0.56, "@": 1.01, "[": 0.28, "\\": 0.28, "]": 0.28, "^": 0.47, "_": 0.56,
    "`": 0.33, "{": 0.33, "|": 0.26, "}": 0.33, "~": 0.58,
    f: 0.28, i: 0.22, j: 0.22, l: 0.22, r: 0.33, t: 0.28, m: 0.83, w: 0.72,
    I: 0.28, J: 0.5, M: 0.83, W: 0.94,
};

const widthOf = (char) => {
    const known = CHAR_WIDTHS[char];
    if (known !== undefined) return known;
    if (char >= "0" && char <= "9") return 0.56;
    if (char >= "A" && char <= "Z") return 0.68;
    if (char >= "a" && char <= "z") return 0.55;
    // CJK and emoji are full-width; everything else gets the lowercase average.
    return char.codePointAt(0) > 0x2e80 ? 1 : 0.55;
};

/** Rendered width of `text` in pixels at `fontSize` (Google titles are 20px). */
export const textWidthPx = (text, fontSize = 20) => {
    let width = 0;
    for (const char of String(text ?? "")) width += widthOf(char) * fontSize;
    return Math.round(width);
};

/** Cut `text` to `maxPx` and add an ellipsis, the way a SERP snippet does. */
export const truncateToPx = (text, maxPx, fontSize = 20) => {
    const value = String(text ?? "");
    if (textWidthPx(value, fontSize) <= maxPx) return value;

    const ellipsisPx = textWidthPx("…", fontSize);
    let width = 0;
    let cut = "";
    for (const char of value) {
        const next = widthOf(char) * fontSize;
        if (width + next + ellipsisPx > maxPx) break;
        width += next;
        cut += char;
    }
    return `${cut.trimEnd()}…`;
};

// ---- robots -------------------------------------------------------------

/** Default robots directives — what a page gets when it says nothing. */
export const DEFAULT_ROBOTS = Object.freeze({
    index: true,
    follow: true,
    noarchive: false,
    nosnippet: false,
    noimageindex: false,
    maxSnippet: -1,
    maxImagePreview: "large",
});

/** Compose the `robots` meta content string from a directive object. */
export const robotsContent = (robots = {}) => {
    const merged = { ...DEFAULT_ROBOTS, ...robots };
    const parts = [merged.index ? "index" : "noindex", merged.follow ? "follow" : "nofollow"];

    if (merged.noarchive) parts.push("noarchive");
    if (merged.nosnippet) parts.push("nosnippet");
    if (merged.noimageindex) parts.push("noimageindex");
    // Only worth emitting when snippets are allowed at all.
    if (!merged.nosnippet && Number.isFinite(merged.maxSnippet) && merged.maxSnippet !== -1) {
        parts.push(`max-snippet:${merged.maxSnippet}`);
    }
    if (merged.maxImagePreview && merged.maxImagePreview !== "large") {
        parts.push(`max-image-preview:${merged.maxImagePreview}`);
    }
    return parts.join(", ");
};

// ---- scoring ------------------------------------------------------------

/**
 * The health checklist shown beside the editor.
 *
 * Deliberately only checks what the panel can actually see: the meta fields
 * themselves. There is no page body here, so no readability score, no keyword
 * density, no heading analysis — claiming otherwise would be a green light on
 * a page nobody has looked at.
 *
 * @param page     the SEO record being edited (raw form values are fine)
 * @param resolved what the resolver would emit for it, so inherited values
 *                 from the global defaults count as present
 * @returns { score, level, checks: [{ id, level, label, detail }] }
 */
export const scoreSeo = (page = {}, resolved = {}) => {
    const checks = [];
    const add = (id, level, label, detail) => checks.push({ id, level, label, detail });

    const title = resolved.title || page.title || "";
    const description = resolved.description || page.description || "";
    const keyword = String(page.focusKeyword || "").trim().toLowerCase();
    const path = normalizePath(page.path || resolved.path || "/");

    // --- title
    if (!title) {
        add("title", "fail", "No title", "Search results will show whatever Google can scrape instead.");
    } else {
        const px = textWidthPx(title, 20);
        if (px < SEO_LIMITS.titlePx.min) {
            add("title", "warn", "Title is short", `${px}px of ${SEO_LIMITS.titlePx.max}px — there is room to say more.`);
        } else if (px > SEO_LIMITS.titlePx.max) {
            add("title", "warn", "Title will be cut off", `${px}px of ${SEO_LIMITS.titlePx.max}px — the end will be replaced by "…".`);
        } else {
            add("title", "pass", "Title length is good", `${px}px of ${SEO_LIMITS.titlePx.max}px.`);
        }
    }

    // --- description
    if (!description) {
        add("description", "fail", "No description", "Google will pick a sentence from the page, and it is usually the wrong one.");
    } else {
        const chars = description.length;
        if (chars < SEO_LIMITS.descriptionChars.min) {
            add("description", "warn", "Description is short", `${chars} of ${SEO_LIMITS.descriptionChars.max} characters.`);
        } else if (chars > SEO_LIMITS.descriptionChars.max) {
            add("description", "warn", "Description will be cut off", `${chars} of ${SEO_LIMITS.descriptionChars.max} characters.`);
        } else {
            add("description", "pass", "Description length is good", `${chars} of ${SEO_LIMITS.descriptionChars.max} characters.`);
        }
    }

    // --- focus keyword, only when one was given
    if (keyword) {
        const inTitle = title.toLowerCase().includes(keyword);
        const inDescription = description.toLowerCase().includes(keyword);
        const inPath = path.includes(keyword.replace(/\s+/g, "-"));

        add(
            "keyword-title",
            inTitle ? "pass" : "fail",
            inTitle ? "Focus keyword is in the title" : "Focus keyword is missing from the title",
            inTitle ? undefined : `Add "${page.focusKeyword}" to the title, ideally near the start.`,
        );
        add(
            "keyword-description",
            inDescription ? "pass" : "warn",
            inDescription ? "Focus keyword is in the description" : "Focus keyword is missing from the description",
            inDescription ? undefined : `Google bolds the search term where it appears in your description.`,
        );
        add(
            "keyword-path",
            inPath ? "pass" : "warn",
            inPath ? "Focus keyword is in the URL" : "Focus keyword is not in the URL",
            inPath ? undefined : "Not worth changing a live URL for, but worth doing on a new page.",
        );
    }

    // --- social image
    const ogImage = resolved.ogImage || page.og?.image || "";
    if (ogImage) {
        add("og-image", "pass", "Social image is set", undefined);
    } else {
        add("og-image", "fail", "No social image", "Links shared to WhatsApp, LinkedIn or X will show a blank card.");
    }

    // --- canonical
    if (resolved.canonical) {
        add("canonical", "pass", "Canonical URL is set", undefined);
    } else {
        add("canonical", "warn", "No canonical URL", "Set a base URL in SEO settings so pages can point at their own address.");
    }

    // --- indexability
    const robots = { ...DEFAULT_ROBOTS, ...(resolved.robots || page.robots || {}) };
    if (robots.index) {
        add("indexable", "pass", "This page can be indexed", undefined);
    } else {
        add("indexable", "warn", "This page is set to noindex", "Deliberate for thank-you and staging pages. Otherwise it will never appear in search.");
    }

    // --- structured data
    const jsonLd = page.jsonLd?.body ?? page.jsonLdBody ?? "";
    if (String(jsonLd).trim()) {
        try {
            JSON.parse(jsonLd);
            add("json-ld", "pass", "Structured data is valid", undefined);
        } catch {
            add("json-ld", "fail", "Structured data is not valid JSON", "Google will ignore it entirely until the syntax is fixed.");
        }
    }

    const weight = { pass: 1, warn: 0.5, fail: 0 };
    const score = checks.length
        ? Math.round((checks.reduce((sum, check) => sum + weight[check.level], 0) / checks.length) * 100)
        : 0;

    return {
        score,
        level: score >= 80 ? "good" : score >= 50 ? "ok" : "bad",
        checks,
    };
};
