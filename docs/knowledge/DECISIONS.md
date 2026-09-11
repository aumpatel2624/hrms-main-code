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

---

### ADR-017 — Organization Setup: Company/Branch (new), Department (extended), Designation/Employment Type/Employee Grade (new); HR Settings deferred

- **Date**: 2026-09-10
- **Status**: accepted
- **Context**: `system-design` for HRMS module 1 (Organization Setup). User is offline overnight
  ("continuously run the pipeline... using sub-agents"); this ADR is being written and self-approved
  under that standing authorization rather than reviewed live — see the STATE.md log entry for the
  git/environment bootstrap done alongside it. Read `docs/conventions/20-schema.md`/`30-api.md` and
  the existing `Department` model/controller/routes/entity-config as the template, per AGENTS.md rule
  2 ("reuse before you write") — and found more to reuse than expected:
  - **`Department` already exists** as one of the starter's 13 seeded demo CRUD screens
    (`apps/server/models/Department.js`, flat `departmentName`/`departmentCode`/`isActive`, no
    company concept, six fictional rows in `seed/fixtures.js`). HR-Setup's own `_Overview.md` in the
    input spec confirms Department is core-ERPNext-shaped, not HRMS-authored — extending the
    starter's own generic Department is the intended kind of reuse, not a coincidence to route around.
  - **`RoleMaster` + `UserRoles`** already implement exactly the named-role-with-a-permission-matrix
    shape the 7 HRMS roles need (Employee, HR User, HR Manager, Leave Approver, Expense Approver,
    Interviewer — `System Manager` maps to this starter's existing `ADMIN` coarse role, which already
    bypasses the matrix, so it gets no `RoleMaster` row). No new Role model.
  - **`SeoSettings`** is the existing singleton-via-unique-`key` pattern any future `HRSettings`
    singleton should copy.
  - `Department`'s existing controller has the exact `isOk: true` + 400 bug `30-api.md` calls out by
    name as something to fix, not copy — fixed while the file is touched anyway.
  - `seed/fixtures.js` is explicitly throwaway/fictional (screenshot-capture only, guarded to a
    separate `*-docs-fixtures` database) — real Apidel org data does not belong there. It belongs in
    the idempotent `seed/index.js`, upserted by natural key, same as the menu tree and admin user.
- **Options considered**:
  - _New `HrDepartment` collection instead of extending `Department`_ — lost. Would be a second
    version of exactly the thing `Department` already is (list, filter, delete-guard, form, menu row)
    — the AGENTS.md rule 2 violation named explicitly.
  - _Company-scope every new master (Employment Type, Employee Grade) for symmetry_ — lost.
    Frappe's own source doesn't scope these per company (they're shared vocabulary across a company
    group), and with one company today the distinction is unobservable either way — kept as plain
    global masters, like this starter's existing `Country`/`CurrencyMaster`. Reconsider if Apidel
    later says different entities need different Employment Types per company.
  - _Build `HRSettings` now, seeded empty_ — lost. Its fields (self-approval rules, backdating
    limits, shift/attendance toggles, hiring notifications) all belong to modules that don't exist
    yet (Leaves, Expenses, Shift & Attendance, Recruitment) — an empty settings screen with nothing
    to configure is speculative infrastructure. Deferred: each later module adds the `HRSettings`
    fields it actually needs, creating the singleton on first use via the `SeoSettings` pattern.
  - _Design the full per-screen/per-company scoping mechanism now (ADR-016 DEV-2, `OPEN-QUESTIONS.md`
    Q-4)_ — lost, for this module specifically. Every Organization Setup entity is a top-of-hierarchy
    master (Company/Branch/Department/Designation/Employment Type/Employee Grade) with no per-employee
    ownership, reachable only by HR User/HR Manager/System Manager — the existing per-*role*
    `dataScope` (`all`, ADR-002) is sufficient here, and with exactly one seeded Company the
    distinction is unobservable regardless. Real design work on the mechanism itself is deferred to
    Employee Records (module 2), the first module with genuinely per-employee, self-service data.
  - _Give Branch a full Country/State/City address_ — lost. Org-chart data is a location label
    ("Vadodara", "USA", "Guyana"), not a structured address; a plain `branchName` matches what exists
    and avoids modelling geography nobody asked for.
- **Decision**:
  1. **`Company`** (new): `companyName` (required, trim, globally unique), `companyCode` (optional,
     trim, globally unique when present), `isActive`. One placeholder row seeded: "Apidel" (real
     multi-company names deferred — user chose placeholder-for-now during grilling).
  2. **`Branch`** (new): `branchName` (required, trim), `companyId` (ref `Company`, required,
     indexed), `isActive`; `branchName` unique per `companyId`. Seeded from the 12 distinct locations
     in `apidel-org-chart.csv`.
  3. **`Department`** (extended, not replaced): add `companyId` (ref `Company`, required, indexed).
     Re-scope `departmentCode`/`departmentName` uniqueness from global to per-`companyId` (fixing the
     pre-existing gap where neither was a real unique index — `20-schema.md`'s named example of what
     the starter gets wrong). Backfill script assigns the 6 existing fixture-seeded rows (and any
     other pre-existing rows) to the placeholder Company. Seed the real 23 normalized department names
     from `apidel-org-chart.csv` (`DOMAIN.md` HRMS spine entities has the two normalization decisions)
     as additional rows under the same Company — the 6 fictional starter-demo rows are left alone,
     not deleted, since `User.departmentId` still references them and they cost nothing to keep.
     Fix the `isOk: true`-on-400 bug in the same commit (touching the file anyway; unrelated-but-found
     bugs get their own commit per `git-flow`).
  4. **`Designation`** (new): `designationName` (required, trim), `companyId` (ref `Company`,
     required, indexed), `isActive`; unique per `companyId`. Seeded from the 29 designations in the
     CSV. (Frappe's `appraisal_template`/`skills` fields on Designation are Performance/Skills-module
     concerns — added when those modules are built, not now.)
  5. **`EmploymentType`** (new): `employmentTypeName` (required, trim, globally unique), `isActive`.
     Not seeded from real data — the org-chart CSV has no employment-type column; seed a small
     reasonable starter set (Full-time, Part-time, Contract, Intern) the client can edit.
  6. **`EmployeeGrade`** (new): `gradeName` (required, trim, globally unique), `isActive`. No
     `defaultSalaryStructure` field yet — `SalaryStructure` doesn't exist until the Payroll module;
     added there as a schema change to this model, not modelled speculatively now.
  7. **`HRSettings`**: deferred (see Options above) — no model this module.
  8. **Roles**: seed `RoleMaster` rows for the 6 non-admin HRMS roles (Employee, HR User, HR Manager,
     Leave Approver, Expense Approver, Interviewer) with matching `UserRoles` matrix documents. This
     module's screens (Company/Branch/Department/Designation/Employment Type/Employee Grade) grant
     full `read/write/edit/delete` to HR User and HR Manager only — the other four roles have no
     business reason to touch org-structure masters and get no matrix row for these menus (fails
     closed to "no access", the existing default). `System Manager` = `ADMIN`, already unrestricted.
  9. **Menu**: new "HR Setup" menu group (Company, Branch, Department, Designation, Employment Type,
     Employee Grade) in `seed/index.js`'s `MENU_GROUPS`, reusing `Department`'s existing menu row.
  10. **Reporting**: `widgetSources.js` gets an entry each for `companies`, `branches`, `departments`
      (updated — now has `companyId` groupable-with-lookup), `designations`, `employment-types`,
      `employee-grades` — `groupable` only (headcount-by-department style breakdowns once Employee
      exists in module 2); no `aggregatable` numeric fields on pure masters.
- **Consequences**:
  - Every later HRMS module's `Employee`-linked model foreign-keys to `Company` (directly or via
    `Department`/`Branch`) — this module is the one everything else in the 17-module list depends on,
    matching the dependency graph in `HRMS-Port-Spec/02-Cross-Cutting/Build Order.md`.
  - `Department`'s uniqueness re-scope is a live schema change on an existing collection — needs the
    backfill script per `20-schema.md`, and `seed/fixtures.js`'s `Department.create()` call needs its
    own throwaway `companyId` (a fixture-local Company row) or it breaks `npm run docs`.
  - The per-screen/company scoping mechanism itself (ADR-016 DEV-2) is still an open question — this
    module does not answer it, only avoids needing the answer yet. `OPEN-QUESTIONS.md` Q-4 stays open.
- **Deviates from convention**: extends an existing starter demo screen's schema and re-scopes its
  uniqueness — a live migration on shipped starter code, not just an addition. Covered by ADR-016's
  standing multi-company approval; no separate user confirmation obtained (overnight/autonomous).
- **As built**: shipped as decided, with four deviations worth recording:
  1. **`departmentCode` changed from required to optional**, not left required as the original
     Department model had it. The real Apidel org-chart data has no code concept at all for any of
     its 24 real departments — requiring one would mean inventing fake codes. Uniqueness (per
     company) still applies whenever one is actually given.
  2. **No `sparse` index anywhere.** `Company.companyCode` and `Department.departmentCode` (both
     optional-but-unique-when-present) cannot use `{ unique: true, sparse: true }` — the soft-delete
     plugin (`models/softDelete.js`) merges its own `partialFilterExpression: { isDeleted: false }`
     into every `unique: true` index, and MongoDB rejects mixing `sparse` with
     `partialFilterExpression` on the same index (`CannotCreateIndex`, confirmed by actually running
     `npm run seed` and reading the error, not by inspection). Fixed with a custom
     `partialFilterExpression: { <field>: { $type: "string" } }` instead, which the plugin's spread
     merges `isDeleted: false` into cleanly. Worth a line in `20-schema.md`'s indexes section if this
     starter grows a second optional-unique field — not added there in this module, flagged here.
  3. **Backfill lives as functions inside `seed/index.js`'s `run()`**, not as a separate script under
     `seed/`, contradicting this ADR's own plan and the `20-schema.md` prose about a standalone
     backfill file. Found the *actual* established convention only after reading
     `backfillEmailForTriggerKeys`/`dedupeActiveEmailTemplates` in full — this repo already backfills
     exactly this way (ADR-015), and matching that beats introducing a second pattern.
  4. **`scripts/docs-fingerprint.test.js` needed real edits**, not just `docs-src/manifest.js`: it
     hardcoded `extractConfig(uniform, "departmentConfig")` as a fixture for the extractor's own
     regression tests, three separate places. Moving `departmentConfig` to `advanced.jsx` (needed for
     its new `companyId` lookup) broke all three at `npm test` time. Fixed by swapping the first
     block's fixture to `companyConfig` (same uniform-tier shape) and pointing the other two at
     `advanced` instead of `uniform` — caught by actually running `npm test`, not by reasoning about
     the change in advance.
  Not done this session, flagged rather than silently skipped: `npm run docs` (the actual Playwright
  screenshot capture) was not run — `docs-src/manifest.js` entries exist and the fingerprint test
  passes, but no screenshots were generated. `CHECKLISTS.md` records this as open.
  Verification actually run, not just written: `npm test` (10/10), `npm run seed` run twice against
  the real dev database confirming idempotency (identical document counts both times: 1 company, 12
  branches, 24 departments, 29 designations, 4 employment types, 0 employee grades, 6 roles, 6
  matrix documents, 26 menus), `npm run dev` booted and exercised live over HTTP with a real cookie
  session — admin login, Company/Branch create, the 409 delete-guard (Company referenced by a live
  Branch), Department's `companyId` requirement (400 without, 201 with), and the permission matrix
  itself: a throwaway HR User account got 200/201 on every new route, a throwaway Employee account
  got 403 on the same routes but 200 on the matrix-free dropdown GET — then all throwaway data
  (2 users, 2 extra companies, 1 branch, 1 department) deleted, collection counts confirmed back to
  the seeded baseline. `npm run build` green throughout.

---

### ADR-018 — Employee Records: Employee core model + Employee Health Insurance; three sibling doctypes rescoped to the modules that actually consume them

- **Date**: 2026-09-10
- **Status**: accepted
- **Context**: `system-design` for HRMS module 2, written and self-approved under the same standing
  overnight/autonomous authorization as ADR-017 (module 1's implementation fork finished clean —
  10/10 tests, idempotent seed x2, live-HTTP matrix checks, `npm run build` green — reviewed before
  starting this one). Read `HRMS-Port-Spec/02-Cross-Cutting/Employee Core Model.md` (already read
  during grilling) plus, newly, the four `HR-Core` per-doctype files this module's original STATE.md
  scope named: `Employee Property History.md`, `Employee Health Insurance.md`,
  `Identification Document Type.md`, `Department Approver.md`.
- **Scope correction from the original STATE.md module list**: three of the four sibling doctypes
  named in module 2's original one-line description don't belong here — this is exactly the "first
  module teaches you things that change the rest" case AGENTS.md warns about, so the module list is
  being corrected now rather than building orphaned infrastructure to match a rough Day-1 sketch:
  - **Employee Property History** is a pure diff-log child table with **no independent existence** —
    its only writers are `Employee Promotion`/`Employee Transfer.on_submit`/`on_cancel`
    (`update_employee_work_history`), both in module 5 (Employee Career Events), which doesn't exist
    yet. Building it now means a collection nothing writes to. **Moved to module 5.**
  - **Identification Document Type** is a one-field master whose only named consumer is
    `Travel Request.personal_id_type` (module 6, Travel) — Employee's own identification-document
    fields are ERPNext-core and explicitly out of this spec's traced scope. **Moved to module 6.**
  - **Department Approver** is the schema (three approver-list child tables on `Department`) behind
    the `get_approvers` fallback query — but that query is only ever called from Leave
    Application/Expense Claim/Shift Request (modules 8, 16, and part of 9), and designing it in
    isolation risks getting the shape wrong before `OPEN-QUESTIONS.md` Q-4 (the per-screen/company
    scoping mechanism itself) is actually designed. **Moved to module 8 (Leaves)**, the first and
    largest consumer, where Q-4 gets answered for real.
  - **Employee Health Insurance stays** — genuinely self-contained (a lookup master plus two Employee
    fields, per Employee Core Model Part A), no dependency on anything unbuilt.
  - `STATE.md`'s module 2 row description is being corrected in the same commit as this ADR.
- **Options considered**:
  - _Build all four as originally scoped, to match the Day-1 module list_ — lost. That list was
    written before any per-doctype detail was read (grill-me round, deliberately shallow at that
    depth) — treating it as fixed now would be cargo-culting a rough sketch over what the actual
    source dependencies say. AGENTS.md explicitly expects module boundaries to move as building
    teaches you things.
  - _Bulk-create a `User` login account for all 195 seeded employees_ — lost. That means generating
    195 real people's login credentials without their knowledge or consent — a real-world problem,
    not just a technical one, and out of proportion to what this module needs to prove. `Employee`
    gets an optional, nullable `userId` (ref `User`) — schema-ready for self-service, seeded as
    `null` for every real employee. Provisioning a specific person's login is a deliberate future
    action (a module or a button), not a bulk seed step.
  - _Require `employmentTypeId`/`gradeId` on Employee, defaulted to a guess_ — lost. The org-chart CSV
    has no employment-type or grade data per employee; forcing a value means inventing HR
    classification facts about real people with no source for them. Both fields are optional/unseeded
    (`null`) — visibly incomplete rather than silently wrong. `companyId`/`departmentId`/
    `designationId`/`branchId` ARE required — the CSV has real data for all 195 rows on all four.
  - _Model the CSV's `shift` (Day/Night/UK) and `work_mode` (WFO/WFH) columns by building the Shift &
    Attendance module's `ShiftType`/`ShiftAssignment` early_ — lost, but the real data is too good to
    drop. Kept as two plain descriptive fields on Employee (`shiftPreference` enum-ish string,
    `workMode` enum `WFO`/`WFH`) — explicitly documented in `DOMAIN.md` as a placeholder superseded by
    real `ShiftAssignment` once module 9 (Shift & Attendance) is built, not a preview of that module's
    design.
  - _Naming-series-style employee codes (`HR-EMP-2026-00001`)_ — lost, per ADR-016's idiomatic-rebuild
    decision (no naming-series engine). The real org-chart data already has real employee codes
    (`A005`, `U001`, ...) — used directly as `employeeCode`, globally unique, instead of inventing a
    new numbering scheme for data that already has one.
