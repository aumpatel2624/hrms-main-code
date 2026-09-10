# Shift Type

**Source:** `hrms/hr/doctype/shift_type/shift_type.json`, `shift_type.py`, `shift_type.js`
**Submittable:** no   **Tree:** no   **Naming:** `autoname: "prompt"` — user types the name directly (becomes primary key, no series)
**Module:** HR

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| start_time | Start Time | Time | — | yes | — | no | |
| end_time | End Time | Time | — | yes | — | no | |
| holiday_list | Holiday List | Link | Holiday List | no | — | no | If empty, employee's own holiday list (via `get_holiday_list_for_employee`) is used instead |
| determine_check_in_and_check_out | Determine Check-in and Check-out | Select | "Alternating entries as IN and OUT during the same shift" / "Strictly based on Log Type in Employee Checkin" | no | — | no | Drives `calculate_working_hours` algorithm choice |
| working_hours_calculation_based_on | Working Hours Calculation Based On | Select | "First Check-in and Last Check-out" / "Every Valid Check-in and Check-out" | no | — | no | |
| working_hours_threshold_for_half_day | Working Hours Threshold for Half Day | Float | — | no | — | no | precision 2; 0 disables; "Working hours below which Half Day is marked" |
| working_hours_threshold_for_absent | Working Hours Threshold for Absent | Float | — | no | — | no | precision 2; 0 disables; "Working hours below which Absent is marked" |
| begin_check_in_before_shift_start_time | Begin check-in before shift start time (in minutes) | Int | — | no | 60 | no | non-negative; window before shift start during which a checkin counts toward this shift |
| late_entry_grace_period | Late Entry Grace Period | Int | — | no | — | no | non-negative; `depends_on: enable_late_entry_marking`; minutes after shift start before check-in counts as late |
| early_exit_grace_period | Early Exit Grace Period | Int | — | no | — | no | non-negative; `depends_on: enable_early_exit_marking`; minutes before shift end before check-out counts as early |
| allow_check_out_after_shift_end_time | Allow check-out after shift end time (in minutes) | Int | — | no | 60 | no | non-negative; window after shift end during which a checkin counts toward this shift |
| auto_attendance_settings_section | (Section: Auto Attendance Settings) | Section Break | — | — | — | — | `depends_on: enable_auto_attendance`; groups the auto-attendance config fields |
| grace_period_settings_auto_attendance_section | (Section: Late Entry & Early Exit Settings for Auto Attendance) | Section Break | — | — | — | — | `depends_on: enable_auto_attendance`; groups late/early grace-period fields |
| enable_auto_attendance | Enable Auto Attendance | Check | — | no | 0 | no | Master switch: mark attendance from Employee Checkin for employees assigned to this shift |
| process_attendance_after | Process Attendance After | Date | — | conditionally (mandatory_depends_on enable_auto_attendance) | "Today" | no | Attendance auto-marking only considers checkins/dates on/after this date |
| last_sync_of_checkin | Last Sync of Checkin | Datetime | — | no | — | conditionally (`read_only_depends_on: auto_update_last_sync`) | Upper time bound for auto-attendance processing; can be auto-maintained (see `auto_update_last_sync`) or set manually |
| mark_auto_attendance_on_holidays | Mark Auto Attendance on Holidays | Check | — | no | 0 | no | If enabled, auto attendance is marked even on holiday dates when checkins exist |
| enable_late_entry_marking | Enable Late Entry Marking | Check | — | no | 0 | no | |
| enable_early_exit_marking | Enable Early Exit Marking | Check | — | no | 0 | no | |
| color | Roster Color | Select | Blue/Cyan/Fuchsia/Green/Lime/Orange/Pink/Red/Violet/Yellow | no | Blue | no | UI only |
| auto_update_last_sync | Automatically update Last Sync of Checkin | Check | — | no | 0 | no | When set, `last_sync_of_checkin` is advanced automatically by the hourly job instead of manually |
| overtime_section | (Section: Overtime) | Section Break | — | — | — | — | |
| allow_overtime | Allow Overtime | Check | — | no | 0 | no | |
| overtime_type | Overtime Type | Link | Overtime Type | conditionally (`mandatory_depends_on: eval:doc.allow_overtime==1`) | — | no | `depends_on` same condition |

