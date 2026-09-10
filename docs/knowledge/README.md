# Project knowledgebase

**Tier 2 — per-project.** This directory describes *this* project. It ships empty and is filled in
by the `grill-me` skill, then kept current by `update-docs`.

Contrast with [../conventions/](../conventions/), which is Tier 1: how the starter itself works.
That is frozen and applies to every project built from this repo.

## Starting a new project

1. Drop the client's spec, brief, notes or emails into [input/](input/). Any format.
2. Run the `grill-me` skill. It reads the input, interrogates you in rounds, and writes the files
   below as it goes.
3. Everything after that runs through the pipeline in [../../AGENTS.md](../../AGENTS.md).

| File | Holds | Written by |
|---|---|---|
| [PRD.md](PRD.md) | what is being built, for whom, and what is out of scope | `grill-me` |
| [DOMAIN.md](DOMAIN.md) | entities, relationships, vocabulary | `grill-me`, `update-docs` |
| [RULES.md](RULES.md) | business rules and invariants that code must uphold | `grill-me`, `update-docs` |
| [CHECKLISTS.md](CHECKLISTS.md) | per-module definition of done | `grill-me`, `update-docs` |
| [DECISIONS.md](DECISIONS.md) | ADR log, including approved deviations from convention | `system-design` |
| [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) | known unknowns — added to, never guessed at | everyone |

A file still carrying its "not filled in yet" banner means that phase has not run. Do not design
against a template.
