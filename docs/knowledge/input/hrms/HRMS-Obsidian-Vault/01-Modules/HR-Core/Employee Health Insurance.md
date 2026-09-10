---
type: doctype
module: HR Core
roles: [HR Manager, HR User]
tags: [hrms, doctype]
---

# Employee Health Insurance

A simple master list of health insurance providers/plans that an organization offers, referenced from the Employee record so HR can track which insurance plan each employee is enrolled in.

## Key Fields

| Field | Type | Purpose |
|---|---|---|
| health_insurance_name | Data | The name of the insurance plan/provider; required, unique, used as the document's autoname. |

## Relationships

- [[Employee]] — Employee records link to this doctype to record the employee's enrolled health insurance plan (this doctype has no code of its own referencing Employee; the link runs from Employee's side).

## Logic — What Happens and Why

Pure master/setup data — the Python controller (`EmployeeHealthInsurance`) contains no logic (`pass` only). There is no validation, workflow, or lifecycle beyond standard Frappe CRUD: HR creates one record per insurance plan the company offers, and employees are assigned to one via a link field elsewhere. Uniqueness of `health_insurance_name` is enforced at the field level (`unique: 1`) to prevent duplicate plan entries. Not enforced in code beyond that.

## Roles & Permissions

| Role | Can Do | Notes |
|---|---|---|
| [[HR Manager]] | Read, Write, Create, Delete | Full management of the insurance plan list. |
| [[HR User]] | Read only | Can view/report/export/print/email but not create, edit, or delete plans. |

## Mermaid: State/Flow

No workflow states — a flat master list.

```mermaid
flowchart LR
    A[HR Manager creates plan] --> B[Available for selection on Employee]
    B --> C[HR Manager edits/deletes plan]
```
