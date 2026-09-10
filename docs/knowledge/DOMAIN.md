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

#### Employee (not built yet — module 2)

Not a Frappe-authored doctype (core ERPNext) — its expected field shape is reconstructed in
`HRMS-Port-Spec/02-Cross-Cutting/Employee Core Model.md`; treat that file as the starting field list
when Employee Records (module 2) is designed.

## Not modelled

<!-- Things the client talks about that deliberately have no collection, and why. -->

- **A general ledger.** Payroll/Expenses payment status is tracked directly (paid/outstanding/amount/
  date), not via Journal Entry/Payment Entry/GL Entry postings. See ADR-016.
- **Frappe's `docstatus` as a shared engine.** Each HRMS module names its own status field and
  transitions instead of inheriting a generic Draft/Submit/Cancel/Amend primitive. See ADR-016.