## Child Tables

None.

## State Machine

Not submittable — no docstatus state machine. No `status`/`workflow_state` field on this doctype.

## Validation Rules (exact, in execution order)

Executed in `validate()`:

1. Compute `start = get_time(self.start_time)`, `end = get_time(self.end_time)`.
2. `validate_same_start_and_end`: IF `start_time == end_time` THEN `frappe.throw(_("Start time and end time cannot be same."), title=_("Invalid Shift Times"))` (source: `validate_same_start_and_end`).
3. `validate_circular_shift`:
   a. Compute `shift_start`/`shift_end` via `get_shift_start_and_shift_end(start, end)`: `shift_start = combine(today, start)`; IF `start < end` THEN `shift_end = combine(today, end)` ELSE (`start > end`) `shift_end = combine(today+1, end)`.
   b. Compute total duration in minutes = `round(time_diff(shift_end, shift_start).total_seconds()/60) + allow_check_out_after_shift_end_time + begin_check_in_before_shift_start_time`.
   c. IF total duration >= 1440 (24 hours) THEN `frappe.throw(_("Please reduce {0} to avoid shift time overlapping with itself").format(<field with the larger of the two buffer values>), title=_("Invalid Shift Times"))` — the offending field label is picked via `get_max_shift_buffer_label` (whichever of `allow_check_out_after_shift_end_time` / `begin_check_in_before_shift_start_time` has the larger value) (source: `validate_circular_shift`).
4. `validate_unlinked_logs`: IF `start_time` field was modified on an existing (non-new) doc AND `unlinked_checkins_exist()` is True (i.e. there exists an `Employee Checkin` with `shift = self.name`, `attendance` not set, `skip_auto_attendance = 0`, `offshift = 0`) THEN `frappe.throw(_("Mark attendance for existing check-in/out logs before changing shift settings"), title=_("Unmarked Check-in Logs Found"))` (source: `validate_unlinked_logs`).

## Business Logic / Calculations

### A. `process_auto_attendance(is_manually_triggered=False)` — whitelisted entry point

1. IF `has_incorrect_shift_config()` (i.e. `enable_auto_attendance` is falsy, OR `process_attendance_after` is not set, OR `last_sync_of_checkin` is not set) THEN return (do nothing).
2. `logs = self.get_employee_checkins()` (see below for exact filter).
3. IF `is_manually_triggered`:
   a. IF `len(logs) > 1000` OR `frappe.flags.test_bg_job` THEN enqueue `self._process(logs)` as a background job (`job_id = "process_auto_attendance_" + self.name`, `timeout=1200`, `deduplicate=True`); return a message linking to the RQ Job.
   b. ELSE run `self._process(logs)` synchronously inside try/except; on exception, log the error and return a message linking to the Error Log.
4. ELSE (background/scheduler call): run `self._process(logs)` directly, no return value used.

### B. `get_employee_checkins()` — fetch pass

Query `Employee Checkin` with fields `name, employee, log_type, time, shift, shift_start, shift_end, shift_actual_start, shift_actual_end, device_id, overtime_type`, filtered by:
- `skip_auto_attendance = 0`
- `attendance` is not set
- `time >= process_attendance_after`
- `shift_actual_end < last_sync_of_checkin`
- `shift = self.name` (this Shift Type)
- `offshift = 0`

Ordered by `employee, time`.

### C. `_process(logs)` — core grouping + marking algorithm

