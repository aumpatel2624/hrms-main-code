---
name: client-docs
description: Write the end-user documentation for a module that just shipped — generated page skeletons from the entity configs, prose you write, screenshots captured from the running app. Use after update-docs and before git-flow, or when asked for user guides, client documentation, or a help section. Not for developer docs; those live in docs/conventions/.
---

# Client documentation

Documentation for **the client's end users** — the staff who will use this panel every day. Not for
engineers. Engineers have `docs/conventions/`; confusing the two produces a page that serves nobody.

The test for every sentence here: **would someone who has never seen a database understand it, and
does it tell them something the screen does not already say?** "Department is a required reference
field" fails both. "Every booking belongs to a department, so the team who owns it sees it on their
dashboard" passes.

See [ADR-010](../../../docs/knowledge/DECISIONS.md) for why the documentation is built this way.

## Gate

The module works and `update-docs` has run. Documenting a screen you have not seen working produces
confident descriptions of behaviour that does not exist.

## Before your first run

**The machinery may not be built yet.** ADR-010 specifies four pieces — the screenshot fixture seed,
the capture automation, the generator, and the in-SPA renderer. If `npm run docs` does not exist,
this skill has nothing to run: say so plainly, and treat building it as its own module through the
normal pipeline rather than improvising it inside someone else's.

## Steps

### 1. List the screens this module added or changed

Every screen a user can reach. Check the seeded menu rows in `apps/server/seed/` — a screen with no
menu row is invisible to non-admins and probably should not be documented as though it were
reachable.

Split the list in two, because they are written differently:

- **Config-driven screens** — the ordinary CRUD screens. The generator reads the entity config for
  the fields, filters, columns and permission flags, and produces the skeleton.
- **Custom pages** — anything under `apps/admin/src/pages` that is a real page file. There is no
  config to read, so the whole page is yours to write. The existing ones are the SEO editor, the
  Audit Log, the Dashboard Builder and the Dashboard. **These are the screens users most need
  explained**, and the ones a generator can say nothing useful about.

### 2. Generate the skeletons

Run the generator for the config-driven screens. It gives you structure, never explanation.

### 3. Write the prose

**First, what you do not write.** Adding, viewing, editing and deleting a record work identically on
every config-driven screen, so the generator writes those four sections for you (ADR-013). Do not
restate them per screen. Two flags in the manifest adjust the output:

- `listOnly: true` — the screen lists records and hands off to its own editor rather than the shared
  form, so only the viewing section is emitted.
- `operations: { create, read, update, delete }` — replaces one section's body for a screen that
  genuinely differs. Use it sparingly; a screen needing all four rewritten is probably a custom page.

Those sections quote button labels **exactly as the components render them**. If you rename a button
in `crud-list` or `crud-form`, the generator's text is now wrong everywhere at once —
`docs-fingerprint.test.js` asserts the labels verbatim so that fails the suite rather than shipping.

This is the actual work and nothing can do it for you. Per screen, answer:

- **What is this screen for?** One sentence, in business terms. Not "manages Department records".
- **When would I use it?** The task that brings someone here.
- **What do the fields mean?** Only the ones that are not self-evident. Skip "Name — the name".
  Explain anything that is a reference to another screen, anything with a rule behind it, and
  anything whose label does not match what the business calls it.
- **What can go wrong?** The delete guard that refuses because something references the record, the
  uniqueness rule, the permission that hides a button. Users hit these and assume the panel is
  broken.
- **What does my role change?** Different roles see different buttons and, under data scoping,
  different rows. Say so, or someone will report the difference as a bug.

Write for someone mid-task and slightly frustrated. Short sentences, no jargon, no cross-references
they cannot follow.

### 4. Capture the screenshots

Run `npm run docs`. Capture is **incremental by fingerprint** — only screens whose inputs moved are
recaptured. Inputs are the screen's config or page file, the shared UI components it renders
through, the theme CSS, the fixture seed, and its own capture-list entry.

- A new screen needs an entry in the capture list, or it is silently never photographed.
- Every config-driven screen is photographed in **four views** — the list, the add form, a record,
  and the edit form — so each operation section is illustrated by the screen its steps describe.
  `shots: [...]` in the manifest narrows that; a `listOnly` screen keeps just its list. Both themes
  are captured and the renderer shows whichever matches the reader's, so a screen is 8 images.
- The `view` and `edit` shots are reached by **clicking the row action**, not by URL, because they
  need a real record id. A screen whose fixture data is empty therefore fails the run with a message
  saying so — which is correct: a documentation page illustrated by an empty table is worse than a
  failed build.
- Broad recapture is expected and correct. Touching the shared table component recaptures every list
  screen; editing the fixture seed recaptures all of them.
- `npm run docs -- --force` recaptures everything, for when the cache is not trustworthy.
- **Look at the images.** The build only knows a capture succeeded, not that it shows an empty
  table, a spinner, or a modal caught half-open. This is a two-minute check that saves shipping
  documentation illustrated with pictures of nothing.

If a screen needs data the fixture seed does not produce, extend the seed — do not hand-place a
screenshot. A manually captured image is one nothing will ever regenerate.

### 5. Check it reads

Open the documentation section in the running panel, in both themes, as a **non-admin role**. The
menu row is permission-gated like any other; a documentation tab that only admins can see is
documentation the end users never read.

## Traps

- **Documenting the config instead of the screen.** If a page could be written without opening the
  app, it will not help anyone using the app.
- **Screenshots that rot.** They are the part that goes stale invisibly, which is the whole reason
  capture is automatic. Never disable it to make a build pass.
- **Forgetting the custom pages.** The generator will not warn you. They are the ones users need.
- **Writing developer content.** Collection names, endpoints, index strategy — wrong audience,
  wrong file. That belongs in `docs/conventions/` or the ADR.
- **A new screen with no capture-list entry.** It generates text and never gets a picture.

## Done when

- [ ] Every screen this module added or changed has a page — config-driven and custom
- [ ] The prose answers what it is for, when to use it, what the non-obvious fields mean, what can
      go wrong, and what a role changes
- [ ] `npm run docs` ran clean, and you **looked at** the images it regenerated
- [ ] Any new screen is in the capture list
- [ ] The section opens in the panel in both themes, as a non-admin
- [ ] `STATE.md` notes the documentation phase for this module

## Next

`git-flow`. The generated pages **and the captured PNGs** are committed together — the images are
what let a fresh clone reuse the cache instead of recapturing everything.
