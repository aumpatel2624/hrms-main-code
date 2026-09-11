# Domain model

> **TEMPLATE — not filled in yet.** Run the `grill-me` skill.

The shared vocabulary for this project. If the client calls it a "consignment", the model, the
endpoint, the screen and the conversation all call it a consignment. Naming drift is how two people
end up building different systems.

## Vocabulary

<!-- Every domain term that is not plain English, with the definition the client uses. Include terms
     that mean something different here than they do elsewhere — those are the expensive ones. -->

| Term | Means |
|---|---|
| Trigger / trigger key | A stable, dot-namespaced machine name for "an event that should fire an email" (e.g. `password.forgot`, `contact-us.submitted`). Declared in a code registry (`apps/server/config/emailTriggers.js`, mirroring `widgetSources.js`) alongside its allowed merge fields; the admin picks one from a dropdown when creating an `EmailFor` row rather than typing it. One trigger key resolves to at most one active `EmailTemplate` — a form needing two emails fires two trigger keys. |
| Merge field | A `{{TOKEN}}` an `EmailTemplate`'s subject/body may use, declared per trigger key in the code registry. A template is validated against its trigger's declared list on save. |

## Entities

**Delete semantics, every entity (ADR-001): guarded soft delete.** Delete refuses while another
record still references the row (`getReferencingCounts`), and otherwise sets `isDeleted` rather than
removing the document. Deleted rows are excluded from every read, so they are invisible in the panel
and to the delete guard, but the data is still there. Nothing cascades. There is no restore screen —
undeleting is a manual database update. A per-entity **Deletable** line below records only whether
that entity can be deleted at all, not how.

Two exceptions. `Otp` and session documents really are removed — they are consumed tokens, not
history. And **Menu Group** and **Menu Master** are the odd ones out: their delete only sets
`isActive: false`, so the row stays visible in the list and can be switched back on. That predates
ADR-001 and was left as is; see the ADR for why the guard cannot simply be added.

<!-- One block per entity. Keep in sync with apps/server/models/ — update-docs is responsible. -->

### EmailSetup

- **Is a**: One SMTP sending account (host, port, SSL, login email, app password).
- **Owned by / scoped to**: global — shared across every `EmailTemplate` that references it.
- **Identified by**: `email` (the login/from address).
- **Lifecycle**: created by an admin in Setup; `isActive` toggled to retire an account without
  breaking templates that still reference it (the reference guard blocks delete while any does).
- **Deletable**: only when no `EmailTemplate` references it (`getReferencingCounts`).

| Field | Type | Notes |
|---|---|---|
| email | String | login/from address |
| appPassword | String, `select: false` | never rides along in an API response; the mailer asks for it explicitly with `.select("+appPassword")` |
| SSL, port, host | Boolean, Number, String | SMTP connection details |
| isActive | Boolean | |

### EmailFor

- **Is a**: A named "why" a trigger fires, now carrying the machine-readable trigger key that makes
  it resolvable from code as well as human-readable in the admin UI.
- **Owned by / scoped to**: global.
- **Identified by**: `triggerKey` (the stable machine name); `emailFor` remains the human label shown
  in the admin UI.
- **Lifecycle**: created by an admin, picking `triggerKey` from the code-registry dropdown (a
  developer must have declared the trigger in `emailTriggers.js` first). `isActive` toggled to
  retire it; a retired `EmailFor` makes its trigger key resolve to "no active template" rather than
  an error.
- **Deletable**: only when no `EmailTemplate` references it (`getReferencingCounts`, pre-existing).

| Field | Type | Notes |
|---|---|---|
| emailFor | String | human label, existing field |
| triggerKey | String | **new.** Required, unique, must match a key in the code registry — picked from a dropdown, not typed |
| isActive | Boolean | existing field |

### EmailTemplate

- **Is a**: The editable content (subject + HTML body, despite the `emailSignature` field name — see
  the naming gotcha in `docs/email-trigger-system.md`) sent for one `EmailFor`/trigger.
- **Owned by / scoped to**: one `EmailFor` (`emailFor` ref) and one `EmailSetup` (`emailFrom` ref).
- **Identified by**: `templateName`.
- **Lifecycle**: created by an admin; `isActive` toggled to take it out of rotation without deleting
  it. At most one active template per `EmailFor` — enforced, not just conventional (see RULES.md
  INV-5).
- **Deletable**: yes, guarded by the existing reference-guard pattern (no other record references an
  `EmailTemplate`).

| Field | Type | Notes |
|---|---|---|
| templateName, mailerName, emailSubject, emailSignature (= body), emailCC, emailBCC | String | existing, unchanged |
| emailFrom | ref EmailSetup | existing |
| emailFor | ref EmailFor | existing — now indirectly carries the trigger key via the ref |
| isActive | Boolean | existing — now also the fan-in point for INV-5 |

## Relationships

<!-- Cardinality and, more importantly, what happens on delete. The delete answer determines the
     reference-guard behaviour in every controller. -->

| From | To | Cardinality | On delete of the parent |
|---|---|---|---|
| EmailTemplate | EmailFor | many : 1, but at most one **active** EmailTemplate per EmailFor (INV-5) | EmailFor delete blocked while any EmailTemplate references it |
| EmailTemplate | EmailSetup | many : 1 | EmailSetup delete blocked while any EmailTemplate references it |

## HRMS (Apidel)

Full domain detail (field tables, lifecycle, relationships) for each HRMS module is written during
that module's own `system-design`/`schema-design` pass, not all up front — see `STATE.md` for the
module list and AGENTS.md's "Build one module at a time." What's settled now is the shared vocabulary
and the spine every module hangs off.

### Vocabulary (HRMS-specific)