1. Group `logs` by key `(employee, shift_start)` (i.e. `groupby` over logs sorted by that same key) — this groups all checkins belonging to the same employee's single shift-occurrence (identified by its computed `shift_start` datetime, which already encodes the specific calendar day/instance of the shift).
2. FOR EACH group `(employee, shift_start)` → `single_shift_logs`:
   a. `attendance_date = shift_start.date()`.
   b. IF `should_mark_attendance(employee, attendance_date)` is False (see below) THEN skip this group (continue to next).
   c. Set `working_hours_threshold_for_half_day = working_hours_threshold_for_half_day` (float), `working_hours_threshold_for_absent = working_hours_threshold_for_absent` (float).
   d. IF `is_half_holiday(employee, attendance_date)` (checks if the date is a half-holiday on the employee's/shift's holiday list) THEN HALVE both thresholds: `working_hours_threshold_for_half_day /= 2`, `working_hours_threshold_for_absent /= 2`.
   e. `overtime_type = single_shift_logs[0].overtime_type`.
   f. Call `get_attendance(single_shift_logs, working_hours_threshold_for_absent, working_hours_threshold_for_half_day)` → returns `(attendance_status, working_hours, late_entry, early_exit, in_time, out_time)`.
   g. Call `mark_attendance_and_link_log(single_shift_logs, attendance_status, attendance_date, working_hours, late_entry, early_exit, in_time, out_time, shift=self.name, overtime_type=overtime_type)` — see [[Employee Checkin]] for the full body of this function (creates/updates `Attendance` and links checkins back via the `attendance` field).
3. After the loop, `frappe.db.commit()` (unless in test mode) — checkpoint progress before doing the absence sweep.
4. `assigned_employees = self.get_assigned_employees(self.process_attendance_after, consider_default_shift=True)` (see below).
5. FOR EACH batch of `EMPLOYEE_CHUNK_SIZE = 50` employees in `assigned_employees`:
   a. FOR EACH `employee` in batch:
      - `self.mark_absent_for_dates_with_no_attendance(employee)`
      - `self.mark_absent_for_half_day_dates(employee)`
   b. `frappe.db.commit()` (unless in test mode) — commit per batch.

### D. `get_attendance(logs, working_hours_threshold_for_absent, working_hours_threshold_for_half_day)` — status determination

Preconditions documented in source: logs belong to a single shift occurrence, single employee, chronological order, and the date is not (yet) excluded as a holiday.

1. `total_working_hours, in_time, out_time = calculate_working_hours(logs, determine_check_in_and_check_out, working_hours_calculation_based_on)` — see `Employee Checkin.md` for this algorithm.
2. `late_entry = False`. IF `enable_late_entry_marking` is truthy AND `in_time` is set AND `in_time > logs[0].shift_start + late_entry_grace_period minutes` THEN `late_entry = True`.
3. `early_exit = False`. IF `enable_early_exit_marking` is truthy AND `out_time` is set AND `out_time < logs[0].shift_end - early_exit_grace_period minutes` THEN `early_exit = True`.
4. IF `working_hours_threshold_for_absent` is truthy (non-zero) AND `total_working_hours < working_hours_threshold_for_absent` THEN return status `"Absent"` (with computed `working_hours, late_entry, early_exit, in_time, out_time`).
5. ELSE IF `working_hours_threshold_for_half_day` is truthy (non-zero) AND `total_working_hours < working_hours_threshold_for_half_day` THEN return status `"Half Day"`.
6. ELSE return status `"Present"`.

Note: thresholds of `0` disable that check entirely (per field description "Zero to disable"); order matters — Absent is checked before Half Day, so if `working_hours_threshold_for_absent >= working_hours_threshold_for_half_day` the Half Day branch may never trigger for very low hours (config responsibility, not validated by code).

### E. `mark_absent_for_dates_with_no_attendance(employee)` — absence sweep for missing attendance

1. `start_time = start_time` field. `dates = self.get_dates_for_attendance(employee)` (see below).
2. FOR EACH `date` in `dates`:
   a. `timestamp = combine(date, start_time)`.
   b. `shift_details = get_employee_shift(employee, timestamp, consider_default_shift=True)` (see [[Shift Assignment]]).
   c. IF `shift_details` exists AND `shift_details.shift_type.name == self.name` THEN:
      - `attendance = mark_attendance(employee, date, "Absent", self.name)` — creates+submits an [[Attendance]] doc via savepoint/rollback-safe helper; returns `None` if a `DuplicateAttendanceError`/`OverlappingShiftAttendanceError` occurred (then this date is skipped, no comment added).
      - IF `attendance` truthy THEN insert a `Comment` on the new `Attendance` with content "Employee was marked Absent due to missing Employee Checkins."

