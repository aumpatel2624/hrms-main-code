# Shift Assignment Tool

**Source:** `hrms/hr/doctype/shift_assignment_tool/shift_assignment_tool.json`, `shift_assignment_tool.py`, `shift_assignment_tool.js`
**Submittable:** no   **Tree:** no   **Naming:** none — `issingle: 1` (Single doctype; one persisted row acts as a stateful UI scratchpad), `hide_toolbar: 1`
**Module:** HR

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| action | Action | Select | Assign Shift / Assign Shift Schedule / Process Shift Requests | yes | Assign Shift | no | in_list_view; drives which of the other fields are shown/mandatory |
| column_break_dnmy | (Column) | Column Break | — | — | — | — | |
| company | Company | Link | Company | yes | — | no | in_list_view |
| shift_assignment_details_section | Shift Assignment Details | Section Break | — | — | — | — | `depends_on: eval:doc.action === "Assign Shift" || doc.action === "Assign Shift Schedule"` |
| shift_type | Shift Type | Link | [[Shift Type]] | conditionally (`mandatory_depends_on` action=="Assign Shift") | — | no | in_list_view |
| shift_schedule | Shift Schedule | Link | [[Shift Schedule]] | conditionally (`mandatory_depends_on` action=="Assign Shift Schedule") | — | no | `depends_on` same condition |
| shift_location | Shift Location | Link | [[Shift Location]] | no | — | no | applies to both Assign Shift and Assign Shift Schedule actions |
| status | Status | Select | Active/Inactive | no | Active | no | description: "When set to 'Inactive', employees with conflicting active shifts will not be excluded." |
| column_break_ybmd | (Column) | Column Break | — | — | — | — | |
| start_date | Start Date | Date | — | conditionally (mandatory for Assign Shift / Assign Shift Schedule) | — | no | in_list_view |
| end_date | End Date | Date | — | no | — | no | |
| shift_request_filters_section | Shift Request Filters | Section Break | — | — | — | — | `depends_on: eval:doc.action === "Process Shift Requests"` |
| shift_type_filter | Shift Type | Link | [[Shift Type]] | no | — | no | filters the Shift Request list for "Process Shift Requests" |
| approver | Approver | Link | User | no | — | no | filters the Shift Request list |
| column_break_gwjg | (Column) | Column Break | — | — | — | — | |
| from_date | From Date | Date | — | no | — | no | description: "Shift Requests ending before this date will be excluded." |
| to_date | To Date | Date | — | no | — | no | description: "Shift Requests starting after this date will be excluded." |
| quick_filters_section | Quick Filters | Section Break | — | — | — | — | collapsible |
| branch | Branch | Link | Branch | no | — | no | quick filter for employee fetch |
| department | Department | Link | Department | no | — | no | quick filter |
| designation | Designation | Link | Designation | no | — | no | quick filter |
| column_break_zius | (Column) | Column Break | — | — | — | — | |
| grade | Employee Grade | Link | [[Employee Grade]] | no | — | no | quick filter |
| employment_type | Employment Type | Link | [[Employment Type]] | no | — | no | quick filter |
| advanced_filters_section | Advanced Filters | Section Break | — | — | — | — | collapsible |
| filter_list | Filter List | HTML | — | — | — | — | client-rendered filter-group builder (`hrms.setup_employee_filter_group`) |
| select_rows_section | Select Employees | Section Break | — | — | — | — | |
| employees_html | Employees HTML | HTML | — | — | — | — | client-rendered selectable datatable |

## Child Tables

None.

## State Machine

Not submittable, single doctype — no docstatus workflow. `action` behaves as a UI mode selector (not a persisted lifecycle state per se, though it is stored on the single row).

## Validation Rules (exact, in execution order)

