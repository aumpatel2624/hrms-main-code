---
type: graph
tags: [hrms, graph]
---

# Master Relationship Graph

The full vault, one module at a time, is too dense for one diagram — each module's
`_Overview.md` has its own detailed Doctype Map. This page is the **module-level**
zoom-out: how the modules hand off to each other, which is the layer that doesn't
appear inside any single module's overview.

```mermaid
flowchart LR
    subgraph Rec["Recruitment"]
        JR[Job Requisition] --> JO[Job Opening] --> JA[Job Applicant] --> IV[Interview] --> Off[Job Offer]
    end
    subgraph Core["HR Core"]
        Emp((Employee))
        Onb[Employee Onboarding]
        Sep[Employee Separation]
        FF[Full and Final Statement]
        Trf[Employee Transfer]
        Prm[Employee Promotion]
    end
    subgraph Lv["Leaves"]
        LA[Leave Allocation] --> LApp[Leave Application]
        LApp --> LLE[Leave Ledger Entry]
    end
    subgraph SA["Shift & Attendance"]
        Shift[Shift Assignment] --> Chk[Employee Checkin] --> Att[Attendance]
    end
    subgraph Pay["Payroll"]
        SSA[Salary Structure Assignment] --> Slip[Salary Slip]
        PEntry[Payroll Entry] --> Slip
        Grat[Gratuity]
    end
    subgraph Perf["Performance"]
        AC[Appraisal Cycle] --> Ap[Appraisal]
    end
    subgraph Exp["Expenses"]
        EClaim[Expense Claim]
    end
    subgraph Reg["Regional"]
        HRA[India HRA Exemption]
        UAEGr[UAE Gratuity Rules]
    end

    Off -->|accept, Employee created| Emp
    Emp --> Onb
    Emp --> SSA
    Emp --> LA
    Emp --> Shift
    Emp --> AC
    Emp --> EClaim
    Emp -->|initiates| Sep
    Sep --> FF
    LLE -.->|unused leave| FF
    Grat -.->|eligibility check| FF
    Att -.->|feeds hours into| Slip
    LApp -.->|approved leave syncs| Att
    HRA -.->|overrides tax calc inside| Slip
    UAEGr -.->|overrides formula inside| Grat
```

## Reading This Graph

- **Solid arrows** are direct document links (a Link field, or one doctype explicitly
  creating another).
- **Dotted arrows** are cross-module *logic* couplings — no direct Link field, but one
  module's controller code reads or writes the other's data (e.g. [[Attendance]] feeding
  [[Salary Slip]]'s payable-days calculation, or a Regional override patching into core
  Payroll/HR-Core logic via `erpnext.allow_regional`).

## Per-Module Detail

Each module's own `_Overview.md` has the full doctype-level map:
- [[01-Modules/HR-Core/_Overview|HR Core]]
- [[01-Modules/Leaves/_Overview|Leaves]]
- [[01-Modules/Payroll/_Overview|Payroll]]
- [[01-Modules/Recruitment/_Overview|Recruitment]]
- [[01-Modules/Performance/_Overview|Performance]]
- [[01-Modules/Shift-Attendance/_Overview|Shift & Attendance]]
- [[01-Modules/Tax-Benefits/_Overview|Tax & Benefits]]
- [[01-Modules/Expenses/_Overview|Expenses]]
- [[01-Modules/HR-Setup/_Overview|HR Setup]]
- [[01-Modules/Regional/_Overview|Regional]]

See also: [[Module Dependency Graph]], [[Why Graph - Reasoning Map]], [[Hire to Retire Overview]].
