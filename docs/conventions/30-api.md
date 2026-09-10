# API conventions

Express 4, ESM. Routes hold the middleware chain and swagger JSDoc; controllers hold logic.
All routers mount under `/api/v1`. Used by the `api-endpoint` skill.

## The six endpoints

Every entity gets exactly these. Naming is **plural kebab-case** for the resource; the id parameter
is named after the entity, not `id`.

| Method | Path | Handler | Purpose |
|---|---|---|---|
| POST | `/departments` | `createDepartment` | create |
| GET | `/departments` | `listDepartments` | all active, unpaginated — for dropdowns |
| GET | `/departments/:departmentId` | `getDepartmentById` | one |
| PUT | `/departments/:departmentId` | `updateDepartment` | update |
| DELETE | `/departments/:departmentId` | `deleteDepartment` | soft delete, reference-guarded |
| POST | `/departments/search` | `listDepartmentByParams` | paginated + filtered list |

Search is a **POST** because the filter payload is structured. That is deliberate, not an oversight.

Nested reads hang off the parent: `GET /countries/:countryId/states`. Actions on a resource are a
sub-path with a verb: `POST /users/:userId/reset-password`.

Put the new routes in the existing domain router if one fits (`locations`, `emails`, `menus`) rather
than creating a router per model.

## The response envelope

Every controller response is `{ isOk, status, message?, data? }`. `status` repeats the HTTP status
in the body.

```js
return res.status(201).json({ isOk: true,  status: 201, message: "Department created successfully" });
return res.status(404).json({ isOk: false, status: 404, message: "Department not found" });
return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
```

Two rules the starter breaks in one place and you must not:

- `isOk` always agrees with the HTTP status. `createDepartment` returns `isOk: true` with a 400 —
  that is a bug.
- Never leak `error.message` to the client on a 500. Log it, return a fixed message.

**Search responses have a different `data` shape.** `runListQuery` ends in a `$facet`, so it returns
a one-element array:

```js
// simple endpoints
{ isOk: true, status: 200, data: <doc | doc[]> }
// /search endpoints
{ isOk: true, status: 200, data: [ { count: 42, data: [ …rows ] } ] }
```

The frontend unwraps `response.data.data[0].data` and `.count`. Don't "fix" it on one endpoint only.

Never return a password. Controllers strip it manually (`delete data.password`) — there is no
`toJSON` transform on any schema.

## Lists go through `runListQuery`

`apps/server/utils/listQuery.js` is the only way to build a list endpoint. Do not hand-roll an
aggregation.

```js
export const listDepartmentByParams = async (req, res) => {
  try {
    const list = await runListQuery(DepartmentModels, req.body, {
      searchFields: ["departmentName", "departmentCode"],
      filterable: {
        departmentName: "string",
        departmentCode: "string",
        isActive: "boolean",
        createdAt: "date",
      },
    });
    return res.status(200).json({ isOk: true, data: list, status: 200 });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ isOk: false, message: "Internal server error", status: 500 });
  }
};
```

- `searchFields` — what the free-text `match` box searches, OR'd together.
- `filterable` — a `{ field: type }` allowlist. Types: `string | number | boolean | date | objectId | enum`.
- `stages` — `$lookup`/`$addFields` run *before* filtering, so filters can target joined names
  (that is how `countryName` is filterable on the state list).
- `scopeFilter` — the result of `buildScopeFilter()` (see *Authorisation* below), merged into the
  first `$match` so it rides the indexes. Server-set only; never build it from client input.

**`filterable` is a trust boundary.** Field names arrive from the client and are only used after
allowlist lookup; an unknown field is dropped, regex values are escaped, values are coerced to the
declared type, and `sorton` is honoured only if it appears in `filterable`. Never build a match from
`req.body` directly, never spread client input into a query, and never widen `filterable` to
"whatever the model has".

**Parity rule:** `filterable` on the server and `filterFields` in the entity config
(`apps/admin/src/entities/`) describe the same set. A field in one and not the other is either a
filter that silently does nothing or a UI control that 400s. Change both together.

The client-side shape validation of the `filters[]` payload lives separately in `filterValidators`
in `apps/server/middlewares/inputValidator.js`.

## Authorisation: the matrix and the scope

