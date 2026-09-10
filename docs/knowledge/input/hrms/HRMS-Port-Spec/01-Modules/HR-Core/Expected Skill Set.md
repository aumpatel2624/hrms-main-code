# Expected Skill Set

**Source:** `hrms/hr/doctype/expected_skill_set/expected_skill_set.json`, `expected_skill_set.py`
**Submittable:** no   **Tree:** no   **Naming:** child table doctype — no `autoname`; generic auto-generated row `name` plus `parent`/`parentfield`/`parenttype`. `istable: 1`.
**Module:** HR

This doctype folder exists exactly as named under `hrms/hr/doctype/expected_skill_set/` — it is a real, distinct child-table doctype (not a field pattern embedded elsewhere). Its title is "Expected Skillset" when used as a field label on its parent.

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| skill | Skill | Link | [[Skill]] | yes (`reqd: 1`) | — | no | `in_list_view: 1` |
| description | Description | Small Text | — | no | — | no | `in_list_view: 1`; `fetch_from: "skill.description"` — auto-copied from the linked `Skill.description` |

`field_order`: `["skill", "description"]`.

`editable_grid: 1`, `index_web_pages_for_search: 1` (Frappe global-search indexing flag — no custom business logic).

## Child Tables

N/A — this is itself a child table.

## State Machine

Not submittable, no status field. Lifecycle is entirely bound to its parent document.

## Validation Rules (exact, in execution order)

`expected_skill_set.py` controller body is `class ExpectedSkillSet(Document): pass` — **no custom validation code**.

Implicit framework-level constraint:
1. `skill` is mandatory (`reqd: 1`) — a row with `skill` blank fails Frappe's generic mandatory-field validation at save time.
2. `description` auto-populates from `skill.description` via `fetch_from` whenever `skill` is set/changed and the parent document is saved — purely framework plumbing, no custom code.

## Business Logic / Calculations

None.

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| (none) | Controller class body is `pass`. | none |

## Whitelisted / API Methods

None defined directly on this child doctype. Note (cross-doctype, for context only — not part of this doctype's own API surface): `hrms/hr/doctype/interview/interview.py` defines a whitelisted function `get_expected_skill_set(interview_type: str)` that runs `frappe.get_all("Expected Skill Set", filters={"parent": interview_type}, fields=["skill"], order_by="idx")` to fetch this table's rows for a given `Interview Type` parent. This belongs to the `Interview` doctype's API surface (owned by the Recruitment module) and is documented there, not here — referenced by name only per the module-boundary ground rule.

## Permissions

`"permissions": []` — governed entirely by the parent doctype embedding it.

**Parent doctype found in this repo:** `hrms/hr/doctype/interview_type/interview_type.json` declares a `Table` field `expected_skill_set` (label "Expected Skillset", `reqd: 1`) with `options: "Expected Skill Set"`. `Interview Type` belongs to the Recruitment module and is out of scope for this HR-Core file set — cross-referenced by name only.

## Scheduled Jobs Touching This Doctype

None found in `hrms/hooks.py`.

## Related Doctypes

- [[Skill]] — via `skill`: `in_list_view: 1`

## Port Notes

- Confirmed distinct from `Designation Skill`: unlike `Designation Skill` (which has only a `skill` field, not required), `Expected Skill Set` has both `skill` (required) and a fetched `description`, and its real-world parent in this repo is `Interview Type` (Recruitment module), not `Designation`. Do not conflate the two child tables — they are structurally and semantically different despite both wrapping a `Skill` link.
- `track_changes: 1` is set — child-row versioning tied to `Interview Type`.
- `sort_order: "DESC"` (unusual for a child table meant to be entered in a defined skill-priority order — most child tables in this module default to `ASC`); replicate this default ordering if list/grid ordering by `creation` matters, though in practice child-table row order is normally driven by `idx`, and the `Interview` controller's whitelisted method explicitly orders by `idx` when reading these rows, not by `creation`/`sort_order`.
