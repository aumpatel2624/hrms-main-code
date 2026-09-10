# Business rules

> **TEMPLATE — not filled in yet.** Run the `grill-me` skill.

Rules the code must uphold. Each one is written so you can tell whether an implementation satisfies
it, and says **where it is enforced** — because a rule enforced only in the browser is not enforced.

Format: one rule per row, stable id, so a commit or a test can cite it.

## Invariants

<!-- Always true, at every moment. Usually a unique index, a required field or a guard. -->

| ID | Rule | Enforced in |
|---|---|---|
| INV-1 | A record is never destroyed. Deleting sets `isDeleted`, and deleted records are excluded from every read — lists, searches, dropdowns, login and the delete guard. Exception: OTPs and sessions, which are consumed tokens. | `apps/server/models/softDelete.js` (global Mongoose plugin — server-side, cannot be bypassed by a client) |
| INV-2 | A record cannot be deleted while a live record still references it. | `getReferencingCounts` in each delete controller — 409 with the reference list |
| INV-3 | A business-unique value becomes free again once its record is deleted (delete "India", re-add "India"). | Partial unique indexes, `partialFilterExpression: { isDeleted: false }`, applied by the same plugin |
| INV-4 | Every `EmailFor.triggerKey` is unique and must match an entry in the code trigger registry — picked from a dropdown, never typed freehand, so a trigger key can never point at nothing. | `EmailFor` schema (partial unique index, live + `isDeleted:false`) + `emailFor.controller.js` validates against `apps/server/config/emailTriggers.js` on create/update |
| INV-5 | At most one **active** `EmailTemplate` may reference a given `EmailFor` at a time — closes the ambiguity where `otp.controller.js`'s unsorted lookup picked whichever Mongo returned first. | `emailTemplate.controller.js` duplicate check on create/update when `isActive: true` (mirrors the existing name-uniqueness check in `emailFor.controller.js`) |
| INV-6 | `EmailTemplate`'s subject and body may only use `{{TOKENS}}` declared for their trigger's key in the code registry; an undeclared token blocks the save. | `emailTemplate.controller.js` validation against `apps/server/config/emailTriggers.js` |
| INV-7 | A missing or inactive template for a trigger key never blocks the caller of `sendTriggeredEmail`. The function logs and returns `{ sent: false, reason }`; each call site decides what that means for its own request (forgot-password OTP may still choose to fail its request on this result). | `apps/server/utils/sendTriggeredEmail.js` (never throws on a missing-template lookup) |
| INV-8 | Every Organization Setup record (Branch, Department, Designation) belongs to exactly one Company; uniqueness (name, code) is scoped per Company, not global. Company itself is the top of the hierarchy. | Mongoose compound unique indexes on `{ ...Name, companyId }` (`apps/server/models/Branch.js`, `Department.js`, `Designation.js`); `companyId` required on create/update in `organizationSetup.controller.js` / `department.controller.js` |
| INV-8b | A role below System Manager never sees or writes a row belonging to a different Company — the full per-request company-confinement mechanism (query-level, not just uniqueness). | **Not yet built.** Every HRMS screen so far is reachable only by HR User/HR Manager (INV-8c/INV-9c) and there is one seeded Company today, so this hasn't bitten yet. Mechanism decided in the Leaves module (module 8, ADR-018) — the first module that also needs Department Approver, so the two get designed together. |
| INV-8c | Only HR User and HR Manager may read/write Company, Branch, Department, Designation, Employment Type or Employee Grade. Employee, Leave Approver, Expense Approver and Interviewer have no matrix row for these 6 screens. | `UserRoles.roles[]` matrix rows seeded in `apps/server/seed/index.js`'s `seedOrganizationSetupRoles`, enforced by the existing `checkPermission` middleware (ADR-002) — no new enforcement code, confirmed live in `verify` (403 for Employee, 200 for HR User) |
| INV-9 | Every Employee belongs to exactly one Company, Department, Designation and Branch (all required refs); `employeeCode` is globally unique (real org-chart codes, no naming series — ADR-016). | Mongoose required refs + unique index on `employeeCode` (`apps/server/models/Employee.js`); enforced on create/update in `employee.controller.js` |
| INV-9b | Deleting a Department (or Company/Designation/Branch) that has Employees is blocked, same as any other reference — this is a cross-module regression risk (module 1's guard needs to still catch module 2's new ref with zero registration) confirmed working live in `verify`, not assumed. | `getReferencingCounts` (generic, walks `mongoose.modelNames()`/schema refs at runtime — `apps/server/utils/referenceHelper.js`) |

## Permissions

<!-- Who may do what. Note that the read/write/delete/edit/print/mail matrix is NOT checked on the
     server — see docs/conventions/30-api.md. If a rule here is a real security boundary, it needs
     an ADMIN_ONLY guard or a server-side check, not a hidden button. -->

| ID | Rule | Enforced in |
|---|---|---|
| PERM-1 | HRMS roles take one of three shapes: **self-only** (Employee — sees/edits only records about themself), **approver-scoped** (Leave/Expense/Shift Approver — sees records for employees who name them, or their department, as approver), **global-within-company** (HR User, HR Manager, System Manager — see everything for their own Company; System Manager sees every Company). See `DOMAIN.md` HRMS vocabulary and ADR-016. | The 6 roles exist (`RoleMaster`, seeded by Organization Setup) and every HRMS screen so far uses the plain global shape (INV-8c/INV-9c) — self-only and approver-scoped are **not yet built**, first needed by the Leaves module |
| PERM-2 | Employee Health Insurance is the first HRMS screen with an asymmetric HR role split: HR Manager gets full read/write/edit/delete, **HR User is read-only** (no write/create/delete) — matches the Frappe source permissions table exactly, unlike every other Organization Setup/Employee Records screen where HR User and HR Manager are equal. | `UserRoles.roles[]` matrix row seeded in `apps/server/seed/index.js`'s `seedEmployeeRecordsRoles`; confirmed live in `verify` (HR User: 200 GET, 403 POST) |

## Workflow and state

<!-- Legal transitions, and who may trigger each. If an entity has states, its illegal transitions
     belong here explicitly — the ones nobody wrote down are the ones that ship. -->

| ID | Rule | Enforced in |
|---|---|---|
| FLOW-1 | | |

## Calculations

<!-- Anything with a formula: totals, tax, pro-rating, rounding. State the rounding rule and the
     currency handling explicitly; "obvious" is where these go wrong. -->

| ID | Rule | Enforced in |
|---|---|---|
| CALC-1 | | |

## Deviations from convention

<!-- Rules that required breaking something in docs/conventions/. Each must have an approved ADR in
     DECISIONS.md. Empty is the healthy state. -->

| ID | Deviation | ADR |
|---|---|---|
| DEV-1 | Adds multi-tenancy (`Company`/`Branch`) — `60-limits.md` says this is a day-one-or-never decision for the starter; taken on day one for HRMS. | ADR-016 |
| DEV-2 | Extends `UserRoles.dataScope` (ADR-002) from one value per role to a value per screen. | ADR-016 |