Two layers, both mandatory on a new endpoint (ADR-002).

**Layer 1 — session and coarse role.** `authMiddleware(roles)` checks the cookie session and
ADMIN/USER only. Every endpoint gets one, with the single documented exception of the public SEO
router — see *Public endpoints* below.

**Layer 2 — the permission matrix, enforced server-side.** A route that belongs to an admin screen
chains `checkPermission(menuUrl, action)` after `authMiddleware`:

```js
import { ADMIN_ONLY, ANY_ROLE } from "@demo-panel/shared/roles";
import { checkPermission } from "../../middlewares/checkPermission.js";

router.post("/departments",        authMiddleware(ANY_ROLE), checkPermission("/department", "write"), createDepartment);
router.post("/departments/search", authMiddleware(ANY_ROLE), checkPermission("/department", "read"),  listDepartmentByParams);
router.get("/admin-users",         authMiddleware(ADMIN_ONLY), listAdminUsers);   // ADMIN bypasses the matrix anyway
```

`menuUrl` is the screen's seeded `MenuMaster.menuUrl`; `action` is one of
`read | write | edit | delete | print | mail`, declared explicitly because method inference lies
(`POST /search` is a read). Standard mapping: create=`write`, get/search=`read`, update=`edit`,
delete=`delete`. ADMIN bypasses; a role with no matrix row for the menu is denied — the same
fail-closed default the menu UI applies. Lookups are cached ~60s in-memory; the userRoles and
menu-master controllers invalidate on write.

**Deliberately matrix-free** (still behind `authMiddleware`): the unpaginated dropdown GETs
(`GET /departments`, `/roles`, location lists, menu tree, email lists) — forms on other screens
embed them; and `GET /user-roles/:roleId` — MenuContext loads the user's own matrix at login, so
gating it would lock every non-admin out.

**Layer 2½ — row-level data scope.** Each role carries `UserRoles.dataScope`
(`all | department | own`, set on the role permissions screen). A controller opts its model in by
declaring which fields carry each dimension — the same declare-per-call-site style as `filterable`:

```js
import { buildScopeFilter } from "../../utils/scope.js";

const scopeFilter = buildScopeFilter(req.user, { department: "departmentId", owner: "createdBy" });
runListQuery(Model, req.body, { searchFields, filterable, scopeFilter });
// and on single-document reads/writes:
Model.findOne({ _id: id, ...(scopeFilter ?? {}) });
```

A model that does not declare the demanded dimension stays unscoped — master data is readable
whatever the scope. A user missing the attribute the scope needs matches nothing (fail closed).
Business collections should declare `owner` (usually a `createdBy` ref) and, where tenanted by
department, `department`. Index every declared scope field.

## Dashboard widgets

Client-authored dashboard widgets (ADR-003) are the same trust model one level up: a stored widget
is only ever a reference into `config/widgetSources.js`, and `utils/widgetQuery.js` composes the
aggregation from that registry plus `buildScopeFilter` — never from the widget's own strings. To
make a new collection chartable, add one registry entry (metric fields, group-bys, date fields,
filterable map, scope dimensions) and index what you declare. Never widen a source to "whatever the
model has", and never run a pipeline a client sent.

## Public endpoints

There is exactly one unauthenticated router: `routes/v1/seoPublic.routes.js` (ADR-004). The public
website is a separate application with no session and needs SEO metadata on every page render, so
there is no cookie to check.

**This is a deviation, not a pattern to spread.** Before adding a second public route, the answer to
all four of these has to be yes:

1. **Is the data public by definition?** Meta tags, sitemaps and robots.txt are visible in any page's
   source. A list of records is not, however harmless it looks.
2. **Is it resolve-by-key, never a listing?** `POST /public/seo/resolve` answers one path at a time,
   so the set of URLs cannot be enumerated through it. A public `/search` would hand out the whole
   collection.
3. **Is it a read?** The two public *writes* — the site's URL list and its 404 reports — are guarded
   by a shared secret (`middlewares/siteKey.js`, `x-api-key`), generated in the panel and compared in
   constant time. Unguarded, they let anyone write your sitemap.
4. **Does it fail closed when unconfigured?** `requireSiteKey` returns 503 when no key has been
   generated, rather than letting the endpoints stand open until someone remembers.

