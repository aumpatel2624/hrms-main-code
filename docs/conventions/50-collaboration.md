# Collaboration

Several people work this repo, each with their own coding agent. This is how those agents stay out
of each other's way. Used by the `team-setup`, `git-flow`, `handoff` and `integrate` skills.

## Know whose agent you are

Before any git operation, establish identity:

```bash
git config user.email     # → match against docs/knowledge/TEAM.md
```

That row gives you the member's GitHub handle. **You act as that person.** Their name goes on the
commits, their handle on the issues and PRs. Never assign work to yourself as "the agent" — every
task belongs to a human.

If the email is not in `TEAM.md`, stop and ask who this is rather than guessing. A mis-attributed
commit is annoying; a mis-assigned task means two people build the same thing.

## Branches

Three long-lived branches. **None of them is ever committed to directly** — everything arrives by
pull request.

```
production     what customers run.        ← PR from staging only
    ↑
staging        release candidate.         ← PR from development only
    ↑
development    the shared trunk.          ← PR from feature branches
    ↑
feat/<issue>-<slug>   one task, one person, one branch
```

Branch names carry the issue number: `feat/12-bookings`, `fix/31-delete-guard`,
`chore/44-bump-mongoose`. The number is what links the branch, the PR and the task ledger together.

Promotion is one-directional and never skips a step. A hotfix still goes
`fix/<n>` → development → staging → production; going straight to production means the fix is absent
from the branches everyone else builds on, and it silently reappears as a bug on the next release.

## The task ledger is GitHub Issues

Not a file. A file everybody edits produces a merge conflict on every merge, which is exactly what
this setup exists to avoid.

```bash
gh issue list --assignee @me --state open        # what am I meant to be doing
gh issue list --label module:bookings            # everything for one module
gh issue view 12                                 # the task, its notes, its history
```

Conventions: one issue per task · exactly one assignee, always · `module:<name>` label ·
`phase:<design|schema|api|ui|verify>` label for where it stopped · `blocked` label with a comment
saying what it is waiting on.

The issue is also the handoff channel. Everything a person would need to pick the work up goes in a
comment there, not in someone's head — see the `handoff` skill.

## Divide work so it cannot collide

The rule: **two people never hold two halves of one dependency.**

- Work that depends on other work goes to **one person**, as one chain. Splitting "the model" from
  "the endpoints that use it" across two people means one sits blocked while the other guesses.
- Independent modules go to different people. Independent means: different collections, different
  endpoints, different screens — and neither needs the other's code to run.
- **Shared foundations go first, alone.** If three modules all need a `Company` model, one person
  builds and merges it *before* the other two start. Parallelising on top of an unmerged foundation
  is how you get three incompatible versions of it.
- One person, one module in flight. Finishing beats starting, on a team even more than alone.

## Conflict hotspots — the six append-only registries

This architecture is deliberately registry-driven, which makes adding a module easy and makes
**every parallel module touch the same six files.** Expect a conflict in these on nearly every merge:

| File | The append point | Conflicts when |
|---|---|---|
| `apps/admin/src/entities/index.js` | `UNIFORM_ENTITIES` array + the config above it | two people add CRUD screens |
| `apps/admin/src/entities/advanced.jsx` | `ADVANCED_ENTITIES` array | two advanced screens |
| `apps/admin/src/api/endpoints.jsx` | the `ENDPOINTS` object | two people add endpoints |
| `apps/server/seed/index.js` | the `MENU_GROUPS` array | two people add screens |
| `apps/server/server.js` | the route imports and `app.use` block | two people add routers |
| `apps/admin/src/Routes/allRoutes.jsx` | `authProtectedRoutes` | two people add custom pages |

**These are almost always "take both sides" conflicts** — two independent additions to one list, not
two edits to one line. Resolve by keeping both entries, then check the surrounding array still parses
and no import got dropped. Git marks it as a conflict because the additions are adjacent, not because
there is a real disagreement.

Three that need actual thought rather than "take both":

- **`package.json` / `package-lock.json`** — take both dependency additions, then re-run
  `npm install` from the root and commit the regenerated lockfile. Never hand-merge a lockfile.
- **`docs/knowledge/STATE.md`** — take both sides' rows and log lines. If the same module's phases
  disagree, **the code wins**; check what actually exists before picking.
- **`packages/shared/src/*`** — a real conflict. Two people changed a rule both apps depend on. Do
  not merge mechanically; find out which rule is correct and involve both authors.

To reduce the pain rather than just survive it: keep feature branches short, merge `development` into
your branch often rather than at the end, and land shared-foundation work before parallel work starts.

## Resolving a conflicted PR

Merge `development` **into your feature branch**, never the reverse — that keeps the shared branch
linear and leaves the mess on your branch where it belongs.

```bash
git fetch origin
git switch feat/12-bookings
git merge origin/development       # resolve here
npm install && npm test            # a clean text merge is not a working merge
git push
```

The check that matters is not "does it merge" but **"do both features still work"**. Two entity
configs can merge perfectly and still break if both added a screen at the same `path`, or if one
renamed a shared helper the other now calls. After any non-trivial merge, run the app.

## Pull requests

Target `development`. Reference the issue (`Closes #12`) so it closes on merge. Body follows the
template in the `git-flow` skill.

**An agent opens and updates PRs. An agent does not merge them.** Merging is a human decision, and
promotion to staging or production doubly so.

Push as soon as the work is done, even if the PR is a draft — an unpushed branch is invisible to
everyone else's agent, and invisible work gets built twice.
