---
type: flow
tags: [hrms, flow]
roles: [Employee, Expense Approver, HR User]
---

# Expense Claim Lifecycle

## Flow

```mermaid
flowchart TD
    ECT[Expense Claim Type defined\n(e.g. Travel, Meals, with default GL account)] --> EC[Employee creates Expense Claim\nwith Expense Claim Detail rows]
    EC --> Adv{Advance taken earlier?}
    Adv -->|yes| ECA[Expense Claim Advance linked\n(deducted from reimbursable total)]
    Adv -->|no| Sub
    ECA --> Sub[Employee submits]
    Sub --> SelfCheck{Self-approval allowed by HR Settings?}
    SelfCheck -->|no, and approver == submitter| Block[Blocked]
    SelfCheck -->|ok| Route[Routed to Expense Approver\n(Employee.expense_approver or Department Approver fallback)]
    Route --> Dec{Approve or Reject?}
    Dec -->|Reject| Rej[Expense Claim: Rejected]
    Dec -->|Approve| App[Expense Claim: Approved]
    App --> Pay[Payment Entry or Journal Entry created against the claim]
    Pay -->|on_submit hook| Update[update_payment_for_expense_claim\nmarks claim as Paid, updates outstanding amount]
    Pay -->|on_cancel hook| Revert[Reverts claim's paid status]
```

## Roles at Each Step

| Step | Role |
|---|---|
| Define [[Expense Claim Type]] | [[HR User]] / [[HR Manager]] |
| Create and submit claim | [[Employee]] (self only) |
| Approve/reject | [[Expense Approver]] (scoped) |
| Record payment | Accounts-side role (outside HRMS proper) |

## Why This Chain, Not a Direct Reimbursement Field

- **Expense Claim Type carries the default account**, not the claim itself, so
  accounting classification (which GL account a "Travel" expense hits) is decided once
  centrally and stays consistent across every employee's claims, rather than each
  employee's claim needing correct accounting knowledge.
- **[[Expense Claim Advance]] exists as its own link** because employees are sometimes
  given a cash/travel advance *before* incurring the expense — the claim then only
  needs to reconcile the difference, and keeping the advance as a separate linked
  record (rather than netting it silently) preserves an audit trail of "how much was
  advanced vs. how much was actually spent and reimbursed."
- **Approval is a distinct step from payment** (see the two separate `on_submit`
  hooks: [[Expense Claim]]'s own approval workflow, and Payment Entry/Journal Entry's
  `update_payment_for_expense_claim` hook back onto it) because "is this a legitimate
  expense" (a line-management judgment) and "has it actually been paid" (an accounting
  fact) are decided by different people at different times, and the system needs both
  as independently trackable states rather than collapsing them into one status field.
- **Self-approval is blocked by default, gated by an [[HR Settings]] toggle** — this is
  a basic internal-controls measure (no one signs off on their own spending) that HR
  can consciously override for specific contexts (e.g. very small teams) rather than a
  hardcoded, unchangeable rule.

See also: [[Hire to Retire Overview]], [[01-Modules/Expenses/_Overview|Expenses Module]],
[[Expense Approver]], [[Expense Claim]].
