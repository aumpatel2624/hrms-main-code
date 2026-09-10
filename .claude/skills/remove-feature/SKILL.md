---
name: remove-feature
description: Remove a feature completely — its files, its entries in the six shared registries, its seeded menu rows and role permissions, and its data. Use when asked to remove, delete, drop, rip out, undo or roll back a module, screen, collection or integration, or when something was built and is no longer wanted. Inventories everything first and removes nothing until the user confirms the list.
---

# Remove a feature

Adding a module touches a dozen registries. Removing one has to unwind every one of them, plus data
that adding never created — seeded menu rows, and the permission entries every role accumulated
pointing at them.

The failure this prevents is the half-removal: the screen is gone but the menu row is not, so
non-admin users see a link to a dead route; or the collections are still there with no model file, so
nothing validates them and the delete guard silently stops covering them.

**This is destructive and most of it is not recoverable by `git checkout`.** Dropped collections are
gone. Soft delete does not apply — that hides rows from reads, it does not remove a collection.

## Gate

Three things, all of them the user's to confirm:

1. **The feature is going away, not moving.** A rename or a refactor is not this skill — it keeps the
   data and the registrations, and unwinding them is wasted work you then redo.
2. **Which feature, by name.** One module row from `docs/knowledge/STATE.md`, or one menu URL. "The
   SEO bits" is not a scope; `/seo-pages`, `/seo-settings`, `/seo-redirects`, `/seo-404` is.
3. **You are on a feature branch.** `git switch -c chore/remove-<feature>`. Never on `development`,
   `staging` or `production` — see `docs/conventions/50-collaboration.md`.

## Steps

### 1. Build the inventory — search, never recall

Removal by memory leaves things behind. Every list below comes from a command.

```bash
FEATURE=seo          # the file/symbol prefix
MENUS='/seo-pages /seo-settings /seo-redirects /seo-404'   # every menuUrl it seeded

# A — files NAMED for the feature. Deletion candidates.
find apps packages -type f \( -name '*.js' -o -name '*.jsx' \) \
  -not -path '*/node_modules/*' -not -path '*/out/*' -iname "*$FEATURE*" | sort

# B — files that MENTION it. B minus A is your edit list.
grep -ril "$FEATURE" apps packages --include='*.js' --include='*.jsx' \
  | grep -vE 'node_modules|/out/' | sort

# Lines in the shared registries — these are edits, not deletions
grep -n "$FEATURE" \
  apps/server/server.js \
  apps/server/seed/index.js \
  apps/server/config/swagger.js \
  apps/server/config/audit.js \
  apps/server/middlewares/inputValidator.js \
  apps/admin/src/Routes/allRoutes.jsx \
  apps/admin/src/api/endpoints.jsx \
  apps/admin/src/entities/index.js \
  apps/admin/src/entities/advanced.jsx \
  apps/admin/src/styles/globals.css \
  packages/shared/src/index.js \
  package.json
```

**Exclude `node_modules/` and `apps/server/out/`.** The second is build output — it is full of the
feature's compiled code, it is gitignored, and `npm run build` regenerates it. Listing it is noise.

**A and B are a starting point, not the answer.** Neither is exact:

- A misses feature files that are not named for it. `middlewares/siteKey.js` exists only for the SEO
  module but has no "seo" in its name.
- B over-matches. A file mentioning the feature in one comment is not the feature's file —
  `utils/auditContext.js` names the SEO endpoints in a comment about which writes are not audited.

So for every file in B, ask one question: **is this file here only because of the feature?** If yes,
it is a deletion; if it would exist anyway, it is an edit. The import check below is what settles it:

For each file you plan to delete, check nothing else imports it:

```bash
grep -rn "from .*<filename-without-extension>" apps packages | grep -v node_modules
```

A `packages/shared` module is the one most likely to have picked up a second consumer. If it has
one, the file stays.

### 2. Inventory the data

Collections, seeded rows, and the permission entries nobody thinks about.

```bash
node --input-type=module -e '
import mongoose from "mongoose";
import dotenv from "dotenv"; dotenv.config({ path: "apps/server/.env" });
await mongoose.connect(process.env.DATABASE);
const db = mongoose.connection.db;
for (const c of await db.listCollections().toArray()) {
  if (!/^seo/i.test(c.name)) continue;                       // the feature prefix
  console.log(c.name, await db.collection(c.name).countDocuments());
}
const menus = await db.collection("menumasters")
  .find({ menuUrl: { $in: process.argv.slice(1) } }).toArray();
console.log("menu rows:", menus.map((m) => m.menuUrl));
const ids = menus.map((m) => m._id);
console.log("roles holding permissions for them:",
  await db.collection("userroles").countDocuments({ "roles.menuId": { $in: ids } }));
await mongoose.disconnect();
' /seo-pages /seo-settings /seo-redirects /seo-404
```

Also check the upload directory: `ls apps/server/uploads/cms/<feature>/`.

### 3. Show the list and stop

Print what you found — files to delete, files to edit, collections and their document counts, menu
rows, how many roles carry permissions for them, upload directories — and **ask before touching
anything**. A grep that matched more than you meant is recoverable at this point and nowhere later.

State the document counts out loud. "Drop 5 collections" and "drop 5 collections holding 12,400
documents" are different decisions.

### 4. Remove the code

