# Employee Checkin

**Source:** `hrms/hr/doctype/employee_checkin/employee_checkin.json`, `employee_checkin.py`, `employee_checkin.js`
**Submittable:** no   **Tree:** no   **Naming:** `autoname: "EMP-CKIN-.MM.-.YYYY.-.######"` (expression, old style)
**Module:** HR

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| employee | Employee | Link | [[Employee Core Model]] | yes | — | no | in_standard_filter, search_index |
| employee_name | Employee Name | Data | — | no | — | yes | fetch_from `employee.employee_name` |
| log_type | Log Type | Select | (blank)/IN/OUT | no | — | no | |
| shift | Shift | Link | [[Shift Type]] | no | — | yes | search_index; set by `fetch_shift()` |
| column_break_4 | (Column) | Column Break | — | — | — | — | |
| time | Time | Datetime | — | yes | "Now" | no | permlevel 1; `read_only_depends_on: eval:doc.attendance` (locked once attendance linked) |
| device_id | Location / Device ID | Data | — | no | — | no | |
| skip_auto_attendance | Skip Auto Attendance | Check | — | no | 0 | no | |
| attendance | Attendance Marked | Link | [[Attendance]] | no | — | yes | set by auto-attendance pipeline |
| shift_start | Shift Start | Datetime | — | no | — | no | hidden; set by `fetch_shift()` |
| shift_end | Shift End | Datetime | — | no | — | no | hidden; set by `fetch_shift()` |
| shift_actual_start | Shift Actual Start | Datetime | — | no | — | no | hidden; set by `fetch_shift()` |
| shift_actual_end | Shift Actual End | Datetime | — | no | — | no | hidden; set by `fetch_shift()` |
| location_section | Location | Section Break | — | — | — | — | |
| geolocation | Geolocation | Geolocation | — | no | — | yes | set by `set_geolocation()` |
| shift_timings_section | Shift Timings | Section Break | — | — | — | — | |
| column_break_vyyt | (Column) | Column Break | — | — | — | — | |
| latitude | Latitude | Float | — | no | — | yes | precision 7 |
| longitude | Longitude | Float | — | no | — | yes | precision 7 |
| column_break_yqpi | (Column) | Column Break | — | — | — | — | |
| section_break_ksbo | (Section, no border) | Section Break | — | — | — | — | |
| fetch_geolocation | Fetch Geolocation | Button | — | — | — | — | client-triggers `set_geolocation`/`fetch_shift` UI flow |
| offshift | Off-shift | Check | — | no | 0 | yes | hidden; set by `fetch_shift()` when no shift found for the timestamp |
| overtime_type | Overtime Type | Link | Overtime Type | no | — | no | hidden; set by `fetch_shift()` |

## Child Tables

None.

## State Machine

Not submittable — no docstatus workflow beyond standard Draft(0)/Cancelled via delete-only (no `is_submittable`). No `status` field.

## Validation Rules (exact, in execution order)

`before_validate()`: `self.time = get_datetime(self.time).replace(microsecond=0)` — normalizes time, strips microseconds, runs before `validate()`.

`validate()`, in order:

