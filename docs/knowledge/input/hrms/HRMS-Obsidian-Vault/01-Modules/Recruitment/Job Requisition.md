---
type: doctype
module: Recruitment
roles: [System Manager, HR User, HR Manager]
tags: [hrms, doctype]
---

# Job Requisition

The formal request a department raises to hire for a designation — who is asking, how
many positions, at what expected compensation, and why — before a public vacancy exists.
It exists to put an approval gate and a paper trail in front of headcount growth, and to
measure how long it actually takes an organization to fill a role.

## Key Fields
| Field | Type | Purpose |
|---|---|---|
| `designation` | Link (Designation) | Role being requisitioned; title field. |
| `department` | Link (Department) | Owning department. |
| `no_of_positions` | Int | How many openings this requisition covers. |
| `expected_compensation` | Currency | Budgeted pay for the role. |
| `company` | Link (Company) | Company raising the requisition. |
| `status` | Select | `Pending / Open & Approved / Rejected / Filled / On Hold / Cancelled` lifecycle. |
| `requested_by` | Link (Employee) | Hiring manager/requester. |
| `requested_by_dept` / `requested_by_designation` | Link (fetched) | Auto-filled from `requested_by` for context. |
| `posting_date` | Date | When the requisition was raised (defaults to Today). |
| `expected_by` | Date | Target fill date. |
| `completed_on` | Date | Set (mandatory) when status becomes `Filled`; used to compute `time_to_fill`. |
| `description` | Text Editor | Job description, fetched from `designation.description` if empty. |
| `reason_for_requesting` | Text | Business justification. |
| `time_to_fill` | Duration (read-only) | Computed: `completed_on - posting_date`, once `Filled`. |

## Relationships
- [[Job Opening]] — a Job Opening can be created from this requisition (`make_job_opening()`), and `Job Opening.job_requisition` links back; closing that Job Opening marks this requisition `Filled`.
- [[Designation]] — links to the role being hired for; `description` is fetched from it.
- [[Employee]] — `requested_by` is the hiring manager raising the request.
- [[Company]], [[Department]] — organizational context for the request.

## Logic — What Happens and Why
**Create → Pending.** A requisition starts without an enforced workflow state machine in
code (the `status` field is a plain Select, not a Frappe Workflow) — approval to
`Open & Approved` is a manual status change by whoever has write access.

**`validate()` → `set_time_to_fill()`**: every save recomputes `time_to_fill` as the
duration between `posting_date` and `completed_on`, but only once `status == "Filled"` and
`completed_on` is set. This keeps the KPI field consistent even if `completed_on` is edited
after the fact, rather than freezing it at first computation.

**Duplicate check (`check_duplicate_job_requisition`, whitelisted)**: before a user submits
a new requisition, the UI can call this to warn if an open (`not in Cancelled/Filled`)
requisition already exists for the same designation + department + requester — prevents the
same manager double-requesting the same role.

**`associate_job_opening(job_opening)` (whitelisted)**: lets a requisition be retroactively
linked to an existing Job Opening (rather than only via `make_job_opening`) — checks write
permission on the target Job Opening, then sets `job_opening.job_requisition` and copies
`no_of_positions` into `job_opening.vacancies` via direct `frappe.db.set_value` (bypassing
the document's own validate, since this is an administrative fix-up action).

**`make_job_opening(source_name)` (whitelisted, mapped-doc)**: creates a new Job Opening
document pre-filled from the requisition — `designation → job_title`, `no_of_positions →
vacancies`, `description`, `status = "Open"`, `currency` from the company's default
currency, and `lower_range` seeded from `expected_compensation`. This is the sanctioned
path from an approved requisition to a live opening; it does not auto-set the opening's
`job_requisition` field name-map inconsistently — the field map explicitly wires
`"name": "job_requisition"` so the resulting Job Opening keeps the back-reference.

**Closing the loop**: `Job Opening.update_job_requisition_status()` (in the Job Opening
controller, fired on `on_update` when opening status is `Closed`) writes this requisition's
`status = "Filled"` and `completed_on = today` with `ignore_permissions`/`ignore_mandatory`
— the requisition is not directly aware of hiring, it is driven entirely by its linked
opening's lifecycle. This is why `time_to_fill` measures "requisition raised" to "opening
closed", i.e. the full hiring cycle, not just interview time.

**`get_avg_time_to_fill()` (whitelisted)**: aggregate reporting helper — average
`time_to_fill` across `Filled` requisitions, optionally scoped by company/department/
designation, used for dashboard number cards (e.g. `hrms/hr/number_card/time_to_fill`).

There is no submit/cancel workflow (`is_submittable` is not set) — status transitions are
plain field writes.

## Roles & Permissions
| Role | Can Do | Notes |
|---|---|---|
| [[System Manager]] | Read/Write/Create/Delete/Export/Print/Report/Share/Email | Full access. |
| [[HR User]] | Read only | Cannot create or edit requisitions — visibility without the ability to raise/approve. |
| [[HR Manager]] | Read/Write/Create/Delete/Export/Print/Report/Share/Email | Full access — approval authority implicitly rests here since HR User is read-only. |

Not enforced in code: no role restricts who can move `status` to `Open & Approved` beyond
generic write permission — there is no separate "approver" role or workflow guard.

## Mermaid: State/Flow
```mermaid
stateDiagram-v2
    [*] --> Pending
    Pending --> "Open & Approved": manual approval (write access)
    Pending --> Rejected: manual rejection
    Pending --> Cancelled
    "Open & Approved" --> "On Hold": manual
    "On Hold" --> "Open & Approved": manual
    "Open & Approved" --> Filled: driven by linked Job Opening.status = Closed\n(update_job_requisition_status)
    "Open & Approved" --> Cancelled: manual
    Filled --> [*]
    Rejected --> [*]
    Cancelled --> [*]
```
