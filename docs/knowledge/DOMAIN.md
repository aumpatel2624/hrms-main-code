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

### Spine entities (built early, referenced by nearly every later module)

- **Company** — Is a: a legal entity. Owned by/scoped to: itself (top of the scoping hierarchy).
  Deletable: blocked while any Branch/Department/Employee/etc. references it (guarded, per INV-2
  pattern). Real values: one placeholder ("Apidel") until real multi-company names are supplied.
- **Branch** — Is a: a site under a Company. Scoped to: one Company.
- **Department**, **Designation** — Is a: classification masters, scoped to one Company. Seed data:
  `apidel-org-chart.csv`. Two pairs of raw department strings are data-entry variants, not distinct
  departments — normalize both when seeding (decided 2026-09-10, `OPEN-QUESTIONS.md` Q-6): "PR and
  Social media" / "PR and social media" → **"PR and Social media"**; "Corporate Recruitment" /
  "Corporate Recruitment & Facility Management" → **"Corporate Recruitment & Facility Management"**.
- **Employee** — Is a: the hub. Owned by/scoped to: one Company; self-scoped to its own `userId` for
  self-service. Full field shape: `HRMS-Port-Spec/02-Cross-Cutting/Employee Core Model.md`.

## Not modelled

<!-- Things the client talks about that deliberately have no collection, and why. -->

- **A general ledger.** Payroll/Expenses payment status is tracked directly (paid/outstanding/amount/
  date), not via Journal Entry/Payment Entry/GL Entry postings. See ADR-016.
- **Frappe's `docstatus` as a shared engine.** Each HRMS module names its own status field and
  transitions instead of inheriting a generic Draft/Submit/Cancel/Amend primitive. See ADR-016.
