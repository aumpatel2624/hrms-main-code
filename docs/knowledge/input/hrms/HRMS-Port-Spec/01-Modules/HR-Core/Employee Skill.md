# Employee Skill

**Source:** `hrms/hr/doctype/employee_skill/employee_skill.json`, `employee_skill.py`
**Submittable:** no   **Tree:** no   **Naming:** child table doctype — no `autoname` key; rows are identified internally by Frappe's generic auto-generated `name` (hash) plus `parent`/`parentfield`/`parenttype` linkage. `istable: 1`.
**Module:** HR

Child table used exclusively via the `employee_skills` Table field on `Employee Skill Map` (see `Employee Skill Map.md`).

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| skill | Skill | Link | [[Skill]] | yes (`reqd: 1`) | — | no | `in_list_view: 1` |
| proficiency | Proficiency | Rating | — | yes (`reqd: 1`) | — | no | `in_list_view: 1`; Rating fieldtype stores a float 0–1 in increments (Frappe default 5-star rating, i.e. values are multiples of 0.2 up to 1.0 unless a custom `options` star-count is set — no `options` set here, so default star count applies) |
| evaluation_date | Evaluation Date | Date | — | no | `"Today"` (evaluates to current date at row-creation time) | no | `in_list_view: 1` |

`field_order`: `["skill", "proficiency", "evaluation_date"]` — flat, no section/column breaks.

`editable_grid: 1` — rows are editable inline in the parent's grid UI (client-side convenience, no server logic implication).

## Child Tables

N/A — this doctype is itself a child table (`istable: 1`). It has no nested Table fields of its own.

## State Machine

Not submittable, no independent status field. Its lifecycle is entirely bound to its parent document (`Employee Skill Map`).

## Validation Rules (exact, in execution order)

`employee_skill.py` controller body is `class EmployeeSkill(Document): pass` — **no custom validation code**.

Implicit framework-level constraints from schema (must be reproduced explicitly in a new stack):
1. `skill` is mandatory (`reqd: 1`) — a row with `skill` blank fails Frappe's generic "Skill is mandatory" style validation at save time.
2. `proficiency` is mandatory (`reqd: 1`) — a row with `proficiency` blank/zero fails the equivalent generic mandatory check (note: Rating fields default to 0, so a "not provided" state is indistinguishable from a literal 0-star rating unless the target stack adds its own distinct null representation).

## Business Logic / Calculations

None.

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| (none) | Controller class body is `pass`. | none |

## Whitelisted / API Methods

None.

## Permissions

`"permissions": []` in JSON — child tables do not carry their own permission rows in Frappe; access is governed entirely by the parent doctype's (`Employee Skill Map`) permissions. See `Employee Skill Map.md` for the effective permission table.

## Scheduled Jobs Touching This Doctype

None found in `hrms/hooks.py`.

## Related Doctypes

- [[Skill]] — via `skill`: `in_list_view: 1`

## Port Notes

- `track_changes: 1` is set on this child doctype — Frappe versions child-table row changes as part of the parent document's version history. A new stack needs its own row-level audit trail if this is required, tied to the parent (`Employee Skill Map`) save events.
- `quick_entry: 1` is set but has no practical effect for a child-table row inserted via the parent form's standard grid add-row flow (quick entry mainly matters for top-level Link "Create New" flows); no business logic to port.
- The `evaluation_date` default of `"Today"` is a Frappe magic-string default meaning "server's current date at document/row creation" — must be implemented as `CURRENT_DATE` (or equivalent) applied at row-insert time in a new stack, not a fixed literal.
- No validation exists preventing duplicate `skill` values within the same parent's `employee_skills` table (i.e., the same employee could in principle have two rows for the same Skill) — this is a gap relative to what one might expect, called out here per the ground rules rather than invented as a fix.
- Cross-doctype trigger: `Employee Skill Map`'s client script (`employee_skill_map.js`) auto-populates this child table's rows (`skill` + `proficiency = 1`) from the linked Designation's `Designation Skill` rows when the `designation` field changes — this is **client-side only**; see `Employee Skill Map.md` Port Notes for the server-side equivalent that must be built.
