---
type: flow
tags: [hrms, flow]
roles: [Employee, Leave Approver, HR User, HR Manager]
---

# Leave Request Lifecycle

## Flow

```mermaid
flowchart TD
    LT[Leave Type defined\n(is it paid? earned? encashable? carry-forward rules?)] --> LP[Leave Policy groups Leave Types with allocation amounts]
    LP --> LPA[Leave Policy Assignment attaches policy to an Employee for a Leave Period]
    LPA --> LA[Leave Allocation created\n(new_leaves_allocated per Leave Type)]
    LA --> App[Employee submits Leave Application]
    App --> Val{Validate: sufficient balance?\noverlapping leave?\nwithin block/holiday rules?}
    Val -->|fails| Err[Blocked with validation error]
    Val -->|passes| Route[Routed to Leave Approver\n(Employee.leave_approver or Department Approver fallback)]
    Route --> Dec{Approve or Reject?}
    Dec -->|Reject| Rej[Leave Application: Rejected]
    Dec -->|Approve| Sub[Leave Application submitted]
    Sub --> Ledger[Leave Ledger Entry created\n(debits the allocation)]
    Ledger --> Att[Attendance auto-synced for the leave dates]
    LA -.->|expires at period end| Exp[process_expired_allocation\n(daily_long scheduler)]
    Exp --> Enc[generate_leave_encashment\n(daily_long scheduler, if policy allows encashment)]
    Enc --> LE[Leave Encashment created for unused paid leave]
```

## Roles at Each Step

| Step | Role |
|---|---|
| Define [[Leave Type]] / [[Leave Policy]] | [[HR Manager]] |
| Assign policy to employees | [[HR User]] / [[HR Manager]] (or automated [[Leave Policy Assignment]] tool) |
| Allocate leave (manual or bulk via [[Leave Control Panel]]) | [[HR User]] |
| Apply for leave | [[Employee]] (self only) |
| Approve/reject | [[Leave Approver]] (scoped) |
| Handle expiry/encashment | System (scheduled jobs), reviewed by [[HR User]] |

## Why This Chain of Doctypes, Not Just "Leave Application"

- **Leave Type is separated from Leave Policy** because the same Leave Type (e.g.
  "Sick Leave") is reused across many policies with different allocation amounts per
  employee grade/location — duplicating the leave-type definition per policy would
  make a company-wide rule change (e.g. sick leave becomes encashable) require editing
  every policy instead of one Leave Type record.
- **[[Leave Policy Assignment]] is a separate transaction from [[Leave Allocation]]** because
  assigning a policy is a one-time HR action per employee per period, while Leave
  Allocation is the actual balance-bearing ledger; keeping them separate lets HR
  re-run/adjust allocations (e.g. mid-year grade change) without re-doing the policy
  assignment.
- **[[Leave Ledger Entry]], not a running balance field, records usage** — an
  append-only ledger (allocations as credits, applications as debits) is auditable and
  recomputable; a single mutable "balance" field on Employee would be fast to read but
  impossible to reconstruct or audit if a Leave Application is later cancelled or a
  Leave Allocation corrected.
- **[[Attendance]] sync on leave approval** exists so a manager checking today's Attendance
  doesn't see an approved-leave day as an unexplained absence — the two records must
  agree, so [[Leave Application]]'s on_submit logic writes/updates the corresponding
  Attendance record rather than leaving that reconciliation to manual entry.
- **Expiry and encashment run as scheduled jobs**, not on-demand, because "did this
  year's unused leave expire" and "should it convert to a payout" are calendar-driven
  facts that must apply uniformly to everyone on the relevant [[Leave Period]] boundary,
  not something that should depend on someone remembering to trigger it per employee.

See also: [[Hire to Retire Overview]], [[01-Modules/Leaves/_Overview|Leaves Module]],
[[Leave Approver]], [[Leave Application]], [[Leave Allocation]], [[Leave Ledger Entry]].
