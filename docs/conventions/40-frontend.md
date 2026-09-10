# Frontend conventions

Vite 7 + React 19 SPA, React Router v6, Tailwind v4, Untitled UI vendored as source.
Used by the `new-page` skill.

## Most screens are not page files

14 of the 22 admin screens have no page file. They are **declarative config objects** in
`apps/admin/src/entities/`, expanded into four routes each and rendered by three shared components.

```
entities/index.js      →  9 "uniform" configs   (plain CRUD)
entities/advanced.jsx  →  4 "advanced" configs  (custom payloads, cascading lookups, extra UI)
       │
       └─ crudRoutes(config)  →  list · /add · /:id · /:id/edit
              └─ CrudList / CrudForm / CrudView
```

**Adding a CRUD screen means adding a config object.** If you are writing a page component for
something that lists records with add/edit/view/delete, you have taken the wrong path.

## Decision tree

Run this before writing anything.

1. **Is it CRUD over one entity, with plain fields?**
   → a config in `apps/admin/src/entities/index.js`, appended to `UNIFORM_ENTITIES`. Nothing else.
2. **Is it CRUD, but the form needs a reshaped payload, cascading selects, conditional fields, or an
   extra panel?** → a config in `apps/admin/src/entities/advanced.jsx`, appended to
   `ADVANCED_ENTITIES`. Use the escape hatches below; do not fork the CRUD components.
3. **Is the *list* ordinary CRUD but the *form* genuinely not** — an editor whose value is a live
   preview, a canvas, a side-by-side diff? → keep the config for the list and replace only the form
   routes. `crudRoutes(config)` returns a plain array of `{ path, component }`, so `allRoutes.jsx`
   can take its first entry (the list) and point add/view/edit at a page file. `seoPageConfig` in
   `advanced.jsx` + `SeoPageEditor.jsx` is the example: the config carries `columns`,
   `filterFields` and `api.search`/`api.remove` but no `fields`, and it is **not** in
   `ADVANCED_ENTITIES` — being in that array would generate the form routes this branch is
   replacing. You still get the table, filters, column prefs and both delete-failure modals free.
4. **Is it genuinely not CRUD** — a permission matrix, a dashboard, a report, a wizard?
   → a page file in `apps/admin/src/pages/<Section>/`, registered by hand in
   `apps/admin/src/Routes/allRoutes.jsx`. `UserRoles.jsx`, `DashboardBuilder.jsx`, `Dashboard.jsx`,
   `LoginAttemptLogs.jsx`, `SeoSettings.jsx` and `SeoNotFoundLog.jsx` are the examples. Reuse `PageHeader`, `Card`, `DataTable` and the
   `Field` family — a custom page means custom *layout*, not custom primitives. Charts reuse the
   widget renderers in `components/ui/widgets.jsx` and the `--viz-series-*` palette in
   `globals.css` (a validated light/dark pair — swap both together when rebranding, never one).

Only reach step 4 when 1–3 genuinely do not fit. State which step you landed on and why.

## The config shape

```js
export const departmentConfig = {
    key: "department",              // unique; also the React key and the table-prefs storage key
    path: "/department",            // route base; must match the seed menu row's menuUrl
    section: "Setup",               // breadcrumb parent
    singular: "Department",
    plural: "Departments",
    description: "Departments users can be assigned to.",

    api: { search, getById, create, update, remove },   // from apps/admin/src/api/*.api.jsx

    sections: [                     // form layout: one block per section id
        { id: "details", title: "Department details", description: "…" },
        { id: "status",  title: "Status" },
    ],
    fields: [                       // form fields, each assigned to a section
        { name: "departmentName", icon: Building07, label: "Department Name",
          required: true, section: "details", error: "Department Name is required!",
          placeholder: "Enter department name" },
        ACTIVE,                     // the shared isActive checkbox
    ],
    columns: [                      // list table
        { name: "Department Name", selector: (row) => row.departmentName, minWidth: "180px" },
        { name: "Code", selector: (row) => row.departmentCode, sortable: true,
          sortField: "departmentCode", minWidth: "130px" },
    ],
    filterFields: [                 // filter builder — MUST mirror the server's `filterable`
        { name: "departmentName", label: "Department Name", type: "string" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    recordTitle: (r) => r.departmentName,   // shown on the view/edit screens
};
```

Field types: `string` (default) · `email` · `password` · `number` · `checkbox` · `select` ·
`textarea` · `richtext` · `icon`.

Per-field options: `required`, `error`, `placeholder`, `hint`, `icon`, `full` (span both columns),
`default`, `min`, `validate: (value, values, mode) => string | undefined`,
`disabled: (values) => boolean`, `clears: ["otherField"]`, `hideIn: ["edit"]`,
`optionsFrom: "lookupKey"`.

Config-level escape hatches (the advanced tier):

| Hook | Use for |
|---|---|
| `lookups: { key: loader }` | option lists for `select` fields |
| `lookupDeps: ["countryId"]` | re-run lookups when these values change (cascading selects) |
| `filterLookups` | option lists for `objectId` filter rows |
| `toForm(data)` | reshape the API record into form values |
| `toView(data)` | reshape the API record before the view screen reads it |
| `viewFields` | a different field list for the view screen (defaults to `fields`) |
| `toPayload(values, mode)` | reshape form values into the request body |
| `renderExtra({ mode, id, values, setValues })` | an extra panel, e.g. password reset |

`asOptions(loader, labelKey)` at the top of each entities file maps a list response to
`{ value, label }`. Reuse it rather than writing another mapper.

## The view screen

