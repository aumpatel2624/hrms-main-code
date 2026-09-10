---
name: handoff
description: Hand unfinished work to another team member, or pick up work handed to you. Use when the user says hand this off, pass this to someone, I'm busy, take over X's task, or when starting on work someone else began. Makes sure the next person's agent can continue without asking them anything.
---

# Handoff

Moving work between people. The receiving agent gets **only what is written down** — anything left in
the current user's head is lost.

Two directions. Work out which from context.

---

## A. Handing work over

> *"Hand the bookings screen off to Priya, I'm tied up."*

**1. Get it pushed first.** Unpushed work is invisible and unrecoverable by anyone else. Commit
whatever exists — a WIP commit is fine and correct here — and push the branch.

```bash
git add -A && git commit -m "wip(admin): bookings list, filters not wired yet"
git push -u origin feat/12-bookings
```

If it does not build or tests fail, push anyway and **say so in the note**. Handing over broken code
with a warning beats handing over nothing.

**2. Write the note.** This is the actual deliverable. Comment on the issue:

```bash
gh issue comment 12 --body "Handing over to @priya.

**Branch:** feat/12-bookings (pushed, WIP commit at the top)
**Done:** model + indexes, all six endpoints, entity config written
**Not done:** filterFields don't match the server's filterable yet; no seed menu row
**Next step:** add the menu row to seed/index.js, re-run npm run seed, then check the filters
**Watch out:** I reused the Department pattern for the status field — check that's still right
now the client wants three states, not two
**Blocked on nothing.**"
```

Cover: branch, what is done, what is not, the exact next step, anything surprising, and anything
blocked. **Write it for someone who has not seen this code.**

**3. Reassign.**

```bash
gh issue edit 12 --remove-assignee ansh --add-assignee priya --add-label "phase:ui"
```

**4. Update `STATE.md`** — a Log line saying the module moved and to whom.

**5. Tell the user what to say to their teammate.** One sentence they can paste into Slack. The agent
handoff is complete, but a human still has to know it happened — GitHub notifications get missed.

---

## B. Picking work up

> *"Take over the bookings screen from Ansh."* — or an issue assigned to you that you did not start.

**1. Read before touching anything.**

```bash
gh issue view 12 --comments        # especially the handoff note
git fetch origin
git switch feat/12-bookings        # their branch — do NOT start a new one
git log --oneline origin/development..HEAD
```

**2. Verify the claim.** The note says what they believed was done. Check it against the code — not
because they lied, but because "done" gets recorded optimistically. Walk the module's checklist in
`docs/knowledge/CHECKLISTS.md` and find the real edge.

**3. Get current.** Merge `development` into the branch before continuing, so you are not building on
a week-old base:

```bash
git merge origin/development
npm install && npm test
```

**4. Say what you found**, in plain language, before you start:

> Picked up the bookings screen. Ansh had the API and the config done; the filters aren't wired and
> there's no menu row yet, which is why it doesn't show in the sidebar. Also the branch was 40 commits
> behind — I've merged development in. Starting on the menu row now.

**5. Take ownership**: assign the issue to yourself if it is not already, and comment that you have
picked it up.

**6. Continue the pipeline** from whatever phase it actually stopped at — not from the beginning, and
not from where the note claimed.

---

## Which agent am I?

Both directions depend on knowing whose agent you are. `git config user.email` → the row in
`docs/knowledge/TEAM.md` → that person's GitHub handle. If the email is not in `TEAM.md`, **stop and
ask.** Reassigning an issue away from the wrong person, or to the wrong person, quietly breaks the
whole board.

Never hand work to yourself, and never accept a handoff on someone else's behalf.

## Done when

**Handing over:** branch pushed · note on the issue covering done / not done / next step / traps ·
issue reassigned and phase-labelled · `STATE.md` logged · the user has a sentence to send.

**Picking up:** handoff note read · claims verified against the code · `development` merged in ·
issue assigned to you · the user told, plainly, what state it is really in.
