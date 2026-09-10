# Interview Detail

**Source:** `hrms/hr/doctype/interview_detail/interview_detail.json`, `interview_detail.py`
**Submittable:** no   **Tree:** no   **Naming:** Child table (`istable: 1`) — standard child-row identity (`parent`/`parentfield`/`parenttype` + auto `name`), no custom autoname.
**Module:** HR

This is a child (table) doctype, used exclusively as the row type for `Interview.interview_details` (a Table field — see [[Interview]]). It represents one interviewer assigned to one specific, scheduled `Interview`.

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| interviewer | Interviewer | Link | User | no | — | no | in_list_view; the specific User assigned to interview for this Interview instance |

## Child Tables

N/A — this file IS a child doctype's spec.

## State Machine

N/A.

## Validation Rules (exact, in execution order)

None. Controller body is `pass`.

## Business Logic / Calculations

None directly on this doctype. It is the join point used to compute:
- Interview email recipients (`hrms.hr.doctype.interview.interview.get_recipients`, see `Interview.md`): all `interviewer` values for a given parent Interview (`filters={"parent": interview}`... actually implemented via loading the full Interview doc and reading `interview.interview_details`), optionally filtered down to interviewers who have NOT yet submitted an `Interview Feedback` for that Interview.
- Feedback eligibility (`hrms.hr.doctype.interview_feedback.interview_feedback.get_applicable_interviewers`, see `Interview Feedback.md`): `frappe.get_all("Interview Detail", filters={"parent": interview}, pluck="interviewer")` — the exact query used to decide who is allowed to submit an Interview Feedback for a given Interview (`Interview Feedback.validate_interviewer` checks the submitting `interviewer` is in this list).

## Lifecycle Hooks (exact)

None defined on this doctype directly. Rows are created (appended) by:
- `Job Applicant.create_interview` / `schedule_interview` — one row per interviewer returned by `Interview.get_interviewers(interview_type)` (see [[Job Applicant]]).
- `Interview Type.create_interview` — one row per `Interviewer` on the source Interview Type (see [[Interview Type]]).
- Client-side `Interview.js`'s `set_applicable_interviewers` — repopulates the table via `frm.clear_table` + `frm.add_child` whenever `interview_type` changes on the Interview form (client-only convenience, mirrors the server-side population logic; a port's server-side "create Interview" endpoint should perform the same population so API-only clients get correct default interviewers without relying on this JS).

Rows are read by `Interview Feedback` (both `get_applicable_interviewers` and by extension `validate_interviewer`, see [[Interview Feedback]]) and by the two scheduled reminder jobs (`send_interview_reminder`, `send_daily_feedback_reminder` in `Interview.md`) via `get_recipients`.

## Whitelisted / API Methods

None defined on this doctype directly.

## Permissions

`"permissions": []` in the JSON — access inherits from the parent `Interview` document. Refer to [[Interview]]'s Permissions section. See also [[Permission Model (RBAC)]].

## Scheduled Jobs Touching This Doctype

Not scheduled itself, but read every run of:
- `send_interview_reminder` (all-minutes cron) — via `get_recipients(doc.name)`, which returns every `interview_details.interviewer` plus the Job Applicant's email.
- `send_daily_feedback_reminder` (daily cron) — via `get_recipients(interview, for_feedback=1)`, which returns only those `interview_details.interviewer` values that do NOT already have a submitted (`docstatus == 1`) `Interview Feedback` for that Interview.

Full detail of both jobs is documented in `Interview.md`.

## Port Notes

- Model as a normal one-to-many join table: `interview_interview_detail(id PK, interview_id FK -> interview.id, interviewer_user_id FK -> user.id, idx)`.
- `allow_on_submit: 1` is set on the **parent field** (`Interview.interview_details`, in `interview.json`) — meaning interviewers can still be added/removed on an already-submitted Interview document. A port must allow editing this child table even when the parent `Interview` is in a submitted/locked state (see [[Submittable Document Lifecycle]]), which is unusual for submittable-doc children and should be called out explicitly in the new stack's edit-lock logic.
- `track_changes: 1` — same audit-trail caveat as other child doctypes in this module.

## Related Doctypes

- [[Interview]] — parent doctype; every Interview Detail row is owned by exactly one Interview instance.
- [[Interview Type]] — source of default interviewer rows when an Interview is created from a type.
- [[Job Applicant]] — `create_interview`/`schedule_interview` populate this child table when scheduling an interview.
- [[Interview Feedback]] — reads this table (`get_applicable_interviewers`) to decide who may submit feedback for the parent Interview.
