# Decisions

Architecture decision records. Append-only — a decision that turns out wrong gets a new record that
supersedes it, rather than an edit to the old one. The history is the point.

Written by the `system-design` skill before code, closed by `update-docs` after.

Every **approved deviation from `docs/conventions/`** gets a record here. That is the mechanism that
keeps "the user told me to" from quietly becoming the new convention.

---

## Template

Copy this block. Number sequentially.

### ADR-000 — <short title>

- **Date**: YYYY-MM-DD
- **Status**: proposed | accepted | superseded by ADR-00N
- **Context**: what forced a decision. The constraint, not the solution.
- **Options considered**: each with the reason it lost. An ADR with one option is a note, not a decision.
- **Decision**: what was chosen.
- **Consequences**: what this makes easy, what it makes hard, and what would have to change to
  reverse it.
- **Deviates from convention**: no — or the file and rule it breaks, and who approved it.

---

## Records

<!-- ADR-001 onwards. Newest last. -->

### ADR-001 — Soft delete replaces hard delete, project-wide

- **Date**: 2026-08-06
- **Status**: accepted
- **Context**: The starter destroys documents on delete, guarded only by `getReferencingCounts`. The
  guard stops a delete that would orphan a reference, but it cannot help with the two cases that
  actually cost money: a record deleted by mistake, and a record whose history someone needs later.
  Once the row is gone there is nothing to recover, and there is no migration system here to restore
  from. The user asked for delete to stop destroying data.
- **Options considered**:
  - _Keep hard delete, rely on database backups_ — lost. Recovery means a restore of the whole
    database by whoever administers it; nobody is going to do that for one department row.
  - _`mongoose-delete` package_ — lost. A new dependency for what a ~30-line plugin does, and it
    ships `deletedAt`/`deletedBy`/restore statics that were explicitly declined below.
  - _An `isDeleted` field added to each of the 16 models, filtered in each controller_ — lost. It is
    16 files of duplication that a 17th model silently opts out of, and every read is one forgotten
    `isDeleted` away from leaking deleted records.
  - _A global Mongoose plugin: one field, query middleware on reads, partial unique indexes_ — won.
    New models are covered without doing anything, and the leak-on-forget failure mode does not
    exist because no controller filters by hand.
- **Decision**: `models/softDelete.js` registers a global Mongoose plugin. It adds `isDeleted`, hooks
  every read (`find*`, `count*`, `distinct`, `update*`, `replace*` and `aggregate`) to exclude
  deleted documents, and rewrites every unique index with
  `partialFilterExpression: { isDeleted: false }` so a value can be reused after its record is
  deleted. The delete endpoints set the flag instead of removing the document. The reference guard
  stays. `Otp` and session documents keep hard delete — they are consumed tokens, not history.
  No restore UI: recovery is a manual database update for now.
- **Consequences**: Nothing is lost to a misclick, and every list, search, dropdown and delete guard
  hides deleted records without a single controller filtering by hand. Costs: the plugin must be
  imported before any model is compiled — it throws on boot if it is not, rather than silently
  leaking; `npm run seed` must be run once on an existing database to backfill `isDeleted: false`
  and rebuild the unique indexes as partial; collections now grow monotonically; and a deleted
  record is invisible in the panel with no way to bring it back short of a database edit. Reversing
  this means deleting the plugin, restoring `findByIdAndDelete` in 13 controllers, and dropping the
  partial indexes.
- **As built**: 11 of the 13 delete controllers converted. `deleteMenuGroup` and `deleteMenuMaster`
  were left alone: they never hard-deleted, only set `isActive: false`, and switching them would
  have removed the one undo path the panel actually has. Adding the reference guard to them is not
  an option either — every menu is referenced by `UserRoles.roles[].menuId` in the permission
  matrix, so the guard would make menus permanently undeletable. Consequence: "delete" on those two
  screens still means deactivate, and the row stays visible in the list. Worth fixing when menu
  management is next touched, but it is a pre-existing inconsistency, not one this created.
- **Deviates from convention**: yes — [docs/conventions/20-schema.md](../conventions/20-schema.md)
  stated "**This is not soft delete.** Deletes are hard, guarded by reference counting." Approved by
  Ansh Raiyani (official@vyaris.com) on 2026-08-06 as a **starter-wide** change, so that rule has
  been rewritten rather than exempted for this project.

### ADR-002 — Server-side permission enforcement and per-role data scoping

