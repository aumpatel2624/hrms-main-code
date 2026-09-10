---
type: doctype
module: Recruitment
roles: [System Manager, HR Manager, HR User]
tags: [hrms, doctype]
---

# Job Opening Template

A reusable preset of the fields recruiters retype for every similar vacancy (department,
designation, employment type, location, pay range, description). It exists to speed up
posting near-identical openings (e.g. recurring roles) without recreating each field by
hand.

## Key Fields
| Field | Type | Purpose |
|---|---|---|
| `template_title` | Data (unique, autoname source) | Identifies the template. |
| `department`, `designation`, `employment_type`, `location` | Link | Defaults copied to the new Job Opening. |
| `currency`, `upper_range`, `lower_range`, `salary_per`, `publish_salary_range` | — | Default pay-disclosure settings. |
| `description` | Text Editor | Default job description. |

## Relationships
- [[Job Opening]] — `create_job_opening_from_template()` maps this template's fields onto a new Job Opening; the created opening's `job_opening_template` field points back here.

## Logic — What Happens and Why
No `validate`/lifecycle logic — this is a pure data preset (`pass` in the controller).

**`create_job_opening_from_template(source)` (whitelisted, mapped-doc)**: builds a new Job
Opening document, mapping all matching fields automatically (mapped-doc copies fields with
identical names by default) plus explicitly mapping `name → job_opening_template` so the
resulting opening retains a reference to the template it came from, and sets
`job_title = designation` as a starting title (since Job Opening's `job_title` is free text
but the template only stores a `designation` link). The document returned is not inserted
automatically — the caller (client-side "Create Job Opening" button) is expected to open it
for the user to review/save.

## Roles & Permissions
| Role | Can Do | Notes |
|---|---|---|
| [[System Manager]] | Full CRUD + email/export/print/report/share | — |
| [[HR Manager]] | Read/Write/Create/Delete | No email/export/print/report/share. |
| [[HR User]] | Read/Write/Create | No delete. |

## Mermaid: State/Flow
```mermaid
flowchart LR
    Template[Job Opening Template] -- "create_job_opening_from_template()" --> Draft[New Job Opening draft]
    Draft -- "user reviews & saves" --> Opening[Job Opening: Open]
```