- **Decision**:
  1. **`Employee`** (new): `employeeCode` (required, trim, globally unique — real CSV codes, e.g.
     `A005`), `employeeName` (required, trim — Employee's own name, independent of any linked login
     account), `userId` (ref `User`, optional, unique when set, null for every seeded row per above),
     `companyId`/`departmentId`/`designationId`/`branchId` (all ref, all required — CSV has complete
     data for all 195 rows on all four), `reportsToId` (ref `Employee`, self-referential, optional —
     null only for the 2 top-of-hierarchy rows), `status` (enum `Active`/`Inactive`/`Suspended`/
     `Left`, default `Active`), `dateOfJoining` (required date, from CSV), `relievingDate` (optional
     date, null — set later by the Separation module), `gender` (optional enum, from CSV where
     present), `dateOfBirth` (optional date, not in CSV, kept for future manual entry),
     `employmentTypeId`/`gradeId` (both ref, both optional/unseeded per above),
     `expenseApproverId`/`leaveApproverId`/`shiftRequestApproverId` (all ref `User`, all optional,
     unseeded — the fields exist now per Employee Core Model Part A so Leaves/Expenses/Shift-Request
     don't need a later Employee schema change, but the scoping *mechanism* that reads them is still
     `OPEN-QUESTIONS.md` Q-4, unresolved), `healthInsuranceProviderId` (ref `EmployeeHealthInsurance`,
     optional), `healthInsuranceNo` (optional string, `depends_on` pattern from source — only
     meaningful once a provider is set), `shiftPreference` (optional string enum `Day`/`Night`/`UK`,
     placeholder per Options above), `workMode` (optional enum `WFO`/`WFH`), `isActive`.
  2. **`EmployeeHealthInsurance`** (new): `providerName` (required, trim, globally unique — e.g.
     "Aetna"), `isActive`. Matches source permissions exactly: HR Manager full CRUD, HR User
     read-only (no write/create/delete matrix row) — the one doctype in this spec so far with an
     asymmetric HR User/HR Manager split; most Organization Setup masters gave both full access.
  3. **Seed**: real `Employee` rows from `apidel-org-chart.csv` (195 rows) — two-pass insert
     (confirmed clean data: 195 unique names, zero manager-name collisions, every `manager_name`
     resolves to another row in the same file, only 2 rows with no manager) so `reportsToId` resolves
     correctly on the second pass. `departmentId`/`designationId`/`branchId` resolved against the
     Organization Setup rows seeded in module 1 (same normalized names — reuse that lookup, don't
     re-normalize). `EmployeeHealthInsurance`: seed a small reasonable starter set (not sourced from
     the CSV — it has no insurance data) the client can edit, same pattern as Employment Type in
     ADR-017.
  4. **Roles/permissions**: extend the `UserRoles` matrix seeded in module 1 — HR User and HR Manager
     get full access to the new Employee and Employee Health Insurance screens (Employee Health
     Insurance: HR User read-only, per source, per point 2). The other four roles get no matrix row
     for these screens in this module — `Employee` (the role)'s own self-only access to *their own*
     Employee record is part of the still-open per-screen scoping mechanism (Q-4), not this module.
  5. **Menu**: add Employee and Employee Health Insurance to the "HR Setup" menu group created in
     module 1 (or a new "HR Core" group if "HR Setup" reads wrong for a transactional-feeling
     screen like Employee — implementer's call, note which was chosen).
  6. **Reporting**: `widgetSources.js` entries for `employees` (groupable by `companyId`,
     `departmentId`, `designationId`, `status`, each with a lookup; `dateFields`: `dateOfJoining` —
     headcount-over-time becomes buildable) and `employee-health-insurances` (groupable only, no
     aggregatable fields on either — headcount is a count-of-records stat, no numeric field to sum).
- **Consequences**:
  - Every later module's per-employee doctypes now have a real `Employee` collection to foreign-key
    to — this was the actual point of putting Organization Setup before this module and this module
    before everything else, per the dependency graph.
  - `STATE.md`'s module 3 onward descriptions are unaffected by the module-2 scope correction except
    where they already expected to depend on Property History/ID Document Type/Department Approver —
    module 5, 6 and 8's descriptions get a one-line note that those doctypes arrive with them now,
    not from module 2.
  - `employeeCode` uniqueness is global, not per-company (unlike Department/Designation/Branch in
    module 1) — matches Frappe's own single global `name` namespace; revisit only if Apidel says two
    different companies can legitimately reuse the same employee code.
- **Deviates from convention**: none beyond what ADR-016/ADR-017 already cover (Company-scoped refs,
  no naming series). No new deviation from `docs/conventions/` introduced by this module itself.
- **As built**: as decided, plus what building surfaced:
  - The org-chart CSV turned out to have Windows (`\r\n`) line endings (Python's `csv.writer`
    default) — the seed's minimal CSV parser split only on `\n`, so the last column's header
    (`gender`) carried a trailing `\r` and never matched during lookup. Every seeded employee had
    `gender: null` on the first `npm run seed` run despite the CSV having real values for all 195
    rows. Found by spot-checking three known employees against the raw CSV after seeding — the
    create/update counts alone (195 created, 193 reports-to links resolved) looked completely
    correct and would not have surfaced this. Fixed by normalizing line endings before splitting;
    re-verified against the same three rows plus a full `gender` distribution count (112 Male / 83
    Female / 0 null, sums to 195).
  - `EmployeeHealthInsurance` CRUD folded into the existing `organizationSetup.controller.js`/
    `.routes.js` (grouped-masters file from module 1) rather than a new file — genuinely the same
    shape as `EmploymentType`/`EmployeeGrade`, and `Employee` itself was substantial enough to
    justify its own `employee.controller.js`/`.routes.js` as planned.
  - Menu placement: put Employee and Employee Health Insurance in a new "HR Core" group, separate
    from module 1's "HR Setup" — Employee is the actual employee master, not configuration, and
    crowding it into HR Setup would have made that group read as "everything HR" rather than "the
    masters you configure once."
  - Verify results: `npm test` 10/10 green throughout. `npm run seed` run twice against the real dev
    DB — first run: 195 created, 193 reports-to links (matches 195 minus the 2 top-of-hierarchy
    rows with no manager); second run: 0 created / 195 updated, same 193 links — idempotent. Spot
    checks: Hemant Patel/Amita Patel (the 2 top-of-hierarchy rows) confirmed `reportsToId: null`;
    date parsing confirmed correct (`2-Aug-12` → `2012-08-02`, `7-Apr-14` → `2014-04-07`). Live HTTP
    verify (throwaway HR User and Employee-role accounts, throwaway Country/State/City since none
    were seeded in this dev DB for the starter's own generic `User` model — all deleted afterward,
    idempotent pre-cleanup added to the verify script after an early run's failure skipped its own
    cleanup): missing-required-fields create → 400; valid create → 201; **deleting a Department that
    now has an Employee correctly 409s** — the cross-module regression check, confirming
    `getReferencingCounts` picked up Employee's new `departmentId` ref with no registration needed;
    HR User read-only on Employee Health Insurance confirmed (200 GET, 403 POST); Employee-role
    correctly 403'd on both new screens' search endpoints and correctly allowed through the
    matrix-free dropdown `GET /employees`. All throwaway data cleaned up; Employee count back to 195.
    `npm run build` green. `npm run docs` (Playwright screenshot capture) was not run — manifest
    entries added and `npm test`'s fingerprint check passes, but no screenshots exist yet for these
    two screens, same gap module 1 left.
  - Not done, flagged for later: `Employee.userId` self-service linking has no UI action yet (create
    a `User` for a specific `Employee`) — schema-ready, deliberately not built this module.

---

### ADR-019 — Recruitment: hiring funnel without docstatus/naming-series/scheduler fidelity; a narrow public listing, not a public apply form

- **Date**: 2026-09-10
- **Status**: accepted
- **Context**: `system-design` for HRMS module 3, same standing overnight authorization as ADR-017/018
  (both implementation forks finished clean, reviewed before starting this one). Read the six
  substantial `HRMS-Port-Spec/01-Modules/Recruitment/` files (Job Requisition, Job Opening, Job
  Applicant, Interview, Interview Feedback, Job Offer) in full; the simpler child-table/master
  doctypes (Interview Type, Interviewer, Interview Detail, Job Offer Term, Job Offer Term Template,
  Job Applicant Source, Job Opening Template) were not read in the same depth — left to the
  implementation fork, they're simple enough not to need pre-digestion.
- **The scope cut, and why it's large**: this is the first module where Frappe's framework-fidelity
  machinery (docstatus, naming series, the scheduler, Kanban, print/letterhead, telemetry) shows up
  in force on doctypes that are actually interesting (Interview, Interview Feedback and Job Offer are
  all `is_submittable`). ADR-016 already decided against reproducing that layer; this ADR is where
  that decision actually bites for the first time, so it's spelled out doctype by doctype rather than
  asserted once:
  - **No docstatus on Interview / Interview Feedback / Job Offer.** Each keeps its own `status` Select
    (which source already treats as the real, independent state machine) and drops the separate
    Draft/Submitted/Cancelled/Amended axis entirely — there is no `amended_from` chain, no "submit"
    action distinct from just setting status. Where source uses `on_submit` to trigger a side effect
    (e.g. Job Offer's `on_change` syncing Job Applicant status), the equivalent status-field write
    triggers it instead.
  - **No naming series** (`HR-HIREQ-`, `HR-OPN-.YYYY.-.####`, etc.) — Mongo `_id` is the identity;
    no separate human-readable code is manufactured for doctypes with no real data to seed (unlike
    `Employee.employeeCode`, which had real codes worth preserving).
  - **No scheduled jobs**: `close_expired_job_openings` (daily), `send_interview_reminder` (~every 4
    min), `send_daily_feedback_reminder` (daily) are all dropped, per ADR-016 ("background jobs only
    where a feature genuinely cannot work without one" — none of these three qualify; reminders are a
    nice-to-have notification, and an expired-but-still-"Open"-flagged posting is solved without a
    job at all, see point 3 below). Not a gap to silently paper over: real, named, deferred.
  - **No Kanban board, no print/letterhead/Print Heading fields, no Terms-and-Conditions template
    link, no telemetry** — Desk-UI sugar or accounting/print concepts this starter doesn't have
    equivalents for and nothing here needs.
  - **Staffing Plan-gated vacancy checks are skipped, not simplified** — `Staffing Plan`/`Staffing
    Plan Detail` don't exist yet (module 5, Employee Career Events per the corrected STATE.md order).
    `Job Opening.validate_current_vacancies` and `Job Offer.validate_vacancies` are both real business
    rules worth having eventually, but building them against a Staffing Plan that doesn't exist would
    mean either stubbing a fake dependency or inventing a different vacancy model now and re-doing it
    when module 5 lands. Deferred as a named follow-up on both doctypes, not dropped as a feature.
  - **`Job Applicant.source == "Employee Referral"` sync is skipped** — `Employee Referral` is module
    5 too. `Job Applicant Source` (the plain master) is still built; the specific referral-status-sync
    behavior is deferred alongside Staffing Plan.
  - **Interview Feedback's `Skill Assessment` child table is dropped for now** — `Skill` (the master
    it references) is module 6 (Training & Skills). `feedback` (free text) + `result` (Cleared/
    Rejected) + `interviewer` stay; the structured per-skill rating table and its average-rating
    rescaling arrive when `Skill` exists. `average_rating`-on-the-parent-Interview logic (averaging
    across interviewers) is dropped with it for the same reason — nothing to average yet.
- **The one genuinely open call: the public job board is a listing, not an apply form.** User said
  "yes, needed" to a public job board during grilling (round 1). `30-api.md`'s public-endpoint gate
  requires (criterion 2) that a public route be "resolve-by-key, never a listing" — a job board is
  *inherently* a listing by nature, which is a real tension with that gate, not an oversight to route
  around quietly:
  - **Building anyway, as its own deliberate exception**: the data really is meant to be public
    (published, open postings only), field-allowlisted in the response (never a raw Mongo document),
    filter keys hardcoded to a small allowlist (company/department/employmentType/location) — the
    same spirit as the SEO public router (ADR-004), applied to a shape SEO never needed (a paginated,
    filtered catalog instead of resolve-by-path). Built as its own narrow, bespoke read path under
    `/api/v1/public/jobs`, NOT on top of `runListQuery`/the generic `filterable` mechanism — that
    mechanism's trust boundary is built for authenticated internal screens; reusing it for an
    anonymous, unauthenticated caller is a wider attack surface than this needs. `status="Open"` and
    `publish=true` are hardcoded server-side, never client-supplied.
  - **NOT building the public apply flow (anonymous Job Applicant creation) this module.** This is
    where I'm stopping short of what "public job board" could mean, deliberately: an anonymous write
    endpoint is a real new attack surface (spam applications, résumé-upload abuse), and `60-limits.md`
    is explicit that this starter has **no HTTP rate limiting at all** — "before exposing anything to
    the internet — especially a new public route" is exactly the moment that limit says to stop and
    decide, not improvise past. Recorded in `OPEN-QUESTIONS.md` rather than built silently overnight;
    Job Applicant records are created/managed by HR through the normal authenticated admin screen in
    this module (a realistic path too — HR receiving résumés by email and entering candidates
    manually is completely normal, not a workaround).
  - **`close_expired_job_openings`'s daily job, dropped per point above, is replaced by a read-time
    computation**, not silently lost: the public listing query filters `status = "Open" AND (closesOn
    is null OR closesOn >= today)` directly, so an expired-but-not-yet-flipped posting never shows up
    publicly regardless of whether anything ever flips its stored `status` to `Closed`. The internal
    admin list can still show the stored `status` as-is (HR sees "Open" until they close it or the
    date passes) — this is a deliberate small behavioral difference from source (which does flip the
    stored field via the daily job) traded for not needing a scheduler.
- **What's still real and being built, not cut**: Job Requisition → Job Opening → Job Applicant →
  Interview (+ Interview Type, Interview Detail) → Interview Feedback → Job Offer (+ Job Offer Term,
  Job Offer Term Template), Job Applicant Source, and the actual cross-doctype logic that makes this a
  funnel rather than five unrelated CRUD screens: `make_job_opening` (Requisition → Opening),
  closed-opening / duplicate-application guards on Job Applicant creation, `validate_designation` and
  duplicate-interview guards on Interview, `validate_interviewer`/interview-date/duplicate-feedback
  guards plus average-rating calc on Interview Feedback, duplicate-offer-per-applicant guard and
  applicant-status-sync-on-offer-status-change on Job Offer, and — the actual integration point with
  Employee Records — a manual, user-triggered "Create Employee from this accepted Job Offer" action
  (`make_employee`), matching source's own actual behavior (this was never automatic in Frappe either
  — only the Employee→Applicant/Offer status sync-back is automatic, which this module also builds:
  creating an Employee with `jobApplicantId` set flips that applicant and its open offer to Accepted).
