# Training Result Employee

**Source:** `hrms/hr/doctype/training_result_employee/training_result_employee.json`, `training_result_employee.py`
**Submittable:** no (child table — `istable: 1`)   **Tree:** no   **Naming:** standard Frappe child-table row naming (no `autoname` rule)
**Module:** HR

Child doctype of `Training Result` (field `employees`).

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| employee | Employee | Link | [[Employee Core Model|Employee]] | No (not `reqd`) | — | No | shown in list view (grid column) |
| column_break_2 | — | Column Break | — | — | — | — | layout only |
| employee_name | Employee Name | Read Only | — | No | — | Yes | `fetch_from: employee.employee_name` |
| department | Department | Link | Department | No | — | Yes | `fetch_from: employee.department` |
| section_break_5 | — | Section Break | — | — | — | — | layout only |
| hours | Hours | Float | — | No | — | No | `allow_on_submit`; `non_negative: 1` (value must be >= 0); shown in grid |
| grade | Grade | Data | — | No | — | No | `allow_on_submit`; shown in grid; free-text (not a Select — no fixed grade scale) |
| column_break_7 | — | Column Break | — | — | — | — | layout only |
| comments | Comments | Text | — | No | — | No | `allow_on_submit`; shown in grid |

## Child Tables

N/A — this is itself a child table (of `Training Result`). No child tables of its own.

## State Machine

No `status`/`workflow_state` field on this doctype. Docstatus follows the parent Training Result. `hours`, `grade`, `comments` are flagged `allow_on_submit`, meaning HR can continue editing these three fields even after the parent Training Result is submitted (standard Frappe permlevel-independent "editable after submit" mechanism) — `employee`/`employee_name`/`department` are NOT `allow_on_submit`, so those become locked once the parent is submitted.

## Validation Rules (exact, in execution order)

None beyond the schema-declared `non_negative: 1` on `hours` (framework-enforced: Frappe rejects/clamps a negative Float when that flag is set — exact enforcement behavior, whether it's a hard `frappe.throw` or a silent floor-at-0 correction, is a generic framework mechanism, not custom code in this repo; treat as "hours must be >= 0, enforce at the field level"). `training_result_employee.py`'s class body is `pass` — no custom `validate`.

## Business Logic / Calculations

None. No aggregation, grading formula, or pass/fail computation is derived from `hours`/`grade`/`comments` anywhere in this doctype or its parent's controller — these are purely free-form HR-entered fields per attendee.

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| (none — controller is `pass`) | — | — |

External writes into this table happen only via the parent `Training Result`'s own controller/UI (population from `Training Event`'s attendee list via the `get_employees` whitelisted method — see `Training Result.md`), and via `Training Result.on_submit()` reading these rows' `employee` value to match/update the corresponding `Training Event Employee` row's `status`. This doctype's own rows are never written to by that method — only read.

## Whitelisted / API Methods

None.

## Permissions

`permissions: []` — governed entirely by the parent `Training Result` doctype's permissions.

## Scheduled Jobs Touching This Doctype

None.

## Related Doctypes

- [[Employee Core Model|Employee]] — via `employee`: shown in list view (grid column)

## Port Notes

- Same fetch-from snapshot caveat as `Training Event Employee`: `employee_name` and `department` are populated at row-save time from the linked Employee and are not live joins; a port must decide whether to snapshot (matching current behavior) or live-join (a behavior change) and should default to snapshot for parity.
- `hours` has `non_negative: 1` — in a new stack this should be a `CHECK (hours >= 0)` constraint or equivalent application-level validation, since Frappe enforces this as a generic field-type behavior, not code visible in this doctype's `.py`.
- `grade` being free-text (Data) rather than a fixed Select/enum means no grading-scale validation exists anywhere in source — do not invent one (e.g. don't assume "A/B/C/Pass/Fail" as an enum; any string is accepted).
- `allow_on_submit` on `hours`/`grade`/`comments` needs an explicit "field-level submit-lock" mechanism in a port framework that doesn't have Frappe's per-field permlevel/allow_on_submit primitive — i.e., after the parent Training Result is submitted, application code must specifically permit updates to only these three columns on this child table's rows and reject changes to `employee` (and its dependents `employee_name`/`department`).
