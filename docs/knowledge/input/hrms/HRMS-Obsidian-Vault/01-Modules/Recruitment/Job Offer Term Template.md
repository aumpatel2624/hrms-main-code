---
type: doctype
module: Recruitment
roles: [System Manager, HR Manager, HR User]
tags: [hrms, doctype]
---

# Job Offer Term Template

A reusable, named set of Job Offer Terms (e.g. a standard "Full-Time Offer" boilerplate)
that can be applied to a Job Offer instead of retyping every term line. It exists purely
to reduce repetitive data entry when most offers for a role/level share the same standard
terms.

## Key Fields
| Field | Type | Purpose |
|---|---|---|
| `title` | Data (unique, autoname) | Template name. |
| `offer_terms` | Table (Job Offer Term) | The reusable set of term/value rows. |

## Relationships
- [[Job Offer Term]] — child table holding the reusable terms.
- [[Job Offer]] — a Job Offer's `job_offer_term_template` field references this; selecting it is expected to copy `offer_terms` onto the offer (client-side; no server controller logic present here to enforce or automate the copy).

## Logic — What Happens and Why
No controller logic (no `.py` file exists for this doctype in the source read) — purely a
data-holding preset, functionally identical in role to [[Job Opening Template]] but for
offer terms instead of opening fields.

## Roles & Permissions
| Role | Can Do | Notes |
|---|---|---|
| [[System Manager]] | Full CRUD + email/export/print/report/share | — |
| [[HR Manager]] | Full CRUD + email/export/print/report/share | — |
| [[HR User]] | Read/Write/Create | No delete. |

## Mermaid: State/Flow
```mermaid
flowchart LR
    Template[Job Offer Term Template] -- "offer_terms selected/copied onto" --> Offer[Job Offer.offer_terms]
```
No status lifecycle — configuration doctype, not submittable.
