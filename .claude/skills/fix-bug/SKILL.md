---
name: fix-bug
description: Fix something that is broken — a right-sized run of the pipeline. Use when the user reports something not working, wrong data, an error, a button that does nothing, or says something is broken, failing or behaving oddly. Skips design phases unless the bug reveals a wrong rule.
---

# Fix bug

Same pipeline, proportional depth. A bug does not need `grill-me` or an ADR — but it does need a
reproduction, a root cause, and a check that stops it coming back.

**Say which phases you are skipping and why.** The user should see that it was a decision, not an
oversight.

## 1. Reproduce first — always

Never fix from a description alone. Get to the point where you can make it happen on demand:
`npm run dev`, the exact steps, the actual error from the browser console, the network tab, or the
server log.

If you cannot reproduce it, **stop and ask** — the steps, a screenshot, which user they were logged
in as, what data was on screen. Guessing produces a plausible fix for a different bug.

Two reproduction traps specific to this app:

- **Were they an admin or not?** Admins bypass the permission matrix. "The button is missing" is
  usually a missing seed menu row, not a UI bug.
- **Did the request even fire?** Check the network tab before reading any component code.

## 2. Find the root cause, not the symptom

The report names a symptom. Before editing, **grep every caller** of the function you are about to
touch.

The lazy fix *is* the root-cause fix: one guard in the shared function is a smaller diff than a
guard in every caller — and patching only the path the report names leaves every sibling still
broken. Almost everything here routes through shared machinery (`runListQuery`, `referenceHelper`,
the CRUD components), so a bug on one screen is usually a bug on thirteen.

State the root cause in one plain sentence before you change anything.

## 3. Size the fix, and say so

| The bug is | Run |
|---|---|
| Wrong text, styling, a typo | fix → `verify` |
| Logic wrong in one place | fix → `verify` → `update-docs` if a rule in `RULES.md` was wrong |
| Missing index, wrong constraint | `schema-design` → `verify` |
| Wrong endpoint behaviour, validation, guard | `api-endpoint` → `verify` |
| Screen wiring, filter parity, missing menu row | `new-page` → `verify` |
| The requirement itself was wrong | **stop** — this is not a bug. Go to `grill-me`, then `system-design` |

That last row matters. If the code does exactly what was asked and the ask was wrong, fixing the
code silently changes the product. Tell the user, and route it as a change of scope.

## 4. Verify — including the regression

Run the `verify` skill, plus:

- [ ] The original reproduction steps no longer produce the bug
- [ ] The sibling callers you found in step 2 also work
- [ ] A runnable check exists that **fails on the old code** — if it passes either way, it is not
      testing the bug

## 5. Record

- `STATE.md` — a Log line: what broke, what fixed it.
- `RULES.md` — only if the bug was a rule being wrong or unenforced. Note where it is enforced now.
- `docs/conventions/` — only if this was a starter-wide trap worth warning the next project about,
  and only with the user's explicit confirmation.
- If the bug is one of the known ones in `docs/conventions/10-architecture.md`, remove it from that
  list in the same commit.

## Talking about it

The user reported a problem; they do not need the diagnosis story. One or two plain sentences:

> The delete button wasn't doing anything because the screen was checking the wrong permission. Fixed,
> and I added a check so it can't silently break again. Worth testing on your side too.

If the fix reveals something they should decide — the rule was ambiguous, the same bug exists in
three other places, it needs a data cleanup — say so and ask.

## Done when

- [ ] Reproduced before fixing
- [ ] Root cause named in one sentence; every caller checked
- [ ] Phases run were right-sized, and the skipped ones stated
- [ ] A check exists that fails on the old code
- [ ] `STATE.md` logged; `RULES.md` updated if a rule was wrong