Everything else still applies: `allowOnlyFields` plus a validation chain (an anonymous caller is the
outermost trust boundary), the `{ isOk, status, … }` envelope, and no `error.message` on a 500.

Register public routers in `server.js` **before** the SPA catch-all, and keep them under
`/api/v1/public/` so the boundary is visible in the URL.

## The audit trail is read-only

`auditLogs.routes.js` exposes search, one entry, per-record history and the model list — and nothing
else, on purpose. The collection is written by `models/auditPlugin.js` and by no controller; an
endpoint that let someone edit or delete an entry would defeat the point of having one.

A new endpoint needs no audit code. The plugin covers every model automatically, so the only thing
to get right is what [20-schema.md](20-schema.md#the-audit-trail) already describes: writes made
outside a logged-in request are not recorded, which is what keeps public and background traffic out
of the log.

## Validation

`express-validator`, with the reusable chains in `apps/server/middlewares/inputValidator.js`.
Two layers, in this order:

```js
router.post("/auth/login",
  allowOnlyFields(allowedLoginFields),   // 400 on any unexpected body key
  loginValidation,                       // field rules + handleValidationErrors
  login,
);
```

Existing coverage is inconsistent — only auth, users, admin-users and otp routes have chains.
**New endpoints get one.** Reuse the atoms: `emailValidator`, `strongPasswordFor(field)`,
`mongoIdValidator(field, 'param'|'body')`, `nameValidator`, `phoneValidator`, `booleanValidator`,
`searchValidation` for `/search` routes.

Error shape is uniform and already handled by `handleValidationErrors`:

```js
{ isOk: false, status: 400, error: "Validation Error", message: "Invalid input data",
  details: [{ field, message, value: "[REDACTED]" }] }
```

## Deletes are reference-guarded

```js
const referenceInfo = await getReferencingCounts("Department", departmentId);
if (referenceInfo.totalReferences > 0) {
  return res.status(409).json({
    isOk: false, status: 409,
    message: "Cannot delete department. It is being used by other records.",
    totalReferences: referenceInfo.totalReferences,
    references: referenceInfo.details,
    formattedMessage: formatReferenceMessage(referenceInfo.details),
  });
}
```

The 409 shape matters — `apps/admin/src/components/ui/reference-error-modal.jsx` renders those exact
fields. `getReferencingCounts` is generic; a new model with correct `ref:` fields is covered with no
registration. It counts through the soft-delete middleware, so an already-deleted record does not
block anything.

Past the guard, the delete is a flag, never a removal:

```js
await DepartmentModels.findByIdAndUpdate(departmentId, { isDeleted: true });
```

The row disappears from every read, so to the admin panel this is indistinguishable from the old
hard delete — and deleting an already-deleted id returns `null`, which the controllers turn into
their existing "not found" response. See [20-schema.md](20-schema.md#deletion-is-soft-and-you-get-it-for-free).

## Swagger

Every route gets a JSDoc `@swagger` block — the spec at `/api-docs.json` is generated from
`./routes/v1/*.js`. Reuse the shared component schemas in `apps/server/config/swagger.js`
(`SuccessResponse`, `ErrorResponse`, `PaginatedResponse`, `SearchParams`) and add an `X` +
`CreateX` pair for a new entity. Ignore the `bearerAuth` security scheme — it is stale; auth is the
`sessionId` cookie.

## The frontend client

An endpoint is not done until the admin can call it. Two files, always both:

```js
// apps/admin/src/api/endpoints.jsx — every URL string lives here, nowhere else
DEPARTMENTS: {
    BASE: `${V1}/departments`,
    BY_ID: (id) => `${V1}/departments/${id}`,
    SEARCH: `${V1}/departments/search`,
},
```

```js
// apps/admin/src/api/departments.api.jsx — thin wrappers over the shared instance
import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const createDepartment = async (data) => api.post(ENDPOINTS.DEPARTMENTS.BASE, data);
export const searchDepartments = async (params) => api.post(ENDPOINTS.DEPARTMENTS.SEARCH, params);
```

Never call `axios` directly and never inline a URL — `apps/admin/src/api/index.jsx` is the single
instance that carries `withCredentials: true`, without which the session cookie is not sent.
