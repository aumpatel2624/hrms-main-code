# Expenses — Module Spec

## Purpose

The Expenses module lets employees submit out-of-pocket expense claims for approval and reimbursement, optionally offsetting them against previously-paid Employee Advances, applying taxes/charges on top of the sanctioned amount, and posting the resulting accounting entries (payable, expense, tax, and payment/advance-settlement GL lines) once approved and submitted.

## Doctype List

| Doctype | Purpose |
|---|---|
| [[Expense Claim]] | The submittable parent document: one employee's claim for a set of expenses, taxes, and advance offsets, with approval workflow and GL posting. |
| [[Expense Claim Type]] | Master/setup data: named categories of expense (e.g. "Travel", "Meals") with a default GL account per company. |
| [[Expense Claim Account]] | Child table of `Expense Claim Type`: one (Company, Default Account) pair per row. |
| [[Expense Claim Detail]] | Child table of `Expense Claim`: individual expense line items (date, type, claimed vs sanctioned amount). |
| [[Expense Claim Advance]] | Child table of `Expense Claim`: links a paid Employee Advance and the amount of it being allocated/claimed against this claim. |
| [[Expense Taxes and Charges]] | Child table of `Expense Claim`: tax/charge lines computed against the claim's sanctioned total. |

Not covered here (owned by other agents, referenced by name only): `Employee Advance` (Payroll/Tax-Benefits agent).

## Recommended Target Schema Shape

```
expense_claim_type (
  id PK,                    -- or keep expense_type as natural PK if preserving Frappe semantics
  expense_type          UNIQUE NOT NULL,
  description,
  deferred_expense_account  BOOLEAN DEFAULT false
)

expense_claim_account (
  id PK,
  expense_claim_type_id FK -> expense_claim_type,
  company_id FK -> company,
  default_account_id FK -> account,
  idx,
  UNIQUE (expense_claim_type_id, company_id)   -- enforces "same company entered once" rule
)

expense_claim (
  id PK,                       -- naming_series-generated business key (HR-EXP-YYYY-#####) kept as a separate unique code if natural-key naming is desired
  naming_series,
  employee_id FK -> employee,
  employee_name,
  department_id FK -> department NULL,
  expense_approver_user_id FK -> user NULL,
  approval_status ENUM('Draft','Approved','Rejected','Cancelled') DEFAULT 'Draft',
  currency_id FK -> currency,
  exchange_rate DECIMAL,
  posting_date DATE NOT NULL,
  is_paid BOOLEAN DEFAULT false,
  mode_of_payment_id FK -> mode_of_payment NULL,
  bank_or_cash_account_id FK -> account NULL,
  payable_account_id FK -> account NULL,
  clearance_date DATE NULL,
  remark TEXT NULL,
  company_id FK -> company NOT NULL,
  project_id FK -> project NULL,
  cost_center_id FK -> cost_center NULL,
  task_id FK -> task NULL,
  delivery_trip_id FK -> delivery_trip NULL,
  vehicle_log_id FK -> vehicle_log NULL,
  total_claimed_amount, base_total_claimed_amount,
  total_sanctioned_amount, base_total_sanctioned_amount,
  total_taxes_and_charges, base_total_taxes_and_charges,
  total_advance_amount, base_total_advance_amount,
  grand_total, base_grand_total,
  total_amount_reimbursed,
  total_exchange_gain_loss,
  gain_loss_account_id FK -> account NULL,
  status ENUM('Draft','Paid','Unpaid','Rejected','Submitted','Cancelled') DEFAULT 'Draft',
  docstatus SMALLINT DEFAULT 0,   -- 0 Draft / 1 Submitted / 2 Cancelled
  amended_from_id FK -> expense_claim NULL,
  created_at, updated_at, owner
)

expense_claim_detail (            -- owned rows, delete-with-parent
  id PK, expense_claim_id FK -> expense_claim, idx,
  expense_date, expense_type_id FK -> expense_claim_type,
  default_account_id FK -> account NULL,
  description,
  amount, base_amount,
  sanctioned_amount, base_sanctioned_amount,
  cost_center_id FK -> cost_center NULL,
  project_id FK -> project NULL
)

expense_taxes_and_charges (       -- owned rows
  id PK, expense_claim_id FK -> expense_claim, idx,
  account_head_id FK -> account,
  rate, tax_amount, base_tax_amount, total, base_total,
  description, cost_center_id FK -> cost_center NULL, project_id FK -> project NULL
)

expense_claim_advance (           -- owned rows
  id PK, expense_claim_id FK -> expense_claim, idx,
  employee_advance_id FK -> employee_advance,
  reference_type ENUM('','Payment Entry','Journal Entry'),
  reference_id BIGINT NULL,       -- polymorphic; app-level integrity only
  posting_date,
  advance_paid, base_advance_paid,
  exchange_rate, exchange_gain_loss,
  unclaimed_amount, base_unclaimed_amount,
  return_amount,
  allocated_amount, base_allocated_amount,
  advance_account_id FK -> account NULL
)
```

`Expense Claim Account` is a true join/config table (Type x Company -> Account); the other three child tables (`Expense Claim Detail`, `Expense Taxes and Charges`, `Expense Claim Advance`) are owned rows (cascade-delete with the parent `Expense Claim`, no independent identity or permissions).

## Module-Wide Invariants

1. An `Expense Claim` cannot be submitted with `approval_status = "Draft"` — it must be explicitly Approved or Rejected first (by a human, a shared-permission approver, or a Frappe Workflow).
2. `total_advance_amount` allocated across all `Expense Claim Advance` rows can never exceed `total_sanctioned_amount + total_taxes_and_charges` for the claim.
3. An `Expense Claim Advance` row's `allocated_amount` can never exceed that row's own `unclaimed_amount - return_amount` (the advance's remaining claimable balance at the time of allocation).
4. An `Employee Advance` can only be claimed by an `Expense Claim` in the SAME currency as the advance.
5. `Expense Claim` currency must resolve to the employee's `salary_currency` by default, but can differ from the company's default currency — all "current-currency" amounts have a paired "Company Currency" (`base_*`) shadow field kept in sync via `exchange_rate`.
6. GL entries are only posted (`make_gl_entries`) when `total_sanctioned_amount > 0` — a claim with zero sanctioned amount across all lines never touches the ledger even once submitted.
7. `total_amount_reimbursed` and derived `status` (Paid/Unpaid) are NOT purely a function of the Expense Claim's own fields — they depend on external Payment Entry / Journal Entry records referencing this claim, and must be recomputed reactively whenever those external records are submitted, cancelled, or amended (see `update_payment_for_expense_claim` cross-doctype hook in `Expense Claim.md`). A port must replicate this reactive recompute, not just a one-time calculation at claim-submit time.
8. Cost Center is enforced as effectively mandatory on every `Expense Claim Detail` row at GL-posting time, even though the schema does not mark the field `reqd` — enforcement happens later, inside `get_gl_entries`/`validate_account_details`, not at basic field-level validation.
