import {
    DEFAULT_ROBOTS,
    absoluteUrl,
    normalizePath,
    renderTemplate,
    robotsContent,
} from "./seo.js";

/**
  * Turns a stored SEO page plus the site-wide defaults into the finished tags a
  * browser should receive.
  *
  * Pure — nothing here touches Mongo, which is why it can be tested with plain
  * assertions and why the admin can run the same merge to preview a page that
  * has not been saved yet.
  *
  * The merge is one-directional and boring on purpose: a page's own value wins,
  * a blank falls through to the settings, and a blank there falls through to a
  * sensible constant. Every fallback is visible in one place instead of being
  * spread across a controller and a frontend.
  */

/** Absolute URLs only — social crawlers silently drop relative image paths. */
const toAbsolute = (value, baseUrl) => {
    const url = String(value ?? "").trim();
    if (!url) return "";
    if (/^https?:\/\//i.test(url) || url.startsWith("//")) return url;
    return absoluteUrl(baseUrl, url);
};

/**
  * Compose the page title.
  *
  * A plain title is fed into the site's template, so typing "About us" gives
  * "About us | Acme" without anyone repeating the site name a hundred times.
  * A title that contains its own {{token}} is treated as a complete template
  * instead — the escape hatch for the one page that needs full control.
  */
const composeTitle = (page, settings, vars) => {
    const own = String(page?.title ?? "").trim();
    if (own.includes("{{")) return renderTemplate(own, vars);

    const template = String(settings?.defaultTitleTemplate ?? "").trim() || "{{title}}";
    return renderTemplate(template, { ...vars, title: own || vars.title });
};

/**
  * @param page     a SeoPage document (or plain form values from the editor)
  * @param settings the SeoSettings singleton
  * @param path     the path being resolved; defaults to the page's own
  * @returns a flat object — every value final, nothing left to fall back to
  */
export const resolveSeo = (page = {}, settings = {}, path = null) => {
    const resolvedPath = normalizePath(path ?? page.path ?? "/");
    const baseUrl = String(settings.baseUrl ?? "").trim().replace(/\/+$/, "");
    const url = absoluteUrl(baseUrl, resolvedPath);
    const siteName = String(settings.siteName ?? "").trim();

    // Available to every template and to the JSON-LD block.
    const vars = {
        title: String(page.pageName ?? "").trim(),
        description: "",
        siteName,
        sep: settings.titleSeparator || "|",
        path: resolvedPath,
        url,
        siteUrl: baseUrl,
        ogImage: "",
    };

    const title = composeTitle(page, settings, vars);
    vars.title = title;

    const description = renderTemplate(
        String(page.description ?? "").trim() || String(settings.defaultDescription ?? "").trim(),
        vars,
    );
    vars.description = description;

    const ogImage = toAbsolute(page.og?.image || settings.defaultOgImage, baseUrl);
    vars.ogImage = ogImage;

    // Page directives sit on top of the site defaults, and the kill switch sits
    // on top of both — a staging deployment must not be able to leak through a
    // page that was individually set to index.
    const robots = {
        ...DEFAULT_ROBOTS,
        ...(settings.robots ?? {}),
        ...Object.fromEntries(
            Object.entries(page.robots ?? {}).filter(([, value]) => value !== undefined && value !== null),
        ),
    };
    if (settings.globalNoindex) {
        robots.index = false;
        robots.follow = false;
    }

    const canonical = String(page.canonicalUrl ?? "").trim()
        ? toAbsolute(page.canonicalUrl, baseUrl)
        : baseUrl
            ? url
            : "";

    return {
        path: resolvedPath,
        url,
        title,
        description,
        canonical,
        robots,
        robotsContent: robotsContent(robots),
        siteName,
        ogTitle: renderTemplate(page.og?.title, vars) || title,
        ogDescription: renderTemplate(page.og?.description, vars) || description,
        ogImage,
        ogImageAlt: page.og?.imageAlt || "",
        ogType: page.og?.type || "website",
        twitterCard: page.twitter?.card || settings.defaultTwitterCard || "summary_large_image",
        twitterTitle: renderTemplate(page.twitter?.title, vars) || title,
        twitterDescription: renderTemplate(page.twitter?.description, vars) || description,
        twitterImage: toAbsolute(page.twitter?.image, baseUrl) || ogImage,
        jsonLd: parseJsonLd(page.jsonLd?.body, vars),
        vars,
    };
};

/**
  * Render the tokens inside a stored JSON-LD block and parse it.
  *
  * Returns null rather than throwing: a page whose structured data has a typo
  * should still serve its title and description. The editor and the write
  * validation both flag invalid JSON, so this is the last line, not the only one.
  */
export const parseJsonLd = (body, vars = {}) => {
    const raw = String(body ?? "").trim();
    if (!raw) return null;
    try {
        // Tokens are substituted before parsing so they can appear inside strings.
        // JSON.stringify escapes the value, so a quote in a title cannot break out.
        const substituted = raw.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key) => {
            const value = vars[key];
            if (value === undefined || value === null) return match;
            const encoded = JSON.stringify(String(value));
            return encoded.slice(1, -1);
        });
        return JSON.parse(substituted);
    } catch {
        return null;
    }
};

