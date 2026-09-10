# Shift Schedule Assignment

**Source:** `hrms/hr/doctype/shift_schedule_assignment/shift_schedule_assignment.json`, `shift_schedule_assignment.py`, `shift_schedule_assignment.js`
**Submittable:** no   **Tree:** no   **Naming:** `autoname: "HR-SHSA-.YY.-.MM.-.#####"` (expression, old style)
**Module:** HR

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| schedule_settings_section | Shift Details (label) | Section Break | — | — | — | — | |
| column_break_iprq | (Column) | Column Break | — | — | — | — | |
| enabled | Enabled | Check | — | no | 1 | no | "Select this if you want shift assignments to be automatically created indefinitely." |
| create_shifts_after | Create Shifts After | Date | — | conditionally (`mandatory_depends_on: eval:doc.enabled`) | "Today" | no | `depends_on: eval:doc.enabled`; watermark — new Shift Assignments created only after this date; advanced automatically as shifts are generated |
| shift_details_section | Employee Details (label) | Section Break | — | — | — | — | |
| employee | Employee | Link | [[Employee Core Model]] | yes | — | no | in_list_view, in_standard_filter |
| employee_name | Employee Name | Data | — | no | — | yes | fetch_from `employee.employee_name` |
| column_break_toss | (Column) | Column Break | — | — | — | — | |
| company | Company | Link | Company | yes | — | yes | fetch_from `employee.company`, in_list_view |
| shift_status | Shift Status | Select | Active/Inactive | no | Active | no | value stamped onto generated Shift Assignments' `status` |
| shift_schedule | Shift Schedule | Link | [[Shift Schedule]] | yes | — | no | |
| shift_location | Shift Location | Link | [[Shift Location]] | no | — | no | stamped onto generated Shift Assignments |

## Child Tables

None.

## State Machine

Not submittable — no docstatus workflow. No `status` field on the doctype itself (distinct from `shift_status`, which is a data value copied onto generated child Shift Assignments, not a lifecycle state of this doc).

## Validation Rules (exact, in execution order)

`validate()`:
1. `validate_existing_shift_assignments()`:
   - Runs ONLY IF `self.has_value_changed("create_shifts_after")` AND `not self.is_new()` (i.e. editing `create_shifts_after` on an existing record).
   - `existing_shift_assignments, last_shift_end_date = self.get_existing_shift_assignments()`: finds [[Shift Assignment]]s (via inner join on `shift_schedule_assignment == self.name`) that are `status = "Active"`, belong to `self.employee`, and have `end_date >= self.create_shifts_after` (i.e. shift assignments already generated for dates at/after the new watermark being set).
   - IF any such assignments exist THEN `frappe.throw(msg=_("Shift assignments for {0} after {1} are already created. Please change {2} date to a date later than {3} {4}").format(shift_schedule, create_shifts_after, "Create Shifts After", last_shift_end_date, <bulleted list of links to the conflicting Shift Assignments>), title=_("Existing Shift Assignments"))` — prevents rewinding the watermark into a period that already has generated assignments (would create duplicates).

## Business Logic / Calculations

### A. `create_shifts(start_date, end_date=None)` — instance method; generates a run of Shift Assignment records covering a date window, splitting into contiguous blocks by which calendar days match the schedule's `repeat_on_days`

