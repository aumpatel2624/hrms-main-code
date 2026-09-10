# Additional Salary

**Source:** `hrms/payroll/doctype/additional_salary/additional_salary.json`, `additional_salary.py`, `additional_salary.js`
**Submittable:** yes ([[Submittable Document Lifecycle]])   **Tree:** no   **Naming:** By "Naming Series" field ([[Naming and Autoname Rules]]) — `naming_series` options `"HR-ADS-.YY.-.MM.-"` (user-visible series selector, but only one option defined)
**Module:** Payroll

Central mechanism for injecting one-off or recurring earning/deduction amounts into Salary Slips outside the base Salary Structure. Created directly by HR, or generated programmatically by `Employee Benefit Claim`, `Employee Incentive`, `Arrear`, `Payroll Correction`, Gratuity, Retention Bonus, Employee Referral bonus, and Employee Advance return flows (those doctypes are owned by other agents; only the interaction contract is documented here).

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| naming_series | Series | Select | `HR-ADS-.YY.-.MM.-` | yes | | no | |
| employee | Employee | Link | [[Employee Core Model]] | yes | | no | `search_index: 1`; client-side query filters `company` + `status != Inactive` |
| salary_component | Salary Component | Link | [[Salary Component]] | yes | | no | `search_index: 1`; client-side query filters `disabled: 0` |
| amount | Amount | Currency | options: currency | yes | | no | must be >= 0 (server validation) |
| overwrite_salary_structure_amount | Overwrite Salary Structure Amount | Check | | no | 1 (default checked) | no | forced to 0 server-side if component isn't part of employee's salary structure |
| deduct_full_tax_on_selected_payroll_date | Deduct Full Tax on Selected Payroll Date | Check | | no | 0 | no | client-side auto-fetched from `Salary Component.deduct_full_tax_on_selected_payroll_date` via `frm.add_fetch` (UI convenience; not a `fetch_from` in JSON) |
| payroll_date | Payroll Date | Date | | conditionally (`mandatory_depends_on: eval:(doc.is_recurring==0)`) | | no | `depends_on: eval:(doc.is_recurring==0)`; cleared server-side when `is_recurring=1` |
| employee_name | Employee Name | Data | | no | | yes | fetch_from `employee.employee_name` |
| department | Department | Link | Department | no | | yes | fetch_from `employee.department` |
| company | Company | Link | Company | yes | | no | |
| type | Salary Component Type | Data | | no | | yes | fetch_from `salary_component.type` (i.e. "Earning"/"Deduction") |
| amended_from | Amended From | Link | [[Additional Salary]] | no | | yes | |
| is_recurring | Is Recurring | Check | | no | 0 | no | |
| from_date | From Date | Date | | conditionally (`mandatory_depends_on: eval:(doc.is_recurring==1)`) | | no | `depends_on: eval:(doc.is_recurring==1)`; cleared server-side when `is_recurring=0` |
| to_date | To Date | Date | | conditionally (`mandatory_depends_on: eval:(doc.is_recurring==1)`) | | no | same as from_date |
| ref_doctype | Reference Document Type | Link | DocType | no | | yes | polymorphic reference — set by originating doctype (e.g. Employee Benefit Claim, Arrear, Employee Advance) |
| ref_docname | Reference Document | Dynamic Link | options: `ref_doctype` | no | | yes | `no_copy: 1` |
| currency | Currency | Link | Currency | yes | | yes | `depends_on: eval:(doc.docstatus==1 || doc.employee)`, `print_hide: 1` |
| disabled | Disabled | Check | | no | 0 | no | `allow_on_submit: 1`, `no_copy: 1`; `depends_on: eval:doc.is_recurring` — only meaningful/shown for recurring entries; lets HR "turn off" a recurring additional salary without cancelling it |

Layout-only fields skipped: column_break_5, column_break_8, salary_details_section, properties_and_references_section.

## Child Tables

None.

