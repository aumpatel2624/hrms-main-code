---
type: doctype
module: Recruitment
roles: [System Manager, HR Manager, Interviewer, HR User]
tags: [hrms, doctype]
---

# Interview

One scheduled interview round for a specific Job Applicant against a specific Interview
Type — the date/time, the assigned interviewers, and the aggregated outcome (average
rating, Cleared/Rejected/etc.). It exists to formally schedule and track each round of a
candidate's evaluation, roll up individual interviewer feedback into one result, and gate
whether that result should update the candidate's overall pipeline status.

## Key Fields
| Field | Type | Purpose |
|---|---|---|
| `job_applicant` | Link (Job Applicant, required) | Candidate being interviewed. |
| `interview_type` | Link (Interview Type, required) | Round definition/rubric used. |
| `job_opening` | Link (fetched from `job_applicant.job_title`) | Vacancy context. |
| `designation` | Link (fetched from `interview_type.designation`) | Validated against the applicant's own designation. |
| `status` | Select | `Pending / Under Review / Cleared / Rejected / Cancelled`. |
| `scheduled_on`, `from_time`, `to_time` | Date/Time (`set_only_once`) | Interview slot; immutable after first save except via `reschedule_interview()`. |
| `interview_details` | Table (Interview Detail) | Interviewers assigned to this specific interview. |
| `expected_average_rating` | Rating (fetched from `interview_type`) | Passing bar. |
| `average_rating` | Rating (read-only, `allow_on_submit`) | Rolled up from submitted Interview Feedback records. |
| `interview_summary` | Text (`allow_on_submit`) | Free-text wrap-up. |
| `reminded` | Check (hidden) | Internal flag so the reminder scheduler doesn't re-notify. |
| `resume_link` | Data (fetched from applicant) | Convenience for interviewers. |

## Relationships
- [[Job Applicant]] — required parent context; interview outcome can update the applicant's `status` via a confirmation dialog on submit.
- [[Interview Type]] — required; supplies `designation`, `expected_average_rating`, and default interviewers via `get_interviewers()`.
- [[Interview Detail]] — child table of assigned interviewers for this specific interview.
- [[Interview Feedback]] — linked from `links` (Frappe "Connections"); one Interview can have many Feedback docs (one per interviewer), whose average rolls up into `average_rating`.
- [[Job Opening]] — fetched context field, not independently validated.

## Logic — What Happens and Why
**`validate()`** runs `validate_duplicate_interview()` and `validate_designation()`:
- **`validate_duplicate_interview`**: throws if a *submitted* (`docstatus=1`) Interview
  already exists for the same `job_applicant` + `interview_type` — a candidate cannot be
  run through the exact same round type twice, preventing accidental re-scheduling or
  "shopping" for a better result on a completed round.
- **`validate_designation`**: if this Interview (via its Interview Type) has a
  `designation`, it must match the Job Applicant's own `designation`, else it throws a
  `DuplicateInterviewRoundError` — otherwise it just inherits the applicant's designation.
  Same rule enforced redundantly at the Job Applicant layer (`create_interview`/
  `schedule_interview`) for UI-side pre-checks, but re-validated here as the authoritative
  guard.

**`on_submit()`**: only allows submission if `status` is `Cleared` or `Rejected` — an
Interview cannot be finalized/submitted while still `Pending`/`Under Review`/`Cancelled`,
ensuring a submitted Interview always represents a decided outcome. Then calls
`show_job_applicant_update_dialog()`.

**`show_job_applicant_update_dialog()` / `get_job_applicant_status()`**: maps Interview
status `Cleared → Accepted` / `Rejected → Rejected` and, if applicable, shows a confirmation
prompt offering to update the Job Applicant's own `status` to match, wired to the
whitelisted server action `update_job_applicant_status`. This is a human-confirmed sync, not
automatic — the interviewer/HR user decides whether this round's result should move the
candidate's overall pipeline stage (a Cleared technical round might not by itself mean
"Accepted" if more rounds remain, hence the dialog rather than an automatic hard sync).

**`reschedule_interview(scheduled_on, from_time, to_time)` (whitelisted)**: the only
sanctioned way to change the otherwise `set_only_once` scheduling fields post-creation. Does
nothing if the new values equal the old ones. Otherwise force-updates via `db_set` (bypasses
normal `save()`/validate), calls `notify_update()` for realtime UI refresh, and emails all
interviewers plus the applicant (via `get_recipients`) that the session was moved, catching
and warning (not failing) if the email account isn't configured.

**`on_discard()`**: if a draft is discarded, force-sets `status = "Cancelled"` via `db_set`
rather than actually deleting — preserves a record that an interview was scheduled and then
abandoned.

**`get_recipients(name, for_feedback=0)`**: builds the notification recipient list —
normally all assigned interviewers plus the applicant's email; when `for_feedback=1`
(used by the daily feedback reminder), narrows to only interviewers who have **not yet**
submitted an Interview Feedback for this Interview.

**`send_interview_reminder()` (scheduled task, `all` — i.e. every few minutes)**: reads
`HR Settings` for `send_interview_reminder` (on/off), `interview_reminder_template` (an
Email Template), `hiring_sender_email`, and `remind_before` (default `01:00:00`). Finds all
`Pending`, not-yet-`reminded`, non-cancelled Interviews scheduled within the reminder
window, renders the template, emails all recipients, and flips `reminded = 1` — this is why
`reminded` exists: to guarantee each interview is reminded exactly once regardless of how
often the scheduler runs.

**`send_daily_feedback_reminder()` (scheduled task, `daily`)**: for every Interview still
`Under Review` whose scheduled slot has already ended (`scheduled_on <= today` and
`to_time <= now`), emails only the interviewers who haven't yet submitted feedback
(`get_recipients(..., for_feedback=1)`) — nudges laggards without spamming interviewers who
already responded.

**`create_interview_feedback(data, interview_name, interviewer, job_applicant)`
(whitelisted)**: server-side helper that builds, saves, and **submits** an Interview
Feedback in one call on behalf of the current session's interviewer — enforces
`frappe.session.user == interviewer` so nobody can submit feedback impersonating another
interviewer via this API.

**`get_events()` (whitelisted, calendar backend)**: returns Interview data formatted for
the calendar/Gantt UI, colored by status.

## Roles & Permissions
| Role | Can Do | Notes |
|---|---|---|
| [[System Manager]] | Full CRUD + submit/cancel/export/print/report/share/email | — |
| [[HR Manager]] | Full CRUD + submit/cancel/export/print/report/share/email | — |
| [[Interviewer (Role)]] | Full CRUD + submit/cancel/export/print/report/share/email | Interviewers have the same broad rights as HR Manager on this doctype — not scoped to only interviews they're assigned to (not enforced in code). |
| [[HR User]] | Full CRUD + submit/cancel/export/print/report/share/email | — |

## Mermaid: State/Flow
```mermaid
stateDiagram-v2
    [*] --> Pending: created (via Job Applicant or Interview Type)
    Pending --> "Under Review": manual, once feedback collection begins
    "Under Review" --> Cleared: manual, based on feedback
    "Under Review" --> Rejected: manual, based on feedback
    Pending --> Cancelled: on_discard() (draft only)
    Cleared --> [*]: on_submit() (only Cleared/Rejected can submit)\n-> offers to sync Job Applicant.status = Accepted
    Rejected --> [*]: on_submit()\n-> offers to sync Job Applicant.status = Rejected
```
