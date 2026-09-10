---
name: git-flow
description: Branch, stage, commit and open a PR using this repo's conventions. Use when asked to commit, push, branch, or open a pull request, or when a verified change is ready to ship. Runs last, after verify and update-docs.
---

# Git flow

## Gate

The change is verified and the docs are updated. **Only commit when the user asks** — finishing a
task is not an instruction to commit it.

## Know whose agent you are

`git config user.email` → the matching row in `docs/knowledge/TEAM.md` → that person's GitHub handle.
Their name goes on the commits, their handle on the PR. If the email is not in `TEAM.md`, stop and
ask. (Solo project with no `TEAM.md`? Carry on — just skip the issue-linking below.)

## Branch

Work happens on a feature branch off `development`, never on a long-lived branch.
`development`, `staging` and `production` are **PR-only** — the guard hook denies commits on them.

```bash
git fetch origin
git switch -c feat/12-bookings origin/development
```

Name it `<type>/<issue-number>-<slug>`: `feat/12-bookings`, `fix/31-delete-guard`. The number links
branch, PR and issue. No issue (solo work, quick fix)? Drop the number, keep the shape.

See `docs/conventions/50-collaboration.md` for the full branch model.

## Stage deliberately

Run `git status` and `git diff` and **read the diff before staging**. Never `git add -A` without
looking — that is how `.env` files, build output and scratch scripts get committed.

Never commit `.env` (any variant but `.env.example`), `apps/server/out/`, `node_modules/`,
`apps/server/log/`, `apps/server/uploads/`, or anything holding a credential. `.gitignore` covers
these; check anyway. New environment variables go into `.env.example` with a comment, same commit.

## Commit

Conventional commits with a workspace scope — the existing convention, visible in `git log`:

```
feat(admin): filter builder, column control, and readable tables
fix(server): reject search filters on unindexed fields
refactor: move shared constants into @demo-panel/shared
```

- Types: `feat` `fix` `refactor` `chore` `style` `docs` `test`
- Scope: `admin`, `server`, `shared`, or omitted when it spans them
- Subject: lowercase, imperative, no trailing period, under ~70 chars
- Say **what changed**, not which files
- One logical change per commit. Fixed a known bug from
  `docs/conventions/10-architecture.md` along the way? Its own commit.

A body earns its place when the *why* is not obvious: the constraint that forced the approach, the
alternative rejected, the ADR it implements (`ADR-007`).

## Push, then open the PR — then stop

**Push as soon as the work is done.** An unpushed branch is invisible to every other agent on the
team, and invisible work gets built twice.

```bash
git push -u origin feat/12-bookings
gh pr create --base development --title "feat(admin): bookings module" --body "..."
gh issue comment 12 --body "PR up: <url>. Ready for review."
```

Target `development`, always. Put `Closes #12` in the body so the issue closes on merge.

**Then ask — do not merge on your own initiative.** Once the PR is open, put the choice to the
user in one message and wait:

> PR is up: <url>. Three ways to go:
> **a) Leave it for review** — default, and what the repo convention expects.
> **b) Merge it now** — squash into `development`, delete the branch, sync your local branch list.
> **c) Merge, keep the branch** — same merge, but the branch stays.

Pick (a) if they do not answer. Never merge silently, and never promote to `staging` or
`production` — those are always human decisions. If the PR has conflicts, that is the `integrate`
skill.

If the work is unfinished but you are stopping, push anyway with a `wip(...)` commit and say so on
the issue — see the `handoff` skill.

## Merge and clean up — only after the user picks (b) or (c)

`gh` does the whole thing. Check the PR is mergeable first, then merge, then resync the local view
of which branches still exist.

```bash
gh pr checks --watch                            # let CI finish; skip if the repo has no checks
gh pr view --json mergeable,mergeStateStatus    # expect MERGEABLE / CLEAN
```

**(b) merge and delete the branch:**

```bash
gh pr merge --squash --delete-branch    # merges, deletes the remote branch and the local one
git switch development
git pull --ff-only origin development   # bring the squashed commit down
git fetch --prune origin                # drop remote-tracking refs for branches deleted on GitHub
git branch -vv | grep ': gone]'         # local branches whose remote is gone — deletion candidates
```

`--delete-branch` removes the local branch too, but only when you are not standing on it — switch
to `development` first if `gh` refuses. `git fetch --prune` is what stops `git branch -r` listing
branches that no longer exist on GitHub; without it those stale refs linger forever.

Delete leftover local branches from earlier merges one at a time, and only after reading that list:

```bash
git branch -d feat/12-bookings   # -d refuses if the branch holds unmerged commits
```

Use `-d`, never the force variant — the refusal is the safety check, and an agent that overrides it
throws away commits nobody has a copy of.

**(c) merge, keep the branch:**

```bash
gh pr merge --squash
git switch development && git pull --ff-only origin development
git fetch --prune origin
```

Squash is the default because feature branches carry noisy work-in-progress commits and
`development` reads better as one commit per module. If the user wants the individual commits kept,
use `--merge`; use `--rebase` only when the branch is linear and already rebased on `development`.

Report back plainly: what merged, which branch went away, and that the local list is back in sync.

## Deploying the merge

**Only after it is merged, and only if the user asks.** Merging is not an instruction to deploy.

**Never edit code on the server to make a deploy work.** If something is broken, fix it locally,
test it, and run this skill again. A file edited over SSH is in nobody's git history and the next
`git pull` silently reverts it — see
[docs/conventions/70-deployment.md](docs/conventions/70-deployment.md).

```bash
ssh <user>@<host>
cd <app directory>
git pull --ff-only origin main    # never a merge commit on a server
npm ci                            # only if package-lock.json changed
npm run build                     # only if apps/admin or packages/shared changed
pm2 restart <app> --update-env    # without --update-env a changed .env is ignored
```

Then check it **from outside the server** — `curl` the public URL, not localhost. The proxy, the
certificate and the same-origin assumptions are part of what you just changed, and none of them are
exercised by a local request.

If the server was ever hand-patched, reconcile it now: confirm the working copy matches `origin/main`
before pulling, and say so if it did not.

## Pull request

```markdown
## What
<one paragraph — what this adds and why>

## Design
Implements ADR-007 in docs/knowledge/DECISIONS.md.
<approach in two or three lines, and the alternative that lost>

## Acceptance check
<from the design brief — what the reviewer does to see it work>

## Verification
- `npm test` / `npm run build` — passing
- Exercised by hand: create, list, filter, sort, edit, delete, delete-blocked path
- Checked as a non-admin user

## Notes
<seed re-run, backfill script, new env vars — anything that breaks another checkout>
```

## Never

Force-push, `git reset --hard` with uncommitted work, rewriting published history, committing
when the user did not ask, merging a PR the user did not approve, force-deleting a branch,
editing code directly on a production server, or promoting to `staging` or `production`. The `PreToolUse` hook blocks the first two — if it fires,
that is the guardrail working. Do not route around it; ask the user.

## Done when

- [ ] Diff read before staging; nothing unintended included
- [ ] No secrets, build output or scratch files
- [ ] Message follows `type(scope): lowercase imperative subject`; one logical change
- [ ] PR body names the ADR, the acceptance check, and what was actually verified
- [ ] Required seed, backfill or env var called out
- [ ] The merge choice was put to the user — never merged on your own initiative
- [ ] If merged: branch deleted per their choice, `git fetch --prune` run, local list back in sync
- [ ] If deployed: pulled and rebuilt on the server — never edited there — and checked from outside
