# Leave Block List Allow

**Source:** `hrms/hr/doctype/leave_block_list_allow/leave_block_list_allow.json`, `leave_block_list_allow.py`
**Submittable:** no   **Tree:** no   **Naming:** child table row — standard Frappe auto-generated row `name` (hash), no `autoname` rule defined
**Module:** HR

This is a **child table doctype** (`istable: 1`), owned exclusively by `Leave Block List` via its `leave_block_list_allowed` Table field. It has no independent list view, no permissions of its own, and is always created/edited/deleted as part of its parent document.

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| `allow_user` | Allow User | Link | User | Yes | — | No | `in_list_view: 1`; `print_width`/`width`: 200px |

Standard child-table system columns implied by the framework (must be modeled explicitly in a relational port): `parent` (FK to `Leave Block List.name`), `parentfield` (= `"leave_block_list_allowed"`), `parenttype` (= `"Leave Block List"`), `idx` (row order within the parent).

## Child Tables

N/A — this doctype has no Table fields of its own.

## State Machine

Not submittable. No state machine.

## Validation Rules (exact, in execution order)

None. The controller class body is `pass` — no `validate`, no other lifecycle methods. All enforcement is at the schema level (`allow_user` is `reqd: 1`, and must reference an existing `User`). No dedupe check exists preventing the same `allow_user` from being added twice to the same parent's `leave_block_list_allowed` table.

## Business Logic / Calculations

None on this doctype itself. It is read by the module-level function `is_user_in_allow_list(block_list)` defined in `leave_block_list.py` (see `Leave Block List.md` Port Notes) — that function queries `Leave Block List Allow` rows filtered by `parent = block_list` and `allow_user = frappe.session.user` to determine whether the current session user is exempt from a given block list. This cross-doctype read is the entire purpose of this child table; the actual leave-blocking decision logic belongs to `Leave Application` (documented in `Leave Application.md`).

## Lifecycle Hooks (exact)

None defined on this doctype's controller.

## Whitelisted / API Methods

None.

## Permissions

`permissions: []` in the JSON — child tables inherit access control entirely from the parent document (`Leave Block List`); there is no independent permission set to document here.

## Scheduled Jobs Touching This Doctype

None.

## Related Doctypes

- [[Leave Block List]] — parent doctype; this table is embedded via its `leave_block_list_allowed` Table field.

## Port Notes

- As a child table, in a relational port this becomes an owned-rows table (e.g. `leave_block_list_allow` with a `leave_block_list_id` FK, `ON DELETE CASCADE` when the parent is deleted) rather than a join table in the strict sense, though functionally it behaves like a many-to-many mapping between `Leave Block List` and `User` (one block list can allow many users; a user can appear on many block lists' allow lists). Model it either as an owned-rows table (matching Frappe's structure exactly) or as a proper `leave_block_list_allowed_users` join table with a unique `(leave_block_list_id, user_id)` constraint — the latter also closes the missing-dedupe gap noted above, which the source code does not enforce.
- `sort_order: "DESC"` / `sort_field: "creation"` governs default ordering outside the parent form context; in-form order follows `idx`.
