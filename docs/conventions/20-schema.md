# Schema conventions

MongoDB via Mongoose 8. One model per file in `apps/server/models/`, ESM default export.
Used by the `schema-design` skill.

## The canonical model

`apps/server/models/Department.js` is the template. Copy its shape:

```js
import mongoose from "mongoose";

const DepartmentSchema = new mongoose.Schema(
  {
    departmentName: { type: String, required: true, trim: true },
    departmentCode: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true, required: true },
  },
  { timestamps: true },
);

export default mongoose.model("Department", DepartmentSchema);
```

Non-negotiable on every model:

- `{ timestamps: true }` — the list screens sort on `createdAt` by default.
- `isActive: { type: Boolean, default: true, required: true }` — the "soft active" flag every list
  endpoint filters on. **`isActive` is not `isDeleted`**: inactive rows still appear in the admin
  lists and can be switched back on; deleted rows are gone from every read. See *Deletion* below.
- `trim: true` on every user-entered string; `lowercase: true` as well on emails.
- References are `{ type: Schema.Types.ObjectId, ref: "ModelName" }`. The `ref` string must match
  the `mongoose.model()` name exactly — `referenceHelper` resolves delete guards through it.

## Indexes — the part the starter gets wrong

Most existing models declare no indexes. Do not treat that as the convention; it is the gap.
Every new model declares indexes for all four of these:

1. **Every `ref` field.** A foreign key with no index means a collection scan on every filter and
   on every delete-guard count. `City.stateId`, `User.departmentId`, `MenuMaster.menuGroup` are all
   currently unindexed — that is a bug, not a pattern.
2. **Every field that appears in a controller's `filterable` map**, because the client can filter
   and sort on it.
3. **`createdAt`**, if the collection will grow past a few thousand documents — it is the default
   sort on every list screen.
4. **Business uniqueness**, as a real unique index rather than a `findOne` check in the controller.
   Scope it correctly: a state code is unique *per country*, not globally.

```js
CitySchema.index({ stateId: 1 });
CitySchema.index({ countryId: 1 });
CitySchema.index({ cityName: 1, stateId: 1 }, { unique: true });
CitySchema.index({ createdAt: -1 });
```

`State.js` is the one model that already does this properly — read it.

Declare a unique index the ordinary way. The soft-delete plugin rewrites it with
`partialFilterExpression: { isDeleted: false }` when the model is compiled, so the constraint stops
applying to deleted rows — do not write that by hand, and do not work around it.

Controllers additionally do a case-insensitive `findOne` before create/update to return a friendly
409/400. Keep that (it produces a better message than a driver duplicate-key error) **and** add the
unique index (it is the only thing that actually holds under concurrency).

## Deletion is soft, and you get it for free

Nothing in this codebase removes a document. `apps/server/models/softDelete.js` registers a **global
Mongoose plugin**, so every model — including one you add tomorrow — gets:

- an `isDeleted` field. Do not declare it yourself.
- query middleware on `find*`, `count*`, `distinct`, `update*`, `replace*` and `aggregate` that
  excludes deleted documents. So lists, searches, dropdowns, `runListQuery` and the
  `getReferencingCounts` delete guard all hide them without a single controller filtering by hand.
- every unique index rewritten as a partial one, as above.

A delete controller therefore reads:

```js
await DepartmentModels.findByIdAndUpdate(departmentId, { isDeleted: true });
```

still behind the reference guard in [30-api.md](30-api.md). Deleting is refused while something live
still points at the row; nothing cascades.

**Things that will bite you:**

- **The plugin only reaches models compiled after it is imported.** Every entry point imports
  `models/softDelete.js` on its *first* line. It throws on startup if a model beat it, rather than
  silently serving deleted records — if you see that error, you added an import above it.
- **`$lookup` does not go through the middleware.** A join can surface a deleted parent. The
  reference guard makes that unreachable today; if you ever relax the guard, add the condition to
  the lookup's own pipeline.
- **`deleteOne`/`deleteMany` still really delete.** They are deliberately not intercepted, because a
  method named delete that does not delete is a trap. `Otp` and session documents use them on
  purpose — consumed tokens are not history.
- **Existing databases need `npm run seed` once.** It backfills `isDeleted: false` and rebuilds the
  unique indexes as partial ones. Skipping it means uniqueness silently stops being enforced on the
  rows that predate the change.
- **There is no restore screen.** Undeleting is a manual database update. If a project needs one,
  that is a module, not a footnote.

Reasoning and the alternatives that lost: `docs/knowledge/DECISIONS.md`, ADR-001.

## The audit trail

Like soft delete, this is a **global Mongoose plugin** — `apps/server/models/auditPlugin.js`. Every
model gets it, including one you add tomorrow, and no controller writes audit code by hand, so none
can forget to. Each recorded change lands in `AuditLog` as who, what, when, and the fields either
side of it.

**The rule that makes it usable: no actor, no row.** The plugin only records writes made inside a
logged-in request. It finds the user through an `AsyncLocalStorage` context set once in `server.js`
(`utils/auditContext.js`) — a Mongoose hook sees the write but not the request, and threading a
context object through every query would be a change to every controller and forgettable besides.

