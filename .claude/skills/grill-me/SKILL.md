---
name: grill-me
description: Interrogate the user until a new project or vague requirement is fully pinned down, then write the project knowledgebase. Use when starting a new project, when docs/knowledge/ is still templates, when new or changed documents appear in docs/knowledge/input/, or when building would mean guessing.
---

# Grill me

Reach a shared understanding of what is being built, then write it down. **Writing code is forbidden
in this phase.**

The failure this prevents: reading a half-specified brief, filling the gaps with plausible guesses,
and building a system the client did not ask for.

**This skill assumes the thing is being built.** It writes to the knowledgebase as it goes. If the
user is still asking *whether* to build something — "can we add…", "what would it take…" — that is
the `explore-idea` skill, which records nothing until they decide.

## Gate

Read before asking anything: `docs/knowledge/input/`, the current state of `docs/knowledge/`,
`docs/conventions/` and the seeded menu tree plus existing models.

Two lists keep you honest, and you need both. `docs/conventions/` tells you **what the starter
already solves**, so you do not interrogate the user about it — the project already has users,
roles, departments, locations, currencies, email templates and audit logging. `60-limits.md` tells
you **what it does not do**, so you do not promise something by omission.

## First run, or new material?

Check the input table in `docs/knowledge/STATE.md` before anything else:

```bash
for f in docs/knowledge/input/*; do
  [ "$(basename "$f")" = "README.md" ] && continue
  printf '%s  %s\n' "$(shasum -a 256 "$f" | cut -c1-8)" "$f"
done
```

A file whose hash is **not** in that table is unparsed — either brand new, or edited since it was
read. The session-start check flags these automatically.

**First run** (knowledgebase is templates) — work the whole tree, below.

**New material** (knowledgebase already populated) — do **not** start over. Clients send scope in
instalments; re-asking settled questions makes you look like you were not listening.

1. Tell the user what arrived: *"phase-2.md is new, and brief.md has changed since I read it."*
2. For a changed document, diff against what the knowledgebase already says and work only from the
   delta. For a new one, read it whole.
3. Ask only about (a) what it adds, and (b) **what it contradicts.** Contradictions are the real
   prize — a client who sends a second document often forgets what the first one said. Name both
   versions and ask which wins; never silently take the newer one.
4. Register the new modules in `STATE.md`, phases all `-`.
5. Record each document's hash in the input table when done.

Everything already settled stays settled unless the new material overturns it — and if it does, that
is a change of scope worth saying out loud.

## Method: a design tree, worked in rounds

Model the project as a tree of decisions. The **frontier** is every decision whose prerequisites are
already settled — the questions you can ask *now* without guessing at answers you have not heard.

1. Compute the frontier.
2. Ask the whole frontier in one round, numbered, each with your recommended answer.
3. **Wait.** Do not proceed on your own recommendation.
4. Their answers reshape the tree. Recompute. Go again.

A question that depends on another question still open belongs to a **later round**. Batching
dependent questions forces hypothetical answers, which are worthless.

```
❓ **Q3 — Booking ownership**: Does a booking belong to a customer, or to the site it was made at?
   This decides whether customers see bookings across sites, and what happens when a site closes.

➡️ Recommend: owned by the customer, with a siteId reference. Customers move between sites more
   often than bookings need to survive a site closing.
```

Always recommend. A user correcting your recommendation tells you far more than one staring at an
open question.

## Rules

- **Facts are your job; decisions are theirs.** Never ask what you could grep. If a frontier question
  needs a codebase fact, go find it — and ask the rest of the frontier meanwhile rather than blocking.
- **Ask what the brief does not say.** The gaps are almost always: lifecycle and illegal
  transitions · ownership and visibility · deletion and what happens to referencing records ·
  uniqueness *scoped to what* · rounding, currency and precision · timezones and whether history
  must keep old values · retention — how long records are kept and what may never be destroyed ·
  volume and growth · integrations and their failure modes · **what they considered and rejected**,
  which is the highest-value answer in the session.
- **Work the *Decide before you build* table in `docs/conventions/60-limits.md` in round one.**
  Five questions — tenancy, audit trail, languages, per-screen data scope, a public website — where
  answering late costs far more than answering now. Tenancy especially: this starter has none and
  retrofitting touches every model. An answer of "no" still gets written down.
- **Chase contradictions.** Name both sides and ask which wins. Never quietly pick one.
- **Push back on vagueness.** "Fast", "standard reporting", "the usual permissions" are not answers.
- **Never invent.** Unanswered goes to `OPEN-QUESTIONS.md` with what it blocks.
- **Use the client's vocabulary.** If they say "consignment", the doc, model and route all say
  consignment.

## Write as you go

After each round, write what was settled — do not save it for the end. An interrupted session should
still leave the knowledgebase better.

`PRD.md` scope and out-of-scope · `DOMAIN.md` entities, relationships, lifecycle, vocabulary ·
`RULES.md` invariants and where each is enforced · `CHECKLISTS.md` per-module sections ·
`OPEN-QUESTIONS.md` unknowns and assumptions in force · **`STATE.md` the module list and the
document hash**.

Remove a file's TEMPLATE banner only once it holds real content.

### Splitting into modules

The last act of grilling is cutting the work into **modules** on the `STATE.md` board. A module is
something the user would notice arriving — "Bookings", "Invoice export" — not a layer. Small enough
to finish in one sitting; big enough to be worth demoing.

Order them so each is usable on its own, and put anything another module depends on first. Show the
user the list and the order, in their words, and let them re-prioritise — they know which part the
client will ask about first, and you do not.

## Done when

The frontier is empty — every branch visited, nothing silently assumed.

- [ ] Every entity has lifecycle, ownership, deletion rule and uniqueness scope
- [ ] Every actor has what they can and cannot do
- [ ] All five *Decide before you build* questions have explicit answers, "no" included
- [ ] `PRD.md` has a non-empty out-of-scope section
- [ ] Every remaining unknown is a row in `OPEN-QUESTIONS.md`
- [ ] Modules listed and ordered in `STATE.md`, and the user agreed the order
- [ ] Every document parsed this session has its hash in the `STATE.md` input table

Then summarise and **ask the user to confirm shared understanding.** Do not design until they say yes.

## Next

`system-design` on the **first module only.** Do not design them all up front — build one end to end,
show it, then start the next. Early modules teach you things that change the later ones.