`CrudView` at `/:id` is **the form's layout without the inputs**: same `sections`, same field order,
same two-column grid, so moving between view and edit does not move anything on screen. It is
generated from the same config — there is nothing per-entity to write.

What it does on its own:

- **Resolves `select` fields through `config.lookups`.** Without this a relation renders as a raw
  ObjectId. The loaders are called once with the record, as `loader(record, { id, mode: "view" })`.
- **Formats by field type** — `checkbox` as a badge, `date` through `toLocaleString`, `icon` as the
  glyph plus its name, `richtext` as rendered HTML, `textarea` preserving line breaks.
- **Never renders `password` fields**, whatever the config says.
- **Header:** breadcrumb, record title from `recordTitle`, an Active/Inactive badge when the record
  has `isActive`, a Back button to the list, and Edit when `currentPagePermissions.edit`.
- **Footer:** `createdAt` / `updatedAt` when the API returns them.

Hide a field from this screen only with `hideIn: ["view"]`, or replace the whole list with
`viewFields`. Do not fork the component.

## Rules that bite

**`filterFields` must mirror the server's `filterable`.** Same field names, same types. A field in
the config but not on the server is a control that silently 400s; the reverse is a filter nobody can
reach. Change both in the same commit. Operator lists must also stay in sync — `OPERATORS` in
`apps/server/utils/listQuery.js` and `OPERATORS_BY_TYPE` in
`apps/admin/src/components/ui/filter-panel.jsx`.

**`sortable: true` needs `sortField`.** The server only honours `sorton` if it appears in
`filterable`, so a sortable column whose `sortField` is not filterable silently falls back to
`createdAt`.

**The `key` prop is load-bearing.** `crudRoutes` keys every component by entity because all entities
render the same component at the same tree position. Without it React reuses the instance and the
previous entity's rows stay on screen. Don't remove it.

**`config.path` must equal the seed menu row's `menuUrl`.** Permissions are resolved by matching the
URL against the menu tree.

## The menu row is mandatory

A screen with no `MenuMaster` row in `apps/server/seed/index.js` is **invisible to every non-admin
user** and resolves to all-false permissions — no add button, no row actions. Admins bypass the
matrix, so it will look fine to you and be broken for everyone else.

Add the entry to the right group in `MENU_GROUPS` and re-run `npm run seed`.

Detail routes (`/department/add`, `/department/:id/edit`) have no menu row of their own; permissions
are inherited by walking up the path (`findMenuIdForPath` in `MenuContext.jsx`). That already works —
do not add menu rows for them.

## Permissions in the UI

```js
const { currentPagePermissions } = useContext(MenuContext);
// { read, write, delete, edit, print, mail }
```

Gate the Add button on `write`, row edit on `edit`, row delete on `delete`. `CrudList` already does
this; a custom page must do it itself.

Remember this is **presentation only**. The server does enforce the matrix (ADR-002), but only on
routes that chain `checkPermission` — so a hidden button is never a security control, and a route
that forgot the guard is open whatever this screen shows. See
[30-api.md](30-api.md#authorisation-the-matrix-and-the-scope).

## Components

Three tiers. Reach for them in this order:

1. **`components/ui/`** — app-specific: `PageHeader`, `Card`, `RowActions` (`page.jsx`),
   `DataTable`, `FilterPanel`, `ColumnMenu`, `useTablePrefs`, `ConfirmModal`, `Field` family
   (`field.jsx`), `ReferenceErrorModal`, `DeleteBlockedModal`, `IconPicker`.
2. **`components/base/`** and **`components/application/`** — vendored Untitled UI primitives
   (`.tsx`). Built on React Aria: **inputs hand you the value directly, not a DOM event.**
   `components/ui/field.jsx` is the adapter that re-wraps them as `{ target: { name, value, type } }`.
3. **Write your own** — only if neither fits, and put it in `components/ui/`.

Do not edit files under `components/base/` or `components/application/` to fit a feature. They are
vendored; changing them makes future updates painful. Wrap instead.

## Styling

Tailwind v4, configured in CSS via `@theme` in `apps/admin/src/styles/theme.css`. **There is no
`tailwind.config.js`** — do not create one.

Use semantic tokens, never raw colours: `text-primary`, `text-secondary`, `text-tertiary`,
`text-quaternary`, `bg-primary`, `bg-secondary`, `border-secondary`, `ring-secondary`,
`text-fg-quaternary`, `bg-brand-solid`, `text-brand-secondary`, `text-display-xs`. A raw
`text-gray-700` breaks dark mode, which is a `.dark-mode` class on `document.documentElement`.

Merge classes with `cx` from `@/utils/cx` — an `extendTailwindMerge` instance that knows the
`display-*` text scale. Not `clsx`, not string concatenation.

Icons: `@untitledui/icons` components in code. The `ri-*` remixicon **class strings** are only for
sidebar menu icons, which are stored in MongoDB and chosen with `components/ui/icon-picker.jsx`.

## Data fetching

Plain `useState` + `useEffect` + the axios wrappers. There is no react-query, no SWR, no state
library — do not add one for a single screen. Follow `CrudList`: a `fetchRows` function, one effect
listing every input in its dependency array, `loading` state, and a `catch` that resets to empty.

Two delete-failure paths exist and both must be handled on any screen that deletes:

```js
if (res?.data && res.data.isOk === false) setBlocked({ … });   // 200 with isOk:false
if (err.response?.status === 409) setReferenceData(err.response.data);  // reference guard
```

Set the tab title directly — `document.title = \`${config.plural} | Demo Panel\``. There is no helmet.