1. `validate_active_employee(self.employee)` -> throws `InactiveEmployeeStatusError` if Employee.status == "Inactive" (source: `hrms.hr.utils.validate_active_employee`).
2. `validate_duplicate_log`: IF another `Employee Checkin` exists with same `employee`, same `time`, same `log_type`, and `name != self.name` THEN `frappe.throw(_("This employee already has a log with the same timestamp.{0}").format(link to the duplicate))` (source: `validate_duplicate_log`).
3. `validate_time_change`: IF `self.attendance` is set AND `self.has_value_changed("time")` THEN `frappe.throw(title=_("Cannot Modify Time"), msg=_("An attendance record is linked to this checkin. Please cancel the attendance before modifying time."))` (source: `validate_time_change`).
4. `self.fetch_shift()` — see Business Logic below; may itself `frappe.throw` if `determine_check_in_and_check_out == "Strictly based on Log Type in Employee Checkin"` and `log_type` is empty and `skip_auto_attendance` is falsy: `frappe.throw(_("Log Type is required for check-ins falling in the shift: {0}.").format(shift_type_name))`.
5. `self.set_geolocation()` — writes GeoJSON `geolocation` field from `latitude`/`longitude` if geolocation tracking is enabled site-wide (`HR Settings.allow_geolocation_tracking`) and both coordinates are present; no-op/no throw otherwise.
6. `validate_distance_from_shift_location`:
   a. IF `HR Settings.allow_geolocation_tracking` is falsy THEN skip entirely (return).
   b. IF neither `latitude` nor `longitude` is set THEN `frappe.throw(_("Latitude and longitude values are required for checking in."))`.
   c. Find active, submitted [[Shift Assignment]]s for this employee+shift with a `shift_location` set, where `start_date <= self.time` AND (`end_date >= self.time` OR `end_date` unset).
   d. IF no such assignment-location found THEN skip (return) — no radius check applies.
   e. ELSE fetch `checkin_radius, latitude, longitude` from the first matching [[Shift Location]]. IF `checkin_radius <= 0` THEN skip (radius check disabled for that location).
   f. Compute `distance = get_distance_between_coordinates(location.latitude, location.longitude, self.latitude, self.longitude)` (haversine formula, meters).
   g. IF `distance > checkin_radius` THEN `frappe.throw(_("You must be within {0} meters of your shift location to check in.").format(checkin_radius))`, `exc=CheckinRadiusExceededError` (source: `validate_distance_from_shift_location`).

## Business Logic / Calculations

### `fetch_shift()` — whitelisted; resolves and caches shift-window fields on the checkin

