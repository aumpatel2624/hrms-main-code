# Interviewer

**Source:** `hrms/hr/doctype/interviewer/interviewer.json`, `interviewer.py`
**Submittable:** no   **Tree:** no   **Naming:** Child table (`istable: 1`) — rows are identified by the standard Frappe child-row triple (`parent`, `parenttype`, `parentfield`) plus an auto-generated row `name`; there is no user-facing autoname rule.
**Module:** HR

This is a child (table) doctype, used exclusively as the row type for `Interview Type.interviewers` (a Table MultiSelect field — see [[Interview Type]]).

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| user | User | Link | User | no | — | no | the interviewer's User account; in_list_view |

Standard child-table system fields (`parent`, `parentfield`, `parenttype`, `idx`, `name`, audit columns) apply as usual and are not separately listed per spec's field-table instructions, but are noted here since they matter for a port: every row belongs to exactly one parent `Interview Type` document via `parent` = that Interview Type's `name`.

## Child Tables

N/A — this file IS a child doctype's spec.

## State Machine

N/A — no submittable/status behavior.

## Validation Rules (exact, in execution order)

None. Controller body is `pass` — no `validate` or other lifecycle method defined.

## Business Logic / Calculations

None.

## Lifecycle Hooks (exact)

None defined on this doctype. It is read by:
- `hrms.hr.doctype.interview.interview.get_interviewers(interview_type)` — queries `frappe.get_all("Interviewer", filters={"parent": interview_type}, fields=["user as interviewer"])` to build the list of interviewers for a given Interview Type when scheduling/creating an Interview (see [[Interview]]).

## Whitelisted / API Methods

None defined on this doctype directly (interviewer lookups are exposed via `Interview.get_interviewers`, documented in `Interview.md`).

## Permissions

`"permissions": []` in the JSON — child tables inherit access from their parent document (Interview Type); there are no independent permission rules to port for this table. Refer to [[Interview Type]]'s Permissions section for the effective access rules. See also [[Permission Model (RBAC)]].

## Scheduled Jobs Touching This Doctype

None directly. Indirectly read (not written) by `send_interview_reminder`/`send_daily_feedback_reminder` only via the `Interviewer` rows already copied onto an `Interview.interview_details` (`Interview Detail`) table at Interview-creation time — see `Interview.md`. The `Interviewer` table itself (on Interview Type) is not touched by any scheduled job.

## Port Notes

- Model as a normal one-to-many join table: `interview_type_interviewer(id PK, interview_type_id FK -> interview_type.id, user_id FK -> user.id, idx)`. No additional columns needed.
- Do not confuse this with [[Interview Detail]] (the similarly-shaped child table on the `Interview` doctype itself, documented separately) — `Interviewer` rows live on `Interview Type` (the template/round definition), while `Interview Detail` rows live on `Interview` (a specific scheduled interview instance) and are populated by copying `Interviewer.user` values at the time an Interview is created from an Interview Type (see [[Job Applicant]]'s `create_interview`/`schedule_interview` and `Interview Type.create_interview`, both of which read `Interviewer` and write `Interview Detail`).
- `track_changes: 1` — same audit-trail caveat as noted in `Interview Type.md` (see [[Implicit Framework Behaviors]]).

## Related Doctypes

- [[Interview Type]] — parent doctype; every Interviewer row is owned by exactly one Interview Type.
- [[Interview]] — `Interview.get_interviewers` reads this table when building/scheduling an interview.
- [[Interview Detail]] — the sibling child table on `Interview` that these rows get copied into.
