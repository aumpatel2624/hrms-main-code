---
name: integrate
description: Merge a feature branch or resolve merge conflicts, and promote development to staging to production. Use when asked to merge, resolve conflicts, integrate work, release, deploy, or promote a branch. Knows this repo's six append-only registries that conflict on nearly every parallel module.
---

# Integrate

Two jobs: **getting a feature branch mergeable**, and **promoting up the chain**. Both are the
riskiest moments in a team's week — this is where two weeks of parallel work either combines or
breaks.

Reference: `docs/conventions/50-collaboration.md`.

---

## A. Resolve a conflicted feature branch

**Always merge `development` into the feature branch — never the reverse.** That keeps the shared
branch linear and leaves the mess on the branch that caused it.

```bash
git fetch origin
git switch feat/12-bookings
git merge origin/development
```

### The six that conflict every time

This architecture is registry-driven, so **every parallel module appends to the same six files**.
Seeing conflicts here is normal and not a sign anything is wrong:

| File | Append point |
|---|---|
| `apps/admin/src/entities/index.js` | `UNIFORM_ENTITIES` + the config above it |
| `apps/admin/src/entities/advanced.jsx` | `ADVANCED_ENTITIES` |
| `apps/admin/src/api/endpoints.jsx` | the `ENDPOINTS` object |
| `apps/server/seed/index.js` | `MENU_GROUPS` |
| `apps/server/server.js` | route imports + the `app.use` block |
| `apps/admin/src/Routes/allRoutes.jsx` | `authProtectedRoutes` |

**These are "take both sides" conflicts** — two independent additions to one list, marked as
conflicting only because they landed adjacent. Keep both entries, then confirm the array still
parses and **no import got dropped** at the top of the file. A lost import is the classic bad
resolution here: the merge looks clean and the app crashes at runtime.

### The three that need actual thought

- **`package-lock.json`** — never hand-merge. Take both `package.json` dependency additions, then
  `rm package-lock.json && npm install` from the root and commit the regenerated file.
- **`docs/knowledge/STATE.md`** — keep both sides' rows and log lines. If the same module's phases
  disagree, **check the code and let it win.**
- **`packages/shared/src/*`** — a genuine conflict: two people changed a rule both apps depend on.
  Do not resolve mechanically. Work out which is correct, and involve both authors.

### A clean text merge is not a working merge

```bash
npm install && npm test
npm run build
npm run seed        # if either side touched seed/index.js
npm run dev         # then actually click through BOTH features
```

Check specifically for collisions git cannot see:

- [ ] Two entity configs with the same `path` or the same `key`
- [ ] Two menu rows with the same `menuUrl`
- [ ] Two routes on the same URL
- [ ] One side renamed a shared helper the other still calls
- [ ] `filterFields` still matches `filterable` on both sides
- [ ] Both models' indexes survived

Then push. The PR updates itself.

### Then stop

**An agent does not merge the PR.** Push the resolved branch, comment on the PR saying what you
resolved and what you verified, and leave the merge to a human.

---

## B. Promote up the chain

`development → staging → production`, always in order, never skipping.

```bash
gh pr create --base staging --head development \
  --title "Release: development → staging" --body "..."
```

Before opening a promotion PR:

- [ ] Everything intended for this release is already merged into the source branch
- [ ] `npm test` and `npm run build` pass on the source branch
- [ ] The app was actually run and the new features exercised
- [ ] Anything needing a `npm run seed`, a backfill script, or a new environment variable is
      **listed in the PR body** — these are what break a deploy
- [ ] Nothing half-finished is riding along. Check `gh pr list` and open issues for the modules
      included

List the modules in the release, plainly, so a non-engineer can tell what is shipping.

**A promotion PR is never merged by an agent.** Promoting to production is a release decision — even
when everything passes.

### Hotfixes still go through development

A fix committed straight to production is absent from the branches everyone builds on, so it
reappears as a bug on the next release. `fix/<n>` → development → staging → production, quickly if
needed, but in order.

---

## Which agent am I?

`git config user.email` → the row in `docs/knowledge/TEAM.md`. Check the working agreements there:
who merges into `development`, who promotes. If this user is not that person, say so and offer to
prepare the merge for whoever is, rather than doing it.

## Done when

- [ ] Conflicts resolved with both sides' work intact, no imports dropped
- [ ] `npm test`, `npm run build`, and a real run of **both** features pass
- [ ] The cross-check list above was walked, not assumed
- [ ] Branch pushed, PR commented with what was resolved and verified
- [ ] Migrations, seeds and env vars called out in a promotion PR
- [ ] **The merge itself left to a human**
