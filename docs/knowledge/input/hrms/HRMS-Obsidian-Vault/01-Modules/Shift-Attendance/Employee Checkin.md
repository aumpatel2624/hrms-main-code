---
type: doctype
module: Shift & Attendance
roles: [System Manager, HR Manager, HR User, Employee]
tags: [hrms, doctype]
---

# Employee Checkin

The raw punch/log record — a single IN or OUT event for an employee at a timestamp, typically pushed by a biometric device, mobile app, or web check-in, optionally with geolocation. It exists as the atomic evidence layer beneath Attendance: individual checkins are never business outcomes by themselves, they are consumed in batches by Shift Type's auto-attendance job (or manual review) to compute working hours and ultimately mark Attendance.

## Key Fields

| Field | Type | Purpose |
|---|---|---|
| `employee` | Link | Whose checkin this is |
| `time` | Datetime | The punch timestamp (defaults to Now); becomes read-only once `attendance` is linked |
| `log_type` | Select | IN / OUT — required only when the shift's `determine_check_in_and_check_out` mode demands it |
| `device_id` | Data | Free-text device/location identifier |
| `latitude` / `longitude` / `geolocation` | Float/Geolocation | Captured location, validated against `Shift Location` radius if geolocation tracking is enabled |
| `shift`, `shift_start`, `shift_end`, `shift_actual_start`, `shift_actual_end` | Link/Datetime | Auto-fetched shift context for this timestamp (via `fetch_shift`) |
| `offshift` | Check (hidden) | Set when the timestamp doesn't fall inside any shift window — excluded from auto-attendance |
| `skip_auto_attendance` | Check | Manually or automatically (on error) excludes this log from being processed into Attendance |
| `attendance` | Link | Set once this log has been consumed into (and is linked from) an Attendance record |
| `overtime_type` | Link (hidden) | Copied from the resolved shift if overtime is allowed |

## Relationships

- [[Employee]] — the log's subject; must be Active.
- [[Shift Type]] — resolved automatically per timestamp via `get_actual_start_end_datetime_of_shift`; drives whether Log Type is mandatory.
- [[Shift Assignment]] — used indirectly (via shift-resolution helpers) and directly in `validate_distance_from_shift_location` to find the employee's `shift_location` for that period.
- [[Shift Location]] — checkin coordinates are validated to be within `checkin_radius` of the assignment's shift location.
- [[Attendance]] — many checkins are consumed into one Attendance record (`attendance` field); Attendance's cancel unlinks them back to unmarked.

## Logic — What Happens and Why

**`before_validate`**: normalizes `time` to whole seconds (drops microseconds) so duplicate-timestamp comparisons are exact.

**`validate()`**:
1. `validate_active_employee`.
2. `validate_duplicate_log` — throws if another checkin exists for the same employee, same `time`, same `log_type` — prevents double-punches from being recorded as two logs.
3. `validate_time_change` — if `attendance` is already linked and `time` has changed, throws and tells the user to cancel the Attendance first. This protects the auto-attendance calculation from being invalidated silently after the fact.
4. `fetch_shift()` (also whitelisted, callable standalone) — resolves the actual shift window covering this timestamp via `get_actual_start_end_datetime_of_shift`. If no shift is found, `shift` is cleared and `offshift` set (this log will never feed auto-attendance). If found and no `attendance` is linked yet, populates `shift`, `shift_actual_start/end`, `shift_start/end`, and `overtime_type`; also throws if the shift's `determine_check_in_and_check_out` is "Strictly based on Log Type" and no `log_type` was given (that mode can't function without it), unless `skip_auto_attendance` is set.
5. `set_geolocation()` — derives `geolocation` from lat/long.
6. `validate_distance_from_shift_location` — only runs if HR Settings' `allow_geolocation_tracking` is on. Requires lat/long to be present; looks up the employee's Shift Assignment for this shift with a `shift_location` set covering `time`; if the location has a positive `checkin_radius`, computes the great-circle distance and throws `CheckinRadiusExceededError` if outside radius. This is the enforcement point for on-site check-in policies.

**Whitelisted `add_log_based_on_employee_field`**: the integration entry point for external devices/APIs — looks the employee up by `name`, `employee`, or `attendance_device_id` and creates a checkin; this is how biometric hardware or third-party attendance devices typically push data in.

**Downstream module functions** (not doctype methods, but the real "how attendance gets marked" logic, invoked from `Shift Type.process_auto_attendance`):
- `mark_attendance_and_link_log` — given a batch of logs for one employee+shift, decides Present/Absent/Half Day/Skip, creates or updates the Attendance (`create_or_update_attendance`), and links the logs to it via `update_attendance_in_checkins`. On skip, calls `skip_attendance_in_checkins` to flag the logs so they aren't retried indefinitely.
- `create_or_update_attendance` — if an existing *Half Day* Attendance is still open for modification (`modify_half_day_status`), updates it in place (working hours, times, late/early flags, and flips `half_day_status` to Present/Absent based on the new status) rather than creating a duplicate; otherwise inserts+submits a new Attendance, attaching overtime data from `get_overtime_data` when the shift allows overtime and hours exceed the standard.
- `calculate_working_hours` — computes total hours from a chronological log list under either check-in/out mode (`Alternating` vs `Strictly based on Log Type`) and either working-hours calculation mode (`First/Last` vs `Every Valid Pair`).
- On any `ValidationError` during this pipeline (`handle_attendance_exception`), the DB transaction is rolled back to the `attendance_creation` savepoint, the logs are flagged `skip_auto_attendance`, and the error is recorded as a comment on each log — so a bad batch doesn't silently vanish, it's visible and won't be retried.

## Roles & Permissions

| Role | Can Do | Notes |
|---|---|---|
| [[System Manager]] | Full CRUD (incl. permlevel-1 fields) | permlevel 1 covers a small set of fields (visible in the dashboard/list but write restricted at that level to elevated roles). |
| [[HR Manager]] | Full CRUD (incl. permlevel-1 fields) | |
| [[HR User]] | Full CRUD (incl. permlevel-1 fields) | |
| [[Employee]] | Create/Read/Write/Delete (base level); Read only at permlevel 1 | Employees can log their own checkins but cannot write the permlevel-1 fields — not enforced further in code beyond the standard field-permission mechanism as to *which* fields sit at permlevel 1 (defined in the JSON, not filtered per-employee in Python). |

## Mermaid: State/Flow

```mermaid
flowchart TD
    A[Employee Checkin created\n(device, app, or manual)] --> B[validate: dedupe, fetch_shift,\ngeofence check]
    B --> C{Falls inside\na shift window?}
    C -- No --> D[offshift = 1\nexcluded from auto-attendance]
    C -- Yes --> E[shift/shift_start/shift_end set]
    E --> F[Shift Type.process_auto_attendance\ngroups logs by employee+shift]
    F --> G{Working hours vs\nthresholds}
    G -- below absent threshold --> H[Attendance: Absent]
    G -- below half-day threshold --> I[Attendance: Half Day]
    G -- else --> J[Attendance: Present]
    H & I & J --> K[Checkin.attendance linked\nvia update_attendance_in_checkins]
    F -- ValidationError --> L[rollback, skip_auto_attendance=1,\nerror commented on checkin]
```
