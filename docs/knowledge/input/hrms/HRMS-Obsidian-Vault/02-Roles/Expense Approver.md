---
type: role
tags: [hrms, role]
---

# Expense Approver

The [[Expense Claim]] equivalent of [[Leave Approver]] — scoped per employee via the
Employee's `expense_approver` field (with the same [[Department Approver]] fallback
pattern), not a blanket company-wide right.

## What This Role Can Do

| Doctype | Action | Scope |
|---|---|---|
| [[Expense Claim]] | approve/reject, read | only for employees who name them as `expense_approver` |

Approval sets the claim's approval status; actual payment still requires a linked
Payment Entry/Journal Entry, which is an Accounts role's job, not the Expense
Approver's — this role only decides "is this a legitimate business expense," not
"has it been paid."

## HR Settings Interaction

Whether a user can approve their **own** expense claim (i.e., an Expense Approver
submitting their own [[Expense Claim]]) is governed centrally by a self-approval
toggle on [[HR Settings]] — approving your own claim is normally blocked unless that
policy flag is explicitly enabled. This is enforced in `Expense Claim`'s controller,
not by the role system alone.

## Why Scoped Per Employee, Not Global

Same reasoning as [[Leave Approver]]: expense approval is a line-management
responsibility tied to who actually manages that employee's spending, not a blanket
finance/HR power. Keeping it scoped means a manager only ever approves their own
team's claims, and the [[Department Approver]] fallback keeps the chain from breaking
when an employee's specific approver field is left blank.

## Mermaid: Approval + Payment Split

```mermaid
flowchart LR
    Emp[Employee submits Expense Claim] --> Check{expense_approver set?}
    Check -->|yes| Named[Named Expense Approver]
    Check -->|no| Dept[Department Approver]
    Named --> Decision{Approve or Reject}
    Dept --> Decision
    Decision -->|Approve| Approved[Expense Claim: Approved]
    Decision -->|Reject| Rejected[Expense Claim: Rejected]
    Approved --> Pay[Payment Entry / Journal Entry\n(separate Accounts step)]
    Pay -->|on_submit hook| Approved
```

See also: [[Expense Claim]], [[Department Approver]], [[Expense Claim Lifecycle]].
