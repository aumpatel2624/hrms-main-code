---
name: new-page
description: Add or change an admin screen — list, form, table, filter, dashboard. Read BEFORE creating any file under apps/admin/src/pages; most screens are config objects, not page files. Use for any work in apps/admin. Runs after api-endpoint.
---

# New page

Procedure. **Reference — read it, it has the config shape and the reasoning:**
`docs/conventions/40-frontend.md`.

**Fourteen of twenty-two screens have no page file.** They are config objects in
`apps/admin/src/entities/`. About to write a component that lists records with add/edit/view/delete?
Stop — that is a config object.

## Gate

Endpoints exist and `apps/admin/src/api/*.api.jsx` wrappers are written (`api-endpoint`). A config's
`api` block references those functions directly.

## Steps

1. **Pick the branch and say which, and why:**
   - CRUD, plain fields → config in `entities/index.js`, appended to `UNIFORM_ENTITIES`. Routes
     generate themselves; do not touch `allRoutes.jsx`.
   - CRUD needing reshaped payloads, cascading selects, conditional fields or an extra panel →
     config in `entities/advanced.jsx`, appended to `ADVANCED_ENTITIES`. Use the documented hooks;
     **do not fork the CRUD components.**
   - CRUD list, but the *form* is genuinely not — an editor whose value is a live preview or a
     canvas → keep the config for the list, replace only the form routes. `crudRoutes(config)`
     returns a plain array, so `allRoutes.jsx` takes its first entry and points add/view/edit at a
     page file. Keep that config **out of** `ADVANCED_ENTITIES` or it regenerates the very routes
     you are replacing. `seoPageConfig` + `SeoPageEditor.jsx` is the example.
   - Genuinely not CRUD (matrix, dashboard, report, settings singleton) → page file in
     `pages/<Section>/`, registered in `Routes/allRoutes.jsx`. Needs a line in the ADR.
     `UserRoles.jsx`, `DashboardBuilder.jsx` and `SeoSettings.jsx` are examples.
2. **Write the config** — copy the closest existing one. Reuse the `ACTIVE` constant and the
   `asOptions` helper already at the top of the file.
3. **Check the view screen** — `/:id` renders from the same config: the form's `sections`, minus
   passwords, with `select` values resolved through `config.lookups`. A relation shown as an
   ObjectId means the lookup is missing, not that the view screen needs a fork. Hide a field with
   `hideIn: ["view"]`; swap the list with `viewFields`; reshape the record with `toView`.
4. **Add the seed menu row** to `MENU_GROUPS` in `apps/server/seed/index.js`, then `npm run seed`.
5. **Custom pages only** — gate on `currentPagePermissions` from `MenuContext` yourself, handle both
   delete-failure paths, and set `document.title`. The CRUD components do this for you.

## Must not get wrong

- **No menu row = invisible to every non-admin user**, with all-false permissions. Admins bypass the
  matrix, so it looks fine to you and is broken for everyone else. This is the most-missed step.
- **`filterFields` must mirror the server's `filterable`** — same names, same types.
- **`sortable: true` needs a `sortField` that appears in the server's `filterable`**, or sorting
  silently falls back to `createdAt` and the column does nothing.
- **`config.path` must equal the menu row's `menuUrl`** — permissions resolve by URL match.
- **Never edit `components/base/` or `components/application/`** — vendored Untitled UI. Wrap in
  `components/ui/` instead.
- Semantic Tailwind tokens only; raw colours break dark mode. There is no `tailwind.config.js` —
  do not create one.
- No react-query, no state library. Plain `useState`/`useEffect`, like `CrudList`.

## Done when

- [ ] Branch stated and justified; config registered in the right array
- [ ] `filterFields` matches `filterable`; every `sortable` column has a valid `sortField`
- [ ] `config.path` equals the menu row's `menuUrl`
- [ ] **Menu row added and `npm run seed` re-run**
- [ ] Permissions gate the add button and row actions
- [ ] View screen checked: no raw ObjectIds, no password field, sections read in the right order
- [ ] Opened in the browser and exercised, dark mode included

## Next

`verify` — check it as a non-admin user, not only as admin.