### F. `get_dates_for_attendance(employee)` — date range for absence sweep

1. `start_date, end_date = self.get_start_and_end_dates(employee)`.
2. IF `start_date is None` THEN return `[]` (no shift assignment found for this employee/shift — nothing to process).
3. `date_range = get_date_range(start_date, end_date)` — inclusive list of dates.
4. `holiday_dates = get_holiday_dates_between(self.get_holiday_list(employee), start_date, end_date)`.
5. `marked_attendance_dates = self.get_marked_attendance_dates_between(employee, start_date, end_date)` — dates in range with a non-cancelled `Attendance` record for this employee where `shift` is null OR `shift == self.name`.
6. Return `sorted(set(date_range) - set(holiday_dates) - set(marked_attendance_dates))`.

### G. `get_start_and_end_dates(employee)` — bounds for the sweep

1. Fetch `date_of_joining, relieving_date, employee_creation` from Employee (cached). IF `date_of_joining` is not set, use `employee_creation.date()` instead.
2. `start_date = max(process_attendance_after, date_of_joining)`.
3. `shift_details = get_shift_details(self.name, get_datetime(self.last_sync_of_checkin))`. `last_shift_time = shift_details.actual_end if shift_details else last_sync_of_checkin`.
4. `prev_shift = get_employee_shift(employee, last_shift_time - 1 day, consider_default_shift=True, next_shift_direction="reverse")` — looks for the most recent shift occurrence of any shift ending before/at that time, walking backward.
5. IF `prev_shift` exists AND `prev_shift.shift_type.name == self.name` THEN `end_date = min(prev_shift.start_datetime.date(), relieving_date)` if `relieving_date` set, ELSE `prev_shift.start_datetime.date()`.
6. ELSE (no matching prior shift found) return `(None, None)` — sweep skipped entirely for this employee/shift.
7. Return `(start_date, end_date)`.

Rationale documented in source comment: absentees are only auto-marked one full shift-cycle "behind" the last sync, to allow time for manual attendance corrections.

### H. `get_assigned_employees(from_date, consider_default_shift=False)`

1. `filters = {shift_type: self.name, docstatus: 1, status: "Active"}`, `or_filters = [[end_date >= from_date], [end_date is not set]]` → employees with an active Shift Assignment for this shift type that hasn't ended before `from_date`.
2. IF `consider_default_shift` THEN also fetch active Employees whose `default_shift == self.name` and union the two employee sets.
3. Exclude employees whose Employee status is `"Inactive"`.
4. Return the resulting employee list (deduplicated).

### I. `should_mark_attendance(employee, attendance_date)`

1. IF `mark_auto_attendance_on_holidays` THEN return `True` (always mark, holiday or not).
2. ELSE: `holiday_list = self.get_holiday_list(employee, attendance_date)`. IF `is_holiday(holiday_list, attendance_date)` THEN return `False`. ELSE return `True`.

### J. `get_holiday_list(employee, date=None)`

Returns `self.holiday_list` if set on the Shift Type, ELSE `get_holiday_list_for_employee(employee, raise_exception=False, as_on=date)`.

### K. `is_half_holiday(employee, attendance_date)`

Returns `True` if `is_half_holiday(get_holiday_list(employee, attendance_date), attendance_date)` (ERPNext holiday-list utility) is `True`.

### L. `mark_absent_for_half_day_dates(employee)` — resolves the "other half" of split Half Day attendance

