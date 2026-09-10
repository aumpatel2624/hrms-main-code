# HR Settings

**Source:** `hrms/hr/doctype/hr_settings/hr_settings.json`, `hr_settings.py`
**Submittable:** no   **Tree:** no   **Naming:** Single (`issingle: 1` — exactly one record ever exists, no name/autoname)
**Module:** HR

Global configuration singleton for HR-module-wide behavior toggles (employee naming, leave/expense approval rules, reminders, shift/attendance defaults, exit questionnaires, hiring reminders). Referenced throughout this module and others (`prevent_self_expense_approval` is read directly by `Expense Claim.py`, see [[Expense Claim]]).

## Schema

Grouped by tab, in JSON field order. Section/Column/Tab breaks noted as headings only.

### Tab: Employee

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| emp_created_by | Employee Naming By | Select | `Naming Series`/`Employee Number`/`Full Name` | - | Naming Series | - | drives [[Employee Core Model]] naming rule (see [[Naming and Autoname Rules]], Business Logic #1) |
| standard_working_hours | Standard Working Hours | Float | - | - | - | - | `non_negative` |
| retirement_age | Retirement Age (In Years) | Data | - | - | - | - | |
| *(section: Reminders)* | | | | | | | |
| send_holiday_reminders | Holidays | Check | - | - | 1 | - | |
| send_work_anniversary_reminders | Work Anniversaries | Check | - | - | 1 | - | |
| send_birthday_reminders | Birthdays | Check | - | - | 1 | - | |
| frequency | Set the frequency for holiday reminders | Select | `Weekly`/`Monthly` | conditionally | Weekly | - | `depends_on`/`mandatory_depends_on: send_holiday_reminders`; changing this triggers the frequency-change warning (Business Logic #2) |
| sender | Sender | Link | Email Account | - | - | - | reminder sender account (Employee-related reminders) |
| sender_email | Sender Email | Data | - | - | - | yes | fetch_from `sender.email_id`, `fetch_if_empty` |
| hiring_sender | Sender | Link | Email Account | - | - | - | separate sender account for hiring/interview reminders |
| hiring_sender_email | Sender Email | Data | - | - | - | yes | fetch_from `hiring_sender.email_id`, `fetch_if_empty` |

### Tab: Leaves

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| auto_leave_encashment | Auto Leave Encashment | Check | - | - | 0 | - | |
| leave_approver_mandatory_in_leave_application | Leave Approver Mandatory In Leave Application | Check | - | - | 1 | - | |
| prevent_self_leave_approval | Prevent self approval for leaves even if user has permissions | Check | - | - | 0 | - | |
| show_leaves_of_all_department_members_in_calendar | Show Leaves Of All Department Members In Calendar | Check | - | - | 0 | - | |
| send_leave_notification | Send Leave Notification | Check | - | - | 1 | - | |
| leave_approval_notification_template | Leave Approval Notification Template | Link | Email Template | conditionally | - | - | `depends_on`/`mandatory_depends_on: eval: doc.send_leave_notification == 1` |
| leave_status_notification_template | Leave Status Notification Template | Link | Email Template | conditionally | - | - | same condition as above |
| restrict_backdated_leave_application | Restrict Backdated Leave Application | Check | - | - | 0 | - | |
| role_allowed_to_create_backdated_leave_application | Role Allowed to Create Backdated Leave Application | Link | Role | conditionally | - | - | `depends_on`/`mandatory_depends_on: eval:doc.restrict_backdated_leave_application == 1` |

### Tab: Expenses

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| expense_approver_mandatory_in_expense_claim | Expense Approver Mandatory In Expense Claim | Check | - | - | 1 | - | drives conditional-required `expense_approver` field on `Expense Claim` (client-side today, see `Expense Claim.md` Port Notes) |
| prevent_self_expense_approval | Prevent self approval for expense claims even if user has permissions | Check | - | - | 0 | - | consumed directly by `Expense Claim.validate_for_self_approval` (see `Expense Claim.md`) and exposed via `onload` |

### Tab: Shift and Attendance

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| allow_multiple_shift_assignments | Allow Multiple Shift Assignments for Same Date | Check | - | - | 0 | - | |
| allow_employee_checkin_from_mobile_app | Allow Employee Checkin from Mobile App | Check | - | - | 1 | - | |
| allow_geolocation_tracking | Allow Geolocation Tracking | Check | - | - | 0 | - | |
| unlink_payment_on_cancellation_of_employee_advance | Unlink Payment on Cancellation of Employee Advance | Check | - | - | 0 | - | (label has a leading space in source JSON) |

### Tab: Tenure

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| exit_questionnaire_web_form | Exit Questionnaire Web Form | Link | Web Form | - | - | - | |
| exit_questionnaire_notification_template | Exit Questionnaire Notification Template | Link | Email Template | - | - | - | |

### Tab: Recruitment

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| check_vacancies | Check Vacancies On Job Offer Creation | Check | - | - | 0 | - | |
| send_interview_reminder | Send Interview Reminder | Check | - | - | 0 | - | |
| interview_reminder_template | Interview Reminder Notification Template | Link | Email Template | conditionally | - | - | `depends_on`/`mandatory_depends_on: send_interview_reminder` |
| remind_before | Remind Before | Time | - | - | 00:15:00 | - | `depends_on: send_interview_reminder` |
| send_interview_feedback_reminder | Send Interview Feedback Reminder | Check | - | - | 0 | - | |
| feedback_reminder_notification_template | Feedback Reminder Notification Template | Link | Email Template | conditionally | - | - | `depends_on`/`mandatory_depends_on: send_interview_feedback_reminder` |

## Child Tables

None.

## State Machine

Not applicable — Single doctype, no docstatus/submission lifecycle.

## Validation Rules (exact, in execution order)

`validate()`:

1. `set_naming_series()` — see Business Logic #1 (no throw; delegates to ERPNext core `set_by_naming_series`, which itself may throw if changing the Employee naming rule conflicts with existing data — out of scope of this app).
2. `validate_frequency_change()` — only runs if module-level flag `PROCEED_WITH_FREQUENCY_CHANGE` is `False` (see Business Logic #2). Resets the flag to `False` immediately after, regardless of branch taken (i.e. it's a one-shot "user confirmed, skip the warning this one time" flag).

## Business Logic / Calculations

### 1. `set_naming_series()`
Calls ERPNext core `set_by_naming_series("Employee", "employee_number", is_naming_series=(self.emp_created_by == "Naming Series"), hide_name_field=True)`. This toggles, on the `Employee` doctype's `employee_number` field, whether it behaves as a manually-entered field or is driven by a naming series — i.e. `HR Settings.emp_created_by` is a meta-configuration switch that alters another doctype's field behavior at the schema/UI level, not just a runtime read. **Port Note:** a new stack without Frappe's naming-series meta-programming must instead branch its own `Employee`-creation code paths on this setting value at record-creation time (Naming Series pattern / auto-increment Employee Number / Full Name), rather than mutating field metadata.

### 2. `validate_frequency_change()`
1. Look up the `Scheduled Job Type` records for `hrms.controllers.employee_reminders.send_reminders_in_advance_weekly` and `..._monthly`. If either doesn't exist (`frappe.DoesNotExistError`), return silently (nothing to warn about — likely first install before jobs are registered).
2. Compute `next_weekly_trigger` / `next_monthly_trigger` from each job's `get_next_execution()`.
3. IF the `frequency` field value just changed from `Monthly` to `Weekly` (`has_value_changed` AND new value is `Weekly`) AND `next_monthly_trigger < next_weekly_trigger` THEN call `show_freq_change_warning(next_monthly_trigger, next_weekly_trigger)`.
4. ELSE IF changed from `Weekly` to `Monthly` AND `next_monthly_trigger > next_weekly_trigger` THEN call `show_freq_change_warning(next_weekly_trigger, next_monthly_trigger)`.
5. `show_freq_change_warning(from_date, to_date)`: shows a confirmation `msgprint` — `"Employees will miss holiday reminders from {from_date} until {to_date}. Do you want to proceed with this change?"` — with a primary action button ("Yes, Proceed") wired to a client-side call that invokes the whitelisted `set_proceed_with_frequency_change()` and then re-submits the save. `raise_exception` is set to `frappe.ValidationError` (i.e. this message BLOCKS the save, functioning as a confirmation gate) UNLESS running under test/patch/install/migrate flags, in which case it's non-blocking (`raise_exception=False`, just informational).

**Port Note:** this whole mechanism (Scheduled Job Type introspection + a save-blocking confirm-to-proceed dialog + a global in-memory flag to bypass the check on the next save) is a Frappe-framework-specific UX pattern for "warn before a destructive-ish settings change, but let the user confirm and retry." A re-implementation should replace the global mutable flag with an explicit `confirmed: bool` parameter passed on the retry request instead of process-global state (the source's approach is not thread-safe / not safe across concurrent requests — flagging as a source code smell to avoid replicating verbatim).

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| `validate` | `set_naming_series()`, `validate_frequency_change()` | Mutates `Employee` doctype's `employee_number` field metadata (naming series vs manual vs hidden) |

## Whitelisted / API Methods

| Method name | HTTP-equivalent purpose | Args | Returns | What it does |
|---|---|---|---|---|
| `set_proceed_with_frequency_change` | Confirm-and-retry gate for the reminder-frequency-change warning | none | none | Sets module-global `PROCEED_WITH_FREQUENCY_CHANGE = True` so the NEXT `validate()` call on this Single skips `validate_frequency_change()`'s blocking warning |

## Permissions (see [[Permission Model (RBAC)]])

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| System Manager | yes | yes | yes | - | - | - | - | - | - | Single doctypes have no delete in practice |
| HR Manager | yes | yes | - | - | - | - | - | - | - | |
| HR User | yes | - | - | - | - | - | - | - | - | read-only |
| Employee | yes | - | - | - | - | - | - | - | - | read-only |

## Scheduled Jobs Touching This Doctype

None directly scheduled against `HR Settings`, but its `frequency`, `send_holiday_reminders`, `send_birthday_reminders`, `send_work_anniversary_reminders` values are READ by the scheduled reminder jobs `hrms.controllers.employee_reminders.send_reminders_in_advance_weekly` / `..._monthly` (their existence is checked in `validate_frequency_change`, above; their actual run cadence is defined in `hrms/hooks.py` `scheduler_events` — see [[Background Jobs (Scheduler Events)]] — outside this doctype's own file).

## Related Doctypes

- [[Employee Core Model]] — `emp_created_by` drives the Employee naming rule (naming series / employee number / full name); consumed via `set_by_naming_series` meta-programming on `Employee.employee_number`.
- [[Expense Claim]] — `prevent_self_expense_approval` and `expense_approver_mandatory_in_expense_claim` are read directly by `Expense Claim`'s controller/client logic (a key consumer of this settings singleton).
- [[Background Jobs (Scheduler Events)]] — the scheduled reminder jobs (`send_reminders_in_advance_weekly`/`..._monthly`) read this doctype's reminder toggles and `frequency` field.

## Port Notes

- `track_changes: 1` — Frappe versions every save of this singleton. A port needs an explicit settings-audit-log table if that history matters.
- Being a Single (`issingle: 1`) doctype means there is exactly one row for the whole site/tenant; in a multi-tenant re-implementation this becomes one row per tenant/company scope, not a literal single global row — decide the tenancy boundary explicitly.