## State Machine

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Submitted: submit (docstatus 0->1, triggers Employee Referral status update if applicable)
    Submitted --> Cancelled: cancel (docstatus 1->2, reverses Employee Referral status update)
    Cancelled --> Draft: amend
    Submitted --> Submitted: disabled toggled (allow_on_submit field; before_update_after_submit re-validates overlap if re-enabled)
```

Plain list:
- (Draft, submit, Submitted, guard: full `validate()` chain passes; `on_submit` calls `update_employee_referral()`)
- (Submitted, cancel, Cancelled, guard: standard cancel; `on_cancel` calls `update_employee_referral(cancel=True)`)
- (any, amend, new Draft, guard: standard amend)
- (Submitted, "disabled" field edit, Submitted — no docstatus change, guard: `before_update_after_submit` re-runs `validate_recurring_additional_salary_overlap()` ONLY if the doc is being set to NOT disabled, i.e. re-enabled)

No explicit `status` field; state is `docstatus` only, plus the independent `disabled` boolean for recurring entries.

## Validation Rules (exact, in execution order)

`before_validate()` runs first (before `validate()`):
1. IF `self.is_recurring` THEN `self.payroll_date = None`. ELSE `self.from_date = None` and `self.to_date = None`. (source: `before_validate`) — this is a data-cleaning step, not a throw.

`validate()`, in order:
1. `validate_active_employee(self.employee)` -> throws if employee not active.
2. `validate_dates()`:
   a. Fetch `date_of_joining, relieving_date` from `Employee`.
   b. `validate_from_to_dates("from_date", "to_date")` — standard Frappe framework check (throws if `to_date < from_date` when both set).
   c. IF `self.is_recurring` AND NOT (`self.from_date` and `self.to_date`) THEN throw `"From and to dates are madatory for recurring type additional salaries."` (note: source typo "madatory" preserved verbatim per ground rules).
   d. ELIF NOT `self.is_recurring` AND NOT `self.payroll_date` THEN throw `"Payroll date is mandatory for non-recurring type additional salaries."`
   e. IF `date_of_joining` set:
      - IF `self.payroll_date` AND `getdate(payroll_date) < getdate(date_of_joining)` THEN throw `"Payroll date can not be less than employee's joining date."`
      - ELIF `self.from_date` AND `getdate(from_date) < getdate(date_of_joining)` THEN throw `"From date can not be less than employee's joining date."`
   f. IF `relieving_date` set:
      - IF `self.to_date` AND `getdate(to_date) > getdate(relieving_date)` THEN throw `"To date can not be greater than employee's relieving date."`
      - IF `self.payroll_date` AND `getdate(payroll_date) > getdate(relieving_date)` THEN throw `"Payroll date can not be greater than employee's relieving date."`
3. `validate_salary_structure()`:
   a. Look up the latest Salary Structure Assignment: `employee = self.employee`, `docstatus = 1`, `from_date <= (self.payroll_date or self.from_date)`, ordered `from_date desc`, first match's `salary_structure`.
   b. IF none found THEN throw `"There is no Salary Structure assigned to {0}. First assign a Salary Structure."` (employee).
   c. IF `self.overwrite_salary_structure_amount` is truthy: check whether `self.salary_component` exists as a `Salary Detail` row on that `salary_structure` (`parenttype="Salary Structure"`). IF NOT found THEN **silently set** `self.overwrite_salary_structure_amount = 0` (no throw) and `frappe.msgprint` (non-blocking): `"Overwrite Salary Structure Amount is disabled as the Salary Component: {0} not part of the Salary Structure: {1}"` (salary_component, salary_structure).
4. `validate_recurring_additional_salary_overlap()`: only runs `IF self.is_recurring`:
   a. Query other `Additional Salary` rows where: `employee == self.employee`, `name != self.name`, `docstatus == 1`, `is_recurring == 1`, `salary_component == self.salary_component`, `to_date >= self.from_date`, `from_date <= self.to_date`, `disabled == 0` (i.e. date-range overlap with an active recurring entry for the SAME employee + SAME salary component).
   b. IF any match(es) found THEN throw `"Additional Salary: {0} already exist for Salary Component: {1} for period {2} and {3}"` (comma-and list of matching names bolded, salary_component bolded, formatted from_date bolded, formatted to_date bolded).
5. `validate_employee_referral()`: only runs meaningfully `IF self.ref_doctype == "Employee Referral"`:
   a. Fetch `is_applicable_for_referral_bonus, status` from the `Employee Referral` doc (`self.ref_docname`).
   b. IF NOT `is_applicable_for_referral_bonus` THEN throw `"Employee Referral {0} is not applicable for referral bonus."` (ref_docname).
   c. IF `self.type == "Deduction"` THEN throw `"Earning Salary Component is required for Employee Referral Bonus."`
   d. IF `referral_details.status != "Accepted"` THEN throw `"Additional Salary for referral bonus can only be created against Employee Referral with status {0}"` (bolded "Accepted").
6. `validate_duplicate_additional_salary()`: only runs `IF self.overwrite_salary_structure_amount` (else returns immediately with no check):
   a. Query other `Additional Salary` rows where: `name != self.name`, `salary_component == self.salary_component`, `employee == self.employee`, `overwrite_salary_structure_amount == 1`, `docstatus == 1`, `disabled == 0`, AND ( `payroll_date == self.payroll_date` OR (`from_date <= self.payroll_date` AND `to_date >= self.payroll_date`) ) — i.e. another active overwrite-type Additional Salary for the same employee+component whose date (or date range) covers this document's `payroll_date`.
   b. IF found (limit 1) THEN throw (title `"Duplicate Overwritten Salary"`): `"Additional Salary for this salary component with {0} enabled already exists for this date"` (bolded "Overwrite Salary Structure Amount") + `"Reference: {0}"` (link to the existing doc).
   - Note: this check compares against `self.payroll_date`, which for a recurring entry (`is_recurring=1`) has already been set to `None` by `before_validate()` — meaning for recurring entries this duplicate check effectively only matches against other recurring entries whose `from_date <= None`, which in SQL comparisons behaves per the underlying query builder's NULL handling (flag: exact recurring-vs-recurring overwrite-duplicate behavior across two recurring entries is not fully guarded by this method — only guarded by rule 4's overlap check on `is_recurring` entries specifically).
7. `validate_tax_component_overwrite()`:
   a. IF `Salary Component.variable_based_on_taxable_salary` is NOT set for `self.salary_component` THEN return (no-op).
   b. ELIF `self.overwrite_salary_structure_amount` THEN `frappe.msgprint` (non-blocking, title "Warning", orange indicator): `"This will overwrite the tax component {0} in the salary slip and tax won't be calculated based on the Income Tax Slabs"` (bolded salary_component).
   c. ELSE (overwrite not set) THEN throw (title `"Invalid Additional Salary"`): `"{0} has {1} enabled"` (link to Salary Component, bolded "Variable Based On Taxable Salary") + `"To overwrite the salary component amount for a tax component, please enable {0}"` (bolded "Overwrite Salary Structure Amount") — i.e. a tax-variable component MUST have `overwrite_salary_structure_amount = 1`, or the document is rejected.
8. `validate_accrual_component()`: IF `Salary Component.accrual_component` is set for `self.salary_component` THEN `frappe.msgprint` (non-blocking, title "Warning", orange indicator): `"{0} is an Accrual Component and this will be recorded as a payout in Employee Benefits Ledger"` (bolded salary_component).
9. IF `self.amount < 0` THEN throw `"Amount should not be less than zero"`.
10. IF `self.ref_doctype == "Employee Advance"` THEN `validate_employee_advance_return()`:
    a. IF `ref_doctype != "Employee Advance"` or no `ref_docname` THEN return (redundant guard given outer condition).
    b. `precision = self.precision("amount")`. Load the `Employee Advance` doc.
    c. Query other submitted `Additional Salary` rows referencing the same `Employee Advance` (`ref_doctype/ref_docname` match, `docstatus=1`, excluding self) — these are "scheduled deductions" against the same advance.
    d. `available_return_amount = flt(advance.paid_amount - advance.claimed_amount, precision)`.
    e. `scheduled_return_amount = flt(sum of scheduled_deductions' amounts, precision)`.
    f. `remaining_return_amount = flt(available_return_amount - scheduled_return_amount, precision)`.
    g. IF `flt(self.amount, precision) <= remaining_return_amount` THEN return (valid, no throw).
    h. ELSE: `pending_scheduled = max(0, flt(scheduled_return_amount - advance.return_amount, precision))`.
    i. IF `pending_scheduled > 0` THEN build message: `"Employee Advance {0} has {1} available for return. {2} has already been scheduled for deduction in {3}."` (link to advance, formatted `remaining_return_amount`, formatted `pending_scheduled`, comma-and list of links to the scheduled Additional Salary docs) and throw (title `"Amount Exceeds Available Balance"`).
    j. ELSE build message: `"The amount exceeds the available balance for Employee Advance {0}. Available amount for return: {1}."` (link to advance, formatted `remaining_return_amount`) and throw (same title).

`before_update_after_submit()` (runs when editing an already-submitted doc, e.g. toggling `disabled`):
11. IF `NOT self.disabled` (i.e. it is being enabled/kept enabled) THEN re-run `validate_recurring_additional_salary_overlap()` (rule 4 above) — prevents re-enabling a recurring Additional Salary that would now overlap with another active one.

## Business Logic / Calculations

### `get_amount(sal_start_date, sal_end_date)` — pro-rata amount for a recurring Additional Salary within a given Salary Slip's period
Used when a recurring Additional Salary's `[from_date, to_date]` only partially overlaps a Salary Slip's `[sal_start_date, sal_end_date]` period.
1. `total_days = date_diff(to_date, from_date) + 1` (inclusive day count of the full recurring period).
2. `amount_per_day = self.amount / total_days`.
3. `start_date = sal_start_date` UNLESS `sal_start_date <= from_date`, in which case `start_date = from_date` (clip start to the later of the two).
   - Exact condition as coded: `IF getdate(sal_start_date) <= getdate(self.from_date): start_date = getdate(self.from_date)` (i.e., if the slip starts on/before the AS from_date, clip to from_date — else use the slip's own start date, meaning `sal_start_date` is used unmodified only when it falls strictly after `from_date`).
4. `end_date = sal_end_date` UNLESS `sal_end_date > to_date`, in which case `end_date = to_date` (clip end to the earlier of the two).
5. `no_of_days = date_diff(end_date, start_date) + 1` (inclusive day count of the overlapping window).
6. Return `amount_per_day * no_of_days`.

Edge case notes: no explicit divide-by-zero guard for `total_days == 0` (i.e., `from_date == to_date` yields `total_days = 1`, safe; but this method assumes `to_date >= from_date`, already enforced by `validate_from_to_dates`). No rounding applied within this function itself — precision handling happens at the caller (Salary Slip) level.

### `get_additional_salaries(employee, start_date, end_date, component_type)` — module-level function, the Salary Slip integration point
This is THE mechanism by which Additional Salary records are pulled into a Salary Slip during generation (called from `Salary Slip.add_additional_salary_components()`, owned by another agent but documented here per assignment note).
1. `comp_type = "Earning" if component_type == "earnings" else "Deduction"`.
2. Query `Additional Salary` rows where: `employee == employee`, `docstatus == 1`, `type == comp_type`, `disabled == 0`, AND ( recurring-match OR one-time-match ):
   - **Recurring-match**: `is_recurring == 1` AND `from_date <= end_date` AND `to_date >= end_date` — i.e. the recurring entry's range must still be active AS OF the slip's `end_date` (not `start_date`; a recurring entry that ends mid-period still counts as long as `to_date >= end_date`, so it is NOT prorated by this query — pro-ration via `get_amount()` is a separate, not automatically invoked, capability; confirm against Salary Slip's actual call site for whether `get_amount` is used per row — this file only defines the method).
   - **One-time-match**: `is_recurring == 0` AND `payroll_date` falls `BETWEEN start_date AND end_date` (inclusive range check via query builder's slice syntax).
3. Selected fields: `name`, `salary_component AS component`, `type`, `amount`, `is_recurring`, `overwrite_salary_structure_amount AS overwrite`, `deduct_full_tax_on_selected_payroll_date`, `ref_doctype`.
4. Post-process the result list: for each row, IF `overwrite` is truthy:
   a. IF `component` already appears in a running `components_to_overwrite` list (i.e. a second overwrite-type Additional Salary exists for the same component in this window) THEN throw (title `"Error"`): `"Multiple Additional Salaries with overwrite property exist for Salary Component {0} between {1} and {2}."` (bolded component, start_date, end_date).
   b. ELSE append `component` to `components_to_overwrite`.
5. Every row (overwrite or not) is appended to the returned `additional_salaries` list regardless.
6. Return `additional_salaries`.

This confirms the assignment note's overlap requirement: **the actual runtime overlap guard for overwrite-type conflicts across ANY additional salaries touching a given payroll window is enforced here**, in `get_additional_salaries`, at Salary Slip generation time — separate from (and in addition to) the doc-level `validate_duplicate_additional_salary` check (rule 6) which only guards overwrite-duplicates sharing the exact same `payroll_date`/date-range overlap pattern at save time for non-recurring vs itself. The Salary Slip-time check in step 4 is broader: it fires for ANY two qualifying Additional Salary rows (recurring or one-time) resolving to the same component with `overwrite=1` in the same slip window, regardless of whether their creation-time validations individually passed (e.g. one recurring + one one-time entry both overwriting the same component in the same slip period would each pass rule 6 individually at their own save time, since rule 6 doesn't check `is_recurring` combinations symmetric to rule 4, but would both surface here and throw at slip-generation time).

## Lifecycle Hooks (exact) ([[Cross-Doctype Hooks (doc_events)]])

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| before_validate | Clear `payroll_date` if recurring; clear `from_date`/`to_date` if not recurring | none |
| validate | Full validation chain (rules 1-10 above) | none (read-only lookups of Employee, Salary Structure, Salary Structure Assignment, Employee Referral, Employee Advance, Salary Component) |
| on_submit | `update_employee_referral()` — IF `ref_doctype == "Employee Referral"`: `frappe.db.set_value("Employee Referral", ref_docname, "referral_payment_status", "Paid")` | Direct field update on `Employee Referral` |
| on_cancel | `update_employee_referral(cancel=True)` — same but sets `referral_payment_status = "Unpaid"` | Direct field update on `Employee Referral` |
| before_update_after_submit | Re-validate recurring overlap if re-enabling (`disabled` cleared) | none |

## Whitelisted / API Methods

None declared on this controller (`@frappe.whitelist()` not used in `additional_salary.py`). `get_additional_salaries` is a plain importable Python function (not whitelisted), called server-side from Salary Slip.

## Permissions ([[Permission Model (RBAC)]])

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| System Manager | yes | yes | yes | yes | yes | yes | yes | yes | yes | share/email/print also 1 |
| HR User | yes | yes | yes | no | yes | n/a (cancel not listed) | n/a | yes | no | share/email/print also 1; no delete/export/amend/cancel rights explicitly set |
| HR Manager | yes | yes | yes | no | yes | n/a (cancel not listed) | n/a | yes | no | share/email/print also 1; no delete/export/amend/cancel rights explicitly set |

Note: neither HR User nor HR Manager has `delete`, `cancel`, or `amend` rights per the JSON (only System Manager does) — this is narrower than most sibling doctypes in this module and should be reproduced exactly, not broadened.

## Scheduled Jobs Touching This Doctype ([[Background Jobs (Scheduler Events)]])

None found directly in `hrms/hooks.py` referencing "Additional Salary". (Recurring Additional Salary entries are pulled live at Salary Slip generation time via `get_additional_salaries`, not via a separate scheduled job that materializes anything on this doctype.)

## Related Doctypes

- [[Employee Core Model]] — the employee this earning/deduction amount applies to; active-employee and joining/relieving-date checks read from it.
- [[Salary Component]] — the earning/deduction component being injected; its `variable_based_on_taxable_salary` and `accrual_component` flags drive extra validation/warnings here.
- [[Salary Structure]] / [[Salary Structure Assignment]] — read to resolve the employee's current structure and to check whether `salary_component` is part of it (for the overwrite-amount check).
- [[Salary Slip]] — the consumer: `get_additional_salaries()` is called from Salary Slip generation to pull in matching Additional Salary rows and enforce the overwrite-duplicate guard at slip-generation time.
- [[Employee Benefit Claim]], [[Employee Incentive]], [[Arrear]], [[Payroll Correction]], [[Gratuity]], [[Retention Bonus]] — other doctypes that generate Additional Salary records programmatically rather than HR creating them directly.
- [[Employee Referral]] — set as `ref_doctype`/`ref_docname` for referral-bonus Additional Salary entries; `on_submit`/`on_cancel` flips its `referral_payment_status` between Paid/Unpaid.
- Employee Advance (core ERPNext, not specified in this port-spec tree) — set as `ref_doctype`/`ref_docname` for advance-return deductions; validated against its `paid_amount`/`claimed_amount`/`return_amount`.

## Port Notes

- `overwrite_salary_structure_amount` defaults to checked (`1`) in the schema but is silently forced to `0` server-side (with a non-blocking `frappe.msgprint`, not a throw) whenever the chosen `salary_component` isn't part of the employee's resolved Salary Structure — a port's API layer must replicate this "silent correction + warning" semantic rather than either ignoring it or hard-rejecting.
- Multiple `frappe.msgprint` (non-blocking, informational/warning) calls exist alongside `frappe.throw` — a port's API contract should distinguish "warnings returned alongside a successful save" (steps 3c, 7b, 8) from "hard validation failures" (all the `frappe.throw` calls) if it wants to preserve the same UX; at minimum, the underlying document state changes (like the silent `overwrite_salary_structure_amount = 0`) must still occur even though no error is raised.
- Rule 6 (`validate_duplicate_additional_salary`) and rule 4 (`validate_recurring_additional_salary_overlap`) are NOT symmetric — rule 6 only triggers when `overwrite_salary_structure_amount` is set and does not check `is_recurring` interplay the same way rule 4 does. Combined with the broader duplicate-overwrite guard inside `get_additional_salaries` (step 4) at Salary Slip generation time, there are effectively TWO different overlap-detection code paths (doc-save-time vs slip-generation-time) with different scope — both must be ported faithfully as separate checks, not merged into one.
- `deduct_full_tax_on_selected_payroll_date` is populated client-side via `frm.add_fetch` (a lightweight "copy value on link change" UI helper), NOT via the JSON's `fetch_from` mechanism — meaning if a document is created via API without replaying this client behavior, this field will NOT be auto-populated from the Salary Component and must be explicitly set by the API caller (or the port must implement equivalent server-side default-population, since no `fetch_from` exists in the schema for it).
- Naming series `HR-ADS-.YY.-.MM.-` only has one option defined in the Select field, so despite being nominally a "choose your series" pattern, only one series is realistically ever selectable in practice.
- Depends on `Salary Component` fields `variable_based_on_taxable_salary` and `accrual_component`, and on `Salary Detail`/`Salary Structure` for the overwrite-eligibility check, and on `Employee Advance` fields `paid_amount`/`claimed_amount`/`return_amount` — all owned by other modules; this doctype's validation logic has hard cross-module data dependencies that must exist in the ported schema.
