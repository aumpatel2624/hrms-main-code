# Employee Skill Map

**Source:** `hrms/hr/doctype/employee_skill_map/employee_skill_map.json`, `employee_skill_map.py`, `employee_skill_map.js`
**Submittable:** no   **Tree:** no   **Naming:** `autoname: "field:employee"` (document name = value of the `employee` field, i.e. the Employee's own `name`/ID)
**Module:** HR

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| employee | Employee | Link | [[Employee Core Model|Employee]] | not `reqd` in JSON (naming field) | — | no | `unique: 1` — one Employee Skill Map per Employee |
| employee_name | Employee Name | Read Only | — | no | — | yes (fieldtype Read Only) | `fetch_from: "employee.employee_name"` |
| column_break_3 | — | Column Break | — | — | — | — | layout only |
| designation | Designation | Read Only | — | no | — | yes (fieldtype Read Only) | `fetch_from: "employee.designation"` |
| skills_section | Skills | Section Break | — | — | — | — | section heading grouping `employee_skills` |
| employee_skills | Employee Skills | Table | [[Employee Skill]] | no | — | no | see `Employee Skill.md` |
| trainings_section | Trainings | Section Break | — | — | — | — | section heading grouping `trainings` |
| trainings | Trainings | Table | [[Employee Training]] | no | — | no | `Employee Training` is a separate doctype owned by another module — reference by name only, not documented here |

`title_field: "employee_name"` — list views / link display titles use `employee_name` instead of the raw `name` (employee ID).

## Child Tables

- `employee_skills` → `Employee Skill` (see `Employee Skill.md`, documented in this same output folder).
- `trainings` → `Employee Training` — owned by a different module/agent; not documented here, referenced by name only.

## State Machine

Not submittable (`is_submittable` absent/false). No `status`/`workflow_state` field in schema. No state machine to render.

## Validation Rules (exact, in execution order)

`employee_skill_map.py` controller body is `class EmployeeSkillMap(Document): pass` — **no custom validation code** at all (no `validate`, no `before_save`, nothing).

Implicit framework-level constraints from schema (must be reproduced explicitly in a new stack, since none of this is custom code):
1. `employee` has `unique: 1` — attempting to create a second `Employee Skill Map` for the same `employee` value fails with a generic Frappe duplicate/unique-constraint error (there is also `autoname: "field:employee"`, so this is effectively double-enforced: the document's primary key itself would collide before the unique index is even checked).
2. `employee_name` and `designation` are `fetch_from` fields — Frappe's generic fetch mechanism copies `employee.employee_name` and `employee.designation` respectively whenever `employee` is set or the source Employee's values change and the document is saved. These are **not** independently editable (fieldtype `Read Only`), and there is no custom code re-deriving them — the copy is entirely framework "fetch_from" plumbing.

Port Note: There is no server-side re-implementation anywhere of the client-side auto-population of `employee_skills` from the Designation's skill set (see Port Notes below) — this is a real gap that must be decided on by the reimplementing team, not invented here.

## Business Logic / Calculations

None.

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| (none) | Controller class body is `pass` — no lifecycle methods overridden. | none |

## Whitelisted / API Methods

None defined in `employee_skill_map.py`.

## Permissions

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| System Manager | 1 | 1 | 1 | 1 | 0 | 0 | 0 | 1 | 1 | also `email: 1`, `print: 1`, `share: 1` |
| HR User | 1 | 1 | 1 | 0 | 0 | 0 | 0 | 1 | 0 | no delete, no export |
| HR Manager | 1 | 1 | 1 | 1 | 0 | 0 | 0 | 1 | 1 | no `email`/`print`/`share` keys set (absent = 0) |

## Scheduled Jobs Touching This Doctype

None found in `hrms/hooks.py`.

## Related Doctypes

- [[Employee Core Model|Employee]] — via `employee`: `unique: 1` — one Employee Skill Map per Employee
- [[Employee Skill]] — via `employee_skills`: see `Employee Skill.md`
- [[Employee Training]] — via `trainings`: `Employee Training` is a separate doctype owned by another module — reference by name only, not documented here

## Port Notes

- **Client-only business logic requiring a server-side equivalent:** `employee_skill_map.js` defines a `designation` field-change handler that:
  1. Clears `employee_skills` (`frm.set_value("employee_skills", null)`).
  2. If a `designation` is now set, fetches the `Designation` document via `frappe.db.get_doc("Designation", frm.doc.designation)`.
  3. For every row in that Designation's `skills` child table (the `Designation Skill` table — see `Designation Skill.md`), appends a new row to `employee_skills` with `skill = designation_skill.skill` and a hardcoded `proficiency = 1`.
  4. Refreshes the `employee_skills` grid.

  This entire flow is **UI-only** — there is no equivalent Python method, whitelisted or otherwise, and no `validate`/`before_save` hook that performs this population server-side. A faithful port must implement this as an explicit application-layer routine (e.g., "when designation changes on an Employee Skill Map, clear and repopulate employee_skills from Designation.skills with proficiency defaulted to 1"), triggered either via API call from the client or as an idempotent server-side hook — the exact trigger point is a re-implementation decision since Frappe leaves it entirely client-side here.
  - Also note: the Designation doctype and its `skills` field (of type `Designation Skill` per this client script) are **not part of this repo** (`hrms/hr/doctype/designation/` does not exist under `hrms/hrms/hr/doctype`) — `Designation` is a core/other-app doctype outside this port's source tree. The `Designation Skill` child-table doctype itself, however, does exist in this repo (documented in `Designation Skill.md`) and is presumably attached to `Designation.skills` in the app that defines `Designation`.
- `employee_name` and `designation` being Frappe "fetch_from" Read-Only fields means: in a new stack, these must be either (a) computed as a join/denormalized read at query time rather than stored, or (b) stored but re-synced whenever the source Employee record's `employee_name`/`designation` changes — Frappe does this fetch automatically on every document load/save; there is no explicit sync-on-employee-update hook, so if the Employee's designation changes later, the already-saved `Employee Skill Map.designation` value only refreshes the next time this document itself is loaded/saved (this is standard, implicit Frappe fetch-field staleness behavior, not a bug in this doctype's own code).
- `quick_entry: 1` and `row_format: "Dynamic"` are UI-only Frappe conventions, no business-rule implication.
- `sort_field: "creation"`, `sort_order: "ASC"` — default list ordering.
- No `track_changes` key is set on this parent doctype (absent = not versioned at the parent level), though its `employee_skills` child rows (`Employee Skill`) do have `track_changes: 1` individually.
