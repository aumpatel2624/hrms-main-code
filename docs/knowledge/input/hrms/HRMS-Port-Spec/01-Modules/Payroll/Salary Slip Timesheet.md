# Salary Slip Timesheet

**Source:** `hrms/payroll/doctype/salary_slip_timesheet/salary_slip_timesheet.json`, `salary_slip_timesheet.py`
**Submittable:** no   **Tree:** no   **Naming:** child table (no autoname; row identified by parent+idx)
**Module:** Payroll

Child table of `Salary Slip` (field `timesheets`, section "Timesheet Details", shown only when `salary_slip_based_on_timesheet` is checked). Links one or more `Timesheet` documents to the slip when the employee is paid hourly.

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| time_sheet | Time Sheet | Link | Timesheet | Yes | — | No | |
| working_hours | Working Hours | Float | — | No | — | Yes | `fetch_from: time_sheet.total_hours`, `no_copy` |

`quick_entry: 1`.

## Child Tables

None (leaf child table).

## State Machine

Not applicable — child table. Indirectly reflects the linked `Timesheet`'s own status (`Submitted` / `Billed` / `Partially Billed` / `Payrolled`), which the parent Salary Slip both reads (to decide which timesheets to pull in) and writes (sets to `Payrolled` when the slip is finalized — see `Salary Slip.update_status()`).

## Validation Rules (exact, in execution order)

No field-level validation on this child doctype itself (`SalarySlipTimesheet` controller body is `pass`). All checks happen in the parent `Salary Slip`:

1. `Salary Slip.check_existing()`, timesheet branch: FOR each row in `self.timesheets`, IF `frappe.db.get_value("Timesheet", data.time_sheet, "status") == "Payrolled"` THEN `frappe.throw("Salary Slip of employee {employee} already created for time sheet {time_sheet}")` (source: `check_existing`) — prevents double-billing an already-payrolled timesheet.

## Business Logic / Calculations

Population and downstream usage happen entirely in the parent `Salary Slip` controller:

1. **Population** — `Salary Slip.set_time_sheet()` (called from `get_emp_and_working_day_details()` only when `salary_slip_based_on_timesheet` is true):
   a. Clear `self.set("timesheets", [])`.
   b. Query `Timesheet` where `employee = self.employee`, `start_date BETWEEN self.start_date AND self.end_date`, and `status IN ("Submitted", "Billed", "Partially Billed")`.
   c. For each match, append a row: `time_sheet = timesheet.name`, `working_hours = timesheet.total_hours`.
2. **Total working hours** — `Salary Slip.add_timesheet_earning_component()`: `total_working_hours = sum(d.working_hours or 0.0 for d in self.timesheets) or 0.0`.
3. **Wage computation** — `wages_amount = hour_rate * total_working_hours`, added to the timesheet-designated earning component via `add_earning_for_hourly_wages()` (see `Salary Slip.md` Business Logic section, "Timesheet-based wages").
4. **Alternate/legacy total path** — `Salary Slip.calculate_total_for_salary_slip_based_on_timesheet()` (invoked by the whitelisted `set_totals()` method, used by the client script on manual amount edits) recomputes `total_working_hours` by summing `timesheet.working_hours` across `self.timesheets` directly, and recomputes `wages_amount = total_working_hours * hour_rate` to overwrite the matching earning row.
5. **Status sync on submit/cancel** — `Salary Slip.update_status(salary_slip)`: for each row with a `time_sheet` set, load the `Timesheet`, set `timesheet.salary_slip = salary_slip` (the Salary Slip name, or `None` on cancel), `ignore_validate_update_after_submit = True`, call `timesheet.set_status()` (Timesheet's own status logic — not part of this module), and `save()`.
6. **Max working hours warning (client-alert only)** — `Salary Slip.validate()`: IF Payroll Settings `max_working_hours_against_timesheet` is set AND `salary_slip_based_on_timesheet` AND `total_working_hours > int(max_working_hours)` THEN `frappe.msgprint(..., alert=True)` — this is a **non-blocking alert**, not a validation error; the slip still saves.

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| (none on this child doctype itself) | — | — |

Relevant parent (`Salary Slip`) hooks re: timesheets:

| Salary Slip Event | What Runs re: timesheets | Side Effects |
|---|---|---|
| `get_emp_and_working_day_details` (whitelisted) | `set_time_sheet()`, `add_timesheet_earning_component()` | Populates `timesheets` table; sets `hour_rate`, `total_working_hours`, and one earning row |
| `on_submit` (via `set_status` -> `update_status`) | sets `Timesheet.salary_slip = self.name`, recalculates Timesheet status | Timesheet documents saved with `salary_slip` link and new status (e.g. `Payrolled`) |
| `on_cancel` (via `set_status` -> `update_status`) | `update_status()` called with no arg -> `salary_slip=None` | Unlinks `Timesheet.salary_slip`, resets Timesheet status |

## Whitelisted / API Methods

None on this child doctype. (Relevant parent whitelisted methods — `get_emp_and_working_day_details`, `set_totals`, `process_salary_based_on_working_days` — are documented in `Salary Slip.md`.)

## Permissions

`permissions: []` — governed by the parent `Salary Slip`'s permissions.

## Scheduled Jobs Touching This Doctype

None found.

## Related Doctypes

- [[Salary Slip]] — sole parent doctype (`timesheets` field); populates this table via `set_time_sheet()` and reads it to compute timesheet-based wages and to sync linked Timesheet status on submit/cancel.

## Port Notes

- The Frappe `fetch_from` mechanism on `working_hours` (auto-copies `Timesheet.total_hours` into the child row whenever `time_sheet` is set/changed, purely client-side unless the row is saved) has no automatic equivalent in most other stacks — a port must explicitly copy `total_hours` from the referenced Timesheet at the moment the row is created/updated, both server- and client-side, and decide whether to keep it in sync if the Timesheet's hours change later (Frappe's `fetch_from` does NOT auto-resync existing rows on the source document's later edits either — it only fires on the link field's own change event).
- `update_status()` performs writes to another doctype (`Timesheet`) as an implicit side effect of Salary Slip submit/cancel — a port must make this an explicit, transactional part of the Salary Slip submit/cancel command (both must succeed or both roll back) since Frappe does not guarantee cross-document atomicity here by default either (each `timesheet.save()` is its own transaction boundary in Frappe, which is itself a latent bug/limitation worth flagging: a partial failure here could leave some timesheets updated and others not).
