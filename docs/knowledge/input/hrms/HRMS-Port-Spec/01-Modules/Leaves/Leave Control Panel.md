# Leave Control Panel

**Source:** `hrms/hr/doctype/leave_control_panel/leave_control_panel.json`, `leave_control_panel.py`, `leave_control_panel.js`
**Submittable:** no   **Tree:** no   **Naming:** none — `issingle: 1` (Single doctype; exactly one row exists in the system, no `name` autoname rule needed, stored as a key-value Singles table in Frappe)
**Module:** HR

This is a **bulk-action tool doctype** (Single), not a transactional record — it exists purely to hold form state for a "select many employees, allocate leave or assign a leave policy to all of them" UI flow, then dispatches N individual `Leave Allocation` or `Leave Policy Assignment` creations. `hide_toolbar: 1` and `allow_copy: 1` confirm it's a utility form, not a list-backed record type.

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| company | Company | Link | Company | conditionally | - | - | `mandatory_depends_on: eval:doc.dates_based_on == 'Leave Period'`; `remember_last_selected_value` |
| employment_type | Employment Type | Link | [[Employment Type]] | - | - | - | in_list_view (quick filter) |
| branch | Branch | Link | Branch | - | - | - | in_list_view (quick filter) |
| department | Department | Link | Department | - | - | - | in_list_view (quick filter) |
| designation | Designation | Link | Designation | - | - | - | in_list_view (quick filter) |
| employee_grade | Employee Grade | Link | [[Employee Grade]] | - | - | - | (quick filter, maps to Employee's `grade` field — see Business Logic) |
| *(Column Break)* | | | | | | | |
| from_date | From Date | Date | - | conditionally | Today | conditionally | `depends_on: eval:doc.dates_based_on != 'Joining Date'`; `mandatory_depends_on: eval:doc.dates_based_on == 'Custom Range'`; `read_only_depends_on: eval:doc.dates_based_on == 'Leave Period'` |
| to_date | To Date | Date | - | conditionally | - | conditionally | `mandatory_depends_on: eval:doc.dates_based_on != 'Leave Period'`; `read_only_depends_on: eval:doc.dates_based_on == 'Leave Period'` |
| leave_policy | Leave Policy | Link | [[Leave Policy]] | conditionally | - | - | `depends_on`/`mandatory_depends_on: eval:doc.allocate_based_on_leave_policy` |
| leave_type | Leave Type | Link | [[Leave Type]] | conditionally | - | - | `depends_on`/`mandatory_depends_on: eval:!doc.allocate_based_on_leave_policy` |
| carry_forward | Carry Forward | Check | - | - | 1 | - | description: "Add unused leaves from previous leave period's allocation to this allocation" |
| no_of_days | New Leaves Allocated (In Days) | Float | - | conditionally | - | - | `non_negative`; `depends_on`/`mandatory_depends_on: eval:!doc.allocate_based_on_leave_policy` |
| *(Section Break: "Select Employees")* | | | | | | | |
| *(Section Break: "Set Leave Details")* | | | | | | | |
| *(Column Break)* | | | | | | | |
| employees_html | Employees HTML | HTML | - | - | - | yes | client-rendered datatable of matching employees (see Business Logic / Port Notes) |
| dates_based_on | Dates Based On | Select | `Leave Period\nJoining Date\nCustom Range` | - | Leave Period | - | drives which of `leave_period`/`from_date`/`to_date` apply |
| leave_period | Leave Period | Link | [[Leave Period]] | conditionally | - | - | `depends_on`/`mandatory_depends_on: eval:doc.dates_based_on == 'Leave Period'` |
| allocate_based_on_leave_policy | Allocate Based On Leave Policy | Check | - | - | 1 | - | toggles the two mutually-exclusive allocation modes |
| *(Section Break: "Advanced Filters", collapsible)* | | | | | | | |
| filter_list | Filter List | HTML | - | - | - | - | client-rendered advanced filter-group builder (via `hrms.setup_employee_filter_group`) |
| *(Section Break: "Quick Filters", collapsible)* | | | | | | | |

## Child Tables

None (no Table fields).

## State Machine

Not applicable — `is_submittable` is not set (no docstatus lifecycle), and it is a Single doctype (no per-record create/delete lifecycle either; the one row is simply updated in place each time the form is used, though in practice `frm.disable_save()` is called client-side so the Single's own field values are typically not persisted between uses in the normal UI flow — see Port Notes).

## Validation Rules (exact, in execution order)

`validate_fields(employees)` — called at the start of the `allocate_leave` whitelisted method, in order:
1. Build `mandatory_fields` list based on `dates_based_on`:
   - IF `dates_based_on == "Leave Period"`: require `leave_period`.
   - ELIF `dates_based_on == "Joining Date"`: require `to_date`.
   - ELSE (`"Custom Range"`): require `from_date` AND `to_date`.
2. Extend `mandatory_fields` based on `allocate_based_on_leave_policy`:
   - IF true: require `leave_policy`.
   - ELSE: require `leave_type` AND `no_of_days`.
3. Call `validate_bulk_tool_fields(self, mandatory_fields, employees, "from_date", "to_date")` (shared utility, `hrms/hr/utils.py`):
   3a. FOR EACH field in `mandatory_fields`: IF `self.get(field)` is falsy THEN `frappe.throw(_("{0} is required").format(_(self.meta.get_label(field))), title=_("Missing Field"))`.
   3b. IF `self.get("from_date")` AND `self.get("to_date")` both set THEN `self.validate_from_to_dates("from_date", "to_date")` — standard Frappe mixin check (`to_date` must not be before `from_date`; exact message is framework-generated, not doctype-specific).
   3c. IF `not employees` (empty selection) THEN `frappe.throw(_("Please select at least one employee to perform this action."), title=_("No Employees Selected"))`.

No `validate()` controller method exists (no override) since this Single doctype is never itself "saved" in the traditional record sense during the bulk-allocate flow — all row-level validation for the resulting `Leave Allocation` / `Leave Policy Assignment` documents happens inside THEIR OWN `validate()` methods when each is created per-employee (see those doctypes' specs).

## Business Logic / Calculations

### `allocate_leave(employees)` (whitelisted) — dispatcher
```
1. self.validate_fields(employees)
2. IF self.allocate_based_on_leave_policy:
     RETURN self.create_leave_policy_assignments(employees)
   ELSE:
     RETURN self.create_leave_allocations(employees)
```

### `get_from_to_date()` — shared date-resolution helper
```
1. IF dates_based_on == "Joining Date": RETURN (None, self.to_date)
   (from_date is per-employee, resolved individually as each employee's own date_of_joining downstream)
2. ELIF dates_based_on == "Leave Period" AND self.leave_period:
     RETURN Leave Period.from_date, Leave Period.to_date for self.leave_period
3. ELSE ("Custom Range", or Leave Period not yet chosen):
     RETURN (self.from_date, self.to_date)
```

### `create_leave_allocations(employees)` (non-policy path)
```
1. (from_date, to_date) = self.get_from_to_date()
2. failure = [], success = []
3. FOR EACH employee IN employees:
   a. TRY (with a named DB savepoint "before_allocation_submission" per iteration, so one
      employee's failure rolls back only that employee's partial writes, not the whole batch):
      i.   allocation = frappe.new_doc("Leave Allocation")
      ii.  allocation.employee = employee
      iii. allocation.leave_type = self.leave_type
      iv.  allocation.from_date = from_date OR Employee.date_of_joining for this employee
           (per-employee fallback when dates_based_on == "Joining Date")
      v.   allocation.to_date = to_date
      vi.  allocation.carry_forward = cint(self.carry_forward)
      vii. allocation.new_leaves_allocated = flt(self.no_of_days)
      viii.allocation.insert()   -- triggers full Leave Allocation validate() chain; any throw
           there (overlap, LWP, over-allocation, etc.) is caught below
      ix.  allocation.submit()  -- triggers Leave Allocation on_submit chain (ledger entry, etc.)
      x.   success.append({doc: link_to_form(allocation), employee: employee})
   b. EXCEPT Exception:
      i.   frappe.db.rollback(save_point="before_allocation_submission")
      ii.  allocation.log_error(f"Leave Allocation failed for employee {employee}")
      iii. failure.append(employee)
4. frappe.clear_messages()
5. frappe.publish_realtime("completed_bulk_leave_allocation",
     message={success: success, failure: failure}, doctype="Bulk Salary Structure Assignment",
     after_commit=True)
   (Port Note: the `doctype` parameter passed here is literally the string "Bulk Salary Structure
   Assignment" — appears to be copy-pasted from an unrelated bulk-action feature; this value is
   used by Frappe's realtime plumbing as a permission/room-scoping hint, not a real reference to
   that doctype. Reproduce verbatim; do not "fix" to say "Leave Allocation" unless confirmed safe.)
```

### `create_leave_policy_assignments(employees)` (policy path)
```
1. (from_date, to_date) = self.get_from_to_date()
2. assignment_based_on = None IF dates_based_on == "Custom Range" ELSE dates_based_on
   (i.e. passes through "Leave Period" or "Joining Date" literally as the assignment's own
   `assignment_based_on` field, or None for Custom Range)
3. failure = [], success = []
4. FOR EACH employee IN employees:
   a. TRY (savepoint "before_assignment_submission" per iteration):
      i.   assignment = frappe.new_doc("Leave Policy Assignment")
      ii.  assignment.employee = employee
      iii. assignment.assignment_based_on = assignment_based_on
      iv.  assignment.leave_policy = self.leave_policy
      v.   assignment.effective_from = from_date OR Employee.date_of_joining for this employee
      vi.  assignment.effective_to = to_date
      vii. assignment.leave_period = self.get("leave_period")
      viii.assignment.carry_forward = self.carry_forward
      ix.  assignment.save()     -- triggers Leave Policy Assignment validate()
      x.   assignment.submit()  -- triggers its on_submit chain (creates Leave Allocation(s)
           per the policy's leave types — full mechanics owned by Leave Policy Assignment's
           own doctype spec, not detailed here)
      xi.  success.append({doc: link_to_form(assignment), employee: employee})
   b. EXCEPT Exception:
      i.   frappe.db.rollback(save_point="before_assignment_submission")
      ii.  assignment.log_error("Leave Policy Assignment failed")
      iii. failure.append(employee)
5. frappe.clear_messages()
6. frappe.publish_realtime("completed_bulk_leave_policy_assignment",
     message={success: success, failure: failure}, doctype="Bulk Salary Structure Assignment",
     after_commit=True)
```

### `get_employees(advanced_filters)` (whitelisted) — populates the selectable-employee list in the UI
```
1. (from_date, to_date) = self.get_from_to_date()
2. IF to_date AND (from_date OR dates_based_on == "Joining Date"):
     all_employees = frappe.get_list("Employee",
       filters = self.get_filters() + advanced_filters,
       fields = [name, employee, employee_name, company, department, date_of_joining])
     IF all_employees: RETURN self.get_employees_without_allocations(all_employees, from_date, to_date)
3. RETURN [] (otherwise — dates not yet resolvable)
```

### `get_filters()` — base Employee query filters
```
1. filter_fields = [company, employment_type, branch, department, designation, employee_grade]
2. filters = [["status", "=", "Active"]]
3. FOR EACH field in filter_fields:
     IF self.get(field) is set:
       IF field == "employee_grade": filters.append(["grade", "=", self.get(field)])
         (Port Note: form field name `employee_grade` maps to the Employee doctype's actual
          fieldname `grade` — not a 1:1 name match, must be preserved exactly)
       ELSE: filters.append([field, "=", self.get(field)])
4. RETURN filters
```

### `get_employees_without_allocations(all_employees, from_date, to_date)` — excludes employees who already have an overlapping allocation
```
1. Build a query over Leave Allocation JOIN Employee ON Allocation.employee = Employee.name,
   SELECT DISTINCT Employee.name,
   WHERE Allocation.docstatus = 1 AND Allocation.employee IN [all_employees' names]
2. IF dates_based_on == "Joining Date": from_date is overridden to reference Employee.date_of_joining
   as a correlated column (i.e. compare against each employee's own joining date, not a fixed date)
3. Add overlap condition:
   (Allocation.from_date BETWEEN from_date AND to_date
    OR Allocation.to_date BETWEEN from_date AND to_date)
   OR (Allocation.from_date <= from_date AND Allocation.from_date <= to_date
       AND Allocation.to_date >= from_date AND Allocation.to_date >= to_date)
   (Port Note: the second OR-branch as written is logically subsumed by / nearly redundant with
    "Allocation.from_date <= from_date AND Allocation.to_date >= to_date" i.e. the allocation
    fully contains the target range — reproduce the exact clause as written since it is what the
    source executes, even though it reads as a broader-than-necessary condition; do not simplify
    the boolean logic when porting, as subtly different edge-case results could occur with
    equal-boundary dates.)
4. IF allocate_based_on_leave_policy AND leave_policy set:
     leave_types = Leave Policy Detail.leave_type WHERE parent = leave_policy (all rows)
     query = query.where(Allocation.leave_type IN leave_types)
   ELIF NOT allocate_based_on_leave_policy AND leave_type set:
     query = query.where(Allocation.leave_type == leave_type)
5. employees_with_allocations = run query, pluck employee names
6. RETURN [employee for employee in all_employees if employee.name NOT IN employees_with_allocations]
```

### `get_latest_leave_period()` (whitelisted)
```
1. RETURN Leave Period.name WHERE is_active=1 AND company = (self.company OR erpnext.get_default_company()),
   ORDER BY from_date DESC, take first match (i.e. the most recently-starting active leave period
   for the company)
```

## [[Cross-Doctype Hooks (doc_events)|Lifecycle Hooks]] (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| (no validate/on_submit/on_cancel overrides — not submittable) | n/a | All effects happen inside the whitelisted `allocate_leave` method, which creates/submits `Leave Allocation` or `Leave Policy Assignment` documents per selected employee (see Business Logic above) |

## Whitelisted / API Methods

| Method name | HTTP-equivalent purpose | Args | Returns | What it does |
|---|---|---|---|---|
| `allocate_leave` | Bulk-create leave allocations or leave policy assignments for selected employees | `employees: list` | none directly (results delivered via `frappe.publish_realtime`) | Validates fields, then dispatches to `create_leave_allocations` or `create_leave_policy_assignments` per `allocate_based_on_leave_policy`. |
| `get_employees` | Populate the employee-selection datatable in the UI | `advanced_filters: list` | `list` of employee dicts (`name, employee, employee_name, company, department, date_of_joining`), filtered to exclude those with an existing overlapping allocation | See Business Logic above. |
| `get_latest_leave_period` | Auto-suggest the most relevant active leave period on form load | none | `str` (Leave Period name) or `None` | See Business Logic above. |

## Permissions

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| HR Manager | yes | yes | yes | - | - | - | - | - | - | no delete/submit/cancel/report/export/email/share/print keys present |
| HR User | yes | yes | yes | - | - | - | - | - | - | no delete/submit/cancel/report/export/email/share/print keys present |

## Scheduled Jobs Touching This Doctype

None found in `hrms/hooks.py` `scheduler_events`.

## Related Doctypes

- [[Employee Core Model]] — the employees selected/filtered for bulk allocation/assignment.
- [[Employment Type]] — `employment_type` Link field, a quick filter on the employee query.
- [[Employee Grade]] — `employee_grade` Link field, mapped to Employee's `grade` column for filtering.
- [[Leave Policy]] — `leave_policy` Link field, used when allocating based on a policy.
- [[Leave Type]] — `leave_type` Link field, used when allocating a flat number of days directly.
- [[Leave Period]] — `leave_period` Link field, one of the date-resolution modes.
- [[Leave Allocation]] — created and submitted per employee when not allocating via policy.
- [[Leave Policy Assignment]] — created and submitted per employee when allocating via policy.

## Port Notes

- **Single doctype semantics**: `issingle: 1` means Frappe stores this "doctype" as one row of key→value pairs in a shared `tabSingles` table rather than its own table with multiple named records — there is no `Leave Control Panel` "list," no `name` field, and no create/delete lifecycle for instances. Combined with `frm.disable_save()` in the client script (`refresh` handler), the form's field values are effectively ephemeral working state re-populated by `set_leave_details()`/`setup` on each load rather than a persisted business record. A port targeting a relational stack should model this as a stateless request DTO/form payload for the `allocate_leave`/`get_employees` API calls, NOT as a database table — persisting it as a row would be over-engineering relative to source behavior, since the Single's stored values (if any survive at all given `disable_save`) are not treated as meaningful state by the application logic.
- **`allocate_leave`, `create_leave_allocations`, `create_leave_policy_assignments` are effectively fire-and-forget from the client's perspective**: the whitelisted call itself returns nothing meaningful synchronously; success/failure per employee is communicated asynchronously via `frappe.publish_realtime` (a websocket-style push), consumed client-side by `hrms.handle_realtime_bulk_action_notification`. A port must design an equivalent async/notification mechanism (e.g. a job queue + websocket/SSE push, or simply return the `{success, failure}` payload synchronously in the HTTP response if a simpler stack is acceptable) since Frappe's realtime layer isn't a generic-stack primitive.
- **Per-employee savepoint/rollback pattern**: each employee's allocation/assignment attempt is wrapped in its own DB savepoint so that one employee's failure (e.g. `OverlapError` from `Leave Allocation.validate_allocation_overlap`) does not abort the whole batch — a port must implement equivalent per-item transaction isolation (e.g. a nested transaction or savepoint per loop iteration, or committing each successful item's Leave Allocation/Leave Policy Assignment individually) rather than wrapping the entire batch in one all-or-nothing transaction.
- **`doctype="Bulk Salary Structure Assignment"` passed to `publish_realtime` for both bulk-allocate flows**: as noted inline in Business Logic, this looks like a copy/paste artifact from another (payroll) bulk tool rather than a deliberate reference to this doctype's own actions. Document it as-is; do not silently rename it when porting unless confirmed with the target team, since it may be relied upon by shared client-side realtime-handling code (`hrms.handle_realtime_bulk_action_notification`) that filters/matches on this string.
- **`employee_grade` form field maps to Employee's `grade` column**: naming mismatch preserved from source (see `get_filters()` pseudocode) — a port's Employee entity should expose whatever its own grade-equivalent field is named, and the control panel's own "employee_grade" input name is purely a UI/DTO label, not a DB column name to replicate literally on the Employee table.
- **No dedicated validation for date range 100% correctness beyond `validate_from_to_dates`**: the mandatory-field/from-to date check in `validate_bulk_tool_fields` relies on Frappe's built-in `Document.validate_from_to_dates` mixin method for the from/to ordering check — its exact error message text was not traced into this file since it's a framework-level (not app-level) method; a port should implement an equivalent "to_date must not be before from_date" check but the exact wording should be sourced from Frappe framework code if byte-for-byte message parity is required.
- **`carry_forward` default is `1`** on this tool (contrast with `Leave Allocation.carry_forward` defaulting to `0`) — bulk allocation defaults to carrying forward unused leaves, an intentional UX difference worth preserving.
- **Client-side-only logic to flag**: `leave_control_panel.js`'s `set_leave_details()` (fired on `setup`) resets the entire form to a fixed default state (`dates_based_on: "Leave Period"`, `from_date: today`, `to_date: null`, `carry_forward: 1`, `allocate_based_on_leave_policy: 1`, `leave_type: null`, `no_of_days: 0`) every time the form loads, EXCEPT it preserves a pre-filled `leave_policy` if the form was opened with one already set (e.g. launched from within a Leave Policy's own "Bulk Assignment" action) — this pre-fill/reset behavior is UI-only convenience with no server-side equivalent needed, since the server's `validate_fields`/`get_from_to_date` operate purely on whatever values are submitted in the `allocate_leave`/`get_employees` calls regardless of how the client arrived at them.
- **Advanced filter builder (`filter_list` HTML field) is entirely client-side** (`hrms.setup_employee_filter_group(frm)`), producing the `advanced_filters` array passed into `get_employees`. The exact filter-group UI/logic is not part of this doctype's Python controller and was not traced further; a port needs only to accept an arbitrary list of Frappe-style filter conditions (`[fieldname, operator, value]` triples, per the shape seen in `get_filters()`) as the `advanced_filters` parameter — the specific UI for building that list is a separate concern.
