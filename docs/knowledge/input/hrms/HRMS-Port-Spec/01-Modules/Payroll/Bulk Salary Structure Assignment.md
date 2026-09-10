# Bulk Salary Structure Assignment

**Source:** `hrms/payroll/doctype/bulk_salary_structure_assignment/bulk_salary_structure_assignment.json`, `bulk_salary_structure_assignment.py`, `bulk_salary_structure_assignment.js`
**Submittable:** no   **Tree:** no   **Naming:** N/A — `issingle: 1` (this is a Frappe **Single** doctype: exactly one row ever exists in the database, used purely as a stateless "tool" form/screen, not a transactional record).
**Module:** Payroll

## Schema

Full field list, JSON field order:

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| *(set_assignment_details_section)* | Set Assignment Details | Section Break | - | - | - | - | groups the fields below |
| salary_structure | Salary Structure | Link | [[Salary Structure]] | Yes | - | - | `in_list_view` (irrelevant for a Single, but present in JSON) |
| from_date | From Date | Date | - | Yes | - | - | `in_list_view`; drives eligible-employee query, see Whitelisted Methods |
| income_tax_slab | Income Tax Slab | Link | [[Income Tax Slab]] | - | - | - | `depends_on: salary_structure` |
| *(column_break_rsep)* | - | Column Break | - | - | - | - | layout only |
| payroll_payable_account | Payroll Payable Account | Link | Account | - | - | - | `fetch_from: .default_payroll_payable_account` (malformed/empty link-path prefix in source JSON — see Port Notes; actual population is done client-side, see below) |
| branch | Branch | Link | Branch | - | - | - | quick filter |
| department | Department | Link | Department | - | - | - | quick filter |
| *(column_break_jcpq)* | - | Column Break | - | - | - | - | layout only |
| designation | Designation | Link | Designation | - | - | - | quick filter |
| *(advanced_filters_section)* | Advanced Filters | Section Break | - | - | - | - | collapsible |
| filter_list | Filter List | HTML | - | - | - | - | client-only filter-builder widget (`hrms.setup_employee_filter_group`), populates `frm.advanced_filters` in JS, passed as `advanced_filters` arg to `get_employees` |
| *(select_employees_section)* | Select Employees | Section Break | - | - | - | - | groups the employee picker |
| employees_html | Employees HTML | HTML | - | - | - | - | client-only datatable rendering the eligible-employee list with editable Base/Variable columns and row checkboxes |
| company | Company | Link | Company | Yes | - | Yes | `fetch_from: salary_structure.company` |
| employment_type | Employment Type | Link | [[Employment Type]] | - | - | - | quick filter |
| grade | Employee Grade | Link | [[Employee Grade]] | - | - | - | quick filter |
| *(quick_filters_section)* | Quick Filters | Section Break | - | - | - | - | collapsible |
| currency | Currency | Link | Currency | - | - | Yes | `fetch_from: salary_structure.currency`, `depends_on: salary_structure` |

Doctype-level flags: `issingle: 1`, `hide_toolbar: 1` (no save/list/report toolbar — this is a pure "tool" screen), `allow_copy: 1`, `sort_field: creation` / `sort_order: DESC`. No `track_changes`. Because it is a Single doctype, `frm.disable_save()` is called client-side on refresh — **the form is never actually saved as a document**; it is only used to stage input values in memory, then submit them via whitelisted RPC calls (`get_employees`, `bulk_assign_structure`).

## Child Tables

None — no `Table` fields on this doctype. The employee list shown/edited in `employees_html` is a client-side-only in-memory datatable (not a stored child table), backed by the `get_employees` RPC response (each row: `employee`, `employee_name`, `grade`, `base`, `variable`).

## State Machine

Not applicable — non-submittable Single doctype. No `docstatus` transitions, no `status` field.

## Validation Rules (exact, in execution order)

This doctype's own controller (`bulk_salary_structure_assignment.py`) defines **no `validate()` method at all** — since the form is never saved as a normal document (`hide_toolbar`, client calls `frm.disable_save()`), there is no document-level validation pass. All input checking happens inside the whitelisted `bulk_assign_structure` method, which delegates to the shared utility `validate_bulk_tool_fields` (from `hrms/hr/utils.py`, reused by other HR "bulk tool" Single doctypes):

