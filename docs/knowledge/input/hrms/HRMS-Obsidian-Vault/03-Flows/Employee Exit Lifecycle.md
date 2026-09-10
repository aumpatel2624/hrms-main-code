---
type: flow
tags: [hrms, flow]
roles: [HR User, HR Manager, Employee]
---

# Employee Exit Lifecycle

## Flow

```mermaid
flowchart TD
    Trigger[Resignation / termination decided] --> ES[Employee Separation created\nfrom an Employee Separation Template]
    ES --> Boarding[Offboarding activities tracked\n(mirrors Employee Boarding Activity pattern)]
    ES --> EI[Exit Interview scheduled/filled\nby the departing Employee]
    ES --> Withhold{Investigation or dispute?}
    Withhold -->|yes| SW[Salary Withholding created\npauses final payout]
    Withhold -->|no| FF
    SW --> FF[Full and Final Statement created]
    FF --> Outstanding[Full and Final Outstanding Statement\npulls unsettled dues: loans, advances, unreturned assets]
    FF --> Assets[Full and Final Asset\ntracks company property to be returned]
    FF --> LeaveEnc[Leave Encashment for unused paid leave]
    FF --> Grat[Gratuity computed via Gratuity Rule/Gratuity Rule Slab\nif tenure meets minimum eligibility]
    Outstanding & Assets & LeaveEnc & Grat --> Settle[Full and Final Statement submitted]
    Settle --> JEHook[Journal Entry submit hook:\nupdate_full_and_final_statement_status]
    JEHook --> Closed[Employee status: Left]
```

## Roles at Each Step

| Step | Role |
|---|---|
| Initiate Separation | [[HR User]] / manager |
| Fill Exit Interview | [[Employee]] (self) |
| Decide on [[Salary Withholding]] | [[HR Manager]] |
| Compile [[Full and Final Statement]] | [[HR User]] |
| Submit Full and Final Statement | [[HR Manager]] |

## Why Exit Is Its Own Multi-Doctype Process, Not a Status Flag

- **[[Employee Separation]] is a full document, not just setting Employee's status to
  "Left"**, because an exit has its own workflow (notice period, offboarding
  checklist, clearance) that needs to complete *before* the employee's status
  actually changes — the [[Employee]] `on_trash`/status-change hooks
  (`update_employee_transfer`, related overrides) depend on Separation reaching the
  right state first, not the other way around.
- **[[Full and Final Statement]] aggregates multiple otherwise-independent balances**
  (leave encashment, gratuity, outstanding loans/advances, unreturned assets) because
  final settlement legally/financially has to net *all* of these against each other in
  one document — you can't gratuity-pay someone who still owes the company for an
  unreturned laptop without that showing up in the same settlement.
- **[[Salary Withholding]] exists as an explicit pause mechanism** rather than just delaying
  Full and Final Statement creation, because sometimes a separation needs to proceed
  (record the departure, run offboarding) while the *payment* specifically stays on
  hold pending an investigation — decoupling "employee has left" from "employee has
  been paid out" is necessary because those can legitimately happen at different times.
- **[[Gratuity]] computation is rule-driven** ([[Gratuity Rule]] + [[Gratuity Rule Slab]],
  with country-specific presets seeded by [[India - Gratuity Rule Setup]] and
  [[UAE - Gratuity Rules]]) rather than a fixed formula, because gratuity eligibility
  and calculation are statutory and vary by country/region — encoding it as
  configurable rules rather than hardcoded logic is what lets one codebase serve
  multiple jurisdictions' legal requirements.
- **Journal Entry submission, not Full and Final Statement submission alone, closes
  the loop** (`update_full_and_final_statement_status` doc_event) because — same
  reasoning as Payroll and Expense Claim — recording what's owed and recording that it
  was actually paid are different facts owned by different documents.

See also: [[Hire to Retire Overview]], [[Full and Final Statement]],
[[Employee Separation]], [[Gratuity]], [[01-Modules/Regional/_Overview|Regional Module]].
