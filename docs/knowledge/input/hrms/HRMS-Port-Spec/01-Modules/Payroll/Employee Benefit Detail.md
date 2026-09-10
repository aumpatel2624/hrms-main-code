# Employee Benefit Detail

**Source:** `hrms/payroll/doctype/employee_benefit_detail/employee_benefit_detail.json`, `employee_benefit_detail.py`
**Submittable:** no (child table)   **Tree:** no   **Naming:** row-based (child table)
**Module:** Payroll

Child table used on `Salary Structure Assignment` (owned by another module agent — cross-reference by name only) to define an employee's flexible benefit components and their yearly amounts.

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| salary_component | Earning Component | Link | [[Salary Component]] | yes | | no | `link_filters`: Salary Component.type = Earning AND Salary Component.is_flexible_benefit = 1 (UI-only filter) |
| amount | Benefit Amount | Currency | | yes | | no | `non_negative: 1`; the configured yearly flexible-benefit amount for this component |

## Business Logic / Calculations

None on this child doctype itself — controller class body is `pass`. This table is read by:
- `Employee Benefit Application.set_benefit_components_and_currency()` — copies `amount` into `Employee Benefit Application Detail.max_benefit_amount` as the per-component yearly ceiling.
- `Employee Benefit Claim.get_component_details()` — joined with `Salary Component` to fetch `payout_method`/`depends_on_payment_days`/`amount` for eligibility calc.
- `Employee Benefit Ledger.get_max_claim_eligible()` — uses `amount` as the yearly benefit ceiling for "Allow claim for full benefit amount" payout method.
- `Arrear.fetch_existing_accrual_components()` — sums amounts from this table (joined by `parent` = Salary Slip name) for salary components flagged `arrear_component`.

## Permissions

None defined (`"permissions": []`) — inherited from parent doctype (Salary Structure Assignment).

## Related Doctypes

- [[Salary Structure Assignment]] — parent doctype; this child table lives on it and defines the flexible benefit components/amounts for the employee.
- [[Salary Component]] — the earning component being configured as a flexible benefit.
- [[Employee Benefit Application]] — reads `amount` into `Employee Benefit Application Detail.max_benefit_amount` as the yearly ceiling.
- [[Employee Benefit Claim]] — joins with `Salary Component` (via this table) to fetch payout eligibility details.
- [[Employee Benefit Ledger]] — uses `amount` as the yearly benefit ceiling for the "Allow claim for full benefit amount" payout method.
- [[Arrear]] — sums amounts from this table for salary components flagged `arrear_component`.

## Port Notes

- Field `link_filters` restricting `salary_component` to Earning + flexible-benefit components is a UI-only convenience; the port's server-side validation should not assume this restriction is enforced unless explicitly re-implemented as a server check (source shows no server-side validation of this constraint on the child doctype or its parent).
- `index_web_pages_for_search: 1` is a Frappe global-search indexing flag with no functional/business-logic significance; omit or replace with the new stack's own search-indexing mechanism if needed.