/** The site-wide Organization/Person block, emitted on the home page only. */
export const organizationJsonLd = (settings = {}) => {
    const org = settings.organization ?? {};
    const name = String(org.name ?? "").trim() || String(settings.siteName ?? "").trim();
    if (!name) return null;

    const baseUrl = String(settings.baseUrl ?? "").trim().replace(/\/+$/, "");
    const sameAs = (org.sameAs ?? []).map((entry) => String(entry).trim()).filter(Boolean);

    return {
        "@context": "https://schema.org",
        "@type": org.type || "Organization",
        name,
        ...(baseUrl && { url: `${baseUrl}/` }),
        ...(org.logo && { logo: toAbsolute(org.logo, baseUrl) }),
        ...(sameAs.length && { sameAs }),
    };
};

/**
  * Flatten a resolved page into the exact arrays a Helmet-style component
  * renders, so the public site holds no SEO logic of its own.
  *
  * og:* are `property` attributes and twitter:* are `name` attributes — they
  * are different specifications and swapping them is the most common way a
  * share card silently stops working.
  */
export const toTags = (resolved, settings = {}) => {
    const meta = [];
    const link = [];
    const script = [];

    if (resolved.description) meta.push({ name: "description", content: resolved.description });
    meta.push({ name: "robots", content: resolved.robotsContent });

    if (resolved.canonical) link.push({ rel: "canonical", href: resolved.canonical });

    meta.push({ property: "og:type", content: resolved.ogType });
    meta.push({ property: "og:title", content: resolved.ogTitle });
    if (resolved.ogDescription) meta.push({ property: "og:description", content: resolved.ogDescription });
    if (resolved.canonical) meta.push({ property: "og:url", content: resolved.canonical });
    if (resolved.siteName) meta.push({ property: "og:site_name", content: resolved.siteName });
    if (resolved.ogImage) {
        meta.push({ property: "og:image", content: resolved.ogImage });
        if (resolved.ogImageAlt) meta.push({ property: "og:image:alt", content: resolved.ogImageAlt });
    }

    meta.push({ name: "twitter:card", content: resolved.twitterCard });
    meta.push({ name: "twitter:title", content: resolved.twitterTitle });
    if (resolved.twitterDescription) meta.push({ name: "twitter:description", content: resolved.twitterDescription });
    if (resolved.twitterImage) meta.push({ name: "twitter:image", content: resolved.twitterImage });

    // Search-console ownership tags are only read on the site root, so putting
    // them on every page is noise a reviewer would rightly ask about.
    if (resolved.path === "/") {
        const verification = settings.verification ?? {};
        const owners = [
            ["google-site-verification", verification.google],
            ["msvalidate.01", verification.bing],
            ["yandex-verification", verification.yandex],
            ["p:domain_verify", verification.pinterest],
            ["facebook-domain-verification", verification.facebookDomain],
        ];
        for (const [name, content] of owners) {
            if (String(content ?? "").trim()) meta.push({ name, content: String(content).trim() });
        }

        const organization = organizationJsonLd(settings);
        if (organization) script.push({ type: "application/ld+json", json: organization });
    }

    if (resolved.jsonLd) script.push({ type: "application/ld+json", json: resolved.jsonLd });

    return { title: resolved.title, meta, link, script };
};

// ---- sitemap and robots.txt ---------------------------------------------

const escapeXml = (value) =>
    String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

/**
  * @param entries [{ path, lastmod, priority, changefreq }] — already filtered
  *                to what belongs in the sitemap
  * @param baseUrl the site's absolute base URL
  */
export const buildSitemapXml = (entries = [], baseUrl = "") => {
    const urls = entries
        .map((entry) => {
            const parts = [`    <loc>${escapeXml(absoluteUrl(baseUrl, entry.path))}</loc>`];
            if (entry.lastmod) {
                const date = entry.lastmod instanceof Date ? entry.lastmod : new Date(entry.lastmod);
                if (!Number.isNaN(date.getTime())) {
                    parts.push(`    <lastmod>${date.toISOString().slice(0, 10)}</lastmod>`);
                }
            }
            if (entry.changefreq) parts.push(`    <changefreq>${escapeXml(entry.changefreq)}</changefreq>`);
            if (entry.priority !== undefined && entry.priority !== null) {
                parts.push(`    <priority>${Number(entry.priority).toFixed(1)}</priority>`);
            }
            return `  <url>\n${parts.join("\n")}\n  </url>`;
        })
        .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
};

/**
  * The stored robots.txt, with the Sitemap line kept correct automatically.
  *
  * Left to a human that line goes stale the moment a domain changes, and a
  * wrong Sitemap directive is worse than none.
  */
export const buildRobotsTxt = (settings = {}, sitemapUrl = "") => {
    let body = String(settings.robotsTxt ?? "").trim() || "User-agent: *\nAllow: /";

    if (settings.globalNoindex) {
        // The kill switch has to reach robots.txt too, or crawlers keep fetching
        // pages just to read a noindex tag.
        body = "User-agent: *\nDisallow: /";
    }

    const withoutSitemap = body
        .split("\n")
        .filter((line) => !/^\s*sitemap\s*:/i.test(line))
        .join("\n")
        .trimEnd();

    return sitemapUrl && !settings.globalNoindex
        ? `${withoutSitemap}\n\nSitemap: ${sitemapUrl}\n`
        : `${withoutSitemap}\n`;
};
