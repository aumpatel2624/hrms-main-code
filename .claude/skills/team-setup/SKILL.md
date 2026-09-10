---
name: team-setup
description: Set up the project for a team — create the three branches, record who the members are, and divide the modules into non-colliding tasks as GitHub issues. Use when more than one person will work on the project, when asked to set up the team, split the work, or assign tasks to people.
---

# Team setup

Turn a module list into per-person tasks that **cannot collide**, and get the branch model in place.

Run once per project, after `grill-me` has produced the module list. Re-run when someone joins.

## Gate

Modules exist in `docs/knowledge/STATE.md`. Without them there is nothing to divide — run `grill-me`
first.

Check `gh auth status`. The task ledger is GitHub Issues; if `gh` is not authenticated, stop and
help the user run `gh auth login`.

## 1. Ask who is on the team

Ask plainly: how many people, and for each — name, GitHub handle, what they usually work on. You
cannot look this up.

Then get each person's `git config user.email` **exactly as it is in their clone**. That string is
how their agent identifies them; a wrong one means their agent does not know who it is. If they do
not know it, tell them to run `git config user.email` and paste the result.

Write the roster into `docs/knowledge/TEAM.md` and fill in the working agreements table with them —
who merges, who promotes, whether PRs need review.

## 2. Set up the branches

The repo starts with only `main`. `main` becomes `development`; staging and production are cut
from it.

```bash
git branch -m main development
git push -u origin development
gh repo edit --default-branch development

git switch -c staging development    && git push -u origin staging
git switch -c production development && git push -u origin production
git switch development
```

Then tell the user to protect all three on GitHub (Settings → Branches): no direct pushes, PR
required. **You cannot rely on branch protection existing** — the guard hook denies local commits on
these branches regardless, but protection is what stops a human doing it by hand.

Warn them that renaming the default branch means everyone else must run:

```bash
git fetch origin && git branch -m main development && git branch -u origin/development development
```

## 3. Divide the work so it cannot collide

This is the part that actually matters. Read the module list, then:

1. **Build the dependency graph.** For each module, what must exist before it can be built? A module
   needing another's collection, endpoint or screen depends on it.
2. **Pull out shared foundations.** Anything two or more modules need — a `Company` model, an auth
   change, a shared component. These are **done first, by one person, and merged before parallel work
   starts.** Say this to the user explicitly; it is the single biggest cause of a painful week.
3. **Keep every dependency chain with one person.** If B needs A, one person does A then B. Splitting
   a chain leaves someone blocked while the other guesses at an interface.
4. **Give independent chains to different people.** Independent means different collections,
   different endpoints, different screens, and neither needs the other's code to run.
5. **Match to focus areas** from `TEAM.md` where it does not break rules 3 and 4.

Then check the split against the six append-only registries in
`docs/conventions/50-collaboration.md`. You cannot avoid those conflicts — every module touches them —
but if two people's work collides *anywhere else*, the split is wrong. Fix it now, not at merge time.

**Show the user the plan before creating anything**: who gets what, in what order, what must land
first, and where you had to make a judgement call. They know things about their team you do not.

## 4. Create the issues

One issue per task, one assignee, always.

```bash
gh issue create \
  --title "Bookings module" \
  --assignee priya \
  --label "module:bookings" \
  --body "Build the Bookings module end to end, following the pipeline in AGENTS.md.

Depends on: #11 (Company model) — do not start until that is merged into development.

Acceptance: a user can create a booking, see it in the list, filter by date, edit and cancel it."
```

Create labels first if they do not exist (`gh label create module:bookings`). Record blocking
relationships in the body — `gh` has no dependency field, so the text is the mechanism.

## 5. Record it

`STATE.md` gets a Log line and, per module, who owns it. Point everyone at the `how-this-works`
skill — most of them have not used this setup before.

## Done when

- [ ] `TEAM.md` has every member with their exact git email, and the working agreements are filled in
- [ ] `development`, `staging`, `production` exist on origin; default branch is `development`
- [ ] The user has been told to turn on branch protection, and how others re-point their clones
- [ ] Shared foundations identified and sequenced first, with the user's agreement
- [ ] No two people hold two halves of one dependency
- [ ] One issue per task, each with exactly one assignee and a module label
- [ ] The user saw and approved the split before issues were created

## Next

Each person's agent picks up their own issues (`gh issue list --assignee @me`) and runs the normal
pipeline. `handoff` moves work between people; `integrate` merges and promotes.
