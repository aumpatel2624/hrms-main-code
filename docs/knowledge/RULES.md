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
| INV-8 | Every HRMS record (Employee, and everything scoped to an Employee) belongs to exactly one Company. A role below System Manager never sees or writes a row belonging to a different Company. | To be built — company becomes a scoping dimension per ADR-016, mechanism decided in whichever module first needs it |

## Permissions

<!-- Who may do what. Note that the read/write/delete/edit/print/mail matrix is NOT checked on the
     server — see docs/conventions/30-api.md. If a rule here is a real security boundary, it needs
     an ADMIN_ONLY guard or a server-side check, not a hidden button. -->

| ID | Rule | Enforced in |
|---|---|---|
| PERM-1 | HRMS roles take one of three shapes: **self-only** (Employee — sees/edits only records about themself), **approver-scoped** (Leave/Expense/Shift Approver — sees records for employees who name them, or their department, as approver), **global-within-company** (HR User, HR Manager, System Manager — see everything for their own Company; System Manager sees every Company). See `DOMAIN.md` HRMS vocabulary and ADR-016. | To be built per-screen, first needed by the Leaves module |

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
