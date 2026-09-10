---
type: doctype
module: Expenses
roles: [HR Manager, Employee, Expense Approver, HR User]
tags: [hrms, doctype]
---

# Expense Claim

An employee's request for reimbursement of money spent on the company's behalf (travel, meals, supplies, etc.), routed to an approver, and — once approved — posted to the general ledger and paid out. This is the accounting-facing heart of the Expenses module: it is an `AccountsController` subclass, meaning it produces real GL Entries, not just an HR record.

## Key Fields

| Field | Type | Purpose |
|---|---|---|
| `employee` / `employee_name` / `department` / `company` | Link/Data | Claimant and org context (fetched from Employee). |
| `expense_approver` | Link (User) | Who must approve; drives `share_doc_with_approver`. |
| `approval_status` | Select (Draft/Approved/Rejected/Cancelled) | The approver's decision — distinct from `status`, which is the payment-lifecycle state. |
| `expenses` (child) | Table → [[Expense Claim Detail]] | Line items claimed. |
| `advances` (child) | Table → [[Expense Claim Advance]] | Employee Advance amounts being adjusted against this claim. |
| `taxes` (child) | Table → [[Expense Taxes and Charges]] | Tax/charge rows on top of sanctioned amount. |
| `total_claimed_amount` / `total_sanctioned_amount` | Currency, read-only | Sum of claimed vs. approver-sanctioned amounts across `expenses`. |
| `grand_total` | Currency, read-only | `total_sanctioned_amount + total_taxes_and_charges - total_advance_amount` — the net payable. |
| `total_amount_reimbursed` | Currency, read-only, no_copy | Actually paid so far, recalculated from linked Journal Entry / Payment Entry records. |
| `is_paid` | Check | Whether payment is/was made directly (vs. through a separate Payment Entry). |
| `payable_account` / `cost_center` / `mode_of_payment` / `bank_or_cash_account` | Link | Accounting posting targets. |
| `status` | Select (Draft/Paid/Unpaid/Rejected/Submitted/Cancelled), read-only | Derived payment-lifecycle status, computed in `set_status()`. |
| `task` / `project` / `delivery_trip` | Link | Optional cost attribution / origin linkage. |

## Relationships

- [[Employee]] — claimant, via `employee`.
- [[Expense Claim Type]] — indirectly, via each [[Expense Claim Detail]] row's `expense_type`.
- [[Expense Claim Detail]] — child table `expenses`; the actual line items and sanctioned amounts.
- [[Expense Claim Advance]] — child table `advances`; links to Employee Advance for adjustment against this claim.
- [[Expense Taxes and Charges]] — child table `taxes`.
- Employee Advance — via `advances[].employee_advance`; `update_claimed_amount_in_employee_advance()` calls `Employee Advance.update_claimed_amount()` on submit/cancel.
- Journal Entry / Payment Entry / Unreconcile Payment — linked from: `hrms/hooks.py` registers `update_payment_for_expense_claim` as a `doc_events` handler on all three, so paying/cancelling a payment against this claim updates `total_amount_reimbursed` and `status` here.
- Task / Project — `update_task_and_project()` recomputes `Task.total_expense_claim` and calls `Project.update_project()` for every linked project on submit/cancel.
- Delivery Trip — `make_expense_claim_for_delivery_trip()` maps a Delivery Trip into a new Expense Claim.
- HR Settings — `prevent_self_expense_approval` single-value setting read in `validate_for_self_approval()`.

## Logic — What Happens and Why

**`after_insert`** — `notify_approver()` (from `PWANotificationsMixin`) fires a PWA notification to the approver immediately on creation, so approval isn't delayed by email latency.

**`validate()`** (runs on every save):
1. `validate_active_employee(self.employee)` — blocks claims for Inactive employees.
2. `set_employee_name(self)` — fills in `employee_name`.
3. `validate_sanctioned_amount()` — throws if any row's `sanctioned_amount > amount` (an approver cannot sanction more than what was claimed).
4. `calculate_total_amount()` — sums `amount`/`sanctioned_amount` across `expenses`; if `approval_status == "Rejected"`, forces every row's `sanctioned_amount` to 0 (a rejected claim pays nothing regardless of prior sanctioning).
5. `validate_advances()` — for each advance row, confirms the linked Employee Advance belongs to the same employee and currency (`validate_employee_advance_currency_and_account`), checks the advance account is of type Receivable (unless already paid against, in which case throws asking to redo the payment), and that `allocated_amount` doesn't exceed the advance's unclaimed balance; then sums `total_advance_amount` and validates it doesn't exceed sanctioned + taxes.
6. `set_expense_account(validate=True)` — resolves each expense row's `default_account` from [[Expense Claim Type]] + company via `get_expense_claim_account()`.
7. `set_default_accounting_dimension()` — fills mandatory accounting dimensions (company-scoped) on both the claim and its expense rows.
8. `calculate_taxes()` (whitelisted) — computes each tax row's `tax_amount` as `total_sanctioned_amount * rate / 100` (or takes a manually entered amount if `rate` is blank), sums `total_taxes_and_charges`, and derives `grand_total = sanctioned + taxes - advances`.
9. `set_status()` — recomputes the display `status` from `docstatus`/`approval_status`/payment state (see State/Flow below); doesn't persist unless `update=True`.
10. `validate_company_and_department()` — throws if the selected Department belongs to a different Company.
11. If `task` is set but `project` isn't, auto-fills `project` from the Task.
12. If `grand_total > 0` and there are advances, forces `is_paid = 0` — a claim with an outstanding balance after advance adjustment cannot be marked already-paid.

