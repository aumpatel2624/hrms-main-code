# Skill

**Source:** `hrms/hr/doctype/skill/skill.json`, `skill.py`, `skill.js`
**Submittable:** no   **Tree:** no   **Naming:** `autoname: "field:skill_name"` (document name = value of `skill_name` field; `allow_rename: 1` so renaming the document renames the `skill_name`-derived name)
**Module:** HR

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| skill_name | Skill Name | Data | — | not `reqd` in JSON (naming field, effectively required by autoname) | — | no | `unique: 1`; `allow_in_quick_entry: 1` |
| description | Description | Text | — | no | — | no | `allow_in_quick_entry: 1` |

No section/column breaks in `field_order` (`["skill_name", "description"]`) — flat two-field doctype.

## Child Tables

None.

## State Machine

Not submittable. No `status`/`workflow_state` field exists in the schema.

## Validation Rules (exact, in execution order)

The controller (`skill.py`) defines `class Skill(Document): pass` — no custom methods. There are **no explicit validation rules** in `skill.py`.

Implicit framework-level constraints from the JSON schema (not custom Python, but must be replicated in a new stack):
1. `skill_name` has `unique: 1` — attempting to insert/update a `Skill` whose `skill_name` duplicates another Skill's `skill_name` (case-sensitivity/collation follows the DB engine's unique index behavior) → framework raises a duplicate-entry error (standard Frappe unique-constraint error, not a custom `frappe.throw` message from this doctype).
2. Because `autoname` is `field:skill_name`, the document's primary key (`name`) is derived from `skill_name` — if `skill_name` is blank, Frappe's generic naming layer raises its standard "Name is empty" / mandatory-naming-field error type (framework-level, no custom message in this file).

Port Note: no other business-rule validation exists on this doctype in source.

## Business Logic / Calculations

None. Pure lookup/master data doctype.

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| (none) | Controller class body is `pass` — no overridden lifecycle methods at all. | none |

## Whitelisted / API Methods

None defined in `skill.py`.

## Permissions

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| System Manager | 1 | 1 | 1 | 1 | 0 | 0 | 0 | 1 | 1 | also `email: 1`, `print: 1`, `share: 1` |
| HR Manager | 1 | 1 | 1 | 1 | 0 | 0 | 0 | 1 | 1 | also `email: 1`, `print: 1`, `share: 1` |
| HR User | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | read-only |

`track_changes: 1` — every field-level change is versioned in Frappe's Version doctype (audit trail must be built explicitly in a new stack if this behavior is required). See [[Implicit Framework Behaviors]].

## Scheduled Jobs Touching This Doctype

None found in `hrms/hooks.py`.

## Related Doctypes

- [[Designation Skill]] — consumer via its `skill` Link field.
- [[Employee Skill]] — consumer via its `skill` Link field.
- [[Expected Skill Set]] — consumer via its `skill` Link field.
- [[Skill Assessment]] — consumer via its `skill` Link field.

## Port Notes

- `skill.js` client script only has a commented-out, empty `refresh` handler — no real client-side logic to port.
- `title_field` is not set on this doctype (no `title_field` key in JSON), so list views default to `name` (= `skill_name`).
- `allow_in_quick_entry: 1` on both fields plus `quick_entry: 1` at doctype level: Frappe shows a lightweight "Quick Entry" modal (just these fields) instead of the full form when creating a new Skill from a link field's "Create New" action. This is a UX convenience with no server-side business-rule implication — a new stack can ignore it or replicate as a simplified create form.
- `row_format: "Dynamic"` is a list-view rendering hint (Frappe UI), not business logic.
- `sort_field: "creation"`, `sort_order: "ASC"` — default list ordering by creation timestamp ascending; replicate as default query order if list views are ported.
- This doctype is referenced as the `options` (link target) of the `skill` Link field in: `Employee Skill` (see `Employee Skill.md`), `Designation Skill` (see `Designation Skill.md`), `Skill Assessment` (see `Skill Assessment.md`), and `Expected Skill Set` (see `Expected Skill Set.md`). A new stack's `skills` table is the FK target for all of those child tables.
- No custom Python validation exists to prevent deleting a `Skill` that is still referenced by child-table rows elsewhere (Frappe's generic "Cannot delete because it is linked" framework check would apply automatically via the Link field metadata in the referencing child doctypes — this is implicit framework behavior, not custom code, and must be built explicitly as a referential-integrity check in a new stack).
