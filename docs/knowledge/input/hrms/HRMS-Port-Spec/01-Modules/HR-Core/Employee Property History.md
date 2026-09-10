# Employee Property History

**Source:** `hrms/hr/doctype/employee_property_history/employee_property_history.json`, `employee_property_history.py`
**Submittable:** no   **Tree:** no   **Naming:** child table — no `autoname` (rows identified by system `name` = auto-generated hash, standard Frappe child-row naming)
**Module:** HR

## Schema

`istable: 1` (child table only, no standalone list view). `quick_entry: 1`, `sort_field: creation`, `sort_order: DESC`, `track_changes: 1`, `editable_grid: 1`.

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| property | Property | Data | — | No | — | Yes | In list view (grid column width 4). Holds a human-readable field label, e.g. "Department", "Designation", "Branch" — populated by the parent form's client script (Employee Promotion / Employee Transfer), not by this doctype's own controller. |
| current | Current | Data | — | No | — | Yes | In list view (grid column width 3). Snapshot of the field's value before the change. |
| new | New | Data | — | No | — | Yes | In list view (grid column width 3). The proposed/new value for the field. |
| fieldname | Field Name | Data | — | No | — | Yes | Hidden field. Holds the actual Employee fieldname (e.g. `department`, `designation`, `branch`) that `property` is the label for — this is the key consumed programmatically (see Business Logic below). |

All four fields are marked `read_only: 1` in the schema (they are populated by JS on the parent forms, not hand-edited by users, even though `editable_grid: 1` is set at the doctype level).

## Child Tables

None — this doctype has no Table fields of its own.

## State Machine

Not applicable (child table, no submit workflow, no status field).

## Validation Rules (exact, in execution order)

The controller class (`EmployeePropertyHistory`) has no methods beyond the auto-generated type stub — `pass` is the entire body. **No server-side validation exists on this doctype itself.** All meaning is derived from how parent documents (`Employee Promotion`, `Employee Transfer`) consume the rows.

## Business Logic / Calculations

This doctype has no calculations of its own. It functions purely as a generic "field change" record: `{fieldname, property (label), current (old value), new (new value)}`. It is used as the child table (`promotion_details` on `Employee Promotion`, `transfer_details` on `Employee Transfer`) that captures which Employee master fields should change, and to what value, as part of a promotion/transfer action.

Consumption logic lives in `hrms/hr/utils.py::update_employee_work_history(employee, details, date=None, cancel=False)` (called from `Employee Promotion.on_submit`/`on_cancel` and `Employee Transfer.on_submit`/`on_cancel`), reproduced here step by step since it is the only place these rows are interpreted:

1. IF `details` (the list of Employee Property History rows) is empty THEN return the employee doc unchanged.
2. IF the target `employee.internal_work_history` child table is empty AND this is not a cancel operation THEN append one new "Employee Internal Work History" row seeded from the *employee's current* values: `branch = employee.branch`, `designation = employee.designation`, `department = employee.department`, `from_date = employee.date_of_joining`. (This bootstraps history for employees who never had a work-history entry.)
3. Initialize an empty dict `internal_work_history = {}`.
4. FOR each row `item` in `details` (each Employee Property History row):
   a. Look up the Employee doctype's meta field for `item.fieldname`. IF the field does not exist on Employee THEN skip this row (`continue`).
   b. Compute `new_value = item.new` if not cancelling, else `item.current` (i.e. on cancel, the operation is reversed — the "current" value captured at submit time is restored).
   c. Format `new_value` according to the target field's fieldtype (via `get_formatted_value`) and set it on the in-memory `employee` object: `setattr(employee, item.fieldname, new_value)`.
   d. IF `item.fieldname` is one of `department`, `designation`, `branch` THEN record `internal_work_history[item.fieldname] = item.new` (always `item.new`, even during cancel bookkeeping of the dict — only the `setattr` above differs by cancel/not).
