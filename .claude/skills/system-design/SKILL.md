---
name: system-design
description: Design a module before writing code — map it onto what exists, choose the approach, name the acceptance check, record an ADR. Use when asked to build, add or implement anything spanning a collection, endpoint or screen. Runs first, before schema-design.
---

# System design

Think like whoever gets paged about this at 3am. Most of the value is deciding what *not* to build,
and finding what the codebase already does.

Output is a design brief and an ADR. Not code.

## Gate

`docs/knowledge/PRD.md`, `DOMAIN.md` and `RULES.md` are filled in — not templates. If they still
carry the TEMPLATE banner, run `grill-me` first. If the requirement itself is vague or
contradictory, that is also `grill-me`, not something to design around.

## Steps

1. **Restate** — what is being built, for whom, what "working" means. Check it against the
   knowledgebase. A mismatch means you misread it or the docs are stale; resolve that first. If the
   request contradicts the knowledgebase or `docs/conventions/`, stop and say so in one sentence.
2. **Search before designing.** This is the step that gets skipped and costs the most. Go look at
   `apps/server/models/` (does this entity exist under another name? can it be a field?),
   `routes/v1/` (is there a domain router this belongs in?), and the generic machinery —
   `runListQuery`, `referenceHelper`, `inputValidator`, the CRUD components, `DataTable`,
   `FilterPanel`, `useTablePrefs`, the `Field` family. **If your design reimplements any of these,
   the design is wrong.** Write down what you found and what you are reusing.
   Then check `docs/conventions/60-limits.md`: if the module depends on something the starter
   deliberately does not do — an audit trail, tenancy, background jobs, restore — closing that gap
   is part of this design's scope and cost, not a detail to discover during implementation.
3. **Decide** — collections and uniqueness; tenancy if this is a new top-level entity; which
   endpoints and which role guard on each; which UI branch (see `new-page`); what is deliberately
   out of scope.
4. **Name the acceptance check** — one or two sentences the user could execute to see it work. If
   you cannot write it, the design is not concrete enough yet.
5. **Write the brief** in your reply — what, what is reused, what is touched, the approach, the
   alternative that lost, what is out of scope, the acceptance check.
6. **Write the ADR** — append to `docs/knowledge/DECISIONS.md` using the template there.

## How to weigh it

- Least new surface wins: a field beats a collection, a config beats a component, an existing router
  beats a new one.
- Boring beats clever. Clever is what someone decodes at 3am.
- No speculative generality — no abstraction with one caller, no config for a constant.
- **Never simplify away** validation at trust boundaries, error handling that prevents data loss,
  authorisation, indexes, or anything explicitly asked for.

## Done when

- [ ] Brief names entities, endpoints, screens and the acceptance check
- [ ] Existing machinery was checked and the reuse decision stated
- [ ] UI branch chosen and justified; role guards chosen deliberately
- [ ] ADR written, or its absence explained
- [ ] Unknowns are rows in `OPEN-QUESTIONS.md`, not gaps

Show the brief to the user before building. Write an ADR whenever there was a real choice; skip it
for a mechanical addition that follows an existing pattern exactly — and say you are skipping it.
An ADR listing one option is a note, not a decision. Every deviation from `docs/conventions/` needs
one, with who approved it.

## Next

`schema-design` → `api-endpoint` → `new-page` → `verify`. Skip phases this change does not touch,
and say which.
