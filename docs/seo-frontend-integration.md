# Wiring a website to the SEO module

Everything the public site needs, in one page. Hand this to whoever builds the
frontend — they need nothing else from this repo.

The panel resolves all the fallback logic itself (page → site defaults →
template), so the site never merges, never composes a title, and never decides
what a canonical URL is. It asks for a path and renders what comes back.

> **Read this first.** Meta tags must be in the HTML your server sends.
> Facebook, LinkedIn, X and WhatsApp do not run JavaScript at all, and Google
> renders it late and unreliably. On a client-only React SPA, a share image
> added in the browser will never appear. Use server rendering (Next.js, Remix,
> Nuxt) or a prerender step.

## The five endpoints

| Method | Path | Auth |
|---|---|---|
| `POST` | `/api/v1/public/seo/resolve` | none |
| `GET` | `/api/v1/public/seo/sitemap.xml` | none |
| `GET` | `/api/v1/public/seo/robots.txt` | none |
| `POST` | `/api/v1/public/seo/urls` | `x-api-key` |
| `POST` | `/api/v1/public/seo/404` | `x-api-key` |

The site key comes from **SEO Settings → Website connection** in the panel.
Keep it in the site's server-side environment; it is not a browser secret.

## 1. Every page render

```js
const response = await fetch(`${PANEL}/api/v1/public/seo/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: "/about" }),
});
const { data } = await response.json();
```

```jsonc
{
  "path": "/about",
  "found": true,              // false = no managed page, these are site defaults
  "redirect": null,           // or { "to": "/new-page", "status": 301 }
  "tags": {
    "title": "About us | Acme",
    "meta":   [{ "name": "description", "content": "…" },
               { "property": "og:image", "content": "https://…" }],
    "link":   [{ "rel": "canonical", "href": "https://acme.com/about" }],
    "script": [{ "type": "application/ld+json", "json": { "@type": "Organization" } }]
  }
}
```

**Handle `redirect` before rendering anything.** When it is set, `tags` is
absent — issue the redirect and stop. A `status` of `410` has `to: null`;
return 410 Gone with no destination.

`og:*` entries carry `property`, `twitter:*` carry `name`. Render whichever key
is present rather than assuming one — swapping them silently breaks share cards.

### Next.js App Router

```js
// app/[...slug]/page.jsx
import { redirect, permanentRedirect } from "next/navigation";

const resolveSeo = async (path) => {
    const res = await fetch(`${process.env.PANEL_URL}/api/v1/public/seo/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
        next: { revalidate: 60 },
    });
    return (await res.json()).data;
};

export async function generateMetadata({ params }) {
    const seo = await resolveSeo("/" + (params.slug ?? []).join("/"));

    if (seo.redirect?.to) {
        seo.redirect.status === 301 ? permanentRedirect(seo.redirect.to) : redirect(seo.redirect.to);
    }

    const find = (key) => seo.tags.meta.find((t) => t.name === key || t.property === key)?.content;

    return {
        title: seo.tags.title,
        description: find("description"),
        robots: find("robots"),
        alternates: { canonical: seo.tags.link.find((l) => l.rel === "canonical")?.href },
        openGraph: {
            title: find("og:title"),
            description: find("og:description"),
            images: find("og:image") ? [find("og:image")] : [],
            type: find("og:type"),
        },
        twitter: { card: find("twitter:card"), title: find("twitter:title"), images: [find("twitter:image")] },
        other: Object.fromEntries(
            seo.tags.meta.filter((t) => t.name?.includes("verification")).map((t) => [t.name, t.content]),
        ),
    };
}
```

Structured data is not part of Next's metadata API — render it in the page:

```jsx
{seo.tags.script.map((block, i) => (
    <script key={i} type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(block.json) }} />
))}
```

### React with Helmet

Works only if the page is server-rendered. The tag arrays map one to one:

```jsx
<Helmet>
    <title>{tags.title}</title>
    {tags.meta.map((tag, i) => <meta key={i} {...tag} />)}
    {tags.link.map((tag, i) => <link key={i} {...tag} />)}
    {tags.script.map((tag, i) => (
        <script key={i} type={tag.type}>{JSON.stringify(tag.json)}</script>
    ))}
</Helmet>
```

## 2. Report your URLs, on publish

The panel only knows the pages someone typed into it. Push the rest so the
sitemap is complete.

```js
await fetch(`${PANEL}/api/v1/public/seo/urls`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": process.env.SEO_SITE_KEY },
    body: JSON.stringify({
        urls: [{ path: "/blog/hello", lastmod: "2026-08-21" }, "/blog/world"],
        replace: true,
    }),
});
```

A bare string is accepted as shorthand for `{ path }`. **`replace: true` prunes
paths missing from the payload**, which is what keeps deleted pages out of the
sitemap — so send the complete list, not a delta. Maximum 5000 per request.

## 3. Report 404s

```js
await fetch(`${PANEL}/api/v1/public/seo/404`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": process.env.SEO_SITE_KEY },
    body: JSON.stringify({ path: request.url.pathname, referrer: request.headers.get("referer") ?? "" }),
});
```

One row per path with a hit counter — call it on every 404, it will not flood.
Each one appears in the panel's **404 Log** with a one-click "Fix" that creates
a redirect, which the next `resolve` for that path will return.

## 4. Serve sitemap.xml and robots.txt from your own domain

Search engines fetch these from *your* host, not the panel's. Proxy or rewrite:

```js
// next.config.js
async rewrites() {
    return [
        { source: "/sitemap.xml", destination: `${process.env.PANEL_URL}/api/v1/public/seo/sitemap.xml` },
        { source: "/robots.txt",  destination: `${process.env.PANEL_URL}/api/v1/public/seo/robots.txt` },
    ];
}
```

## Notes worth knowing

- **Caching.** `resolve` reads from an in-memory cache and is cheap, but it is
  still a network hop per render — cache it for a minute at your end. Panel
  edits go live immediately on the panel side; your cache is the only delay.
- **Pages a collection owns.** Product and article URLs are not managed here.
  Those records carry their own SEO fields; `resolve` returns `found: false`
  and the site-wide defaults, which is your cue to use the record's own values
  and fall back to what came back.
- **`{{tokens}}`.** `{{title}}`, `{{description}}`, `{{siteName}}`, `{{sep}}`,
  `{{path}}`, `{{url}}`, `{{siteUrl}}` and `{{ogImage}}` are substituted by the
  panel before it responds. You never see them.
- **The staging kill switch.** SEO Settings has a "hide the whole site" toggle.
  With it on, every page resolves to `noindex, nofollow`, robots.txt disallows
  everything and the sitemap returns 404. Use it on preview deployments.