5. IF `internal_work_history` dict is non-empty AND this is not a cancel operation THEN set `internal_work_history["from_date"] = date` (the promotion/transfer effective date) and append it as a new row to `employee.internal_work_history`.
6. IF cancelling THEN call `delete_employee_work_history(details, employee, date)` — for each detail row, if `property == "Department"` and an existing `internal_work_history` row's `department` matches `item.new`, mark `department` for deletion (same pattern for `Designation`→`designation` and `Branch`→`branch`); also if `date` matches a row's `from_date`, add that to the delete filter. If any filters were built, directly `frappe.db.delete("Employee Internal Work History", filters)` and save the employee.
7. Call `update_to_date_in_work_history(employee, cancel)`:
   a. IF `employee.internal_work_history` is empty THEN return.
   b. FOR each row at index `idx` (skipping index 0 and rows without a `from_date`): if the previous row (`idx - 1`) has no `to_date` set, set it to `from_date - 1 day`.
   c. IF cancelling THEN clear `to_date` on the last row of `internal_work_history` (reopen it as the current position).
8. Return the mutated `employee` document (caller then `.save()`s it, and for Employee Promotion additionally sets `employee.ctc` to `revised_ctc` on submit or back to `current_ctc` on cancel).

Edge cases explicitly handled: empty `details` short-circuits; first-time bootstrap of `internal_work_history` when none exists; fields not present on Employee are silently skipped; cancel path reverses values using the row's `current` value and attempts to clean up the corresponding internal-work-history row(s).

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| (none on this doctype) | — | Rows are read (not hooked) by `Employee Promotion.on_submit`/`on_cancel` and `Employee Transfer.on_submit`/`on_cancel`, which call `update_employee_work_history()` — this mutates the parent `Employee` document's simple fields (whatever `fieldname` values are listed) and its `internal_work_history` child table (`Employee Internal Work History`, an ERPNext-core doctype not in this module's scope). |

## Whitelisted / API Methods

None.

## Permissions

`permissions: []` in the JSON — this is a pure child table with no independent permission list; access is governed entirely by the parent doctype's (`Employee Promotion`, `Employee Transfer`) permissions.

## Scheduled Jobs Touching This Doctype

None found in `hrms/hooks.py`.

## Related Doctypes

- [[Employee Promotion]] — parent via `promotion_details`; populates rows on submit and updates the linked Employee.
- [[Employee Transfer]] — parent via `transfer_details`; populates rows on submit and updates the linked Employee.
- [[Employee Core Model]] — rows record field-level changes applied back to the Employee master.

## Port Notes

- **Field population is client-side only.** Nothing in the available Python source populates `property`, `current`, `new`, or `fieldname` — that happens in the parent doctypes' `.js` client scripts (`employee_promotion.js`, `employee_transfer.js`), which are out of scope for this file (owned by `Employee Promotion`/`Employee Transfer` specs). A faithful port must replicate whatever comparison logic those scripts perform (diffing selected Employee fields against their current values) as a server-side or shared-library routine, since a new stack cannot rely on Frappe's client-form event model.
- **`Employee` doctype is not in this repository.** The base `Employee` doctype (and its `internal_work_history` child, `Employee Internal Work History`) lives in the separate ERPNext codebase (`erpnext.setup.doctype.employee.employee.Employee`), extended here via `EmployeeMaster(Employee)` in `hrms/overrides/employee_master.py`. This spec could not read ERPNext's own Employee controller (not present in this repo/environment); the exact rules for how Employee's own on-save logic touches `internal_work_history` beyond what `update_employee_work_history()` does are outside this repo's visibility. Treat `Employee Internal Work History` and the base `Employee` schema as external dependencies to be sourced from ERPNext when porting.
- **Frappe framework behaviors relied on implicitly** that must be built explicitly in a new stack: child-table auto `parent`/`parentfield`/`parenttype`/`idx` bookkeeping; `track_changes: 1` (Frappe's automatic version/audit trail — not custom code); default child-row ordering by `creation DESC` (`sort_field`/`sort_order`); `quick_entry` grid-add behavior (UI-only, no server implication).
- Despite `editable_grid: 1`, every field is `read_only: 1` — in a port, these columns should render as read-only in any grid UI representing this table, populated only by the promotion/transfer diff logic, never hand-typed.
