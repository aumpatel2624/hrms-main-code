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
      out of scope for this module; also out of scope for Employee Records (module 2, ADR-018) —
      first needed by Leaves (module 8), alongside Department Approver

### Employee Records (HRMS module 2 — Employee, Employee Health Insurance)

Scope: the employee master everything downstream links to. See ADR-018 — Property History,
Identification Document Type and Department Approver, named in the original module list, moved to
modules 5, 6 and 8 (the modules that actually consume them).

- [x] `Employee` model — new, `employeeCode` globally unique (real org-chart codes, no naming
      series), 4 required refs (`companyId`/`departmentId`/`designationId`/`branchId`), self-referential
      optional `reportsToId`, `userId` optional/nullable (unique-when-set via a custom partial index)
- [x] `EmployeeHealthInsurance` model — new, simple master, same shape as `EmploymentType`/
      `EmployeeGrade`
- [x] `employee.controller.js`/`.routes.js` — its own file (substantial enough), 6 endpoints,
      `filterable`/`stages` with `$lookup`s for department/designation/branch/company/reports-to
      display names on the list
- [x] `EmployeeHealthInsurance` CRUD folded into the existing `organizationSetup.controller.js`/
      `.routes.js` (module 1's grouped-masters file) — same shape as its siblings there
- [x] Real Apidel employee data seeded in `seed/index.js` (idempotent): 195 employees from
      `apidel-org-chart.csv`, two-pass (create, then resolve `reportsToId` by name) — 193 reports-to
      links resolved, matching 195 minus the 2 top-of-hierarchy rows
- [x] **Bug found and fixed via spot-check, not caught by row/link counts alone**: the CSV's Windows
      line endings left `gender` unparseable on the first seed run (every employee got `gender: null`
      despite the CSV having real values) — see ADR-018's As-built note
- [x] `RoleMaster`/`UserRoles` extended: HR User + HR Manager get Employee; Employee Health Insurance
      is HR-Manager-full/**HR-User-read-only** (PERM-2), the first asymmetric split in this project
- [x] "HR Core" menu group added (separate from module 1's "HR Setup" — Employee is the master, not
      configuration)
- [x] Admin entity configs: `employeeConfig` (advanced tier — 8 lookup selects including a
      combined-label reports-to picker) and `employeeHealthInsuranceConfig` (uniform tier)
- [x] `widgetSources.js`: `employees` (groupable by department/designation/company with lookups,
      `dateFields: dateOfJoining`) and `employee-health-insurances` (groupable only)
- [x] `docs-src/manifest.js`: entries for both new screens
- [x] Acceptance check (live HTTP against the real dev database): missing-required-fields create →
      400 → valid create → 201 → **deleting a Department that now has an Employee → 409, the
      cross-module regression check** (module 1's generic delete-guard picked up module 2's new ref
      with zero registration) → HR User read-only confirmed on Employee Health Insurance (200 GET,
      403 POST) → Employee-role blocked (403) on both new screens' search endpoints → Employee-role's
      dropdown `GET /employees` still works (matrix-free) → all throwaway data deleted, Employee count
      back to 195
- [ ] Client-facing documentation screenshots actually captured (`npm run docs`) — same gap module 1
      left, not run this session either
- [ ] `Employee.userId` self-service login provisioning — schema-ready (optional, nullable), no UI
      action to actually create/link a `User` for a specific `Employee` yet (deliberate, ADR-018)
- [ ] Per-screen/company-confinement scoping + Department Approver — deferred to Leaves (module 8)

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

### Recruitment (HRMS module 3 — Job Requisition, Job Opening, Job Applicant(+Source), Interview
Type/Interview(+Feedback), Job Offer(+Term Template))

Scope: the full hiring funnel plus a public job listing. See ADR-019 for the design (idiomatic-rebuild
applied to a module with real Frappe submittable doctypes for the first time) and `DOMAIN.md`'s
Recruitment section for the shipped field shapes/guards. Property History, ID Document Type and
Department Approver (originally sketched for module 2) do not belong here either — see ADR-018.

- [x] 9 new models, no docstatus/naming series (ADR-016) — each keeps only its own `status`/`result`
      field as the state machine. Frappe's `Interview Detail`/`Job Offer Term` child-table doctypes
      folded into plain embedded arrays, not built as separate collections
- [x] `Employee.jobApplicantId` (optional) added — the integration point the reverse hook reads
- [x] Real guards enforced server-side (RULES.md INV-10/11/12): closed-opening + duplicate-application
      on Job Applicant; duplicate-interview-per-type + designation-mismatch on Interview;
      interviewer-assignment + not-before-scheduled-date + duplicate on Interview Feedback;
      duplicate-offer-per-applicant on Job Offer
- [x] Cross-doctype sync (RULES.md FLOW-1/2): closing a linked Job Opening marks its Job Requisition
      Filled; a Job Offer's status change syncs the linked Job Applicant; creating an Employee with
      `jobApplicantId` set flips both the Job Applicant and its open Job Offer to Accepted
- [x] Public job listing (`/api/v1/public/jobs`, `/api/v1/public/jobs/:company/:jobSlug`) — bespoke
      router, NOT built on `runListQuery`/generic `filterable` (ADR-019's deliberate second exception
      to `30-api.md`'s public-endpoint gate), hardcoded `status=Open AND publish=true`, field-
      allowlisted response, no public write endpoint (`OPEN-QUESTIONS.md` Q-7)
- [x] Expired-but-Open postings excluded from the public listing by a read-time date filter — no
      scheduled job (ADR-016/019)
- [x] `RoleMaster`/`UserRoles` extended: HR User/HR Manager full CRUD except Interview Feedback
      (**both read-only** there, RULES.md PERM-3 — only `Interviewer` writes, matching source exactly)
- [x] "Recruitment" menu group (9 screens); public listing correctly has no menu row
- [x] 9 admin entity configs + 3 grouped API wrapper files, following modules 1-2's pattern.
      Known simplification: `interviewers`/`defaultInterviewers` (User-ref arrays) are schema-ready,
      not exposed on the quick-entry forms — no multi-select field precedent in this admin yet
- [x] `widgetSources.js`: `job-openings`/`job-applicants`, groupable only
- [x] `docs-src/manifest.js`: entries for all 9 screens
- [x] A real bug found and fixed during verify, own commit: the public listing's `buildLookups()`
      stringified `null` refs before filtering, producing the literal string `"null"` in a Mongoose
      `$in` ObjectId query, which throws — found by exercising the endpoint with a real posting
      missing an optional field, not by reading the code
- [x] Acceptance check (live HTTP against the real dev database — see STATE.md log): the full funnel
      end to end — Job Requisition → `makeJobOpening` mapping → published Job Opening confirmed
      visible on the unauthenticated public listing and its by-route detail endpoint, salary
      correctly hidden when unpublished → Job Applicant created (name auto-derived from email) →
      closing the opening blocked a new applicant (409) and cascaded the requisition to Filled →
      Interview created, duplicate-type guard confirmed (409) → Interview Feedback: non-assigned
      interviewer rejected (403), assigned interviewer accepted, duplicate rejected (409) → Job Offer
      created, duplicate guard confirmed (409), Accepted status synced the applicant → `makeEmployee`
      mapping → real Employee created, reverse hook confirmed flipping both applicant and offer to
      Accepted → HR User confirmed read-only on Interview Feedback (200 GET, 403 PUT), Employee-role
      confirmed 403 on Job Applicant → all throwaway data (including a throwaway country/state/city
      created solely to satisfy the starter-generic `User` model's required geography fields) cleaned
      up, collection counts back to baseline
- [ ] Client-facing documentation screenshots actually captured (`npm run docs`) — same gap modules
      1-2 left; manifest entries exist for a future run to pick up
- [ ] Public apply flow, Staffing Plan vacancy checks, Employee Referral sync, Skill Assessment
      ratings — all deliberately deferred, `OPEN-QUESTIONS.md` Q-7/Q-8/Q-9, not this module's job

## Onboarding & Separation (module 4, ADR-020)

- [x] `npm test` green (10/10) throughout
- [x] `npm run seed` idempotent ×2 — this module has no real seed data (a workflow module, like
      Recruitment); only the menu group and 12 role-matrix grants are seeded, confirmed 0 new on rerun
- [x] `npm run build` green
- [x] Full live-HTTP walk against the real dev database: Onboarding Template with activities created
      → Employee Onboarding created from it, activities confirmed copied in server-side → duplicate
      onboarding guard confirmed (409) → `makeEmployee` blocked while a required activity was still
      Pending (409, named the activity) → `markAsCompleted` → `boardingStatus` confirmed Completed,
      every activity Completed → `makeEmployee` now returned a correct mapped payload → Employee
      Separation created, duplicate guard confirmed (409) → Exit Interview blocked without a
      relieving date (400, named the employee) → relieving date set on the employee → Exit Interview
      created, duplicate guard confirmed (409) → Full and Final Statement created with an unsettled
      payable/receivable and a Recover-Cost asset, totals confirmed correct (receivable total folded
      in the asset recovery cost) → `markAsPaid` blocked with the exact blocking rows named (409) →
      rows marked Settled → `markAsPaid` succeeded → the cost-required-when-Recover-Cost guard
      confirmed (400) → role-permission asymmetries confirmed live with throwaway HR User/Employee-
      role accounts (HR User: 403 deleting Onboarding, 403 writing Exit Interview, 200 reading it,
      200 deleting a Full and Final Statement; Employee-role: 403 on Employee Onboarding) → all
      throwaway data (including a throwaway country/state/city, same starter-generic-`User` caveat as
      module 3) cleaned up, employee count confirmed back to 195
- [x] A real bug found live and fixed in shipped starter infrastructure, its own commit:
      `models/auditPlugin.js`'s global `mongoose.plugin()` reached embedded subdocument schemas,
      crashing when an existing document's array-of-subdocuments field was modified and re-saved
      (`this.constructor.findById is not a function`) — fixed with a `$isSubdocument` guard, general
      to every current and future embedded-array model in this project, not just this module's
- [ ] Client-facing documentation screenshots actually captured (`npm run docs`) — same gap modules
      1-3 left; manifest entries exist (6 new screens) for a future run to pick up