For "modify_half_day_status" attendance records (created when a Leave Application's `half_day_date` matches, leaving the non-leave half of the day pending a real Present/Absent determination based on checkins):

1. Fetch all `Attendance` for `employee` with `status = "Half Day"`, `modify_half_day_status = 1`, `attendance_date <= getdate(last_sync_of_checkin)`.
2. FOR EACH such attendance:
   a. `timestamp = combine(attendance_date, start_time)`. `shift_details = get_employee_shift(employee, timestamp, consider_default_shift=True)`.
   b. IF `shift_details` exists AND `shift_details.shift_type.name == self.name` THEN:
      - `frappe.db.set_value("Attendance", attendance.name, {shift: self.name, half_day_status: "Absent", modify_half_day_status: 0})` — direct DB write, no controller re-validation, no re-submit (doc is already submitted).
      - Insert a `Comment` on the Attendance: "Employee was marked Absent for other half due to missing Employee Checkins."

Note: this always resolves the ambiguous half to "Absent" — there is no code path in this function that resolves it to "Present" based on sufficient working hours; that only happens in `create_or_update_attendance` in `employee_checkin.py` when checkins actually exist and are processed for that date (see `Employee Checkin.md`).

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| validate | `validate_same_start_and_end`, `validate_circular_shift`, `validate_unlinked_logs` | none |

No `on_update`, `on_submit` (not submittable), `on_trash`, etc. defined on the controller.

## Whitelisted / API Methods

| Method name | HTTP-equivalent purpose | Args | Returns | What it does |
|---|---|---|---|---|
| `process_auto_attendance` (instance method) | Trigger auto-attendance marking for this Shift Type on demand | `is_manually_triggered: bool` (default False) | `str` message, or `None` | See Business Logic section A. Guards on `enable_auto_attendance`/`process_attendance_after`/`last_sync_of_checkin`; may run sync or enqueue a background job depending on log volume. |

Module-level (not `@frappe.whitelist()`, but scheduler entry points):
- `update_last_sync_of_checkin()` — see Scheduled Jobs below.
- `process_auto_attendance_for_all_shifts()` — see Scheduled Jobs below.
- `get_actual_shift_end(shift, current_datetime)` — helper used by `update_last_sync_of_checkin`.

## Permissions

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| HR Manager | yes | yes | yes | yes | n/a | n/a | n/a | yes | yes | share=1 |
| HR User | yes | yes | yes | no | n/a | n/a | n/a | yes | yes | share=1 |
| Employee | yes | no | no | no | n/a | n/a | n/a | yes | yes | share=1; read-only view |

(Not submittable, so Submit/Cancel/Amend columns are n/a for all roles.)

## Scheduled Jobs Touching This Doctype

From `hrms/hooks.py`, `scheduler_events["hourly_long"]` (in this exact order):

1. **`hrms.hr.doctype.shift_type.shift_type.update_last_sync_of_checkin`** (runs first, hourly-long cadence):
   1. Fetch all `Shift Type` where `enable_auto_attendance=1` AND `auto_update_last_sync=1` (fields: name, last_sync_of_checkin, start_time, end_time).
   2. `current_datetime = frappe.flags.current_datetime or now()`.
   3. FOR EACH shift:
      a. `shift_end = get_actual_shift_end(shift, current_datetime)`:
         - `time_within_shift = combine(current_datetime.date(), shift.start_time)`.
         - `shift_details = get_shift_details(shift.name, time_within_shift)`; `actual_shift_start = shift_details.actual_start`; `actual_shift_end = shift_details.actual_end`.
         - IF `actual_shift_start.date() < actual_shift_end.date()` (overnight shift) OR `current_datetime < actual_shift_start` THEN `actual_shift_end = actual_shift_end - 1 day`.
         - Return `actual_shift_end`.
      b. Determine `update_last_sync`:
         - IF `shift.last_sync_of_checkin` is set: `update_last_sync = True` IF `last_sync_of_checkin < shift_end < current_datetime` ELSE stays unset.
         - ELSE (no last_sync yet): `update_last_sync = True` IF `shift_end < current_datetime`.
      c. IF `update_last_sync` THEN `frappe.db.set_value("Shift Type", shift.name, "last_sync_of_checkin", shift_end + 1 minute)` — direct DB write, advances the sync watermark to just past the most recently completed shift occurrence.

2. **`hrms.hr.doctype.shift_type.shift_type.process_auto_attendance_for_all_shifts`** (runs second):
   1. Fetch all `Shift Type` names where `enable_auto_attendance = "1"`.
   2. FOR EACH shift name: load the cached doc and call `doc.process_auto_attendance()` (with `is_manually_triggered` defaulting to `False`, so this always synchronously runs `_process(logs)` for that shift — see Business Logic section A/C above).

3. **`hrms.hr.doctype.shift_schedule_assignment.shift_schedule_assignment.process_auto_shift_creation`** (runs third) — see [[Shift Schedule Assignment]] for its full algorithm. Not directly touching Shift Type data, but shares the same scheduler cadence and typically runs right after attendance has been processed for the hour.

## Port Notes

- **Ordering dependency is load-bearing.** `update_last_sync_of_checkin` MUST run before `process_auto_attendance_for_all_shifts` in the same scheduler tick, because the latter reads `last_sync_of_checkin` as an upper bound for which checkins/dates it will process. If a re-implementation runs these as independent jobs/queues without enforcing this order, attendance marking will lag or double-process. Recommend implementing this as a single job with three internal sequential steps, or an explicit dependency/queue-priority mechanism.
- **`process_auto_attendance` is exposed as a whitelisted instance method** callable manually from the UI ("Mark Attendance" button); the port needs an equivalent authenticated RPC (role: HR-capable) for on-demand execution with the same job-size-based (>1000 logs) synchronous vs. background-queue branching, to avoid HTTP timeouts on large check-in backlogs.
- **`process_attendance_after` and `last_sync_of_checkin` are user-editable "watermarks".** A naive re-implementation might try to always look forward from "now" — this does not match source behavior; both bounds must be explicit, persisted, mutable fields, with `process_attendance_after` mandatory once auto-attendance is enabled (`mandatory_depends_on`).
- **Absence marking always resolves ambiguous Half Day status to "Absent"**, never "Present" — see business logic section L. If the port's product intent differs, this needs explicit product sign-off since it's a faithful reproduction of a real (if seemingly one-sided) behavior in source.
- **Frappe-implicit behaviors relied on** and must be built explicitly in a new stack:
  - `frappe.get_cached_doc`/`frappe.get_cached_value` — the scheduler job re-uses a per-request/process cache for Shift Type and Employee lookups; a port should at least memoize these within a single batch run for performance parity.
  - `track_changes: 1` — full field-level audit trail/version history is automatic in Frappe; must be built explicitly (e.g. an audit log table) if required.
  - `is_field_modified`/`has_value_changed` (used in `validate_unlinked_logs`) relies on Frappe's automatic "doc before save" diffing — a port must explicitly fetch the pre-update row to compare `start_time`.
  - Committing per-batch (`frappe.db.commit()`) inside a long-running job is a Frappe-specific pattern to avoid losing all progress on a mid-job crash; equivalent chunked-transaction-commit behavior should be reproduced in the target stack's job runner.
- **No explicit validation exists on `working_hours_threshold_for_absent` vs `working_hours_threshold_for_half_day` ordering** (e.g. absent threshold could be configured higher than half-day threshold, making Half Day effectively unreachable) — this is not caught anywhere in source; flagging as a potential config foot-gun to consider (but not to silently "fix") in the port.

## Related Doctypes

- [[Employee Checkin]] — feeds the auto-attendance pipeline; `mark_attendance_and_link_log` creates/updates Attendance from Shift Type's grouped checkins.
- [[Shift Assignment]] — resolves each employee's active shift occurrence; also the shared shift-window resolution engine this doctype relies on.
- [[Attendance]] — created/updated by the auto-attendance pipeline and the absence sweeps.
- [[Shift Schedule Assignment]] — its `process_auto_shift_creation` job runs in the same `hourly_long` scheduler bucket immediately after this doctype's auto-attendance jobs.
- Overtime Type — referenced by `overtime_type`, but no matching doctype file exists in this repo to wikilink.
