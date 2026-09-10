---
type: home
tags: [hrms]
---

# Frappe HRMS — Vault Home

End-to-end documentation of the Frappe HRMS codebase (`hrms/`), built from the actual
source (doctype JSON schemas, Python controllers, `hooks.py` doc_events and scheduler
jobs) — not from generic HR-software knowledge. 156 doctype notes, 10 module
overviews, 6 role notes, 7 end-to-end flows, 4 cross-cutting graphs.

## Start Here

- **New to the app?** Read [[Hire to Retire Overview]] first — the master flow every
  other note is a chapter of.
- **Looking up a specific doctype?** Use [[Doctype Index]] — alphabetical, links to
  every doctype note regardless of module.
- **Understanding who can do what?** [[Roles Overview]] → [[Role Permission Matrix]].
- **Understanding why the system is shaped this way?** [[Why Graph - Reasoning Map]].

## By Module

| Module | What It Covers |
|---|---|
| [[01-Modules/HR-Core/_Overview\|HR Core]] | Employee lifecycle: onboarding, transfer, promotion, separation, grievance, training, travel, skills |
| [[01-Modules/Leaves/_Overview\|Leaves]] | Leave types, policies, allocation, application, encashment |
| [[01-Modules/Payroll/_Overview\|Payroll]] | Salary structure, salary slips, payroll runs, benefits, gratuity, tax exemption |
| [[01-Modules/Recruitment/_Overview\|Recruitment]] | Job requisition through offer, interviews |
| [[01-Modules/Performance/_Overview\|Performance]] | Appraisal cycles, goals, peer feedback |
| [[01-Modules/Shift-Attendance/_Overview\|Shift & Attendance]] | Shifts, checkins, auto-attendance |
| [[01-Modules/Tax-Benefits/_Overview\|Tax & Benefits]] | Income tax slabs, exemption declarations/proofs (conceptual grouping — files live in Payroll) |
| [[01-Modules/Expenses/_Overview\|Expenses]] | Expense claims and reimbursement |
| [[01-Modules/HR-Setup/_Overview\|HR Setup]] | Global HR settings, employment type, employee grade |
| [[01-Modules/Regional/_Overview\|Regional]] | India/UAE statutory overrides (HRA, marginal relief tax, gratuity) |

## By Role

[[Employee]] · [[HR User]] · [[HR Manager]] · [[Leave Approver]] · [[Expense Approver]] ·
[[Interviewer (Role)|Interviewer]] · [[System Manager]] — see [[Roles Overview]] for how these relate,
and [[Role Login Views]] for exactly what each role sees on login (pages, tabs, data scope).

## End-to-End Flows

- [[Hire to Retire Overview]] (master flow)
- [[Recruitment to Onboarding]]
- [[Leave Request Lifecycle]]
- [[Payroll Run Lifecycle]]
- [[Expense Claim Lifecycle]]
- [[Performance Appraisal Cycle]]
- [[Attendance and Shift Lifecycle]]
- [[Employee Exit Lifecycle]]

## Graphs

- [[Master Relationship Graph]] — module-to-module doctype relationships
- [[Module Dependency Graph]] — what must exist before what
- [[Why Graph - Reasoning Map]] — the recurring design pressures behind the relationships
- [[Role Permission Matrix]] — who can do what, at a glance

## Reference

- [[Doctype Index]]
- [[Glossary]]

## How This Vault Was Built

Each module's doctypes were read directly from source (`.json` schema + `.py`
controller under `hrms/<module>/doctype/<name>/`, plus `hrms/hooks.py` for
cross-doctype wiring and scheduled jobs). Where source didn't support a claim, the
relevant note says so explicitly rather than guessing — see e.g. the notes on missing
Branch/Company doctypes in [[01-Modules/HR-Setup/_Overview|HR Setup]], or the narrower-
than-expected scope of [[01-Modules/Regional/_Overview|Regional]].