1. `bulk_assign_structure(employees)` calls `validate_bulk_tool_fields(self, mandatory_fields=["salary_structure", "from_date", "company"], employees)`.
2. Inside `validate_bulk_tool_fields`: for each field name `d` in `mandatory_fields`, IF `not self.get(d)` THEN `frappe.throw(_("{0} is required").format(_(self.meta.get_label(d))), title=_("Missing Field"))`. (Checked in the exact order `["salary_structure", "from_date", "company"]`.)
3. `validate_bulk_tool_fields` also accepts optional `from_date`/`to_date` *field-name* args for date-range validation, but **this doctype calls it without those args**, so that branch (`IF self.get(from_date) and self.get(to_date): self.validate_from_to_dates(...)`) never executes here — no from/to range check applies to Bulk Salary Structure Assignment (there is no `to_date` field on this doctype at all).
4. IF `not employees` (the list argument, i.e. no rows were passed in) THEN `frappe.throw(_("Please select at least one employee to perform this action."), title=_("No Employees Selected"))`.

No per-row (per-employee) validation happens in this doctype's Python before dispatching to `create_salary_structure_assignment` — all per-employee validation is delegated to `Salary Structure Assignment.validate()` when each individual assignment document is saved/submitted (see that file), and any failure there is caught and logged per-employee (see Business Logic below), not raised to the bulk caller.

## Business Logic / Calculations

### `get_employees(advanced_filters)` — exact eligible-employee query (whitelisted, powers the on-screen picker)

1. `quick_filter_fields = ["company", "employment_type", "branch", "department", "designation", "grade"]`.
2. `filters = [[d, "=", self.get(d)] for d in quick_filter_fields if self.get(d)]` — only non-empty quick-filter fields are added, each as an equality filter.
3. `filters += advanced_filters` — appends whatever filter tuples the client-side "Filter List" builder assembled (arbitrary additional `Employee` field filters).
4. Build a correlated subquery `employees_with_assignments = SELECT DISTINCT employee FROM `Salary Structure Assignment` WHERE from_date = self.from_date AND docstatus = 1`.
5. Main query over `Employee`, using `frappe.qb.get_query(Employee, fields=[employee, employee_name, grade], filters=filters)`, further filtered by:
   - `Employee.status == "Active"`
   - `Employee.date_of_joining <= self.from_date`
   - `(Employee.relieving_date > self.from_date) OR (Employee.relieving_date IS NULL)`
   - `Employee.employee NOT IN (employees_with_assignments)` — **this is the dedupe/skip mechanism**: any employee who already has a submitted Salary Structure Assignment with `from_date` exactly equal to the chosen `from_date` is excluded from the pickable list entirely (never shown, so never re-submitted from this screen for that exact date).
6. LEFT JOIN `Employee Grade` on `Employee.grade == Grade.name`, additionally selecting `Coalesce(Grade.default_base_pay, 0) AS base` and a constant column `0 AS variable` — i.e. each returned employee row is pre-populated with the grade's default base pay (or 0 if no grade / no default) and a variable of 0, as starting values for the editable datatable.
7. Returns the full result set (`as_dict=True`) — **no pagination/limit is applied**; the client renders every returned row in the datatable.

### `bulk_assign_structure(employees)` — exact dispatch logic (whitelisted)

Args: `employees: list` — a list of dicts, each expected to carry at least `employee`, `base`, `variable` (built client-side from the checked datatable rows, see `bulk_salary_structure_assignment.js` `assign_structure`, which restricts the payload for each checked row to exactly `{employee, base, variable}`).

1. Run `validate_bulk_tool_fields` (see Validation Rules).
2. IF `len(employees) <= 30` THEN run `self._bulk_assign_structure(employees)` synchronously (foreground, blocking the request).
3. ELSE `frappe.enqueue(self._bulk_assign_structure, timeout=3000, employees=employees)` — **background job** via Frappe's queue, timeout 3000s — then `frappe.msgprint(_("Creation of Salary Structure Assignments has been queued. It may take a few minutes."), alert=True, indicator="blue")` (fire-and-forget from the caller's perspective; UI is notified of eventual completion via a realtime event, see below).

### `_bulk_assign_structure(employees)` — exact per-employee loop (runs either inline or inside the enqueued job)

