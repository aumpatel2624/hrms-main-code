# Employee Attendance Tool

**Source:** `hrms/hr/doctype/employee_attendance_tool/employee_attendance_tool.json`, `employee_attendance_tool.py`, `employee_attendance_tool.js`
**Submittable:** no   **Tree:** no   **Naming:** none — `issingle: 1` (Single doctype, one row only) and `is_virtual: 1` (no underlying DB table; `db_insert`/`db_update`/`delete`/`save` are all no-ops on the controller)
**Module:** HR

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| date | Date | Date | — | no | "Today" | no | |
| shift | Shift | Link | [[Shift Type]] | conditionally (`mandatory_depends_on: filter_by_shift`) | — | no | |
| column_break_gmhs | (Column) | Column Break | — | — | — | — | |
| late_entry | Late Entry | Check | — | no | 0 | no | passed through to created Attendance records |
| early_exit | Early Exit | Check | — | no | 0 | no | passed through to created Attendance records |
| section_break_ackd | Get Employees (label) | Section Break | — | — | — | — | collapsible |
| company | Company | Link | Company | no | — | no | filter for employee fetch |
| branch | Branch | Link | Branch | no | — | no | filter |
| department | Department | Link | Department | no | — | no | filter |
| filter_by_shift | Filter by Shift | Check | — | no | 0 | no | |
| column_break_bhny | (Column) | Column Break | — | — | — | — | |
| employment_type | Employment Type | Link | [[Employment Type]] | no | — | no | filter |
| designation | Designation | Link | Designation | no | — | no | filter |
| employee_grade | Employee Grade | Link | [[Employee Grade]] | no | — | no | filter |
| get_employees | Get Employees | Button | — | — | — | — | client trigger to fetch employee lists |
| select_employees_section | Select Employees (label) | Section Break | — | — | — | — | collapsible |
| unmarked_employee_header | (HTML: "Unmarked Employees" heading) | HTML | — | — | — | — | |
| status | Status | Select | (blank)/Present/Absent/Half Day/Work From Home | no | — | no | in_list_view; applied to all "unmarked" employees selected for full-day marking |
| unmarked_employees_html | Unmarked Employees HTML | HTML | — | — | — | yes | client-rendered MultiCheck of unmarked employees |
| horizontal_break | (HTML: `<hr>`) | HTML | — | — | — | — | |
| half_day_marked_employee_header | (HTML: "Employees on Half Day" heading) | HTML | — | — | — | — | |
| half_day_status | Status for Other Half | Select | Present/Absent | no | — | no | applied to selected "half day marked" employees |
| half_marked_employees_html | Employees on Half Day HTML | HTML | — | — | — | — | client-rendered MultiCheck |
| marked_attendance_section | Marked Attendance (label) | Section Break | — | — | — | — | collapsible; `depends_on: date` |
| marked_attendance_html | Marked Attendance HTML | HTML | — | — | — | — | client-rendered read-only summary table |

## Child Tables

None.

## State Machine

Not submittable, not a normal persisted doctype (virtual single doctype used purely as a UI/RPC surface — `db_insert`, `db_update`, `delete`, `save` are all explicit no-ops). No state machine.

## Validation Rules (exact, in execution order)

No `validate()` method on the controller — this doctype has no persisted record to validate; all validation-like logic lives inside the whitelisted `mark_employee_attendance` function's implicit behavior (it does not explicitly validate inputs beyond what `Attendance.validate()` enforces when the created Attendance doc is inserted/submitted).

## Business Logic / Calculations

### `get_employees(date, department, branch, company, employment_type, designation, employee_grade, shift, filter_by_shift)` — whitelisted

1. Build Employee filter: `status="Active"`, `date_of_joining <= date`, plus any of `department, branch, company, employment_type, designation, grade` (mapped from `employee_grade`) that are provided.
2. `employee_list` = all matching Employees (`employee, employee_name`), ordered by name.
3. `attendance_list` = [[Attendance]] records for `attendance_date=date, docstatus=1, modify_half_day_status=0` (fields: employee, employee_name, status, shift, leave_type) — i.e. "fully resolved" marked attendance.
4. `half_day_attendance_list` = Attendance records for `attendance_date=date, docstatus=1, modify_half_day_status=1, leave_type is set` — i.e. Half Day records still pending resolution of the "other half".
5. `unmarked_attendance = _get_unmarked_attendance(employee_list, attendance_list + half_day_attendance_list)` — employees in `employee_list` whose `employee` id does not appear in either marked list.
6. IF `filter_by_shift` THEN `unmarked_attendance = _get_unmarked_attendance_with_shift(unmarked_attendance, shift, date)`:
   - Fetch employees with a [[Shift Assignment]] where `shift_type=shift, start_date <= date` (note: does NOT filter by `docstatus`/`status`/`end_date` — any assignment row, submitted or not, active or not, matches as long as its `start_date` is on/before the queried date).
   - Fetch employees whose `default_shift == shift`.
   - Keep only `unmarked_attendance` entries whose employee is in the union of those two sets.
7. Return `{"marked": attendance_list, "half_day_marked": half_day_attendance_list, "unmarked": unmarked_attendance}`.

### `mark_employee_attendance(employee_list, status, date, leave_type=None, company=None, late_entry=None, early_exit=None, shift=None, mark_half_day=False, half_day_status=None, half_day_employee_list=None)` — whitelisted

