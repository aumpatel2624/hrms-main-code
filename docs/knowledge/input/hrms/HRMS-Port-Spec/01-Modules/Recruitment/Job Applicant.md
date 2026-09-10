# Job Applicant

**Source:** `hrms/hr/doctype/job_applicant/job_applicant.json`, `job_applicant.py`, `job_applicant.js`, `job_applicant_list.js`, `job_applicant_dashboard.py`
**Submittable:** no   **Tree:** no   **Naming:** Expression — `autoname()` sets `self.name = self.email_id`; if a Job Applicant already exists with that name, `append_number_if_name_exists` appends a numeric suffix (e.g. `jane@x.com-1`) so the same person can (re)apply more than once.
**Module:** HR

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| *(details_section)* | Details | Section Break | — | — | — | — | heading only |
| applicant_name | Full Name | Data | — | yes (reqd) | — | no | bold, in global search; auto-guessed from email if blank (see Validation) |
| email_id | Email Address | Data | Email | yes (reqd) | — | no | bold; validated via `validate_email_address`; also drives `autoname` |
| phone_number | Phone Number | Data | Phone | no | — | no | |
| *(column_break_3)* | — | Column Break | — | — | — | — | |
| job_title | Job Opening | Link | [[Job Opening]] | no | — | no | in list view; search-indexed |
| designation | Designation | Link | Designation | no | — | no | `fetch_from: job_title.designation`, `fetch_if_empty: 1` |
| country | Country | Link | Country | no | — | no | |
| *(column_break_enue)* | — | Column Break | — | — | — | — | |
| status | Status | Select | Open / Replied / Shortlisted / Rejected / Hold / Accepted | yes (reqd) | — | no | in list view + standard filter; default Kanban field |
| applicant_rating | Applicant Rating | Rating | — | no | — | no | in list view |
| *(section_break_6)* | Resume | Section Break | — | — | — | — | |
| resume_link | Link | Data | — | no | — | no | plain text URL to resume |
| resume_preview_html | Preview | HTML | — | no | — | hidden | client-rendered PDF preview, no server logic |
| open_resume_button | Open Resume in New Tab | Button | — | no | — | hidden | client-only, opens `resume_link` in new tab |
| cover_letter | Cover Letter | Text | — | no | — | no | |
| resume_attachment | Attachment | Attach | — | no | — | no | |
| notes | Notes | Data | — | no | — | yes (read_only) | also the doctype's `subject_field` |
| *(source_and_rating_section)* | Source | Section Break | — | — | — | — | |
| source | Source | Link | [[Job Applicant Source]] | no | — | no | |
| source_name | Source Name | Link | [[Employee Core Model\|Employee]] | no | — | no | `depends_on`: `eval: doc.source=="Employee Referral"` |
| *(column_break_13)* | — | Column Break | — | — | — | — | |
| employee_referral | Employee Referral | Link | [[Employee Referral]] | no | — | yes (read_only) | drives `set_status_for_employee_referral` |
| *(salary_expectation_tab)* | Salary Expectation | Tab Break | — | — | — | — | |
| currency | Currency | Link | Currency | no | — | no | |
| *(column_break_18)* | — | Column Break | — | — | — | — | |
| lower_range | Lower Range | Currency | currency (from `currency` field) | no | — | no | `non_negative: 1`, `precision: 0` |
| upper_range | Upper Range | Currency | currency (from `currency` field) | no | — | no | `non_negative: 1`, `precision: 0` |

Notes on doctype-level flags: `email_append_to: 1` (incoming emails to this record can be appended as communications), `sender_field: email_id`, `title_field: applicant_name`, `subject_field: notes`, `search_fields: applicant_name, email_id, job_title, phone_number`, `sort_field: creation` / `sort_order: ASC`, `allow_rename: 1`, `allow_import: 1`.

## Child Tables

None. Job Applicant has no Table fields.

## State Machine

Not submittable — no docstatus workflow. `status` is a free-standing Select field with values `Open`, `Replied`, `Shortlisted`, `Rejected`, `Hold`, `Accepted`. There is no enforced linear state machine in the controller; any value can be set from any other value via `frm.set_value` / API, subject only to the Employee Referral side effect below. Transitions actually driven by code:

