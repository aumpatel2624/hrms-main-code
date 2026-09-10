# Employee Benefit Application Detail

**Source:** `hrms/payroll/doctype/employee_benefit_application_detail/employee_benefit_application_detail.json`, `employee_benefit_application_detail.py`
**Submittable:** no (child table)   **Tree:** no   **Naming:** row-based (child table, no autoname)
**Module:** Payroll

Child table of [[Employee Benefit Application]] (field `employee_benefits`).

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| salary_component | Earning Component | Link | [[Salary Component]] | yes | | yes | populated by parent's `set_benefit_components_and_currency()` |
| max_benefit_amount | Max Benefit Amount | Currency | options: currency | yes | | yes | copied from Salary Structure Assignment's `Employee Benefit Detail.amount` for this component |
| amount | Amount | Currency | options: currency | yes | | no | `non_negative: 1`; user-entered; validated by parent against `max_benefit_amount` |

`field_order`: salary_component, max_benefit_amount, amount (JSON lists max_benefit_amount/amount before salary_component in the `fields` array, but `field_order` is authoritative for display order).

## Business Logic / Calculations

None on this child doctype itself — controller class body is `pass`. All validation of `amount` vs `max_benefit_amount` and the running total vs the parent's `max_benefits` happens in the parent `Employee Benefit Application.validate_max_benefit()` (see `Employee Benefit Application.md`).

## Permissions ([[Permission Model (RBAC)]])

None defined (`"permissions": []`) — child table permissions are inherited from the parent doctype ([[Employee Benefit Application]]).

## Related Doctypes

- [[Employee Benefit Application]] — the parent document; this table (`employee_benefits`) is populated by the parent's `set_benefit_components_and_currency()` and validated by the parent's `validate_max_benefit()`.
- [[Salary Component]] — the flexible-benefit earning component each row allocates a claim amount toward.

## Port Notes

- Pure data row; no server-side lifecycle hooks. In an RDBMS port this becomes a plain owned child table (foreign key to parent, no independent lifecycle) — not a join table, since rows have no independent identity/reuse outside the parent.
- `track_changes: 1` set at doctype level but has no practical effect beyond parent's own audit trail since child rows are versioned as part of the parent document in Frappe.
