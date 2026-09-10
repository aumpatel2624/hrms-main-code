---
name: api-endpoint
description: Wire Express routes and controllers in apps/server plus the admin API client. Use when adding or changing an endpoint, a search/filter endpoint, a response shape, validation, or an auth guard. Runs after schema-design, before new-page.
---

# API endpoint

Procedure. **Reference — read it, it has the code and the reasoning:**
`docs/conventions/30-api.md`.

## Gate

The model exists with its indexes declared (`schema-design`). Writing a `filterable` map against an
unindexed model builds in a collection scan.

## Steps

1. **Route** — add to the existing domain router if one fits (`locations`, `emails`, `menus`); new
   routers register in `apps/server/server.js`. Six endpoints per entity, plural kebab-case, id param
   named after the entity. Copy `routes/v1/departments.routes.js`.
2. **Guard** — `authMiddleware(ANY_ROLE)` or `ADMIN_ONLY` from `@demo-panel/shared/roles`, then
   `checkPermission(menuUrl, action)` on anything belonging to an admin screen. Both chosen
   deliberately per route. Never leave a route unguarded — the one exception is the public SEO
   router, and its four-question gate is in `30-api.md` under *Public endpoints*.
3. **Validation** — `allowOnlyFields(...)` then a chain from
   `middlewares/inputValidator.js`, before the controller.
4. **Controller** — copy `controllers/v1/department.controller.js`. Destructure `req.body`; never
   spread it.
5. **Search** — `runListQuery(Model, req.body, { searchFields, filterable, stages })`. Never
   hand-roll the aggregation.
6. **Delete** — `getReferencingCounts()` first, 409 with the exact shape in the reference.
7. **Swagger** — a JSDoc block per route, reusing the shared schemas in `config/swagger.js`.
8. **Admin client** — `apps/admin/src/api/endpoints.jsx` (the URL) + `<domain>.api.jsx` (the
   wrapper). The endpoint is not done without these.

## Must not get wrong

- **`filterable` is a trust boundary.** Client-supplied field names, allowlisted. Never widen it to
  "whatever the model has"; never build a match from `req.body`.
- **Three things must agree:** `filterable` (controller) ↔ `filterFields` (entity config) ↔ the
  indexes. A mismatch is a control that 400s or a filter nobody can reach.
- **The matrix only protects a route that asks for it.** `checkPermission(menuUrl, action)` enforces
  it server-side (ADR-002), but it is per-route middleware, not ambient — a route without it is
  open to any logged-in user. `menuUrl` must match a seeded `MenuMaster.menuUrl` exactly; a typo
  fails closed for every non-admin and looks fine to you, because ADMIN bypasses.
- **A public route is a deviation and needs an ADR.** Read-only, resolve-by-key never a listing,
  writes behind a shared secret, fails closed when unconfigured. See `30-api.md`.
- **`isOk` agrees with the HTTP status.** `createDepartment` returns `isOk: true` with a 400 — a bug,
  not a pattern.
- **`/search` returns `data: [{ count, data }]`**, unlike every other endpoint. Do not "fix" it on one.
- Never return a password or a raw `error.message`.

## Done when

- [ ] Six endpoints, or a stated reason per omission
- [ ] Every route guarded; role and `checkPermission(menuUrl, action)` chosen deliberately
- [ ] Validation chain on every mutating route
- [ ] `filterable` matches `filterFields` and the indexes
- [ ] Delete returns the 409 reference shape
- [ ] Swagger block per route; `endpoints.jsx` + `*.api.jsx` written
- [ ] Actually called once — curl or the running admin, not just written

## Next

`new-page`
