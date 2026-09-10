# Leave Block List Date

**Source:** `hrms/hr/doctype/leave_block_list_date/leave_block_list_date.json`, `leave_block_list_date.py`
**Submittable:** no   **Tree:** no   **Naming:** child table row — standard Frappe auto-generated row `name` (hash), no `autoname` rule defined
**Module:** HR

This is a **child table doctype** (`istable: 1`), owned exclusively by `Leave Block List` via its `leave_block_list_dates` Table field. It has no independent list view, no permissions of its own, and is always created/edited/deleted as part of its parent document.

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| `block_date` | Block Date | Date | — | Yes | — | No | `in_list_view: 1`; `print_width`/`width`: 200px |
| `reason` | Reason | Text | — | Yes | — | No | `in_list_view: 1`; `print_width`/`width`: 200px |

Standard child-table system columns implied by the framework (must be modeled explicitly in a relational port): `parent` (FK to `Leave Block List.name`), `parentfield` (= `"leave_block_list_dates"`), `parenttype` (= `"Leave Block List"`), `idx` (row order within the parent).

## Child Tables

N/A — this doctype has no Table fields of its own.

## State Machine

Not submittable. No state machine.

## Validation Rules (exact, in execution order)

None. The controller class body is `pass` — no `validate`, no other lifecycle methods. All enforcement is at the schema level (`block_date` and `reason` both `reqd: 1`). The one cross-row validation involving this child table (duplicate `block_date` within the same parent) lives in the **parent** `Leave Block List.validate()` — see `Leave Block List.md` Validation Rules #1. It is not implemented here.

## Business Logic / Calculations

None.

## Lifecycle Hooks (exact)

None defined on this doctype's controller.

## Whitelisted / API Methods

None.

## Permissions

`permissions: []` in the JSON — child tables inherit access control entirely from the parent document (`Leave Block List`); there is no independent permission set to document here.

## Scheduled Jobs Touching This Doctype

None.

## Related Doctypes

- [[Leave Block List]] — parent doctype; this table is embedded via its `leave_block_list_dates` Table field.

## Port Notes

- As a child table, in a relational port this becomes an owned-rows table (e.g. `leave_block_list_date` with a `leave_block_list_id` FK, `ON DELETE CASCADE` when the parent is deleted) rather than a join table — there is no independent identity or reuse across parents.
- `sort_order: "DESC"` / `sort_field: "creation"` in the JSON governs default list ordering when the child table is queried outside its parent context (rare) — for the in-form grid, actual row order is governed by `idx`, which the port must maintain explicitly since it is Frappe's implicit ordering column.
- Every field pair (`in_list_view`, `print_width`, `width`) is display-only convention; no logic significance beyond that this table renders both columns in the grid.