Delete the feature's own files, then unwind the registries. Every one of these is an edit:

| File | What to remove |
|---|---|
| `apps/server/server.js` | the router import and its `app.use` line |
| `apps/server/seed/index.js` | the menu rows from `MENU_GROUPS`; the group too, if now empty |
| `apps/server/config/swagger.js` | the component schemas |
| `apps/server/config/audit.js` | any of the feature's models in `SKIP_MODELS` |
| `apps/server/middlewares/inputValidator.js` | the chains, the allowed-field arrays, unused imports |
| `apps/admin/src/Routes/allRoutes.jsx` | the route entries and their page imports |
| `apps/admin/src/api/endpoints.jsx` | the `ENDPOINTS` block |
| `apps/admin/src/entities/index.js` | the config **and** its entry in `UNIFORM_ENTITIES` |
| `apps/admin/src/entities/advanced.jsx` | the config **and** its entry in `ADVANCED_ENTITIES` |
| `apps/admin/src/styles/globals.css` | any custom properties the feature added |
| `packages/shared/src/index.js` | the `export * from` line |
| `package.json` | the feature's test file from the `test` script |

**The `test` script is a chain of `&&`.** Delete a test file without removing it from `package.json`
and `npm test` fails on a missing module — every suite after it never runs.

### 5. Remove the data, in this order

Order is not cosmetic. `referenceHelper` counts `UserRoles.roles[].menuId` as a reference to
`MenuMaster`, so deleting a menu row while any role still points at it is refused.

1. **Strip the permission entries** — `$pull` from every `UserRoles.roles[]` where `menuId` is one of
   the feature's menus.
2. **Delete the `MenuMaster` rows.**
3. **Delete the `MenuGroupMaster` row** only if it now has no menus left.
4. **Drop the feature's collections.**
5. **Delete `uploads/cms/<feature>/`.**

Write it as a one-off script in `apps/server/seed/`, the way backfills are done
(`docs/conventions/20-schema.md`): `dotenv` → `mongoose.connect(process.env.DATABASE)` → the
work → `disconnect()` → a `.catch` that disconnects and exits 1. Run it against **every** database the
project has, then delete the script; a removal script that lives on is a loaded gun.

**Use the raw collection, not the models.** The model files are gone by now, and the soft-delete
plugin would exclude rows from a query you need to actually act on.

### 6. Update the knowledgebase

- **`DECISIONS.md` is append-only.** Do not delete the feature's ADR. Set its status to
  `superseded by ADR-00N` and append a new record saying what was removed and why. The next person
  proposing the same thing deserves to know it was built and dropped.
- **`STATE.md`** — delete the module row, add a Log line.
- **`docs/conventions/60-limits.md`** — a feature that closed a gap reopens it. Move the row back out
  of *What you do get*.
- **Conventions and skills** — remove the sections that describe the feature. A convention doc
  describing code that no longer exists is worse than no doc.
- **Any standalone doc** the feature shipped.

### 7. Verify it is actually gone

```bash
npm test          # a stale path in the test script fails here
npm run build     # a dangling import fails here
npm run seed      # must run clean, and must not recreate the menu rows
npm run dev       # boot the server: a dropped import or router shows up now

grep -ril "$FEATURE" apps packages docs .claude | grep -v node_modules
```

That last grep should return nothing but the ADR and the `STATE.md` log line. Anything else is a
straggler.

Then **log in as a non-admin user.** The menu must not show the removed screens, and the routes must
not resolve. Admins bypass the matrix, so checking as admin proves nothing.

## Must not get wrong

- **Permissions before menus.** Delete a `MenuMaster` row while a role still references it and the
  delete is refused by the reference guard — or, done straight on the collection, it leaves every
  role carrying a permission row pointing at a menu that no longer exists.
- **Soft delete is not removal.** `isDeleted: true` hides rows from reads. Removing a feature means
  dropping the collection; the flag leaves the data and the indexes in place.
- **Never delete a shared file with a second consumer.** `packages/shared` especially — grep for
  importers before deleting, every time.
- **Never delete an ADR.** Supersede it. `DECISIONS.md` is append-only by design.
- **The delete guard shrinks silently.** `referenceHelper` walks `mongoose.modelNames()` at runtime,
  so removing a model removes it from every other model's guard with no error. If anything still
  holds a `ref` to the removed model, that field is now a dangling pointer — find those first.
- **Run the data script against every database.** Local, staging, production. A database that missed
  it keeps the collections and the orphaned permission rows for ever.
- **Nothing is removed before the user has seen the list.** Not one file.

## Done when

- [ ] Inventory shown to the user and confirmed before anything was touched
- [ ] Feature's own files deleted; shared files edited, not deleted
- [ ] All twelve registry files checked, and the ones that mentioned it edited
- [ ] Permissions stripped, then menu rows, then empty groups, then collections, then uploads
- [ ] Data script run against every database, then deleted
- [ ] ADR superseded (never deleted); `STATE.md` row removed; `60-limits.md` reopened if a gap came back
- [ ] `npm test`, `npm run build`, `npm run seed` and a server boot all clean
- [ ] Final grep returns only the ADR and the log line
- [ ] Checked as a **non-admin** user: no menu entries, no reachable routes

## Next

`git-flow` — commit and open the PR. Removals get their own PR, never folded into a feature branch:
a reviewer needs to see exactly what left the codebase.
