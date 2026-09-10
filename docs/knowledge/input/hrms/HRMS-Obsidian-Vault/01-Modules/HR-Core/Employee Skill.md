---
type: doctype
module: HR Core
roles: []
tags: [hrms, doctype]
---

# Employee Skill

A child-table row on [[Employee Skill Map]] recording a single skill the employee has, its proficiency rating, and when it was last evaluated.

## Key Fields

| Field | Type | Purpose |
|---|---|---|
| `skill` | Link (Skill, required) | The skill being tracked. |
| `proficiency` | Rating (required) | Star-rating of the employee's competence in this skill. |
| `evaluation_date` | Date (default "Today") | When this proficiency was assessed. |

## Relationships

- [[Employee Skill Map]] — parent doctype (child table field `employee_skills`).
- [[Skill]] — linked from, via `skill`.

## Logic — What Happens and Why

The `EmployeeSkill(Document)` controller is a `pass`-only class — no server-side validation. Rows are created either manually or auto-seeded by the parent Employee Skill Map's client-side `designation` change handler (each seeded row defaults `proficiency` to 1, which the user is expected to update after an actual assessment).

## Roles & Permissions

Child table — no own `permissions` array (empty). Access is governed entirely by the parent [[Employee Skill Map]] doctype's permissions (System Manager and HR Manager: full CRUD; HR User: create/read/write).

## Mermaid: State/Flow

```mermaid
flowchart LR
    A[Row auto-seeded from Designation.skills\n(proficiency=1)] --> B[User re-evaluates proficiency]
    C[Row added manually] --> B
    B --> D[evaluation_date updated]
```
