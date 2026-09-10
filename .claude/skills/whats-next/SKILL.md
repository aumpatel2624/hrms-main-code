---
name: whats-next
description: Say where the project stands and what to do next. Use when the user asks what's next, where were we, what's left, what should I do, is anything missed — or opens a session unsure how to continue. Also use before starting new work, to check nothing half-finished is being abandoned.
---

# What's next

The companion check-in. Answer three questions in plain language: **where are we, what is next, and
did we miss anything.**

Assume the user is not a software engineer. They should never have to remember the pipeline, know
which phase they stopped at, or notice that a step was skipped. That is your job.

## Read first

`docs/knowledge/STATE.md` — the board. Then, only as needed: `PRD.md` for what is still unbuilt,
`OPEN-QUESTIONS.md` for what is blocked, `CHECKLISTS.md` for what "done" means on the current module.

Check `git status` and `git log -5` too. The board can be stale; the code cannot lie.

## Report

Keep it short and concrete. No jargon, or explain the word the first time you use it.

```
Where we are
  Customers — finished and shipped.
  Bookings  — half done. The API is written; the screen isn't started yet.

What's next
  Build the Bookings screen. That's the last piece before Bookings works end to end.

Needs you
  Invoicing is stuck: the client hasn't said how tax should round.
  Want me to draft the question so you can forward it?
```

Then offer the next action and wait: *"Shall I carry on with the Bookings screen?"*

## Check for missed steps

Compare the board against reality and **speak up about anything skipped** — this is the part the
user cannot do themselves.

- A phase marked `done` with nothing to show for it in the code
- Code that exists for a phase still marked `-`
- A module that reached `Shipped` without `Verified`
- A screen with no seed menu row (invisible to non-admins)
- A model with no indexes
- Unparsed documents in `docs/knowledge/input/`
- A module sitting `wip` for several sessions
- More than one module `wip` at once

Say what looks off, why it matters in one plain sentence, and offer to fix it:

> The Bookings screen was marked done, but there's no menu entry for it — which means anyone who
> isn't an admin can't see it at all. Want me to add it? Takes a minute.

**Never quietly correct the board.** If it disagrees with the code, tell the user which you trust
and why, then fix it.

## Then route

Point at the phase that comes next and run it — but say which skill you are using and why, so the
user learns the shape over time.

| Situation | Go to |
|---|---|
| Unparsed documents in `input/` | `grill-me` on just the new material |
| Knowledgebase still templates | `grill-me` |
| No module started | pick the next from `PRD.md`, then `system-design` |
| Module `wip` | resume at its first unfinished phase |
| Something is broken | `fix-bug` |
| Everything done | ask what the client wants next |

**One module at a time.** If the user asks to start something new while a module is `wip`, say what
is unfinished and ask whether to park it or finish first. Do not silently start a second thing.

## Done when

- [ ] The user knows where the project stands, in their own vocabulary
- [ ] The next action is named, and they have agreed to it
- [ ] Anything skipped or inconsistent was surfaced, not swallowed
- [ ] `STATE.md` matches reality