That rule is also the safety valve. The seeder, the public SEO endpoints and the redirect hit
counter all write without an actor, so none of them appear. A hit counter firing on every page view
of the public website must not fill this collection.

```js
// audited — a person did this inside a session
await DepartmentModels.findByIdAndUpdate(departmentId, { departmentName: "Growth" });

// not audited — no session behind it
await SeoRedirect.updateOne({ _id }, { $inc: { hits: 1 } });   // public request
await model.collection.updateMany(…);                          // seeder
```

**Things worth knowing:**

- **Soft delete is recorded as a delete, not an edit.** `{ isDeleted: true }` arrives as an ordinary
  update; `classifyUpdate` recognises it, and `isDeleted` is left out of the change list because the
  action already carries it.
- **Secrets are recorded as changed, never as values.** `password`, `appPassword`, `siteKey` and
  friends (`config/audit.js`) become `[REDACTED]` on both sides. A hashed password is a credential.
- **Nested fields read as paths** — `robots.index: true → false`, not "the robots object changed".
  Arrays stay whole, because exploding `roles[47].read` would bury the one change that matters.
- **One extra read per update.** The before-image is fetched in a `pre` hook; the after-image is
  derived from the update payload rather than read back, so an audited update costs two queries, not
  three. Operators whose result depends on the stored value (`$inc`, `$push`) are recorded as the
  operation rather than a guessed number.
- **An edit that changes nothing writes nothing.**
- **Not covered:** `bulkWrite` (no query middleware) and real `deleteOne`/`deleteMany` (only `Otp`
  and sessions use them). Skipped entirely: `AuditLog` itself — auditing the audit log is an
  infinite loop — plus `Otp`, `LoginAttempt`, `SeoUrl` and `SeoNotFound`, which are machine noise.
- **The plugin must be imported before any model**, immediately after `models/softDelete.js`. It
  throws on boot if a model beat it, rather than silently leaving that model unaudited.
- **Nothing deletes from `AuditLog`,** and there is no endpoint that could. Retention is a TTL index
  or a scheduled job — never a route, because a log someone can erase is not a log.

## Modelling rules

**Normalise by default. Embed only when the child has no independent life.** A subdocument is right
when it is always read with its parent, never queried on its own, and bounded in size — the
`roles[]` array inside `UserRoles` is the example. Anything a user can list, filter or link to from
elsewhere is its own collection.

**Do not duplicate a field you can `$lookup`.** The list endpoints join in `runListQuery`'s `stages`
option specifically so derived names (`countryName` on the state list) can be filtered without being
stored. Denormalise only with a measured reason, and write it down in `docs/knowledge/DECISIONS.md`.

**No unbounded arrays.** An array that grows with usage becomes a document-size ceiling and a write
hotspot. Make it a collection with a `ref` back.

**Store what you cannot recompute.** Don't persist counts, totals or "last X" fields that a query
can derive, unless you have measured that the query is too slow.

## Tenancy

There is **no Company/Organization/tenant model** in this starter. The only query scoping is the
per-role row scope of ADR-002 (`UserRoles.dataScope` + `buildScopeFilter`, see
[30-api.md](30-api.md#authorisation-the-matrix-and-the-scope)) — that narrows what a *role* sees
within one shared dataset, which is not tenancy and does not substitute for it.

If the project needs multi-tenancy, that is an architecture decision to make *before* the first
model is written, not a field to bolt on later. It touches: every model (a `companyId` ref), a
mandatory base match in `apps/server/utils/listQuery.js`, `req.user` in
`apps/server/middlewares/authMiddleware.js`, the session payload in `login()`, and every
create/update/find in all controllers. Raise it with the user and record the answer in
`docs/knowledge/DECISIONS.md`.

## Deletes

Deletes are hard. Before deleting, count inbound references:

```js
const referenceInfo = await getReferencingCounts("Department", departmentId);
if (referenceInfo.totalReferences > 0) {
  return res.status(409).json({ /* see 30-api.md */ });
}
```

`apps/server/utils/referenceHelper.js` walks `mongoose.modelNames()` and every schema path's `ref`
at runtime. **It needs no registration** — declare your `ref:` fields correctly and any new model is
covered automatically, in both directions.

## Changing an existing schema

There is no migration runner. A schema edit applies to new writes only; existing documents keep
whatever they had.

- **Adding an optional field** — nothing else to do.
- **Adding a required field to a collection that already has documents** — you must ship a backfill
  script, or every existing document fails validation on its next update. Put it in
  `apps/server/seed/` and model it on `seed/index.js`: `dotenv` → `mongoose.connect(process.env.DATABASE)`
  → do the work → `disconnect()` → a `.catch` that disconnects and `process.exit(1)`. Make it
  idempotent and safe to re-run.
- **Renaming or removing a field** — same: a script, plus a grep for every reader across both apps.
- **Adding an index to a large collection** — Mongoose builds it on boot. Say so in the PR; on a big
  collection this is not free.

## Seeding

`apps/server/seed/index.js` is idempotent and re-runnable — everything is upserted by natural key
and an existing admin's password is never overwritten. Preserve both properties.

Every new screen needs a menu row here. A screen with no `MenuMaster` row is invisible to
non-admin users and resolves to all-false permissions — see [40-frontend.md](40-frontend.md#the-menu-row-is-mandatory).