No `validate()` override on the controller. Validation happens inline inside the whitelisted RPC methods:
- `bulk_assign`: `validate_bulk_tool_fields(self, mandatory_fields, employees, "start_date", "end_date")` (source: `hrms.hr.utils.validate_bulk_tool_fields`):
  1. FOR EACH field in `mandatory_fields` (`["shift_type", "company", "start_date"]` for Assign Shift; `["shift_schedule", "company", "start_date"]` for Assign Shift Schedule): IF not set on `self` THEN `frappe.throw(_("{0} is required").format(label), title=_("Missing Field"))`.
  2. IF both `start_date` and `end_date` are set THEN `self.validate_from_to_dates("start_date", "end_date")`.
  3. IF `employees` list is empty THEN `frappe.throw(_("Please select at least one employee to perform this action."), title=_("No Employees Selected"))`.
  4. IF `action` is neither "Assign Shift" nor "Assign Shift Schedule" THEN `frappe.throw(_("Invalid Action"))` (checked in `bulk_assign` itself before calling `validate_bulk_tool_fields`).
- `bulk_process_shift_requests`: IF `shift_requests` list is empty THEN `frappe.throw(_("Please select at least one Shift Request to perform this action."), title=_("No Shift Requests Selected"))`.

## Business Logic / Calculations

### `get_employees(advanced_filters=None)` — whitelisted; dispatches by `action`

1. Build `filters` from the quick-filter fields (`company, branch, department, designation, grade, employment_type`) wherever set on `self`, plus any `advanced_filters` passed in.
2. IF `action == "Process Shift Requests"` THEN return `get_shift_requests(filters)`.
3. ELSE return `get_employees_for_assigning_shift(filters)`.

### `get_employees_for_assigning_shift(filters)`

