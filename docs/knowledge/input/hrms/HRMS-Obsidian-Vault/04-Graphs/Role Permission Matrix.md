---
type: graph
tags: [hrms, graph, permissions]
---

# Role Permission Matrix

Cross-cutting summary of who can do what on the highest-traffic doctypes in the
system. This is a summary for orientation — the authoritative, complete table for any
one doctype is always that doctype's own `## Roles & Permissions` section.

| Doctype | [[Employee]] | [[Leave Approver]]/[[Expense Approver]] | [[HR User]] | [[HR Manager]] | [[System Manager]] |
|---|---|---|---|---|---|
| [[Employee]] | read own, limited write | — | read/write all | read/write all | full |
| [[Leave Application]] | create/submit own | approve/reject (if named) | read/write all | read/write all | full |
| [[Leave Allocation]] | read own | — | create/write all | create/write all | full |
| [[Attendance]] | read own | — | create/write/correct all | create/write/correct all | full |
| [[Shift Request]] | create/submit own | approve/reject (if named) | read/write all | read/write all | full |
| [[Expense Claim]] | create/submit own | approve/reject (if named) | read/write all | read/write all | full |
| [[Salary Slip]] | read own only | — | read/write all | read/write all + submit period | full |
| [[Salary Structure Assignment]] | read own | — | create/write | create/write/submit | full |
| [[Payroll Entry]] | — | — | create | create/submit | full |
| [[Employee Tax Exemption Declaration]] | create/submit own | — | read all | read all | full |
| [[Appraisal]] | self-rate section only | — | create/write all | create/write all | full |
| [[Interview]] | — | — ([[Interviewer (Role)|Interviewer]] role: read/feedback on assigned only) | create/write all | create/write all | full |
| [[Job Applicant]] | — | — | create/write all | create/write all | full |
| [[Employee Separation]] | read own | — | create/write | create/write/submit | full |
| [[Full and Final Statement]] | read own | — | create/write | create/write/submit | full |
| [[HR Settings]] | — | — | read | write (Single doctype) | full |

## Legend

- **create/submit own** = scoped strictly to records where `employee` = the logged-in
  user's linked Employee (enforced in controller code, not just the permissions table).
- **approve/reject (if named)** = the role alone grants nothing; the user must also be
  named on that specific Employee's `leave_approver`/`expense_approver` field, or match
  via [[Department Approver]] fallback.
- **full** = [[System Manager]]/Administrator, unrestricted, framework-level escape hatch.

See also: [[Roles Overview]], [[Role Login Views]], [[Master Relationship Graph]].