**`before_submit`** → `validate_for_self_approval()` — if HR Settings' `prevent_self_expense_approval` is enabled, the claim's own employee is the logged-in user, and no Workflow document is configured for Expense Claim, submission is blocked. This exists to prevent an employee from approving (submitting) their own reimbursement when no separate workflow enforces segregation of duties.

**`on_submit()`**:
- Throws if `approval_status` is still "Draft" — a claim cannot be submitted without an explicit Approved/Rejected decision.
- `update_task_and_project()` — recalculates linked Task/Project expense totals.
- `make_gl_entries()` — if `total_sanctioned_amount > 0`, posts GL entries: a credit to `payable_account` for the employee, debits to each expense row's `default_account`, credits to advance accounts for allocated advance amounts, debits for tax account heads, and (if `is_paid`) an immediate payment leg (debit payable / credit bank-cash). This is the real accounting side-effect — Expense Claim behaves like an invoice.
- `update_reimbursed_amount()` — recomputes `total_amount_reimbursed` from linked Journal Entry / Payment Entry records (or `grand_total` if `is_paid`), then calls `set_status(update=True)` to persist status.
- `update_claimed_amount_in_employee_advance()` — tells each linked Employee Advance to recompute its claimed amount.
- `create_exchange_gain_loss_je()` — if advances were paid in a different exchange rate than the claim's, books the FX gain/loss difference via a Journal Entry against `gain_loss_account`.

**`on_update_after_submit()`** — if `taxes[].account_head` or the `expenses` table changed after submit, validates the claim for repost eligibility and calls `repost_accounting_entries()` (from `AccountsController`) to regenerate GL entries — lets minor post-submit corrections (e.g. fixing a tax account) propagate to the ledger without a full amend.

**`on_cancel()`** — reverses GL entries (`make_gl_entries(cancel=True)`) if a payable account was set, recomputes reimbursed amount/status, updates linked advances' claimed amounts, and unlinks any Payment Entry references — full rollback of the submit-time side effects.

**`on_discard()`** — sets both `status` and `approval_status` to "Cancelled" directly in the DB, for a draft discarded before submission.

**`on_update()`** — `share_doc_with_approver()` grants the approver document-level submit permission if they lack it via role permissions (and revokes it from a previous approver if reassigned); `notify_approval_status()` sends a PWA notification when approval state changes.

**Cross-doctype payment sync** (`hrms/hooks.py` `doc_events`): Payment Entry, Journal Entry, and Unreconcile Payment all trigger `update_payment_for_expense_claim(doc, method)` on submit/cancel/on_update_after_submit — this walks the payment document's reference rows, finds any pointing at an Expense Claim, and calls `update_reimbursed_amount()` on it so the claim's paid/unpaid status always reflects the latest ledger reality regardless of which side (claim or payment) is touched first.

## Roles & Permissions

| Role | Can Do | Notes |
|---|---|---|
| [[HR Manager]] | Full (create/write/submit/cancel/amend/delete) + permlevel-1 read/write | Can approve for any employee. |
| [[HR User]] | Full (create/write/submit/cancel/amend/delete) + permlevel-1 read/write | Same broad rights as HR Manager. |
| [[Expense Approver]] | Full incl. submit/cancel/amend/delete, plus permlevel-1 read/write/delete | Distinct role specifically for approving; not restricted to a particular employee in the JSON — approver assignment is via the `expense_approver` field per-document with sharing (`share_doc_with_approver`). |
| [[Employee]] | create/write/read (no submit/cancel/delete at permlevel 0) | Employees can create/edit their own claims but cannot submit/approve — approval requires Expense Approver/HR Manager/HR User. Self-approval additionally blocked by `validate_for_self_approval()` when HR Settings' `prevent_self_expense_approval` is on and no workflow exists. |
| All | permlevel-1 read/print/email/export/share | Baseline read access at the restricted field level. |

## Mermaid: State/Flow

```mermaid
stateDiagram-v2
    [*] --> Draft: created (after_insert notifies approver)
    Draft --> Draft: approval_status stays Draft until approver acts
    Draft --> Submitted: submit (blocked if approval_status still Draft; before_submit checks self-approval)
    Submitted --> Rejected: approval_status = Rejected (sanctioned amounts zeroed)
    Submitted --> Unpaid: approval_status = Approved, total_sanctioned_amount > 0, not yet fully reimbursed
    Unpaid --> Paid: grand_total fully reimbursed (via is_paid, or matching Payment Entry/Journal Entry/advances)
    Submitted --> Cancelled: cancel (GL entries reversed, advances/task/project updated)
    Cancelled --> Amended: amend
    Draft --> Cancelled: discard (on_discard sets status+approval_status to Cancelled)
```