1. `shift_actual_timings = get_actual_start_end_datetime_of_shift(self.employee, self.time, consider_default_shift=True)` (see [[Shift Assignment]] for the full underlying algorithm — resolves the exact shift occurrence, including grace-period margins, that this checkin's timestamp falls within).
2. IF no shift found (`shift_actual_timings` falsy) THEN `self.shift = None`, `self.offshift = 1`; return.
3. IF `shift_actual_timings.shift_type.determine_check_in_and_check_out == "Strictly based on Log Type in Employee Checkin"` AND `self.log_type` is empty AND `self.skip_auto_attendance` is falsy THEN `frappe.throw(_("Log Type is required for check-ins falling in the shift: {0}.").format(shift_type.name))`.
4. IF `self.attendance` is NOT already set (i.e. this checkin hasn't been consumed by attendance processing yet) THEN:
   - `self.offshift = 0`
   - `self.shift = shift_actual_timings.shift_type.name`
   - `self.shift_actual_start = shift_actual_timings.actual_start`
   - `self.shift_actual_end = shift_actual_timings.actual_end`
   - `self.shift_start = shift_actual_timings.start_datetime`
   - `self.shift_end = shift_actual_timings.end_datetime`
   - `self.overtime_type = shift_actual_timings.overtime_type or None`
   (If `self.attendance` IS already set, none of these fields are touched — they stay frozen once attendance has been marked, consistent with `time` being locked at that point too.)

### `calculate_working_hours(logs, check_in_out_type, working_hours_calc_type)` — module-level, called from [[Shift Type]]`.get_attendance`

Preconditions: `logs` is a chronologically-ordered list of Employee Checkin dict-likes for one employee's one shift occurrence.

**Case A: `check_in_out_type == "Alternating entries as IN and OUT during the same shift"`**
1. `in_time = logs[0].time`. IF `len(logs) >= 2` THEN `out_time = logs[-1].time` (else stays unset).
2. IF `working_hours_calc_type == "First Check-in and Last Check-out"`: assume first log is always IN, last log is always OUT regardless of actual `log_type` values; `total_hours = time_diff_in_hours(in_time, logs[-1].time)`.
3. ELSE IF `working_hours_calc_type == "Every Valid Check-in and Check-out"`: consume `logs` two at a time in original order (`logs[0]`+`logs[1]` as one IN/OUT pair, then `logs[2]`+`logs[3]`, etc.), summing `time_diff_in_hours` for each full pair; a trailing unpaired single log at the end contributes nothing.

**Case B: `check_in_out_type == "Strictly based on Log Type in Employee Checkin"`**
1. IF `working_hours_calc_type == "First Check-in and Last Check-out"`: find the FIRST log with `log_type == "IN"` and the LAST log with `log_type == "OUT"` (searching from the end backward); `in_time`/`out_time` from those two logs; IF both found THEN `total_hours = time_diff_in_hours(in_time, out_time)` ELSE `total_hours = 0`. (Note: `in_time` and `out_time` are always taken from the first-IN/last-OUT even if `total_hours` calculation is skipped due to a missing pair — leaving them possibly set while `total_hours` is 0.)
2. ELSE IF `working_hours_calc_type == "Every Valid Check-in and Check-out"`: walk the logs in order tracking an `in_log`/`out_log` pointer pair — when both an `in_log` (a log with `log_type == "IN"`) and a following `out_log` (`log_type == "OUT"`) are captured, add `time_diff_in_hours(in_log.time, out_log.time)` to the running total, record the very first `in_time` seen and update `out_time` to the latest completed pair's out-time, then reset the pointers and continue scanning for the next IN/OUT pair. A dangling unmatched trailing IN/OUT pair at the very end of the loop is also finalized and added (see the `if in_log and out_log:` block after the loop).

`time_diff_in_hours(start, end) = round((end - start).total_seconds() / 3600, 2)`.

Returns `(total_hours, in_time, out_time)`.

### `mark_attendance_and_link_log(logs, attendance_status, attendance_date, working_hours=None, late_entry=False, early_exit=False, in_time=None, out_time=None, shift=None, overtime_type=None)` — creates/updates Attendance and links checkins back

1. `log_names = [x.name for x in logs]`; `employee = logs[0].employee`.
2. IF `attendance_status == "Skip"` THEN `skip_attendance_in_checkins(log_names)` (bulk set `skip_auto_attendance = 1` on all these checkins) and return `None` — no Attendance created.
3. IF `attendance_status` not in `("Present", "Absent", "Half Day")` THEN `frappe.throw(_("{0} is an invalid Attendance Status.").format(attendance_status))`. (Note: "On Leave" is explicitly documented as unsupported here.)
4. Create savepoint `"attendance_creation"`.
5. `attendance = create_or_update_attendance(employee, attendance_date, attendance_status, working_hours, shift, late_entry, early_exit, in_time, out_time, overtime_type)` (see below).
6. IF `attendance_status == "Absent"` THEN add a comment to the attendance: "Employee was marked Absent for not meeting the working hours threshold."
7. `update_attendance_in_checkins(log_names, attendance.name)` — bulk sets `attendance = <name>` on all these checkins (this is the field on `Employee Checkin` that links back to the created/updated Attendance).
8. Return the attendance doc.
9. IF any `frappe.ValidationError` raised during steps 4-7 THEN: `handle_attendance_exception(log_names, str(error))` — rolls back to the savepoint, clears queued messages, calls `skip_attendance_in_checkins(log_names)` (mark all these logs as skip_auto_attendance=1) and `add_comment_in_checkins(log_names, error_message)` (adds a Comment on each Employee Checkin explaining why auto-attendance was skipped); return `None`.

### `create_or_update_attendance(employee, attendance_date, attendance_status, working_hours=None, shift=None, late_entry=False, early_exit=False, in_time=None, out_time=None, overtime_type=None)`

1. `existing = get_existing_half_day_attendance(employee, attendance_date)` — looks for an Attendance with `employee`, `attendance_date`, `status = "Half Day"`, `modify_half_day_status = 1`, `leave_type` set (i.e. a Half Day created because of a Leave Application's `half_day_date`, whose "other half" status is still pending resolution from checkins).
2. IF such a record exists:
   - Direct `frappe.db.set_value("Attendance", name, {working_hours, shift, late_entry, early_exit, in_time, out_time, half_day_status: "Absent" if attendance_status=="Absent" else "Present", modify_half_day_status: 0})` — no controller validation re-run, doc stays submitted.
   - Return the reloaded Attendance doc.
3. ELSE (no existing half-day placeholder):
   - Build a new `Attendance` doc: `employee, attendance_date, status=attendance_status, working_hours, shift, late_entry, early_exit, in_time, out_time`.
   - IF `overtime_type` is set AND `attendance_status == "Present"` THEN: `overtime_data = get_overtime_data(shift, working_hours)`; IF non-empty THEN set `overtime_type`, `standard_working_hours = overtime_data.standard_working_hours`, `actual_overtime_duration = overtime_data.actual_overtime_duration` on the new doc.
   - `attendance.save()` then `attendance.submit()`.
   - Return the new Attendance doc.

### `get_overtime_data(shift_name, working_hours)`

1. Fetch `allow_overtime, start_time, end_time` from the `Shift Type`. IF `allow_overtime` is falsy (or shift not found) THEN return `{}`.
2. `standard_working_hours = calculate_time_difference(start_time, end_time)`.
3. IF `working_hours > standard_working_hours` THEN return `{standard_working_hours, actual_overtime_duration: working_hours - standard_working_hours}`.
4. ELSE return `{}` (no overtime recorded).

`calculate_time_difference(start_time, end_time)`: IF `end_time < start_time` THEN `end_time += 1 day` (handles overnight shifts); return `round(abs(start_time - end_time).total_seconds() / 3600, 2)`.

### Helper mutations

- `skip_attendance_in_checkins(log_names)`: bulk UPDATE `Employee Checkin SET skip_auto_attendance = 1 WHERE name IN log_names`.
- `update_attendance_in_checkins(log_names, attendance_id)`: bulk UPDATE `Employee Checkin SET attendance = attendance_id WHERE name IN log_names`. **This is the exact field/mechanism linking Employee Checkin rows back to the Attendance record they produced** — `Employee Checkin.attendance`.
- `add_comment_in_checkins(log_names, error_message)`: inserts one `Comment` doc per checkin (`reference_doctype="Employee Checkin"`) with the error text prefixed "Reason for skipping auto attendance:".

### `add_log_based_on_employee_field(...)` — whitelisted device/integration entry point

1. Validate `employee_field_value` and `timestamp` are provided; throw if not.
2. Validate `employee_fieldname` is one of `{"name", "employee", "attendance_device_id"}`; throw with the allowed set otherwise.
3. Look up Employee by that field's value; throw `"No Employee found..."` if none.
4. Build a new `Employee Checkin` (`employee`, `employee_name`, `time=timestamp`, `device_id`, `log_type`, `latitude`, `longitude`, `skip_auto_attendance` coerced from truthy int/str/bool) and `insert()` it (runs full `validate()` pipeline above). Returns the new doc.

### `bulk_fetch_shift(checkins)` — whitelisted

For each checkin name in the list: load the doc, call `fetch_shift()`, set `flags.ignore_validate = True`, and `save()` (persists the fetched shift fields without re-running `validate()`).

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| before_validate | Normalize `time` (strip microseconds) | none |
| validate | See Validation Rules above | reads Employee, HR Settings, Shift Assignment, Shift Location |
| after_insert (hooks.py, telemetry) | `hrms.telemetry.on_employee_checkin` | telemetry only, no functional doctype effect |

No `on_update`/`on_submit`/`on_cancel` on the controller itself (not submittable). The doctype-level side effects on Attendance happen via the module-level functions (`mark_attendance_and_link_log` etc.) invoked externally from `Shift Type._process`, not from this doctype's own lifecycle hooks.

## Whitelisted / API Methods

| Method name | HTTP-equivalent purpose | Args | Returns | What it does |
|---|---|---|---|---|
| `set_geolocation` (instance) | Recompute `geolocation` GeoJSON from lat/long | none | none | See Validation step 5 |
| `fetch_shift` (instance) | Recompute shift-window fields for this checkin's time | none | none | See Business Logic |
| `add_log_based_on_employee_field` | Create a checkin from an external biometric/device integration | `employee_field_value, timestamp, device_id, log_type, skip_auto_attendance, employee_fieldname, latitude, longitude` | `Document` (the new checkin) | See Business Logic |
| `bulk_fetch_shift` | Re-resolve shift for many checkins at once (admin/UI bulk action) | `checkins: list[str]` | none | See Business Logic |

## Permissions

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| System Manager | yes | yes | yes | yes | n/a | n/a | n/a | yes | yes | import also; permlevel 0 |
| HR Manager | yes | yes | yes | yes | n/a | n/a | n/a | yes | yes | import also |
| HR User | yes | yes | yes | yes | n/a | n/a | n/a | yes | yes | import also |
| Employee | yes | yes | yes | yes | n/a | n/a | n/a | no | no | permlevel 0 |
| System Manager (permlevel 1) | yes | yes | n/a | yes | n/a | n/a | n/a | yes | yes | governs `time` field edits after attendance link (permlevel 1 fields) |
| HR Manager (permlevel 1) | yes | yes | n/a | yes | n/a | n/a | n/a | yes | yes | same |
| HR User (permlevel 1) | yes | yes | n/a | yes | n/a | n/a | n/a | yes | yes | same |
| Employee (permlevel 1) | yes | no | n/a | no | n/a | n/a | n/a | no | no | read-only on permlevel-1 fields (i.e. `time`) once linked |

Not submittable, so Submit/Cancel/Amend are n/a.

## Scheduled Jobs Touching This Doctype

`hourly_long` -> `hrms.hr.doctype.shift_type.shift_type.process_auto_attendance_for_all_shifts` reads unconsumed Employee Checkin rows (`attendance` not set, `skip_auto_attendance=0`, `offshift=0`, within the shift's processing window) and, via `mark_attendance_and_link_log`, writes back `attendance` and (indirectly through `skip_attendance_in_checkins`) `skip_auto_attendance` on these rows. Full detail in `Shift Type.md`.

## Port Notes

- **`Employee Checkin.attendance` is the exact linking field** back to the `Attendance` record created by the auto-attendance pipeline — a port's Employee Checkin table needs a nullable FK to Attendance with this same semantics (set only after successful processing; cleared to null by `Attendance.on_cancel` -> `unlink_attendance_from_checkins`).
- **`time` becomes effectively immutable once `attendance` is linked** (`read_only_depends_on` client-side; `validate_time_change` server-side) — this must be enforced server-side in the port regardless of UI state.
- **The working-hours calculation algorithms (Case A/B above) are intricate stateful scans**, not simple aggregate queries — a straightforward "sum of IN/OUT pairs" port could easily diverge from source behavior on edge cases (odd number of logs, mixed/missing log_type values, `skip_auto_attendance` mid-sequence). Recommend porting `calculate_working_hours` as a literal step-by-step translation and unit-testing against `test_employee_checkin.py`'s cases.
- **Geolocation/radius check is opt-in site-wide** via `HR Settings.allow_geolocation_tracking` — a port needs an equivalent global settings flag gating both the mandatory lat/long requirement and the shift-location radius enforcement.
- **`bulk_fetch_shift` explicitly bypasses validation** (`flags.ignore_validate = True`) when re-saving — meaning it will NOT re-run duplicate-log, time-change, or distance checks; only `fetch_shift()`'s own field assignments happen. A port must replicate this "partial update without full validation" semantic precisely (e.g. a dedicated internal update path that skips those specific checks) rather than reusing the standard save/validate pipeline.

## Related Doctypes

- [[Employee Core Model]] — the checkin belongs to this employee.
- [[Shift Type]] — resolved via `fetch_shift()`; drives log-type requirements and auto-attendance processing.
- [[Shift Assignment]] — used to resolve the exact shift occurrence (with grace-period margins) and any assigned Shift Location.
- [[Shift Location]] — geolocation radius validation checks the checkin's coordinates against the assigned shift location.
- [[Attendance]] — `attendance` links back to the Attendance record this checkin was consumed into by the auto-attendance pipeline.
