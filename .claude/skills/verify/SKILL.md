---
name: verify
description: Check that a change actually works — write the runnable check, run the tests, and exercise the feature in the running app. Use after writing non-trivial code, before committing, when asked to add tests, or when asked whether something works. Runs after new-page.
---

# Verify

"It compiles" is not verification. A change is done when you have watched it work and left behind
something that fails if it stops working.

## 1. Leave one runnable check

**There is no test framework here and you should not add one.** `npm test` runs plain
`node:assert` scripts. Copy the style of `apps/server/utils/listQuery.test.js` and add the new file
to the root `test` script.

**Needs a check:** pure logic that can be wrong without you noticing — a filter builder, a permission
resolver, a calculation, a state transition, anything at a trust boundary.

**Does not:** a model definition, a config object, a thin controller that destructures and saves, a
JSX layout. There is no DB or HTTP harness; building one is a project decision, not something to slip
into a feature. YAGNI applies to tests too.

If the interesting logic is buried in a controller and untestable without a database, extract it into
a pure function in `apps/server/utils/` — the way `listQuery.js` was — and test that.

Assert against an **independent** expected value: a known-good literal, a worked example, the rule
from `RULES.md`. A test that recomputes the expected value the way the code does passes by
construction and can never disagree with the code.

## 2. Run it

```bash
npm test
npm run build   # if the admin was touched — the only type checking the SPA has
```

`npm run lint -w @demo-panel/admin` does not work (eslintrc-shaped config in a flat-config filename,
eslint not an admin devDependency). Show the actual output. Never report a green run you did not see.

## 3. Exercise it by hand

Automated checks do not cover the wiring, and the wiring is what breaks.

```bash
npm run seed    # if you added a menu row or seed data
npm run dev
```

- [ ] Screen appears in the sidebar; list loads; row count right
- [ ] Free-text search; every filter field; operators match the field type
- [ ] Sorting on every `sortable` column — confirm the order actually changes
- [ ] Column show/hide/reorder survives a reload
- [ ] Create, including validation errors — not just the happy path
- [ ] View → edit → save
- [ ] Delete something unreferenced (goes) and something **referenced** (modal names the blockers)
- [ ] Dark mode intact

**Then log in as a non-admin user with a role granting this menu.** Admins bypass the permission
matrix, so an admin-only pass tells you nothing about the menu row, permissions or button gating.
**This is the single most commonly missed step.**

Watch the network tab and server log for requests you did not expect — a search firing on every
keystroke, or twice per navigation, is only visible here.

## 4. Re-read your own diff

Match the surrounding code (`apps/server` 2-space, entity configs 4-space). No stray `console.log`,
commented-out code, `.env` or build artefacts. Did you reimplement something the repo already has?
Walk the standard checklist in `docs/knowledge/CHECKLISTS.md`.

## Done when

- [ ] A runnable check exists for each piece of non-trivial logic, and is in the `test` script
- [ ] `npm test` passes — output shown; `npm run build` succeeds if the admin changed
- [ ] Exercised by hand, including the delete-guard path
- [ ] Checked as a **non-admin** user
- [ ] Diff re-read

Report honestly. Name anything skipped. A change reported as working that was never run is worse
than one reported as untested.

## Next

`update-docs`, then `git-flow`.
