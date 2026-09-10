---
name: add-app
description: Add a new workspace to the monorepo, or port one in from another project — a microservice, a second frontend, a worker, a shared package. Use when asked to add, port, copy in, migrate or bring over an app or service. Registers it everywhere so every coding agent knows the rules for it.
---

# Add an app

An app is not landed when its code compiles. It is landed when **every agent that touches this repo
knows the rules for it** — the registry, the root scripts, the conventions doc, the per-agent
configs, and the hooks.

Miss one and the next session writes code that silently ignores its conventions.

## Gate

Ask two questions before anything else, unless the answer is already obvious:

1. **Does this need to be a new app?** A route on `apps/server` beats a microservice; a page on
   `apps/admin` beats a second frontend. A separate workspace earns itself with a genuinely separate
   deploy, runtime, lifecycle or team. If in doubt, say so and let the user decide.
2. **New, or ported from another project?** Different work — see the two paths below.

For anything non-trivial, run `system-design` first and record an ADR. A new app is an architecture
decision.

## A. New app

1. `apps/<name>/package.json` — `@demo-panel/<name>`, `"private": true`, `"type": "module"`,
   a `dev` script. Copy the closest existing workspace.
2. `npm install` from the root. It joins the workspace automatically — `apps/*` is already globbed.
3. Root `package.json`: add `"dev:<name>": "npm run dev -w @demo-panel/<name>"`. That is all —
   `npm run dev` runs `concurrently "npm:dev:*"` and picks it up. Add `build:`/`start:` entries only
   if it needs them.
4. Skip to **C. Register it**.

## B. Port an app in

Porting is mostly reconciliation, not copying. Work in this order — each step prevents a class of
breakage in the next.

1. **Read before copying.** What is it, what does it depend on, what does it assume exists? Write a
   one-paragraph summary for the user in plain language and confirm it is the right thing.
2. **Copy the source**, excluding `node_modules/`, lockfiles, `.env`, build output, `.git/`, and the
   other project's agent configs (`.claude/`, `.cursor/`, `CLAUDE.md`, `AGENTS.md`) — those describe
   a different repo and will actively mislead.
3. **Rename the package** to `@demo-panel/<name>`. Then grep for the old scope across the copied
   code and fix every import — the old shared package will not exist here.
4. **Reconcile dependencies.** For each dep, check whether the root already has it at a different
   version. Prefer the version already in the repo; note in the ADR anything you could not align.
   Delete its lockfile; the root lockfile governs.
5. **Reconcile conventions.** The imported code follows its old project's rules. List where they
   conflict with `docs/conventions/` — response envelope, error handling, auth, naming, folder
   layout — and pick one per conflict, explicitly:
   - *Conform* — rewrite it to match this repo. Best when the app is small or will be extended here.
   - *Isolate* — keep its conventions, and write them up as a new conventions doc (step C.3) so the
     boundary is documented rather than a trap.

   **Never leave this undecided.** Half-conformed code is the worst outcome: no agent can tell which
   rule applies. Show the user the conflict list and your recommendation per row.
6. **Reconcile shared code.** Anything the ported app duplicates that `packages/shared` already
   provides — validation, roles, permissions — switches to the shared version, or you have two
   sources of truth for one rule.
7. **Environment.** Merge its variables into its own `.env.example` with comments. Never copy a
   `.env`. Tell the user which values they must supply.
8. **Wire the root scripts** as in A.3, and add its build output to `.gitignore`.

## C. Register it — do not skip any of these

This is the part that makes the repo ironclad. Each row is a place an agent looks for rules.

1. **The registry** — a row in the table in `docs/conventions/10-architecture.md`: workspace, type,
   stack, governed by, agent config. Update the request-lifecycle diagram if it participates.
2. **Root docs** — if it changes how the repo is run or built, update the commands table there and
   the stack line in `AGENTS.md`.
3. **Conventions doc** — does an existing type cover it?
   - *Yes* (another Express+Mongoose API, another Vite+React SPA) → point the registry row at the
     existing doc, and note any deviations in it.
   - *No* → write `docs/conventions/<NN>-<type>.md`, numbered after the last one. Match the shape of
     the existing docs: the canonical pattern, the rules that bite, the anti-patterns. It does not
     need to be long — it needs to be true and specific. **Do not skip this**: an app with no
     governing doc is an app every agent improvises on.
4. **Cursor** — `.cursor/rules/<name>.mdc`, copied from the closest existing one, with
   `globs: apps/<name>/**` and pointers to its conventions doc. Keep it short; it is a pointer, not
   a copy.
5. **Claude / Codex / Gemini / Copilot** — nothing to do. They read `AGENTS.md` and the skills, and
   `.agents/skills` is a symlink to `.claude/skills`, so steps 1–3 already reached them. Confirm the
   registry row renders correctly and move on.
6. **Hooks** — the warnings in `.claude/hooks/nudge.sh` match on `apps/*/...`, so a ported app with
   `models/` or `controllers/` is covered automatically, and an unregistered workspace already
   triggers a warning. Two things you may need to add:
   - `.claude/hooks/guard-paths.sh` — if this app's build output lives somewhere new, add its
     **literal** path to the deny list. Keep it exact; a broad pattern like `*/dist/*` would deny
     legitimate source files whose path merely contains that word.
   - `nudge.sh` — a new `case` branch only for a *new* mechanical trap, and only if it is
     deterministic and false-positive free. Judgement calls belong in the conventions doc.
7. **`.gitignore`** — its build output and runtime directories.
8. **Skills** — only if this app introduces a genuinely new kind of work. A second API is covered by
   `api-endpoint`; a Next.js storefront is not covered by `new-page` and needs its own. Ask the user
   before adding a skill; more skills is not automatically better.
9. **`docs/knowledge/STATE.md`** — the app's modules, and a Log line.

## Verify

- [ ] `npm install` from the root succeeds; the workspace resolves
- [ ] `npm run dev` starts it alongside the existing apps
- [ ] Its own build/test command runs
- [ ] Nothing imports across `apps/*`
- [ ] No `.env`, lockfile, `node_modules/` or foreign agent config got committed
- [ ] The registry row exists and its "Governed by" doc actually exists
- [ ] A fresh agent reading only `AGENTS.md` would find the rules for this app

## Done when

- [ ] Every row of **C** is done, or explicitly noted as not applicable
- [ ] Every ported convention conflict was resolved *conform* or *isolate* — none left ambiguous
- [ ] The user was told, in plain language, what landed and what they must configure
- [ ] ADR recorded in `DECISIONS.md`

## Next

`verify`, then `update-docs` and `git-flow`. Build the app's first module through the normal
pipeline — `system-design` onwards.
