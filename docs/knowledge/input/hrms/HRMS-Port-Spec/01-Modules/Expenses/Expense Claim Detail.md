# Expense Claim Detail

**Source:** `hrms/hr/doctype/expense_claim_detail/expense_claim_detail.json`, `expense_claim_detail.py`
**Submittable:** no   **Tree:** no   **Naming:** child table (random-hash row name)
**Module:** HR

Child doctype of [[Expense Claim]] (table field `expenses`). One row per individual expense line item within a claim.

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| expense_date | Expense Date | Date | - | - | Today | - | in_list_view |
| expense_type | Expense Claim Type | Link | [[Expense Claim Type]] | yes | - | - | in_list_view |
| default_account | Default Account | Link | Account | - | - | yes | `hidden`; `depends_on: expense_type`; auto-populated (see `Expense Claim.md` Validation #6 and API `get_expense_claim_account_and_cost_center`) |
| description | Description | Text Editor | - | - | - | - | in_list_view; auto-fetched from `Expense Claim Type.description` client-side if empty |
| amount | Amount | Currency | currency | yes | - | - | `non_negative`, `no_copy`, in_list_view |
| sanctioned_amount | Sanctioned Amount | Currency | currency | - | - | - | `non_negative`, in_list_view; must be `<= amount` (see `Expense Claim.md` Validation #3); force-reset to 0 if claim is Rejected |
| base_amount | Amount (Company Currency) | Currency | Company:company:default_currency | - | - | - | `non_negative`; computed = `amount * exchange_rate` |
| base_sanctioned_amount | Sanctioned Amount (Company Currency) | Currency | Company:company:default_currency | - | - | - | `non_negative`; `print_hide`; computed = `sanctioned_amount * exchange_rate` |
| cost_center | Cost Center | Link | Cost Center | conditionally | - | - | `allow_on_submit`; required at GL-posting time (see `Expense Claim.md` Validation #15) though not `reqd` in schema |
| project | Project | Link | Project | - | - | - | `allow_on_submit` |

## Child Tables

None (leaf child table).

## State Machine

N/A.

## Validation Rules (exact, in execution order)

None on this doctype's own controller (`ExpenseClaimDetail(Document): pass`). All validation happens on the parent `Expense Claim` (see `Expense Claim.md` Validation Rules #3-#4, #6, #15).

## Business Logic / Calculations

None of its own; participates in parent's `calculate_total_amount()` and `get_gl_entries()` (see `Expense Claim.md` Business Logic #1 and #5).

Client-side only (`expense_claim.js`, `Expense Claim Detail` events):
- `expense_type` change: fetches `default_account`/`cost_center` via `get_expense_claim_account_and_cost_center`; fetches `description` from `Expense Claim Type.description` if row's `description` is empty.
- `amount` change: mirrors `amount` into `sanctioned_amount` (i.e. sanctioned defaults to the full claimed amount when first entered) and recomputes both base-currency fields.
- `sanctioned_amount` change: triggers parent's `calculate_total`, `get_taxes`, `calculate_grand_total`, and recomputes its own base-currency field.
- `cost_center` change: copies that cost center into every other row of the `expenses` table (`copy_value_in_all_rows`).

## Lifecycle Hooks (exact)

None (no-op controller).

## Whitelisted / API Methods

None on this doctype directly (see `Expense Claim.get_expense_claim_account_and_cost_center` in `Expense Claim.md`).

## Permissions

None declared at the child-table level (`permissions: []`) — governed by parent `Expense Claim` permissions.

## Scheduled Jobs Touching This Doctype

None directly; included in `accounting_dimension_doctypes` (`hrms/hooks.py`) so ERPNext's accounting dimension framework applies configured dimension fields to rows of this doctype (see `Expense Claim.md` Validation #7, `set_default_accounting_dimension`).

## Port Notes

- Model as an owned child row table: `expense_claim_detail(parent_expense_claim_id FK, expense_date, expense_type_id FK, default_account_id FK NULL, description, amount, base_amount, sanctioned_amount, base_sanctioned_amount, cost_center_id FK NULL, project_id FK NULL, idx)`.
- The "amount defaults into sanctioned_amount on entry" behavior (client-only) has no server-side equivalent — a port with an API-only client (no browser form) must replicate this default explicitly, or leave `sanctioned_amount` unset/0 and rely on separate approval logic to set it. Flagging as a client-vs-server logic gap per spec ground rules.

## Related Doctypes

- [[Expense Claim]] — parent doctype; this child table holds its `expenses` line items.
- [[Expense Claim Type]] — each row's `expense_type` links to this doctype to resolve a default account.