| Term | Means |
|---|---|
| Company | A legal entity within Apidel. First-class model here (Frappe treats it as external/core ERPNext) — every HR/payroll record is scoped to one. |
| Branch | A physical/operational site under a Company (e.g. Vadodara, USA) — distinct from Company; org-chart data calls this "Location". |
| Department, Designation | Standard org-chart classification masters; every Employee has one of each. Real seed values are in `apidel-org-chart.csv` (25 departments, 29 designations, from 195 real employee rows). |
| Employee | The hub every HRMS module links to. Not a Frappe-authored doctype (core ERPNext) — its expected field shape is reconstructed in `HRMS-Port-Spec/02-Cross-Cutting/Employee Core Model.md`; treat that file as the starting field list when this model is built. |
| Self-only, approver-scoped, global (role shapes) | The three shapes every HRMS role takes — see `HRMS-Obsidian-Vault/02-Roles/Roles Overview.md` and `HRMS-Port-Spec/02-Cross-Cutting/Permission Model (RBAC).md`. Employee = self-only; Leave/Expense/Shift Approver = approver-scoped (named on the record, or via Department Approver fallback); HR User/HR Manager/System Manager = global (within their company, per ADR-016). |
| Idiomatic status field | This project's replacement for Frappe's `docstatus` (Draft/Submitted/Cancelled/Amended). Each module's own `RULES.md` entry names its status values and illegal transitions — there is no shared generic lifecycle engine (ADR-016). |

### Organization Setup (module 1, built 2026-09-10 — ADR-017)

Company/Branch/Designation/Employment Type/Employee Grade are new models; Department already existed
as one of the starter's 13 demo screens and was extended, not replaced (see ADR-017 for the reuse
reasoning). None of these are submittable — plain `isActive` masters, no status field.

#### Company

- **Is a**: A legal entity within Apidel — the top of the scoping hierarchy every later HRMS model
  hangs off.
- **Owned by / scoped to**: itself — nothing scopes a Company.
- **Identified by**: `companyName` (globally unique); `companyCode` optional, globally unique when set.
- **Lifecycle**: created by HR User/HR Manager; `isActive` toggled to retire one without breaking
  references. No status field.
- **Deletable**: only when nothing references it (Branch, Department, Designation, and — from module 2
  on — Employee).

| Field | Type | Notes |
|---|---|---|
| companyName | String, required | trimmed, unique |
| companyCode | String | trimmed, unique when present (partial index — see the model file for why not `sparse`) |
| isActive | Boolean | default true |

Seed data: one placeholder row, **"Apidel"** — real multi-company names deferred (grill-me,
2026-09-10: user chose "one entity for now, placeholder name").

#### Branch

- **Is a**: A site/location under a Company (e.g. Vadodara, USA) — a plain name label, not a
  structured address (no Country/State/City linkage; ADR-017 decided that's not needed yet).
- **Owned by / scoped to**: one Company.
- **Identified by**: `branchName`, unique per `companyId`.
- **Lifecycle**: created by HR User/HR Manager; `isActive` toggled to retire one.
- **Deletable**: only when nothing references it.

| Field | Type | Notes |
|---|---|---|
| branchName | String, required | trimmed, unique per companyId |
| companyId | ObjectId ref Company, required | indexed |
| isActive | Boolean | default true |

Seed data: the 12 distinct `location` values in `apidel-org-chart.csv` (Guna MP, Guyana, Indore, Kota,
Meerut, Mumbai, Noida, Porbandar, Pune, Shivpuri MP, USA, Vadodara), all under Apidel.

#### Department (extended)

- **Is a**: A team/department. Pre-existing starter demo entity; core-ERPNext-shaped in the source
  spec, not HRMS-authored.
- **Owned by / scoped to**: one Company (added by ADR-017 — previously unscoped).
- **Identified by**: `departmentName`, unique per `companyId`; `departmentCode` optional (unlike
  before ADR-017, when it was required — the real Apidel data has no code concept), unique per
  `companyId` when present.
- **Lifecycle**: created by HR User/HR Manager; `isActive` toggled to retire one. `User.departmentId`
  (the pre-existing starter demo relation) still points here unchanged.
- **Deletable**: only when nothing references it (existing `getReferencingCounts` guard, unchanged).

| Field | Type | Notes |
|---|---|---|
| departmentName | String, required | trimmed, unique per companyId |
| departmentCode | String | trimmed, optional, unique per companyId when present |
| companyId | ObjectId ref Company, required | indexed; backfilled on pre-existing rows by `ensureApidelCompany`/`backfillDepartmentCompany` in `seed/index.js` |
| isActive | Boolean | default true |

Seed data: 24 real Apidel department names from `apidel-org-chart.csv`, normalized per the two
decisions below, plus the starter's original 6 fictional demo rows (Sales/Operations/Finance/Customer
Support/Warehouse/Human Resources — unchanged, left alone, now scoped to a separate throwaway
"Fixture Co" company created inside `seed/fixtures.js` itself, never touching the real Company).

Two pairs of raw department strings in the CSV are data-entry variants, not distinct departments —
normalized when seeding (decided 2026-09-10, `OPEN-QUESTIONS.md` Q-6): "PR and Social media" / "PR
and social media" → **"PR and Social media"**; "Corporate Recruitment" / "Corporate Recruitment &
Facility Management" → **"Corporate Recruitment & Facility Management"**.

#### Designation

- **Is a**: A job title (e.g. "Sr. Executive"). Frappe's `appraisal_template`/`skills` fields on this
  doctype are Performance/Skills-module concerns, added as fields here when those modules are built,
  not modelled now.
- **Owned by / scoped to**: one Company.
- **Identified by**: `designationName`, unique per `companyId`.
- **Lifecycle**: created by HR User/HR Manager; `isActive` toggled to retire one.
- **Deletable**: only when nothing references it.

| Field | Type | Notes |
|---|---|---|
| designationName | String, required | trimmed, unique per companyId |
| companyId | ObjectId ref Company, required | indexed |
| isActive | Boolean | default true |

Seed data: 29 distinct designation titles from `apidel-org-chart.csv`, under Apidel.

#### Employment Type

- **Is a**: An employment category (Full-time, Contract, ...). **Not** company-scoped — Frappe's own
  source doesn't scope it per company either (ADR-017).
