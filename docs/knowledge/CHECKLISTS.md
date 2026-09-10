# Checklists

> **TEMPLATE — the standard checklist below is real and applies now.** The per-module section is
> filled in by `grill-me` and `system-design`.

## Standard module checklist

Every module that adds a collection, endpoints and a screen. The `verify` skill walks this.

**Data** — [docs/conventions/20-schema.md](../conventions/20-schema.md)

- [ ] Model in `apps/server/models/`, with `trim`, `isActive`, `{ timestamps: true }`
- [ ] Indexes on every `ref`, every filterable field, and every business-unique key
- [ ] Unique constraints are real indexes, not just a controller `findOne`
- [ ] Backfill script written if a required field was added to an existing collection
- [ ] Delete semantics decided: guarded by `getReferencingCounts`, or documented as unguarded
- [ ] Delete sets `isDeleted` — no `findByIdAndDelete`/`deleteOne` outside genuinely ephemeral data
- [ ] `npm run seed` run against any existing database, to backfill and rebuild the unique indexes

**API** — [docs/conventions/30-api.md](../conventions/30-api.md)

- [ ] All six endpoints, or a written reason for the ones omitted
- [ ] `/search` uses `runListQuery` with `searchFields` and a `filterable` allowlist
- [ ] `filterable` matches the entity config's `filterFields` exactly
- [ ] Every route has an `authMiddleware` guard, and the role choice was deliberate
- [ ] Request validation chain (`allowOnlyFields` + express-validator)
- [ ] Delete calls `getReferencingCounts` and returns the 409 shape
- [ ] Responses use `{ isOk, status, message, data }`, and `isOk` agrees with the HTTP status
- [ ] No password or internal error string in any response body
- [ ] Swagger JSDoc on every route
- [ ] `endpoints.jsx` entry + `*.api.jsx` wrapper in `apps/admin/src/api/`

**UI** — [docs/conventions/40-frontend.md](../conventions/40-frontend.md)

- [ ] Entity config, not a page file — or a stated reason why a page file was necessary
- [ ] Registered in `UNIFORM_ENTITIES` or `ADVANCED_ENTITIES`
- [ ] `columns`, `fields`, `sections`, `filterFields`, `recordTitle` all present
- [ ] Every `sortable` column has a `sortField` that appears in the server's `filterable`
- [ ] Permissions gate the add button and row actions
- [ ] Semantic Tailwind tokens only; dark mode checked
- [ ] **Menu row added to `apps/server/seed/index.js` and `npm run seed` re-run**

**Verify** — the `verify` skill

- [ ] A runnable check exists for every piece of non-trivial logic
- [ ] `npm test` passes
- [ ] Exercised by hand: create, list, search, filter, sort, view, edit, delete
- [ ] The delete reference-guard path was actually triggered and renders correctly
- [ ] Checked as a non-admin user, not just as admin

**Record** — the `update-docs` skill

- [ ] `DOMAIN.md` and `RULES.md` updated
- [ ] ADR in `DECISIONS.md` closed with what was actually built
- [ ] Anything unresolved moved to `OPEN-QUESTIONS.md`

## Per-module checklists

<!-- One section per module from the PRD, listing what "done" means for that module specifically:
     the acceptance criteria, the edge cases that must be handled, the rules from RULES.md it must
     satisfy. The standard checklist above still applies to each. -->

### Email trigger system (dynamic form → template routing)

Scope for this module: the generic mechanism plus the one real trigger site, `otp.controller.js`.
No new consumer form is built (see PRD out-of-scope). See `docs/email-trigger-system.md` for the
background and `docs/knowledge/DECISIONS.md` for the ADR this module produces.

- [x] `apps/server/config/emailTriggers.js`: code registry, trigger key → declared merge fields +
      description, at least one entry (`password.forgot`)
- [x] `EmailFor` gains `triggerKey` (INV-4); backfill the existing "Forget Password" row
- [x] `GET /email-for/triggers` endpoint lists the registry, each entry flagged with the `EmailFor`
      that already claims it (if any), for the create/edit dropdown
- [x] Duplicate-active-template guard on `EmailTemplate` (INV-5) — partial unique index + friendly
      409 pre-check
- [x] Merge-field validation on `EmailTemplate` save against the trigger's declared tokens (INV-6)
- [x] `apps/server/utils/sendTriggeredEmail.js`: the shared function — resolve trigger key → active
      `EmailFor` → active `EmailTemplate`, fill merge fields, send via nodemailer, never throw on a
      missing-template lookup (INV-7); pure helpers (`fillMergeFields`, `validateMergeTokens`,
      `extractTokens`) unit-tested in `sendTriggeredEmail.test.js`
- [x] `otp.controller.js`'s `createOtp` refactored to call `sendTriggeredEmail("password.forgot",
      ...)` instead of its inline lookup/replace/send block; kept its current caller-side behaviour
      on a failed lookup (404, per its existing UX) by mapping the returned `reason`
- [x] `EmailFor`/`EmailTemplate` admin screens updated: `triggerKey` dropdown (not free text) on the
      `EmailFor` form, filtered to unclaimed triggers (+ the record's own current one when editing);
      declared merge fields shown read-only on the `EmailTemplate` form via a new `renderExtra` panel
- [x] `60-limits.md`'s "Email has exactly one wired sender" limit closed/updated to reflect the new
      shared function
- [x] Acceptance check (browser + HTTP, against the real dev database — see STATE.md log): trigger
      dropdown offered exactly the one registered trigger, then emptied once claimed; the claimed
      EmailFor's trigger column showed correctly on the list; the merge-field hint on Email Template
      showed `{{USERNAME}}`/`{{OTP_CODE}}` for the selected Email For, in both light and dark mode —
      confirmed a second time as a non-admin role. A real OTP send delivered end to end through the
      trigger path; the 400 undeclared-token rejection and the 409 duplicate-active-template
      rejection were both triggered directly and returned their exact messages (`verify`,
      2026-09-08).
- [x] Client-facing docs updated: `email-for`/`email-template` gotchas cover the trigger dropdown,
      the merge-field tokens, the one-active-template guard, and the `unassigned.*` edit trap;
      screenshots recaptured; confirmed readable as a non-admin role in both themes (`client-docs`,
      2026-09-09).