1. Load the linked `Shift Schedule` doc.
2. Map `shift_schedule.frequency` to a "gap" in weeks-minus-one: `{"Every Week": 0, "Every 2 Weeks": 1, "Every 3 Weeks": 2, "Every 4 Weeks": 3}[frequency]`.
3. `date = start_date`. `individual_assignment_start = None` (tracks the start of a currently-open contiguous run of matching weekdays).
4. `week_end_day = get_weekday(start_date - 1 day)` — i.e. the weekday immediately preceding `start_date`; this becomes the fixed "week boundary" weekday used to detect when a full week has elapsed (for the multi-week gap logic).
5. `repeat_on_days = [day.day for day in shift_schedule.repeat_on_days]` (child table `Assignment Rule Day`, e.g. "Monday", "Tuesday", ...).
6. IF `end_date` not given THEN default `end_date = start_date + 90 days`.
7. WHILE `date <= end_date`:
   a. `weekday = get_weekday(date)`.
   b. IF `weekday` is in `repeat_on_days` (this date matches the schedule):
      - IF `individual_assignment_start` is not yet set, set it to `date` (start of a new contiguous matching run).
      - IF `date == end_date` (loop is about to end while still inside a matching run) THEN immediately call `create_individual_assignment(shift_type, individual_assignment_start, date)` to close out the run at the boundary.
   c. ELSE IF `individual_assignment_start` is set (this date breaks a previously-open matching run):
      - `create_individual_assignment(shift_type, individual_assignment_start, date - 1 day)` — closes the run ending the day before this non-matching date.
      - Reset `individual_assignment_start = None`.
   d. IF `weekday == week_end_day` AND `gap` is non-zero (i.e. frequency is not "Every Week", and we've just completed a full week boundary):
      - IF `individual_assignment_start` is still open THEN close it out immediately: `create_individual_assignment(shift_type, individual_assignment_start, date)`, reset to `None`.
      - Skip ahead: `date += 7 * gap days` (jump over the "off" weeks of a bi-/tri-/quad-weekly schedule).
   e. `date += 1 day` (always advances by one day, in addition to any skip in step d).
8. End of loop.

### B. `create_individual_assignment(shift_type, start_date, end_date)`

1. Call `create_shift_assignment(self.employee, self.company, shift_type, start_date, end_date, self.shift_status, self.shift_location, self.name)` — see [[Shift Assignment Tool]] for the full body (creates, saves, and submits a new `Shift Assignment` doc, stamping `shift_schedule_assignment = self.name`).
2. `self.db_set("create_shifts_after", end_date, update_modified=False)` — advances this record's own watermark to the end of the block just created, directly via DB write (no re-validation, no modified-timestamp bump).

### C. `process_auto_shift_creation()` — module-level, the scheduler entry point

1. Fetch all `Shift Schedule Assignment` names where `enabled = 1` AND `create_shifts_after <= today`.
2. FOR EACH such assignment `d`:
   a. `doc = frappe.get_doc("Shift Schedule Assignment", d)`.
   b. `start_date = doc.create_shifts_after` (captured before mutation, for the comment message).
   c. `doc.create_shifts(add_days(doc.create_shifts_after, 1))` — i.e. always generates starting from **one day after** the current watermark, with NO explicit `end_date` argument, so `create_shifts` internally defaults the window to `start_date + 90 days` (per Business Logic A step 6). This is the **lookahead window**: each scheduler run extends generated shift assignments 90 days past the previous watermark.
   d. Add an Info comment to the doc: "Shift Assignments created for the schedule between {start_date} and {doc.create_shifts_after} via background job" (note: `doc.create_shifts_after` here reflects the NEW watermark value after `create_shifts` has advanced it through repeated `db_set` calls in step B.2 above).
   e. IF any `Exception` is raised while processing this assignment THEN `frappe.log_error(e)` and `continue` to the next assignment (failure on one Shift Schedule Assignment does not abort the batch).

**Guard conditions summarized**: only processes assignments where `enabled = 1` (the "Select this if you want shift assignments to be automatically created indefinitely" flag) and whose `create_shifts_after` watermark is not in the future (`<= today`) — i.e. an assignment configured with a future watermark is skipped until that date arrives naturally.

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| validate | `validate_existing_shift_assignments` | reads Shift Assignment |
| (none — not submittable) | `create_shifts`/`create_individual_assignment` are called externally (from `process_auto_shift_creation`, from `Shift Assignment Tool.bulk_assign`, or via the "Assign Shift Schedule" UI flow), not from a doctype lifecycle hook | creates+submits `Shift Assignment` records; `db_set`s own `create_shifts_after` field repeatedly as blocks are created |

## Whitelisted / API Methods

None declared with `@frappe.whitelist()` directly on this controller. `create_shifts` is called by `Shift Assignment Tool.bulk_assign` (itself whitelisted — see `Shift Assignment Tool.md`) and by the scheduler.

## Permissions

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| Employee | yes | no | no | no | n/a | n/a | n/a | yes | yes | share, email, print |
| HR User | yes | yes | yes | no | n/a | n/a | n/a | yes | yes | |
| HR Manager | yes | yes | yes | yes | n/a | n/a | n/a | yes | yes | |

(Not submittable, so Submit/Cancel/Amend are n/a.)

## Scheduled Jobs Touching This Doctype

From `hrms/hooks.py`, `scheduler_events["hourly_long"]` (third entry, after the two Shift Type jobs documented in [[Shift Type]]):

**`hrms.hr.doctype.shift_schedule_assignment.shift_schedule_assignment.process_auto_shift_creation`** — full algorithm reproduced in Business Logic section C above. Runs hourly (long-running scheduler bucket); each run advances every enabled schedule assignment's generated-shift-assignment horizon by up to 90 days from its last watermark, and only for assignments whose watermark has already arrived (`create_shifts_after <= today`).

## Port Notes

- **The `create_shifts` weekday/gap-skipping algorithm is intricate and stateful** — it is not equivalent to "for each date in range, if weekday matches, create/extend a Shift Assignment." The gap-skip logic (step A.7.d) can jump `date` forward by multiple weeks mid-loop, and the "close current open run" logic runs at three different trigger points (end of range, non-matching day breaks a run, week-boundary-with-gap forces early closure). Recommend porting this as a literal day-by-day state-machine simulation and validating against `test_shift_schedule_assignment.py`, not re-deriving it from the frequency/day-of-week rule abstractly.
- **The 90-day lookahead window is a hardcoded constant** (`add_days(start_date, 90)` inside `create_shifts` when no explicit `end_date` is passed) — not a configurable field anywhere in the schema. A port should treat this as a named constant (e.g. `DEFAULT_SHIFT_SCHEDULE_LOOKAHEAD_DAYS = 90`) and flag it as a hardcoded value inherited from source rather than something end users can tune, unless the port chooses to add a setting (which would be a deliberate product enhancement beyond source, to be called out separately).
- **`create_shifts_after` is both a user-set input AND a machine-advanced cursor** — each `create_individual_assignment` call advances it via direct `db_set` (bypassing `validate()`), so by the time `process_auto_shift_creation`'s per-record try/except finishes, the field no longer holds the value the user last set; the port must replicate this "self-advancing watermark" pattern (e.g. an internal cursor column distinct from — or exactly reusing, as source does — the user-facing field) including the fact that editing it manually is blocked once matching Shift Assignments already exist past the new value (see Validation Rules).
- **Failure isolation**: one Shift Schedule Assignment's exception during the scheduled batch is logged and skipped, not retried and not aborting the rest of the batch (`continue` in the except block) — a port's job runner needs equivalent per-item error isolation, not a single all-or-nothing transaction across every enabled schedule assignment.
- **`shift_status` on this doctype is copied verbatim onto every generated Shift Assignment's `status` field** — including the value `"Inactive"`, which (per `Shift Assignment.validate_overlapping_shifts`) skips that assignment's own overlap validation entirely. This means an admin can configure an entire recurring schedule to generate assignments that never overlap-check against anything — reproduce this behavior; do not add an overlap check that source doesn't have.
- **`track_changes: 1`** is not set on this doctype's JSON (audit history not automatic here, unlike Attendance/Shift Type) — confirm this is intentional in source; a port should match (no implicit versioning requirement for this specific doctype).

## Related Doctypes

- [[Employee Core Model]] — the assignment binds this employee to a recurring schedule.
- [[Shift Schedule]] — the recurrence pattern (frequency + days) this assignment follows.
- [[Shift Location]] — optional geofence location stamped onto generated Shift Assignments.
- [[Shift Assignment]] — the records this doctype auto-generates via `create_shifts`/`create_individual_assignment`.
- [[Shift Assignment Tool]] — its "Assign Shift Schedule" action creates these assignments and can eagerly trigger `create_shifts`.
- [[Shift Type]] — the auto-attendance scheduler jobs documented there run immediately before this doctype's `process_auto_shift_creation` job in the same `hourly_long` bucket.
