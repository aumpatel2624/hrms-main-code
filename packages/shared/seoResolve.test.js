import assert from "node:assert/strict";
import {
    DEFAULT_ROBOTS,
    normalizePath,
    absoluteUrl,
    renderTemplate,
    robotsContent,
    textWidthPx,
    truncateToPx,
    scoreSeo,
} from "./src/seo.js";
import {
    resolveSeo,
    toTags,
    parseJsonLd,
    organizationJsonLd,
    buildSitemapXml,
    buildRobotsTxt,
} from "./src/seoResolve.js";

const SETTINGS = {
    siteName: "Acme",
    baseUrl: "https://acme.test",
    titleSeparator: "|",
    defaultTitleTemplate: "{{title}} {{sep}} {{siteName}}",
    defaultDescription: "Acme builds things.",
    defaultOgImage: "/uploads/cms/seo/default.png",
    defaultTwitterCard: "summary_large_image",
    robots: { ...DEFAULT_ROBOTS },
    organization: {
        type: "Organization",
        name: "Acme Inc",
        logo: "/logo.png",
        sameAs: ["https://x.com/acme", ""],
    },
    verification: { google: "g-token", bing: "" },
};

const PAGE = {
    path: "/about",
    pageName: "About us",
    description: "Who we are and what we build.",
};

// ---- normalizePath --------------------------------------------------------
{
    assert.equal(normalizePath("/About/"), "/about");
    assert.equal(normalizePath("about"), "/about");
    assert.equal(normalizePath(""), "/");
    assert.equal(normalizePath("/"), "/");
    assert.equal(normalizePath("///a//b///"), "/a/b");
    assert.equal(normalizePath("/products?ref=x#top"), "/products");
    // A full URL keeps only its path, so pasting from a browser bar works.
    assert.equal(normalizePath("https://acme.test/Blog/Post-1"), "/blog/post-1");
    assert.equal(normalizePath("https://acme.test"), "/");
    assert.equal(normalizePath(null), "/");
}

// ---- absoluteUrl ----------------------------------------------------------
{
    assert.equal(absoluteUrl("https://acme.test", "/about"), "https://acme.test/about");
    assert.equal(absoluteUrl("https://acme.test/", "/"), "https://acme.test/");
    assert.equal(absoluteUrl("", "/about"), "/about");
}

// ---- renderTemplate -------------------------------------------------------
{
    assert.equal(renderTemplate("{{title}} {{sep}} {{siteName}}", { title: "A", sep: "|", siteName: "Acme" }), "A | Acme");
    // A blank token must not leave a dangling separator in a browser tab.
    assert.equal(renderTemplate("{{title}} {{sep}} {{siteName}}", { title: "A", sep: "|", siteName: "" }), "A");
    // An unknown token collapses rather than rendering literally.
    assert.equal(renderTemplate("{{nope}}x", {}), "x");
    assert.equal(renderTemplate("", {}), "");
}

// ---- robotsContent --------------------------------------------------------
{
    assert.equal(robotsContent({}), "index, follow");
    assert.equal(robotsContent({ index: false }), "noindex, follow");
    assert.equal(robotsContent({ index: false, follow: false }), "noindex, nofollow");
    assert.equal(robotsContent({ noarchive: true }), "index, follow, noarchive");
    assert.equal(robotsContent({ maxSnippet: 50 }), "index, follow, max-snippet:50");
    // max-snippet is meaningless once snippets are suppressed altogether.
    assert.equal(robotsContent({ nosnippet: true, maxSnippet: 50 }), "index, follow, nosnippet");
    assert.equal(robotsContent({ maxImagePreview: "none" }), "index, follow, max-image-preview:none");
}

// ---- text measurement -----------------------------------------------------
{
    // Narrow and wide characters must not measure the same, which is the whole
    // reason titles are measured in pixels rather than counted.
    assert.ok(textWidthPx("lllllllll") < textWidthPx("WWWWWWWWW"));
    assert.equal(textWidthPx(""), 0);
    assert.ok(truncateToPx("short", 500).length === 5);
    const cut = truncateToPx("a very long title that will certainly not fit at all", 100);
    assert.ok(cut.endsWith("…"));
    assert.ok(textWidthPx(cut) <= 100);
}

// ---- resolveSeo: the merge chain ------------------------------------------
{
    const resolved = resolveSeo(PAGE, SETTINGS);

    // Plain title feeds the site template.
    assert.equal(resolved.title, "About us | Acme");
    assert.equal(resolved.description, "Who we are and what we build.");
    assert.equal(resolved.canonical, "https://acme.test/about");
    assert.equal(resolved.url, "https://acme.test/about");
    // A relative default image becomes absolute — social crawlers drop relatives.
    assert.equal(resolved.ogImage, "https://acme.test/uploads/cms/seo/default.png");
    assert.equal(resolved.ogTitle, "About us | Acme");
    assert.equal(resolved.twitterCard, "summary_large_image");
    assert.equal(resolved.twitterImage, resolved.ogImage);
    assert.equal(resolved.robotsContent, "index, follow");
}

