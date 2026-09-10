# Payroll Employee Detail

**Source:** `hrms/payroll/doctype/payroll_employee_detail/payroll_employee_detail.json` (no `.py` controller beyond the auto-generated base `Document` class; no `.js`)
**Submittable:** no   **Tree:** no   **Naming:** child table — no independent naming; rows are identified by the framework-generated `name` (hash) within the parent's `employees` table
**Module:** Payroll

Child table of `Payroll Entry` (fieldname `employees`, options `Payroll Employee Detail`). `istable: 1`, `quick_entry: 1`, `read_only: 1` (grid is read-only in the standard UI — rows are populated programmatically via `Payroll Entry.fill_employee_details()`, not typed in by hand), `track_changes: 1`.

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| employee | Employee | Link | [[Employee Core Model]] | No (not `reqd` in JSON, but always populated by `fill_employee_details`) | — | No | `columns: 2`, in_list_view |
| employee_name | Employee Name | Data | — | No | — | Yes | `fetch_from: employee.employee_name` |
| *(Column Break — `column_break_3`)* | | | | | | | |
| department | Department | Link | Department | No | — | Yes | `fetch_from: employee.department` |
| designation | Designation | Data | — | No | — | Yes | `fetch_from: employee.designation` |
| is_salary_withheld | Is Salary Withheld | Check | — | No | 0 | No | `columns: 2`; set to 1 by `Payroll Entry.update_employees_with_withheld_salaries()` when a matching `Salary Withholding Cycle` exists for the payroll period |

## Child Tables

N/A (this is itself a child doctype; it has no child tables of its own).

## State Machine

N/A — not submittable, no `status`/`workflow_state` field. Rows exist only as long as the parent `Payroll Entry.employees` table holds them; they are wholly replaced (not incrementally edited) every time `fill_employee_details()` runs (see `Payroll Entry.md`).

## Validation Rules (exact, in execution order)

None defined in this doctype (no `.py` controller logic beyond the framework default `Document` base class — no explicit `validate()` override exists in the source tree).

## Business Logic / Calculations

None owned by this doctype directly. All population and mutation logic lives in the parent `Payroll Entry` controller:
- Full-table replacement: `Payroll Entry.fill_employee_details()` sets `self.set("employees", employees)` from the employee-selection query result (see `Payroll Entry.md` Business Logic §1).
- `is_salary_withheld` flag: set per-row in `Payroll Entry.update_employees_with_withheld_salaries()`.

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| (none — no controller overrides) | — | — |

## Whitelisted / API Methods

None (child tables do not carry their own whitelisted methods in this codebase).

## Permissions

No `permissions` array entries in the JSON (`"permissions": []`) — access is governed entirely by the parent `Payroll Entry` doctype's permissions, per standard Frappe child-table behavior.

## Scheduled Jobs Touching This Doctype

None.

## Related Doctypes

- [[Payroll Entry]] — sole parent doctype; this child table is the `employees` field, wholesale-replaced by `fill_employee_details()`.
- [[Employee Core Model]] — the `employee` Link identifies the person; `employee_name`/`department`/`designation` are `fetch_from` snapshots of Employee fields.
- [[Salary Withholding Cycle]] — matched by payroll period to set `is_salary_withheld` on each row.

## Port Notes

- This is a pure "owned rows" child table in relational terms: it should be modeled as a table with a foreign key to the parent `Payroll Entry` (e.g. `payroll_entry_id`), not a many-to-many join table, since rows have no independent identity or lifecycle outside their parent.
- `read_only: 1` at the doctype level means the grid is not directly editable by end users in the standard desk UI — a port's UI layer should treat this table as system-managed/derived data, populated only via the "Get Employees" action, not a manual data-entry grid.
- `fetch_from` fields (`employee_name`, `department`, `designation`) are denormalized copies of `Employee` fields captured at the time the row was created; a port must decide whether to store these as a snapshot (as Frappe does — copied at insert/fetch time, not live-joined) or compute them via a live join. Frappe's actual behavior is a one-time copy triggered client-side when the `employee` field is set (and also explicitly populated server-side by `fill_employee_details`'s underlying query, which already selects `employee_name`, `department`, `designation` directly) — so the snapshot is taken at Payroll Entry "Get Employees" time and does **not** auto-update if the Employee record changes afterward.
- `track_changes: 1` on a child table only affects Frappe's document version history recording (captures diffs of child rows across parent doc saves) — a port needs an explicit audit/versioning mechanism to replicate this if audit history parity is required; it does not happen automatically in a generic RDBMS.