1. `success, failure = [], []`; `count = 0`; `savepoint = "before_salary_assignment"`.
2. For each `d` in `employees` (dict with `employee`, `base`, `variable`):
   a. `frappe.db.savepoint(savepoint)`.
   b. Try: call the **shared** helper `create_salary_structure_assignment(employee=d["employee"], salary_structure=self.salary_structure, company=self.company, currency=self.currency, payroll_payable_account=self.payroll_payable_account, from_date=self.from_date, base=d["base"], variable=d["variable"], income_tax_slab=self.income_tax_slab)` — this is the **exact same module function** documented in `Salary Structure.md` (imported from `hrms.payroll.doctype.salary_structure.salary_structure`), i.e. Bulk Salary Structure Assignment does not have its own document-creation code path; it fully reuses Salary Structure's helper, including that helper's own payroll-payable-account resolution/currency-match check and the full `Salary Structure Assignment.validate()`/`.submit()` chain triggered by `assignment.save(ignore_permissions=True)` + `assignment.submit()`.
   c. On success: append `{"doc": get_link_to_form("Salary Structure Assignment", assignment), "employee": d["employee"]}` to `success`.
   d. On any `Exception`: `frappe.db.rollback(save_point=savepoint)`; `frappe.log_error(f"Bulk Assignment - Salary Structure Assignment failed for employee {d['employee']}.", reference_doctype="Salary Structure Assignment")`; append `d["employee"]` to `failure`. Loop continues to the next employee (per-employee isolation via savepoint, same pattern as `Salary Structure.assign_salary_structure_for_employees`).
   e. `count += 1`; `frappe.publish_progress(count * 100 / len(employees), title=_("Assigning Structure..."))`.
3. After the loop: `frappe.publish_realtime("completed_bulk_salary_structure_assignment", message={"success": success, "failure": failure}, doctype="Bulk Salary Structure Assignment", after_commit=True)` — a realtime socket event, fired only after the DB transaction commits, that the client JS listens for via `hrms.handle_realtime_bulk_action_notification(frm, "completed_bulk_salary_structure_assignment", "Salary Structure Assignment")` to show a completion summary (list of created records / list of failed employee names) regardless of whether the run was synchronous or backgrounded.

### Dedupe/skip logic summary