// an explicit page title overrides pageName inside the template
{
    const resolved = resolveSeo({ ...PAGE, title: "Meet the team" }, SETTINGS);
    assert.equal(resolved.title, "Meet the team | Acme");
}

// a title containing tokens is its own template — the escape hatch
{
    const resolved = resolveSeo({ ...PAGE, title: "{{siteName}}: {{title}}" }, SETTINGS);
    assert.equal(resolved.title, "Acme: About us");
}

// blank description falls through to the site default
{
    const resolved = resolveSeo({ ...PAGE, description: "" }, SETTINGS);
    assert.equal(resolved.description, "Acme builds things.");
}

// page values win over site values
{
    const resolved = resolveSeo(
        { ...PAGE, og: { image: "https://cdn.test/a.png", title: "Custom OG" } },
        SETTINGS,
    );
    assert.equal(resolved.ogImage, "https://cdn.test/a.png");
    assert.equal(resolved.ogTitle, "Custom OG");
}

// an explicit canonical wins, and relative canonicals become absolute
{
    assert.equal(resolveSeo({ ...PAGE, canonicalUrl: "/home" }, SETTINGS).canonical, "https://acme.test/home");
    assert.equal(
        resolveSeo({ ...PAGE, canonicalUrl: "https://other.test/x" }, SETTINGS).canonical,
        "https://other.test/x",
    );
}

// with no base URL configured there is nothing to canonicalise to
{
    const resolved = resolveSeo(PAGE, { ...SETTINGS, baseUrl: "" });
    assert.equal(resolved.canonical, "");
}

// robots: page over site, kill switch over both
{
    const siteNoFollow = { ...SETTINGS, robots: { ...DEFAULT_ROBOTS, follow: false } };
    assert.equal(resolveSeo(PAGE, siteNoFollow).robotsContent, "index, nofollow");
    assert.equal(resolveSeo({ ...PAGE, robots: { follow: true } }, siteNoFollow).robotsContent, "index, follow");

    // The kill switch must beat a page that individually asks to be indexed.
    const staging = { ...SETTINGS, globalNoindex: true };
    assert.equal(resolveSeo({ ...PAGE, robots: { index: true } }, staging).robotsContent, "noindex, nofollow");
}

// resolving an arbitrary path with no stored page still yields usable tags
{
    const resolved = resolveSeo({}, SETTINGS, "/Unknown/Page/");
    assert.equal(resolved.path, "/unknown/page");
    assert.equal(resolved.title, "Acme");
    assert.equal(resolved.description, "Acme builds things.");
}

// ---- JSON-LD --------------------------------------------------------------
{
    const vars = { title: "About us", siteName: "Acme" };
    assert.deepEqual(parseJsonLd('{"name":"{{title}}"}', vars), { name: "About us" });
    // A quote in a substituted value must not break out of the JSON string.
    assert.deepEqual(parseJsonLd('{"name":"{{title}}"}', { title: 'He said "hi"' }), { name: 'He said "hi"' });
    // Broken JSON degrades to null rather than taking the whole page down.
    assert.equal(parseJsonLd("{not json", vars), null);
    assert.equal(parseJsonLd("", vars), null);
    assert.equal(parseJsonLd("   ", vars), null);
}

{
    const org = organizationJsonLd(SETTINGS);
    assert.equal(org["@type"], "Organization");
    assert.equal(org.name, "Acme Inc");
    assert.equal(org.url, "https://acme.test/");
    assert.equal(org.logo, "https://acme.test/logo.png");
    assert.deepEqual(org.sameAs, ["https://x.com/acme"]); // blanks dropped
    assert.equal(organizationJsonLd({}), null);
}

// ---- toTags ---------------------------------------------------------------
{
    const tags = toTags(resolveSeo(PAGE, SETTINGS), SETTINGS);
    const byName = (name) => tags.meta.find((tag) => tag.name === name)?.content;
    const byProperty = (property) => tags.meta.find((tag) => tag.property === property)?.content;

    assert.equal(tags.title, "About us | Acme");
    assert.equal(byName("description"), "Who we are and what we build.");
    assert.equal(byName("robots"), "index, follow");
    assert.deepEqual(tags.link, [{ rel: "canonical", href: "https://acme.test/about" }]);

    // og:* are properties, twitter:* are names. Swapping them silently breaks
    // share cards, so assert the attribute and not just the value.
    assert.equal(byProperty("og:title"), "About us | Acme");
    assert.equal(byProperty("og:site_name"), "Acme");
    assert.equal(byName("twitter:card"), "summary_large_image");
    assert.equal(tags.meta.some((tag) => tag.name === "og:title"), false);
    assert.equal(tags.meta.some((tag) => tag.property === "twitter:card"), false);

    // Verification and the Organization block belong on the root only.
    assert.equal(byName("google-site-verification"), undefined);
    assert.equal(tags.script.length, 0);
}