- **Decision** (schema, one line each — implementer fills in full field detail per the doctype specs):
  1. `JobRequisition` — designation/department/company refs, positions, compensation, status enum
     (Pending/Open & Approved/Rejected/Filled/On Hold/Cancelled, no enforced transition graph, matches
     source), requestedBy (ref Employee, fields fetched not stored-duplicated at write time — fetch
     on read via `$lookup` or populate, implementer's call), `make_job_opening` action.
  2. `JobOpening` — designation/department/company/employmentType/branch(location) refs, status enum
     (Open/Closed), publish + publishSalaryRange + preventDuplicateApplicant flags, route/slug field
     (server-generated, `company/job-title` scrubbed, matching source's server-authoritative version
     over the client's diverging one — Port Notes flagged this discrepancy, server wins), pay range +
     currency, staffingPlan/vacancy fields present on the schema but unvalidated (deferred per above).
  3. `JobApplicant` — applicant name/email/phone, jobOpeningId ref, designation (fetched), status enum
     (Open/Replied/Shortlisted/Rejected/Hold/Accepted), sourceId ref, resume link/attachment, cover
     letter, salary expectation. Closed-opening guard and duplicate-application guard (when the
     opening's `preventDuplicateApplicant` is set) both enforced server-side on create — source only
     had the closed-opening guard server-side and the duplicate check client-adjacent; both become
     real server validation here since there's no client form step to rely on.
  4. `JobApplicantSource` — simple master (name, isActive).
  5. `InterviewType` — name, designation ref, expected average rating, default interviewers (simple
     array of User refs — Interviewer's own child-table shape isn't worth a separate collection at
     this scale, implementer's call if it should be one).
  6. `Interview` — interviewType/jobApplicant refs, jobOpening (fetched), designation (fetched,
     mismatch-guarded against the applicant's own designation per `validate_designation`),
     scheduledOn/fromTime/toTime, status enum (Pending/Under Review/Cleared/Rejected/Cancelled),
     interviewers (child list of User refs, replacing Interview Detail as its own collection unless
     the implementer finds a reason not to fold it in), duplicate-interview-per-type guard.
  7. `InterviewFeedback` — interview/interviewer refs, result enum (Cleared/Rejected), free-text
     feedback (no Skill Assessment table, per above), interviewer-must-be-assigned guard,
     no-feedback-before-scheduled-date guard, duplicate-feedback-per-interviewer guard.
  8. `JobOffer` — jobApplicant ref (applicant name/email fetched), status enum (Awaiting
     Response/Accepted/Rejected/Cancelled), offerDate, designation (fetched), company, offerTerms
     (child list — term + value, replacing the separate Job Offer Term/Job Offer Term Template
     doctypes with one simple embedded list plus an optional reusable `JobOfferTermTemplate` master
     the UI can copy from), duplicate-offer-per-applicant guard, status-change syncs linked
     JobApplicant.status, `make_employee` action (manual, per above).
  9. Roles: HR User/HR Manager get full CRUD on everything in this module except where source's own
     permission table is asymmetric — reproduce those asymmetries exactly: Interview Feedback is
     HR-Manager-read-only/HR-User-read-only (both, per source — only `Interviewer` gets write there).
     `Interviewer` (RoleMaster row, already seeded in module 1) gets full CRUD on Interview and
     Interview Feedback, matching source's own (surprisingly unscoped) permission table — source
     itself has no `if_owner`-style "only my assigned interviews" restriction at the permission-table
     level, only the `validate_interviewer` business-rule check on Feedback specifically; don't invent
     a stricter scoping than source actually has.
  10. Public: `/api/v1/public/jobs` (list, GET one by route/slug) per the bespoke-router decision
      above. No public write endpoint this module — `OPEN-QUESTIONS.md` gets a row.
  11. Menu: new "Recruitment" menu group. Reporting: `widgetSources.js` entries for the funnel stages
      (jobOpenings groupable by status/company/department; jobApplicants groupable by status/source,
      dateField postedOn/creation) — enough for a basic hiring-funnel chart, not a reproduction of
      every KPI method in source (`get_avg_time_to_fill`, `get_applicant_to_hire_percentage`,
      `get_offer_acceptance_rate` are real and could become dashboard widgets later; not required now).
- **Consequences**: Staffing Plan (module 5) and Skill (module 6) both need to come back and touch
  this module's doctypes when they land — `OPEN-QUESTIONS.md` gets rows for both so they're not
  forgotten. The public listing sets the pattern for any future public route this project adds:
  bespoke narrow router under `/api/v1/public/`, never the generic list mechanism.
- **Deviates from convention**: yes — a second public router (`30-api.md` frames one public router as
  "by exception"; this is the second, justified the same way ADR-004 justified the first) and,
  narrower, a public route that's a listing rather than resolve-by-key (gate criterion 2 not met,
  reasoned through above rather than silently waived).
- **As built**: as decided, with two small runtime adjustments. Interview's `interview_details` and
  Job Offer's `offer_terms` child tables became plain embedded arrays as planned; Frappe's separate
  `Interview Detail`/`Job Offer Term` doctypes were never built at all (correctly — nothing needed
  them independently). `Employee.jobApplicantId` (optional) was added as planned to carry the
  reverse-hook integration. Deviations found only during implementation: (1) `Company.companyCode`/
  `Department.departmentCode`'s existing non-`sparse` partial-unique-index pattern (module 1) was
  reused for `JobOpening.route` and `Employee.userId`-style optional-unique fields, not called out by
  name in the ADR but the same established fix; (2) a real bug, not a design deviation — the public
  listing's `buildLookups()` stringified `null` refs before filtering, producing the literal string
  `"null"` in a Mongoose `$in` ObjectId query, which throws; fixed in its own commit
  (`fix(server): public job listing 500s when a Job Opening has no employment type/branch`), found by
  actually exercising the public endpoint with a real opening missing those optional fields, not by
  reading the code.
  **Verified**: `npm test` (10/10) green throughout. `npm run seed` run twice, identical counts on the
  second run (idempotent) — 1 Apidel company/12 branches/24 departments/29 designations/4 employment
  types (module 1), 195 employees (module 2), 5 Job Applicant Sources (module 3), unchanged. Live HTTP
  walk of the full funnel end to end: Job Requisition → `makeJobOpening` mapping → published Job
  Opening → confirmed visible on the **unauthenticated** `/api/v1/public/jobs` listing and its
  by-route detail endpoint, with salary correctly hidden when `publishSalaryRange` is false → Job
  Applicant created against it (name auto-derived from email) → closing the opening both blocked a new
  applicant (409) and cascaded the linked Job Requisition to `Filled` → Interview created, duplicate-
  type guard confirmed (409) → Interview Feedback: non-assigned interviewer rejected (403), assigned
  interviewer accepted (201), duplicate rejected (409) → Job Offer created, duplicate-per-applicant
  guard confirmed (409), status change to Accepted synced the Job Applicant → `makeEmployee` mapping →
  real Employee created with `jobApplicantId` set, confirmed the reverse hook flipped both the
  applicant and the (already-Accepted) offer correctly → confirmed with throwaway HR User/Employee-role
  accounts that HR User can read but not write Interview Feedback (asymmetric permission, 403 on
  write) and Employee-role is 403'd on Job Applicant. All throwaway test data (job requisitions,
  openings, applicants, interview types, interviews, feedback, offers, one employee, users, and the
  throwaway country/state/city created solely to satisfy the starter-generic `User` model's required
  geography fields — this dev DB had none seeded) cleaned up afterward; collection counts confirmed
  back to baseline (195 employees, 5 sources, zero in every purely-transactional collection). `npm run
  build` green before and after. `npm run docs` (screenshot capture) not run — same gap modules 1-2
  left; manifest entries exist so a future run can pick them up.
  **Not done, flagged for the user**: the public *apply* flow, Staffing-Plan vacancy checks, Employee
  Referral status sync and Skill Assessment ratings remain exactly as deferred in this ADR
  (`OPEN-QUESTIONS.md` Q-7/Q-8/Q-9) — nothing new deferred beyond what was already planned.

---

### ADR-020 — Onboarding & Separation: activities without Project/Task; Full & Final Statement without a ledger

- **Date**: 2026-09-10
- **Status**: accepted
- **Context**: `system-design` for HRMS module 4, same standing overnight authorization, modules 1-3
  reviewed clean before starting this one. Read all source files for this module in full: `Employee
  Onboarding.md` (which also documents the shared `EmployeeBoardingController` base class in one
  place, per the source spec's own "one canonical place" convention), `Employee Onboarding
  Template.md`, `Employee Boarding Activity.md`, `Employee Separation.md`, `Exit Interview.md`, `Full
  and Final Statement.md`, `Full and Final Asset.md`, `Full and Final Outstanding Statement.md`.
  `Employee Separation Template` was not read separately — it is structurally identical to Employee
  Onboarding Template (same child table, no controller logic), confirmed by both Onboarding-side
  files describing it as such.
- **The big call: onboarding/separation checklists are their own thing, not core-ERPNext Project/Task
  wearing an HR hat.** Source models both as a `Project` with `Task` children (core ERPNext doctypes
  this repo doesn't have and isn't taking on) — `boarding_status` is *derived* from `Project.percent_
  complete`, which is itself computed by ERPNext's own task-completion-weight formula that this port
  spec couldn't even trace (documented as an external dependency in `Employee Onboarding.md`'s own
  Port Notes). Building a generic Project/Task system to host one HR feature would be exactly the
  kind of framework-fidelity build ADR-016 already ruled out, and the source's own Port Notes on
  `Employee Onboarding Template` independently suggest the direct alternative: **each Onboarding/
  Separation record owns its `activities` array directly, each activity carries its own `status`
  (Pending/Completed/Cancelled) instead of a linked Task's status, and the parent's `boardingStatus`
  is derived straight from the activity rows** (none completed → Pending; some → In Process; all →
  Completed, or set directly via a "mark as completed" action) — same visible behavior, no Project/
  Task indirection, no need to reproduce ERPNext's percent-complete formula. `notify_users_by_email` +
  `frappe.desk.form.assign_to.add` (a ToDo-assignment mechanism this starter doesn't have) is replaced
  by an **optional** activity-assignment notification through the *existing* trigger-email system
  (ADR-015, `sendTriggeredEmail`) — a real, already-built mechanism, not a new one — left to the
  implementer's judgement whether it's worth a trigger key for this module or better deferred; either
  way it's a nice-to-have, not a blocker.
- **Idiomatic-rebuild items dropped, per ADR-016, same shape as modules 1-3**: no docstatus on any
  doctype in this module (each keeps only its own status field — `boardingStatus`, `status`); no
  naming series; no scheduled jobs (none existed for this module in source anyway); no `track_changes`
  version-history claim beyond what the existing audit-trail plugin already gives every model for
  free; no Project/Task, per above.
- **Full and Final Statement is the second-largest scope cut in the project so far, and for the same
  reason ADR-016 exists**: source's F&F Statement is fundamentally an *accounting* document —
  `status` is driven entirely by a linked `Journal Entry`'s submit/cancel (no other code path ever
  sets it to "Paid"), `create_journal_entry()` builds real GL-bound accounting entries, and its
  auto-population logic reads `Salary Slip`, `Gratuity`, `Leave Encashment`, `Employee Advance`,
  `Asset Movement`, and — conditionally — a whole separate "Lending" app for loan repayment/accrual.
  None of that exists here and none of it is being built to serve this one screen: ADR-016 already
  decided against a general ledger (Q-3 covers Expense Claim/Payroll; this ADR extends that same
  answer to Full and Final Statement rather than opening a duplicate question), and Salary Slip/
  Gratuity/Leave Encashment/Asset tracking are all unbuilt modules. Simplified to a **manually
  entered final-settlement worksheet**: HR types in payable/receivable line items (component label,
  description, amount, settled/unsettled) and asset-recovery rows (asset name, return-or-recover-cost,
  cost) by hand instead of the system auto-deriving them from six other doctypes; totals still compute
  server-side exactly as source does (`totalPayableAmount`, `totalReceivableAmount` = receivables sum
  + asset-recovery-cost sum); the settlement guard (every line item must be Settled, every
  return-action asset must be Returned, before the statement can be finalized) is preserved — it's
  real, self-contained business logic, not accounting-coupled; **no Journal Entry, no GL, "Paid" is a
  manual HR action** (`markAsPaid`), matching Q-3's already-planned answer applied here too.
- **One deliberate improvement over a flagged source gap**: `Employee Separation` has no
  duplicate-active-separation-per-employee guard in source (the spec calls this out explicitly as "a
  re-implementer should decide deliberately" rather than a gap to blindly copy) — adding one here
  (mirroring Employee Onboarding's real `validate_duplicate_employee_onboarding`), since leaving it
  out has no upside and a duplicate open separation for one employee is a real data-integrity problem
  worth preventing. Recorded as a deviation, not a silent fix.
- **Decision** (schema, one line each):
  1. `EmployeeBoardingActivity` — shared shape (not a separate collection; embed as an array field on
     both Onboarding and Separation, and on their Templates): activityName, assignedToEmployeeId
     (optional ref Employee — replaces source's User-or-Role assignee with something meaningful in
     this HR context), description, status (Pending/Completed/Cancelled, default Pending),
     requiredForEmployeeCreation (bool, only meaningful on Onboarding/Onboarding Template — keep the
     column on both parents' arrays regardless, matches source), beginOnDays/durationDays (int
     offsets from the parent's boardingBeginsOn — used for informational target start/end dates only,
     no holiday-list shifting since Holiday List doesn't exist yet, module 8).
  2. `EmployeeOnboarding` — jobApplicantId/jobOfferId refs (both required), employeeOnboardingTemplateId
     (optional — selecting it copies its activities array in, server-side this time, not client-only
     like source), companyId/departmentId/designationId/employeeGradeId (fetched from template when
     set), employeeId (optional, auto-resolved if an Employee already exists for the jobApplicantId,
     same as source's `set_employee`), employeeName (fetched from applicant), dateOfJoining,
     boardingBeginsOn, activities[], boardingStatus (Pending/In Process/Completed, derived per above).
     Duplicate guard: one active (boardingStatus != Completed... actually per source, keyed off
     existence not completion — one non-cancelled Employee Onboarding per jobApplicantId, full stop).
     Action: `markAsCompleted` (force every activity + the parent to Completed). Action: `makeEmployee`
     (mapped-payload pattern like Job Offer/Job Requisition in module 3 — guarded: every
     `requiredForEmployeeCreation` activity must be Completed first, matching source's
     `validate_employee_creation`).
  3. `EmployeeOnboardingTemplate` — title, companyId/departmentId/designationId/employeeGradeId
     (all optional), activities[] (same shape as point 1, used as a copy source).
  4. `EmployeeSeparation` — employeeId ref (required; department/designation/grade/company/
     resignationLetterDate/employeeName all fetched from Employee, matching source's authoritative-
     fetch-from-Employee resolution over the template's own conflicting client-side copy — source
     itself flags this inconsistency and says Employee wins, so Employee wins here too), employee
     SeparationTemplateId (optional, copies activities in), boardingBeginsOn, activities[],
     boardingStatus, exitInterviewSummary (free text field on this doctype — explicitly NOT linked to
     the separate `ExitInterview` collection, matching source, don't conflate them). Duplicate guard:
     added per the deliberate-improvement note above.
  5. `EmployeeSeparationTemplate` — same shape as Onboarding Template, separation-flavored.
  6. `ExitInterview` — employeeId ref (required), status enum (Pending/Scheduled/Completed/Cancelled),
     date (required when Scheduled), interviewers (array of Employee refs, required when Scheduled —
     Employee not User, consistent with point 1's reasoning), interviewSummary, employeeStatus
     (blank/Employee Retained/Exit Confirmed, required when Completed). Guards: employee must have a
     relievingDate set (real rule, kept); one active (non-cancelled) Exit Interview per employee (real
     rule, kept). No email-append-to inbox threading, no exit-questionnaire Web Form flow (both need
     infrastructure this starter doesn't have) — a simple "send interview invite" email via the
     existing trigger system is optional/implementer's-judgement, same as point 1's assignment email.
  7. `FullAndFinalStatement` — employeeId ref (required; department/designation/company/dateOfJoining/
     relievingDate fetched from Employee — guard: relievingDate must be set, real rule kept),
     transactionDate (required), payables[]/receivables[] (component, description, amount, status
     Settled/Unsettled — one shared shape, `lineType` discriminator if implemented as one array,
     source's own Port Notes flag this exact choice), assetsAllocated[] (assetName, action
     Return/RecoverCost, cost — required + only meaningful when RecoverCost, status Owned/Returned),
     totalPayableAmount/totalReceivableAmount/totalAssetRecoveryCost (all server-computed on save,
     never client-supplied), status (Unpaid/Paid/Cancelled, default Unpaid). Settlement guard before
     `markAsPaid` or any finalize action: every payable/receivable row Settled, every Return-action
     asset row Returned (source's real `before_submit` guards, preserved even though docstatus/submit
     itself isn't). No Journal Entry, no GL, no Asset Movement auto-population, no Loan/Lending — all
     per the simplification above.
  8. Roles: HR User/HR Manager get full CRUD on Onboarding, Onboarding Template, Separation Template,
     Exit Interview, per source's own tables (mostly symmetric here, unlike modules 1-3's several
     asymmetric splits — check each doctype's real permission table in the source files for the exact
     few exceptions, e.g. Employee Separation's HR User has no delete right and HR Manager alone gets
     submit-equivalent/finalize rights per source — reproduce that specific asymmetry even without
     docstatus, by gating the finalize/markAsPaid-style actions to HR Manager only where source did).
     Employee/Interviewer/Approver roles get no matrix row anywhere in this module.
  9. Menu: new "Onboarding & Separation" menu group. Reporting: `widgetSources.js` entries for
     `employee-onboardings` and `employee-separations` (groupable by boardingStatus/companyId/
     departmentId).
- **Consequences**: `Employee Separation`'s `exitInterviewSummary` free-text field and the separate
  `ExitInterview` collection stay deliberately unlinked, matching source (a UI hint suggesting HR
  copy/paste a summary across, if wanted, is fine; no data coupling). `OPEN-QUESTIONS.md` Q-3
  (payment reconciliation without a GL) now explicitly covers Full and Final Statement too, not just
  Expense Claim/Payroll — updating its text rather than adding a duplicate row.
- **Deviates from convention**: adds a guard source doesn't have (Employee Separation duplicate
  check) — the "deliberate improvement" case AGENTS.md rule 8 anticipates (source flagged it as a
  real gap, not a considered omission), recorded here rather than silently added.
- **As built**: as decided, with two things found only by actually running it:
  1. **A real, general bug in shipped starter infrastructure**: `models/auditPlugin.js`'s global
     `mongoose.plugin()` registration reaches embedded subdocument schemas, not just top-level
     models — its pre/post-`save` hooks ran per-row on this module's `activities`/`payables`/
     `receivables`/`assetsAllocated` arrays, and crashed (`this.constructor.findById is not a
     function`) whenever an *existing* document's array was modified and re-saved (creating one
     fresh never hit it — `isNew` short-circuits past the crashing line). Fixed with a
     `this.$isSubdocument` guard at the top of both hooks, in its own commit — this protects every
     current and future embedded-array model in the project, not just this module's, and is exactly
     the kind of "unrelated-but-found bug gets its own commit" case `git-flow` names.
  2. **Action-endpoint role gating uses "edit," not a dedicated "submit" key**, because this
     starter's permission matrix has no submit/cancel/amend dimension the way source's does — where
     source restricts `markAsCompleted`/`makeEmployee`/`makeAsPaid`-equivalent actions to HR Manager
     alone, HR User can also call them here wherever HR User already has edit rights on the
     underlying screen. A deliberate, named simplification (`DOMAIN.md`'s "Known simplification"),
     not an oversight — closing it exactly would mean adding a 7th permission key project-wide for
     one module's benefit.
  Otherwise built exactly as designed: `EmployeeBoardingActivity` shape embedded on 4 parents (not
  Project/Task), `boardingStatus` derived from activity rows, `EmployeeOnboardingTemplate`/
  `EmployeeSeparationTemplate` copy activities in server-side, `Full and Final Statement` as a manual
  worksheet with server-computed totals and a real settlement guard, the Employee Separation
  duplicate-guard improvement. `npm test` (10/10), `npm run seed` (idempotent ×2, no real data to
  seed for this module — same as Recruitment), `npm run build` all green. Full live-HTTP verification
  of every guard and both action flows (Onboarding→Employee, Full and Final Statement settlement→
  markAsPaid) against the real dev database, plus the role-permission asymmetries confirmed with
  throwaway accounts — see `CHECKLISTS.md`'s "Onboarding & Separation" section for the full walk.
  All throwaway test data cleaned up, employee count confirmed back to 195.

---

### ADR-021 — Employee Career Events: explicit-field history over generic setattr; Staffing Plan without a company hierarchy; source bugs fixed, not reproduced

- **Date**: 2026-09-10
- **Status**: accepted
- **Context**: `system-design` for HRMS module 5, same standing overnight authorization, modules 1-4
  reviewed clean before starting this one (module 4 also fixed a real, general `auditPlugin` bug
  affecting embedded arrays — noted, not re-litigated here). Read all source files in full: `Employee
  Transfer.md`, `Employee Promotion.md`, `Employee Referral.md`, `Grievance Type.md`, `Employee
  Grievance.md`, `Staffing Plan.md`, `Staffing Plan Detail.md`. `Employee Property History` was
  already read in full during module 2's research (ADR-018) — not re-read, referenced from memory.
- **The big call: Transfer/Promotion don't get a generic "pick any Employee field and setattr it"
  mechanism.** Source's `Employee Property History` is a generic `{fieldname, property, current, new}`
  row that a shared `update_employee_work_history()` applies via Python `setattr` onto the live
  Employee document — source's own Port Notes call out that the exclusion list protecting fields like
  `status`/`ctc`/`date_of_joining` from being targeted this way is **client-only, not enforced
  server-side**, i.e. the real app already has a data-integrity gap here. Building a generic
  reflection-style field-setter into this stack to support one feature is the wrong shape of reuse —
  it would be a second, narrower version of "edit an Employee," open to exactly the abuse source's own
  notes flag. Instead: **`EmployeeTransfer` and `EmployeePromotion` each carry explicit typed fields**
  for the small, real set of things they actually change (Transfer: department/designation/branch;
  Promotion: department/designation/grade/CTC), and applying them is a plain, explicit field
  assignment in the controller — safe by construction, no setattr, no exclusion list needed because
  there's nothing generic to exclude from.
  - **`EmployeePropertyHistory` becomes a plain, append-only change-log array on `Employee`** (or its
    own collection with an `employeeId` back-ref — implementer's call, `20-schema.md`'s "no unbounded
    arrays" rule likely favors a collection since this grows for the life of an active employee),
    written by Transfer/Promotion with the specific field, before-value, after-value, effective date,
    and which document caused it — a narrower, safer version of the same audit intent, not the
    generic mechanism.
  - **`Employee` gains one new field this module needs and doesn't have yet: `ctc`** (optional
    number) — Promotion's whole `current_ctc`/`revised_ctc` mechanism needs somewhere to read/write a
    "current total comp" figure, and nothing else has created one yet (Payroll's real Salary
    Structure is modules away). A plain optional number, not a Payroll concept — revisit when Payroll
    exists and decide whether `ctc` becomes derived from a Salary Structure Assignment instead.
  - **Inter-company transfer (source's `create_new_employee_id` — deep-clones the Employee into a new
    record at a different company, relieves the old one, blocks cancel until the clone is deleted) is
    deliberately out of scope.** This is real functionality, but it's the rare edge case (an employee
    legally re-employed under a different Apidel entity) that adds real complexity (deep-clone,
    dual-employee-record bookkeeping, a cancel-time delete-first guard) for a path a small HR team can
    still just do by hand today (deactivate one record, create another). `EmployeeTransfer` in this
    module only changes department/designation/branch **within the same company**; `companyId`
    changes are not supported by this action. Named as a deferred feature, not a silent gap.
- **Staffing Plan loses its entire parent/subsidiary-company validation layer, because there is no
  company hierarchy to validate against.** Source's real complexity here — `validate_with_parent_
  plan`/`validate_with_subsidiary_plans`, walking a nested-set Company tree, checking a plan's
  vacancies/budget against parent- and sibling-company plans — all assumes Frappe's Company doctype
  supports a tree (`parent_company`, `lft`/`rgt`). This project's `Company` (ADR-017) is a flat list —
  multi-company, but not hierarchical, and nothing in grilling asked for a parent/subsidiary
  relationship between Apidel entities. Building tree-validation logic against a hierarchy that
  doesn't exist would be pure speculation. **Kept**: the one guard that doesn't need a hierarchy —
  `validateOverlap`, same company + same designation + overlapping date range blocks a second active
  plan (source's own real, working same-company check). **Also kept**: the live-computed
  `currentCount`/`currentOpenings`/`numberOfPositions`/`totalEstimatedCost` per row, recomputed on
  every save from real `Employee`/`JobOpening` counts (both exist now) — genuinely useful, no
  hierarchy needed. **Dropped**: `parent_company` walking, sibling-company aggregation, the whole
  `ParentCompanyError`/`SubsidiaryCompanyError` pair. Also dropped: `set_job_requisitions`'s
  bulk-multiselect-from-Job-Requisition convenience action (a nice-to-have UI affordance, not core to
  the planning function) and the "prompt"-style user-typed primary key (this stack uses `_id` like
  every other collection, per ADR-016 — no naming-series-adjacent user-typed-name pattern anywhere in
  this project so far, no reason to start here).
- **Closing `OPEN-QUESTIONS.md` Q-8**: now that `StaffingPlan`/`StaffingPlanDetail` are real, this
  module also retrofits the vacancy checks Recruitment (module 3, ADR-019) deliberately skipped:
  `JobOpening` creation/update checks the active Staffing Plan for its designation+company (if one
  exists — no plan means no cap, matching source's own "only checked when a plan exists" behavior) and
  `JobOffer` submission does the same. Both reuse the same `get_designation_counts`-equivalent
  (`Employee.status=Active` count + `JobOpening.status=Open` count for the designation/company).
- **Source bugs fixed, not reproduced.** `Employee Referral`'s source has three confirmed bugs, called
  out by name in its own spec file: `status` is unconditionally forced back to `"Pending"` on every
  `validate()` (so "Rejected"/"Accepted" never actually persists through a normal save — only a
  `db_set` bypass works), `department`'s `fetch_from` references a nonexistent `employee` field
  (dead, should be `referrer.department`), and `create_additional_salary` throws an unbound-variable
  error whenever an Additional Salary already exists for the referral. ADR-016 already committed this
  project to idiomatic, *working* behavior over bug-for-bug fidelity — building any of these three in
  is pure downside with no compatibility benefit (there's no existing installation's data to stay
  bug-compatible with). Fixed: `status` persists whatever it's set to (no forced reset);
  `departmentId` is fetched from `referrer.departmentId` (the evidently-intended source); referral
  bonus payout (`createAdditionalSalary`) is dropped entirely for now, same reasoning as Transfer's
  inter-company case — it's an `Additional Salary` (Payroll) concept that doesn't exist yet, not a bug
  fix decision.
- **Employee Grievance's polymorphic `grievance_against_party`/`grievance_against` (any DocType, any
  record) becomes a plain optional `Employee` reference plus a free-text fallback.** A generic
  "grievance against any document in the system" field is more genericism than this project's actual
  entity set can meaningfully target (this app has nowhere near Frappe's full doctype registry) — the
  real cases are "against a specific employee" or "general/systemic," both served by an optional ref
  plus text. `associated_document_type`/`associated_document` (a second, unrelated polymorphic pair)
  is dropped entirely — no identified real consumer, pure generic-reference speculation.
- **Decision** (schema, one line each):
  1. `GrievanceType` — simple master (name, description, isActive) — same shape as `EmploymentType`.
  2. `EmployeeGrievance` — subject, raisedByEmployeeId (required ref), date (required), status enum
     (Open/Investigated/Resolved/Invalid/Cancelled, default Open), grievanceTypeId (required ref),
     grievanceAgainstEmployeeId (optional ref) + grievanceAgainstText (optional free text, "against"
     fallback when not a specific employee), description (required), causeOfGrievance (required when
     status is Investigated or Resolved), resolvedByUserId/resolutionDate/resolutionDetail (all
     required when status is Resolved), employeeResponsibleId (optional ref). No docstatus/submit
     gate — status transitions freely per source's own lack of a state machine, this project just
     drops the extra submit axis on top of it.
  3. `EmployeeTransfer` — employeeId (required ref, Active employees only per source's own UI filter,
     enforced here server-side too), transferDate (required), newDepartmentId/newDesignationId/
     newBranchId (all optional — apply whichever are set), a written history entry per applied change.
     No `newCompanyId`/inter-company path (deferred, see above).
  4. `EmployeePromotion` — employeeId (required ref; guard: Employee.status must not be Inactive, a
     real source rule, kept), promotionDate (required), newDepartmentId/newDesignationId/newGradeId
     (all optional), currentCtc (fetched from Employee.ctc if empty, not overwritten once set — real
     source semantic, kept), revisedCtc (optional; when set, applies to Employee.ctc on save).
  5. Employee gains: `ctc` (optional number, see above) and a `propertyHistory` array/collection
     (employeeId back-ref if separate collection; field, oldValue, newValue, effectiveDate,
     sourceDocType/sourceDocId) written by Transfer/Promotion.
  6. `EmployeeReferral` — firstName/lastName (required) + computed fullName, contactNo,
     currentEmployer, date (required), status enum (Pending/In Process/Accepted/Rejected/Cancelled,
     default Pending, persists normally — bug not reproduced), currentJobTitle, resume/resumeLink,
     departmentId (fetched from referrerId, bug fixed), workReferences, forDesignationId (required),
     email (required), referrerId (required ref Employee), referrerName (fetched), isApplicableFor
     ReferralBonus (bool), qualificationReason. Action `createJobApplicant` (maps into a real
     `JobApplicant` per module 3's model, sets this referral's status to In Process on success — real,
     working version of source's intent). No `createAdditionalSalary` (deferred, Payroll-dependent).
  7. `StaffingPlan` — companyId (required), departmentId (optional), fromDate/toDate (required, from
     <= to), staffingDetails[] (designationId, vacancies, estimatedCostPerPosition — currentCount/
     currentOpenings/numberOfPositions/totalEstimatedCost all server-computed on every save from live
     Employee/JobOpening counts, never client-supplied), totalEstimatedBudget (server-summed). Guard:
     `validateOverlap` (same company + designation + overlapping date range blocks a second plan) —
     the one source guard that survives without a company hierarchy.
  8. Recruitment retrofit (closes Q-8): `JobOpening` create/update and `JobOffer` submit both check
     for an active `StaffingPlan` covering their designation+company; if one exists and the requested
     vacancy would exceed `numberOfPositions` minus current count, reject; if no plan exists for that
     designation+company, no cap applies (unchanged from module 3's original no-op).
  9. Roles: reproduce each doctype's real permission table from source (they're not all the same
     shape — Staffing Plan notably has no System Manager row in source and HR User gets a
     submit-equivalent right HR User doesn't get elsewhere; Employee Grievance's Employee role gets
     write+delete but not the finalize-equivalent action). Employee/Referrer self-service visibility
     (Employee role reading their own Transfer/Promotion/Grievance/Referral rows) is the same
     per-screen scoping mechanism already deferred to Leaves (Q-4) — this module's Employee-role grant
     stays a plain, unscoped read grant matching source's own literal permission table, not an
     "only mine" restriction (source doesn't have one either, confirmed in each file).
  10. Menu: new "Employee Career Events" menu group (Transfer, Promotion, Referral, Grievance Type,
      Employee Grievance, Staffing Plan — 6 screens). Reporting: `widgetSources.js` entries for
      `employee-grievances` (groupable by status/grievanceTypeId) and `staffing-plans` (groupable by
      companyId/departmentId).
- **Consequences**: `OPEN-QUESTIONS.md` Q-8 (Staffing Plan vacancy checks) closes — answer recorded
  here and the Recruitment retrofit lands in this module's own commits, touching module 3's
  `jobOpening`/`jobOffer` controllers. Q-9 (Employee Referral source-sync, Skill Assessment) stays
  open — this module builds `EmployeeReferral` fully but the *Job Applicant*-side
  `source == "Employee Referral"` status-sync (writing back onto this new collection from module 3)
  is still deferred, now that the referral collection this sync would target actually exists; note
  this explicitly rather than silently building half of a two-sided sync.
- **Deviates from convention**: none new beyond ADR-016/017's already-approved patterns. The
  bug-fixes-not-reproduced decisions are corrections within the idiomatic-rebuild mandate, not a new
  deviation from `docs/conventions/`.
- **As built**: as decided, plus three deviations found while building:
  1. `EmployeeReferral.email`'s uniqueness couldn't be scoped to
     "non-Cancelled rows" at the index level — MongoDB partial indexes don't
     support `$ne`/`$in`, only `$eq`/`$exists`/`$gt(e)`/`$lt(e)`/`$type`
     under a top-level `$and`. Fell back to a plain `unique: true` (merged
     with the soft-delete plugin's own `isDeleted: false`, same as every
     other unique index in this project); the "not unique among Cancelled
     rows" refinement stays enforced in the controller's own duplicate
     check only. A narrow gap (re-referring the same email after a prior
     referral was cancelled would hit the DB constraint), not the common
     path.
  2. `widgetSources.js`'s doc comment says `aggregatable` values are plain
     label strings (`{ field: label }`), matching `dateFields`'s shape —
     written as `{ field: { label, type } }` first, caught before commit by
     checking `DashboardSectionEditor.jsx`'s actual consumption
     (`Object.entries(...).map(([field, label]) => ...)`, which would have
     rendered `[object Object]` as the dropdown label). Fixed to the plain
     string shape.
  3. `Employee.ctc` (added by this ADR) is only ever written by
     `EmployeePromotion`'s controller directly — it was never added to
     `employee.controller.js`'s own `OPTIONAL_FIELDS` allowlist (that
     controller predates this field, module 2), so it can't be set or
     cleared through the generic Employee edit endpoint. Consistent with
     the intent (CTC changes should go through Promotion, matching real HR
     process) but means a stray test CTC value can't be cleared through the
     API afterward — left as real, correctly-applied data on the test
     employee rather than forced clean via a workaround; noted, not fixed,
     since deciding whether `ctc` should also be directly editable is a
     product question, not a bug.
- **Verified live** against the real dev database: `npm test` 10/10 throughout,
  `npm run seed` run twice (idempotent — 0 new on the second run; 5
  Grievance Types both times), `npm run build` green. Full HTTP walk:
  Transfer (department change applied to the Employee immediately, one
  `EmployeePropertyChange` row logged, old/new values correct), Promotion
  (revised CTC applied to `Employee.ctc`, Inactive-employee guard confirmed
  with a real 400), Referral (duplicate-email 409, `departmentId` correctly
  fetched from the referrer — confirming the bug-not-reproduced fix —
  `createJobApplicant` producing a real `JobApplicant` with the "Referral"
  source and flipping the referral to In Process), Grievance (both
  conditional-required-field guards confirmed with real 400s), Staffing
  Plan (`currentCount`/`numberOfPositions` computed correctly against live
  Employee counts, overlap guard confirmed with a real 409). **The
  Recruitment retrofit (closing Q-8) confirmed end to end**: with a
  Staffing Plan capping a designation at 2 positions (1 existing employee +
  1 vacancy), a first Open Job Opening for that designation succeeded, a
  second was rejected 409, and a Job Offer for the same exhausted
  designation was also rejected 409 — both citing the Staffing Plan by id.
  Role-permission checks confirmed live with throwaway accounts: HR User
  could create an Employee Transfer but not delete it (create-read-only,
  per source's asymmetric table), the Employee role could create an
  Employee Grievance but was 403'd attempting to write an Employee
  Referral. All test data cleaned up (Employee Transfers/Promotions/
  Grievances/Referrals/Staffing Plans/Job Openings/Job Applicants deleted;
  throwaway Country/State/City/Users — this dev DB had none, confirming
  `OPEN-QUESTIONS.md` Q-10 is still open — created and deleted); Employee
  count confirmed back to 195, the transferred employee's department
  restored to its original value.
- **Found, not fixed** (pre-existing, unrelated to this module): `POST
  /cities` 500s with a raw Mongoose validation message
  (`City validation failed: countryId: Path 'countryId' is required.`)
  leaked directly to the client instead of the generic "Internal server
  error" — violates `30-api.md`'s "never leak `error.message` on a 500"
  rule. Pre-existing in the starter's own City controller, unrelated to
  HRMS; not touched here.

---

### ADR-022 — Training & Skills: Training Result folded into Training Event; three retrofits into Recruitment close Q-9

- **Date**: 2026-09-10
- **Status**: accepted
- **Context**: `system-design` for HRMS module 6, same standing overnight authorization, modules 1-5
  reviewed clean before starting this one. Read all source files in full: `Training Program.md`,
  `Training Event.md`, `Training Result.md`, `Training Feedback.md`, `Employee Training.md`,
  `Skill.md`, `Designation Skill.md`, `Expected Skill Set.md`, `Employee Skill Map.md`, `Skill
  Assessment.md`. `Employee Skill` (the `Employee Skill Map` child row) was not separately read — its
  shape is fully inferable from its three siblings (`Designation Skill`, `Expected Skill Set`, `Skill
  Assessment` all wrap one `Skill` ref + one rating-shaped field; source's own `employee_skill_map.js`
  names the field `proficiency`, hardcoded to `1` when auto-populated) and reading it would have added
  nothing this pass didn't already establish.
- **This module's source is unusually full of dead/broken code, more than any module so far** —
  worth naming as a pattern, not just listing each bug: `Training Event.status` doesn't exist (the
  real field is `event_status`) so `Training Result.on_submit`'s attempt to set it is a silent no-op;
  the "Training Feedback" notification template references context variables nothing populates; the
  "mandatory" line in the Training Scheduled email references a field (`is_mandatory`) that lives on
  the child row, not the parent, so it's always false; `Training Result.on_cancel` has no rollback
  (a flagged, undocumented asymmetry); `Training Feedback` has no uniqueness guard against duplicate
  submissions despite being the kind of record that needs one. None of this is being reproduced —
  ADR-016 already committed this project to idiomatic, working behavior, and a training-and-skills
  module is exactly the kind of internal tooling where reproducing broken notification templates has
  zero value and real cost (confusing HR admins with silent no-ops).
- **The big call: `Training Result`/`Training Result Employee` don't become separate collections —
  their whole function folds into `Training Event`'s own attendee rows.** Source's `Training Result`
  exists mainly to be a *submittable* wrapper around per-attendee scoring (hours/grade/comments),
  gated on "the Training Event must already be submitted" — a docstatus-driven ceremony this project
  doesn't have (ADR-016). Once docstatus is gone, `Training Result` has no remaining reason to be a
  document separate from the event it's scoring: HR can enter attendance/hours/grade/comments
  directly on each `TrainingEvent.employees[]` row, and a `markCompleted` action does the same
  cascade source's real, working `on_update_after_submit` logic does (Present + not yet
  Feedback-Submitted → Completed; reopening to Scheduled resets every row to Open). This is a
  simplification in shape, not in function — every real per-attendee fact source captured is still
  captured, just on one document instead of two.
- **`EmployeeTraining` (a per-Employee "trainings I've attended" child table) is dropped entirely** —
  source's own spec file couldn't confirm which doctype embeds it (a documented, unresolved gap in
  the source repo itself), and whatever it would show is already fully answered by querying
  `TrainingEvent` where `employees.employeeId` matches — a redundant mirror of data this project
  already has one home for, not a second source of truth to keep in sync.
- **Three retrofits into modules already shipped, each closing a real gap those modules' own forks
  named and deferred** — this module is where `Skill` (the shared master four different doctypes
  hang off) finally exists, so the doctypes that were waiting on it get touched now, each its own
  commit:
  1. `Designation` (module 1) gains `skills[]` (array of `Skill` refs) — source's `Designation Skill`
     child table, whose real parent (`Designation`) lives outside the traced Frappe source but whose
     consumer (`Employee Skill Map`'s designation-change auto-populate) is fully documented. No
     separate `DesignationSkill` collection — a plain ref array on `Designation` is the whole thing.
  2. `InterviewType` (module 3, Recruitment) gains `expectedSkillSet[]` (array of `Skill` refs) —
     module 3's own fork explicitly skipped this ("since Skill doesn't exist yet, skip that part"),
     naming exactly this retrofit as the follow-up.
  3. `InterviewFeedback` (module 3, Recruitment) gains `skillAssessment[]` (array of `{skillId,
     rating}`) — closes the `Skill Assessment` half of `OPEN-QUESTIONS.md` Q-9 named since ADR-019.
     The per-skill average-rating rollup onto the parent `Interview` (source's
     `get_skill_wise_average_rating`) is **not** retrofitted in the same pass — it's a read-side
     reporting query, not a data-shape gap, and can be added whenever a screen actually needs it
     without touching the schema again; noted, not built speculatively now.
  - Q-9's *other* half (the reverse `EmployeeReferral`↔`JobApplicant` status sync) is untouched by
    this module — nothing here unblocks it, it stays open.
- **Decision** (schema, one line each):
  1. `TrainingProgram` — trainingProgramName (required, unique), companyId (required),
     trainerName/trainerEmail, supplierName/contactNumber, description (required), status enum
     (Scheduled/Completed/Cancelled, default Scheduled, plain user-set field — source has no
     controller logic driving it either).
  2. `TrainingEvent` — eventName (required, unique), trainingProgramId (optional), eventStatus enum
     (Scheduled/Completed/Cancelled, default Scheduled — no docstatus, this is the whole lifecycle),
     type enum (Seminar/Theory/Workshop/Conference/Exam/Internet/Self-Study, required), level enum
     (optional, Beginner/Intermediate/Advance), companyId, trainerName/Email, supplierName/
     contactNumber, course, location (required), startTime/endTime (both required, endTime strictly
     after startTime — real guard, kept), introduction (required), employees[] (employeeId required,
     isMandatory bool, attendance enum Present/Absent, status enum Open/Completed/`Feedback
     Submitted` default Open, hours, grade, comments — merges former Training Result Employee fields
     directly in). Action `markCompleted`/`markScheduled`: cascades `employees[].status` per source's
     real `on_update_after_submit` logic (stated above).
  3. `TrainingFeedback` — employeeId (required ref), trainingEventId (required ref), feedback
     (required text). Guards, real and kept: reject unless the linked TrainingEvent's `eventStatus`
     is Completed (replaces source's docstatus=1 check with the equivalent status check); reject
     unless this employee is a row in that event's `employees[]`; reject if that row's `attendance`
     is Absent. On create: set the matching attendee row's `status` to `Feedback Submitted`.
  4. `Skill` — skillName (required, unique), description.
  5. `EmployeeSkillMap` — employeeId (required, unique ref — one map per employee), employeeSkills[]
     (skillId required ref, proficiency number). Action `populateFromDesignation` (server-side
     version of source's client-only convenience): clears and repopulates `employeeSkills` from the
     Employee's Designation's `skills[]` (retrofit point 1), proficiency defaulted to a middling
     value — implementer's call on the exact default, source hardcoded `1` on what's presumably a
     1-5 scale, meaning "lowest," which reads oddly as an auto-populate default; flag the choice
     either way in the As-built note, don't silently copy a default that may read as an insult.
  6. Retrofits (own commits): `Designation.skills[]`, `InterviewType.expectedSkillSet[]`,
     `InterviewFeedback.skillAssessment[]` — all per point above.
  7. Roles: Skill is HR-Manager-full/HR-User-**read-only** (matches source exactly — the third
     asymmetric-permission master in this project after Employee Health Insurance and Interview
     Feedback). Training Program/Event/Feedback are HR-Manager-full, HR-User varies per doctype
     (check each file's real table — Training Event's HR User has no create/delete/submit-equivalent
     right at all, closer to read+edit-existing than the usual full-access pattern). Employee Skill
     Map is HR-User-full-minus-delete, HR-Manager-full. Training Feedback additionally grants
     Employee-role create/read/write — source has no `if_owner` restriction here either (flagged
     explicitly in the source file as a real gap, not invented), so match it: an unscoped grant, not
     an "only mine" one, same treatment as every other Employee-role grant deferred to Q-4.
  8. Menu: new "Training & Skills" menu group (Training Program, Training Event, Training Feedback,
     Skill, Employee Skill Map — 5 screens). Reporting: `widgetSources.js` entries for
     `training-events` (groupable by eventStatus/type/companyId) and `employee-skill-maps`
     (groupable by nothing meaningful yet — mostly a lookup screen, note if there's truly nothing
     worth a widget rather than forcing one).
- **Consequences**: `OPEN-QUESTIONS.md` Q-9's Skill-Assessment half closes; its referral-reverse-sync
  half stays open, explicitly untouched by this module. Any future screen wanting
  `Interview.get_skill_wise_average_rating`'s rollup can be built directly against
  `InterviewFeedback.skillAssessment[]` without a schema change.
- **Deviates from convention**: none new beyond ADR-016/017's already-approved patterns.
- **As built**: as decided, plus what verify actually found:
  1. `EmployeeSkillMap.employeeSkills[].proficiency` defaults to `3` (mid,
     1-5 scale), not source's hardcoded `1` — confirmed live via
     `populateFromDesignation`: a mid default reads as "not yet assessed,"
     a `1` default would read as "rated lowest" for skills nobody has
     actually evaluated yet.
  2. **Two real bugs found live wiring the three retrofits, both fixed,
     both their own commits**: `Designation`'s `updateDesignation` (module
     1) unconditionally overwrote `designationName`/`companyId`/`isActive`
     with `undefined` on any partial update that omitted them — including
     every `skills[]`-only update this retrofit needed — failing their
     `required` validators as an opaque 500. `InterviewType`'s create/
     update and `InterviewFeedback`'s create (module 3) still destructured
     their pre-retrofit field lists, so `expectedSkillSet`/`skillAssessment`
     silently never saved even though the schema had room for them since
     the day this ADR's commits landed. All caught by actually exercising
     the retrofits over real HTTP, not by reading the diff.
  3. A third, unrelated pre-existing bug surfaced and worked around, not
     fixed: two throwaway accounts (`verify.hruser@example.com`,
     `verify.employee@example.com`) collided with orphaned `LoginAttempt`
     rows left behind by an earlier module's verify session whose `User`
     had since been deleted — auth's login-attempt upsert isn't idempotent
     against a stale row for a reused email, so login 500'd with a duplicate-
     key error. Cleaned up the specific stale rows (confirmed orphaned first)
     and moved on; recorded as `OPEN-QUESTIONS.md` Q-12 so it isn't
     rediscovered blind by the next module that reuses a throwaway email.
  4. Skipped a widget entry for `employee-skill-maps` as planned — one row
     per employee, an embedded array, nothing meaningful to group or sum.

---

### ADR-023 — Travel: a genuinely small module; Travel Request's access opened up from source's System-Manager-only table

- **Date**: 2026-09-10
- **Status**: accepted
- **Context**: `system-design` for HRMS module 7, same standing overnight authorization, modules 1-6
  reviewed clean before starting this one — plus, this session, a git remote was set up, all six
  merged into `development`, five pre-existing starter bugs found during those modules' testing were
  fixed (GitHub issues #3-7), and MongoDB moved from a portable binary to Docker (`mongo:7.0` — the
  official `8.0` image hard-fails on this host's kernel, a documented MongoDB-side compatibility
  gate). Read `Travel Request.md`, `Travel Itinerary.md`, `Travel Request Costing.md`, `Purpose of
  Travel.md` in full; `Identification Document Type.md` was already read during module 2's research
  (ADR-018, which deferred it here) — not re-read, referenced from memory.
- **This is a genuinely small module** — one real transactional doctype (`Travel Request`) with two
  embedded child arrays and two one-field master lists. No scope correction needed this time; the
  Day-1 sketch was right.
- **The one real judgment call: `Travel Request`'s access is opened up from source's literal
  permission table.** Source declares exactly one role — System Manager — with no explicit submit/
  cancel/amend rights even for that role (the spec calls this out as genuinely ambiguous, not merely
  under-documented: "no role in source can submit this doctype without additional customizations not
  captured here"). Taken literally, a port would make Travel Request unusable by anyone but an
  admin-equivalent account, for a feature whose entire premise is an employee requesting to travel.
  This reads as an incomplete area of the traced source (plausibly filled in by client-specific
  Frappe customizations the port spec had no visibility into) rather than a deliberate design to
  preserve — same category as Employee Separation's missing duplicate-guard in module 5, which was
  named as a gap and then deliberately closed, not silently copied. Opened up the same way every
  other self-service-shaped doctype in this build has been: `Employee` role gets full-minus-delete on
  their own requests (no per-screen self-only scoping yet, per the still-open Q-4 — same caveat every
  Employee-role grant in this project carries), `HR User`/`HR Manager` get full access, matching this
  project's now-established pattern rather than source's outlier table.
- **No docstatus, per ADR-016** — `status` becomes a plain Draft/Submitted/Cancelled field with no
  transition guards (matching source's own near-total absence of validation: the only real rule
  anywhere in this module is the Inactive-employee guard on Travel Request itself).
- **`Travel Request Costing`'s `expense_type` (Link to Expense Claim Type) can't be a real reference
  yet** — Expenses (module 16) hasn't been built. Same forward-dependency shape as Interview Type's
  `expectedSkillSet` in module 3: kept as a plain free-text field for now, with a note (`OPEN-
  QUESTIONS.md`) to retrofit it as a real ref once Expenses exists, rather than blocking on a module
  eight builds away or inventing a placeholder collection.
- **Two things explicitly NOT invented, because source explicitly doesn't have them**: no rollup
  `total_amount` on Travel Request (source's own field named "Total Amount" is manually entered, not
  computed — the port spec flags this as the single most important gap to preserve, not fix) and no
  date-order validation on `Travel Itinerary` (departure/arrival, check-in/check-out) — source has
  none, and AGENTS.md's own ground rules (matching this spec's) say not to invent validation that
  isn't there. Both are named here so nobody "fixes" them later mistaking the gap for an oversight.
- **Decision**:
  1. `PurposeOfTravel` — simple master (name, isActive). No RoleMaster grants — matches source's
     literal System-Manager-only table (unlike Travel Request itself, source here is at least
     internally consistent: a low-stakes admin classification list nobody flagged as broken).
  2. `IdentificationDocumentType` — same shape and same ADMIN-only treatment, per ADR-018's original
     deferral note.
  3. `TravelRequest` — employeeId (required ref; Inactive-employee guard kept, real source rule),
     travelType enum (Domestic/International, required), travelFunding (optional enum),
     purposeOfTravelId (required ref), detailsOfSponsor, description, personalIdTypeId (optional ref
     IdentificationDocumentType), personalIdNumber, itinerary[] (travelFrom/travelTo, modeOfTravel
     enum, mealPreference enum, travelAdvanceRequired bool, advanceAmount — as a real Number, not
     source's untyped Data field; a correct-typing improvement, not a new calculation — departureDate/
     arrivalDate, lodgingRequired bool, preferredAreaForLodging, checkInDate/checkOutDate,
     otherDetails), costings[] (expenseType as free text for now per the forward-dependency note
     above, sponsoredAmount/fundedAmount/totalAmount as plain Numbers — **not computed**, comments),
     status enum (Draft/Submitted/Cancelled, default Draft, no transition guards), companyId (fetched
     from employee).
  4. Roles: per the access-opening decision above. Menu: new "Travel" group (3 screens — Travel
     Request, Purpose of Travel, Identification Document Type). Reporting: one `widgetSources.js`
     entry for `travel-requests` (groupable by status/travelType/companyId); skip one for the two
     masters — nothing to group.
- **Consequences**: `OPEN-QUESTIONS.md` gets a new row for the `expenseType` retrofit, parallel to the
  existing Recruitment-retrofit rows (Q-8/Q-9) — a follow-up touch to `TravelRequestCosting` once
  Expenses exists, not forgotten.
- **Deviates from convention**: none new — the access-opening call is the same "deliberate
  improvement over a flagged source gap" category ADR-021 already established a precedent for, not a
  new kind of deviation.
- **As built**: `PurposeOfTravel`, `IdentificationDocumentType`, `TravelRequest` (embedded
  `itinerary[]`/`costings[]`) built exactly as designed above — no scope changes during
  implementation. New "Travel" menu group (3 screens); roles per the access-opening decision
  (`Employee` full-minus-delete, `HR User`/`HR Manager` full, on `/travel-request` only — the two
  masters get no RoleMaster grants for any of the six HRMS roles). One `widgetSources.js` entry for
  `travel-requests` (groupable by status/travelType/companyId). Starter master data seeded (5
  Purposes of Travel, 4 Identification Document Types) since neither list had any real-world source
  data to draw from, unlike other modules' masters. `OPEN-QUESTIONS.md` Q-13 already covers the
  `TravelRequestCosting.expenseType` → real `ExpenseClaimType` ref retrofit — no new row needed.
  Verified live: `npm test` all green, `npm run seed` twice (idempotent — second run added 0 new
  masters), `npm run build` green, and a full HTTP walk — Travel Request created with populated
  itinerary/costing sub-documents and an auto-filled `companyId`; the Inactive-employee guard
  confirmed (400, exact message format); the missing-required-fields guard confirmed (400); the
  reference-guarded delete on `PurposeOfTravel` confirmed (409, blocked while referenced); role
  checks confirmed end to end with three throwaway `User` accounts (Employee/HR User/HR Manager) —
  Employee could create/read/edit but not delete a Travel Request and was refused write access to
  Purpose of Travel (403); HR User was refused write access to Purpose of Travel too (403, ADMIN-only
  holds for every non-admin role, not just Employee); HR Manager could delete. All test data (3
  users, all Travel Requests created during verify) cleaned up afterward — employee count back to
  195, master lists back to their 5/4 seeded rows, no stray test rows anywhere.

---

### ADR-024 — Leaves: per-menu-row data scoping answers Q-4, a dependency-free scheduler answers Q-5, Department Approver built with a parent-chain walk, a minimal Attendance seed for module 9

- **Date**: 2026-09-10
- **Status**: accepted
- **Context**: `system-design` for HRMS module 8, same standing overnight authorization, modules 1-7
  reviewed clean before starting this one (module 7's Travel is ADR-023, merged, issue #9's
  LoginAttempt collision fixed and merged separately). Read all 17 real per-doctype spec files under
  `HRMS-Port-Spec/01-Modules/Leaves/` in full via a research fork, plus this project's own current
  scoping/permission code (`utils/scope.js`, `middlewares/checkPermission.js`, `models/UserRoles.js`,
  `models/Employee.js`, `models/Department.js`) read directly by this session, not delegated — this
  ADR's two central calls (Q-4, Q-5) are exactly the kind of judgment AGENTS.md reserves for the
  orchestrator, not a fork.
- **This is the largest module yet by a wide margin, and the one `STATE.md` has been flagging since
  module 2 as where two long-open questions finally have to get real answers**: Q-4 (per-screen/
  company data scoping — this starter's `UserRoles.dataScope` is one value per *role*, not per
  screen, so a role can't be `own`-scoped on Leave Application but `all`-scoped on Leave Type) and
  Q-5 (this starter ships no background job scheduler at all, and Leaves is the first module with
  jobs ADR-016 already committed to keeping: `process_expired_allocation` → `generate_leave_
  encashment` → `allocate_earned_leaves`, in that fixed order, daily).
- **Scope correction before code, same as module 2**: 17 raw doctypes is not 17 collections. Several
  are child tables in source and get folded to embedded arrays here too, matching source's own
  structure rather than inventing a shortcut: `Leave Policy Detail` → `LeavePolicy.leavePolicyDetails[]`,
  `Earned Leave Schedule` → `LeaveAllocation.earnedLeaveSchedule[]`, `Leave Block List Date`/`Leave
  Block List Allow` → `LeaveBlockList.blockDates[]`/`.allowList[]`, and the module needs a `Holiday`
  concept that source treats as external — folded to `HolidayList.holidays[]`. `Leave Control Panel`
  is a stateless bulk-action form in source too (a Frappe Single with `disable_save`), not a stored
  entity — built as two bulk-action endpoints with per-item try/catch isolation and a lightweight
  custom admin page, no entity-config CRUD screen. That leaves 13 real top-level collections/screens:
  `LeaveType`, `LeavePeriod`, `HolidayList`, `HolidayListAssignment`, `LeavePolicy`, `LeavePolicy
  Assignment`, `LeaveAllocation`, `LeaveLedgerEntry`, `LeaveAdjustment`, `CompensatoryLeaveRequest`,
  `LeaveApplication`, `LeaveEncashment`, `LeaveBlockList` — plus a `Department` extension and a new
  minimal `Attendance` model (below).
- **Q-4 decision — per-menu-row scope override, additive and backward-compatible**: `UserRoles.
  roles[]` (which already carries one row per (role, menu) pair) grows an optional `dataScope` field,
  `enum: SCOPE_VALUES, default: null`. `null` means "inherit the role-level `UserRoles.dataScope`" —
  every existing role/menu row across modules 1-7 keeps behaving exactly as today with zero migration.
  `checkPermission` computes `row.dataScope || roleDoc.dataScope || SCOPES.ALL` once the matrix row is
  resolved (it already fetches `row` for the permission-flag check; this is one more field read off
  the same document, no extra query) and sets `req.user.dataScope` to that instead of the bare
  role-level value. `SCOPES` (`packages/shared/src/scopes.js`) grows a fourth value, `APPROVER`,
  alongside `all`/`department`/`own` — Leaves needs "my own records, plus records of people I resolve
  as the approver for," which `own` alone can't express and `department` over-grants (an approver is
  not necessarily the whole department's manager).
  `utils/scope.js`'s `buildScopeFilter` stays synchronous and its existing call sites (7 modules) stay
  untouched — it gains one more optional key, `approverIds` (a pre-resolved array the *caller*
  computes), and when `scope === SCOPES.APPROVER` returns `{ [scopeable.owner]: { $in: [reqUser.
  employeeId, ...(scopeable.approverIds || [])] } }`. Resolving `approverIds` needs an async DB call
  (below), so it's computed once per request by the Leaves controllers that need it and passed in —
  not baked into `buildScopeFilter` itself, which stays a pure synchronous function every other module
  can keep trusting not to surprise-query.
  A missing piece this ADR also closes: today `req.user.departmentId`/`.id` refer to the login
  `User`, not `Employee` — Leaves' own data (`LeaveApplication.employeeId`, etc.) refs `Employee`, not
  `User`. A new helper, `resolveRequestEmployee(req)`, looks up `Employee.findOne({ userId: req.user.
  id })` once and memoizes it on `req.employee` for the life of the request — called lazily only by
  controllers whose scope dimension needs it (own/department/approver), not as a global middleware,
  so screens that don't need it never pay the extra query. `req.user.employeeId` is set from
  `req.employee._id` at the same point for `buildScopeFilter` to read.
- **Approver resolution — Department Approver, with a parent-chain walk instead of source's
  nested-set**: source's `get_approvers()` walks a nested-set (`lft`/`rgt`) ancestor chain; this
  project's `Department` (ADR-017) is flat. `Department` gains `parentDepartmentId` (optional
  self-ref) and three embedded arrays — `leaveApprovers[]`, `expenseApprovers[]`, `shiftRequest
  Approvers[]` (each `[{ type: ObjectId, ref: "User" }]`) — folding source's three separate
  `Department Approver` child tables the same way every other child table in this project has been
  folded, reusing the `SimpleArrayField` component module 4 built. Resolution (`utils/approvers.js`,
  `resolveApprovers(employeeId, approverType)`): if the `Employee`'s own direct field (`leave
  ApproverId`/`expenseApproverId`/`shiftRequestApproverId` — already built by module 2) is set,
  that's the answer, full stop — matches source's actual behavior once the Employee-level field is
  populated. Otherwise walk `parentDepartmentId` upward from the employee's department, bounded to
  depth 10 (a hard cycle guard this flat model has no other protection against), collecting every
  ancestor level's matching approver array and **union across the whole chain, not just the nearest
  non-empty level** — matches source's own dedup-across-ancestors behavior. Throws a "Please set a
  Leave Approver for this Employee or their Department" error (source's literal message, adapted)
  when nothing resolves. The inverse query Leaves' own list screens need — "which Employees does the
  logged-in User approve for" — is `getEmployeesApprovedBy(userId, approverType)`: direct matches
  (`Employee[<type>ApproverId] === userId`) plus, for every `Department` where `userId` appears in its
  approver array, every `Employee` in that department *or any of its descendants* whose own direct
  approver field is unset (a direct override always wins, so an employee who has one is never covered
  by their department's fallback approver).
- **Q-5 decision — no new dependency, a minimal in-process day-granularity runner**: AGENTS.md's
  working rules forbid adding a dependency without asking, and the user is offline — `node-cron` (the
  obvious choice) is out under this session's standing authorization, which covers "ordinary
  implementation decisions," not a new package. A new `SchedulerRunLog` collection (`jobName` unique,
  `lastRunDate` at day granularity, `lastStatus`, `lastError`, `lastDurationMs`) backs a `setInterval`
  in `server.js` (5-minute tick, started once after the DB connects) that runs any job whose
  `lastRunDate` isn't today, in the fixed order ADR-016 already committed to:
  `processExpiredAllocations` → `generateLeaveEncashments` → `allocateEarnedLeaves`, each wrapped in
  its own try/catch so one job's failure doesn't block the next (mirrors source's per-employee
  savepoint isolation, at job granularity instead). This is explicitly a **single-process** design —
  `60-limits.md` already documents "single process assumed" as a starter-wide limit; a horizontally
  scaled deployment would double-fire jobs in the race window between two processes' near-simultaneous
  `lastRunDate` checks. Not solved here — named as the same known limitation, not a new gap.
- **A minimal `Attendance` model, built now, extended by module 9**: `Leave Application`'s real
  on-submit behavior creates/checks `Attendance` rows (On Leave / Half Day), and `Compensatory Leave
  Request`'s validation chain checks for matching `Attendance` records against the worked date range —
  Attendance doesn't exist yet (it's module 9, Shift & Attendance, next on the board). Rather than lose
  that fidelity or reorder the whole module board, `Attendance` gets a minimal shape now — `employeeId`,
  `companyId`, `attendanceDate`, `status` (Present/Absent/On Leave/Half Day/Work From Home),
  `leaveApplicationId` (optional back-ref), `leaveTypeId` (optional) — unique on `(employeeId,
  attendanceDate)`, matching source's real one-row-per-employee-per-day invariant. Module 9 extends
  this with shift assignment, check-in/out and geolocation; it does not rebuild it. Same precedent as
  module 2 adding Employee's three approver fields early for modules this one and Recruitment to
  consume.
- **Docstatus folding, per doctype (ADR-016)** — most of this module's real value is in `on_submit`
  side effects, so the fold is to an explicit action endpoint that reproduces the side effect, not a
  passive status flip: `LeavePolicyAssignment.status` (pending/allocated) + `POST .../grant-
  allocations` (idempotent via a `leavesAllocated` flag; runs the pro-ration algorithm, creates
  `LeaveAllocation` rows + opening ledger entries — tenure pro-ration rounds to whole numbers, earned-
  leave pro-ration rounds to decimals, deliberately different per source); `LeaveAllocation.status`
  (active/expired/cancelled) + `POST .../adjust` (source's `on_update_after_submit`: re-validates
  `newLeavesAllocated` and writes a signed delta ledger entry, never a raw field PATCH);
  `LeaveAdjustment` writes its one signed ledger entry on create (simple enough that create *is* the
  action; source's own `leaves_after_adjustment` is informational, not authoritative — the ledger sum
  is, matching Leave Allocation's own cached-total caveat below); `CompensatoryLeaveRequest.status`
  (open/approved/rejected) + `POST .../approve` (validates active-employee, date order, that every day
  in the worked range is a holiday per the Holiday List, and that matching `Attendance` rows exist,
  then finds/extends or creates the resulting `LeaveAllocation` and writes a ledger entry);
  `LeaveApplication.status` (open/approved/rejected/cancelled) + `POST .../approve` and `.../reject`
  (approve runs the full ~14-step validation chain from source — active-employee, backdating gate,
  half-day sanity, balance sufficiency with the negative-allowed override, overlap with the half-day
  adjacency carve-out, max-consecutive-days, block-date enforcement, self-approval prevention, leave-
  approver-mandatory, applicable-after-joining — then creates/updates `Attendance` rows and writes 1-2
  ledger entries, splitting across allocation boundaries when the range crosses them);
  `LeaveEncashment.status` (pending/paid) + `POST .../mark-paid` (amount/date/reference — the same
  manual-action substitute for GL posting Full & Final Statement established in module 4, Q-3;
  Leave Encashment inheriting `AccountsController` in source is exactly the "no GL" collision ADR-016
  and Q-3 already anticipated, not a new one).
- **`LeaveAllocation.totalLeavesAllocated` is a cached snapshot, never the source of truth — the
  balance is always `SUM(LeaveLedgerEntry.leaves)` filtered by employee/leaveType/date, computed via
  aggregation.** This matters concretely once `LeaveAdjustment` exists, because source's own
  adjustment flow writes a ledger entry *without* touching the allocation's cached total — a UI that
  trusted the cached field would silently show a stale balance. Flagged explicitly so nobody "fixes"
  the cached field into looking consistent and breaks the real invariant.
- **`LeaveLedgerEntry` reversal is soft-delete, not source's hard-DELETE-on-cancel** — a deliberate
  deviation for consistency with this project's universal soft-delete convention (every other
  collection in the codebase soft-deletes; a hard-delete carve-out for one collection would be a trap
  for the next module). The one thing this requires getting right: the balance-`SUM` aggregation
  **must** filter `isDeleted: { $ne: true }` in its own `$match` stage explicitly — Mongoose's
  soft-delete query middleware hooks `find`/`findOne`, not `aggregate` pipelines, so this doesn't
  happen automatically the way it would for a plain list query. Named here so the fork building it
  doesn't discover this the hard way the way module 2's CSV line-ending bug or module 6's audit-plugin
  subdocument crash were discovered — by testing, not by reading.
- **Decision — models and menu**: `LeaveType`, `LeavePeriod`, `HolidayList` (+`holidays[]`),
  `HolidayListAssignment`, `LeavePolicy` (+`leavePolicyDetails[]`), `LeavePolicyAssignment`,
  `LeaveAllocation` (+`earnedLeaveSchedule[]`), `LeaveLedgerEntry`, `LeaveAdjustment`,
  `CompensatoryLeaveRequest`, `LeaveApplication`, `LeaveEncashment`, `LeaveBlockList`
  (+`blockDates[]`+`allowList[]`) — 13 new collections; `Department` extended (`parentDepartmentId`,
  three approver arrays); `Attendance` — new, minimal, module 9 extends it. New "Leaves" menu group.
  Two bulk-action endpoints for Leave Control Panel, no dedicated CRUD screen. `widgetSources.js`
  entries for every screen except pure child-owning masters with nothing to group on their own
  (Holiday List's own entry covers `holidays[]` implicitly the way other modules' embedded arrays do).
- **Split into two stacked forks given the size** — `feat/leaves` (foundation: scoping infra,
  approver resolution, scheduler infra, `LeaveType`/`LeavePeriod`/`HolidayList`/`HolidayList
  Assignment`/`LeavePolicy`/`LeavePolicyAssignment`/`LeaveAllocation`/`LeaveLedgerEntry`/`Attendance`/
  `Department` extension — independently mergeable and verifiable on its own) then a second stacked
  branch (`LeaveAdjustment`/`CompensatoryLeaveRequest`/`LeaveApplication`/`LeaveEncashment`/
  `LeaveBlockList`/Leave Control Panel, which all depend on the foundation's scoping/approver/
  scheduler work and on `LeaveAllocation` existing) — same stacking pattern already used for
  Recruitment → Onboarding/Separation → Career Events → Training & Skills.
- **Consequences**: `OPEN-QUESTIONS.md` Q-4 and Q-5 both close, pointing here. `Department`'s
  extension is the first change to a module-1 model since module 6's `Skill[]` retrofit pattern —
  same "extend the spine, don't duplicate it" precedent.
- **Deviates from convention**: none beyond what's named above (soft-delete reversal instead of
  source's hard-delete; a bespoke scheduler instead of a library, forced by the no-new-dependency
  rule colliding with an offline user who can't be asked).
- **As built (foundation half only — `feat/leaves`)**: built exactly as designed above for the
  foundation fork's scope — Q-4 scoping (`SCOPES.APPROVER`, `UserRoles.roles[].dataScope` per-menu-row
  override, `checkPermission`/`buildScopeFilter`/`utils/requestEmployee.js`), Q-5 scheduler
  (`SchedulerRunLog`, `jobs/leaveScheduler.js`, wired into `server.js`), Department Approver
  (`parentDepartmentId` + three approver arrays, `utils/approvers.js`), minimal `Attendance`, and
  `LeaveType`/`LeavePeriod`/`HolidayList`(+`holidays[]`)/`HolidayListAssignment`/`LeavePolicy`
  (+`leavePolicyDetails[]`)/`LeavePolicyAssignment`(+`grant-allocations`)/`LeaveAllocation`
  (+`earnedLeaveSchedule[]`,+`adjust`)/`LeaveLedgerEntry` (read-only) — 9 new models, full CRUD API/UI
  for the 8 that need it. `LeaveAdjustment`/`CompensatoryLeaveRequest`/`LeaveApplication`/
  `LeaveEncashment`/`LeaveBlockList`/Leave Control Panel are the still-pending second fork, exactly as
  planned — this module does not reach `done` until that lands.
  - **Two deviations from the design's implied precision, both deliberate, both flagged in code
    comments (`utils/leaveProration.js`)**: the earned-leave schedule's sub-period boundaries are
    calendar-months-from-`fromDate`, not source's quarter/half-year-calendar-anchored boundaries —
    this ADR's own two named rounding rules (tenure whole-number, earned-leave decimal) are
    reproduced exactly, but the elaborate `get_half_year_periods`/`get_semester_start` machinery is
    not. Carry-forward computation uses `getLeaveBalance` as of the previous allocation's `toDate`
    rather than source's period-scoped `get_unused_leaves` query — correct for this fork's own
    single-allocation-per-period cases, worth revisiting once the second fork's Leave Application
    introduces real consumption entries to net against.
  - **A bug in this fork's own new code, found and fixed before it ever shipped**: the first draft of
    `buildEarnedLeaveSchedule` only pro-rated the schedule's first row for a mid-period join date —
    every calendar month between the schedule's `fromDate` and an employee's actual (later) join date
    wrongly earned a full month's share instead of zero. Caught by hand-verifying the pro-ration math
    against a real mid-year joiner during the HTTP walk, not by reading the diff; fixed to place the
    join date per-row instead of only on the first, locked in with a new test case.
  - **A pre-existing bug found while live-testing Q-4, unrelated to Leaves itself, filed as GitHub
    #10 and fixed**: `apps/server/controllers/v1/user.controller.js`'s `getUserById`/`updateUser`/
    `deleteUser` built their scope-guarded query as `{ _id: userId, ...buildScopeFilter(...) }` — when
    the "own" dimension (declared against the field name `"_id"` on this one collection) is active,
    the spread's own `_id` key silently overwrote the URL param's `_id`, so the route ignored
    `:userId` entirely under an `own`-scoped role and always resolved to the caller's own account.
    Fixed with `$and` instead of object-spread in all three functions.
  - **Verified live** (full detail in `STATE.md`'s Log entry for this session): `npm test` green,
    `npm run seed` twice (idempotent), `npm run build` green, a full `grant-allocations` cycle against
    a real mid-year-joiner employee with hand-verified pro-ration math, the `/adjust` action and the
    generic-PATCH rejection both confirmed, `runDueJobs()` manually exercised against constructed
    fixtures for both `processExpiredAllocations` and `allocateEarnedLeaves` (including same-day
    no-op idempotency), the Q-4 per-menu-row override confirmed live over real HTTP (before/after the
    `#10` fix), an unrelated existing HR User account confirmed listing all seeded Departments
    (module 1) to rule out a scoping regression, and `resolveApprovers`/`getEmployeesApprovedBy`
    exercised against the real seeded Apidel department hierarchy as well as synthetic fixtures. Full
    browser UI click-through was not performed (Playwright's browser binary could not be downloaded in
    this sandbox) — relied on a clean Vite build plus manual config review instead.
- **As built (module complete)** — `LeaveAdjustment`, `CompensatoryLeaveRequest`, `LeaveApplication`,
  `LeaveEncashment`, `LeaveBlockList` (+`blockDates[]`/`allowList[]`), the two Leave Control Panel
  bulk-action endpoints, and `generateLeaveEncashments` all built on `feat/leaves-transactions`. Model,
  controller (grouped in a sibling `leavesTransactions.controller.js`/`.routes.js` rather than growing
  the foundation's `leaves.controller.js` further — same "large module, own file" precedent as
  `travel.controller.js`), swagger, admin API client, entity-config screen (custom page only for Leave
  Control Panel, matching source's stateless-Single shape), `widgetSources.js` entry and `docs-src/
  manifest.js` entry for every one of the five. This closes the module — `STATE.md`'s Leaves row moves
  to `done` across every phase except Shipped.
  - **The Q-4 scoping judgment call, now that Leave Application exists to make it meaningful**:
    `Employee` and the pre-existing-but-until-now-ungranted `Leave Approver` role both get
    `dataScope: SCOPES.APPROVER` on `/leave-application` (and `Employee` alone on
    `/compensatory-leave-request`) — one scope value covers both "my own records" and "my own plus
    everyone I approve for" instead of introducing a separate plain-`own` case, because
    `buildScopeFilter`'s `own` dimension compares against the login `User`'s own id (`reqUser.id`),
    which is NOT what `LeaveApplication.employeeId` stores (`Employee._id`) — `approver` was already
    built to read `reqUser.employeeId` instead (`utils/requestEmployee.js`), which is the one that
    resolves correctly here. For a plain Employee, `getEmployeesApprovedBy` returns `[]`, so the filter
    degenerates to exactly "my own applications" — verified live, not just reasoned about (see Verified
    live below). `HR User`/`HR Manager` stay unscoped (`all`, the role-level default — no per-menu-row
    override needed).
  - **Block-date enforcement is a hard block at CREATE, not only at approve** — a deliberate choice
    where the task brief's own distillation and this ADR's design both left room to interpret source's
    `validate_block_days()` (which only blocks when transitioning to `status=="Approved"`) literally.
    Blocking at create instead means an employee can never even file a leave application for a blocked
    date unless they're on that block list's `allowList[]` — stricter than source, but simpler to
    reason about given this project's create-is-mostly-the-action shape, and the allow-list bypass
    still gives HR/approvers an escape hatch. Recorded as a deviation, not silently matched to source.
  - **`LeaveBlockList.allowList[]` is a single `allowUserId` ref**, not the role-or-user shape a
    summary of the task implied — the real port-spec file (`Leave Block List Allow.md`) documents only
    one field, `allow_user` (Link to User), no role option. Ground truth is the spec file, read
    directly, not a paraphrase of it.
  - **`LeaveBlockList.departmentId` is a field on the block list itself, not a `Department.
    leaveBlockList` single-FK the way source models it** — this project's precedent for "X applies to
    department Y" is an assignment-shaped collection (`HolidayListAssignment`), not a single link field
    on `Department`, so `LeaveBlockList` follows that same shape: one company/department/leave-type
    combination per document, multiple block lists may legitimately target the same department. A
    deliberate simplification, not an oversight.
  - **`LeaveEncashment.perDayEncashmentAmount` is a manually-entered field**, matching Travel's
    `expenseType`/Interview Type's `expectedSkillSet` forward-dependency-gap precedent — source derives
    it from `Salary Structure Assignment.leave_encashment_amount_per_day`, and Payroll doesn't exist in
    this project yet (module 11+). Recorded as an `OPEN-QUESTIONS.md` row (Q-14) for the eventual
    retrofit. The negative ledger debit is written at CREATE (not at `/mark-paid`) — source's own
    `create_leave_ledger_entry()` runs at `on_submit`, and this project folds "submit" into "create" for
    every doctype simple enough not to need a separate draft stage (the same call already made for
    `LeaveAdjustment`) — `LeaveEncashment`'s Draft/Unpaid/Paid lifecycle collapses to
    pending/paid, with the ledger debit happening once, at creation, not re-derived at mark-paid.
  - **`LeaveApplication`'s validation chain is an idiomatic rebuild of the task's own distilled list**,
    not source's full ~19-step chain (ADR-016 precedent, same as the foundation half's pro-ration
    math): active-employee, half-day date sanity (in-range, not itself a holiday), balance sufficiency
    via `getLeaveBalance` with the `allowNegative` override, overlap with the half-day-adjacency
    carve-out, max-consecutive-days (one-hop adjacency merge, not source's full recursive chain walk —
    documented in code, a real simplification), block-date enforcement, `applicableAfter` vs. joining
    date, `isOptionalLeave` against the covering Leave Period's optional Holiday List. Approve splits
    the ledger debit across an allocation boundary when the application's range crosses one; when the
    two allocations aren't back-to-back (a gap between them), this port posts what each allocation
    actually covers rather than throwing source's hard "non-consecutive allocations" error — blocking
    approval entirely over a date-range gap seemed worse than posting the two partial entries. Cancel
    reverses via soft-delete (ADR-024's own reversal rule) of both the `LeaveLedgerEntry` rows and the
    `Attendance` rows the approval created.
  - **`CompensatoryLeaveRequest` approve's missing-Attendance case is a hard block, not an auto-create**
    (the task's own named judgment call) — this project has no Attendance data populated by anything
    yet, and silently fabricating a Present record to let approval through would mask that gap rather
    than surface it. The error names which day(s) are missing.
  - **Two real pre-existing bugs found live-testing this work, filed and fixed**:
    - **#12** — `utils/scope.js`'s `buildScopeFilter` `APPROVER` branch returned `{ $in: [] }`
      (matches nothing) as soon as `reqUser.employeeId` was missing, WITHOUT ever consulting
      `scopeable.approverIds` — meaning a Leave Approver with no Employee record of their own (a real,
      expected case, Q-10) always saw zero rows regardless of who they actually approve for. This was
      the foundation half's own code, built for this exact scope value, but never exercised live until
      this module wired it onto a real screen. Fixed to build the `$in` list from whichever of
      `employeeId`/`approverIds` are present, falling through to "matches nothing" only when both are
      empty. Regression case added to `utils/scope.test.js` (wired into `npm test`).
    - **#13** — `leaves.controller.js`'s `getLeaveAllocationById` (foundation half) unconditionally
      500'd: it `.populate()`s `employeeId`/`leaveTypeId` and THEN passes the now-populated
      sub-documents into `getLeaveBalance`, whose `new mongoose.Types.ObjectId(String(...))` throws on
      anything that isn't already a hex string. Fixed to compute the balance from the raw ids first,
      populate only afterward for display. The exact same trap existed in this fork's own brand-new
      `getLeaveApplicationById` — caught and fixed in the same pass before it ever shipped, no separate
      issue needed for that one.
    - **#11** (not a data bug, a UI gap) — `CrudForm` only guarded the **add** path against a missing
      permission; a direct URL visit to `/:path/:id/edit` reached the full edit form regardless of the
      `edit` permission, and for any entity config with no `api.update` (this fork's own
      `LeaveEncashment`/`LeaveAdjustment`, and the pre-existing `trainingFeedbackConfig`), clicking Save
      threw a raw `TypeError` instead of a permission message. Added the matching edit-mode guard, plus
      a defense-in-depth `updateLeaveEncashment` endpoint that always 400s cleanly (`LeaveEncashment`
      needs `edit` permission granted for its own `/mark-paid` action, which makes the generic edit form
      reachable even though there's deliberately no real update path).
  - **Verified live**: `npm test` green (new pure-logic tests for `leaveDayCalculation.js` and
    `leaveBlockList.js`'s `listApplies`, plus the `scope.test.js` regression case for issue #12), `npm
    run seed` twice (idempotent — 0 new grants and 195 employees both times), `npm run build` green. A
    full HTTP walk against the real running server, logged in as `admin@example.com` plus three
    throwaway Users (an `Employee`-role and two `Leave Approver`-role accounts, all deleted afterward):
    `LeaveApplication` create → balance-sufficiency confirmed against a real `grant-allocations` output
    (6 days pro-rated for a real mid-year joiner), overlap rejection, self-approval rejection (a
    dedicated fixture where the employee's own resolved approver pointed at their own linked account),
    max-consecutive-days rejection (5+6=11 > a 10-day cap), block-date rejection AND its allow-list
    bypass (same date, same employee, succeeds only for the allow-listed user) — approve → `Attendance`
    rows created (`On Leave`, correctly linked back) and the ledger entry written (`-2`, matching the
    `+6` allocation grant) — reject on a second application → zero `Attendance`/ledger rows, confirmed
    by an empty search result — cancel the approved one → ledger entry soft-deleted and `Attendance`
    rows soft-deleted, balance verified back at its pre-approval value via `getLeaveBalance`. The Q-4
    scoping confirmed from both directions over real HTTP: the `Employee` account's `/leave-applications/
    search` returned only their own row; the `Leave Approver` account (deliberately given NO linked
    Employee, to hit issue #12's exact shape) returned exactly the one application they're the resolved
    approver for and nothing else, both before (empty, the bug) and after (correct) the fix.
    `CompensatoryLeaveRequest` approve confirmed against a real constructed Holiday List +
    `HolidayListAssignment` + `Attendance` fixture (allocation created a day after the worked holiday,
    per spec); the missing-Attendance hard block and the not-a-holiday hard block both confirmed
    separately. `LeaveAdjustment` create confirmed to write exactly one ledger entry (`+3`) while
    `LeaveAllocation.newLeavesAllocated`/`totalLeavesAllocated` stayed at their original cached `6` —
    the ledger-vs-cache invariant checked directly via `GET /leave-allocations/:id`'s `currentBalance`
    (`9`) vs. its own `totalLeavesAllocated` (`6`), not just asserted. `LeaveEncashment` create (balance
    debited, amount computed as `days × rate`) and `/mark-paid` (idempotency guard, and the issue #11
    defense-in-depth `updateLeaveEncashment` guard confirmed to 400 cleanly instead of crashing) both
    confirmed. Leave Control Panel's both bulk endpoints confirmed with mixed batches — 2 successes + 1
    deliberate overlap failure for `bulk-allocations`, one success for `bulk-policy-assignments` left
    correctly unallocated (`status: "pending"`). `runDueJobs()` manually triggered (via a direct script
    call after resetting `SchedulerRunLog`, not waiting for the 5-minute interval) against a constructed
    near-expiry `LeaveAllocation` fixture with its ledger entry's `createdAt` deliberately backdated (a
    real historical allocation would have been granted months before its `toDate`, not created via API
    "today" with a backdated `toDate` — the raw-collection backdate was necessary because Mongoose
    treats `createdAt` as immutable on `updateMany`) — confirmed `processExpiredAllocations` flipped it
    to `expired` and `generateLeaveEncashments` drafted a `pending` `LeaveEncashment` in the same pass,
    then confirmed re-running was a no-op (`skipped: 1`) via the `leaveAllocationId`-exists idempotency
    guard. The allocation-boundary-splitting approve case (two adjacent allocations, one application
    spanning both) was code-reviewed against the ledger-write logic but not separately live-fixtured —
    flagged here rather than silently claimed as tested. Every throwaway fixture was cleaned up
    afterward via the app's own delete endpoints and status transitions (employee count back to 195,
    zero `User` documents — matching this project's pre-existing state, issue #7); the two
    `LeaveAllocation` rows this session created that carry an irreversible `LeaveAdjustment`/
    `LeaveEncashment` reference could not be deleted (both collections are deliberately undeletable —
    that block IS the working reference guard) and remain as real, harmless historical test
    transactions, same as any real HR action would leave behind.

---

### ADR-025 — Shift & Attendance: auto-attendance is the third named background job, geofencing without GeoJSON, no multi-shift-per-day, schedule generation becomes an explicit action not an invented cron job

- **Date**: 2026-09-11
- **Status**: accepted
- **Context**: `system-design` for HRMS module 9. This session's Claude account hit its monthly spend
  limit mid-research (resets 3am UTC) — the user's own tiered-fallback instruction from earlier this
  session ("once you are at 60% of usage limit invoke codex... once you use all the codex limit then
  only use agy") applied for the first time: the research pass for this module was re-run on `codex
  exec` instead of a Claude fork, in read-only mode, and returned a dense, well-grounded report. Read
  all 11 real per-doctype spec files under `HRMS-Port-Spec/01-Modules/Shift-Attendance/` (via that
  report) plus this project's own current `Attendance` model/controller (built as a minimal seed by
  module 8's foundation, ADR-024), the Q-5 scheduler infra (`jobs/leaveScheduler.js`), the Q-4 scoping
  mechanism, and `resolveApprovers`/`getEmployeesApprovedBy` (`utils/approvers.js`) that this module
  can reuse for `Shift Request` approval.
- **This is the second-largest module yet**, comparable to Leaves — 11 doctypes, several with real
  algorithmic complexity (shift-occurrence resolution across overnight/buffered windows, four
  configurable working-hours calculation modes, geofencing, hourly-cadence source automation this
  project's day-granularity scheduler cannot literally reproduce). Same split-into-two-stacked-forks
  approach as Leaves, for the same reason: `feat/shift-attendance` (foundation — masters, `Shift
  Assignment`, `Shift Schedule`(+`Assignment`), `Employee Checkin`+geofencing, the extended
  `Attendance` model, the shift-occurrence and working-hours utilities) then a second stacked branch
  (`Shift Request`, `Attendance Request`, the two bulk-action tools, and the auto-attendance
  background job — all of which need the foundation's models/utilities to exist first).
- **Auto-attendance is the third of ADR-016's three named background jobs** — Leaves already built
  the other two categories ("leave accrual/expiry" as `processExpiredAllocations`+
  `allocateEarnedLeaves`, "leave encashment" as `generateLeaveEncashments`). This module builds
  exactly that one remaining job, `processAutoAttendance` — **not** a literal port of source's three
  separate hourly jobs (`update_last_sync_of_checkin` → `process_auto_attendance_for_all_shifts` →
  `process_auto_shift_creation`). Source's hourly cadence cannot be reproduced by this project's
  Q-5 scheduler (ADR-024: day-granularity, single-process, no dependency added) — folded to one daily
  job in its own file (`jobs/attendanceScheduler.js`, its own `runDueJobs`-equivalent, reusing
  `SchedulerRunLog` the same way `leaveScheduler.js` does, wired into `server.js` alongside it rather
  than merged into the same file/array — the two runners are independent, not sequentially coupled
  the way Leaves' three jobs are). **`process_auto_shift_creation` (source's hourly schedule-generation
  sweep) is deliberately NOT built as a background job at all** — ADR-016 names three job
  *categories* to keep, and schedule generation isn't one of them; inventing a fourth recurring job
  for it would be scope creep this ADR explicitly declines. Instead, `Shift Schedule Assignment`
  generation becomes an explicit `POST .../generate` action an HR user (or the Shift Assignment
  Tool's bulk action) triggers on demand — same "explicit action over invented automation" instinct
  ADR-024 already applied to `LeavePolicyAssignment.grant-allocations`.
- **No multi-shift-per-employee-per-day** — source's schema allows it (Attendance has no unique
  employee+date constraint, only employee+date+shift in spirit), and this project's existing minimal
  `Attendance` (module 8) already has a hard unique `(employeeId, attendanceDate)` index. Codex's
  research flagged this as a real conflict to resolve, not silently ignore. Decision: **keep the
  existing one-row-per-employee-per-day invariant** — nothing in the real Apidel org-chart data
  suggests multi-shift roles, and supporting it would cascade through every piece of this module's
  design (Checkin's shift resolution, the auto-attendance grouping, Attendance Request's target
  selection). A deliberate scope-narrowing, not an oversight — recorded here so it reads as a decision
  if someone later needs multi-shift support.
- **Geofencing without GeoJSON**: source generates and stores a `Point` GeoJSON `FeatureCollection` on
  `Shift Location`, gated by a `HR Settings.allow_geolocation_tracking` toggle this project doesn't
  have (HR Settings is deferred, ADR-017). Neither piece is needed for what this module actually does
  with the data — `Shift Location` stores plain `latitude`/`longitude`/`checkinRadius` (meters), and
  `Employee Checkin`'s geofencing check computes haversine distance directly against those two
  numbers when both are present on the resolved Shift Assignment's location and both coordinates are
  supplied on the checkin. No global toggle: enforcement is inherently per-Shift-Location (a location
  with no coordinates or `checkinRadius <= 0` just never enforces, matching source's own "no match
  means no radius enforcement" and "radius ≤0 disables enforcement" behavior) — a global switch would
  be redundant with data that's already opt-in per row.
- **Shift-occurrence resolution is deliberately simplified from source's general algorithm.** Source
  resolves an arbitrary timestamp to a shift occurrence via a genuinely general algorithm: overnight
  windows, buffered check-in/out windows, assignment-boundary widening across adjacent days, and a
  previous/next search bounded to 366 days. This project builds a narrower version — for a given
  employee and timestamp, find the active `Shift Assignment` covering that calendar date (or the
  adjoining date for an overnight shift crossing midnight), apply the `Shift Type`'s buffer minutes,
  and match. It handles the common cases (including overnight shifts) but does not attempt source's
  exhaustive adjacent-day/366-day bounded search for edge cases like a shift assignment starting
  exactly at a boundary with unusual buffer configurations. Named here, and as an `OPEN-QUESTIONS.md`
  row, as a real fidelity gap to revisit if real usage surfaces an edge case this doesn't handle —
  not silently invented as if it were the full algorithm.
- **Working hours calculation keeps all four of source's real combinations** (alternating-log-types
  vs. strict-IN/OUT, × first/last-timestamp vs. every-valid-pair) as four independently testable pure
  functions (`utils/workingHours.js`) — this is well-specified, unambiguous business logic (not the
  kind of thing to simplify away), matching this project's established pattern of pure, tested
  calculation utilities (`leaveProration.js`, `leaveDayCalculation.js`).
- **Auto-attendance drops the leave-backed pending-half-day resolution corner case.** Source's
  auto-attendance processing can resolve a pre-existing pending `Half Day` (created by an approved
  half-day `Leave Application`) into a matched Present/Absent for its other half. This project's
  `LeaveApplication.approve` (ADR-024) already writes a definite `Half Day` `Attendance` row directly
  — there's no "pending" intermediate state to resolve. Auto-attendance here simply **skips any date
  that already has an `Attendance` row carrying a `leaveApplicationId`** rather than trying to merge
  into it — simpler, and correct for how this project's Leave Application already behaves (it never
  leaves a half-resolved row the way source's own two-stage process can).
- **Auto-attendance's absence sweep runs once per day, for yesterday only** — not source's bounded
  lookback from last-processed watermark to previous eligible occurrence. Since this project's
  scheduler already runs once daily, sweeping exactly "yesterday" for every currently-active
  auto-attendance-enabled `Shift Assignment` (skipping holidays and already-marked dates) needs no
  separate watermark bookkeeping of its own and naturally catches up if the server was stopped,
  because every daily run covers its own yesterday. A stopped-for-a-week server would silently skip
  the days in between rather than backfilling them — named as a limitation, matching this project's
  general "single process assumed" posture rather than building backfill machinery ADR-016 never
  asked for.
- **A real pre-existing gap found by this research, not this module's own new code**: module 8's
  minimal `Attendance` controller (built by the foundation fork) has no company confinement at all —
  `runListQuery` is called without a `scopeFilter`, and detail/update/delete don't filter by company
  either, a direct gap against ADR-016's "company confinement by default" rule. This module's
  foundation fork fixes it as part of extending the model (not filed as a separate GitHub issue,
  since it was never exercised/shipped-facing in module 8 — Attendance had no dedicated screen with
  real users yet, unlike issues #10-13 which were live, reachable bugs).
- **`Shift Request` reuses `resolveApprovers`/`getEmployeesApprovedBy` (ADR-024) as-is, not source's
  literal rule.** Source validates a Shift Request's approver against "immediate-department approvers
  plus the employee's own approver field" — a narrower, single-level check than `resolveApprovers`'s
  established direct-field-wins-else-whole-ancestor-chain-union semantics. Reusing the existing,
  tested mechanism (AGENTS.md non-negotiable #2: reuse before you write) rather than building a
  second, subtly different approver-resolution rule for one doctype. `Employee.shiftRequestApproverId`
  and `Department.shiftRequestApprovers[]` already exist (ADR-024) for exactly this.
- **`Overtime Type`** (referenced by `Shift Type.overtimeType` and `Shift Assignment.overtimeType`) is
  a forward dependency on Payroll (module 10+), which doesn't exist yet — same shape as Travel's
  `expenseType` (ADR-023) and Interview Type's `expectedSkillSet` before module 6. Omitted from both
  models for now (not even a free-text placeholder, since `allowOvertime`/overtime tracking isn't core
  to what this module needs to ship), with an `OPEN-QUESTIONS.md` row for the eventual retrofit.
- **Docstatus folding (ADR-016)**: `Shift Assignment`/`Shift Schedule Assignment` — plain `status`
  (`active`/`inactive`/`cancelled`); "effectively active" (accounting for a past `endDate`) is
  **computed at query/validation time, not mutated by a job** — avoids inventing yet another daily
  sweep ADR-016 didn't name, and is simpler than source's own daily-expiry job for the same result.
  `Shift Schedule` — no custom status at all (source itself has none beyond the generic docstatus
  this project already drops) — a plain `isActive` master. `Shift Request` — `status`
  (`open`/`approved`/`rejected`) + `approve`/`reject` actions, same shape as `LeaveApplication`:
  approve creates a `Shift Assignment`, reject does nothing further. `Attendance Request` — create
  *is* the action (writes/updates `Attendance` rows directly, matching source's own submit-does-
  everything, no-separate-approval shape) + a `cancel` action that soft-deletes the specific
  `Attendance` rows it created (reusing `LeaveApplication.cancel`'s soft-delete-reversal pattern,
  ADR-024).
- **Decision — models**: `ShiftType`, `ShiftLocation`, `ShiftAssignment`, `ShiftSchedule`,
  `ShiftScheduleAssignment`(+`generate` action), `ShiftRequest`(+`approve`/`reject`),
  `AttendanceRequest`(+`cancel`), `EmployeeCheckin` — 8 new collections; `Attendance` (module 8)
  extended with `departmentId`, `shiftId`, `attendanceRequestId`, `workingHours`/
  `standardWorkingHours`/`actualOvertimeDuration`, `lateEntry`/`earlyExit`, `inTime`/`outTime`,
  `halfDayStatus`, plus the company-confinement fix above. `Shift Assignment Tool` and `Employee
  Attendance Tool` fold to bulk-action endpoints (no stored model), matching `Leave Control Panel`'s
  precedent exactly — both are stateless scratchpad forms in source too, not stored entities.
- **Split into two stacked branches**: `feat/shift-attendance` (foundation — masters, `Shift
  Assignment`, `Shift Schedule`+`Assignment`, `Employee Checkin`+geofencing, extended `Attendance`,
  shift-occurrence/working-hours utilities) then a second branch (`Shift Request`, `Attendance
  Request`, both bulk-action tools, `processAutoAttendance`) — same reasoning and pattern as Leaves.
- **Consequences**: `OPEN-QUESTIONS.md` gets new rows for the `Overtime Type` retrofit and the
  simplified shift-occurrence resolver's edge-case gap.
- **Deviates from convention**: none beyond what's named above (a second, independent scheduler
  runner file rather than one shared array — reasoned above; the daily-not-hourly job cadence, an
  unavoidable consequence of Q-5's already-accepted dependency-free single-process scheduler).
- **As built (foundation half only — `feat/shift-attendance`)** — `ShiftType`, `ShiftLocation`,
  `ShiftAssignment`, `ShiftSchedule`, `ShiftScheduleAssignment` (+`generate` action), `EmployeeCheckin`,
  and extended `Attendance` (with `departmentId`, `shiftId`, `attendanceRequestId`, `workingHours`,
  `standardWorkingHours`, `actualOvertimeDuration`, `lateEntry`, `earlyExit`, `inTime`, `outTime`,
  `halfDayStatus`). Built the 4 pure calculation/occurrence utilities (`shiftOccurrence.js`, `geofence.js`,
  `workingHours.js`, `shiftSchedule.js`), write lock (`shiftAssignmentWrite.js`), and company/role scoping
  adapter (`attendanceScope.js`). Controllers, routes, swagger annotations, admin API clients, entity
  configs in `advanced.jsx` + `GenerateShiftsPanel` component, `widgetSources.js` entries for all 6 new
  sources + extended `attendances`, menu rows in a new "Shift & Attendance" menu group, and role permissions
  seeded (HR User/HR Manager full access, Employee read-only unscoped on `/shift-type`, read-only own-scoped
  on `/shift-assignment`, and read+write own-scoped on `/employee-checkin`).
  - **Judgment calls made**:
    - **Concurrency serialization on writes**: `withShiftWriteLock` serializes `ShiftAssignment` writes
      per employee (`employee:${employeeId}`) and `generate` executions per schedule assignment
      (`schedule:${id}`), ensuring concurrent manual or generated writes cannot pass overlap checks
      simultaneously under this project's single-process model.
    - **Effectively active is computed, not stored**: `isAssignmentCurrentlyActive` checks `status === "active"`
      and `(!endDate || dayStart(endDate) >= dayStart(asOfDate))` dynamically at validation and query time,
      avoiding any daily expiry sweep job.
    - **Immutability of linked checkins**: once `EmployeeCheckin.attendanceId` is linked, `time`, `employeeId`,
      and `logType` cannot be altered, preserving attendance integrity.
    - **Issue #14 fixed**: `listAttendanceByParams` in `attendance.controller.js` previously omitted `$lookup`
      for `Employee`, causing the list UI to fall back to raw ObjectIds. Added aggregation stages to join
      `Employee` and project both `employeeName` and `employeeIdLabel`, added `searchFields: ["employeeName", "status"]`,
      and added `shiftId` and `departmentId` population in `getAttendanceById`.
    - **Company confinement on Attendance and Dashboard Widgets**: `attendanceScope` enforces company boundary
      across all CRUD endpoints for `Attendance` and the new Shift & Attendance collections. In
      `dashboard.controller.js`, fixed `executeWidget` for `source.companyConfined` by ensuring
      `checkPermission` is properly imported and invoked, and applying `attendanceScope(req, source.employeeOwned)`
      to keep role dashboards confined.
    - **Docs-capture side effect & Issue #8 resolved**: Codex added `--screens=<comma-list>` to
      `scripts/docs-capture.js` and regenerated documentation pages for HRMS modules 1-8. Verified all
      generated pages are clean, accurate, and non-destructive. Committed in a separate commit and closed
      GitHub issue #8.
  - **Verified live**: `npm test` green (all 17 test suites, including `workingHours.test.js`,
    `geofence.test.js`, `shiftOccurrence.test.js`, `shiftSchedule.test.js`), `npm run seed` idempotent
    (0 new menu grants / 195 employees), `npm run build` clean. Full live HTTP walk executed via
    `scripts/verify-shift-attendance.mjs` against a running server (91 real HTTP assertions): CRUD for
    `ShiftType`, `ShiftLocation`, `ShiftSchedule`; active assignment overlap rejection and inactive
    allowance; `ShiftScheduleAssignment.generate` action advancing `createShiftsAfter` watermark;
    `EmployeeCheckin` creating punches with proper shift occurrence resolution (normal day shift, overnight
    shift crossing midnight, offshift detection), geofence acceptance and rejection (haversine radius check),
    duplicate punch guard, and time/link immutability once linked to Attendance; all 4 working hours modes
    verified against actual punches; company confinement confirmed for HR User and own-scope confirmed for
    Employee; live dashboard widget preview and run execution verified; and clean teardown confirming employee
    count returns to baseline 195.
- **As built (module complete)** — `ShiftRequest` (+`approve`/`reject`), `AttendanceRequest` (+`cancel`), the
  Shift Assignment Tool and Employee Attendance Tool bulk-action endpoints, and `processAutoAttendance` all
  built on `feat/shift-attendance-transactions`. Model, controller/routes (grouped in a sibling
  `shiftAttendanceTransactions.controller.js`/`.routes.js` rather than growing the foundation's
  `shiftAttendance.controller.js` further — same "large module, own file" precedent as `travel.controller.js`/
  `leavesTransactions.controller.js`), swagger, admin API client additions to the existing
  `shiftAttendance.api.jsx`, two entity-config screens (`shiftRequestConfig`/`attendanceRequestConfig` in
  `advanced.jsx`) plus two custom bulk-tool pages (`pages/ShiftAttendance/ShiftAssignmentTool.jsx`/
  `EmployeeAttendanceTool.jsx`), `widgetSources.js` entries and `docs-src/manifest.js` entries for every one of
  the four new screens/pages. This closes the module — `STATE.md`'s Shift & Attendance row moves to `done`
  across every phase except Shipped.
  - **`ShiftRequest` reuses `resolveApprovers`/ADR-024's approver mechanism verbatim** — confirmed live both
    ways: auto-resolution to an Employee's direct `shiftRequestApproverId`, and an explicitly-supplied approver
    validated against that same resolved set (rejected if the set is non-empty and doesn't contain the
    supplied id). No second, narrower approver rule was built for this one doctype, per ADR-025's own explicit
    instruction.
  - **The overlap-validation judgment call**: the task brief called for rejecting a `ShiftRequest` whose range
    overlaps "the same employee's actual shift timing", not just another `ShiftRequest`. Source's real rule is
    a start/end-time overlap test between two `Shift Type`s (`has_overlapping_timings`) — but that test only
    matters once multiple concurrent shifts are allowed, and ADR-025's foundation half already decided against
    that (no-multi-shift-per-employee-per-day, keeping the existing unique `(employeeId, attendanceDate)`
    index). Given that decision, "an existing active `ShiftAssignment` overlapping the requested date range"
    is the correct simplified stand-in — any two overlapping-date shifts conflict regardless of their specific
    timing, since only one may exist per day anyway. Implemented and named as a deliberate simplification, not
    a silently narrower port.
  - **`AttendanceRequest`'s target-status mapping was read from the real spec file**, not guessed: `half_day`
    on the configured `halfDayDate` wins, then `reason == "Work From Home"`, else `Present` — meaning `"On
    Duty"` (this project's other `reason` value, since no Payroll/On-Duty-tracking module exists yet to give it
    its own status) maps to `Present`, matching `get_attendance_status()` in `Attendance Request.md` exactly.
  - **The leave-backed-row skip is implemented literally as instructed** (check `Attendance.leaveApplicationId`
    directly), not by re-deriving "is this employee on approved leave" from `LeaveApplication` itself — simpler,
    and correct for how `LeaveApplication.approve` (ADR-024) already behaves: it always writes a definite
    `On Leave`/`Half Day` `Attendance` row with `leaveApplicationId` set, so there is no intermediate
    "pending" state to resolve, unlike source's own two-stage half-day mechanism (deliberately dropped, per
    ADR-025's own design note).
  - **The `EmployeeCheckin.shiftId` grouping judgment call for `processAutoAttendance`**: rather than
    re-resolving each checkin's shift occurrence from scratch (a second query per checkin against
    `ShiftAssignment`, with the risk of resolving to a *different* shift than the one the checkin was actually
    created under, if an assignment changed in between), the job groups directly off the `shiftId` the
    foundation half already populated at checkin-creation time (`shiftValidation.js`'s call into
    `resolveShiftOccurrence`), and derives only the *occurrence date* for each checkin using the exact same
    `shiftWindow`/`dayStart` math `matchShiftOccurrence` already uses, applied directly against the known
    `ShiftType`. Simpler, and consistent with what actually created the checkin in the first place.
  - **No watermark bookkeeping beyond `processAttendanceAfter`, extended from the absence sweep to
    checkin-grouping too**: ADR-025's own design named "yesterday-only, no watermark" for the absence sweep;
    this implementation applies the identical reasoning to the checkin-grouping half — a shift occurrence is
    only ever processed once it's dated strictly before "today" (so a shift still in progress is never marked
    from partial punches), and every daily run naturally catches up on whatever is still unlinked. Named
    explicitly (matching the absence sweep's own named limitation): a server stopped for several days does not
    backfill the gap, it only ever looks at "yesterday" on whichever day it next runs.
  - **The Shift Assignment Tool/Employee Attendance Tool request-shape judgment call**: both bulk tools take an
    explicit employee-id (or shift-request-id) list per item, built by an HR user multi-selecting from the
    full employee/request list in the admin page — the real tools' Branch/Department/Designation/Grade/
    Employment-Type quick-filter selection is a documented nice-to-have per the task brief, not built, to keep
    each endpoint's request surface small and controlled. Both bulk-assign endpoints and both Employee
    Attendance Tool endpoints were built (not just one action per tool) with per-item try/catch isolation.
  - **`bulk-assign-schedule` reuses the real generation logic, not a copy of it**: `shiftAttendance.
    controller.js`'s `generate` action was refactored from a single Express handler into a plain, reusable
    `generateShiftsForScheduleAssignment(shiftScheduleAssignmentId, req, endDate)` function plus a thin HTTP
    wrapper — the exact same split `leaves.controller.js` already established for
    `grantAllocationsForAssignment`/`grantLeavePolicyAssignmentAllocations` (AGENTS.md #2: reuse before you
    write). The bulk tool calls that function directly per employee, so "assign a schedule via the tool" and
    "generate via the schedule assignment's own button" can never drift apart into two implementations of the
    same algorithm.
  - **A real pre-existing bug found and fixed, filed as GitHub issue #15**: the foundation half's own
    `SHIFT_TYPES`/`SHIFT_LOCATIONS`/`SHIFT_ASSIGNMENTS`/`SHIFT_SCHEDULES`/`SHIFT_SCHEDULE_ASSIGNMENTS`/
    `EMPLOYEE_CHECKINS` entries in `apps/admin/src/api/endpoints.jsx` were bare paths (`/shift-types`), missing
    the `${V1}` (`/api/v1`) prefix every other endpoint group in that file uses — and the admin axios client's
    `baseURL` is the bare host with no `/api/v1` of its own (`server.js` mounts `shiftAttendance.routes.js`
    under `/api/v1`). Every one of the six foundation Shift & Attendance admin screens was therefore 404ing on
    every list/create/edit/delete call — a completely non-functional foundation UI that had never been
    exercised against a real running server before now. Found while extending the same file for this fork's
    own new endpoints (`SHIFT_REQUESTS`/`ATTENDANCE_REQUESTS`/the two tools), fixed by adding the prefix to all
    six pre-existing entries in the same commit.
  - **Verified live**: `npm test` green (18 suites, including new `attendanceAutoStatus.test.js` covering
    `selectWorkingHoursFn`'s four-combination selection, `decideAttendanceStatus`'s strict-`<`
    Absent-then-Half-Day threshold order including the "both thresholds at their schema default of 0" no-op
    case, and `computeLateEarlyFlags`'s grace-period math including the "marking disabled returns `null`, not
    `false`" distinction), `npm run seed` run twice (idempotent — 9 new menu grants the first run, 0 the
    second, 195 employees both times), `npm run build` clean. Full live HTTP walk via
    `scripts/verify-shift-attendance-transactions.mjs` against a running server (38 real HTTP assertions plus
    direct model/job assertions covering everything an HTTP round-trip can't observe): `ShiftRequest` create
    with both overlap rejections (another open Shift Request, an existing active Shift Assignment), approver
    auto-resolve and explicit-supplied-and-validated both confirmed against a real throwaway approver `User`
    (this seed data has no active Employee with its own linked User account, so a real one had to be created),
    `approve` confirmed to create the right `ShiftAssignment` through the write-locked path (not a bypass, and
    itself still subject to `ShiftAssignment`'s own overlap rule), `reject` confirmed to have zero side
    effects; `AttendanceRequest` create confirmed to create the right `Attendance` rows with holiday-skip and
    leave-backed-row-skip both confirmed against constructed fixtures (a real `HolidayList`+
    `HolidayListAssignment`, and a pre-existing `Attendance` row carrying a synthetic `leaveApplicationId`),
    `includeHolidays` confirmed, `cancel` confirmed to soft-delete exactly its own request's rows without
    touching a sibling request's, the immutability guard (`PUT` always 400s) confirmed; both bulk-action tools
    confirmed with mixed batches (2 succeed, 1 deliberately fails — an overlapping assignment, an
    already-rejected request, a non-existent employee id) proving per-item isolation on every one of the four
    endpoints, `bulk-assign-schedule` confirmed to actually invoke real shift generation (not a stub);
    `processAutoAttendance` manually invoked directly (bypassing the day-granularity scheduler gate) against
    constructed `EmployeeCheckin`/`ShiftAssignment` fixtures covering a normal Present day (8.0h, worked-hours
    value asserted exactly), an Absent-by-threshold day (0.5h), a Half-Day-by-threshold day (5.0h),
    late-entry+early-exit flagging together on one day (30-minute lateness/earliness against a 10-minute
    grace), the leave-backed-row skip (confirmed the pre-existing row's `status` AND its checkins'
    `attendanceId` were both left completely untouched), and the yesterday-only absence sweep for an employee
    with an active assignment and zero checkins — confirmed idempotent on an immediate second run (zero new
    checkin-group rows created, no duplicate absence row). Every throwaway fixture cleaned up via tracked
    deletion in a `finally` block; employee count confirmed back to baseline 195 both before and after.

---

### ADR-026 — Payroll (Structure & Assignment): a real bounded formula evaluator, GL dropped entirely, Q-14 finally retrofitted

- **Date**: 2026-09-11
- **Status**: accepted
- **Context**: `system-design` for HRMS module 10 — the first Payroll module, following Shift &
  Attendance (module 9, ADR-025). Read a Claude fork's research pass in full: `_Module-Spec.md` and
  all 6 real per-doctype specs in scope (`Salary Component`, `Salary Component Account`, `Salary
  Detail`, `Salary Structure`, `Salary Structure Assignment`, `Bulk Salary Structure Assignment`),
  plus this project's own current code (`Employee.js`, ADR-016's no-GL rule, ADR-024's Leave
  Encashment/Q-14, `OPEN-QUESTIONS.md` Q-3/13/14/15).
- **GL is dropped entirely, with nothing load-bearing lost.** The research confirmed `Salary
  Component Account` (per-company GL account mapping) has **no consumer inside this module's own
  scope** — its only real use in source is a Salary Slip helper (module 11, "Payroll — Run", not
  built yet) resolving "which component is THE tax component per company," and that resolution path
  turns out to be a *different* function than the one `Salary Structure Assignment` itself uses for
  its own tax-slab-mandatory check (which reads the structure's deduction-row flags directly, no
  account lookup). Dropped along with it: `payrollPayableAccount`, `modeOfPayment`/`paymentAccount`,
  `Salary Structure.letterHead` — all GL/accounting-adjacent, all colliding with ADR-016's explicit
  "no GL" line, none needed for anything this module actually computes.
- **A real, bounded formula evaluator gets built — this is not a shortcut-able piece.** Source's
  `condition`/`formula` fields are live Python-expression text, sandboxed via an AST denylist. The
  research is explicit that this is "a significant, non-trivial subsystem... its own design task, not
  a one-line port," and offers two paths: a small equivalent interpreter, or an embedded scripting
  engine. Decision: **a small, hand-written, safe expression evaluator** (`utils/payrollFormula.js`)
  — no `eval()`/`Function()` (these formulas are stored, user-editable text; treating them as
  trusted-enough-to-`eval` would be a real security hole, not a shortcut worth taking), no new npm
  dependency (AGENTS.md hard rule — a from-scratch recursive-descent parser over arithmetic +
  comparison + boolean operators + a short function allowlist is not "a library's job," it's a
  bounded, well-specified piece of business logic exactly like `leaveProration.js`/`workingHours.js`
  before it). Supports: `+ - * /`, parentheses, numeric literals, comparison (`== != < > <= >=`),
  boolean (`and`/`or`/`not`), and `round`/`min`/`max`/`ceil`/`floor`. Variables available: every
  already-evaluated component's abbreviation (earnings evaluate first and inject their resolved
  value before deductions run, deductions before employer contributions — matching source's real
  ordering exactly, since a formula can reference an earlier row's abbreviation) plus `base`/
  `variable` off the `SalaryStructureAssignment` itself. **This is scoped to what this module
  actually needs — a static CTC/gross *preview* at assignment time, not a real payroll run.** Source
  seeds a synthetic "full pay cycle, zero leave" period for this exact reason (no real Salary Slip
  exists yet to evaluate against); this project does the same — `paymentDays`/`totalWorkingDays` are
  both derived from `payrollFrequency` alone (Monthly→30, Fortnightly→15, Weekly→7, Daily→1,
  Bimonthly→60), zero LWP/absent days assumed. **The moment this stops being accurate is Payroll —
  Run (module 11)**, whose real `Salary Slip` needs the *actual* attendance-derived payment-days
  context — flagged here explicitly so nobody mistakes this preview-only evaluator for the real
  payroll-run engine; it is a deliberately narrower reuse target, not the finished subsystem.
- **`total_earning`/`total_deduction`/`net_pay` move from source's client-JS-only computation to a
  real server-side calculation** — a flagged source gap (this project's server-authoritative
  convention doesn't tolerate a client-computed-only total), closed here as a deliberate improvement,
  same category as prior modules' "closes a flagged gap" fixes (Employee Separation's duplicate
  guard, module 5). Same for `payrollFrequency`: source requires it only client-side; this project
  adds the server-side `required` the source spec itself flags as missing.
- **The CTC/gross formula, reproduced exactly minus the GL-specific term**: `PERIODS_PER_YEAR =
  { Monthly: 12, Fortnightly: 26, Bimonthly: 24, Weekly: 52, Daily: 365 }`; `grossPerPeriod =
  Σ(earnings.amount)` excluding rows flagged `statisticalComponent`/`doNotIncludeInTotal`;
  `annualGrossEarning = grossPerPeriod × periodsPerYear`; `ctc = (grossPerPeriod +
  employerContributionsTotal) × periodsPerYear` (source's `non_payable_earnings` term was itself
  GL-account-derived and is dropped along with the rest of that surface).
- **`Salary Structure Assignment`'s real uniqueness invariant, reproduced exactly**: source enforces
  only an exact-duplicate-`from_date`-per-employee guard — it does **not** prevent multiple different
  `fromDate`s coexisting, and deliberately has **no `toDate` field at all**. "Current as of a date" is
  resolved by a separate query (latest assignment with `fromDate <= onDate`, no company filter) —
  built here as `getCurrentSalaryStructureAssignment(employeeId, asOfDate)`, the same "resolver
  utility, not a stored current-flag" shape as Leaves' `getLeaveBalance`. Do not invent an overlap
  guard or a `toDate` field source doesn't have.
- **Everything the research flagged as belonging to a future module is deferred, not stubbed**:
  `incomeTaxSlabId` (+ its mandatory-if-tax-component validation) → "Tax & Exemptions"; `employee
  Benefits`/`maxBenefits` capping → "Payroll — Benefits"; `payrollCostCenters` (+100%-split
  validation) → "Payroll — Adjustments & Incentives"; `taxDeductedTillDate`/`taxableEarningsTillDate`
  "opening balances" → "Payroll — Run". None of these fields exist in this module's schema at all
  (not even as inert placeholders) — same forward-dependency-deferral discipline as `Overtime Type`
  (ADR-025) and `expenseType` (ADR-023), each retrofitted only once its real target module exists.
  `Salary Component`'s benefit-related fields (`isFlexibleBenefit`/`maxBenefitAmount`/`payoutMethod`)
  and `finalCycleAccrualPayout` are dropped for the same reason — inert without Benefits. `Salary
  Structure.isDefault` is a **dead field in source itself** (schema exists, zero code reads or writes
  it) — omitted entirely rather than ported as inert dead weight.
- **Q-14 finally closes for real**: `SalaryStructureAssignment.leaveEncashmentAmountPerDay` (fetched
  from `SalaryStructure.leaveEncashmentAmountPerDay`, matching source's real `fetch_from`+
  `fetch_if_empty` field exactly) is the actual field Leave Encashment's per-day rate should derive
  from. `LeaveEncashment`'s create path (ADR-024, module 8) is retrofitted: when
  `perDayEncashmentAmount` isn't explicitly supplied, resolve the employee's current
  `SalaryStructureAssignment` via `getCurrentSalaryStructureAssignment` as of the encashment date and
  default to its `leaveEncashmentAmountPerDay` — falling back to the existing manual-entry behavior
  only when no assignment resolves. This is the first of the three forward-dependency gaps named
  across modules 4/8/9 to actually close.
- **Bulk Salary Structure Assignment stays a stateless bulk-action endpoint pair, no stored model** —
  source's own doctype is a non-persistent Single "tool," matching `Leave Control Panel`/`Shift
  Assignment Tool`'s established precedent exactly. Both `assign_salary_structure`'s (`Salary
  Structure`'s own bulk-assign) and the dedicated `Bulk Salary Structure Assignment`'s creation logic
  reuse a single shared function (`createSalaryStructureAssignment`) in source — reproduced the same
  way here (AGENTS.md #2: reuse before you write). Source's own 20-vs-30-employee synchronous/
  background thresholds are two independently-hardcoded numbers tuned for Frappe's queue
  infrastructure — this project has none (60-limits.md) and no real queue at this scale (195
  employees); every bulk action in this project so far (Leave Control Panel, Shift Assignment Tool)
  has run synchronously with per-item try/catch isolation regardless of batch size, and this module
  does the same — no synchronous/background split to invent.
- **Docstatus folding (ADR-016)**: `Salary Structure` already has a real `isActive` (Yes/No) field
  in source distinct from docstatus — that's the only "is this usable" signal this project needs, no
  separate status field invented. `Salary Structure Assignment` has no custom status at all beyond
  the generic docstatus this project already drops — plain records, no status field needed (its real
  "supersede" semantics are entirely captured by the `fromDate`-ordering resolver above, not a
  status).
- **Decision — models**: `SalaryComponent` (master: `salaryComponentName`, `abbreviation`
  auto-derived-and-deduped, `type` enum Earning/Deduction/EmployerContribution, `isTaxApplicable`,
  `dependsOnPaymentDays`, `doNotIncludeInTotal`, `statisticalComponent`, `roundToNearestInteger`,
  `exemptedFromIncomeTax`, `removeIfZeroValued`, `variableBasedOnTaxableSalary`, `arrearComponent`
  (mutually exclusive with `variableBasedOnTaxableSalary`, validated), `accrualComponent`
  (Earning-only, validated), `companyId`, `isActive`); `SalaryStructure` (+ embedded
  `earnings[]`/`deductions[]`/`employerContributions[]` `SalaryDetail` rows — each a **one-time
  denormalized copy** of its component's flags at row-creation time, matching source's explicit
  "historical rows don't retroactively change" behavior — `companyId`, `payrollFrequency` (server-
  required), `isActive`, `leaveEncashmentAmountPerDay`, server-computed `totalEarning`/
  `totalDeduction`/`netPay`, `currency`); `SalaryStructureAssignment` (`employeeId`, `salaryStructureId`,
  `fromDate`, `companyId`, `base`, `variable`, server-computed `annualGrossEarning`/`ctc`, `currency`
  fetched from structure, `leaveEncashmentAmountPerDay` fetched from structure). `Bulk Salary
  Structure Assignment` → two bulk-action endpoints, no model, matching precedent.
- **Consequences**: `OPEN-QUESTIONS.md` Q-14 closes, pointing here. Q-13/Q-15 stay open (this
  module's scope doesn't touch either). New rows for `incomeTaxSlabId`/`employeeBenefits`/
  `payrollCostCenters`/`taxDeductedTillDate` deferrals, parallel to the existing Q-13/14/15 format.
- **Deviates from convention**: a hand-written formula-expression evaluator is a genuinely new kind
  of component for this codebase (every prior "pure calculation utility" — pro-ration, working
  hours, shift occurrence — computed a fixed, known formula; this one *interprets user-authored
  formula text*). Not a deviation from any existing decision, just named here as a first, since the
  next agent touching it should know it's parsing untrusted-ish text and must stay off `eval`.
- **As built**: everything above shipped on `feat/payroll-structure`, built directly against this
  design — no re-litigation of any decision above. `SalaryComponent` (abbreviation auto-derived +
  deduped, mutual-exclusion and accrual-only-on-Earning guards, no GL/Benefits fields), the formula
  evaluator (`utils/payrollFormula.js` — recursive-descent tokenizer/parser, `evaluateFormula`/
  `evaluateCondition`, no `eval`), `SalaryStructure` (embedded `SalaryDetail` rows, server-computed
  `totalEarning`/`totalDeduction`/`netPay` via a new shared `utils/payrollCtc.js`),
  `SalaryStructureAssignment` (server-computed `annualGrossEarning`/`ctc`, same `payrollCtc.js`
  machinery with real `base`/`variable`), `getCurrentSalaryStructureAssignment`
  (`utils/payrollAssignment.js`), and the Bulk Salary Structure Assignment tool (`eligible-employees`
  + `assign`, both reusing one `createSalaryStructureAssignmentCore` function). Q-14 closed: `Leave
  Encashment`'s `perDayEncashmentAmount` is now optional, resolving from
  `getCurrentSalaryStructureAssignment` when omitted.
  - **Judgment calls this design left open**:
    - **Abbreviation dedup scope is `companyId`, not global.** Source has no `company` field on
      Salary Component at all (single-tenant); this project is multi-company, and an abbreviation
      only has to be unique within the company whose formulas actually reference it via
      `evaluateComponentTable`'s injected context. A cross-company name collision (two different
      companies both naming a component "Basic Salary") is legal and expected — each gets its own
      "BS", independently.
    - **A condition-gated row that evaluates false gets NO entry in the formula context at all** —
      not even a `0`. This matches source's `_evaluate_component_table` exactly: the `continue`
      happens *before* the `data[row.abbr] = ...` injection line, so a later row referencing that
      abbreviation by name gets `evaluateFormula`'s real "undefined variable" error, not a silent 0.
      Confirmed with a dedicated `payrollCtc.test.js` case (a skipped row's abbreviation is absent
      from `context` via `hasOwnProperty`, not merely falsy) and reproduced live in
      `scripts/verify-payroll-structure.mjs`.
    - **`totalEarning` excludes `statisticalComponent`/`doNotIncludeInTotal` rows (matches source's
      real `gross_pay` computation); `totalDeduction` does not exclude anything.** The real spec
      (`Salary Structure Assignment.md`'s `_evaluate_all_components`) only ever filters the earnings
      side when building `gross_pay`/CTC — nothing in source filters a deduction row out of any
      total anywhere. Read literally rather than assumed-symmetric: inventing a deduction-side
      exclusion nobody asked for would be scope creep in the wrong direction.
    - **One-time denormalization is enforced by matching a `SalaryDetail` row's Mongoose subdocument
      `_id` across an update**, not by position in the array. A row whose `_id` matches an existing
      subdocument keeps its already-copied flags untouched (only `amount`/`formula`/`condition`/
      `amountBasedOnFormula` are taken from the incoming payload); a row with no matching `_id` is
      treated as brand-new and gets a fresh flag snapshot copied from its `SalaryComponent` right
      then. The admin UI's `SimpleArrayField` round-trips `_id` as an ordinary (if UI-invisible) key
      on each row object precisely so this works without a dedicated array-diffing UI.
    - **The admin Salary Structure screen does not expose the copied flags (`statisticalComponent`,
      `isTaxApplicable`, etc.) as editable checkboxes**, only `salaryComponentId`/`amount`/`formula`/
      `condition`/`amountBasedOnFormula`. `SimpleArrayField` defaults every checkbox column to
      `false` on a brand-new row — exposing e.g. `statisticalComponent` there would silently override
      a component whose real default is `true` unless a user remembered to tick it by hand. The
      fields themselves are still ordinary, independently-editable schema fields any direct API
      caller can set — this is a UI-screen scope limit, not a backend one.
    - **Company confinement reuses `attendanceScope(req, false)`** (ADR-025) across all three
      collections rather than inventing a second company-scoping helper — the function is generic
      enough (it degrades to a plain `{ companyId }` filter when `employeeOwned` is false) despite
      its shift-and-attendance-flavored name. Same choice made for the three `widgetSources.js`
      entries (`companyConfined: true, employeeOwned: false`).
  - **Bug found and fixed — GitHub issue #16, closed same session**: `updateEmployeeGrade`
    (`organizationSetup.controller.js`) unconditionally overwrote `gradeName`/`isActive` from the
    request body with no `!== undefined` guard — the identical bug class already found and fixed in
    `updateDesignation` before module 6. Surfaced because this module was the first to add a second
    field (`defaultSalaryStructureId`/`defaultBasePay`) to that handler since it was written; without
    the fix, any partial update omitting either original field would have silently dropped it.
  - **Phase 7.5 (client-docs prose + screenshots) was deliberately skipped**, named rather than
    silently dropped — the task scoping this module named phases 2-8 explicitly, and asked only for
    `docs-src/manifest.js` registration (done, all 4 screens/pages), not the generated end-user pages
    or the screenshot capture pass. `npm run docs` has not been re-run for this module.
  - **Verified live**: `npm test` green (21 suites — `payrollFormula.test.js`, `payrollCtc.test.js`,
    `payrollAbbreviation.test.js` all new and passing, arithmetic/comparison/boolean/functions/
    variables/errors all covered plus a combined case), `npm run seed` run twice (idempotent — 8 new
    Payroll menu grants first run, 0 second run, 195 employees both times), `npm run build` clean.
    Full HTTP walk via `scripts/verify-payroll-structure.mjs` (29 real assertions): `SalaryComponent`
    CRUD, abbreviation auto-derivation ("Basic Salary" -> "BS") and company-scoped dedup ("Bright
    Star" -> "BS_1") confirmed, both guards (mutual-exclusion, accrual-only-on-Earning) confirmed as
    400s; `SalaryStructure` create with flat + formula-based rows hand-checked (totalEarning=42000
    excluding a statistical row, totalDeduction=1800, netPay=40200), a row's formula referencing an
    earlier row's abbreviation confirmed (HRA = BS*0.4 = 12000), a condition-gated row confirmed
    skipped when false; `SalaryStructureAssignment` create hand-checked against a genuinely
    base-dependent structure (base=50000 -> annualGrossEarning=840000, ctc=912000), exact-duplicate-
    fromDate 400 confirmed, a second later-fromDate assignment confirmed to succeed (not an overlap),
    `getCurrentSalaryStructureAssignment` confirmed to resolve the earlier one before the later
    `fromDate` and the later one after it; bulk assignment confirmed with a mixed batch (2 succeed,
    then a deliberate duplicate-fromDate re-run fails in isolation) plus the eligible-employees
    dedupe confirmed both directions (eligible before assigning, excluded after); Q-14 confirmed live
    three ways (defaults from the current assignment, an explicit override still works, 400 when
    neither resolves). All throwaway fixtures cleaned up; employee count and all three new
    collections' counts back to baseline/0.

