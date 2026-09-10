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

### Organization Setup (HRMS module 1 — Company, Branch, Department, Designation, Employment Type, Employee Grade)

Scope: the org-structure foundation every later HRMS module foreign-keys to. See ADR-017 for the
design (idiomatic-rebuild pattern from ADR-016, applied to the first module) and `DOMAIN.md`'s
Organization Setup section for the shipped field shapes. `HRSettings` deliberately not built this
module (ADR-017 — nothing to configure yet).

- [x] `Company`, `Branch`, `Designation`, `EmploymentType`, `EmployeeGrade` models — new, following
      `Department.js`/`State.js`'s conventions (real compound unique indexes, not just a controller
      `findOne`)
- [x] `Department` extended, not duplicated: `companyId` added (required), uniqueness re-scoped from
      global to per-company (INV-8), `departmentCode` changed from required to optional (real Apidel
      data has no code concept)
- [x] Backfill: `ensureApidelCompany` + `backfillDepartmentCompany` in `seed/index.js`, run before
      `backfillSoftDelete`'s `syncIndexes` (same ordering as the existing EmailFor/EmailTemplate
      backfills)
- [x] `seed/fixtures.js`'s 6 fictional demo departments fixed to carry a throwaway fixture-local
      Company (`Fixture Co`) — kept fictional, not mixed with real Apidel data
- [x] Pre-existing bug fixed while `department.controller.js` was touched anyway: `createDepartment`'s
      duplicate-name 400 respose incorrectly sent `isOk: true` (named in `30-api.md` as a known bug)
      — own commit, per git-flow's "unrelated-but-found bugs get their own commit"
- [x] `organizationSetup.controller.js` / `.routes.js`: 6 endpoints each for Company, Branch,
      Designation, Employment Type, Employee Grade, `checkPermission`-gated, swagger documented
- [x] Real Apidel org data seeded in `seed/index.js` (idempotent, upserted by natural key) from
      `apidel-org-chart.csv`: 1 company, 12 branches, 24 departments (normalized per
      `OPEN-QUESTIONS.md` Q-6), 29 designations, 4 employment types (not derived from the CSV — no
      such column; a reasonable starter set)
- [x] `RoleMaster` + `UserRoles` seeded for the 6 non-admin HRMS roles; only HR User/HR Manager
      granted access to this module's 6 screens (INV-8c) — confirmed live, not just by inspection
- [x] "HR Setup" menu group added; the existing `/department` menu row moved into it **in place**
      (`moveDepartmentMenuToHrSetup`, same _id — existing role permissions survive), not duplicated
- [x] Admin entity configs: `companyConfig`/`employmentTypeConfig`/`employeeGradeConfig` (uniform
      tier, `entities/index.js`); `departmentConfig` (moved)/`branchConfig`/`designationConfig`
      (advanced tier, `entities/advanced.jsx` — each needs a `companyId` lookup select)
- [x] `widgetSources.js`: 6 new entries (`companies`, `branches`, `departments`, `designations`,
      `employment-types`, `employee-grades`), `groupable` only — no numeric fields to aggregate yet
- [x] `docs-src/manifest.js`: entries for all 6 screens (5 new + department's `source` path updated)
      — required for `npm test`'s docs-fingerprint suite to pass, not optional polish
- [x] Acceptance check (live HTTP against the real dev database, cookie session, not just unit
      tests — see STATE.md log): admin login → create Company → create Branch under it → 409 deleting
      a Company with a live Branch reference → Department create rejected (400) without `companyId`,
      accepted with one → HR User role can read/write all 6 screens (200/201) → Employee role blocked
      (403) on the same routes → Employee's dropdown `GET /companies` still works (matrix-free by
      design) → all throwaway test data deleted afterward, collection counts back to the pre-test
      seeded baseline
- [ ] Client-facing documentation screenshots actually captured (`npm run docs`) — manifest entries
      exist and the fingerprint test passes, but the Playwright capture run itself was not executed
      this session (flagged for follow-up, not silently skipped)
- [ ] Per-screen/company-confinement scoping mechanism (INV-8b, `OPEN-QUESTIONS.md` Q-4) — explicitly
      out of scope for this module, first needed by Employee Records (module 2)

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
