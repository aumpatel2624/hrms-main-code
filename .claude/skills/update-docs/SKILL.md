---
name: update-docs
description: Resync the project knowledgebase after a change lands — domain model, rules, checklists, ADR, open questions. Use after a feature is verified, when docs are stale or contradict the code, or when asked to update the docs. Runs after verify, before git-flow.
---

# Update docs

A knowledgebase that drifts is worse than none, because the next agent trusts it. Small step;
skipping it is what makes the whole system rot.

## Gate

The change works (`verify`). Do not document what you have not run.

## What to update

Work through these; most changes touch two or three. Say which you checked and found already correct.

- **`STATE.md`** — always. Mark the phases this change completed, add a Log line (what moved, what is
  next), and clear or add blockers. **Only mark a phase done if you actually ran it** — the next
  session trusts this board and cannot tell it is wrong. If the module is finished, say so to the
  user and ask which one is next.
- **`DOMAIN.md`** — if a model changed: fields, relationships, lifecycle, deletion rule, uniqueness
  scope. This file and `apps/server/models/` describe the same thing; if they disagree, the code is
  right and the doc is stale.
- **`RULES.md`** — any rule implemented, changed or discovered, each naming **where it is enforced**.
  A rule that turned out to be browser-only is a finding, not a detail — say so.
- **`CHECKLISTS.md`** — tick the module's items. If this change revealed a missing step, add it. That
  is the checklist earning its keep.
- **`DECISIONS.md`** — close the ADR: set its status and record what was **actually** built where it
  differs from what was decided. A design that changed during implementation is normal; an ADR that
  pretends otherwise is a lie the next person inherits. Diverged enough to be a new decision? Write a
  new ADR that supersedes it — never edit history.
- **`OPEN-QUESTIONS.md`** — close what this answered, recording where the answer now lives
  (`→ RULES.md INV-4`). Add what it raised. Update the assumptions table. **Only questions about
  *this project* belong here** — a question about what the *starter* does not do is a row in
  `docs/conventions/60-limits.md`, permanent and shipped to every clone. This file starts empty on
  a fresh clone, so anything starter-level parked here is lost the first time `grill-me` runs.
- **`PRD.md`** — only if scope actually moved.

## Tier 1 needs permission

`docs/conventions/`, `AGENTS.md` and the skill files describe how the **starter** works and ship to
every project built from it. Amend them only when a change established a genuinely starter-wide
convention, or when they document something incorrectly — and **state what you want to change and
why, then get explicit confirmation before editing.**

A project-specific rule belongs in `RULES.md`. Every time.

One Tier 1 file changes more often than the rest: **`60-limits.md`**. A change that closes a
documented gap has to move it out of that file and into *What you do get* — leaving it listed is
how a skill ends up telling a client the starter cannot do something it now does. A change that
creates a new limit, or a shortcut with a known ceiling, adds a row with what closing it touches.

## Discipline

- **Delete what is now wrong.** Stale text is the failure mode, not missing text. Never leave an
  outdated paragraph beside a new one.
- **Do not restate the code.** Docs carry intent, constraints and decisions — what you cannot recover
  by reading the source. A doc listing a model's fields will drift; one saying *why* it is shaped
  that way will not.
- **Do not narrate the change.** That is the commit message and the ADR. The knowledgebase describes
  the system as it is now.
- Keep the client's vocabulary.

## Done when

- [ ] `STATE.md` phases marked (only ones actually run), Log line added, blockers current
- [ ] `DOMAIN.md` matches `apps/server/models/`
- [ ] Every new or changed rule is in `RULES.md` with where it is enforced
- [ ] Module checklist ticked; missing steps added
- [ ] ADR closed, recording what was actually built
- [ ] Open questions closed or added; assumptions recorded
- [ ] Nothing project-specific leaked into `docs/conventions/`, and nothing starter-level into
      `docs/knowledge/`
- [ ] `60-limits.md` still true — gaps this change closed removed, new ones added
- [ ] Stale sentences deleted, not just added around

## Next

`git-flow`