- **Owned by / scoped to**: global.
- **Identified by**: `employmentTypeName`, globally unique.
- **Deletable**: only when nothing references it.

| Field | Type | Notes |
|---|---|---|
| employmentTypeName | String, required | trimmed, unique |
| isActive | Boolean | default true |

Seed data: Full-time, Part-time, Contract, Intern — **not** derived from the org-chart CSV (it has no
employment-type column); a small reasonable starter set for the client to edit.

#### Employee Grade

- **Is a**: A pay-grade label (L1, L2, ...). No `defaultSalaryStructure` field yet — `SalaryStructure`
  doesn't exist until the Payroll module; added there as a schema change to this model, not modelled
  speculatively now. **Not** company-scoped, same reasoning as Employment Type.
- **Owned by / scoped to**: global.
- **Identified by**: `gradeName`, globally unique.
- **Deletable**: only when nothing references it.

| Field | Type | Notes |
|---|---|---|
| gradeName | String, required | trimmed, unique |
| isActive | Boolean | default true |

Seed data: none — nothing in the org-chart data names actual grades, and none were invented.

#### Roles seeded this module

`RoleMaster` rows for the 6 non-admin HRMS roles (Employee, HR User, HR Manager, Leave Approver,
Expense Approver, Interviewer) — `System Manager` maps to the existing `ADMIN` account type, no
`RoleMaster` row. Each has a `UserRoles` matrix document (`dataScope: "all"`); only HR User and HR
Manager are granted read/write/edit/delete on this module's 6 screens (Company, Branch, Department,
Designation, Employment Type, Employee Grade) — the other four roles have no matrix row for them
(fail-closed default: no row = no access), confirmed live in `verify` (see `STATE.md` log).

### Employee Records (module 2, built 2026-09-10 — ADR-018)

Property History, Identification Document Type and Department Approver — named in the original
module list — moved to modules 5, 6 and 8 respectively; see ADR-018 for why.

#### Employee

- **Is a**: The hub every other HRMS module foreign-keys to. Not a Frappe-authored doctype (core
  ERPNext) — its field shape is reconstructed in
  `HRMS-Port-Spec/02-Cross-Cutting/Employee Core Model.md`.
- **Owned by / scoped to**: one Company. Self-scoped to `userId` for future self-service (not built
  yet — see below).
- **Identified by**: `employeeCode`, globally unique (real values from the org chart — `A005`,
  `U001`, ... — no naming-series engine, ADR-016).
- **Lifecycle**: `status` (`Active`/`Inactive`/`Suspended`/`Left`, default `Active`) — no illegal
  transitions enforced yet; set by hand until a module (Separation, module 4) needs to enforce one.
- **Deletable**: only when nothing references it (`getReferencingCounts` — confirmed live: deleting a
  Department that has an Employee now correctly 409s, with no registration needed since Employee's
  `departmentId` ref is enough).

| Field | Type | Notes |
|---|---|---|
| employeeCode | String, required | trimmed, globally unique |
| employeeName | String, required | trimmed — independent of any linked login |
| userId | ref User, optional | unique when set (custom partial index, not `sparse`); null on every seeded row — see "Not built" below |
| companyId, departmentId, designationId, branchId | ref, all required | CSV has complete data for all 195 rows on all four |
| reportsToId | ref Employee, optional | self-referential; null only for the 2 top-of-hierarchy rows |
| status | enum, default Active | Active / Inactive / Suspended / Left |
| dateOfJoining | Date, required | parsed from the CSV's `D-Mon-YY` format |
| relievingDate, dateOfBirth | Date, optional | both null on every seeded row |
| gender | enum, optional | Male / Female / Other — from CSV where present |
| employmentTypeId, gradeId | ref, optional | unseeded — CSV has no data for either |
| expenseApproverId, leaveApproverId, shiftRequestApproverId | ref User, optional | unseeded — fields exist for Leaves/Expenses/Shift Request, the scoping mechanism that reads them is still open (`OPEN-QUESTIONS.md` Q-4) |
| healthInsuranceProviderId | ref EmployeeHealthInsurance, optional | |
| healthInsuranceNo | String, optional | |
| shiftPreference | enum, optional | Day / Night / UK — placeholder ahead of the real Shift & Attendance module |
| workMode | enum, optional | WFO / WFH — from CSV |
| isActive | Boolean | default true |

Seed data: all 195 real Apidel employees from `apidel-org-chart.csv`, including the real reporting
hierarchy (`reportsToId`). **Not built**: bulk-creating 195 real people's login credentials was
explicitly rejected (ADR-018) — provisioning a specific person's self-service login is deliberate
future work, not part of this module.

#### Employee Health Insurance

- **Is a**: A lookup master of insurance providers (Aetna, Cigna, ...).
- **Owned by / scoped to**: global — same reasoning as Employment Type/Employee Grade.
- **Identified by**: `providerName`, globally unique.
- **Deletable**: only when nothing references it.
- **Permissions**: the one doctype so far with an asymmetric split — HR Manager full CRUD, **HR User
  read-only** (no write/create/delete), matching the source exactly. Confirmed live in `verify`.

| Field | Type | Notes |
|---|---|---|
| providerName | String, required | trimmed, unique |
| isActive | Boolean | default true |

Seed data: a small starter set (Aetna, Cigna, Star Health, ICICI Lombard) — not derived from the CSV,
which has no insurance data.

### Recruitment (module 3, built 2026-09-10 — ADR-019)

No docstatus, no naming series (ADR-016) — every doctype below keeps only its own `status`/`result`
field as the state machine. Public job listing lives at `/api/v1/public/jobs` (unauthenticated,
field-allowlisted, hardcoded to `status="Open" AND publish=true`) — see ADR-019 for why this is a
deliberate second exception to the public-endpoint gate in `30-api.md`. The public *apply* flow,
Staffing Plan vacancy checks, Employee Referral status sync and Skill Assessment ratings are all
deferred — `OPEN-QUESTIONS.md` Q-7/Q-8/Q-9.

