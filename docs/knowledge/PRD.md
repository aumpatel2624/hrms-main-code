# Product requirements

## What this is

An HR Management System for **Apidel**, built on this starter, covering the employee lifecycle from
requisition through separation: recruitment, onboarding/separation, leave, shift & attendance,
payroll (incl. tax exemptions, benefits, gratuity), performance appraisal, and expense reimbursement.
The requirement arrived as a full reverse-engineered specification of **Frappe HRMS** (156 doctypes,
`docs/knowledge/input/hrms/`) — this project reimplements the same business capability idiomatically
on this starter's own patterns, not as a mechanical clone of Frappe's framework internals. See
[ADR-016](DECISIONS.md) for the fidelity decision and what it means module by module.

Real org data for seeding (195 employees, 25 departments, 29 designations, one manager-hierarchy)
was recovered from `Apidel Organization Chart(1).html` (a Claude Design Canvas export whose data is
bundled as opaque JS, not plain HTML) and saved as
[`apidel-org-chart.csv`](apidel-org-chart.csv). Agreed 2026-09-10.

## Who uses it

<!-- One row per actor. "Role" maps to a RoleMaster record; ADMIN and USER are the only coarse
     roles the server knows about — see docs/conventions/30-api.md. -->

| Actor | What they do | Role |
|---|---|---|
| Employee | Self-service: own leave, expenses, attendance requests, payslips, tax declarations, goals | USER, scoped self-only |
| Leave/Expense/Shift Approver | Approves requests for employees who name them (or their department) as approver | USER, scoped approver |
| Interviewer | Submits interview feedback for interviews they're assigned to | USER, scoped approver-equivalent |
| HR User | Day-to-day HR operations across their company | USER, scoped to own company, unrestricted within it |
| HR Manager | HR policy + payroll/financial-close authority across their company | USER, scoped to own company, unrestricted within it |
| System Manager (super admin) | Sees and administers every company | ADMIN |
| Job applicant (public) | Browses open roles and applies, no login | none — public route |

*Full role→screen permission detail is a `system-design`/`api-endpoint` concern per module, not
decided globally here — see [ADR-016](DECISIONS.md).*

## Scope

### In scope — HRMS (Apidel)

See `STATE.md` for the module list and build order — this is deliberately large (~17 modules) and
is not designed end-to-end up front; each module gets its own `system-design` pass when its turn
comes. Cross-cutting decisions settled during grilling (2026-09-10):

1. **Idiomatic rebuild, not a literal Frappe port.** Status fields instead of Frappe's
   Draft→Submit→Cancel→Amend document lock; background jobs only where a feature genuinely cannot
   work without one (auto-attendance, leave expiry/accrual, encashment); no general ledger — Payroll
   and Expenses track payment status without double-entry accounting. See ADR-016.
2. **Multi-company.** `Company` and `Branch` become first-class models here (Frappe treats both as
   core ERPNext and documents neither) — they don't pre-exist in this starter and nothing else
   supplies them.
3. **Company confinement.** Every role below System Manager is confined to their own company by
   default — company becomes a scoping dimension alongside the existing self/approver/all split.
4. **Per-screen data scoping.** ADR-002's one-`dataScope`-value-per-role is extended to vary per
   screen, because the self-service/approver model requires it (Employee: self-only on Leave/Expense;
   Leave Approver: approver-scoped on Leave/Attendance/Shift; HR User/Manager: all-within-company).
   This is a `system-design`-level change to the scoping mechanism, done once, reused by every module.
5. **Public job board.** Job Opening gets a real public, unauthenticated route (candidates browse and
   apply without logging in) — via the starter's public-router gate (`30-api.md`).
6. **Single language** (English). **Retention**: starter default — soft-deleted, kept indefinitely,
   no TTL on the audit trail; revisit only if Apidel names a statutory retention requirement.

### In scope — starter/platform (pre-existing, not part of the HRMS build)

1. **Client-facing documentation** — an in-app documentation section the client's end users open
   from the sidebar, explaining what each screen is for and how to use it. Pages are generated per
   module as part of the build pipeline (phase 7.5, the `client-docs` skill) from the screen's own
   configuration, with written explanation added in the same pass, and illustrated with screenshots
   captured automatically from the running app. Screenshots regenerate only for screens whose inputs
   changed. See [ADR-010](DECISIONS.md). Agreed 2026-08-28.
