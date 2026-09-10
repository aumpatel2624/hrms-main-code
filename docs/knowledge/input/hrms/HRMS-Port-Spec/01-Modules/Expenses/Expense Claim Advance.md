# Expense Claim Advance

**Source:** `hrms/hr/doctype/expense_claim_advance/expense_claim_advance.json`, `expense_claim_advance.py`
**Submittable:** no   **Tree:** no   **Naming:** child table (random-hash row name)
**Module:** HR

Child doctype of [[Expense Claim]] (table field `advances`). Links one Employee Advance's paid-but-unclaimed balance to this claim and records how much of it is being allocated/claimed here.

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| employee_advance | Employee Advance | Link | Employee Advance | yes | - | - | `no_copy`, in_list_view, `columns: 2` |
| posting_date | Posting Date | Date | - | - | - | yes | in_list_view |
| advance_paid | Advance Paid | Currency | currency | - | - | yes | in_list_view; amount actually paid out on the advance |
| base_advance_paid | Advance Paid (Company Currency) | Currency | Company:company:default_currency | - | - | yes | `print_hide` |
| exchange_rate | Exchange Rate | Float | - | - | - | yes | precision 9, `print_hide`; the ADVANCE's own exchange rate at time of payment (distinct from the claim's `exchange_rate`) |
| exchange_gain_loss | Exchange Gain/Loss | Currency | Company:company:default_currency | - | - | yes | `depends_on: exchange_gain_loss`; set only by `create_exchange_gain_loss_je` (see `Expense Claim.md` Business Logic #6) |
| unclaimed_amount | Unclaimed Amount | Currency | currency | yes | - | yes | `no_copy`, in_list_view |
| base_unclaimed_amount | Unclaimed Amount (Company Currency) | Currency | Company:company:default_currency | - | - | yes | `no_copy` |
| return_amount | Returned Amount | Currency | currency | - | - | yes | `depends_on: return_amount` |
| allocated_amount | Allocated Amount | Currency | currency | - | - | - | `non_negative`, `no_copy`, in_list_view — the only field on this row a user actually edits |
| base_allocated_amount | Allocated Amount (Company Currency) | Currency | Company:company:default_currency | - | - | yes | `no_copy` |
| advance_account | Advance Account | Link | Account | - | - | - | `hidden` |
| reference_type | Reference Type | Select | `""`/`Payment Entry`/`Journal Entry` | - | - | yes | `no_copy`; which voucher type actually paid the advance |
| reference_name | Reference Name | Dynamic Link | (dynamic via `reference_type`) | - | - | yes | `no_copy` |
| payment_entry_reference | Payment Entry Reference | Data | - | - | - | yes | `hidden`, `no_copy`, `print_hide` — legacy/unused-looking field, not populated anywhere in the traced controller code |

`quick_entry: 1`.

## Child Tables

None (leaf child table).

## State Machine

N/A.

## Validation Rules (exact, in execution order)

None on this doctype's own controller (`ExpenseClaimAdvance(Document): pass`). All validation happens on the parent (`Expense Claim.validate_advances`, see `Expense Claim.md` Business Logic #3 and Validation #5).

## Business Logic / Calculations

Populated by `Expense Claim.get_expense_claim_advances()` (see `Expense Claim.md` Whitelisted Methods section) when advances are auto-fetched for an employee, or synced field-by-field client-side when a user manually picks an `employee_advance` in a blank row (`expense_claim.js`, `Expense Claim Advance.employee_advance` handler — calls the same `get_advances` API with an `advance_id` filter and copies the single returned row's fields onto the child row).

Participates in parent Business Logic #3 (`validate_advances`) and #6 (`create_exchange_gain_loss_je`), and in `get_gl_entries` (Business Logic #5, step 4) which posts a credit to `advance_account` for `allocated_amount` when the claim submits.

## Lifecycle Hooks (exact)

None (no-op controller). On parent `Expense Claim.on_submit`/`on_cancel`, `update_claimed_amount_in_employee_advance()` iterates these rows and calls `Employee Advance.update_claimed_amount()` for each referenced advance (Employee Advance doctype is out of scope for this module — documented under Payroll/Tax-Benefits agent's coverage; reference by name only).

## Whitelisted / API Methods

None on this doctype directly.

## Permissions

None declared at the child-table level (`permissions: []`) — governed by parent `Expense Claim` permissions.

## Scheduled Jobs Touching This Doctype

None.

## Port Notes

- Model as an owned child row: `expense_claim_advance(parent_expense_claim_id FK, employee_advance_id FK, reference_type, reference_name, posting_date, advance_paid, base_advance_paid, exchange_rate, exchange_gain_loss, unclaimed_amount, base_unclaimed_amount, return_amount, allocated_amount, base_allocated_amount, advance_account_id FK NULL, payment_entry_reference, idx)`.
- `reference_type`/`reference_name` is a polymorphic (Dynamic Link) reference to whichever voucher (Payment Entry or Journal Entry) actually paid the Employee Advance — a relational port needs either two nullable FK columns or a `(type, id)` pair with app-level integrity checks (no DB-level FK possible across two tables).
- `payment_entry_reference` field appears vestigial — not read or written anywhere in the traced `.py`/`.js` logic for this doctype or its parent. Flagging as an unused/legacy field rather than inventing a purpose for it.

## Related Doctypes

- [[Expense Claim]] — parent doctype; this child table holds its `advances` allocation rows.
- Employee Advance — referenced by `employee_advance`/`advance_account`, but owned by the Payroll/Tax-Benefits module and not yet ported in this repo; no matching file exists to wikilink.
