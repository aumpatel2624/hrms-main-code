---
type: flow
tags: [hrms, flow]
roles: [HR User, HR Manager, Interviewer, Employee]
---

# Recruitment to Onboarding

## Flow

```mermaid
flowchart TD
    SP[Staffing Plan approves headcount] --> JR[Job Requisition against a vacancy]
    JR --> JO[Job Opening published\n(publicly listed on hrms/www/jobs)]
    JO --> JA[Job Applicant applies\nvia job board or Employee Referral]
    JA --> IT[Interview Type/Round scheduled]
    IT --> IV[Interview created, Interviewer(s) assigned]
    IV --> IF[Interview Feedback submitted by each Interviewer]
    IF --> Dec{Move forward?}
    Dec -->|reject| JAR[Job Applicant: Rejected]
    Dec -->|advance| IT
    Dec -->|hire| Offer[Job Offer created from Job Offer Template]
    Offer --> Accept{Candidate accepts?}
    Accept -->|no| JAR
    Accept -->|yes| EmpCreate[Employee record created]
    EmpCreate --> Link[Employee.after_insert links back to\nJob Applicant + Job Offer via update_job_applicant_and_offer]
    Link --> Onb[Employee Onboarding created\n(from Employee Onboarding Template)]
    Onb --> Act[Employee Boarding Activities\n(tracked as Project Tasks)]
    Act --> Done[Employee fully onboarded, status Active]
```

## Who Does What

| Step | Role |
|---|---|
| Approve headcount, create [[Job Requisition]] | [[HR Manager]] |
| Publish [[Job Opening]] | [[HR User]] |
| Refer a candidate | [[Employee]] (via [[Employee Referral]]) |
| Screen and schedule [[Interview]] | [[HR User]] |
| Give structured feedback | [[Interviewer (Role)|Interviewer]] |
| Decide advance/reject/hire | [[HR User]] / [[HR Manager]] |
| Draft and send [[Job Offer]] | [[HR User]] |
| Run onboarding checklist | [[HR User]] and the new [[Employee]] |

## Why This Sequence, Not a Simpler One

- **[[Staffing Plan]] gates Job Requisition** so headcount growth is tied to an approved
  budget/vacancy count, not created ad hoc — [[Staffing Plan Detail]] tracks how many of
  each designation are still open, and Job Requisition/Job Opening creation checks
  against that remaining count.
- **Interview feedback is per-Interviewer, aggregated, not a single decision field** —
  this is deliberate: it forces the hiring decision to be based on recorded, individual
  panel input rather than one person's unrecorded judgment, useful for both hiring
  quality and for defending the decision later if challenged.
- **Job Offer is a separate doctype from Employee**, not a status flag on [[Job Applicant]] —
  because an offer has its own lifecycle (drafted, sent, accepted/declined, expired) and
  its own terms ([[Job Offer Term]]) that must be preserved as a record independent of
  whether the candidate ultimately joins.
- **Employee creation triggers a reverse-link back to Job Applicant/Job Offer**
  (`update_job_applicant_and_offer` in `hrms/overrides/employee_master.py`) so the
  recruitment records show "hired as [Employee]" rather than dangling as if nothing
  happened — this closes the loop for reporting (time-to-hire, source effectiveness via
  [[Job Applicant Source]]) without recruitment and HR-core needing to poll each other.
- **Onboarding is templated** ([[Employee Onboarding Template]]) so every new hire gets
  a consistent, trackable checklist (IT provisioning, document collection, induction)
  rather than relying on someone remembering the steps manually.

See also: [[Hire to Retire Overview]], [[01-Modules/Recruitment/_Overview|Recruitment Module]], [[Staffing Plan]].