- **Date**: 2026-08-17
- **Status**: accepted
- **Context**: The `read/write/delete/edit/print/mail` matrix in `UserRoles` is applied only in the
  admin SPA (`MenuContext.jsx`); any logged-in USER can call any `ANY_ROLE` endpoint directly
  (known deviation #1 in `10-architecture.md`). The approved dynamic-dashboards work needs "super
  admin decides what data each role sees" — meaningless while the server enforces nothing. This
  module makes the existing matrix real on the server and adds a per-role row-level data scope,
  as the foundation the dashboard/report/analytics modules will build on.
- **Options considered**:
  - _Enforce the matrix inside each controller_ — lost. Thirteen controllers of duplicated lookup
    code, and every future endpoint is one forgotten check away from being open. Same failure mode
    ADR-001 rejected for soft delete.
  - _Infer the menu and action from the route path and HTTP method_ — lost. `POST /search` is a
    read, action names don't map 1:1 to methods, and route paths don't reliably match `menuUrl`.
    Clever inference is exactly what breaks silently when a route is renamed.
  - _Store the whole permission matrix in the session at login_ — lost. Matrix edits would not take
    effect until re-login, and the super admin editing a role's permissions expects them live.
  - _A declarative `checkPermission(menuUrl, action)` middleware after `authMiddleware`, reading
    `UserRoles` per request with a short in-memory cache_ — won. Explicit per route, one
    implementation, live edits, no new dependency.
  - _Scoping: a new RoleScope collection_ — lost. A field on `UserRoles` (one document per role
    already exists) is less surface. _Per-menu scope granularity_ — deferred to an open question;
    per-role covers the dashboard need and is one enum instead of a matrix.
- **Decision**:
  1. `checkPermission(menuUrl, action)` middleware, chained after `authMiddleware` on every
     matrix-governed route. ADMIN bypasses. For USER it resolves the session user's `roleId`,
     loads the `UserRoles` document (in-memory cache, ~60s TTL, invalidated by the userRoles
     controllers on write), resolves `menuUrl` to `menuId` via a cached `MenuMaster` lookup, and
     403s unless the named boolean flag is true. A role with no matrix row for the menu is denied —
     the same default the menu UI already applies.
  2. `UserRoles.dataScope`: enum `"all" | "department" | "own"`, default `"all"`; a missing field
     on old documents reads as `"all"`, so no backfill. Super admin sets it on the existing role
     permissions screen.
  3. `utils/scope.js` exports `buildScopeFilter(reqUser, scopeable)` where `scopeable` maps scope
     dimensions to model fields (e.g. `{ department: "departmentId", owner: "createdBy" }`),
     declared per call site exactly like `filterable`. `runListQuery` accepts the result as a new
     `scopeFilter` option prepended to the pipeline; get/update/delete merge it into their
     `findOne` conditions. A model that does not declare the demanded dimension stays unscoped —
     master data (countries, currencies) is readable regardless of scope.
  4. Login stores `roleId` and `departmentId` on the session for USER accounts; pre-existing
     sessions that lack them are resolved from the database once and written back.
  5. Applied in the starter: the Users list declares `{ department: "departmentId", owner: "_id" }`
     as the working demonstration; business collections in cloned projects declare their own.
- **Consequences**: The permission matrix becomes a real security boundary, and every later module
  (dashboard widgets, reports) gets scoping by calling `buildScopeFilter` — the widget endpoint
  composes it into every aggregation. Costs: every matrix-governed route gains one middleware line;
  a USER whose role document is missing loses API access they technically had (they never had it in
  the UI); the in-memory cache means a matrix edit can take up to ~60s to propagate on a
  multi-process deployment (single-process today); `print`/`mail` flags stay unenforced until
  endpoints exist that map to them. Reversing this means removing the middleware lines and the
  `dataScope` field — the data written remains valid either way.
- **As built**: as decided, plus the boundaries implementation forced into the open:
  - **Unpaginated dropdown GETs** (`GET /departments`, `/roles`, location lists, menu tree,
    email lists) carry `authMiddleware` only, no matrix check — forms on other screens embed them
    (the user form needs departments and locations), so gating them per-menu would break every
    form the role can legitimately open. Recorded as a limit in
    [60-limits.md](../conventions/60-limits.md#auth-and-permissions).
  - **`GET /user-roles/:roleId` stays matrix-free**: MenuContext fetches the user's own matrix at
    login to build the sidebar; gating it would lock every non-admin out of the panel entirely.
  - `createUserRoles` became an upsert — the new unique `{ roleId: 1 }` index turns a second
    create into a duplicate-key error otherwise — and `npm run seed` collapses pre-existing
    duplicate matrix documents before that index builds.
  - `User` gained `departmentId`/`roleId`/`createdAt` indexes (the department-scope filter and
    filterable map hit them); the users screen is the working scope demonstration
    (`{ department: "departmentId", owner: "_id" }` on list/get/update/delete).
  - The role permissions screen saves a scope-only change even when no checkbox was ever ticked
    (empty matrix + `dataScope`).
  - 65 routes across 8 routers wired; adminUsers stayed `ADMIN_ONLY`-only; auth and otp routes
    carry no matrix by design. Verified by `apps/server/utils/scope.test.js` plus an 18-check HTTP
    acceptance run against a throwaway database (see STATE.md log, 2026-08-17).
- **Deviates from convention**: no — `30-api.md` explicitly names server-side matrix enforcement a
  design decision to raise; raised and approved by Ansh Raiyani (official@vyaris.com) on 2026-08-17
  as part of the dynamic-dashboards plan. `10-architecture.md` known deviations #1 and #2 closed
  when this landed; both convention files were rewritten accordingly (approved in the same plan).

### ADR-003 — Dynamic dashboards: a closed widget grammar over code-registered sources

- **Date**: 2026-08-17
- **Status**: accepted
- **Context**: The client must be able to create dashboard content without code changes ("doesn't
  have to tell us to make changes again and again"), per role, respecting each role's data scope
  (ADR-002). The Power BI-style shape was agreed in exploration: build report sections in a builder
  screen, save to a library, pin onto per-role dashboards. The dashboard page today is a greeting
  placeholder. Whatever executes client-authored definitions server-side is a query trust boundary.
- **Options considered**:
  - _Store arbitrary aggregation pipelines authored in the UI_ — lost. That is a BI engine:
    injection surface, unbounded query cost, months of UI. Already rejected at exploration.
  - _Compute dashboards client-side from the existing search endpoints_ — lost. Duplicates scope
    logic in the browser, ships unaggregated rows to the client (leaks what scoping hides, and
    pages of data for one number), and cannot `$group` server-side.
  - _Widgets as an entity-config CRUD screen_ — lost. The builder needs a live preview and
    field pickers driven by the source registry; that is genuinely not CRUD. The library list is
    part of the same screen, so no config object either.
  - _Embed a BI tool (Metabase / Power BI Embedded)_ — lost for the starter. Right escape hatch for
    a project that outgrows the grammar; wrong as a base dependency.
  - _A closed widget grammar over a code-registered source registry_ — won. Client composes from
    allowlisted parts (source, metric, group-by, date range, filters, chart type); the server
    composes the pipeline from the registry only. Same trust-boundary philosophy as `filterable`.
- **Decision**:
  1. **Registry** `apps/server/config/widgetSources.js` (code, not DB): source key → model,
     `aggregatable` (metric fields + types), `groupable` (fields, each optionally with a
     `$lookup` spec for display labels), `dateFields`, `filterable`, `scopeable`. Starter ships
     two sources: `users` and `login-attempts`. Adding a source to a project is one registry entry.
  2. **`DashboardWidget` collection**: title, source key, metric `{ type: count|sum|avg, field? }`,
     optional groupBy, optional dateField + preset range (`last7|last30|last90|last365|all`),
     `filters[]` in the existing `{field, op, value}` grammar, chartType
     (`stat|bar|line|pie|table`), `isActive`. Validated against the registry on save and re-checked
     at run.
  3. **`RoleDashboard` collection**: one document per role — `roleId` (unique, nullable where null
     = the admin/default dashboard), `widgets[]` of `{ widgetId ref, sequence, size }`. Same
     one-doc-per-role shape as `UserRoles`.
  4. **Engine** `apps/server/utils/widgetQuery.js`: a pure `buildWidgetPipeline(widget, source,
     scopeFilter)` (unit-testable) composing: scope `$match` (ADR-002 `buildScopeFilter`) →
     widget filters via the existing `buildFilterMatch` → date-range `$match` → `$group` by metric
     → optional label `$lookup` → `$sort` + a hard `$limit` on bucket count. Plus a thin runner.
  5. **Endpoints**, new domain router `dashboards.routes.js`: widget CRUD + search gated
     `checkPermission("/report-builder", action)`; `GET /dashboard-sources` (registry description,
     read-gated); `POST /dashboard-widgets/preview` (run an unsaved definition, ADMIN_ONLY);
     `POST /dashboard-widgets/:widgetId/run` (allowed when ADMIN or the widget is pinned to the
     caller's role dashboard — prevents probing unpinned widgets); role-dashboard upsert/read
     (edit-gated) and `GET /role-dashboards/me` (any logged-in user).
  6. **UI**: one new custom page `pages/Setup/ReportBuilder.jsx` (library list + builder form with
     live preview + pin-to-dashboards panel; new seed menu row `/report-builder` under Setup) and
     the existing `Dashboard.jsx` becomes the renderer (fetch `/role-dashboards/me`, run each
     widget, render via Recharts wrappers in `components/ui/widgets/`; greeting stays as the
     empty-state fallback). Recharts is the one new dependency (approved 2026-08-17).
  7. Deletes are reference-guarded as usual — `RoleDashboard.widgets.widgetId` is a real `ref`, so
     `getReferencingCounts` blocks deleting a pinned widget with no registration.
- **Consequences**: The client self-serves new charts and per-role dashboards; scope enforcement
  is inherited, not reimplemented — the run path composes the same `buildScopeFilter` as every
  list. Costs: the registry is a hand-kept allowlist (a new collection is invisible to the builder
  until a developer registers it — that is the security model, not a gap); the grammar cannot
  express multi-collection joins or computed metrics (escape hatch: a code-registered custom
  widget, or embedding a BI tool per project); dashboard load issues one run request per widget.
  Reversing this removes two collections, one router, one registry and returns Dashboard.jsx to a
  greeting.
- **As built**: as decided, with these differences and findings:
  - **Preview is write-gated, not ADMIN_ONLY.** `checkPermission("/report-builder", "write")` and
    the caller's own scope — so a non-admin role granted builder access can build, and previews
    never show data the role could not see. Strictly tighter for USERs than the decided
    ADMIN_ONLY, and usable by more roles.
  - **`LoginAttempt` is per-user lock state** (`userEmail` unique), not an event log — its
    registry entry offers `lastLoggedIn`/`createdAt` and lock-status grouping; the time-series
    demo is users-created-over-time instead of logins-over-time.
  - A line chart takes a date field only (no group-by — one series, v1); a stat tile refuses a
    group-by; a stored widget whose registry entry changed underneath it returns 409 with the
    specific mismatches, and the dashboard card shows a "no longer matches its data source" state
    instead of blanking the page.
  - `resolveUserScope` was extracted from `checkPermission` so the un-matrixed run path resolves
    roleId/departmentId/dataScope through the same cache.
  - The chart palette is the validated 8-slot categorical set as `--viz-series-*` variables in
    `globals.css` (dark steps under `.dark-mode`); pie slices past 8 fold into a gray "Other"
    client-side; single-series bars and lines stay on slot 1.
  - Verified by `widgetQuery.test.js` plus an 11-check HTTP acceptance run on a throwaway
    database (see STATE.md log, 2026-08-17). Browser/visual pass still outstanding — extension
    unavailable in the building session.
- **Deviates from convention**: no — new screens use the sanctioned custom-page branch with menu
  rows; the new dependency was explicitly approved. Approved by Ansh Raiyani (official@vyaris.com)
  on 2026-08-17.

### ADR-004 — SEO management: path-keyed pages, resolved server-side, served over the first public routes

- **Date**: 2026-08-22
- **Status**: accepted
- **Context**: The panel must own how the public website appears in search results and when shared,
  and the website will inject those tags with Helmet or an equivalent. The starter has no content
  collections at all — no model in `apps/server/models/` carries a slug — so there is nothing for
  SEO to hang off. The consumer is a separate application with no cookie session, which collides
  head-on with `30-api.md`'s rule that every endpoint is authenticated.
- **Options considered**:
  - _Attach SEO to content records_ (the Strapi/Payload shape) — lost. There are no content records
    yet; choosing this would mean inventing a `Page` collection as part of an SEO module, designing
    the client's content model for them.
  - _Path-keyed with an optional `{model, recordId}` link_ (the Craft/Statamic hybrid) — lost on the
    client's call. It keeps future collections in sync automatically, but every one of those
    collections is now expected to carry its own SEO fields instead.
  - _Wildcard pattern rules with token interpolation_ (`/products/* → "{{name}} | Acme"`) — lost.
    Dynamic detail pages will be owned by their own collection, so a pattern engine had no
    remaining job. Dropped a matcher, a specificity/precedence system and a chunk of list UI.
  - _A shared SEO field group (sub-schema + `<SeoPanel>`) other collections embed_ — lost on the
    client's call, knowing the cost. Recorded as a limit in
    [60-limits.md](../conventions/60-limits.md#content-and-delivery).
  - _Resolve fallbacks in the frontend_ — lost. Every consumer would reimplement the merge, and two
    frontends would disagree about what a canonical URL is.
  - _Build-time bulk export instead of a runtime endpoint_ — lost. SEO edits would not go live until
    the site rebuilt, which makes the panel feel broken to whoever just saved.
  - _API-key gating on the public reads_ — lost. Meta tags are visible in any page's source; a key
    on the reads is friction with nothing behind it. Kept on the two writes, where it matters.
- **Decision**:
  1. **Five collections.** `SeoPage` (one hand-authored URL: title, description, canonical, robots,
     Open Graph, Twitter, JSON-LD, sitemap flags; `path` unique and normalised on write),
     `SeoSettings` (singleton, enforced by a unique index on a constant `key` rather than by a
     controller), `SeoRedirect`, `SeoNotFound` (one row per path with a hit counter), `SeoUrl` (the
     URL list the site pushes — kept apart from `SeoPage` so thousands of machine rows never bury
     the dozen a human edits).
  2. **The resolver is pure and lives in `packages/shared`.** `seo.js` (vocabularies, path
     normalisation, pixel-width measurement, health scoring) and `seoResolve.js` (merge chain, tag
     emission, sitemap/robots builders) import nothing and touch no database. That is what lets the
     admin editor preview every keystroke locally using the exact code the server runs — the
     alternative was a preview endpoint per keystroke, or two implementations that drift.
  3. **Resolution order**: redirect table → page → site defaults → constants, then token
     interpolation, then a flat Helmet-ready `{ title, meta[], link[], script[] }`. The site holds
     no SEO logic. A plain page title is fed into the site template; a title containing `{{` is
     treated as its own template — the escape hatch, at no extra field.
  4. **One public router** `seoPublic.routes.js`: open reads (`resolve` by path, `sitemap.xml`,
     `robots.txt`), site-key writes (`urls`, `404`) via `middlewares/siteKey.js`, constant-time
     compare, 503 when no key exists. Rules for adding another are in
     [30-api.md](../conventions/30-api.md#public-endpoints).
  5. **Redirect verdicts ride the resolve response.** The panel cannot intercept traffic it never
     sees, and a second round trip on every page view to ask "has this moved?" is not worth it.
  6. **UI**: four seed menu rows under Setup. Redirects are a plain entity config; SEO Settings and
     the 404 Log are custom pages; SEO Pages keeps the generated list and replaces only its form
     routes with `SeoPageEditor` (new frontend branch 3, see
     [40-frontend.md](../conventions/40-frontend.md#decision-tree)).
- **Consequences**:
  - Meta tags only reach crawlers if the site server-renders them. Facebook, LinkedIn, X and
    WhatsApp run no JavaScript at all. Flagged to the client before building; it changes nothing in
    the panel but decides whether the module pays off. Written up in
    [docs/seo-frontend-integration.md](../seo-frontend-integration.md).
  - The sitemap is only as complete as what the website pushes. A site that never calls
    `POST /public/seo/urls` gets a sitemap of hand-entered pages and nothing else.
  - Dynamic URLs are out of scope by construction. When Product Master exists it must carry its own
    SEO fields — see [60-limits.md](../conventions/60-limits.md#content-and-delivery) for what
    that costs.
  - The in-memory resolver cache assumes a single process, like `checkPermission`'s. A multi-process
    deploy accepts up to 60s of staleness on processes that did not serve the write.
  - `SeoPage` caches as a whole map, which holds because it stores tens of rows. A project that puts
    thousands there needs an LRU keyed by path (noted in `utils/seoCache.js`).
- **Deviates from convention**: **yes** — `docs/conventions/30-api.md`, "Every endpoint gets one;
  there are no unauthenticated routes." Five public routes were added under `/api/v1/public/`. The
  rule has been rewritten to name this exception and gate any future one behind four questions.
  Approved by Ansh Raiyani (official@vyaris.com) on 2026-08-22, who chose the public read-only
  endpoint over an API-key or build-time export after seeing the trade-offs.
- **As built**: `GET /seo-settings` is deliberately matrix-free (behind `authMiddleware`) because
  the page editor reads the site defaults to render its preview — gating it would break that screen
  for anyone without settings access. The site key is stripped from that response and has its own
  permission-gated endpoint. Verified by `packages/shared/seoResolve.test.js`, a 66-check HTTP
  acceptance run and a 14-check permission-matrix run on a throwaway database (see STATE.md log,
  2026-08-22). Browser/visual pass still outstanding.

### ADR-005 — Audit trail as a global Mongoose plugin, keyed on request context

- **Date**: 2026-08-22
- **Status**: accepted
- **Context**: "Who changed what, when" was the second of the five *Decide before you build*
  questions in `60-limits.md`, and the answer was that the starter could not answer it: no history
  collection, and no model carrying `createdBy`/`updatedBy`. It is also the one gap that cannot be
  closed retroactively — writes that already happened are gone. A CRM or CMS built on this starter
  hits the question early and every time.
- **Options considered**:
  - _A `createdBy`/`updatedBy` pair on every model_ — lost. Answers "who touched this last", never
    "what did they change", and needs adding to every model by hand for ever.
  - _An explicit `audit(...)` call in each controller_ — lost. Boilerplate in 40+ handlers, and the
    one that gets forgotten is the one that mattered. Same failure mode the starter already
    rejected for soft delete.
  - _Express middleware wrapping mutating routes_ — lost. Knows the user but not the document: it
    can log "a PUT happened", not which fields moved and from what.
  - _MongoDB change streams_ — lost. Captures the write but not the human behind it, needs a replica
    set, and puts the audit trail in a second process that can silently stop.
  - _A global Mongoose plugin plus `AsyncLocalStorage`_ — won. Same shape as `softDelete.js`, which
    is already the repo's proven answer to "every model, no exceptions, nobody has to remember".
- **Decision**:
  1. **`models/auditPlugin.js`**, registered with `mongoose.plugin()` immediately after
     `softDelete.js`, hooking `save` and the `findOneAndUpdate`/`updateOne`/`updateMany` family. It
     throws on boot if a model was compiled first, rather than leaving it silently unaudited.
  2. **`utils/auditContext.js`** — an `AsyncLocalStorage` store populated by one `app.use` after the
     session middleware. **No actor, no row**: writes outside a logged-in request are not recorded.
     That is what keeps the seeder, the public SEO endpoints and the redirect hit counter — which
     fires on every page view of the public website — out of the collection.
  3. **`utils/auditDiff.js`** — pure: flatten to dot paths, diff, redact, classify. Tested with
     `node:assert` like `listQuery` and `seoResolve`, which is where the interesting logic lives.
  4. **`AuditLog`** — model, documentId, a human `recordLabel`, action, `changes[{field, from, to}]`,
     and a **denormalised** actor so a row stays readable after the account is deleted.
  5. **Read-only endpoints.** Search, one entry, per-record history, model list. No create, update
     or delete — a log the panel can edit answers no question worth asking.
  6. **UI**: `pages/Master/AuditLog.jsx`, a custom page rather than an entity config precisely
     because a generated CRUD screen would offer add, edit and delete.
- **Consequences**:
  - One extra indexed read per audited update, for the before-image. The after-image is derived from
    the update payload rather than read back, so an audited update is two queries rather than three.
  - Operators whose result depends on the stored value (`$inc`, `$push`) cannot be resolved that way
    and are recorded as the operation, not a guessed value.
  - `bulkWrite` and real `deleteOne`/`deleteMany` are not covered — neither runs query middleware.
    Nothing user-facing uses either today; a feature that reaches for one must log it itself.
  - **The collection grows for the life of the project.** Retention is deliberately not built: it is
    a compliance answer, not a technical one. A TTL index or a scheduled job closes it — never an
    endpoint. Recorded as a limit in [60-limits.md](../conventions/60-limits.md#operations).
  - Secrets are recorded as changed, never as values. A hashed password is still a credential.
- **Deviates from convention**: no. It follows the global-plugin pattern ADR-001 established, the
  custom-page branch is the sanctioned one, and the menu row is seeded. `AsyncLocalStorage` is a
  Node built-in, not a new dependency.
- **As built**: verified by `utils/auditDiff.test.js` (in `npm test`) plus a 35-check HTTP
  acceptance run and a 7-check permission-matrix run on a throwaway database — including that the
  seeder writes nothing, that public redirect hits write nothing, that a soft delete is recorded as
  a delete rather than an edit, and that no password or hash reaches the log. The `save`-path bug
  where a delete produced an empty change list and was therefore dropped was caught by the unit
  test before it reached the acceptance run.

### ADR-006 — Report Builder: vendored shadcn/ui chart primitives, six new chart types, per-category colours, and a split add/edit screen

- **Status**: accepted
- **Context**: The Report Builder shipped with five chart types (stat, bar, line, pie, table), a
  single builder page holding library + form + dashboard assignment, and a fixed positional palette
  with no user control. Three asks arrived together: more chart types (the user pointed at the
  shadcn/ui charts page), user-chosen colours per category, and separate `/add` and `/edit` screens.
- **Decision**:
  1. **Vendor shadcn/ui's chart primitives rather than install them.** `components/ui/chart.jsx`
     holds `ChartContainer` / `ChartTooltip(Content)` / `ChartLegend(Content)`, ported to this app's
     `cx` helper and `--viz-series-N` palette. shadcn is a copy-in library, not a package; its chart
     component is a wrapper over Recharts, which the app already depended on. **No new dependency.**
  2. **Six new chart types**: `barHorizontal`, `area`, `donut`, `radar`, `radial` alongside the
     existing five. `CHART_TYPES` in `packages/shared/src/widgets.js` grew two companion sets —
     `GROUPED_CHART_TYPES` (needs a group-by) and `TIME_SERIES_CHART_TYPES` (needs a date field) —
     so validation is driven by membership rather than by a chain of hardcoded type names.
  3. **`seriesColors`: an optional `{ categoryLabel: paletteSlot }` Map on `DashboardWidget`.**
     Keyed by the *rendered label*, not by array position, so a category keeps its colour when the
     sort order moves it. Values are palette **slots (1-8), never hex**: a stored hex would freeze
     the widget to the palette of the day it was saved and break dark mode.
  4. **The builder became its own screen.** `/report-builder` is now the library plus the
     dashboard-assignment tab; `/report-builder/add` and `/report-builder/edit/:id` render
     `ReportSectionEditor` in two modes. Same split, and same justification, as `SeoPageEditor`:
     the live preview beside the inputs is what makes the screen worth having, and it needs the room.
- **Consequences**:
  - `seriesColors` is display-only — it never reaches a query, so it is not a trust boundary in the
    way `filterable` is. It is still validated (slot in range, chart type actually has categories),
    because an unknown slot renders as no colour at all.
  - **Reset-to-automatic needed an explicit `$unset`.** Mongoose strips `undefined` keys from an
    update, so clearing the colours would silently have left the old map in place. The update path
    branches on it.
  - `allowedWidgetFields` had to grow `seriesColors`; the request-body allowlist rejected it before
    the widget validator ever ran. Caught by an HTTP run, not by the unit tests — worth remembering
    that the field allowlist and the validator are two separate gates.
  - Radar takes a single colour for its one shape, so a per-category palette cannot fully apply
    there; the first override wins. Stat tiles and tables have no categories at all and reject
    colours outright.
  - Permissions needed no new menu row: `findMenuIdForPath` walks up path segments, so the two
    subroutes resolve to the existing `/report-builder` row.
- **Deviates from convention**: **yes, on one point, at the user's explicit direction.** AGENTS.md
  says not to add dependencies without asking, and the admin app standardises on the vendored
  Untitled UI. The user asked specifically for shadcn/ui chart components after being shown that
  Recharts alone would do the job. Vendoring the ~200-line chart wrapper rather than installing
  shadcn keeps the dependency count unchanged and keeps one theming system, which is the narrowest
  form of that deviation. The rest — new chart types, the new model field, the add/edit split —
  follows existing convention.
- **As built**: `npm test` (including new `widgetQuery.test.js` cases covering every grouped and
  time-series type, slot validation, colours rejected on non-categorical charts, and the empty-map
  reset), `npm run build`, plus an HTTP acceptance run against the dev server: every new chart type
  previews, a bad slot and colours-on-a-stat-tile both 400, and the create → save-colours →
  reset → delete lifecycle behaves (the reset case is what proved the `$unset` fix). The rendered
  UI has not been viewed in a browser — the Chrome extension was not connected in that session.

### ADR-007 — Dashboard layout canvas: a snapped grid, not a free canvas

- **Status**: accepted
- **Context**: Assigning sections to a role's dashboard was a numbered list with up/down arrows and a
  size dropdown per row. It told you the order but never showed the result, and moving row 9 to
  position 2 meant seven clicks. The user asked for "some kind of canvas, like Figma".
- **Decision**: A drag-and-drop canvas that **snaps to the dashboard's existing 4-column grid**,
  rather than free x/y positioning.
  1. **Why not a true free canvas.** The dashboard renders on a responsive CSS grid
     (`grid-cols-1 / md:grid-cols-2 / xl:grid-cols-4`), so cards reflow at every breakpoint. A free
     position has no meaning at one column — the editor would show a layout no viewer ever sees. Free
     positioning is only honest if the dashboard stops being responsive, which was not wanted.
  2. **The snapped canvas needs no schema change.** `sequence` + `size` already express a grid
     layout exactly: drag order rewrites `sequence`, drag-to-resize rewrites `size`
     (sm/md/lg/full = 1/2/3/4 columns). The stored shape is untouched, so existing dashboards keep
     working with no backfill.
  3. **The canvas renders live `WidgetCard`s**, running each pinned widget through the same `/run`
     endpoint the dashboard uses. It is a preview of the real thing, not a wireframe of it.
  4. **`@dnd-kit`** for the interaction: pointer, touch and keyboard dragging with screen-reader
     announcements. Resize is a vertical `range` input rather than a raw pointer handler, so width is
     adjustable from the keyboard rather than mouse-only.
- **Consequences**:
  - What an admin arranges is what every viewer gets, at every width — the property a free canvas
    would have lost.
  - Widths are limited to whole columns. A card cannot be 1.5 columns wide; that is the cost of the
    layout staying responsive, and it is the right trade for this app.
  - Each pinned widget is now run when the assign screen loads, so opening that tab costs one
    aggregation per pinned section. They fire independently rather than as a batch, so one slow
    widget does not block the canvas.
  - The up/down arrows, the per-row size dropdown and `movePin` are gone. Reordering is drag-only
    with a keyboard fallback via dnd-kit, not arrow buttons.
- **Deviates from convention**: **yes — one new dependency**, approved by the user when asked.
  AGENTS.md requires asking before adding one. `@dnd-kit/core` + `sortable` + `utilities` (~10KB
  gzipped, no transitive dependencies). The alternative — hand-rolling pointer events — was offered
  and declined: it is roughly 200 more lines and would have made keyboard accessibility a
  build-it-yourself problem.
- **As built**: `npm test` and `npm run build` passing. Reorder and resize verified round-trip
  through the real API — swapping two pins and resizing one persisted correctly and read back in the
  new order, then the original layout was restored. The rendered canvas has not been driven in a
  browser; drag behaviour needs a manual check.

### ADR-008 — "Report Builder" renamed to "Dashboard Builder", route and permission key included

- **Date**: 2026-08-28
- **Status**: accepted
- **Context**: The screen builds dashboard sections and pins them to role dashboards; it does not
  produce reports in the usual sense (a parameterised, exportable table). The name set the wrong
  expectation, and the user asked for the full rename rather than a label-only change.
- **Decision**:
  1. **The route moved**: `/report-builder` → `/dashboard-builder`, with `/add` and `/edit/:id`
     following it. The page files are `pages/Setup/DashboardBuilder.jsx` and
     `DashboardSectionEditor.jsx`.
  2. **The permission key moved with it.** `checkPermission()` takes the seeded `menuUrl`, so every
     guard in `routes/v1/dashboards.routes.js` is now `checkPermission("/dashboard-builder", …)`.
  3. **The existing menu row is renamed in place, not replaced.** `seedMenus` upserts by
     `{ menuName, menuGroup }`, so a renamed row would not match and a second `MenuMaster` document
     would be inserted under a new `_id`. `UserRoles` stores permissions by `menuId`, so that would
     have silently stripped the screen from every non-admin role. `renameReportBuilderMenu()` runs
     before `seedMenus()` and updates the row's `menuName` and `menuUrl`, keeping the `_id`.
  4. **"Report section" became "dashboard section"** in the user-visible strings and the
     `DashboardWidget` model comment. The model and collection names were already dashboard-flavoured
     and did not change.
- **Consequences**:
  - `npm run seed` is required on every existing environment after this deploys. Without it the menu
    row still points at `/report-builder`, `checkPermission` resolves the new URL to no menu, and
    every non-admin role is denied the screen. Admin is unaffected — it bypasses the matrix.
  - Saved widgets, pins and role dashboards are untouched: nothing in `DashboardWidget` or
    `RoleDashboard` referenced the old route.
  - Anyone's bookmark to `/report-builder` now 404s inside the SPA. No redirect was added — the
    starter has no client-side redirect table, and the screen is reachable from the sidebar.
  - ADR-003 and ADR-006 still say "Report Builder" throughout. They are a record of what was decided
    at the time and were left as written; this entry is the rename.
- **Deviates from convention**: no.
- **As built**: `npm test` and `npm run build` passing. The seed rename was run against a database
  holding a `/report-builder` row and verified to keep the `_id`, and to be a no-op on a second run.

### ADR-009 — Stat tiles: square at `sm`, a live breakdown, and an author-written explanation

- **Date**: 2026-08-28
- **Status**: accepted
- **Context**: Stat tiles showed a bare number — "Average failed attempts: 0.89" — with nothing
  saying what it counted or where it came from. The user asked for near-square cards carrying two
  hover affordances: an info icon showing the breakdown behind the number, and a question mark
  saying what the number represents.
- **Decision**:
  1. **The breakdown is live data, not a caption.** `runStatBreakdown()` re-runs the same widget
     with a `groupBy` injected and reads the top five buckets. It reuses `buildWidgetPipeline`'s
     grouped branch rather than building a second pipeline, so it inherits the registry `lookup`
     (readable labels instead of ObjectIds), the `MAX_BUCKETS` cap and the sort. It runs inside
     `executeWidget` on the same `scopeFilter`, so it can never reveal rows the tile itself would
     have hidden under ADR-002 scoping.
  2. **The breakdown field is the first `groupable` entry in the registry**, not a per-widget
     setting. A registry map is written in a deliberate order and its first entry is the most
     meaningful cut of that collection; taking it adds nothing to store and nothing to the builder
     form. A source wanting a different default reorders its map. Sources with no groupable field
     get no info icon.
  3. **An average is not broken down into a total.** The mean of per-group means is not the overall
     mean unless every group is the same size, so `foldBreakdown` marks `avg` non-additive and
     reports per-group figures with no total and no percentage shares. Showing a total there would
     be arithmetic that looks authoritative and is wrong.
  4. **The "?" text is a stored `description`, written by whoever built the widget.** It was
     tempting to generate it from source + metric + filters, but that restates the configuration
     while reading like an explanation: "Average failed attempts" could be per user, per day or per
     session, and only the author knows which. **Both icons always render on a stat tile** so the
     shape is predictable rather than varying per widget; with nothing written, the "?" says so and
     points at where it is filled in. An honest "nobody has written this yet" beats both a blank
     tooltip and an invented meaning.
  5. **Square only at `sm`.** A one-column stat tile is about as wide as it is tall, so `aspect-square`
     matches the requested shape. Applying it at `full` would produce a four-column-wide block of
     mostly empty space, so larger pins keep content height.
  6. **Hover uses the vendored `Tooltip`** (react-aria-components) rather than hand-rolled hover
     state, so both affordances are keyboard reachable and screen-reader labelled for free.
  7. **Both icons share one resting colour and one hover colour**, and the tooltip's own text uses
     the theme's `tooltip-supporting-text` token rather than an opacity. The "?" first shipped dimmed
     when no description existed, which read as a broken icon rather than a missing explanation; and
     opacity over the solid tooltip background washes out to unreadable in dark mode. `title` is
     rendered by the tooltip inside a `text-white font-semibold` span, so the breakdown table sets
     its own weights and colours explicitly rather than inheriting bold white throughout.
- **Consequences**:
  - **Every widget carries both icons, not just stat tiles** (extended after the first release). A
    chart that already groups — bar, pie, donut, radar, radial — reuses the rows it just fetched, so
    it costs **no extra query**; its info panel gives the exact values, shares and the tail the
    picture caps off. Only a stat tile and a time series pay a second aggregation, because neither
    has categories of its own. Both are capped and indexed. Should a dashboard of many such widgets
    ever feel slow, the fix is to run the breakdown lazily on first hover.
  - `description` is new on `DashboardWidget`, added to `allowedWidgetFields` and `widgetValidation`
    (max 280 characters). Existing widgets default to `""` and simply show no "?" — no backfill.
  - `groupable` ordering now carries meaning it did not before. Documented in `widgetSources.js`, but
    it is a convention a future edit could break silently by reordering a map.
  - `foldBreakdown` was split out as a pure function so the additive/average arithmetic is unit
    tested without a database.
- **Deviates from convention**: no. No new dependency; `Tooltip` and `TextAreaField` already existed.
- **As built**: `npm test` (8 suites) and `npm run build` passing. Exercised against live dev data:
  on `users` the breakdown totals 60 across six departments and matches the headline exactly, on
  `login-attempts` it totals 26 and matches; the `avg` tile (0.923) correctly reports no total.
  Not yet driven in a browser — hover behaviour and the square shape need a manual check.

### ADR-010 — Client-facing documentation: generated in-app pages with fingerprint-incremental screenshots

- **Date**: 2026-08-28
- **Status**: proposed
- **Context**: The admin panel ships thirteen CRUD screens plus four custom ones, and a client's end
  users have nothing to read. Nobody hands them a guide to what the Audit Log diff modal means or
  why a booking needs a department. The user asked for documentation the client's staff can open
  from a tab in the panel, generated as part of building each module rather than written once and
  abandoned, and illustrated with real screenshots of the running app.
  Two constraints shaped every option below. First, the audience is end users, not engineers —
  `docs/conventions/` already serves engineers and is not this. Second, documentation that is not
  produced by the pipeline does not get produced at all; the six modules already shipped have no
  user-facing documentation precisely because nothing in the pipeline asked for it.
- **Options considered**:
  - _MkDocs Material as a separate static site_ (the user's initial proposal) — lost. It is the
    better-looking renderer and the obvious choice in isolation, but it is Python, and this is a
    Node-only repo with a Node-only deploy. It adds an interpreter and a second build toolchain to
    every development machine and every server, per `docs/conventions/70-deployment.md`. Its output
    is also a separate static site, so the sidebar entry could not be an ordinary menu row and the
    pages could not sit behind the session cookie without extra work. Worth revisiting only if the
    documentation must also be published publicly at its own domain, which is not the requirement.
  - _Hand-written documentation pages, no generation_ — lost. It is what every project intends and
    no project sustains. The generated skeleton is what makes the per-module cost small enough that
    the pipeline phase actually gets run.
  - _Fully generated from the entity configs, no human prose_ — lost. A config knows a field is
    named `departmentId`, is a reference, and is required. It does not know why the business needs
    it, and that sentence is the only reason an end user opens the page. Generation without prose
    produces a field dump that reads as documentation and informs nobody.
  - _Screenshots captured manually when a module lands_ — lost on the user's explicit instruction
    after the trade-off was put to them: it was recommended as the cheaper option (roughly one
    module against two) and declined in favour of full automation.
  - _Recapturing every screen on every documentation build_ — lost, again on the user's
    instruction. Correct but unusable: every build would drive a browser across seventeen screens in
    two themes regardless of what changed.
  - _Fingerprint-incremental capture_ — won. Only screens whose inputs moved are recaptured.
- **Decision**: Client documentation is generated into a markdown tree, rendered inside the admin
  SPA at an ordinary route with an ordinary seeded menu row, and illustrated by screenshots captured
  automatically by a browser driver.
  Four pieces, in dependency order:
  1. **A screenshot fixture seed**, separate from `npm run seed`, producing presentable demo data —
     plausible names, populated tables, several departments, audit history, a dashboard carrying
     widgets. It runs only against a throwaway database. This is a prerequisite: without it the
     screenshots are pictures of empty tables.
  2. **Capture automation**, driven by `npm run docs`, which boots the server and admin against the
     fixture database, signs in, walks a declared list of screens, and captures each in both light
     and dark themes. A screen that cannot be captured fails the build rather than silently shipping
     a missing image.
  3. **Documentation generation**, reading each entity config to emit a page skeleton — the screen's
     fields, filters and permissions — with the agent writing the explanatory prose in the same pass.
     The four custom pages (SEO editor, Audit Log, Dashboard Builder, Dashboard) have no config to
     read and are written by hand; the skill lists them explicitly so they cannot be forgotten.
  4. **Rendering**, as a markdown-rendered route in the admin SPA with a seeded menu row, so the
     documentation inherits the existing permission matrix, session auth and dark mode for free.
  Screenshots are **incremental by fingerprint**. Each declared screen hashes its entity config or
  page file, the shared UI components it renders through, the theme CSS, the fixture seed, and its
  own capture-list entry. The hashes are stored beside the images and a screen is recaptured only
  when its hash moves — the same mechanism as the input-document hash table in `STATE.md`.
  `npm run docs -- --force` recaptures everything.
  A new `client-docs` skill runs as pipeline phase 7.5, after `update-docs` and before `git-flow`.
- **Consequences**:
  - Browser automation becomes permanent infrastructure. If it breaks, documentation stops building.
    This is the standing cost of the automatic option and it was accepted knowingly.
  - Captured PNGs are committed. That is what lets a fresh clone reuse them instead of recapturing
    everything, at the price of growing binary history.
  - The fingerprint inputs are deliberately broad. Editing the shared table component recaptures
    every list screen; editing the fixture seed recaptures all of them. This over-captures rather
    than risking a stale image, because a documentation screenshot that lies is worse than one that
    is regenerated needlessly.
  - `npm run docs` is a separate command rather than part of `npm run build`, so an ordinary build
    does not require MongoDB and a browser to be alive. The pipeline's documentation phase and the
    pre-deploy step run it.
  - Two new dependencies are required and must be approved when reached: a browser driver
    (Playwright is the expected choice, and it downloads its own browser binaries) and a markdown
    renderer for the SPA.
  - The six modules already shipped have no client documentation. Backfilling them is follow-on work
    once the machinery exists, not part of this module.
- **Deviates from convention**: no. It adds a pipeline phase and a skill, which `AGENTS.md` provides
  for, and the rendering follows the existing entity-config and seeded-menu-row conventions. The two
  new dependencies need the explicit approval that `AGENTS.md` requires.

### ADR-011 — Client documentation: build-time generation from the entity configs, captured with the Playwright already installed

- **Date**: 2026-08-28
- **Status**: proposed
- **Context**: [ADR-010](#adr-010--client-facing-documentation-generated-in-app-pages-with-fingerprint-incremental-screenshots)
  settled *what* to build and why it is not MkDocs. This record settles *how*, after reading the
  code, and revises two cost assumptions ADR-010 made without looking.
  The first: ADR-010 treated browser automation as new infrastructure to be introduced and
  maintained. It is already here — `playwright@1.62.1` is a devDependency of `apps/admin` with
  Chromium binaries present in `~/.cache/ms-playwright`. Nothing imports it; it arrived with the
  toolchain. The capture half of this module is therefore substantially cheaper than priced, and one
  of the two dependency approvals ADR-010 anticipated is unnecessary.
  The second: ADR-010 assumed generated text would be a field dump needing prose written over it.
  The entity configs carry far more human-written material than that — `singular`, `plural`, a
  `description` per entity, `sections` each with a `title` and `description`, and per-field `label`,
  `hint`, `required` and `placeholder`. The redirect config already reads "Send visitors from an old
  URL to its replacement, so old links and search results keep working." That is documentation prose
  sitting in a config file. The generator's job is to surface it, not to invent it.
- **Options considered**:
  - _Serve the documentation from the server as static files_ — lost. It would put the pages outside
    the session cookie and outside the permission matrix, making them readable by anyone with the
    URL. The only unauthenticated routes in this repo are the SEO public ones, which needed a
    deviation (ADR-004). Rendering inside the SPA inherits auth, permissions and dark mode for free.
  - _Generate the markdown at run time from the configs, in the browser_ — lost. The screenshots
    cannot be produced in the browser, so the pipeline is needed regardless; splitting generation
    across build time and run time means two mechanisms where one will do. Build-time generation
    also lets the prose be reviewed in a pull request, which is the point of writing it.
  - _`react-markdown`_ — lost as the renderer. It pulls a unified/remark plugin tree for capability
    this module does not use. The markdown here is repo-authored and committed, never user input, so
    the sanitising that justifies the heavier library buys nothing.
  - _`marked` plus the already-installed `@tailwindcss/typography`_ — won. One small dependency,
    renders to HTML the existing typography plugin styles, no configuration surface.
  - _A new collection to store documentation pages_ — lost, and worth stating because it is the
    reflex in a CRUD codebase. The pages are build artefacts generated from files in the repository;
    storing them in MongoDB would mean they could drift from the code that produced them, and would
    need a whole CRUD surface to manage what `git` already manages.
- **Decision**: Four pieces.
  1. **`apps/server/seed/fixtures.js`** — a screenshot fixture seed, separate from `npm run seed`,
     which refuses to run unless the target database is the designated throwaway one. It produces
     presentable demo data: several departments, users spread across them, audit history, a
     dashboard carrying widgets, SEO pages and redirects.
  2. **`scripts/docs-capture.js`** — boots the server and admin against the fixture database using
     the installed Playwright, signs in, walks a declared screen list, and captures each screen in
     both light and dark themes. A screen that cannot be captured fails the run rather than shipping
     a missing image.
  3. **A generator** reading each entity config to emit a markdown skeleton — purpose, sections,
     fields with their hints, filters, and what each permission flag enables — with the agent
     writing the explanatory prose in the same pass. The custom pages have no config to read and are
     written by hand.
  4. **Rendering** at `/documentation` in the admin SPA, with the markdown imported at build time by
     Vite and one seeded menu row, so the section is permission-gated like every other screen.
  Capture is **incremental by fingerprint**: each screen hashes its config or page file, the shared
  CRUD components it renders through, the theme CSS, the fixture seed and its own capture-list
  entry. Hashes are stored beside the images; a screen is recaptured only when its hash moves.
  `npm run docs -- --force` recaptures everything.
- **Consequences**:
  - The documentation is only as current as the last `npm run docs`. This is the reason it is a
    pipeline phase rather than a convention — the `client-docs` skill is what makes it run.
  - Generated pages must not be hand-edited: the next run overwrites them. Prose belongs in the
    generator's per-screen source, which is why that lives in the repository and not in the output.
  - The fixture seed is a permanent piece of the project. It has to keep producing data that makes
    every screen look populated, so a new module that adds a screen also adds fixture data for it.
  - Captured PNGs are committed, so a fresh clone reuses them instead of recapturing everything, at
    the cost of growing binary history.
  - `npm run docs` needs MongoDB and a browser; `npm run build` deliberately still does not.
- **Deviates from convention**: no. `marked` is the one new dependency and was approved by the user.
  `schema-design` and `api-endpoint` are skipped with reasons stated — no collection and no
  endpoints — which `AGENTS.md` permits provided the skip is declared rather than silent.

### ADR-012 — The documentation section reproduces Material for MkDocs' visual design rather than the panel's

- **Date**: 2026-08-28
- **Status**: superseded by [ADR-014](#adr-014--the-documentation-section-is-styled-with-the-panels-own-design-tokens) on 2026-08-29
- **Context**: [ADR-010](#adr-010) declined MkDocs Material as a *tool* — it is Python, and this is a
  Node repo with a Node deploy. That decision stands and is unaffected by this one. What was still
  open was what the documentation should *look* like, and the answer moved twice in one
  conversation as the user saw the result: first "keep the theme and colour palette of the current
  cms-panel", then, pointing at the mkdocs-material site itself, "exactly like this". The second
  instruction was given after seeing the first implemented, so it supersedes it.
- **Options considered**:
  - _Material's layout and typography in this panel's tokens_ — built first, and rejected by the
    user on sight. It is the better engineering answer: the section follows a rebrand for free and
    has one palette to maintain. It is not what was asked for.
  - _Only the marketing homepage's hero treatment_ — never seriously in play. The hero belongs to
    mkdocs-material's own landing page, not its documentation UI, and a full-bleed hero with its own
    top navigation would fight the admin's existing sidebar and header.
  - _Material's complete visual design — palette, type, metrics_ — chosen.
- **Decision**: `apps/admin/src/styles/documentation.css` reproduces Material for MkDocs: its
  `#3f51b5` indigo masthead with an inline search field, `#4051b5` accent, the Roboto and Roboto
  Mono stack loaded from Google Fonts, a 0.8rem base size on Material's 0.2rem spacing grid, its
  light-weight (300) display headings, and its `#1e2129` slate scheme for dark mode. Admonitions are
  reproduced too — a coloured left rule, a tinted title bar and a masked Material icon — and the
  generator emits them as `> [!WARNING] Title` blockquotes, which stay readable as plain markdown.
  Everything is namespaced under `.doc-shell`, so none of it can leak into another screen. The
  layout is Material's three columns: page list, article, and a table of contents that follows the
  reader via an `IntersectionObserver`.
- **Consequences**:
  - **The documentation will not follow a rebrand of the panel.** These are Material's colours, not
    ours, and changing the admin's brand tokens will leave this section behind. That is the accepted
    cost of the instruction, and the one thing worth revisiting if the panel is ever re-themed.
  - The section is visually distinct from every other screen. For documentation this is arguably a
    feature — it reads as a separate space — but it is a deliberate inconsistency, not an accident.
  - Roboto is fetched from Google Fonts, so first paint of this screen depends on a third-party
    request. Preconnect hints are in `index.html` and the stack falls back to the system font.
  - The CSS reaches into the react-aria input's internals to restyle the search field (the visible
    box is the wrapping Group, not the input). If that component's markup changes, the search field
    will look wrong here first.
- **Deviates from convention**: yes — [40-frontend.md](../conventions/40-frontend.md) has every
  screen built from the shared design tokens, and this one deliberately is not. Approved by the user
  on 2026-08-28 after seeing the token-based version and asking for Material's design instead.

### ADR-013 — Documentation pages explain the four record operations once, in the generator

- **Date**: 2026-08-29
- **Status**: accepted
- **Context**: [ADR-011](#adr-011--client-documentation-build-time-generation-from-the-entity-configs-captured-with-the-playwright-already-installed)
  built the generator around what an entity config can describe: what a screen is, what its fields
  mean, what can be filtered. The pages that resulted answered "what is this screen?" but never
  "how do I add a record, and what happens when I press delete?" — which is the question the
  client's staff actually arrive with. The user asked for creation, updating, deleting and reading
  to be covered on every page.
  The material for that is not in the entity configs. It is in the three shared components every
  config-driven screen renders through: `crud-list` (the Add button, the row actions, the confirm
  dialog and the two distinct delete-blocked modals), `crud-form` (validation, the submit labels,
  Cancel) and `crud-view` (the read-only mirror, the created/updated footer, Back and Edit).
- **Options considered**:
  - _A sub-page per operation — `department/add`, `department/delete`_ — lost. It quadruples the
    page count to roughly 75 and, because each page would want its own illustration, adds about 120
    screenshots to capture and commit. The steps are identical on every screen, so almost all of
    that is duplicated maintenance.
  - _One shared "How records work" page, linked from each screen_ — lost, though it is the tidiest
    on paper. Someone reading the Departments page while trying to delete a department should not
    have to follow a link to find out why the panel refused; the answer belongs where they are.
  - _Per-screen prose in the manifest_ — lost. Fifteen near-identical copies of the same four
    sections is exactly the drift the generator exists to prevent.
  - _Generated once in `docs-generate.js`, emitted into every config-driven page_ — won. The steps
    come from shared components, so they are written where the sharing already is.
- **Decision**: `OPERATION_SECTIONS` in `scripts/docs-generate.js` holds the four sections, which
  render into every config-driven page between the filter list and the gotchas. Button labels are
  quoted exactly as the components render them — `Add Department` but `Create department`, because
  `crud-list` capitalises the singular and `crud-form` lowercases it. Each section ends with a
  one-line italic note naming the permission that hides its button, rather than a callout: four
  identical warning boxes on one page train the reader to skip all of them.
  Two manifest flags control the output. `listOnly: true` emits only the viewing section, for a
  screen that lists records and hands off to its own editor — SEO Pages is the current case.
  `operations: { create, read, update, delete }` replaces one section's body for a screen that
  genuinely differs.
- **Consequences**:
  - Photographing the `view` and `edit` routes exercised screens nothing had automated before, and
    **found a real bug on the Users edit form**: the single-record endpoints populate their
    relations, so the cascading state/city lookups were sent the whole referenced document instead
    of its id, failed their ObjectId cast, and left both dropdowns empty — a user's existing state
    and city were invisible and unchangeable. Fixed with a `refId` helper in `entities/advanced.jsx`,
    mirroring the one `crud-view.jsx` already had for the same reason.
  - **A change to the shared CRUD components can silently make every page wrong.** The generator
    describes behaviour it cannot see. The test asserts the button labels verbatim, so a renamed
    button fails the suite rather than shipping fifteen wrong pages.
  - The delete section states that deleting is a soft delete and suggests unticking Is Active as the
    alternative. That is true of every model through the soft-delete plugin; a collection that ever
    hard-deletes would need an `operations.delete` override.
  - The screenshot count grows from 44 to 116, and every one of them recaptures whenever the shared
    CRUD components, the theme or the fixture seed change. That is the cost of the pictures being
    trustworthy rather than decorative, paid in repository size and capture time.
  - Both themes' images are emitted for each view, but only the one matching the reader's active
    theme is shown — a CSS rule rather than a render-time choice, so a theme toggle swaps every
    picture on the page without re-rendering the markdown.
  - Article and casing are computed from the config's `singular`, which is title-cased for button
    text. "an SEO Page" and "a User" are both handled, and neither is general English — the helper
    covers the shapes an entity singular actually takes.
- **Deviates from convention**: no. Documentation-only change to a shipped module; `system-design`,
  `schema-design` and `api-endpoint` are skipped with reasons stated — no collection, no endpoints,
  no new screen.

### ADR-014 — The documentation section is styled with the panel's own design tokens

- **Date**: 2026-08-29
- **Status**: accepted
- **Supersedes**: [ADR-012](#adr-012--the-documentation-section-reproduces-material-for-mkdocs-visual-design-rather-than-the-panels)
- **Context**: ADR-012 reproduced Material for MkDocs faithfully — indigo palette,
  Roboto stack, 0.8rem metrics — at the user's instruction, and recorded the cost
  plainly: the section would not follow a rebrand, and it was a deliberate
  inconsistency with [40-frontend.md](../conventions/40-frontend.md).
  Seen in use, that cost was larger than the record made it sound. On a 1670px
  viewport the user reported text too small to read, a wide empty gutter down the
  right with the table of contents stranded from the prose it indexed, and — the
  complaint that recurred — the panel's 4rem header and Material's masthead
  reading as **two stacked headers**, costing most of a screen before any
  documentation appeared. The instruction that closed it was to style the section
  "like ourselves".
- **Options considered**:
  - _Keep Material, tune the metrics_ — tried first and rejected by the user.
    Raising the base size and the body cap fixed the readability and the gutter,
    but shrinking the masthead to a strip still left two bars: a shorter second
    header is still a second header.
  - _Keep Material, drop the panel header on this route_ — lost. That header
    carries the theme toggle, the profile menu and the mobile sidebar button;
    removing it strands the reader with no way out of the section.
  - _Rebuild on the panel's design tokens_ — won. It removes the second bar by
    removing the masthead, and it settles the palette question permanently rather
    than leaving two colour systems in one app.
- **Decision**: `documentation.css` is rewritten against the panel's semantic
  tokens — `--color-text-*`, `--color-bg-*`, `--color-border-*`, `--color-fg-*` —
  with no colour literals. The admonition types map onto the existing brand,
  success and warning surfaces, so a callout matches a badge elsewhere in the app.
  The masthead is gone: `Documentation.jsx` portals the page-list toggle and the
  search field into `#app-header-slot`, an empty slot the layout renders in its
  own header. A portal rather than a prop or a context — the layout owns the
  header, the screen owns those controls, and nothing else in the app needs to
  know either fact. The slot stays empty on every other screen.
  The Roboto webfont is removed from `index.html`; it existed only for this
  section, so every page now loads without a Google Fonts request.
  Two rendering bugs are fixed in the same pass, both of which had been shipping:
  - `list-style: disc` was being rewritten to `list-style: outside` by the build's
    CSS minifier, which sets only the position and leaves the type unset — so
    **every bullet in the documentation was invisible in production while correct
    in dev**. The `list-style-type` longhand cannot be rewritten that way.
  - A callout's last paragraph kept its own bottom margin, because the existing
    reset targeted the body wrapper's last child rather than the paragraph, so a
    single-paragraph admonition — nearly all of them — rendered with a stranded
    gap under its text.
- **Consequences**:
  - The section now follows a rebrand of the panel, which ADR-012 explicitly gave
    up. That was the single largest cost of the old approach.
  - It is no longer visually distinct. ADR-012 argued the distinctness was
    arguably a feature; in practice it read as a different application bolted into
    the sidebar, which is why this reverted.
  - **The deviation from `40-frontend.md` is closed.** The section is now an
    ordinary screen built from shared tokens, like every other one.
  - `#app-header-slot` is a new, small piece of layout API. Any future screen
    needing header controls should use it rather than adding a second bar — the
    mistake this ADR exists to undo.
  - The minifier's shorthand rewriting is a trap for any future `list-style`, and
    the same class of bug could bite another shorthand. A CSS rule verified in dev
    is not verified in the bundle.
  - `docs-capture.js` spawned its server and admin without a process group and
    shut down by signalling the child it held — which is the `npm` wrapper, not
    the `node` or `vite` process that actually binds the port. A failed run
    therefore orphaned a server on port 5055, and every later run hung waiting
    for a port it could never bind. Three runs were lost to this before it was
    diagnosed, each looking like a different failure. The children are now
    `detached` and shut down by signalling the group, and `SIGTERM` is handled
    alongside `exit` and `SIGINT`.
- **Deviates from convention**: no — it removes one. ADR-012's deviation from
  `40-frontend.md` is retired by this record.

### ADR-015 — Dynamic email triggers: a code registry over EmailFor, not a new collection

- **Date**: 2026-09-07
- **Status**: accepted
- **Context**: `docs/email-trigger-system.md` documented that "which email template fires for which
  form" is answered only by code today — the one real site, forgot-password OTP in
  `otp.controller.js`, hardcodes the literal string `"Forget Password"`, does an unsorted
  `EmailTemplate.findOne`, and fills two `{{TOKEN}}`s by hand. A second trigger today means
  copy-pasting all four steps. Reading it also surfaced a live bug: nothing stops two active
  `EmailTemplate` rows sharing one `EmailFor`, so the unsorted lookup already picks whichever Mongo
  returns first. `grill-me` worked the doc's five open questions plus one added scope question
  across three rounds; every answer taken was the recommended one (see `STATE.md` log, 2026-09-07).
- **Options considered**:
  - _A new `FormTrigger`/`Form` collection, separate from `EmailFor`_ — lost. `EmailFor` is already
    "the label for why an email is sent" — exactly what a trigger is. A second collection doubles the
    admin surface (two screens managing one relationship) for a distinction nothing in this repo
    needs yet.
  - _`triggerKey` as a free-text field, validated only for shape_ — lost. A typo creates a trigger
    that can never fire because no code calls that exact string, discovered only when an email
    silently never sends. A dropdown fed by the code registry makes that class of bug impossible.
  - _One trigger resolving to many templates (fan-out)_ — lost. The only named need — a visitor
    thank-you plus an internal notification from one submission — is met by firing two trigger keys
    from the same form event, not by teaching one trigger to resolve to a list. Keeps `EmailTemplate`
    unchanged.
  - _Merge fields declared in the database, admin-editable_ — lost. A merge field is tied to what a
    form collects in code; declaring it in code (where the `sendTriggeredEmail` call site already
    has to change to add the trigger) can't drift from what the form actually sends. DB-editable
    would drift the moment a developer changed a form's fields without remembering the admin screen.
  - _`sendTriggeredEmail` throws on a missing/inactive template, like `createOtp` does today_ — lost
    as the default. Right for a security-critical flow (forgot-password), wrong for a future public
    form, where a visitor's submission failing because an admin forgot to activate a template is a
    worse outcome than a silently-missing "thank you" email. The function itself never throws; each
    caller decides what a `{ sent: false }` result means for its own request.
- **Decision**:
  1. **`apps/server/config/emailTriggers.js`** — a frozen registry, the same shape as
     `widgetSources.js` (ADR-003): `triggerKey → { label, description, mergeFields }`. One entry to
     start, `password.forgot`. A new trigger is a registry entry plus a `sendTriggeredEmail` call
     site — no schema change.
  2. **`EmailFor` gains `triggerKey`**: required, unique (the existing soft-delete plugin gives it
     the same `isDeleted:false` partial index every other unique field gets), validated against the
     registry on create/update. Picked from a dropdown, never typed.
  3. **`GET /email-for/triggers`** (new route, `checkPermission("/email-for", "read")`, mirroring
     `GET /dashboard-widgets/sources`): returns the full registry, each entry flagged
     `claimedByEmailForId` (or `null`). One response serves two UI spots — the trigger dropdown on
     `EmailFor`'s form (hide/disable claimed entries except the record's own) and the merge-field
     hint on `EmailTemplate`'s form (look up the selected `EmailFor`'s `triggerKey` in the same
     payload) — rather than two endpoints.
  4. **At most one active `EmailTemplate` per `EmailFor`**: a partial unique index
     (`{ emailFor: 1 }`, `partialFilterExpression: { isActive: true, isDeleted: false }`) is the real
     constraint; a `findOne` pre-check in `emailTemplate.controller.js` gives the friendly 409,
     mirroring the duplicate-name check `emailFor.controller.js` already does.
  5. **Merge-field validation on `EmailTemplate` save**: `emailSubject` and `emailSignature` are
     scanned for `{{TOKEN}}` occurrences and checked against the trigger's declared list (resolved
     via the template's `emailFor` ref); an undeclared token blocks the save.
  6. **`apps/server/utils/sendTriggeredEmail.js`**: `fillMergeFields` and `validateMergeTokens` as
     pure, unit-testable functions (same split `widgetQuery.js` uses between pure logic and its
     DB-touching runner), plus the async `sendTriggeredEmail(triggerKey, { toEmail, mergeFields })`
     — resolves trigger → active `EmailFor` → active `EmailTemplate`, fills tokens, sends via the
     same nodemailer transporter logic `otp.controller.js` already has (gmail-vs-generic-SMTP
     branch, lifted unchanged), and never throws: returns `{ sent, reason }`, logging on a miss.
  7. **`otp.controller.js`'s `createOtp`** calls `sendTriggeredEmail("password.forgot", { toEmail,
     mergeFields: { USERNAME, OTP_CODE } })` instead of its inline lookup/replace/send block, and
     keeps its own current 404-on-miss behaviour by checking the returned `sent` flag — no change to
     what the caller experiences today.
  8. **No new consumer form.** This repo has no public website to submit one from; a real second
     trigger is future work once an actual form needs one (recorded in `PRD.md` out-of-scope).
- **Consequences**:
  - Adding the *next* trigger (once a real form exists) is a registry entry, one `EmailFor` row, one
    `EmailTemplate`, and one `sendTriggeredEmail` call — no new controller boilerplate.
  - `EmailFor`/`EmailTemplate` still aren't in `widgetSources.js` — pre-existing, not created by this
    module, and out of scope here (nobody has asked for trigger-firing stats). Flagged, not fixed.
  - The `createEmailFor`/`updateEmailFor`/`createEmailTemplate`/`updateEmailTemplate` controllers
    still don't use the repo's `allowOnlyFields`/express-validator chain — new validation is added in
    the same manual style already there rather than introducing a second validation mechanism into
    three files that don't have it.
  - A stored `EmailTemplate` whose registry entry changes underneath it (a merge field renamed or
    removed in code) is not re-validated retroactively — only re-checked the next time it's saved.
    Same accepted trade-off ADR-003 made for stale widgets.
- **Deviates from convention**: no. No new collection, no new public route, no new dependency; the
  registry, partial-index-uniqueness and manual-validation patterns all follow existing precedent.
- **As built**: as decided, plus one addition found while wiring the UI — the registry grew a second
  entry, `password.reset` (fired from `resetPassword` on a successful change, best-effort: a missing
  template there only logs, since the reset already succeeded and the email is a courtesy, not the
  point of the request, unlike `password.forgot`). `npm test` (10 suites, including
  `sendTriggeredEmail.test.js`) and `npm run build` pass. Verified live against the dev database in
  `apps/server/.env`: the OTP send actually delivers through the trigger path end to end; the 400
  undeclared-merge-token rejection (INV-6) and the 409 duplicate-active-template rejection (INV-5)
  both confirmed with their exact messages; the already-claimed-trigger 400 confirmed; the trigger
  dropdown and the merge-field hint both confirmed working for a non-admin role, in both themes.
  Verify surfaced a pre-existing, unrelated bug — duplicate `MenuMaster` rows for several screens
  including `/email-for` and `/email-template` — that made checking the non-admin path harder but is
  not caused by or specific to this module; recorded in `OPEN-QUESTIONS.md` rather than fixed here.

---

### ADR-016 — HRMS for Apidel: idiomatic rebuild, not a literal Frappe port; multi-company, per-screen scoping

- **Date**: 2026-09-10
- **Status**: accepted
- **Context**: `docs/knowledge/input/hrms/` arrived as a full reverse-engineering of Frappe HRMS —
  156 doctypes across 10 modules, documented at two depths: `HRMS-Obsidian-Vault/` (narrative, why
  things are shaped this way) and `HRMS-Port-Spec/` (mechanical, field-by-field build spec). The
  mechanical spec assumes Frappe framework primitives this starter does not have: a generic
  Draft→Submit→Cancel→Amend document lifecycle on ~40 doctypes, naming-series document numbering, a
  background job scheduler (`60-limits.md` says explicitly this starter has none), a real
  double-entry accounting engine (Journal Entry/Payment Entry/GL Entry) that Expense Claim and
  Payroll post to, and a `Company`/`Branch` model Frappe treats as external (core ERPNext) and this
  spec deliberately does not document. Building all of that as new framework-wide infrastructure
  before any HR screen exists would dwarf the HR feature work itself — a scope decision, not
  something to pick silently (AGENTS.md rule 9). `grill-me` worked this as the first round of the
  frontier (see `STATE.md` log, 2026-09-10); every answer taken was the recommended one except
  multi-company (user chose the bigger option) and the public job board (user chose "needed").
- **Options considered**:
  - _Faithful port — reproduce Frappe's own mechanics as new starter-wide infrastructure_ — lost.
    A generic submit/cancel/amend engine, naming-series numbering, a job scheduler, and (if Payroll
    must post to a ledger) a GL layer are each their own multi-week framework project, before module
    1 of ~17 even starts. Right choice only if Apidel needs Frappe-grade auditability (immutable
    submitted documents, full amend history) as a hard requirement — not stated.
  - _Idiomatic rebuild — same business capability, this starter's existing patterns_ — won. Status
    fields (per module, illegal transitions named in that module's own `RULES.md` entry) instead of
    docstatus; background jobs added only where a feature cannot work without one (auto-attendance,
    leave accrual/expiry/encashment — three, not the full scheduler-events list); no GL — Payroll and
    Expenses track a payment status/amount/date, not debits and credits.
  - _Multi-tenancy — single company vs. multiple_ — user chose multiple. `Company` and `Branch`
    become first-class models built here (nothing else in this codebase supplies them), and every
    role below System Manager is confined to their own company by default (company as a scoping
    dimension alongside self/approver/all).
  - _Data scoping — keep ADR-002's one-value-per-role, or extend to per-screen_ — extend, won. A
    single `dataScope` cannot give Employee "self-only on Leave" and HR User "all-within-company on
    the same screen" at once; `60-limits.md` already names this as the expected retrofit path. Design
    of the extended mechanism itself belongs to whichever module first needs approver-scoping
    (Leaves, most likely) — not decided in this ADR, only that it must happen.
  - _Public job board — in or out_ — user chose in. Goes through the starter's existing public-router
    four-question gate (`30-api.md`) when the Recruitment module is built; not built yet.
- **Decision**: Recorded as PRD.md scope decisions 1–6 (idiomatic rebuild, multi-company, company
  confinement, per-screen scoping, public job board, single-language/default-retention). Module list
  and build order recorded in `STATE.md`, derived from `HRMS-Port-Spec/02-Cross-Cutting/Build
  Order.md`'s dependency reasoning but split into ~17 build-one-at-a-time modules instead of that
  spec's 9 coarse stages, and reordered to put `Company`/`Branch` before HR Setup (that spec assumes
  they pre-exist; here they don't).
- **Consequences**:
  - Every module's own `system-design` pass still has to name its status field and illegal
    transitions — this ADR sets the *pattern* (idiomatic, not docstatus), not each module's specifics.
  - Frappe-source field tables, validation rules and calculation pseudocode in
    `HRMS-Port-Spec/01-Modules/*/*.md` remain the right reference for *business logic* (what a payslip
    computes, when a leave application is invalid) — only the framework-mechanics layer around them
    (submit/cancel, naming series, GL posting) is being replaced.
  - Payment reconciliation for Expense Claim/Payroll without a GL is an open design question for
    whichever module reaches it first (see `OPEN-QUESTIONS.md`).
  - Per-screen scoping's exact mechanism (where the company/self/approver dimension lives, how
    `checkPermission`/`buildScopeFilter` change) is an open `system-design` question for the first
    module that needs approver-scoping — see `OPEN-QUESTIONS.md`.
- **Deviates from convention**: yes — extends ADR-002's scoping model (per-role → per-screen) and adds
  a `Company`/`Branch` layer the starter's `60-limits.md` explicitly says does not exist
  ("no multi-tenancy... day one or never"). Approved here as the day-one exception `60-limits.md`
  anticipates for question 1 of *Decide before you build*.
- **As built**: not yet — this ADR covers the grilling/scoping decision only; no code written.