{
    const home = toTags(resolveSeo({ path: "/", pageName: "Home" }, SETTINGS), SETTINGS);
    assert.equal(home.meta.find((tag) => tag.name === "google-site-verification")?.content, "g-token");
    // Bing was blank, so no empty tag should be emitted.
    assert.equal(home.meta.some((tag) => tag.name === "msvalidate.01"), false);
    assert.equal(home.script.length, 1);
    assert.equal(home.script[0].type, "application/ld+json");
    assert.equal(home.script[0].json["@type"], "Organization");
}

{
    // A page's own structured data is emitted alongside the site's.
    const page = { path: "/", pageName: "Home", jsonLd: { schemaType: "WebPage", body: '{"@type":"WebPage","name":"{{title}}"}' } };
    const tags = toTags(resolveSeo(page, SETTINGS), SETTINGS);
    assert.equal(tags.script.length, 2);
    assert.equal(tags.script[1].json.name, "Home | Acme");
}

// ---- sitemap --------------------------------------------------------------
{
    const xml = buildSitemapXml(
        [
            { path: "/", lastmod: new Date("2026-08-20T10:00:00Z"), priority: 1, changefreq: "daily" },
            { path: "/a&b", lastmod: "2026-08-21" },
        ],
        "https://acme.test",
    );
    assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
    assert.ok(xml.includes("<loc>https://acme.test/</loc>"));
    assert.ok(xml.includes("<lastmod>2026-08-20</lastmod>"));
    assert.ok(xml.includes("<priority>1.0</priority>"));
    assert.ok(xml.includes("<changefreq>daily</changefreq>"));
    // An ampersand in a path must be escaped or the XML is unparseable.
    assert.ok(xml.includes("<loc>https://acme.test/a&amp;b</loc>"));
    assert.equal(xml.includes("<loc>https://acme.test/a&b</loc>"), false);
    // A bad date is skipped rather than emitting "Invalid Date".
    assert.equal(buildSitemapXml([{ path: "/x", lastmod: "nonsense" }]).includes("<lastmod>"), false);
}

// ---- robots.txt -----------------------------------------------------------
{
    const txt = buildRobotsTxt(SETTINGS, "https://acme.test/sitemap.xml");
    assert.ok(txt.includes("User-agent: *"));
    assert.ok(txt.trimEnd().endsWith("Sitemap: https://acme.test/sitemap.xml"));

    // A stale hand-written Sitemap line is replaced, never duplicated.
    const stale = buildRobotsTxt(
        { robotsTxt: "User-agent: *\nAllow: /\nSitemap: https://old.test/sitemap.xml" },
        "https://acme.test/sitemap.xml",
    );
    assert.equal(stale.match(/Sitemap:/g).length, 1);
    assert.ok(stale.includes("https://acme.test/sitemap.xml"));

    // The kill switch has to reach robots.txt too.
    const blocked = buildRobotsTxt({ ...SETTINGS, globalNoindex: true }, "https://acme.test/sitemap.xml");
    assert.ok(blocked.includes("Disallow: /"));
    assert.equal(blocked.includes("Sitemap:"), false);
}

// ---- scoreSeo -------------------------------------------------------------
{
    // A title that actually fills the SERP line — a 15-character one is
    // correctly flagged as leaving most of the space unused.
    const rich = { ...PAGE, pageName: "About us - the team behind Acme", focusKeyword: "about us" };
    const good = scoreSeo(rich, resolveSeo(rich, SETTINGS));
    assert.equal(good.checks.find((check) => check.id === "title").level, "pass");
    assert.equal(good.checks.find((check) => check.id === "og-image").level, "pass");
    assert.equal(good.checks.find((check) => check.id === "keyword-title").level, "pass");
    assert.equal(good.level, "good");

    // Keyword checks only appear once a keyword is given.
    assert.equal(scoreSeo(PAGE, resolveSeo(PAGE, SETTINGS)).checks.some((c) => c.id.startsWith("keyword")), false);

    const empty = scoreSeo({ path: "/x", pageName: "" }, resolveSeo({ path: "/x" }, { baseUrl: "" }));
    assert.equal(empty.checks.find((check) => check.id === "title").level, "fail");
    assert.equal(empty.checks.find((check) => check.id === "description").level, "fail");
    assert.equal(empty.checks.find((check) => check.id === "og-image").level, "fail");
    assert.equal(empty.level, "bad");

    // Invalid structured data is a failure, valid is a pass, absent is silent.
    const broken = scoreSeo({ ...PAGE, jsonLd: { body: "{oops" } }, resolveSeo(PAGE, SETTINGS));
    assert.equal(broken.checks.find((check) => check.id === "json-ld").level, "fail");
    assert.equal(scoreSeo(PAGE, resolveSeo(PAGE, SETTINGS)).checks.some((c) => c.id === "json-ld"), false);

    // noindex is a warning, not a failure — it is often deliberate.
    const hidden = scoreSeo(PAGE, resolveSeo({ ...PAGE, robots: { index: false } }, SETTINGS));
    assert.equal(hidden.checks.find((check) => check.id === "indexable").level, "warn");
}

console.log("seoResolve: all checks passed");
