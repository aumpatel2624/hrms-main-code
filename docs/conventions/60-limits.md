# Limits

Where this starter stops.

Every line below was checked against the code, not remembered. Nothing here is a bug or a TODO —
these are deliberate edges of a starter pack, and most projects never hit them. The point is that
you find out **before** you build, not after a client asks.

Two things to do with this file:

- **Starting a project** — work the *Decide before you build* section first. `grill-me` walks it.
- **Hitting a wall mid-project** — find the limit, read what it touches, and write an ADR before
  closing it. Closing one is a module, not a footnote.

## Decide before you build

Five questions where the cost of answering late is much higher than the cost of answering now.
Everything further down can wait until you need it; these cannot.

| # | Question | Why it cannot wait |
|---|---|---|
| 1 | **Is this multi-tenant?** One shared dataset, or separate customers who must never see each other? | Retrofitting a `companyId` touches every model, every controller, the session, and every unique index. See [20-schema.md](20-schema.md#tenancy). |
| 2 | **How long must the audit trail be kept, and does anything need to be provable?** Every change is recorded (see [20-schema.md](20-schema.md#the-audit-trail)); what is missing is a retention policy. | Retention is a compliance answer, not a technical one. Keeping everything forever is a growing collection; deleting too early is unrecoverable. |
| 3 | **One language, or several?** | Locale becomes part of the unique key on every translatable record. Adding it later is a backfill plus a rethink of every uniqueness rule. |
| 4 | **Does a role's data scope vary per screen?** ("own" on leads, "all" on customers.) | The shipped scope is one setting per role. Per-screen means moving it onto the permission rows and revisiting every call site. |
| 5 | **Is there a public website consuming this API?** If so, is it server-rendered? | Decides whether the SEO module pays off at all. Social crawlers run no JavaScript — see [ADR-004](../knowledge/DECISIONS.md) and [the integration guide](../seo-frontend-integration.md). |

Record the answers in `PRD.md` and `RULES.md`. An answer of "no" is still an answer worth writing
down — it stops the question being reopened every time someone new joins.

## Data and modelling

| Limit | Add it when | What it touches |
|---|---|---|
| **No multi-tenancy.** No Company/Organization/tenant model; `UserRoles.dataScope` narrows what a role sees within one shared dataset, which is not the same thing. | Day one or never. | Every model, `utils/listQuery.js`, `authMiddleware`, the login session, every create/update/find, and every unique index. |
| **No retention policy on the audit trail.** Every change is recorded and nothing ever removes one, so `auditlogs` grows for the life of the project. | The collection gets large, or a policy requires deletion. | A TTL index on `createdAt`, or a scheduled job. Deliberately not an endpoint — see [20-schema.md](20-schema.md#the-audit-trail). |
| **The audit trail does not cover `bulkWrite` or real deletions.** Neither runs the query middleware the plugin hooks; nothing user-facing uses either. | A feature reaches for `bulkWrite`. | Log it explicitly in that controller, or move the write to a supported method. |
| **`buildScopeFilter`'s `owner` dimension has nothing to point at.** The `own` scope is real code, but no shipped model has an owner field, so it matches nothing until a project adds one. The audit trail records who created a record but cannot be used as a query filter. | The first business collection. | Add `createdBy` to that model, index it, declare `{ owner: "createdBy" }` at the call site. |
| **No restore.** Deleted rows are hidden, not removed, but nothing brings one back. | Users delete by mistake, which they will. | A `PATCH .../restore` per entity, a "show deleted" toggle on the lists, and a decision about who may press it. |
| **No `deletedAt` / `deletedBy` on the documents themselves.** The audit trail records who deleted what and when, but you cannot sort a *list* by deletion date without joining to it. | A screen needs to rank or filter by when things were deleted. | Two fields plus a backfill; the audit log already answers the question one record at a time. |
| **No migration system.** A schema change applies to new writes only. | Any change that must reach existing documents. | A one-off idempotent script in `apps/server/seed/`. See [20-schema.md](20-schema.md#changing-an-existing-schema). |
| **No internationalisation.** Single language throughout; a couple of screens hardcode the `en-IN` date locale. | See question 3 above. | Locale on translatable models and in their unique keys, a picker in the UI, and every date/number format. |

## Auth and permissions

| Limit | Add it when | What it touches |
|---|---|---|
| **Data scope is per role, not per screen.** `UserRoles.dataScope` is one value covering everything that role touches. | A role needs "own" on one screen and "all" on another. | Move the field onto the `roles[]` rows, then thread the per-menu value through `checkPermission` and every `buildScopeFilter` call. |
| **`print` and `mail` permission flags are UI-only.** No route chains `checkPermission(..., "print")`. | The first export or send endpoint. | One `checkPermission` per new endpoint — the mechanism already works, nothing uses it yet. |
| **Dropdown GETs are readable by any logged-in user**, whatever the matrix says, because forms on other screens embed them. | A project treats master data as confidential. | A read gate on that GET, plus granting it to every role whose forms embed it. See ADR-002. |
| **No two-factor authentication.** The OTP flow exists, but only for forgotten passwords — login is password plus a session cookie. | Anything handling money or personal data. | A second factor at login, a per-user enrolment flag, and recovery codes. |
| **No HTTP rate limiting.** Account lockout after repeated failed logins (`LoginAttempt`) is the only throttle in the codebase. | Before exposing anything to the internet — especially a new public route. | One middleware. There is no rate-limit dependency installed; adding one is a deliberate choice. |
| **Roles are ADMIN or USER at the coarse level.** Everything finer is the permission matrix. | Rarely — the matrix usually covers it. | `@demo-panel/shared/roles`, `authMiddleware`, and every route's guard. |

## Operations

| Limit | Add it when | What it touches |
|---|---|---|
| **Single process assumed.** `checkPermission` and `utils/seoCache.js` hold in-memory caches invalidated in-process, so a second instance serves up to 60s of stale permissions or SEO. | Running more than one instance. | Shared invalidation — Redis pub/sub, or shorter TTLs and accepting the staleness. |
| **Uploads go to local disk** under `uploads/cms/<feature>/`. | Any deploy with an ephemeral or per-instance filesystem — containers, most PaaS. | An object-store adapter behind `middlewares/secureUpload.js`. |
| **No media library.** Uploads are per-feature and one-way: replacing an image leaves the old file on disk, and nothing lists or reuses what has been uploaded. | Content editors start managing images. | A collection, a picker component, and a cleanup story. |
| **No background jobs.** No queue, no scheduler, no cron. Everything happens inside a request. | Anything slow, retryable, or on a timer — reports, digests, imports. | A worker workspace (`add-app`) and a queue, or the host's scheduler. |
| **Email sends are fire-and-forget.** No queue, no retry, no delivery log. | Email that matters commercially. | A queue plus a sent-log collection. |
| **No in-app notifications and no webhooks.** | An integration needs to push, or users need to be told something in the panel. | A collection and a delivery mechanism; webhooks additionally need signing and retries. |

## Lists, search and reporting

| Limit | Add it when | What it touches |
|---|---|---|
| **Search is case-insensitive regex, not full text.** `runListQuery` builds `$regex` over `searchFields`, so there is no relevance ranking and a leading wildcard cannot use an index. | Free-text search feels slow, or relevance matters. | A MongoDB text index and `$text`, or a search service. `runListQuery` is the single place to change. |
| **Pagination is skip/limit.** Deep pages get progressively slower because `$skip` walks the rows it discards. | Lists routinely run to tens of thousands of rows. | Cursor pagination in `runListQuery`, and the table component that drives it. |
| **No generic list export.** The `print` and `mail` flags exist for it; the only import/export anywhere is the SEO redirect importer, and even there the server takes parsed rows — the CSV parsing is the client's job. | The first "can I get this in Excel". | An export endpoint per entity or a generic one over `runListQuery`, gated on `print`. |
| **Dashboard widgets always apply data scope.** A widget cannot be marked "company-wide" for a department-scoped role. | A KPI everyone should see the same value for. | An opt-out flag on the widget plus its own authorisation story — see ADR-003. |
| **Charting is limited to the widget grammar** — allowlisted sources, one metric, one group-by. Deliberately not a BI engine. | The client asks for joins across collections or calculated fields. | A registry entry buys a lot; past that, ADR-003 names embedding a BI tool as the intended escape hatch. |

## Content and delivery

| Limit | Add it when | What it touches |
|---|---|---|
| **There are no content collections.** No Page, Post, Product or Article — the starter ships master data, users, roles, menus, dashboards and SEO. | The project has content. | A normal module: model, endpoints, entity config, menu row. |
| **SEO covers fixed URLs only.** `SeoPage` manages the site's static paths; URLs owned by a collection are expected to carry their own SEO fields. | The first content collection with public URLs. | That collection's schema and form. See [ADR-004](../knowledge/DECISIONS.md), which records why the shape was not shared. |
| **The sitemap is only as complete as what the website pushes** to `POST /public/seo/urls`. | The site goes live. | Nothing here — it is the frontend's job. Check the URL count on SEO Settings against Search Console. |
| **One public router, by exception.** Adding another has a four-question gate in [30-api.md](30-api.md#public-endpoints). | Rarely. | Read the gate first; the answer is usually "authenticate it instead". |

## Testing

| Limit | Add it when | What it touches |
|---|---|---|
| **`npm test` covers pure functions only.** Plain `node:assert` scripts over `packages/shared` and `apps/server/utils`. There is no database or HTTP harness, so models, controllers and routes are verified by hand against a throwaway database. | The project is long-lived enough that manual verification stops being credible. | A test runner and a disposable-database strategy. That is a project decision with real weight — see the `verify` skill before adding one. |
| **The admin has no working linter.** `apps/admin/eslint.config.js` is eslintrc-shaped in a flat-config filename and eslint is not an admin dependency. | Any time — it is a small fix. | Its own change, its own commit. Listed under known deviations in [10-architecture.md](10-architecture.md#known-deviations--do-not-copy-these). |

## What you do get

So the list above reads as boundaries rather than absence. Working, and not worth rebuilding:

cookie-session auth with account lockout · a role/permission matrix enforced server-side, with
row-level data scoping · soft delete across every collection, with reference-guarded deletes ·
a field-level audit trail covering every collection automatically ·
a generic filtered/sorted/paginated list engine with an allowlist trust boundary · a declarative
CRUD screen system where most screens are a config object · a seeded, permission-aware menu tree ·
dashboard widgets a client composes without code · SEO management with a public delivery API ·
managed email templates and SMTP settings, fired by a reusable code-registered trigger (add a
registry entry and one call site, not a copy of the lookup/fill/send block) · hardened file upload ·
Swagger from the routes.
