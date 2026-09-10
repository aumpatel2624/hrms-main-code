# Department Approver

**Source:** `hrms/hr/doctype/department_approver/department_approver.json`, `department_approver.py`
**Submittable:** no   **Tree:** no   **Naming:** `autoname: "hash"` (child-row `name` is a random Frappe hash; standard child-table naming)
**Module:** HR

## Schema

`istable: 1` (child table only). `editable_grid: 1`, `sort_field: creation`, `sort_order: DESC`. This doctype is used as the shape for **three distinct child-table fields on `Department`** (not owned by this module — Department itself is out of this agent's scope): `leave_approvers`, `expense_approvers`, and `shift_request_approver` (parentfield names, per the whitelisted method below).

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| approver | Approver | Link | User | Yes | — | No | In list view, width 200, `print_hide: 1`. `ignore_user_permissions: 1` — the Link field ignores any User Permission restrictions when resolving valid options, so any enabled User can be picked regardless of the current user's own User Permission scoping. |

## Child Tables

None — this doctype has no Table fields of its own; it *is* a child table.

## State Machine

Not applicable.

## Validation Rules (exact, in execution order)

The `DepartmentApprover` controller class has no methods beyond the auto-generated type stub — `pass` is the entire body. The only field-level constraint is `reqd: 1` on `approver` (framework-enforced "required" check).

## Business Logic / Calculations

None on the child-row controller itself. However, the module file defines one whitelisted helper function, `get_approvers`, that is the actual business logic consumer of this doctype (used as the search/query source for approver-selection dropdowns on `Leave Application`, `Expense Claim`, and `Shift Request`). See Whitelisted / API Methods below for the exact algorithm.

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| (none) | — | None on this doctype's own controller. Rows are read by the `get_approvers` whitelisted query method (module-level, not a doc event) when populating approver-selection link fields on `Leave Application`, `Expense Claim`, and `Shift Request`. |

## Whitelisted / API Methods

| Method name | HTTP-equivalent purpose | Args | Returns | What it does |
|---|---|---|---|---|
| `get_approvers` (decorated `@frappe.whitelist()` and `@frappe.validate_and_sanitize_search_inputs`) | Link-field "search"/autocomplete query source (Frappe's standard `doctype`/`txt`/`searchfield`/`start`/`page_len`/`filters` query signature) for populating an Approver picker on Leave Application / Expense Claim / Shift Request forms | `doctype: str, txt: str, searchfield: str, start: int, page_len: int, filters: dict` — `filters` must include `employee`; may include `department` and `doctype` (the *calling* transaction's doctype, distinct from the outer `doctype` param) | A `set` of tuples, each `(user_name, first_name, last_name)` — deduplicated candidate approvers | Full algorithm, in exact execution order: |

`get_approvers` algorithm:
1. IF `filters.get("employee")` is falsy THEN `frappe.throw(_("Please select Employee first."))`.
2. Fetch the Employee's `employee_name`, `department`, `leave_approver`, `expense_approver`, `shift_request_approver` via `frappe.get_value(...)`.
3. Determine `employee_department = filters.get("department") or employee.department`.
4. IF `employee_department` is set THEN fetch that Department's `lft`/`rgt` (nested-set boundaries) via `frappe.db.get_value("Department", {"name": employee_department}, ["lft", "rgt"])`.
5. IF department details were found THEN query all Departments where `lft <= department_details.lft AND rgt >= department_details.rgt AND disabled == 0`, ordered by `lft DESC` — this yields the employee's department plus every ancestor department up the tree (nested-set "is ancestor of or self" query), ordered from most-specific (deepest) to least-specific.
6. IF the calling `filters.get("doctype") == "Leave Application"` AND `employee.leave_approver` is set THEN look up that User (must be `enabled: 1`); if found, append `(name, first_name, last_name)` to the `approvers` list.
7. IF the calling `filters.get("doctype") == "Expense Claim"` AND `employee.expense_approver` is set THEN same lookup/append pattern using `employee.expense_approver`.
8. IF the calling `filters.get("doctype") == "Shift Request"` AND `employee.shift_request_approver` is set THEN same lookup/append pattern using `employee.shift_request_approver`.
9. Map the calling doctype to the Department child-table `parentfield` and a human field label:
   - `"Leave Application"` → `parentfield = "leave_approvers"`, `field_name = "Leave Approver"`
   - `"Expense Claim"` → `parentfield = "expense_approvers"`, `field_name = "Expense Approver"`
   - `"Shift Request"` → `parentfield = "shift_request_approver"`, `field_name = "Shift Request Approver"`
   - (No `else` branch — an unrecognized calling doctype leaves `parentfield`/`field_name` unset, which would raise a `NameError` at step 11 if `department_list` is also empty and step 10's loop never assigns them; this is a latent bug in the source and is called out in Port Notes.)
10. IF `department_list` (from step 5) is non-empty THEN, for each department `d` in the list, query `Department Approver` rows joined to `User` where `DepartmentApprover.parent == d[0] AND DepartmentApprover.parentfield == parentfield AND User.name LIKE '%{txt}%' AND User.enabled == 1`, selecting `(User.name, User.first_name, User.last_name)`, and extend `approvers` with each match — iterating departments from most-specific to least-specific (per the `ORDER BY lft DESC` in step 5), so approvers from the employee's own department appear before approvers inherited from parent departments in the raw list (though the final return value is a `set`, so ordering is not guaranteed to the caller).
11. IF `len(approvers) == 0` THEN build and raise an error:
    - Base message: `_("Please set {0} for the Employee: {1}").format(frappe.bold(_(field_name)), get_link_to_form("Employee", filters.get("employee"), employee.employee_name))`
    - IF `department_list` is non-empty, append: `" " + _("or for the Employee's Department: {0}").format(get_link_to_form("Department", employee_department))`
    - Raise via `frappe.throw(error_msg, title=_("{0} Missing").format(_(field_name)))`.
12. Otherwise, return `set(tuple(approver) for approver in approvers)` — deduplicated set of 3-tuples.

## Permissions

`permissions: []` in the JSON — no independent permission list; access is governed entirely by the parent doctype's (`Department`) permissions. (Department itself is out of scope for this file.)

## Scheduled Jobs Touching This Doctype

None found in `hrms/hooks.py`.

## Related Doctypes

- [[Shift Request]] — one of the three parent tables (`shift_request_approver`) this child row shape is reused for, per source; owned by `Department` (out of scope).

## Port Notes

- **Cross-doctype relationship (noted per assignment, `Department` itself out of scope):** `Department Approver` rows are stored as three separate child tables on `Department` — `leave_approvers`, `expense_approvers`, `shift_request_approver` — each holding rows shaped by this same doctype (`approver: User`). A port should model this as one `department_approvers` table (or three) with a `parentfield`/`role_type` discriminator column (`leave_approvers` / `expense_approvers` / `shift_request_approver`), a `department_id` FK, and an `approver_user_id` FK — mirroring Frappe's generic parent/parentfield/parenttype child-table pattern.
- **Nested-set (`lft`/`rgt`) dependency**: the `get_approvers` algorithm depends on Department being modeled as a nested set (`is_tree`) with `lft`/`rgt` boundaries to find all ancestor departments in one range query. A relational port without nested-set columns must replace step 5 with a recursive parent-chain walk (e.g. a recursive CTE) to get the equivalent "self + all ancestors" department list.
- **Latent bug carried over from source, flagged not fixed**: in `get_approvers`, if `filters.get("doctype")` is not exactly one of `"Leave Application"`, `"Expense Claim"`, `"Shift Request"`, then `parentfield` and `field_name` are never assigned (step 9), and if `department_list` is non-empty the code at step 10 will raise `NameError: name 'parentfield' is not defined` (uncaught, not a `frappe.throw`) rather than a friendly validation message. A port should decide explicitly whether to preserve this behavior (uncaught error) or add a proper guard/validation for unsupported calling doctypes — the source has no explicit handling, so this is called out rather than silently "fixed."
- **`ignore_user_permissions: 1` on `approver`**: when porting User Permission-style row-level restriction, remember any equivalent restriction should be explicitly bypassed for the `approver` link, matching source behavior — any enabled User is selectable as an approver, not just ones the current user has permission to see.
- The `field_name` values (`"Leave Approver"`, `"Expense Approver"`, `"Shift Request Approver"`) passed through `_()` are also used as/aligned with the actual field labels on `Employee` (`leave_approver`, `expense_approver`, `shift_request_approver`) — those Employee fields are defined in ERPNext-extended Employee schema, not in this repo, and are referenced here only via `frappe.get_value("Employee", ..., [...])`.
- **Frappe framework behaviors relied on implicitly**: standard child-table `parent`/`parentfield`/`parenttype`/`idx` bookkeeping; `autoname: "hash"` for the child row's own internal `name` (irrelevant to business logic, only used for row identity); `editable_grid: 1` is UI-only.
