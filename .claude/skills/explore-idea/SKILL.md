---
name: explore-idea
description: Assess a possible feature before committing to it — what it would touch, what it would break, roughly how big, and whether to do it. Use when asked can we add, what would it take, is it possible, should we, or when the client is asking about something not yet agreed. Folds it into the plan only if approved.
---

# Explore an idea

Someone is asking whether to build something. **They have not decided yet, and neither have you.**

The job is an honest answer — including "no", or "not like that, but here is something cheaper that
gets you most of it".

## The rule that makes this skill different

**Write nothing to the knowledgebase until the user says go.** An idea explored and rejected must
leave no trace in `PRD.md`, `DOMAIN.md` or `STATE.md`. Half-recorded ideas are how a plan quietly
fills up with things nobody agreed to.

Everything below happens in conversation. Only step 5 touches a file.

## 1. Understand what they actually want

Use the questioning method from the `grill-me` skill — frontier first, one round, each question with
your recommended answer — but keep it **short**. This is a feasibility conversation, not a full
interrogation. Usually two or three questions is enough:

- What problem does this solve, and for whom?
- What does it look like when it works?
- Is this a "must have before launch" or a "would be nice"?

Ask about the *problem*, not the proposed solution. People arrive with a solution already in mind,
and it is often not the cheapest route to what they need.

## 2. Look it up before you judge it

Four checks, in this order. Any of them can end the conversation early:

1. **Does the starter already do this?** Users, roles, per-menu permissions with row-level data
   scoping, departments, locations, currencies, email templates, dashboard widgets, SEO, filtering,
   column preferences, soft delete with reference guards, a field-level audit trail — all present. Read the app registry in
   `docs/conventions/10-architecture.md` and the seeded menu tree.
2. **Or is it a documented limit?** `docs/conventions/60-limits.md` lists what the starter
   deliberately does not do — multi-tenancy, restore, i18n, background jobs, media library, rate
   limiting, audit retention and more — each with what closing it touches. That table is where a
   size estimate comes from, and it stops you promising something by assuming it is there.
   **Never claim a capability without checking one of these two lists.**
3. **Was this already rejected?** Check the "explicitly out of scope" and "deferred" sections of
   `docs/knowledge/PRD.md`. If it was considered and dropped, **say so and say why** — then ask what
   changed. Do not silently re-open a settled decision.
4. **Does something close already exist?** An existing module that could be extended is nearly always
   cheaper than a new one.

## 3. Work out what it would touch

Be concrete. Vague answers here are what produce the estimate everyone regrets:

- **Data** — new collections, or new fields on existing ones? Anything already stored that becomes
  wrong and needs a backfill?
- **Existing behaviour** — what changes for things already built? This is the expensive part and the
  part people forget.
- **The six shared registries** in `docs/conventions/50-collaboration.md` — will this collide with
  work in flight? Check `STATE.md` and, on a team, `gh issue list`.
- **Foundations** — does it need something several future modules also need? Then its real value is
  higher than it looks, and it should land early.
- **Anything the starter's conventions do not cover** — a new app type, a background job, a payment
  provider, file storage at scale. Say so plainly; unknown territory is where estimates break.

## 4. Give a straight recommendation

Size it in **modules and rough shape**, not hours — you cannot know their pace:

> Roughly a module and a half. The model and endpoints are routine; the reporting screen isn't CRUD,
> so it needs a custom page. The awkward part is that existing bookings have no currency stored, so
> we'd need a one-off script to backfill them.

Then land on one of four, clearly:

| | |
|---|---|
| **Build it** | fits, worth it, here is where it slots in |
| **Build less of it** | a smaller version gets most of the value — say which part to drop |
| **Don't build it** | the starter already does this, or the cost outweighs it. Say what to do instead |
| **Can't say yet** | a specific unknown blocks the estimate. Name it and who can answer it |

**"Don't build it" must stay available.** An agent that says yes to everything is not useful. If
they confirm after you have raised the concern, build it — and record the concern in the ADR.

## 5. Only if they say go — fold it into the plan

Now, and not before:

- `PRD.md` — add it to scope. If it displaces something, move that to "deferred" and say so out loud.
- `DOMAIN.md` / `RULES.md` — only what this conversation actually settled. Anything still open goes
  to `OPEN-QUESTIONS.md`, not into a guess.
- `STATE.md` — a new module row, phases `-`, and **placed in sequence**: after anything it depends
  on, and after work already in flight. Do not let it jump the queue silently.
- On a team — `gh issue create` with an assignee, following the division rules in the `team-setup`
  skill. If it depends on someone's in-flight work, note that in the body.
- If they say no — say what you would have done, record nothing, and move on. Add a line to the PRD's
  "out of scope" only if they want the decision remembered.

## Done when

- [ ] You understood the problem, not just the proposed solution
- [ ] Checked: already in the starter · already rejected · close to something existing
- [ ] Named what it touches, including what it breaks in existing behaviour
- [ ] Gave one of the four recommendations, in plain language, with a rough size
- [ ] **Nothing written unless they said go** — and if they did, it is sequenced, not queue-jumping

## Next

Approved and non-trivial → `system-design`. Approved and it needs real requirements work →
`grill-me`. Rejected → nothing.
