---
type: flow
tags: [hrms, flow]
roles: [HR Manager, HR User, Employee]
---

# Payroll Run Lifecycle

## Flow

```mermaid
flowchart TD
    SC[Salary Component defined\n(earning/deduction, formula or fixed)] --> SS[Salary Structure\nassembles components into a pay template]
    SS --> SSA[Salary Structure Assignment\nattaches structure to one Employee from an effective date]
    SSA --> PE[Payroll Entry created for a period + employee set]
    PE --> Fetch[Fetches Payroll Employee Details matching filters\n(company, department, branch, designation)]
    Fetch --> Gen[Generates one Salary Slip per employee]
    Gen --> Calc[Salary Slip computes:\nSalary Detail rows from structure\n+ Additional Salary\n+ Employee Benefit Claim\n- Loan repayment (if lending app installed)\n- Tax via Income Tax Slab + Employee Tax Exemption Declaration/Proof Submission\n+/- Employee Other Income]
    Calc --> Rev[HR reviews Salary Slips]
    Rev --> Sub[Payroll Entry submitted]
    Sub --> Lock[All Salary Slips submitted/locked together]
    Lock --> Acct[Accounting entries queued\n(Journal Entry / Bank Payment)]
    Acct --> Pay[Bank/Payment processing outside or via ERPNext accounting]
    Pay --> JE[Journal Entry submit triggers\nunlink_ref_doc_from_salary_slip / withholding status update on cancel]
```

## Roles at Each Step

| Step | Role |
|---|---|
| Define [[Salary Component]] / [[Salary Structure]] | [[HR Manager]] |
| Assign structure to an employee | [[HR User]] / [[HR Manager]] |
| Declare/submit tax exemption info | [[Employee]] (self only) |
| Create and review [[Payroll Entry]] | [[HR User]] |
| Submit Payroll Entry (locks the period) | [[HR Manager]] |
| View own [[Salary Slip]] | [[Employee]] (read-only) |

## Why This Chain, Not a Direct "Compute Pay" Button

- **Salary Component is separated from Salary Structure** so the same building block
  (e.g. "Basic Pay," "HRA," "Provident Fund") can be reused across many structures with
  different formulas/amounts — a statutory rate change (e.g. a new PF percentage) is
  edited once at the component level and every structure referencing it recalculates
  consistently, rather than needing per-structure edits.
- **[[Salary Structure Assignment]] carries an effective date**, not just "current
  structure," because compensation changes (raises, promotions) must apply from a
  specific date without rewriting payroll history — old Salary Slips must still reflect
  the structure that was actually in force when they were generated.
- **Payroll Entry batches many Salary Slips as one submittable transaction** rather
  than submitting each slip independently, because a payroll run has to be all-or-
  nothing at the accounting level (the company can't post partial payroll for a
  period) and because bulk actions (bank file generation, GL posting) operate on the
  whole batch.
- **Tax calculation reads three separate inputs** ([[Income Tax Slab]] for the rate table,
  [[Employee Tax Exemption Declaration]] for the employee's plan,
  [[Employee Tax Exemption Proof Submission]] for verified actuals) instead of one number, because tax law
  requires periodic withholding based on an *estimate* early in the year and a
  *reconciled actual* near year-end — collapsing these into one field would either
  over-withhold all year or under-withhold and leave a shortfall at filing time. See
  [[01-Modules/Tax-Benefits/_Overview|Tax & Benefits]] for the full reasoning.
- **Journal Entry doc_events, not Salary Slip alone, finalize payment status** — because
  actual money movement is an accounting-side event; Salary Slip records what is owed,
  Journal Entry/Payment Entry record what was actually paid, and hooking Journal Entry
  submit/cancel back into Salary Slip/Salary Withholding keeps HR's view of "has this
  been paid" accurate without HR needing to manually reconcile against accounting.

See also: [[Hire to Retire Overview]], [[01-Modules/Payroll/_Overview|Payroll Module]],
[[Salary Structure Assignment]], [[Salary Slip]], [[Payroll Entry]].
