# Payroll Correction Child

**Source:** `hrms/payroll/doctype/payroll_correction_child/payroll_correction_child.json`, `payroll_correction_child.py`
**Submittable:** no (child table)   **Tree:** no   **Naming:** row-based (child table)
**Module:** Payroll

Shared child table used by BOTH `Payroll Correction` (fields `earning_arrears`, `deduction_arrears`, `accrual_arrears`) and `Arrear` (same three field names) to represent one salary-component arrear amount.

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| salary_component | Salary Component | Link | [[Salary Component]] | yes | | no | |
| amount | Amount | Float | | yes | | no | `non_negative: 1` |

## Business Logic / Calculations

None on this child doctype itself — controller class body is `pass`. All population logic lives in the parent doctypes: `Payroll Correction.populate_breakup_table()` and `Arrear.populate_arrear_tables()` (see their respective `.md` files).

## Permissions

None defined (`"permissions": []`) — inherited from whichever parent doctype (`Payroll Correction` or `Arrear`) owns the row.

## Related Doctypes

- [[Payroll Correction]] — one of two parent doctypes that own rows of this child table (`earning_arrears`, `deduction_arrears`, `accrual_arrears`).
- [[Arrear]] — the other parent doctype reusing this same child table shape.
- [[Salary Component]] — each row's `salary_component` Link identifies the component the arrear amount applies to.

## Port Notes

- This is a genuinely shared/reused child doctype across two different parents (`Payroll Correction` and `Arrear`) — in an RDBMS port this could be modeled either as one shared child table with a polymorphic parent reference (`parenttype` + `parent`, matching Frappe's own generic child-table pattern), or as two separate owned tables (`payroll_correction_arrears`, `arrear_arrears`) if the target ORM doesn't support polymorphic child associations cleanly. Either is faithful; document the choice made.
- `amount` here is a **Float**, not Currency (unlike the visually similar `Employee Benefit Detail`/`Employee Benefit Application Detail` child tables which use Currency) — reproduce the type distinction; it affects precision/formatting behavior (Float has no automatic currency-symbol/precision binding).
