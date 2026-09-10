# Background Jobs — Full Reproduction of `hrms/hooks.py` `scheduler_events`

Frappe's scheduler runs these on fixed cadences. A port needs an equivalent cron/job
scheduler running the SAME functions at the SAME cadences — several core features
(auto-attendance, leave expiry, encashment) do not work at all without these running;
they are not triggered by any user action. Several of these jobs act on
[[Employee Core Model|Employee]]-linked records and on doctypes governed by
[[Submittable Document Lifecycle]] (e.g. cancelling/creating submittable Leave and
Attendance records) — see also [[Cross-Doctype Hooks (doc_events)]] for the
request-triggered counterpart to this file's time-triggered jobs.

Source: `hrms/hooks.py` lines 251–279.

## `all` — runs every few minutes (Frappe's shortest built-in interval)

| Function | Purpose |
|---|---|
| `hrms.hr.doctype.interview.interview.send_interview_reminder` | Sends a reminder notification to interviewers ahead of an upcoming scheduled [[Interview]]. See full logic in `01-Modules/Recruitment/Interview.md`. |

## `hourly`

| Function | Purpose |
|---|---|
| `hrms.hr.doctype.daily_work_summary_group.daily_work_summary_group.trigger_emails` | Triggers Daily Work Summary Group emails on their configured send hour. |

## `hourly_long` — runs hourly, allowed longer execution time (heavier jobs)

| Function | Purpose |
|---|---|
| `hrms.hr.doctype.shift_type.shift_type.update_last_sync_of_checkin` | Updates the "last synced" checkpoint per [[Shift Type]] so the next auto-attendance pass only processes new checkins. |
| `hrms.hr.doctype.shift_type.shift_type.process_auto_attendance_for_all_shifts` | THE core auto-attendance algorithm — full pseudocode in `01-Modules/Shift-Attendance/Shift Type.md`. Groups [[Employee Checkin]] rows per employee per shift-day, classifies Present/Absent/Half Day against the Shift Type's working-hour thresholds, creates/updates [[Attendance]]. |
| `hrms.hr.doctype.shift_schedule_assignment.shift_schedule_assignment.process_auto_shift_creation` | Rolls a recurring [[Shift Schedule]] forward into new [[Shift Assignment]] records via a watermark date (`create_shifts_after`). Full pseudocode in `01-Modules/Shift-Attendance/Shift Schedule Assignment.md`. |

## `daily`

| Function | Purpose |
|---|---|
| `hrms.controllers.employee_reminders.send_birthday_reminders` | Notifies relevant users of employees whose birthday is today. |
| `hrms.controllers.employee_reminders.send_work_anniversary_reminders` | Same, for work anniversaries. |
| `hrms.hr.doctype.daily_work_summary_group.daily_work_summary_group.send_summary` | Sends the compiled daily work summary digest. |
| `hrms.hr.doctype.interview.interview.send_daily_feedback_reminder` | Nudges interviewers who haven't submitted `Interview Feedback` yet for a completed interview. |
| `hrms.hr.doctype.shift_assignment.shift_assignment.mark_expired_shift_assignments_as_inactive` | Flips Shift Assignment records whose end date has passed to an inactive/expired state. |
| `hrms.hr.doctype.job_opening.job_opening.close_expired_job_openings` | Auto-closes [[Job Opening]] records past their closing date. |
| `hrms.telemetry.capture_daily_attendance_pulse` | Internal analytics only — not a feature to replicate. |

## `daily_long` — runs daily, allowed longer execution time

| Function | Purpose |
|---|---|
| `hrms.hr.doctype.leave_ledger_entry.leave_ledger_entry.process_expired_allocation` | Expires [[Leave Allocation]] records whose Leave Period has ended, writing the expiry as a [[Leave Ledger Entry]]. Full pseudocode in `01-Modules/Leaves/Leave Ledger Entry.md`. |
| `hrms.hr.utils.generate_leave_encashment` | For [[Leave Type]]s configured as encashable, computes and creates [[Leave Encashment]] for unused balance at period end. Full pseudocode in `01-Modules/Leaves/Leave Encashment.md`. |
| `hrms.hr.utils.allocate_earned_leaves` | For Leave Types configured with "earned leave" accrual (e.g. 1.75 days/month), incrementally allocates leave on the configured schedule ([[Earned Leave Schedule]]). Full pseudocode in `01-Modules/Leaves/Leave Allocation.md`. |

## `weekly`

| Function | Purpose |
|---|---|
| `hrms.controllers.employee_reminders.send_reminders_in_advance_weekly` | Advance-notice reminders (e.g. upcoming birthdays/anniversaries within the coming week), per [[HR Settings]] configuration. |

## `monthly`

| Function | Purpose |
|---|---|
| `hrms.controllers.employee_reminders.send_reminders_in_advance_monthly` | Same, monthly cadence. |

## Port Implementation Notes

- Use a real job scheduler (cron, a queue with delayed jobs, or a framework's
  built-in scheduler) — do NOT trigger these from request-time code paths, since
  their whole purpose is to run independent of any specific user's session (e.g. an
  Employee's Attendance must get marked even if nobody opens the app that day).
  `hourly_long`/`daily_long` are separated from `hourly`/`daily` in Frappe only
  because Frappe's default queue worker for the fast queues has a short timeout —
  a port with one general-purpose job queue can simply run all of these on their
  stated cadence without needing two separate queues, AS LONG AS a single slow job
  (e.g. auto-attendance for a very large company) can't starve other scheduled jobs;
  keep them on separate queues/workers if that's a concern in your chosen job runner.
- These must be idempotent-safe against retries/overlap (e.g. if `hourly_long` is
  still running when the next hour's run would start, most job schedulers skip or
  queue rather than run concurrently — replicate whichever behavior your job runner
  defaults to, since the original code assumes non-overlapping runs per Shift Type).

## Related

- [[Cross-Doctype Hooks (doc_events)]] — the request-triggered counterpart to these
  time-triggered jobs; several jobs here (e.g. auto-attendance) feed the same
  submittable doctypes those hooks react to.
- [[Submittable Document Lifecycle]] — jobs that create/expire Leave Allocation,
  Leave Encashment, and Attendance records must respect docstatus rules.
- [[Employee Core Model]] — birthday/work-anniversary reminders and auto-attendance
  both key off Employee fields (`date_of_birth`, `date_of_joining`, `default_shift`).
- [[Implicit Framework Behaviors]] — general port-wide guidance on building framework
  infrastructure (like the job scheduler itself) explicitly.