1. Base query: Active Employees matching `filters`, with `date_of_joining <= start_date` AND (`relieving_date >= start_date` OR relieving_date unset).
2. IF `end_date` set: additionally require `relieving_date >= end_date` OR relieving_date unset.
3. `allow_multiple_shifts = HR Settings.allow_multiple_shift_assignments`.
4. IF `action == "Assign Shift Schedule"`: exclude employees already present in `get_query_for_employees_with_same_shift_schedule()` (see below).
5. ELIF `status == "Active"` (tool's own status field, meaning "exclude conflicts"): exclude employees already present in `get_query_for_employees_with_shifts()` (see below).
   - (If `status == "Inactive"`, no exclusion subquery is applied at all — per the field's description, this deliberately allows selecting employees who already have conflicting active shifts.)
6. Apply any additional Employee-doctype match conditions from `build_qb_match_conditions("Employee")` (ERPNext permission-query-condition framework — row-level Employee visibility rules).
7. Return the resulting employee rows (`employee, employee_name, branch, department, default_shift`).

### `get_query_for_employees_with_shifts()` — subquery of employees who already have a conflicting Shift Assignment

1. Distinct `employee` from Active, submitted [[Shift Assignment]]s where the date range overlaps `[start_date, end_date or open-ended]` (`end_date >= start_date` OR end_date unset; AND if `end_date` given, `start_date <= end_date`).
2. IF `allow_multiple_shifts` is enabled: further restrict this exclusion subquery to ONLY those existing assignments whose Shift Type timing actually overlaps the tool's selected `shift_type` (via `get_query_checking_overlapping_shift_timings`) — i.e. when multiple shifts are globally allowed, an employee is only excluded from the "assignable" list if their existing shift's time window would truly clash with the new one, not merely because they have *any* other active shift.

### `get_query_for_employees_with_same_shift_schedule()` — analogous exclusion for "Assign Shift Schedule" action

1. `days = Assignment Rule Day` rows where `parent = self.shift_schedule` (the days this new schedule would repeat on).
2. Distinct `employee` from enabled [[Shift Schedule Assignment]] rows whose linked `Shift Schedule`'s `repeat_on_days` includes ANY of `days` (i.e. any day-of-week overlap between the new schedule and an existing enabled schedule assignment for that employee).
3. IF `allow_multiple_shifts` enabled: further restrict via `get_query_checking_overlapping_shift_timings` comparing the new schedule's `shift_type` timing against the existing schedule's `shift_type` timing.

### `get_query_checking_overlapping_shift_timings(query, doctype, shift_type)` — shared overlap-timing filter builder

1. Fetch `start_time, end_time` of the target `shift_type`; if `end_time < start_time` (overnight), add 24 hours to `end_time` for comparison purposes.
2. Build a query-builder `CASE` expression for the compared doctype's own shift type: `end_time_case = IF end_time < start_time THEN end_time + 24h ELSE end_time`.
3. Join to `Shift Type` and filter `end_time_case >= shift_start AND start_time <= shift_end` — standard interval-overlap test performed at the SQL level (same conceptual test as `has_overlapping_timings` in `Shift Assignment.md`, just expressed as a joined WHERE clause instead of a Python function).

### `get_shift_requests(filters)` — for "Process Shift Requests" action

1. Inner-join Employee (matching `filters`) to [[Shift Request]] where `status == "Draft"`.
2. Optionally filter by `shift_type_filter`, `approver`, `from_date` (`to_date >= from_date` OR to_date unset), `to_date` (`from_date <= to_date`).
3. Apply Employee row-level permission conditions.
4. For each result row, prefix `employee_name` with `"{employee}: "` and attach a rendered link (`get_link_to_form`) as `shift_request`.

### `bulk_assign(employees)` — whitelisted

1. Determine `mandatory_fields`/`doctype` label by `action` (`["shift_type"]`/"Shift Assignments" for Assign Shift; `["shift_schedule"]`/"Shift Schedule Assignments" for Assign Shift Schedule; else throw `"Invalid Action"`).
2. Add `company, start_date` to mandatory fields; run `validate_bulk_tool_fields`.
3. IF `action == "Assign Shift"` AND `len(employees) <= 30` THEN run `_bulk_assign(employees)` synchronously and return its result.
4. ELSE enqueue `_bulk_assign` as a background job (`timeout=3000`) and msgprint that creation has been queued.

### `_bulk_assign(employees)`

FOR EACH employee (with a savepoint per iteration so one failure doesn't abort the batch):
- IF `action == "Assign Shift Schedule"`: `assignment = create_shift_schedule_assignment(employee)` (builds+saves a `Shift Schedule Assignment` with `enabled = 0 if end_date else 1`, `create_shifts_after = start_date`), THEN immediately `assignment.create_shifts(start_date, end_date)` — i.e. bulk-assigning a schedule via this tool eagerly generates the first batch of Shift Assignments synchronously (does not wait for the scheduled job), using the tool's own `end_date` as the explicit upper bound if provided (overriding the 90-day default that `process_auto_shift_creation` would otherwise apply).
- ELSE (`action == "Assign Shift"`): `assignment = create_shift_assignment(employee, company, shift_type, start_date, end_date, status, shift_location)` (see below).
- On success: append `{doc: <link>, employee}` to `success`. On any `Exception`: rollback to savepoint, `frappe.log_error`, append `employee` to `failure`.
- Publish progress after each employee (`frappe.publish_progress`).
- After the loop: clear messages and `frappe.publish_realtime` a completion event (`completed_bulk_shift_assignment` or `completed_bulk_shift_schedule_assignment`) with `{success, failure}`, `after_commit=True`.

### `create_shift_assignment(employee, company, shift_type, start_date, end_date, status, shift_location=None, shift_schedule_assignment=None)` — module-level, shared with `Shift Schedule Assignment.create_individual_assignment`

1. Build a new `Shift Assignment` with all the given fields.
2. `assignment.save()` then `assignment.submit()` (full validation pipeline of `Shift Assignment.validate()` runs, including overlap checks — see `Shift Assignment.md`).
3. Return the assignment doc.

### `bulk_process_shift_requests(shift_requests, status)` — whitelisted

1. IF `shift_requests` empty THEN throw.
2. IF `len(shift_requests) <= 30` THEN run `_bulk_process_shift_requests` synchronously; ELSE enqueue as background job and msgprint queued.
3. `_bulk_process_shift_requests`: FOR EACH `{shift_request, employee}`: load the `Shift Request`, set `status`, `save()` then `submit()` (triggers `Shift Request.on_submit`, which for `status="Approved"` creates+submits a `Shift Assignment` — see `Shift Request.md`); on Exception log error and record failure; publish progress; finally `frappe.publish_realtime("completed_bulk_shift_request_processing", {success, failure, for_processing: True})`.

## Lifecycle Hooks (exact)

No `validate`/`on_update`/etc. controller overrides — this is a pure RPC/UI-tool doctype; all logic runs inside whitelisted methods invoked directly, not through standard document lifecycle events.

## Whitelisted / API Methods

| Method name | HTTP-equivalent purpose | Args | Returns | What it does |
|---|---|---|---|---|
| `get_employees` | Fetch the candidate employee/shift-request list for the current tool configuration | `advanced_filters` | `list[dict]` | See Business Logic above |
| `bulk_assign` | Create Shift Assignments or Shift Schedule Assignments for many employees at once | `employees: list` | none (sync) or queued job (msgprint) | See Business Logic above |
| `bulk_process_shift_requests` | Approve/Reject many Shift Requests at once | `shift_requests: list, status: str` | none (sync) or queued job (msgprint) | See Business Logic above |

## Permissions

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| HR User | yes | yes | yes | n/a | n/a | n/a | n/a | n/a | n/a | sole role with access; single doctype |

## Scheduled Jobs Touching This Doctype

None. (This tool's bulk actions are always user-triggered, either synchronously or via an ad-hoc enqueued background job — never a recurring `scheduler_events` entry.)

## Port Notes

- **The 30-employee/30-request synchronous-vs-background-job threshold is a hardcoded constant** in three places (`bulk_assign`'s `len(employees) <= 30`, `bulk_process_shift_requests`'s `len(shift_requests) <= 30`) — a port should name this constant explicitly and keep it consistent, or make it configurable, but should not silently pick a different threshold.
- **`get_query_for_employees_with_shifts`/`get_query_for_employees_with_same_shift_schedule`'s exclusion logic changes shape entirely based on the site-wide `HR Settings.allow_multiple_shift_assignments` toggle** — without it, ANY existing active shift (regardless of timing) excludes an employee from the assignable list; with it, only a *timing-overlapping* existing shift excludes them. A port must implement both branches, not just the timing-aware one, since disabling the setting is a valid, common configuration.
- **Bulk-assigning a Shift Schedule via this tool immediately calls `create_shifts` synchronously** (inside `_bulk_assign`, itself possibly already running as a background job for >30 employees) — meaning the port's initial Shift Assignment records for a new schedule are generated eagerly at assignment time, not solely by the deferred `process_auto_shift_creation` scheduler job; the two paths must produce assignments using the exact same `create_shifts` algorithm (see `Shift Schedule Assignment.md`) to avoid divergent behavior between "assign now via tool" and "let the schedule catch up via cron".
- **Per-item savepoint + continue-on-error semantics** for both bulk operations — a port's batch-job runner needs equivalent per-row transaction isolation (one employee/request's failure doesn't roll back or block the others), with a final success/failure summary surfaced back to the initiating user (source uses Frappe's realtime pub/sub for this; a port needs an equivalent async progress/notification channel).

## Related Doctypes

- [[Shift Type]] — `shift_type`/`shift_type_filter` select the shift to assign or the shift used to filter Shift Requests.
- [[Shift Schedule]] — `shift_schedule` selects the recurring schedule to bulk-assign.
- [[Shift Location]] — optional geofence location applied to bulk-created assignments.
- [[Shift Assignment]] — this tool bulk-creates these via `create_shift_assignment`.
- [[Shift Schedule Assignment]] — this tool bulk-creates these via `create_shift_schedule_assignment` for the "Assign Shift Schedule" action.
- [[Shift Request]] — this tool bulk-approves/rejects these via the "Process Shift Requests" action.
- [[Employee Grade]] / [[Employment Type]] — optional quick filters for the employee candidate list.
