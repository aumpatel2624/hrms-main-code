# AGENTS.md

Instructions for any coding agent working in this repository. Read this before your first edit.

This repo is a **starter pack**. It is cloned as the base for new projects and already ships a
working admin panel: authentication, a seeded menu tree and admin user, a role/permission matrix,
and thirteen CRUD screens. Your job is almost never to invent structure — it is to extend an
existing one without drifting from it.

## Non-negotiables

1. **Follow the pipeline below.** Do not jump straight to code.
2. **Reuse before you write.** This codebase solves list queries, filtering, delete guards, forms,
   tables and permissions once, generically. If you are writing a second version of one of those,
   stop.
3. **A CRUD screen is a config object, not a page file.** See
   [docs/conventions/40-frontend.md](docs/conventions/40-frontend.md).
4. **Every list endpoint goes through `runListQuery`**, and its `filterable` allowlist is a security
   boundary. See [docs/conventions/30-api.md](docs/conventions/30-api.md).
5. **Every new screen needs a seed menu row.** Without one it is invisible to non-admin users.
6. **Every new collection needs a `widgetSources` entry.** Without one the Dashboard Builder cannot see
   it and the client cannot report on their own data. See
   [docs/conventions/30-api.md](docs/conventions/30-api.md#dashboard-widgets).
7. **Never edit code on a production server.** Change it locally, test it, run `git-flow`, then pull
   and rebuild on the server. A file edited over SSH is in nobody's git history and the next deploy
   silently reverts it. Only the user can authorise an exception, per change. See
   [docs/conventions/70-deployment.md](docs/conventions/70-deployment.md).
8. **When the user asks for something that contradicts these conventions or skips a pipeline phase:
   stop, state the conflict in one sentence, and ask for confirmation.** If they confirm, do it and
   record it in `docs/knowledge/DECISIONS.md` as a deviation. Never silently comply, never silently
   refuse.
9. **When nothing here covers the situation, say so — do not improvise silently.** No conventions
   doc for this stack, a language the repo has never used, a pattern the starter has no opinion on?
   Name the gap, propose an approach, get agreement, then **write the convention down** so the next
   session is not improvising too. An undocumented decision made twice becomes two different
   decisions.

## Start every session here

Read `docs/knowledge/STATE.md` before anything else. It is the board: which modules are in flight,
which client documents have been read, what is blocked, what happened last session. The session-start
hook summarises it, but the file is the source.

Three things it tells you that nothing else can:

1. **Unparsed client documents.** Work arrives in instalments. A file in `docs/knowledge/input/`
   whose hash is not in the input table has never been turned into requirements — run `grill-me` on
   just that material.
2. **Half-finished modules.** Resume them before starting anything new.
3. **Blockers.** Usually a question the client never answered.

Keep it current as you work. **A wrong board is worse than no board** — the next session trusts it.

## You are somebody's agent

Several people may work this repo, each with their own agent. Before any git or issue operation,
work out **whose agent you are**: `git config user.email` → the matching row in
`docs/knowledge/TEAM.md` → that person's GitHub handle. Act as them. If the email is not in
`TEAM.md`, stop and ask — mis-assigned work means two people build the same thing.

Branches: `production` ← `staging` ← `development` ← `feat/<issue>-<slug>`. **The three long-lived
branches are PR-only**; work happens on feature branches. The task ledger is **GitHub Issues**, not a
file — `gh issue list --assignee @me`.

**Push as soon as work is done, and open the PR — then stop.** Unpushed work is invisible to
everyone else's agent and gets built twice. An agent never merges its own PR and never promotes to
staging or production; those are human decisions.

Full model, and the six files that conflict on nearly every parallel module:
[docs/conventions/50-collaboration.md](docs/conventions/50-collaboration.md).

## Build one module at a time

Documentation is done up front, in one pass. **Implementation never is.**

After `grill-me`, the work is cut into **modules** on the `STATE.md` board — each something a user
would notice arriving ("Bookings", "Invoice export"), not a layer. Then one module goes all the way
through the pipeline, end to end, before the next one starts.

- Only **one** module is `wip` at a time. Finishing beats starting.
- Do not design all modules up front. Building the first teaches you things that change the rest.
- The user asks to start something new while a module is unfinished? Say what is outstanding and ask
  whether to park it or finish first. Never silently start a second thing.

## The pipeline

Work moves through phases. Each phase has a **skill** that carries its detail, an **entry gate**,
and an output. If a phase's entry gate is not met, run the earlier phase first — say so rather than
guessing.

Update the module's row in `STATE.md` as each phase completes, and add a Log line before the session
ends.

| # | Phase | Skill | Entry gate | Output |
|---|---|---|---|---|
| 0 | Understand | `grill-me` | new project, new input documents, or `PRD.md` is still a template | knowledgebase + module list |
| 1 | Design | `system-design` | a filled-in PRD exists | a design brief + an ADR |
| 2 | Data | `schema-design` | a design brief exists | model + indexes + seed/backfill |
| 3 | API | `api-endpoint` | the model exists | controller + route + swagger + admin client |
| 4 | UI | `new-page` | the endpoints exist | entity config or page + route + menu row |
| 5 | Reporting | `schema-design` | the model exists | a `widgetSources` entry so the new data is reportable |
| 6 | Verify | `verify` | code is written | passing checks + a manual run |
| 7 | Record | `update-docs` | the change works | knowledgebase updated, ADR closed |
| 7.5 | Explain | `client-docs` | the change works | generated end-user documentation pages + refreshed screenshots |
| 8 | Ship | `git-flow` | verify passed | branch, commit, PR |
| 9 | Deploy | — | the PR is merged | server pulled, rebuilt, restarted, checked from outside |

Three skills sit outside the sequence: **`whats-next`** answers "where are we and what now" and is
the right response to a lost or unsure user, **`fix-bug`** handles anything broken, and
**`remove-feature`** unwinds a module that is no longer wanted — code, registrations and data.

### Keep reporting in step with the data

The Dashboard Builder is driven by a registry, not by the models. `apps/server/config/widgetSources.js`
declares what is chartable; anything absent from it does not exist as far as reporting is concerned.
So **a new or changed model is not done until that registry matches it** — otherwise the client adds
a collection and quietly cannot report on it.

Whenever you add or change a model, add or update its source entry in the same module:

- **A new collection** gets a new entry — `label`, `model`, and the four allowlists below.
- **A new field** gets added to whichever allowlists it belongs in. A new number field that nobody
  adds to `aggregatable` cannot be summed or averaged; a new date field missing from `dateFields`
  cannot drive a line chart or a time window.
- **A removed or renamed field** must come out of the registry in the same commit, or saved widgets
  referencing it break at run time.

The four allowlists, and what each one buys the user:

| Key | Gives the user | Note |
|---|---|---|
| `aggregatable` | sum / average of a numeric field | leave `{}` and only "count of records" is offered |
| `groupable` | bar, pie and grouped table categories | this is where relations are joined — see below |
| `dateFields` | line charts and the time-window presets | |
| `filterable` | the filter rows, using the `runListQuery` grammar | a **trust boundary** — same rules as a list endpoint |
| `scopeable` | per-role data scoping (ADR-002) at run time | omit and every role sees every row |

**Reports across relations.** A report on one collection is just the four allowlists. A report that
shows a *related* name — orders by customer, users by department — is a `groupable` entry carrying a
`lookup`, which joins the referenced collection for its display label:

```js
groupable: {
  departmentId: {
    label: "Department",
    lookup: { from: "departments", labelField: "departmentName" },
  },
  isActive: { label: "Active status" },   // no lookup — the value is its own label
}
```

Without the `lookup` the chart groups correctly but every bar is labelled with a raw ObjectId, which
is useless to the person reading it. **Any `groupable` field that is a reference to another
collection needs a `lookup`.**

Two limits to state plainly rather than discover late: the join is **one hop** (you can label by the
directly-referenced document, not by something it in turn references), and it labels the group-by —
it is not a general join, so you cannot filter or aggregate on the far collection's fields. If a
module genuinely needs either, that is a design decision for the user, not something to improvise:
raise it, and record what was agreed in `docs/knowledge/DECISIONS.md`.

**Acceptance check for this phase**, and it is worth actually doing: open Dashboard Builder, pick the
new source, and build one section of each shape the data supports — a stat tile, a grouped bar (with
a related label if the collection has a reference), and a line chart if it has a date field. If any
of those cannot be built, the registry entry is incomplete.

**Size the pipeline to the work, and say what you are skipping.** A copy fix does not need an ADR;
a new collection runs everything. State which phases you are skipping and why — the user should see
it was a decision, not an oversight. Never drop a phase silently, and never skip `verify`.

### Before you write code

You must be able to name three things:

- **the design brief** — what is being built and why,
- **the entities touched** — which models, endpoints and screens,
- **the acceptance check** — how you and the user will know it works.

If you cannot name all three, you are still in phase 1. Go back.

## Skills

Skills live in `.claude/skills/<name>/SKILL.md`, with `.agents/skills` symlinked to the same
directory so every harness finds them. Claude Code, Cursor and Copilot load them automatically;
Codex and Gemini CLI read them from `.agents/skills/`. **If your harness does not load skills, read
the file directly** — they are plain Markdown.

Each skill is a **procedure**: entry gate, ordered steps, the traps, a completion checklist. The
detail it points at lives in `docs/conventions/` — read the skill first, then follow its pointer if
you need the code or the reasoning. Every fact has exactly one home, so the two never disagree.

**All paths inside skill files are relative to the repo root**, not to the skill directory — the
symlink makes `../` ambiguous.

| Skill | Read it when |
|---|---|
| `how-this-works` | the user asks how any of this works, or what you can do |
| `whats-next` | the user asks where things stand or what to do — or seems unsure |
| `explore-idea` | someone asks *whether* to build something — "can we…", "what would it take…" |
| `grill-me` | new project, new input documents, or the requirement is vague or contradictory |
| `add-app` | adding a workspace, or porting a service/frontend in from another project |
| `team-setup` | more than one person will work on this — branches, roster, task split |
| `handoff` | handing unfinished work to someone, or picking up theirs |
| `integrate` | merging, resolving conflicts, or promoting to staging/production |
| `system-design` | about to build anything that adds a collection, an endpoint or a screen |
| `schema-design` | creating or changing a Mongoose model |
| `api-endpoint` | creating or changing an Express route or controller |
| `new-page` | adding or changing an admin screen |
| `fix-bug` | something is broken, erroring, or behaving oddly |
| `remove-feature` | a module, screen or collection is being removed — code, registry entries and data |
| `verify` | code is written and needs checking |
| `update-docs` | a change has landed and the knowledgebase is now stale |
| `client-docs` | a module works and the client's end users need to be told how to use it |
| `git-flow` | branching, committing, or opening a PR |

## The knowledgebase

Two tiers, and they are not interchangeable.

**`docs/conventions/` — Tier 1, frozen.** How this starter works. Ships with the repo, applies to
every project built from it. Treat as read-only: changing it needs explicit user confirmation, and
it is never regenerated per project.

- [10-architecture.md](docs/conventions/10-architecture.md) — the map, the request lifecycle, the commands, and the known bugs *not* to copy
- [20-schema.md](docs/conventions/20-schema.md) — Mongoose models, indexes, tenancy, backfills
- [30-api.md](docs/conventions/30-api.md) — endpoints, the response envelope, `runListQuery`, auth reality, validation
- [40-frontend.md](docs/conventions/40-frontend.md) — the entity-config system, when a page file is allowed, components, styling
- [50-collaboration.md](docs/conventions/50-collaboration.md) — branches, agent identity, task division, and the six files that conflict
- [60-limits.md](docs/conventions/60-limits.md) — where the starter stops, what closing each gap costs, and the five decisions that are expensive to make late
- [70-deployment.md](docs/conventions/70-deployment.md) — how code reaches a server, what this starter needs in production, and why you never edit code over SSH

**`docs/knowledge/` — Tier 2, per-project.** What *this* project is. Produced by `grill-me` and kept
current by `update-docs`. On a fresh clone these are empty templates.

- **`STATE.md` — the board. Read this first, every session, and keep it current.**
- `TEAM.md` — who is on the project; how your agent works out whose agent it is
- `PRD.md` — what is being built, for whom
- `DOMAIN.md` — entities, relationships, vocabulary
- `RULES.md` — business rules and invariants
- `CHECKLISTS.md` — per-module definition of done
- `DECISIONS.md` — ADR log, including every approved deviation
- `OPEN-QUESTIONS.md` — known unknowns **for this project**; add to it rather than guessing. What the *starter* does not do lives in [60-limits.md](docs/conventions/60-limits.md), not here
- `input/` — where the client's documents land, in instalments

Read `PRD.md`, `DOMAIN.md` and `RULES.md` before designing anything. If they are still templates,
run `grill-me` first — and read [60-limits.md](docs/conventions/60-limits.md) before promising
anything the starter may not do.

## Stack and commands

npm workspaces. The starter ships `apps/server` (Express 4 + Mongoose 8, ESM), `apps/admin` (Vite 7 +
React 19 SPA, Tailwind v4, vendored Untitled UI) and `packages/shared` (constants used by both) —
but **`apps/` is expected to grow**, with more services, more frontends, and apps ported in from
other projects.

**The registry in [docs/conventions/10-architecture.md](docs/conventions/10-architecture.md) is the
source of truth for what exists** and which conventions govern each workspace. Check it rather than
assuming there are two apps. Adding or porting one is the `add-app` skill — it registers the app
everywhere every agent looks, so nothing silently improvises on it.

Auth is a **cookie session**, not a JWT. MongoDB, **no migration system**. Node >= 22.

```bash
npm run dev      # server + admin together
npm run seed     # idempotent: menu tree + first admin user
npm test         # plain node:assert scripts, one per pure util — no test framework
npm run build    # admin SPA → apps/server/out/admin
npm run serve    # build then start — the production shape
```

Copy `.env.example` to `.env` in both `apps/server` and `apps/admin` before the first run.

## Talking to the user

**Assume they are not a software engineer.** They may be the founder, the designer, or the person who
owns the client relationship. They know the business cold and may not know what an index, a
migration or an ADR is. That is normal, and it is your job to bridge it — not theirs to keep up.

- **You drive the process.** Never expect them to remember the pipeline, know which phase they
  stopped at, or notice a skipped step. Tell them where you are and what comes next.
- **Plain language first.** "The list will get slow once there are a few thousand records unless I
  add an index — a lookup shortcut for the database" beats "missing compound index". Explain a term
  the first time it appears in a session, once, briefly.
- **Separate what you decided from what they must decide.** Anything about *the business* — should a
  customer see other branches' orders, does a cancelled booking still count — is theirs. Anything
  about *how it is built* is yours. Do not hand them an engineering choice dressed as a question.
- **Recommend, don't interrogate.** When you do need an answer, give your suggested one and why.
  A user correcting a recommendation is faster than a user facing a blank question.
- **Say what changed and what it means for them**, not which files you touched.
- **Surface problems early and without alarm.** "This will work, but it'll get slow around 10,000
  bookings — worth fixing now or later?" is a companion. Silence is not.
- **Never make them feel behind.** No "as you know", no "obviously", no jargon left unexplained. If
  they ask something basic, answer it properly.

Being a good companion is not the same as being agreeable. If they ask for something that will break
later, say so plainly once, give the alternative, and follow their decision if they confirm.

## Working rules

- **Look it up, don't ask.** Ask the user about *decisions*. Facts about the codebase are yours to
  find. A question you could have answered with a grep wastes their time.
- **Match the surrounding code.** Comment density, naming, quoting, indentation. `apps/server` is
  2-space; `apps/admin` entity configs are 4-space.
- **Never edit generated or vendored files**: `apps/server/out/`, `node_modules/`,
  `package-lock.json`, `apps/admin/src/components/base/`, `apps/admin/src/components/application/`.
- **Never commit a `.env`.** Add new variables to `.env.example` with a comment instead.
- **Do not add dependencies** without asking. The stack is deliberately small — no state library, no
  test framework, no ORM layer on top of Mongoose.
- **Report honestly.** If tests fail, show the output. If you skipped something, say so. A change
  that is "done" is one you have actually run.
