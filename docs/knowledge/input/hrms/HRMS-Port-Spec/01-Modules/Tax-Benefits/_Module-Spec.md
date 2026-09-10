# Tax & Benefits — Module Spec

> [!note] Conceptual grouping only — files live under Payroll
> These doctypes physically live under `hrms/payroll/doctype/` in source, and their
> full per-doctype port specs (complete field tables, validation order, algorithms,
> permissions) are written under `../Payroll/`, not duplicated here, to avoid two
> copies drifting apart. This file exists only as a navigation pointer for anyone
> looking for "tax" doctypes under this name.

## Doctypes (see `01-Modules/Payroll/` for full specs)

- [[Income Tax Slab]]
- [[Income Tax Slab Other Charges]]
- [[Taxable Salary Slab]]
- [[Employee Tax Exemption Category]]
- [[Employee Tax Exemption Sub Category]]
- [[Employee Tax Exemption Declaration]]
- [[Employee Tax Exemption Declaration Category]]
- [[Employee Tax Exemption Proof Submission]]
- [[Employee Tax Exemption Proof Submission Detail]]
- [[Employee Other Income]]

## Why It's Split Out Conceptually Anyway

Even though these doctypes ship inside Payroll's source folder, they form a
self-contained sub-problem worth designing as a distinct service/module boundary in a
port: statutory rate definition (Income Tax Slab + Taxable Salary Slab), exemption
master data (Category/Sub Category), and the employee-side estimate-then-reconcile
flow (Declaration → Proof Submission), all consumed by Salary Slip but independently
testable and independently owned by tax/compliance logic rather than core payroll
run logic. See `01-Modules/Payroll/_Module-Spec.md` for how these fit into the
recommended relational schema, and `01-Modules/Regional/` for the India-specific
overrides (HRA exemption, marginal relief tax) layered on top of this module's base
calculations.
