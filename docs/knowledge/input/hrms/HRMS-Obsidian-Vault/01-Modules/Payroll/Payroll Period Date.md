---
type: doctype
module: Payroll
roles: []
tags: [hrms, doctype]
---

# Payroll Period Date

A pure child-table row representing one sub-date-range (`start_date`/`end_date` pair) inside the `periods` table field of [[Payroll Period]]. It exists as an optional finer-grained breakdown of a Payroll Period's overall date span (the field is a hidden section in the parent form by default), but no core Payroll/HR controller logic in this codebase reads or writes it — it is schema-only scaffolding.

## Key Fields

| Field | Type | Purpose |
|---|---|---|
| `start_date` | Date | Start of the sub-period row. |
| `end_date` | Date | End of the sub-period row. |

## Relationships

- [[Payroll Period]] — parent doctype; this table is the `periods` field on Payroll Period.

## Logic — What Happens and Why

`PayrollPeriodDate` has no overridden methods (`pass`-only controller). No `validate`, `on_update`, or cross-doctype side effects exist in code. The parent [[Payroll Period]]'s `validate()` does not iterate or validate rows of this child table. It functions purely as a data container field that a user could optionally populate for reference; no reader of this table was found elsewhere in `hrms`.

## Roles & Permissions

Inherits parent doctype's permissions ([[Payroll Period]]) — not independently permissioned in code (empty `permissions` array in JSON, standard for child tables).

## Mermaid: State/Flow

```mermaid
flowchart LR
    A[Payroll Period form] -->|user adds row to periods table| B[Payroll Period Date row created]
    B -->|saved with parent| C[Persisted as child record, parenttype=Payroll Period]
    C -.->|no controller logic reads this data| D[Data retained but not consumed by business logic]
```