| Entity | Is a | Owned by | Identified by | Deletable |
|---|---|---|---|---|
| JobRequisition | A headcount request | Company | — | guarded |
| JobOpening | A vacancy posting | Company | `route` (server-generated slug, unique, only set when published) | guarded |
| JobApplicant | A candidate's application | — (global) | — | guarded |
| JobApplicantSource | Lookup master (Referral, Job Board, ...) | global | `sourceName`, unique | guarded |
| InterviewType | A reusable interview round definition | global | `interviewTypeName`, unique | guarded |
| Interview | One scheduled round | — | — | guarded |
| InterviewFeedback | A per-interviewer scorecard | one Interview | `(interviewId, interviewerId)`, unique compound | guarded |
| JobOffer | A compensation/terms offer | Company | — | guarded |
| JobOfferTermTemplate | A reusable set of offer terms | global | `templateName`, unique | guarded |

**Real guards, enforced server-side, confirmed live in `verify`**:
- JobApplicant: creating against a Closed JobOpening → 409; against an opening with
  `preventDuplicateApplicant` and a matching `(emailId, jobOpeningId)` → 409.
- Interview: a second Interview for the same `(jobApplicantId, interviewTypeId)` while one already
  exists with `status != "Cancelled"` → 409. Designation mismatch against the Job Applicant's own → 400.
- InterviewFeedback: interviewer not in the parent Interview's `interviewers` array → 403; before the
  Interview's `scheduledOn` → 400; a second feedback from the same interviewer for the same interview
  → 409 (also a DB unique index, belt and suspenders).
- JobOffer: a second non-Cancelled offer for the same `jobApplicantId` → 409. Status change to
  Accepted/Rejected syncs the linked JobApplicant's status.
- JobOpening → JobRequisition: closing an opening linked to a requisition marks that requisition
  `Filled` with `completedOn = today`.
