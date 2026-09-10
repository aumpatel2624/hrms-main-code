# Expense Taxes and Charges

**Source:** `hrms/hr/doctype/expense_taxes_and_charges/expense_taxes_and_charges.json`, `expense_taxes_and_charges.py`
**Submittable:** no   **Tree:** no   **Naming:** `autoname: hash` (random hash, `naming_rule: "Random"`)
**Module:** HR

Child doctype of [[Expense Claim]] (table field `taxes`). One row per tax/charge line applied on top of the claim's sanctioned amount.

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| account_head | Account Head | Link | Account | yes | - | - | `allow_on_submit`, in_list_view, `columns: 2` |
| rate | Rate | Float | - | - | - | - | in_list_view, `columns: 2`; percentage rate applied to `total_sanctioned_amount` |
| tax_amount | Amount | Currency | currency | - | - | - | `non_negative`, in_list_view, `columns: 2`; auto-computed from `rate` if `rate` set, else manually entered |
| base_tax_amount | Amount (Company Currency) | Currency | Company:company:default_currency | - | - | yes | `columns: 2` |
| total | Total | Currency | currency | - | - | yes | in_list_view, `columns: 2`; = `tax_amount + total_sanctioned_amount` (running total, not cumulative across rows) |
| base_total | Total (Company Currency) | Currency | Company:company:default_currency | - | - | yes | `columns: 2` |
| description | Description | Small Text | - | yes | - | - | auto-filled client-side from `account_head`'s label (everything before the last `" - "` segment) if empty |
| cost_center | Cost Center | Link | Cost Center | - | `:Company` (site/company default) | - | `allow_on_submit` |
| project | Project | Link | Project | - | - | - | `allow_on_submit` |

`track_changes: 1` — this child doctype's row-level edits are versioned/audited. `sort_order: ASC` (unlike most other child tables here which sort `DESC`).

## Child Tables

None (leaf child table).

## State Machine

N/A.

## Validation Rules (exact, in execution order)

None on this doctype's own controller (`ExpenseTaxesandCharges(Document): pass`). All computation happens in the parent (`Expense Claim.calculate_taxes`, see `Expense Claim.md` Business Logic #2).

## Business Logic / Calculations

See `Expense Claim.md` Business Logic #2 (`calculate_taxes`) for the authoritative server-side algorithm. Client-side (`expense_claim.js`, `Expense Taxes and Charges` events) mirrors this for live UI feedback:
- `rate` change: IF row has no `amount` set yet, `tax_amount = total_sanctioned_amount * (rate / 100)`; then recompute `total` for the row and re-derive `total_taxes_and_charges` across all rows and the claim's `grand_total`.
- `tax_amount` change: recompute `total` for the row, then cascade the same re-derivation.
- `account_head` change: if `description` is empty, auto-fill it from the account's display label with the trailing `" - <company abbr>"` segment stripped.

## Lifecycle Hooks (exact)

None (no-op controller).

## Whitelisted / API Methods

None on this doctype directly (consumed by parent's whitelisted `calculate_taxes`, see `Expense Claim.md`).

## Permissions

None declared at the child-table level (`permissions: []`) — governed by parent `Expense Claim` permissions.

## Scheduled Jobs Touching This Doctype

None directly; included in `accounting_dimension_doctypes` (`hrms/hooks.py`), so ERPNext's accounting-dimension framework applies configured dimension fields to rows here too.

## Port Notes

- Model as an owned child row: `expense_taxes_and_charges(parent_expense_claim_id FK, account_head_id FK, rate, tax_amount, base_tax_amount, total, base_total, description, cost_center_id FK NULL, project_id FK NULL, idx)`.
- `track_changes: 1` on a CHILD table is unusual (most child tables here don't set it) — Frappe versions the row's field changes into the standard `Version` doctype alongside the parent. A port needs an explicit audit-log table/mechanism if it wants row-level history for tax lines specifically, since it won't come for free the way it would on a submittable parent doctype.
- `cost_center` defaults to `":Company"` — Frappe's special default syntax meaning "use the current session/site default Cost Center", NOT a fetch from the `Expense Claim.company`'s own cost center field (that pattern, `fetch_from: company.cost_center`, is used elsewhere e.g. on `Expense Claim.cost_center` itself). A port must replicate this exact default source distinction.

## Related Doctypes

- [[Expense Claim]] — parent doctype; this child table holds its `taxes` line items.