**Full-day marking loop:**
1. Parse `employee_list` from JSON string if needed.
2. FOR EACH `employee` in `employee_list`:
   a. `leave_type = None` — **the incoming `leave_type` parameter is unconditionally overwritten with `None` at the top of the loop body.**
   b. `if status == "On Leave" and leave_type:` — since `leave_type` was just set to `None` on the immediately preceding line, this condition is always `False`; the body `leave_type = leave_type` never has any effect other than being unreachable dead code.
   c. Build and insert+submit a new `Attendance` doc: `employee, attendance_date=date, status, leave_type (always None per above), late_entry, early_exit, shift`.

**Half-day resolution (runs after the full-day loop, only if `mark_half_day` is truthy):**
3. `frappe.has_permission("Attendance", "write", throw=True)`.
4. Parse `half_day_employee_list` from JSON string if needed.
5. Fetch existing submitted Attendance for these employees on `date` (`employee IN half_day_employee_list, attendance_date=date, docstatus=1`), building a `{employee: attendance_name}` map.
6. FOR EACH `employee` in `half_day_employee_list`:
   - IF a matching attendance exists: check write permission on that specific record, then bulk-UPDATE `Attendance SET half_day_status=<half_day_status>, shift=<shift>, late_entry=<late_entry or 0>, early_exit=<early_exit or 0>, modify_half_day_status=0 WHERE employee=employee AND attendance_date=date AND docstatus=1` — direct query-builder UPDATE, bypassing controller validation entirely.

## Lifecycle Hooks (exact)

Not applicable — virtual single doctype with no persisted lifecycle. `save()`, `db_insert()`, `db_update()`, `delete()` are all explicit no-ops on the controller; `get_list`, `get_count`, `get_stats` static methods are also no-ops (this doctype is never listed/queried as a record set).

## Whitelisted / API Methods

| Method name | HTTP-equivalent purpose | Args | Returns | What it does |
|---|---|---|---|---|
| `get_employees` | Fetch marked/half-day-marked/unmarked employee lists for a given date+filters | `date, department, branch, company, employment_type, designation, employee_grade, shift, filter_by_shift` | `dict` with `marked`, `half_day_marked`, `unmarked` lists | See Business Logic above |
| `mark_employee_attendance` | Bulk-create Attendance for a set of employees, and/or bulk-resolve Half Day status for another set | `employee_list, status, date, leave_type, company, late_entry, early_exit, shift, mark_half_day, half_day_status, half_day_employee_list` | none | See Business Logic above |

## Permissions

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| HR Manager | yes | yes | yes | n/a | n/a | n/a | n/a | n/a | n/a | only role with any permission; not submittable |

## Scheduled Jobs Touching This Doctype

None.

## Port Notes

- **KNOWN BUG IN SOURCE — `leave_type` is cleared/reset before being checked/used, making the parameter a no-op.** Exact code sequence in `mark_employee_attendance` (`hrms/hr/doctype/employee_attendance_tool/employee_attendance_tool.py`):
  ```python
  for employee in employee_list:
      leave_type = None
      if status == "On Leave" and leave_type:
          leave_type = leave_type
      attendance = frappe.get_doc(
          dict(
              doctype="Attendance",
              employee=employee,
              attendance_date=getdate(date),
              status=status,
              leave_type=leave_type,
              late_entry=late_entry,
              early_exit=early_exit,
              shift=shift,
          )
      )
  ```
  `leave_type` is unconditionally set to `None` as the very first statement in the loop body, so the subsequent `if status == "On Leave" and leave_type:` check can never be true (it always evaluates against the just-assigned `None`), and the created `Attendance.leave_type` is always `None` regardless of what the caller passed in for `leave_type`. This means the "On Leave" status can currently never be assigned a leave type through this tool. **This is a known bug in source — decide whether to reproduce or fix in the port.** Reproducing it faithfully means every Attendance created via this tool with `status="On Leave"` gets `leave_type=None` (which will likely then fail/warn downstream in `Attendance.check_leave_record`, since that method treats a leave-less "On Leave" status as needing a real Leave Application match); fixing it would mean using the caller-supplied `leave_type` parameter directly without the reset. Flag this decision explicitly to the product owner rather than silently choosing one.
- **This is a "virtual" single doctype used purely as an interactive tool/RPC surface**, not a persisted record — a port does not need a database table for it at all; the two whitelisted functions can be ported as plain application-service/controller endpoints without any backing entity.
- **Half-day resolution bypasses Attendance's own `validate()`** (direct SQL UPDATE via query builder) — same caveat as noted in `Attendance Request.md`: any business rules enforced in `Attendance.validate()` do NOT re-run for this path.
- **`_get_unmarked_attendance_with_shift`'s Shift Assignment query has no `docstatus`/`status`/`end_date` filter** — this could surface employees whose Shift Assignment is a Draft, Cancelled, Inactive, or already-ended record as if they were currently assigned to that shift, purely because `start_date <= date`. This looks like a likely oversight relative to how shift-assignment filtering is done elsewhere in this module (e.g. `Shift Type.get_assigned_employees` explicitly filters `docstatus=1, status=Active`). Flag as a "missing check you'd expect but don't find" per spec ground rules — do not silently add the filter; note it as a Port Notes callout for product/dev sign-off.

## Related Doctypes

- [[Attendance]] — this tool bulk-creates and bulk-resolves Attendance records.
- [[Shift Assignment]] — consulted to filter unmarked employees by shift.
- [[Shift Type]] — `shift` field scopes employee fetch and marking by shift.
- [[Employment Type]] — optional employee filter.
- [[Employee Grade]] — optional employee filter (`employee_grade` -> Employee's `grade`).
