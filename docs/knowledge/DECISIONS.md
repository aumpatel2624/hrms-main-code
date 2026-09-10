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
- **As built**: pending — implementation follows in the same session.