| From (any) | Event | To | Guard / Source |
|---|---|---|---|
| any | User clicks "Shortlist" button (client) | Shortlisted | `job_applicant.js create_custom_buttons`, only shown when current status is `Open` |
| any | User clicks "Reject" button (client) | Rejected | same button set, shown when current status is `Open` |
| any (via Interview submit dialog) | HR user confirms "Mark as Cleared/Rejected" prompt on Interview submit | Accepted (if Interview status "Cleared") or Rejected (if "Rejected") | `hrms.hr.doctype.interview.interview.update_job_applicant_status` (see `Interview.md`) |
| any | An Employee record is created with `job_applicant` set and current status != "Accepted" | Accepted | `hrms.overrides.employee_master.update_job_applicant_and_offer`, see dedicated subsection below |

Kanban board default columns/indicators (from `job_applicant.py` `KANBAN_COLUMNS` and `job_applicant_list.js get_indicator`): Open (no indicator override / orange), Replied (orange), Shortlisted (blue), Accepted (green); Hold and Rejected both render red on the list view though Hold has no explicit Kanban column entry.

## Validation Rules (exact, in execution order)

Order of controller method calls: `autoname` (on insert) -> `validate` -> `before_insert` (on insert only, after `validate` in Frappe's document lifecycle) -> `set_status_for_employee_referral` (called from inside `validate`).

1. IF `email_id` is set THEN call `validate_email_address(self.email_id, True)` (source: `validate`) — the `True` throw flag means an invalid email address raises Frappe's standard email-validation error (message generated by frappe core, not a custom string defined in this file).
2. IF `employee_referral` is set THEN run `set_status_for_employee_referral()` (source: `validate`):
   3a. IF `status` in `["Open", "Replied", "Hold"]` THEN set the linked Employee Referral's `status` to `"In Process"` via `emp_ref.db_set("status", "In Process")` (direct DB write, no recursive save/validate on Employee Referral).
   3b. ELSE IF `status` in `["Accepted", "Rejected"]` THEN set the linked Employee Referral's `status` to the Job Applicant's own `status` value via `db_set`.
3. IF `applicant_name` is empty AND `email_id` is set THEN auto-derive `applicant_name`: take the part of the email before `@`, split on `.`, capitalize each part, and join with spaces (e.g. `jane.doe@x.com` -> `Jane Doe`). (source: `validate`, last step)
4. `before_insert` (only runs when creating a brand-new Job Applicant), IF `job_title` (Job Opening) is set:
   4a. Look up the Job Opening's `status` and `prevent_duplicate_applicant`. IF the Job Opening record does not exist, return early (no further checks in `before_insert`).
   4b. IF Job Opening `status == "Closed"` -> `frappe.throw(_("Cannot create a Job Applicant against a closed Job Opening"), title=_("Not Allowed"))`.
   4c. IF Job Opening `prevent_duplicate_applicant` is truthy AND `email_id` is set AND a Job Applicant already exists with the same `email_id` + `job_title` -> `frappe.throw(_("You have already applied for this position."), exc=DuplicationError, title=_("Duplicate Application"))`. `DuplicationError` is a custom exception class (`class DuplicationError(frappe.ValidationError)`) defined in this file — a port should preserve this as a distinguishable error code/type since callers may catch it specifically.
5. `before_insert`, unconditional (regardless of `job_title`): IF `frappe.flags.in_web_form` is true AND `source` is empty THEN set `source = "Website Listing"` (only relevant when the applicant is created via a public Web Form submission flow, not a normal desk/API create).

## Business Logic / Calculations

No numeric/financial calculations on this doctype itself (salary expectation `lower_range`/`upper_range` are plain user-entered figures with no formula). The only computed value is the applicant-name guess described in Validation Rule 3.

### `get_applicant_to_hire_percentage` (whitelisted, module-level helper — see API table)
1. Count all Job Applicant records (`total_applicants`).
2. Count Job Applicant records where `status == "Accepted"` (`total_hired`).
3. Return `{"value": (total_hired / total_applicants) * 100 if total_applicants else 0, "fieldtype": "Percent"}`. Guards divide-by-zero when there are no applicants at all.

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| autoname | `self.name = self.email_id`; if taken, `append_number_if_name_exists` appends a numeric suffix | none |
| validate | email validation, employee-referral status sync, applicant-name auto-guess (see Validation Rules 1–3) | writes `status` on linked Employee Referral via `db_set` (no save/validate cascade on that doc) |
| before_insert | closed-Job-Opening guard, duplicate-applicant guard, web-form source default (Validation Rules 4–5) | none |
| onload | Sets two onload values consumed by the client script: `job_offer` = the first non-cancelled (`docstatus != 2`) Job Offer whose `job_applicant == self.name`; `employee` = the [[Employee Core Model\|Employee]] whose `job_applicant == self.name` (or empty string) | reads Job Offer, Employee — no writes |

### Cross-doctype hook: `update_job_applicant_and_offer` (Employee `after_insert`)

**Source:** `hrms/overrides/employee_master.py`, function `update_job_applicant_and_offer(doc, method=None)`, registered in `hrms/hooks.py` under `doc_events["Employee"]["after_insert"]` (see [[Cross-Doctype Hooks (doc_events)]]; alongside `hrms.telemetry.on_milestone_insert`).

Fires every time a new Employee document is inserted. Exact steps, in order:

1. IF the newly-inserted Employee's `job_applicant` field is empty -> return immediately (function is a no-op for employees not created from a Job Applicant / Employee Onboarding pipeline).
2. Read the current `status` of the linked Job Applicant (`frappe.db.get_value("Job Applicant", doc.job_applicant, "status")`) into `applicant_status_before_change`.
3. IF `applicant_status_before_change != "Accepted"`:
   a. Directly set the Job Applicant's `status` to `"Accepted"` via `frappe.db.set_value` (bypasses `validate`/`before_insert`, i.e. no revalidation, no re-triggering of `set_status_for_employee_referral`).
   b. Show a `frappe.msgprint`: `"Updated the status of linked Job Applicant {0} to {1}"` formatted with a link to the Job Applicant form and the bolded word "Accepted" (translated string, exact template: `_("Updated the status of linked Job Applicant {0} to {1}")`).
4. Read the current `status` of the most-relevant, non-cancelled Job Offer for this applicant: `frappe.db.get_value("Job Offer", {"job_applicant": doc.job_applicant, "docstatus": ["!=", 2]}, "status")` into `offer_status_before_change`.
5. IF a Job Offer was found (`offer_status_before_change` truthy) AND it is not already `"Accepted"`:
   a. Fetch the **last** matching Job Offer document: `frappe.get_last_doc("Job Offer", filters={"job_applicant": doc.job_applicant})` (i.e. most recently created/highest-creation Job Offer for that applicant — note this re-query does not repeat the `docstatus != 2` filter used in step 4, so in the presence of multiple offers the "last doc" fetched here could differ from the one whose status was checked in step 4 if a cancelled offer is more recent).
   b. Set `job_offer.status = "Accepted"`.
   c. Set `job_offer.flags.ignore_mandatory = True` and `job_offer.flags.ignore_permissions = True`.
   d. Call `job_offer.save()` — this **does** run through the Job Offer document's own `validate`/`on_update` lifecycle (unlike the Job Applicant status update, which bypasses lifecycle via `db_set`), only mandatory-field checks and permission checks are suppressed.
   e. Build message: `"Updated the status of Job Offer {0} for the linked Job Applicant {1} to {2}"` (link to Job Offer form, bolded Job Applicant id, bolded "Accepted").
   f. IF the Job Offer's `docstatus == 0` (still a Draft after the save, i.e. it was not submitted) THEN append to the message: `"<br>" + _("You may add additional details, if any, and submit the offer.")`.
   g. `frappe.msgprint(msg)` — shown to the user performing the Employee creation.

Full detail of Job Offer's own doctype behavior is out of scope here — see [[Job Offer]] for its schema/validation; only this cross-cutting effect is documented in this file per the assignment.

## Whitelisted / API Methods

| Method name | HTTP-equivalent purpose | Args | Returns | What it does |
|---|---|---|---|---|
| `make_employee` | POST — "Create Employee from this Job Applicant" (Frappe's mapped-doc pattern, invoked via `frm.make_methods.Employee`) | `source_name: str`, `target_doc: str \| Document \| None` | New (unsaved) [[Employee Core Model|Employee]] `Document` | Maps Job Applicant fields to a new Employee: `applicant_name -> first_name`, `email_id -> personal_email`, `phone_number -> cell_number`, `currency -> salary_currency`; explicitly does NOT map `status`. `set_missing_values` additionally sets `employee_name = applicant_name`, and — if `job_title` (Job Opening) is set and exists — copies the Job Opening's `company`, `department`, `employment_type` onto the Employee (each only if the Job Opening has that value). Uses `frappe.model.mapper.get_mapped_doc`. |
| `create_kanban_board` | POST — ensure/create the "Hiring Pipeline" Kanban board | `board_name: str` | Kanban Board dict (`as_dict()`) | Checks `frappe.has_permission("Job Applicant", throw=True)`. If a Kanban Board named `board_name` already exists, returns it as-is. Otherwise creates one: `reference_doctype="Job Applicant"`, `field_name="status"`, `private=0`, `fields=["designation","applicant_rating"]` (JSON-encoded), `show_labels=1`, and appends columns from `KANBAN_COLUMNS` = `[{Open}, {Replied, indicator: Orange}, {Shortlisted, indicator: Blue}, {Accepted, indicator: Green}]`, each column's `status` set to `"Active"`. Inserted with `ignore_permissions=True`. |
| `create_interview` | POST — build (not save) an Interview doc pre-filled for this applicant/type | `job_applicant: str`, `interview_type: str` | New (unsaved) Interview `Document` | Loads the Job Applicant. Looks up the Interview Type's `designation`. IF that designation is set AND the applicant's `designation` is set AND they differ -> `frappe.throw(_("Interview Type {0} is only applicable for the Designation {1}").format(interview_type, round_designation))`. Otherwise builds a new Interview with `interview_type`, `job_applicant`, `designation` (copied from applicant), `resume_link` (copied from applicant), `job_opening` (= applicant's `job_title`), and appends one `interview_details` row per interviewer returned by `get_interviewers(interview_type)` (see [[Interview]]). Does not insert/save. |
| `schedule_interview` | POST — create and immediately insert a scheduled Interview | `job_applicant: str`, `interview_type: str`, `scheduled_on: str`, `from_time: str \| None`, `to_time: str \| None`, `interviewers: str \| list \| None` | `str` (new Interview's `name`) | Permission checks: `frappe.has_permission("Interview", ptype="create", throw=True)` and `frappe.has_permission("Job Applicant", ptype="read", doc=job_applicant, throw=True)`. Same designation-mismatch guard as `create_interview`, with message `"Interview Type {0} is only applicable for Designation {1}"` (both placeholders wrapped in `frappe.bold`). Builds Interview exactly as in `create_interview` plus sets `scheduled_on`, `from_time`, `to_time`. `interviewers` may arrive as a JSON string (parsed via `json.loads`) or a list of dicts; for each entry with a truthy `interviewer` key, appends an `interview_details` row. Calls `interview.insert(ignore_permissions=True)` and returns `interview.name`. |
| `get_interview_details` | GET — dashboard data for the Job Applicant form's "Interview Summary" section | `job_applicant: str` | `dict` `{"interviews": {<name>: {...}}, "stars": <int>}` or `None` | `frappe.has_permission("Job Applicant", "read", job_applicant, throw=True)`. Fetches all non-cancelled Interviews (`docstatus != 2`) for the applicant with fields `name, interview_type, scheduled_on, average_rating, status`. If none, returns `None`. Otherwise reads the Interview doctype's `average_rating` field metadata to get `number_of_stars` (`meta.get_options("average_rating")`, default 5), rescales each interview's `average_rating` from a 0–1 fraction to a 0–`number_of_stars` value (`average_rating * number_of_stars`, or 0 if falsy), keys the result dict by interview `name`, and returns `{"interviews": interview_detail_map, "stars": number_of_stars}`. |
| `get_applicant_to_hire_percentage` | GET — recruitment funnel KPI (number card / dashboard chart source) | none | `dict` `{"value": float, "fieldtype": "Percent"}` | `frappe.has_permission("Job Applicant", throw=True)`. See Business Logic section above for the exact formula. |

## Permissions

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes (if_owner, permlevel, etc) |
|---|---|---|---|---|---|---|---|---|---|---|
| System Manager | yes | yes | yes | yes | — | — | — | yes | yes | also `email`, `print`, `share` |
| HR User | yes | yes | yes | — | — | — | — | yes | — | also `email`, `print`, `share`; no delete, no export |
| HR Manager | yes | yes | yes | yes | — | — | — | yes | yes | also `email`, `print`, `share` |

No `if_owner` or `permlevel` restrictions declared. Not submittable, so submit/cancel/amend columns are structurally not applicable (all blank in the JSON).

## Scheduled Jobs Touching This Doctype

None directly register against Job Applicant in `hrms/hooks.py`'s `scheduler_events`. It is touched indirectly by the Employee `after_insert` doc-event described above (not a scheduled job) and is read (not written) by `hrms.hr.doctype.interview.interview.send_interview_reminder` / `send_daily_feedback_reminder` only insofar as those functions resolve interviewer/applicant email recipients via `Interview.job_applicant` — full detail is in `Interview.md`.

## Port Notes

- `autoname` uses the raw email address as the primary key, with a numeric-suffix fallback for re-applications. A relational port should NOT make `email_id` a unique/primary key by itself — the natural key is effectively `(email_id, disambiguating suffix)`; simplest port equivalent is a surrogate PK (UUID/serial) plus a generated "applicant code" column that mimics `email` or `email-N` if that display format must be preserved, or simply drop the emulation and use a surrogate key with an ordinary unique index consideration on `(email_id, job_title)` only where `prevent_duplicate_applicant` is relevant (see Validation Rule 4c, which is enforced in application code, not a DB constraint).
- Frappe's automatic audit columns (`creation`, `modified`, `modified_by`, `owner`) are relied upon implicitly (`sort_field: creation`) and must be created explicitly as columns in a new stack (created_at, updated_at, updated_by, created_by equivalents), auto-populated by the ORM/DB layer.
- `email_append_to: 1` and `sender_field: email_id` enable Frappe's generic "append incoming email as a Communication linked to this record" feature — this is significant, non-trivial framework behavior (an email-thread inbox keyed by the applicant's email) that has no field-level representation in the JSON; a port needs an equivalent inbound-email-matching mechanism if that behavior is required.
- The "duplicate application" check (Validation Rule 4c) only fires when creating via the standard document-insert path load; because `before_insert` bypasses on `autoname`/whitelisted mapped-doc creation flows in some Frappe versions, confirm in the target stack that this check also runs for any alternate creation entry point (e.g. Web Form submission, REST API POST) — the source code does not special-case Web Form except for the `source` default in step 5.
- `set_status_for_employee_referral`'s writes to Employee Referral use `db_set`, i.e. a direct UPDATE that skips Employee Referral's own `validate` hooks and does not bump its `modified` via the normal save flow semantics in older Frappe (in current Frappe, `db_set` does update `modified`/`modified_by` but does not call controller hooks) — replicate as a raw UPDATE of the `status` column only, no cascading business logic on Employee Referral.
- The `notes` field is `read_only` at the schema level but has no controller code that ever sets it — it is written only via generic mechanisms (e.g. manual `Set Value` bulk action or the Frappe communication/comment "subject" convention `subject_field: notes`). No content to reproduce; a port should keep the field as a free-text label with no computed value.
- `resume_preview_html` and `open_resume_button` are pure client-side (PDF-embed vs. "open in new tab" based on whether `resume_link` ends in `.pdf`) — no server-side equivalent needed, but the `.pdf`-suffix check is a business rule worth replicating in the new frontend if resume preview is desired.
- The Kanban "Hiring Pipeline" board (via `create_kanban_board`) and its rating-click / drag interactions in `job_applicant_list.js` are Frappe-Desk-specific UI sugar (a generic Kanban view keyed on `status`); the underlying data model needed to reproduce it is just the `status` enum and `applicant_rating` field — no additional schema required beyond what's listed above.

## Related Doctypes

- [[Job Opening]] — the vacancy applied against (`job_title`); a closed or duplicate-preventing opening gates applicant creation.
- [[Job Applicant Source]] — where the applicant came from (`source`).
- [[Employee Referral]] — linked when `source == "Employee Referral"`; status is kept in sync with this applicant's status.
- [[Interview]] — one or more interview rounds are scheduled against this applicant via `create_interview`/`schedule_interview`.
- [[Interview Type]] — the round template used when scheduling an interview.
- [[Job Offer]] — a formal offer issued to this applicant; this file documents the applicant-facing half of the Employee-creation hook that flips both statuses to Accepted.
- [[Employee Core Model]] — accepting the applicant (via Employee creation, `make_employee` or the onboarding pipeline) feeds back into this doctype's `status` through the `update_job_applicant_and_offer` hook.
- [[Cross-Doctype Hooks (doc_events)]] — documents the general `doc_events` mechanism used by `update_job_applicant_and_offer`.