There are **two distinct dedupe layers**, at different points:
1. **Pre-filter (query-level, in `get_employees`)**: employees already having a submitted assignment with `from_date` exactly equal to the chosen date are excluded from the selectable list entirely (they never appear as checkable rows).
2. **Best-effort per-row error isolation (in `_bulk_assign_structure`)**: if, despite the pre-filter, `create_salary_structure_assignment` -> `assignment.submit()` still raises (e.g. a race: another process created a same-`from_date` assignment for that employee between the picker load and the bulk submit, tripping `Salary Structure Assignment.validate_dates`'s `DuplicateAssignment` throw), that single employee's failure is caught, rolled back to the savepoint, logged, and recorded in the `failure` list — it does **not** abort the batch for other employees.

There is no explicit application-level "skip if X" check inside `Bulk Salary Structure Assignment.py` itself beyond the query pre-filter — the actual duplicate/date/company/tax-slab validation is entirely delegated to `Salary Structure Assignment.validate()` per created record.

## Lifecycle Hooks (exact)

Not applicable in the usual sense — as a Single, non-submittable doctype with no `validate()`/`on_update()` override in `bulk_salary_structure_assignment.py`, no document lifecycle hooks fire beyond Frappe's generic Single-doctype save mechanics (which this UI avoids anyway via `frm.disable_save()`).

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| *(none overridden)* | — | All effects happen through the two whitelisted RPCs below, not through document save/submit/cancel of this doctype itself. |

## Whitelisted / API Methods

| Method name | HTTP-equivalent purpose | Args | Returns | What it does |
|---|---|---|---|---|
| `get_employees` (instance, `@frappe.whitelist()`) | GET — list employees eligible for bulk assignment given current filter/date selections | `advanced_filters: list` | `list[dict]` — each `{employee, employee_name, grade, base, variable}` | See Business Logic algorithm above. |
| `bulk_assign_structure` (instance, `@frappe.whitelist()`) | POST — create+submit Salary Structure Assignment for every selected employee | `employees: list` — each `{employee, base, variable}` | `None` | Validates mandatory fields, then dispatches synchronously (`<=30` employees) or via `frappe.enqueue` (`>30` employees) to `_bulk_assign_structure`. See Business Logic. |

`_bulk_assign_structure` itself is a plain instance method (not whitelisted) — only reachable via `bulk_assign_structure` or the Frappe job queue.

## Permissions ([[Permission Model (RBAC)]])

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| HR User | 1 | 1 | 1 | - | - | - | - | - | - | share, email, print all 1; not submittable so submit/cancel/amend are n/a |
| HR Manager | 1 | 1 | 1 | - | - | - | - | - | - | share, email, print all 1 |

No `if_owner` or `permlevel` restrictions. Because this is a Single doctype used only as a tool screen, these permissions effectively gate who can open/use the bulk-assign screen at all; the actual `Salary Structure Assignment` records it creates are subject to **that** doctype's own permission checks too, except `create_salary_structure_assignment` calls `assignment.save(ignore_permissions=True)`, so the assignment-creation step itself bypasses `Salary Structure Assignment` create/write permission checks — the gate is entirely "can this user read/write the Bulk Salary Structure Assignment tool."

## Scheduled Jobs Touching This Doctype ([[Background Jobs (Scheduler Events)]])

None found in `hrms/hooks.py` `scheduler_events` referencing `Bulk Salary Structure Assignment`.

## Related Doctypes

- [[Salary Structure]] — the structure being bulk-assigned; also the source of the `assign_salary_structure_for_employees` helper this doctype's `create_salary_structure_assignment` call fully reuses.
- [[Salary Structure Assignment]] — the record created (and submitted) per selected employee; per-employee validation (duplicate `from_date`, company, tax slab) lives entirely in that doctype's `validate()`.
- [[Employee Grade]] — read to pre-populate each eligible employee's default base pay in the picker.
- [[Income Tax Slab]] — passed through to each created Salary Structure Assignment.
- [[Employment Type]] — one of the quick-filter fields used to narrow the eligible-employee query.
- [[Employee Core Model]] — the pool of records queried/filtered by `get_employees()` and assigned in bulk.
- Company, Branch, Designation, Department, Account (core ERPNext, not specified in this port-spec tree) — used as quick filters and fetched/company-derived fields.

## Port Notes

- **Client-side-only logic that needs a server equivalent:** the `payroll_payable_account` field's JSON `fetch_from` is literally `".default_payroll_payable_account"` — an empty/malformed doctype prefix before the dot, meaning Frappe's declarative fetch mechanism cannot actually resolve it from this field definition alone. In practice the client JS (`bulk_salary_structure_assignment.js`, `set_payroll_payable_account` triggered on `company` change and on `refresh`) does the real work: `frappe.db.get_value("Company", frm.doc.company, "default_payroll_payable_account", ...)` then `frm.set_value("payroll_payable_account", ...)`. **A server-side/API-only port must replicate this lookup explicitly** (company -> `default_payroll_payable_account`) since the declared `fetch_from` cannot be relied upon as written; this is flagged as a shortcut/gap in source, not invented behavior.
- The employee-picker (`filter_list`/`employees_html`/advanced filter group) is entirely client-rendered UI (Frappe's `hrms.setup_employee_filter_group` and `hrms.render_employees_datatable` helpers, not shown in this doctype's own files) — a port only needs to reproduce the `get_employees` query contract (inputs/outputs) documented above; the actual grid/checkbox/inline-edit UI is a front-end concern outside the mechanical backend spec.
- Client JS enforces "Base amount not set" as a **soft confirmation** (`frappe.warn` dialog, "Are you sure you want to proceed?") before submission when any selected employee's `base` is 0/falsy — this is NOT a hard validation and has no server-side equivalent check in `bulk_salary_structure_assignment.py`; a port should treat a zero `base` as legal input for `bulk_assign_structure`, only optionally re-adding a confirmation step in its own UI layer.
- The `>30 employees -> frappe.enqueue` background-job threshold is a hardcoded magic number (`30`) in `bulk_assign_structure`; note this differs from the analogous threshold in `Salary Structure.assign_salary_structure` (`>20 employees`, see `Salary Structure.md`) — both exist independently in source with different cutoffs; do not unify them into a single shared constant unless intentionally changing behavior.
- Because this whole flow reuses `create_salary_structure_assignment` from `Salary Structure.md`, that file's algorithm (payroll-payable-account resolution/currency-match check, `assignment.save(ignore_permissions=True)` + `assignment.submit()`) is the true "how an assignment gets created" reference — this file only adds the eligible-employee query and the bulk dispatch/job-queue/realtime-notification wrapper around it. Do not duplicate that creation logic separately in a port; implement it once and call it from both bulk-assignment entry points (Salary Structure's own `assign_salary_structure` and this doctype's `bulk_assign_structure`).
- `frappe.publish_realtime(..., after_commit=True)` is a Frappe-framework mechanic (socket.io-based push, deferred until the DB transaction actually commits) — a port needs an equivalent "notify after commit" mechanism (e.g. a transactional outbox + websocket/push notification) to replicate the completion-summary UX for both the synchronous and background-job code paths.
