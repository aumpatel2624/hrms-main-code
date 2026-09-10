---
type: doctype
module: Recruitment
roles: [System Manager, HR User, HR Manager]
tags: [hrms, doctype]
---

# Job Offer

A formal, submittable compensation and terms offer extended to a Job Applicant — the
document that, once accepted, is the trigger for converting a candidate into an Employee.
It exists to record the commercial commitment made to a candidate (terms, designation,
company) separately from the applicant record, with its own approval-style
submit/cancel/amend lifecycle since it represents a financial and legal commitment.

## Key Fields
| Field | Type | Purpose |
|---|---|---|
| `job_applicant` | Link (Job Applicant, required) | The candidate being offered the role; filtered to exclude `Rejected` applicants in the link's UI filter. |
| `applicant_name` / `applicant_email` | Data (fetched, read-only) | Copied from the applicant for display/printing. |
| `status` | Select (`allow_on_submit`) | `Awaiting Response / Accepted / Rejected / Cancelled`. |
| `offer_date` | Date (required) | Date of the offer; also the point-in-time used for staffing-plan vacancy checks. |
| `designation` | Link (fetched, required) | Role offered. |
| `company` | Link (required) | Offering company. |
| `offer_terms` | Table (Job Offer Term) | Individual term/value rows on the offer. |
| `job_offer_term_template` | Link (Job Offer Term Template) | Optional source for bulk-populating `offer_terms`. |
| `select_terms` / `terms` | Link/Text Editor | Optional generic Terms and Conditions text. |
| `letter_head`, `select_print_heading` | — | Printing details (`allow_on_submit`). |
| `amended_from` | Link (Job Offer) | Standard Frappe amendment trail. |

## Relationships
- [[Job Applicant]] — required link; `on_change()` pushes `Accepted`/`Rejected` status back onto the applicant; `validate()` blocks a second live offer for the same applicant.
- [[Job Offer Term]] — child table of individual terms.
- [[Job Offer Term Template]] — optional bulk source for `offer_terms`.
- [[Designation]], [[Company]] — used together with `offer_date` for the Staffing Plan vacancy check.
- [[Staffing Plan]] — `validate_vacancies()` checks remaining vacancies for this designation/company/period before allowing the offer.
- [[Employee]] — `make_employee()` maps this offer into a new Employee; `Employee.after_insert` (`update_job_applicant_and_offer`) later force-accepts this offer once the Employee is actually created.
- [[HR Settings]] — `check_vacancies` toggle controls whether the staffing-plan guard is enforced at all.

## Logic — What Happens and Why
**`validate()`** runs `validate_vacancies()` then checks for a duplicate active offer:
throws "Job Offer: {X} is already for Job Applicant: {Y}" if any other non-cancelled
(`docstatus != 2`) Job Offer already exists for the same `job_applicant` — a candidate can
only have one live offer in flight at a time, preventing conflicting/competing offers.

**`validate_vacancies()`**: looks up the active Staffing Plan detail
(`get_staffing_plan_detail`) matching this offer's `designation` + `company`, valid for the
period containing `offer_date`. If found and `HR Settings.check_vacancies` is enabled,
counts already-submitted Job Offers for the same designation/company within that plan's
date range (`get_job_offer`) and throws "There are no vacancies under staffing plan {X}" if
the plan's vacancy count is already consumed. This is the second (offer-time) checkpoint
after Job Opening's own vacancy check — a Job Opening can technically stay open with excess
applicants, but an actual offer cannot be submitted past the staffing plan's ceiling.

**`on_change()`** → **`update_job_applicant(status, job_applicant)`**: whenever this
document's `status` changes to `Accepted` or `Rejected` (this hook fires on every save, not
just submit, since `status` is `allow_on_submit`), force-sets the linked Job Applicant's
`status` to match via `frappe.set_value` — the offer's outcome is the authoritative signal
for the applicant's own status once an offer exists, overriding whatever the applicant's
prior status was.

**`on_discard()`**: if a draft offer is discarded, sets `status = "Cancelled"` rather than
deleting, preserving history that an offer was drafted and abandoned.

**`onload()`**: surfaces any Employee already linked to this offer's `job_applicant` for
convenience on the form (e.g. to show "already hired").

**`make_employee(source_name)` (whitelisted, mapped-doc)**: creates a new Employee mapping
`applicant_name → employee_name` and `offer_date → scheduled_confirmation_date`, plus
looking up the Job Applicant's `email_id`/`applicant_name` to seed `personal_email`/
`first_name` — this is the manual "convert accepted offer into an employee" action.

**Employee-side reverse sync** (`hrms.overrides.employee_master.update_job_applicant_and_offer`,
fired on `Employee.after_insert`): once an Employee is actually inserted referencing a
`job_applicant`, this force-updates that applicant's status to `Accepted` and, if the
linked Job Offer isn't already `Accepted`, force-sets its `status = "Accepted"` and saves it
(with `ignore_mandatory`/`ignore_permissions`) — even auto-submitting is not required here,
only the status field is touched, and a message prompts the user to review/submit the offer
if it's still a draft. This closes the loop so that an Employee record existing is always
reflected back on both the Job Applicant and Job Offer, regardless of which path (manual
`make_employee`, or an Employee created independently) produced it.

**Telemetry**: `Job Offer.on_submit` fires `hrms.telemetry.on_job_offer_submit` (usage
analytics only, no business logic).

## Roles & Permissions
| Role | Can Do | Notes |
|---|---|---|
| [[System Manager]] | Full CRUD + submit/cancel/amend/export/print/report/share/email | — |
| [[HR User]] | Read/Write/Create/Submit/Print/Report/Share/Email | No delete, no cancel, no amend — can create and submit offers but cannot retract a submitted one. |
| [[HR Manager]] | Full CRUD + submit/cancel/amend/export/print/report/share/email | Only role able to cancel/amend a submitted offer. |

## Mermaid: State/Flow
```mermaid
stateDiagram-v2
    [*] --> Draft: created (validate_vacancies checked each save)
    Draft --> "Awaiting Response": submit()
    "Awaiting Response" --> Accepted: manual (on_change syncs Job Applicant.status)
    "Awaiting Response" --> Rejected: manual (on_change syncs Job Applicant.status)
    Draft --> Cancelled: on_discard() (draft only)
    "Awaiting Response" --> Cancelled: cancel() (HR Manager/System Manager only)
    Accepted --> [*]: Employee created downstream\n(re-confirms Accepted via after_insert hook)
    Rejected --> [*]
    Cancelled --> [*]: can be amended (amended_from)
```
