---
type: doctype
module: HR Core
roles: []
tags: [hrms, doctype]
---

# Training Event Employee

A child table row representing one employee's invitation to and participation in a [[Training Event]] — it holds that employee's attendance mark and progress status (Open, Invited, Completed, Feedback Submitted) through the training lifecycle.

## Key Fields

| Field | Type | Purpose |
|---|---|---|
| `employee` | Link (Employee) | The invited employee. |
| `employee_name` | Read Only (fetch from `employee.employee_name`) | Display convenience. |
| `department` | Link (Department, fetch from `employee.department`, read-only) | Reporting/filtering convenience. |
| `status` | Select (Open/Invited/Completed/Feedback Submitted, default "Open", allowed on submit) | Tracks this attendee's progress; updated by Training Event, Training Result, and Training Feedback controllers. |
| `attendance` | Select (Present/Absent) | Whether the employee actually attended; gates whether Training Feedback can be submitted. |
| `is_mandatory` | Check (default 1) | Marks whether attendance was compulsory for this employee. |

## Relationships

- [[Training Event]] — parent doctype (child table field `employees`).
- [[Training Result]] — indirectly linked; on Training Result submit, rows matching the same employee have their `status` set to "Completed".
- [[Training Feedback]] — indirectly linked; on feedback submit/cancel, the matching row's `status` is toggled to/from "Feedback Submitted".

## Logic — What Happens and Why

The `TrainingEventEmployee(Document)` controller in `training_event_employee.py` is a `pass`-only class with no validation of its own. All logic that mutates this table happens from the parent/related controllers:

- `Training Event.set_status_for_attendees()` (fired via `on_update_after_submit`) sets `status` to "Completed" for Present attendees when the event's `event_status` becomes "Completed", and resets all rows to "Open" if the event reverts to "Scheduled".
- `Training Result.on_submit()` iterates this table on the linked event and force-sets `status = "Completed"` for every employee present in the submitted Training Result.
- `Training Feedback.validate()` reads a row's `attendance` here (via `frappe.db.get_value`) and blocks feedback submission if `attendance == "Absent"`.
- `Training Feedback.on_submit()` / `on_cancel()` set this row's `status` to "Feedback Submitted" / "Completed" respectively via direct `frappe.db.set_value` calls (bypassing the parent's full save cycle).

## Roles & Permissions

Child table — no own `permissions` array (empty). Access is governed entirely by the parent [[Training Event]] doctype's permissions (HR Manager: full CRUD/submit/cancel; HR User: read/write only).

## Mermaid: State/Flow

```mermaid
stateDiagram-v2
    [*] --> Open: default
    Open --> Invited: manual/UI update
    Invited --> Completed: Training Event set to Completed (if Present)\nor Training Result submitted
    Completed --> "Feedback Submitted": Training Feedback submitted
    "Feedback Submitted" --> Completed: Training Feedback cancelled
    Completed --> Open: Training Event reverted to Scheduled
```