2. **Dynamic email triggers** — "which email template fires for which form/event" becomes data
   instead of hardcoded per-controller lookup-and-replace code. Every trigger site (starting with the
   one that exists today, forgot-password OTP) gets a stable `triggerKey` on `EmailFor`, picked from
   a code registry rather than typed freehand, and calls one shared `sendTriggeredEmail(triggerKey,
   {...})` function instead of duplicating the lookup/fill/send steps. One template per trigger (no
   fan-out) — a form needing two emails fires two trigger keys. Missing/inactive template never
   blocks the caller; it logs and returns a result the caller can inspect. See
   [docs/email-trigger-system.md](../email-trigger-system.md) and the ADR this module produces.
   Agreed 2026-09-07.

### Explicitly out of scope

<!-- The most valuable section in this file. What was considered and deliberately excluded, and
     why. Prevents rebuilding the same argument in three months. -->

- **A general ledger / double-entry accounting layer.** Frappe's Payroll and Expenses modules are
  built on ERPNext's accounting engine (Journal Entry, Payment Entry, GL Entry) — this project tracks
  payment status (paid/outstanding, an amount, a date) without modelling debits/credits or a chart of
  accounts. Reconsider only if Apidel needs the HRMS to *be* the system of record for accounting, not
  just HR/payroll. Decided 2026-09-10 (ADR-016).
- **Frappe's Draft→Submit→Cancel→Amend document lifecycle, as generic starter infrastructure.**
  Considered and declined as a literal port: it would mean building a new framework-wide primitive
  (naming-series numbering, immutable-after-submit fields, amend-creates-a-new-document) before any
  HR screen exists. Each module's own `system-design` instead decides its own status field and
  illegal-transition rules using the starter's existing patterns. Decided 2026-09-10 (ADR-016).
- **Multi-language.** Single language (English) — see PRD scope decision 6 above. Reconsider if
  Apidel names specific languages and which content needs them (UI vs. actual HR records).
- **A statutory HR-data retention/deletion policy.** Follows the starter default (kept indefinitely,
  soft-deleted) for now — see PRD scope decision 6. Reconsider if Apidel names a specific
  retention/deletion rule.
- **ESI, Form 16, LWF, WPS and other statutory regional mechanisms not present in the source spec.**
  The Regional module note is explicit that only India (HRA exemption, marginal relief tax, gratuity)
  and UAE (gratuity) overrides exist in the traced source — nothing else was invented to fill the gap.
- **MkDocs Material as a separate documentation site.** Considered as the original proposal for the
  client documentation and declined: it is Python, and this is a Node-only repo with a Node-only
  deploy, so it would add an interpreter and a second build toolchain to every machine and every
  server. Its output is also a standalone static site, which cannot be an ordinary menu row behind
  the ordinary session cookie. Reconsider only if the documentation must also be published publicly
  at its own domain. See [ADR-010](DECISIONS.md). Decided 2026-08-28.
- **A new public-facing form (Contact Us, Job application) as part of the email trigger module.**
  These were illustrative examples in `docs/email-trigger-system.md`, not a real requirement — this
  repo has no public website to submit such a form from. The module builds the generic mechanism and
  migrates the one real trigger site (forgot-password OTP) onto it; a real second trigger is future
  work once an actual form needs one. Decided 2026-09-07.
- **A trigger resolving to more than one template.** Considered and declined for now: the one
  fan-out case anyone named (a visitor thank-you plus an internal notification from one submission)
  is met by firing two trigger keys from the same form event, not by teaching one trigger to resolve
  to many templates. Reconsider if a real case needs one submission to *atomically* fire a set of
  templates the caller shouldn't have to enumerate. Decided 2026-09-07.

## Success criteria

<!-- How the client will judge whether this works. Concrete and checkable, not "it should be fast". -->

## Constraints

<!-- Deadlines, integrations that must be used, data that must be migrated, compliance
     requirements, expected scale. Anything that removes an option. -->

## Deferred

<!-- Agreed, but not now. With the trigger that would bring it forward. -->

- **Client documentation for the six modules already shipped** (Soft delete, Role data scoping,
  Dynamic dashboards, SEO management, Audit trail, Dashboard layout canvas). They predate the
  documentation pipeline and have no user-facing pages. Trigger: the `client-docs` machinery is
  built and working, after which they can be generated in one pass. Agreed 2026-08-28.