- **The integration point**: `Employee.jobApplicantId` (optional, added this module) — creating an
  Employee with it set flips the linked JobApplicant and its most recent non-Cancelled JobOffer to
  Accepted (`employee.controller.js`'s `syncJobApplicantAndOffer`, called from `createEmployee`).
  Confirmed live: creating a real Employee from an accepted offer's `makeEmployee` payload correctly
  left both the applicant and offer as Accepted.
- Public listing: an expired-but-still-Open posting (`closesOn` in the past) stops appearing on
  `/api/v1/public/jobs` without anything needing to flip its stored `status` — the query filters
  `closesOn is null OR closesOn >= today` directly (no daily job, per ADR-016/019).

**Permissions**: HR User/HR Manager get full CRUD everywhere in this module except
InterviewFeedback, where **both are read-only** and only the `Interviewer` role writes (matches
source exactly — confirmed live: HR User read succeeds, write 403s). `Interviewer` also gets full
CRUD on Interview. No matrix row for Employee/Leave Approver/Expense Approver on anything here.

**Known simplification**: `Interview.interviewers` and `InterviewType.defaultInterviewers` (arrays of
User refs) are schema-ready but not exposed on the admin forms yet — no multi-select field precedent
existed to build against. Assign interviewers via a direct API call/update for now.

### Onboarding & Separation (module 4, built 2026-09-10 — ADR-020)

No docstatus, no naming series, **no Project/Task** (ADR-020's central decision) — Onboarding and
Separation each own an `activities` array directly; each activity carries its own `status`
(Pending/Completed/Cancelled), and the parent's `boardingStatus` (Pending/In Process/Completed) is
derived straight from them (`deriveBoardingStatus` in each controller) rather than from a linked
Project's percent-complete. Full and Final Statement is a manual worksheet, not an accounting
document — no Journal Entry/GL, no auto-population from Salary Slip/Gratuity/Asset Movement (none of
those exist here); HR enters payable/receivable/asset rows by hand, but totals are still
server-computed on every save and the settlement guard (every line Settled, every returned asset
Returned) still gates `markAsPaid`.

| Entity | Is a | Owned by | Identified by | Deletable |
|---|---|---|---|---|
| EmployeeOnboarding | A hire's onboarding checklist | one JobApplicant | `jobApplicantId`, unique | guarded, not by HR User/HR Manager (System Manager only, matches source) |
| EmployeeOnboardingTemplate | A reusable onboarding checklist | global | `title`, unique | guarded |
| EmployeeSeparation | A departing employee's checklist | one Employee | `employeeId`, unique | guarded, not by HR User/HR Manager (deliberate improvement over a source gap) |
| EmployeeSeparationTemplate | A reusable separation checklist | global | `title`, unique | guarded, HR Manager only |
| ExitInterview | A standalone exit interview record | one Employee | — | guarded |
| FullAndFinalStatement | A final-settlement worksheet | one Employee | — | guarded |

**Real guards, enforced server-side, confirmed live in `verify`**:
- EmployeeOnboarding: a second onboarding for the same `jobApplicantId` → 409 (DB unique index, not
  just a controller check). Template selection copies `activities` in server-side (source only did
  this client-side). `makeEmployee` blocked until every `requiredForEmployeeCreation` activity is
  Completed → 409, message names the incomplete ones.
- EmployeeSeparation: a second separation for the same `employeeId` → 409 — **this guard doesn't
  exist in source** (flagged there as a gap the port should decide on deliberately); added here as a
  real improvement, recorded in ADR-020, not silently copied from nothing.
- ExitInterview: the linked Employee must have `relievingDate` set → 400 if not; a second
  non-Cancelled interview for the same employee → 409.
- FullAndFinalStatement: same relieving-date guard as ExitInterview. `cost` required on any
  `assetsAllocated` row with `action = "Recover Cost"` → 400. `markAsPaid` blocked unless every
  `payables`/`receivables` row is `Settled` and every `Return`-action asset row is `Returned` → 409,
  message lists the blocking rows by name. Totals (`totalPayableAmount`, `totalReceivableAmount`,
  `totalAssetRecoveryCost`) recomputed server-side on every save — confirmed live: a 500-receivable
  row plus a 300-cost recover-cost asset produced `totalReceivableAmount = 800`.

**A real bug found and fixed in shipped starter infrastructure, own commit**: `models/auditPlugin.js`
registers its pre/post-`save` hooks globally (`mongoose.plugin(auditPlugin)`), which reaches embedded
*subdocument* schemas too — any array-of-subdocuments field (this module's `activities`,
`payables`/`receivables`/`assetsAllocated`) got the same hooks run per-row when the parent saved. A
subdocument's `this.constructor` isn't a real Model (no `.findById`), so modifying an *existing*
document's array and re-saving crashed with `TypeError: this.constructor.findById is not a function`
— creating one fresh never hit it, since `isNew` short-circuits past the crashing line. Fixed with a
`this.$isSubdocument` guard at the top of both hooks (a subdocument-level audit entry would be
redundant anyway — the parent's own diff already captures whole-array changes). This is a **general**
fix, not module-4-specific — it protects every future embedded-array model in this project, not just
this one's.

**Permissions**: not the usual full-HR-User-and-HR-Manager pattern — several of these differ, matching
source's real (asymmetric) permission tables: neither HR User nor HR Manager can delete
EmployeeOnboarding or EmployeeSeparation (System Manager/ADMIN only); EmployeeSeparationTemplate and
ExitInterview give HR User read-only; FullAndFinalStatement is the one screen here where HR User also
gets delete. All confirmed live with throwaway HR User/Employee-role accounts.

**Known simplification**: this starter's permission matrix has no "submit" dimension the way source's
submit/cancel/amend columns do, so the `markAsCompleted`/`makeEmployee`/`markAsPaid` action endpoints
are gated on the existing "edit" key rather than a stricter HR-Manager-only action right — source
restricts some of these to HR Manager alone; here HR User can also call them wherever HR User has
edit rights on the underlying screen. Recorded here, not silently narrowed to match source exactly.

### Employee Career Events (module 5, built 2026-09-10 — ADR-021)

`GrievanceType` (simple master), `EmployeeGrievance` (subject/raisedBy/status/grievanceType —
grievance-against is a plain optional Employee ref + free-text fallback, not a generic polymorphic
reference), `EmployeeTransfer`/`EmployeePromotion` (explicit typed department/designation/branch/
grade/CTC fields, applied immediately on create — no generic setattr mechanism, no edit-after-create,
only delete), `EmployeePropertyChange` (the append-only change-log these two write to — replaces
source's generic `Employee Property History`), `EmployeeReferral` (three source bugs fixed, not
reproduced: `status` now actually persists instead of force-resetting to Pending every save;
`departmentId` fetches from the real `referrerId` instead of a nonexistent field; `createAdditionalSalary`
isn't built at all, Payroll doesn't exist yet), `StaffingPlan`/`StaffingPlanDetail` (embedded array —
no parent/subsidiary-company validation, this project's `Company` is flat, not a tree; `currentCount`/
`currentOpenings`/`numberOfPositions`/`totalEstimatedCost` recomputed server-side on every save from
live `Employee`/`JobOpening` counts).

`Employee` gained two things this module needed: `ctc` (optional number — a plain "current total
comp" figure, not a Payroll concept; only writable via `EmployeePromotion`'s own controller, not the
generic Employee edit endpoint) and the `EmployeePropertyChange` back-reference.

**Recruitment retrofit (closes `OPEN-QUESTIONS.md` Q-8)**: `jobOpening.controller.js`/
`jobOffer.controller.js` (module 3) now check for an active `StaffingPlan` covering their
designation+company; if one exists and current usage (Active employees + other Open postings for
that designation) would reach or exceed the plan's `numberOfPositions`, the create is rejected 409.
No plan for that designation+company means no cap — unchanged from module 3's original behavior.
Confirmed live: a plan capped at 2 positions allowed a first Open posting, rejected a second, and
rejected a Job Offer for the same exhausted designation.

**Deferred, out of scope for this module**: inter-company transfer (source's `create_new_employee_id`
— deep-clones the Employee to a new company, relieves the old one); referral bonus payout
(`Additional Salary`, Payroll-dependent); source's parent/subsidiary-company Staffing Plan validation
(no company hierarchy exists to validate against).

### Training & Skills (module 6, built 2026-09-10 — ADR-022)

`TrainingProgram` (simple master with a plain user-set status), `TrainingEvent` (eventName/type/
location/startTime/endTime — endTime strictly after startTime, real guard — plus an embedded
`employees[]` array carrying attendance/status/hours/grade/comments; source's separate "Training
Result"/"Training Result Employee" fold directly in here, since there's no docstatus left to gate a
submittable wrapper around per-attendee scoring). Actions `markCompleted` (Present + not-yet-
Feedback-Submitted rows → Completed) / `markScheduled` (every row → Open, unconditional reset)
reproduce source's real `on_update_after_submit` cascade explicitly. `TrainingFeedback` (employeeId/
trainingEventId/feedback, guarded: event must be Completed, employee must be an attendee, attendance
must not be Absent; on create flips that attendee row to `Feedback Submitted`). `Skill` (simple
master, HR-Manager-full/HR-User-**read-only** — matches source exactly). `EmployeeSkillMap`
(employeeId unique, `employeeSkills[]` of skillId+proficiency 1-5, default `3` not source's `1` — a
mid default reads as "not yet assessed," source's hardcoded lowest-possible default reads oddly for
an auto-populate action). Action `populateFromDesignation` — the server-side version of source's
client-only "copy Designation.skills in" convenience.

`EmployeeTraining` (a per-Employee "trainings attended" child table) is dropped entirely — source's
own spec couldn't confirm which doctype embeds it, and querying `TrainingEvent.employees.employeeId`
already answers the same question without a second, redundant collection to keep in sync.

**Three retrofits into already-shipped modules, closing the Skill Assessment half of
`OPEN-QUESTIONS.md` Q-9** (each its own commit): `Designation.skills[]` (module 1) — source's
"Designation Skill" child table, folded into a plain ref array now that `Skill` exists, consumed by
`populateFromDesignation`. `InterviewType.expectedSkillSet[]` and `InterviewFeedback.skillAssessment[]`
(module 3) — both explicitly deferred by their own modules pending `Skill`'s existence. **Two real
bugs found wiring these in, both fixed**: `Designation`'s and `InterviewType`'s update controllers
both overwrote unrelated fields with `undefined` on a partial update (the exact failure mode a
`skills[]`-only PUT triggers), and `InterviewType`'s create plus `InterviewFeedback`'s create both
still destructured their pre-retrofit field lists, so the new array fields silently never saved.

### Travel (module 7, built 2026-09-10 — ADR-023)

`PurposeOfTravel` and `IdentificationDocumentType` — two simple one-field masters (name, isActive),
ADMIN-only (no RoleMaster grants for any of the six HRMS roles), matching source's own literal
System-Manager-only permission table for both.

`TravelRequest` — employeeId (required ref, Inactive-employee guard, real source rule), travelType
enum (Domestic/International, required), travelFunding (optional enum), purposeOfTravelId (required
ref), detailsOfSponsor, description, personalIdTypeId (optional ref `IdentificationDocumentType`),
personalIdNumber, `itinerary[]` (travelFrom/travelTo, modeOfTravel enum, mealPreference enum,
travelAdvanceRequired bool, advanceAmount as a real Number — source's own field is untyped Data, a
correct-typing improvement, not a new calculation — departureDate/arrivalDate, lodgingRequired bool,
preferredAreaForLodging, checkInDate/checkOutDate, otherDetails), `costings[]` (expenseType as free
text for now — `ExpenseClaimType` doesn't exist yet, see `OPEN-QUESTIONS.md` Q-13 —
sponsoredAmount/fundedAmount/totalAmount as plain Numbers, **not computed**, comments), status enum
(Draft/Submitted/Cancelled, default Draft, no transition guards — no docstatus, per ADR-016),
companyId (fetched from the employee).

**Access opened up from source's literal permission table**, the one real judgment call this module
made: source declares only System Manager for all three doctypes, with no explicit submit/cancel
rights even for that role — the port spec itself calls this out as an incomplete area, not a
deliberate design to preserve. `Employee` gets full-minus-delete on Travel Request, `HR User`/
`HR Manager` get full access — the same self-service-shaped pattern this project already uses
everywhere else (no per-row self-only scoping yet, per the still-open Q-4).

**Two things explicitly not invented, because source doesn't have them either**: no rollup
`totalAmount` on a costing row (manually entered, despite the field name implying a sum) and no
date-order validation on itinerary rows (departure/arrival, check-in/check-out).

### Leaves (module 8, complete 2026-09-10 — ADR-024, `feat/leaves` + `feat/leaves-transactions`)

The largest module yet, deliberately split into two stacked forks — both now built. The foundation
fork built the infrastructure every other half depends on, plus the "configuration" doctypes; the
second fork built the "transactional" doctypes below.

**Two cross-cutting mechanisms, not specific to Leaves at all**, finally answer `OPEN-QUESTIONS.md`
Q-4 and Q-5: `UserRoles.roles[].dataScope` (per-menu-row scope override — a role can now be
`own`-scoped on one screen and `all` on the rest, `null` inherits the role default) plus a new
`APPROVER` scope value (a person's own rows, plus everyone they resolve as the approver for); and
`SchedulerRunLog` + `jobs/leaveScheduler.js` (a dependency-free, single-process, day-granularity
background job runner — no `node-cron`, per AGENTS.md's no-new-dependency rule colliding with an
offline user).

`LeaveType` — the configuration doctype every other collection reads flags off of: paid/unpaid
(`isLwp`), partial-pay (`isPpl` + `fractionOfDailySalaryPerLeave`), carry-forward (+ max/expiry-days),
encashment (+ max/non-encashable), earned-leave accrual (`earnedLeaveFrequency`/`allocateOnDay`/
`rounding`), `maxLeavesAllowed`/`maxContinuousDaysAllowed`/`applicableAfter`. Seeded with a generic
5-type starter set (Casual/Sick/Earned/Compensatory Off/Leave Without Pay) — not confirmed against
any client document, same caveat as Travel's masters.

`LeavePeriod` — a named date range (e.g. a fiscal year) scoped to one Company, no two overlapping per
company.

`HolidayList` (+embedded `holidays[]`) and `HolidayListAssignment` — a calendar of holidays per
company/date-range, assignable to an Employee or a Company (exactly one of the two, matching
`applicableFor`) from a given date onward, within the assigned list's own date range.

`LeavePolicy` (+embedded `leavePolicyDetails[]`, one `(LeaveType, annualAllocation)` pair per row,
capped at that Leave Type's own `maxLeavesAllowed` when set) and `LeavePolicyAssignment` (assigns a
policy to an employee for a period — `assignmentBasedOn` "Leave Period"/"Joining Date" auto-derives
the effective dates, no two overlapping assignments per employee). Its `grant-allocations` action is
the real trigger: creates one `LeaveAllocation` per non-LWP policy detail, tenure-pro-rated (whole
numbers) for ordinary types or schedule-summed (decimals) for earned-leave types, idempotent via
`leavesAllocated`.

`LeaveAllocation` (+embedded `earnedLeaveSchedule[]`) — the actual per-employee, per-leave-type grant.
`totalLeavesAllocated` is a cached display snapshot; the real balance is always the sum of
`LeaveLedgerEntry` rows (`utils/leaveBalance.js`). Once `active`, the granted amount can only change
via the `/adjust` action (a signed delta ledger entry) — the generic edit endpoint rejects a direct
change.

`LeaveLedgerEntry` — append-only, system-written, read-only from the API and the admin (a custom page,
not a CRUD screen, same reasoning as Audit Log). Every balance-affecting action writes here; nothing
else is ever trusted as a balance.

`Department` (ADR-017) gained `parentDepartmentId` (optional self-ref, depth-10-bounded walk, no
protection against anything but a direct self-cycle) and three approver arrays
(`leaveApprovers`/`expenseApprovers`/`shiftRequestApprovers`, plain `User` ref arrays — schema-ready,
not given a form field yet, same precedent as Recruitment's `interviewers`). `utils/approvers.js`
resolves an employee's approver: their own direct field if set, otherwise the union of the matching
array across their whole department ancestor chain.

`Attendance` — a deliberately minimal one-row-per-employee-per-day model (module 9, Shift &
Attendance, extends it with shift/check-in/geolocation later), built by the foundation fork only
because Leave Application/Compensatory Leave Request (below) need something to reference.

`LeaveAdjustment` — a one-off manual balance correction. Create *is* the action (ADR-024): saving
writes one signed `LeaveLedgerEntry` immediately (positive for Allocate, negative for Reduce); no
update, no delete — it does **not** touch `LeaveAllocation.totalLeavesAllocated`, matching source
exactly (the ledger is the only thing that changes).

`CompensatoryLeaveRequest` — a request for comp-off leave for a day worked on a holiday.
`leaveTypeId` must be `isCompensatory`. `/approve` validates active-employee, date order, that every
worked day is a real holiday per the employee's resolved Holiday List (new `utils/
holidayResolution.js`, employee-then-company fallback), and that matching `Attendance` rows exist for
the whole range — a hard block, not an auto-create, since nothing populates Attendance yet. On
success it finds/extends or creates a `LeaveAllocation` dated the day after the worked range and
writes a ledger entry; `/reject` has no side effects.

`LeaveApplication` — the module's centerpiece, an employee's request for time off.
`totalLeaveDays` is always server-recomputed (new `utils/leaveDayCalculation.js`), never trusted from
the client. `leaveApproverId` auto-resolves via `resolveApprovers` when omitted, or is validated
against that resolved set when supplied — either way, the resolved/supplied approver's own linked
Employee can never be the applicant themself (self-approval prevention). Create validates, in order:
active-employee, half-day date sanity, balance sufficiency (`allowNegative` override), overlap with a
half-day-adjacency carve-out, max-consecutive-days (a one-hop adjacency merge — a documented
simplification of source's full recursive chain walk), block-date enforcement (`LeaveBlockList`,
below — a hard block at create, stricter than source's approve-time-only check), `applicableAfter`
vs. joining date, and `isOptionalLeave` against the covering Leave Period's optional Holiday List.
`/approve` re-checks balance, creates/updates `Attendance` rows for the range, and writes 1-2
`LeaveLedgerEntry` rows (split across an allocation boundary when the range crosses one). `/reject`
has no side effects. `/cancel` (approved applications only) reverses both the ledger entries and the
`Attendance` rows via soft-delete.

`LeaveEncashment` — cashes out unused leave for a Leave Type with `allowEncashment` set. Balance and
eligible days are computed via `getLeaveBalance` at creation, capped by the Leave Type's
`nonEncashableLeaves`/`maxEncashableLeaves`. `perDayEncashmentAmount` is manually entered — this
project has no Payroll module yet to derive it from (`OPEN-QUESTIONS.md` Q-14). Create is the action
(writes the debiting ledger entry immediately, same as `LeaveAdjustment`); `/mark-paid` records
amount/date/reference only — no GL, no Payment Entry (the same manual substitute Full & Final
Statement established in module 4).

`LeaveBlockList` (+embedded `blockDates[]`, +embedded `allowList[]` — a single `allowUserId` ref,
matching the real source spec exactly, not a role-or-user shape) — dates on which leave applications
are blocked, for a company and optionally one department and/or one Leave Type; a user on the allow
list bypasses the block. New `utils/leaveBlockList.js` (`listApplies`/`getApplicableBlockLists`/
`getBlockedDatesInRange`/`isDateBlocked`) is shared by `LeaveApplication`'s validation chain.

**Leave Control Panel** — no stored model (a stateless bulk-action form in source too, a Frappe
Single). Two endpoints, both with per-item try/catch isolation so one employee's failure never aborts
the batch: `bulk-policy-assignments` creates `LeavePolicyAssignment` rows left unallocated;
`bulk-allocations` additionally calls the same `grantAllocationsForAssignment` logic
(`leaves.controller.js`, extracted from the single-assignment `/grant-allocations` route handler so
both share one implementation) per employee immediately after. A lightweight custom admin page
(`pages/Leaves/LeaveControlPanel.jsx`), not entity-config CRUD.

`generateLeaveEncashments` (the third of the module's three scheduled jobs, `jobs/leaveScheduler.js`)
reads `LeaveAllocation` rows `processExpiredAllocations` just expired in the same scheduler pass
(ordering matters — matched on `status: "expired"`) whose Leave Type allows encashment, and drafts one
`pending` `LeaveEncashment` per eligible allocation (idempotent via a `leaveAllocationId`-exists
check) — left for HR to fill in the real per-day rate and confirm before marking paid.

### Shift & Attendance (module 9, complete 2026-09-11 — ADR-025, `feat/shift-attendance` + `feat/shift-attendance-transactions`)

The foundation half of Module 9 delivers core shift definitions, location geofencing, assignments, recurring schedules, punches/checkins, and the extended attendance tracking model.

`ShiftType` — defines a recurring shift's time boundaries (`startTime`, `endTime`, string "HH:mm:ss"), buffer windows (`beginCheckInBeforeShiftStartTime`, `allowCheckOutAfterShiftEndTime`), working hours thresholds (`workingHoursThresholdForHalfDay`, `workingHoursThresholdForAbsent`), calculation mode (`workingHoursCalculationBasedOn`: "First Check-in and Last Check-out" vs. "Every Valid Check-in and Check-out Pair"), auto-attendance flags (`enableAutoAttendance`, `determineCheckInCheckOut`), and process loss / late mark thresholds (`processLossAfterTime`, `lateMarkAfterTime`).

`ShiftLocation` — defines an operational checkin location (`locationName`, `companyId`, `latitude`, `longitude`, `checkinRadius` in meters). When coordinates and radius > 0 are configured, employee checkins at this location enforce proximity via haversine distance.

`ShiftAssignment` — links an `Employee` to a `ShiftType` starting at `startDate` through optional `endDate` (`companyId`, `shiftLocationId`, `status`: "active"/"inactive"/"cancelled"). An employee may have at most one active assignment at any point in time. "Effectively active" is computed dynamically at query/validation time rather than updated by a daily expiry cron. Writes are serialized per-employee using an in-memory promise mutex.

`ShiftSchedule` — defines a reusable multi-shift template (`scheduleName`, `companyId`, `frequency`: "weekly", `repeatEvery`, `scheduleShifts[]` specifying day of week 1-7, shiftTypeId, and optional shiftLocationId).

`ShiftScheduleAssignment` — assigns an employee to a `ShiftSchedule` from `startDate` through optional `endDate`, maintaining a `createShiftsAfter` watermark date. The `POST /shift-schedule-assignments/:id/generate` action generates non-overlapping concrete `ShiftAssignment` records sequentially up to `min(effectiveEndDate, today + generateDaysAhead)` and monotonically advances `createShiftsAfter`.

`EmployeeCheckin` — records a timestamped punch (`employeeId`, `time`, `logType`: "IN"/"OUT", `deviceInfo`, `shiftLocationId`, `latitude`, `longitude`, `skipAutoAttendance`, `attendanceId`). Validates geofence proximity against the assigned shift location if coordinates are configured. Resolves the active `ShiftAssignment` and shift occurrence window (including overnight shifts crossing midnight). Once linked to an `Attendance` record (`attendanceId`), its core fields (`time`, `employeeId`, `logType`) become immutable.

`Attendance` (extended from Module 8) — tracks daily presence per employee with a strict `(employeeId, attendanceDate)` unique compound index. Extended with `departmentId`, `shiftId`, `attendanceRequestId`, `workingHours`, `standardWorkingHours`, `actualOvertimeDuration`, `lateEntry`, `earlyExit`, `inTime`, `outTime`, and `halfDayStatus`. Scoped by company confinement across all endpoints; joins `Employee` on searches to present employee name and code.

**Second/transactional fork (module complete):**

`ShiftRequest` — an employee's request to change shift, `shiftTypeId`/`employeeId`/`companyId`/`fromDate`/optional `toDate` (open-ended if unset), `status` (open/approved/rejected). `approverId` resolves via `resolveApprovers(employeeId, "shiftRequest")` (ADR-024's mechanism, reused as-is — an Employee's own direct approver field wins, else the union of the Department ancestor chain's approver arrays); a caller may supply one explicitly, validated against that resolved set. Rejects a create/update whose date range overlaps another open/approved Shift Request for the same employee, or an existing active `ShiftAssignment` (this project's simplified stand-in for a real shift-timing-overlap test, since it keeps the no-multi-shift-per-day invariant). `POST .../approve` creates the real `ShiftAssignment` (through the same write-locked path every other Shift Assignment write uses); `POST .../reject` has no side effects.

`AttendanceRequest` — an employee's request that Attendance be recorded for a range without going through Employee Checkin: `employeeId`/`companyId`/`fromDate`/`toDate`/`halfDay`/`halfDayDate`/`includeHolidays`/`reason` ("Work From Home"/"On Duty")/`explanation`/`status` (active/cancelled). Create *is* the action (no separate approval step) — it directly writes or updates one `Attendance` row per day in the range, skipping a day that is a holiday (unless `includeHolidays`) and skipping a day whose existing `Attendance` row already carries a `leaveApplicationId` (never overwrites a leave-backed row). The target status is `Half Day` on the configured `halfDayDate`, else `Work From Home` when `reason` is Work From Home, else `Present`. `POST .../cancel` soft-deletes exactly the `Attendance` rows this request created (tracked via `Attendance.attendanceRequestId`).

**Shift Assignment Tool** and **Employee Attendance Tool** — stateless bulk-action endpoints, no stored model (same shape as Leave Control Panel): bulk-create `ShiftAssignment`s or `ShiftScheduleAssignment`s (the latter immediately generating its first batch of shifts), bulk-approve/reject `ShiftRequest`s, bulk-mark `Attendance`, and directly resolve one `Attendance` row's `halfDayStatus` (bypassing Attendance's own validation, matching source). Every bulk item is processed with try/catch isolation — one item's failure never aborts the batch.

`processAutoAttendance` (`jobs/attendanceScheduler.js`) — the third of ADR-016's three named background jobs, run at most once per calendar day (`SchedulerRunLog`, its own `jobName`, wired into `server.js` alongside — not merged into — `leaveScheduler.js`'s runner). For every `ShiftType` with `enableAutoAttendance` and a `processAttendanceAfter` watermark, groups its still-unlinked `EmployeeCheckin` rows by employee and shift occurrence date, and for every occurrence dated strictly before "today" (never a shift still in progress) computes working hours via the Shift Type's own configured mode, decides `Present`/`Absent`/`Half Day` against its two thresholds, flags late-entry/early-exit against the shift window plus grace periods, and writes/updates the `Attendance` row — skipping any date that already has a leave-backed row. Once per day, separately, sweeps every currently-active auto-attendance-enabled `ShiftAssignment` for exactly "yesterday" and creates an `Absent` row if none exists yet and yesterday isn't a holiday (or the shift explicitly marks attendance on holidays). No watermark bookkeeping beyond `processAttendanceAfter` — every daily run only ever looks at "yesterday", not further back.

## Not modelled

<!-- Things the client talks about that deliberately have no collection, and why. -->

- **A general ledger.** Payroll/Expenses payment status is tracked directly (paid/outstanding/amount/
  date), not via Journal Entry/Payment Entry/GL Entry postings. See ADR-016.
- **Frappe's `docstatus` as a shared engine.** Each HRMS module names its own status field and
  transitions instead of inheriting a generic Draft/Submit/Cancel/Amend primitive. See ADR-016.
