# Architecture

Reference for how this starter is put together. Read once before your first change.
The *process* you must follow lives in [AGENTS.md](../../AGENTS.md); this file is the map.

## The app registry

npm workspaces (`apps/*`, `packages/*`). **This table is the source of truth for what exists.**
Adding or porting an app means adding a row — use the `add-app` skill, which walks the whole
registration.

| Workspace | Type | Stack | Governed by | Agent config |
|---|---|---|---|---|
| `apps/server` | api | Express 4 + Mongoose 8, ESM | [20-schema.md](20-schema.md), [30-api.md](30-api.md) | `.cursor/rules/server.mdc` |
| `apps/admin` | spa | Vite 7 + React 19, Tailwind v4, Untitled UI | [40-frontend.md](40-frontend.md) | `.cursor/rules/admin.mdc` |
| `packages/shared` | lib | Plain ESM, no dependencies | this file | — |

The starter ships with two apps. It is built to grow: more services, more frontends, apps ported in
from other projects. **The pipeline in [AGENTS.md](../../AGENTS.md) is stack-agnostic and already
covers them** — what is stack-specific is only the "Governed by" column. An app whose type has no
conventions doc gets one written for it; that is the extension point.

## Rules every workspace follows

Independent of stack. A ported app is brought into line with these before it is considered landed.

- **Name** `@demo-panel/<dir>` in its `package.json`, matching its directory. `"private": true` on
  anything not published.
- **`"type": "module"`.** The whole repo is ESM.
- **A `dev` script.** The root `npm run dev` runs `concurrently "npm:dev:*"`, which picks up every
  root-level `dev:<name>` script automatically — so adding `"dev:worker": "npm run dev -w
  @demo-panel/worker"` is all it takes to join the dev loop.
- **`.env.example`, committed; `.env`, never.** Every variable documented with a comment.
- **Build output gitignored** and never edited. Add its path to `.gitignore`.
- **Cross-app code goes in `packages/shared`.** Never import across `apps/*` — two apps needing the
  same rule means it belongs in `shared`, and duplicating it in both is a bug.
- **Depend on the root Node engine** (`>=22`) rather than pinning a different one.
- **Node built-ins and existing dependencies before new ones.** Check what the workspace already has
  before adding to `package.json`.

`packages/shared` is the only place a rule may live twice-used. It exports via subpaths —
`@demo-panel/shared/roles`, `/permissions`, `/validation`, `/auth`. If a constant is needed on both
sides (a password policy, a lockout threshold, a permission key list), it goes here. Duplicating it
in both apps is a bug; nodemon watches this package so the server picks up changes.

## Request lifecycle

```
Browser
  └─ apps/admin/src/api/*.api.jsx        thin per-domain axios wrappers
       └─ apps/admin/src/api/index.jsx   the ONE axios instance (withCredentials: true)
            └─ apps/admin/src/api/endpoints.jsx   every URL string, nowhere else
                 │
                 ▼  POST /api/v1/<resource>/search
            apps/server/server.js        mounts all routers under /api/v1
              └─ routes/v1/*.routes.js   swagger JSDoc + middleware chain
                   └─ authMiddleware(roles)
                   └─ checkPermission(menuUrl, action)      (matrix-governed routes)
                   └─ allowOnlyFields / express-validator   (where applied)
                        └─ controllers/v1/*.controller.js
                             └─ utils/listQuery.js  runListQuery()   ← all list endpoints
                             └─ utils/referenceHelper.js             ← all delete endpoints
                                  └─ models/*.js   mongoose
                                       └─ models/softDelete.js  ← global plugin: hides
                                          deleted documents from every read above
                                       └─ models/auditPlugin.js ← global plugin: records
                                          every write made inside a logged-in request
```

Auth is a **cookie session** (`express-session` + `connect-mongo`, cookie name `sessionId`), not a
JWT. `config/swagger.js` still advertises a `bearerAuth` scheme — that is stale, ignore it.

## Production topology

One process. `apps/admin` builds into `apps/server/out/admin`, and `server.js` serves it with
`express.static` plus an SPA catch-all. So in production `config.API_URL === ""` and every request
is same-origin; in development the SPA runs on Vite's port 3000 and talks cross-origin to
`VITE_API_URL_DEV`.

`apps/server/out/` is generated and gitignored. Never edit anything under it.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | server (nodemon) + admin (Vite) together |
| `npm run seed` | idempotent: upserts menu groups/menus and the first admin user |
| `npm run build` | admin SPA → `apps/server/out/admin` |
| `npm run serve` | build, then start — the production shape |
| `npm test` | plain `node:assert` scripts, one per pure util. No test framework is installed |

There is **no migration system**. Mongoose applies index changes on boot; a schema change takes
effect immediately for new writes and leaves existing documents untouched. Backfills are one-off
scripts — see [20-schema.md](20-schema.md).

## Where things live

| You need to… | Go to |
|---|---|
| add a collection | `apps/server/models/` |
| add endpoints | `apps/server/routes/v1/` + `apps/server/controllers/v1/` |
| add a CRUD screen | `apps/admin/src/entities/` — **a config object, not a page file** |
| add a non-CRUD screen | `apps/admin/src/pages/` + register in `apps/admin/src/Routes/allRoutes.jsx` |
| add an API call | `apps/admin/src/api/endpoints.jsx` + `apps/admin/src/api/*.api.jsx` |
| make a screen visible | `apps/server/seed/index.js` — a menu row is mandatory |
| share a constant | `packages/shared/src/` |
| see who changed a record | nothing to write — `models/auditPlugin.js` records it; read it at `/audit-log` |
| make a collection chartable on dashboards | `apps/server/config/widgetSources.js` — one registry entry (ADR-003) |
| expose something to the public website | `apps/server/routes/v1/seoPublic.routes.js` — the only unauthenticated router; read the rules in [30-api.md](30-api.md#public-endpoints) before adding a second |
| **add or port a whole app** | the `add-app` skill — it updates this registry, the root scripts, the agent configs and the hooks |

Routers are grouped by **domain, not entity**: `locations.routes.js` serves countries, states and
cities; `emails.routes.js` serves all three email entities; `menus.routes.js` serves menu groups and
menus. Follow that — do not create a router per model when a domain router already fits.

## Known deviations — do not copy these

The starter has rough edges. They are real code you will see; they are not the convention.

1. **`createDepartment`** uses `&&` where it means `||` (so it only rejects when *both* fields are
   missing) and returns `isOk: true` alongside HTTP 400. Both are wrong.
2. **`mongoose.set("debug", true)`** is unconditional in `server.js` — every query is logged, in
   production too.
3. **`apps/admin/eslint.config.js`** is eslintrc-shaped in a flat-config filename, and `eslint` is
   not an admin devDependency. `npm run lint -w @demo-panel/admin` does not run.
4. **Two response envelopes coexist**: controllers return `{ isOk, … }`, `authMiddleware` returns
   `{ success, … }`. New code uses `isOk`.

Two former entries closed in ADR-002 (2026-08-17): the permission matrix is now enforced
server-side by `checkPermission` — see
[30-api.md](30-api.md#authorisation-the-matrix-and-the-scope) — and the location GETs are
guarded.

If you fix one of these, do it as its own change with its own commit — not as a side effect of
building a feature.
