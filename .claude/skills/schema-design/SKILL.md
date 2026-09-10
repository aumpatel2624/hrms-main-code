---
name: schema-design
description: Create or change a Mongoose model in apps/server/models — shape, indexes, uniqueness, delete semantics, backfills. Use when adding a collection, adding or renaming a field, changing a relationship, or when a query is slow. Runs after system-design, before api-endpoint.
---

# Schema design

Procedure. **Reference — read it, it has the code and the reasoning:**
`docs/conventions/20-schema.md`.

Get shape, indexes and delete semantics right here. Changing them later means a backfill script.

## Gate

A design brief names this entity (`system-design`), and `docs/knowledge/DOMAIN.md` states its
lifecycle, ownership, uniqueness and deletion rule. If those are missing, that is a `grill-me` gap —
get it answered rather than inventing.

## Steps

1. **Justify the collection.** A field on an existing model beats a new collection; a fixed enum
   beats a lookup table nobody will edit. The starter already has users, roles, permissions,
   departments, locations, currencies, menus and email templates.
2. **Shape it** — copy `models/Department.js`. Always `{ timestamps: true }`, `isActive`, `trim` on
   user strings. `ref` strings must match the `mongoose.model()` name exactly.
3. **Normalise or embed** — embed only when the child is always read with its parent, never queried
   alone, and bounded (`UserRoles.roles[]`). Everything else is its own collection.
4. **Declare indexes** — copy `models/State.js`, the one model that does it right. See below.
5. **Decide delete semantics** — guarded (default), cascade (needs an ADR; nothing here cascades),
   or never. Record it in `DOMAIN.md`.
6. **Backfill** — if a required field was added to a populated collection, write an idempotent script
   in `apps/server/seed/`, modelled on `seed/index.js`.
7. **Seed rows** — if the entity needs starter data, upsert by natural key in `seed/index.js`.
8. **Make it reportable** — add or update the entry in `apps/server/config/widgetSources.js` so the
   new data shows up in the Dashboard Builder. A model the registry does not mention cannot be charted
   at all. Declare `aggregatable` (numeric fields for sum/avg), `groupable` (categories, each `ref`
   carrying a `lookup` so bars are labelled with a name instead of an ObjectId), `dateFields` (line
   charts and time windows), `filterable` (same allowlist grammar and same trust boundary as the
   controller's) and `scopeable`. Index everything you declare — see the table and the relation
   rules in `AGENTS.md` under "Keep reporting in step with the data".

## Must not get wrong

- **Index every `ref`, every field in the controller's `filterable` map, every business-unique key,
  and `createdAt` on a growing collection.** Most existing models declare none — that is the gap,
  not the pattern. An unindexed foreign key is a collection scan on every filter *and* every
  delete-guard count.
- **Scope uniqueness correctly** — a code is usually unique *per parent*, not globally. Compound
  index order: equality fields first, then range/sort.
- **A controller `findOne` check is not a constraint.** Keep it for the error message; the unique
  index is what holds under concurrency.
- **There is no migration runner.** A required field added to existing documents breaks them on
  their next update unless you backfill.
- **Tenancy is not retrofittable.** If this is a new top-level entity and multi-tenancy is unsettled,
  raise it now — it touches every model, every controller and `runListQuery`.
- **A field you add and do not register is invisible to reporting.** Adding to the model and
  forgetting `widgetSources.js` is the common miss — the screen works, the client asks for a chart
  six weeks later and cannot build one. Same commit, both files.
- Do not store what you can derive or `$lookup`. Do not create unbounded arrays.

## Done when

- [ ] Canonical shape; every `ref`, filterable field and unique key indexed
- [ ] Uniqueness is a real index, scoped correctly
- [ ] Delete semantics decided and written into `DOMAIN.md`
- [ ] Backfill written if a required field hit a populated collection
- [ ] Nothing stored that could be derived or joined
- [ ] `widgetSources.js` entry added or updated; every `groupable` ref has a `lookup`
- [ ] Checked in Dashboard Builder: a stat tile, a grouped chart, and a line chart if there is a date

## Next

`api-endpoint` — its `filterable` map must match the indexes you just declared.
