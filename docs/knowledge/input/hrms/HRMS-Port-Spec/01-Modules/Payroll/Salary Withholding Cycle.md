# Salary Withholding Cycle

**Source:** `hrms/payroll/doctype/salary_withholding_cycle/salary_withholding_cycle.json`, `salary_withholding_cycle.py`
**Submittable:** no (child table)   **Tree:** no   **Naming:** row-based (child table)
**Module:** Payroll

Child table of `Salary Withholding` (field `cycles`) — one row per payroll-frequency-sized chunk of the overall withholding window.

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| from_date | From Date | Date | | yes | | no | `columns: 2` (grid column width); set by parent's `set_withholding_cycles_and_to_date()` |
| to_date | To Date | Date | | yes | | no | `columns: 2`; set by parent |
| is_salary_released | Is Salary Released | Check | | no | 0 | yes | `no_copy: 1`, `columns: 2`; flipped via `db_set` from `Salary Withholding._update_salary_withholdings()` when a linked bank/journal entry is submitted (1) or cancelled (0) |
| journal_entry | Journal Entry | Link | Journal Entry | no | | yes | `columns: 2`; set via `link_bank_entry_in_salary_withholdings()`, cleared via `db_set(None)` on bank-entry cancellation |

## Business Logic / Calculations

None on this child doctype itself — controller class body is `pass`. All mutation happens externally from the parent `Salary Withholding` module's functions:
- Created/populated by `Salary Withholding.set_withholding_cycles_and_to_date()`.
- `journal_entry` bulk-set by `link_bank_entry_in_salary_withholding.link_bank_entry_in_salary_withholdings()`.
- `is_salary_released` / `journal_entry` toggled by `update_salary_withholding_payment_status()` -> `_update_salary_withholdings()` in response to that Journal Entry's submit/cancel.

Also referenced by `Salary Slip.salary_withholding_cycle` (a Data field on Salary Slip, owned by another agent) which stores the name of the specific cycle row a given slip falls into, and by `_update_payment_status_in_payroll()` which queries Salary Slips by `salary_withholding_cycle` to flip their `status` between "Withheld"/"Submitted".

## Permissions

None defined (`"permissions": []`) — inherited from parent (`Salary Withholding`).

## Related Doctypes

- [[Salary Withholding]] — sole parent doctype (`cycles` field); generates all rows via `set_withholding_cycles_and_to_date()`.
- [[Salary Slip]] — its `salary_withholding_cycle` Data field stores a specific row's name; status flips between Withheld/Submitted based on this cycle's release state.
- [[Payroll Employee Detail]] — `is_salary_released` release events also toggle `is_salary_withheld` on the matching Payroll Entry employee row.

## Port Notes

- `Salary Slip.salary_withholding_cycle` (owned by another module) stores this row's NAME (a child-table row identifier) as a plain string/Data reference rather than a Link — in Frappe, child-table row names are typically system-generated hashes; a port must ensure cycle rows have a stable, referenceable identifier even though they're modeled as child/owned rows, since another top-level doctype (Salary Slip) holds a dangling reference to a specific cycle row by that identifier. This is effectively a child-row acting as a pseudo-independent entity referenced across doctypes — worth flagging as an RDBMS design consideration (the `salary_withholding_cycle` table needs a stable primary key referenceable from `salary_slip.salary_withholding_cycle_id`, not just an ordinal position within its parent).
- `journal_entry` cleared to `None` on bank-entry cancellation but `is_salary_released` toggled back to `0` at the same time — both happen together atomically in source (`_update_salary_withholdings`); a port must keep these two field updates transactionally consistent.
