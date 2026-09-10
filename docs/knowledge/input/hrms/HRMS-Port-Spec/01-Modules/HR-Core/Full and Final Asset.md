# Full and Final Asset

**Source:** `hrms/hr/doctype/full_and_final_asset/full_and_final_asset.json`, `full_and_final_asset.py`, `full_and_final_asset.js`
**Submittable:** no (child table doctype)   **Tree:** no   **Naming:** none (child table row — Frappe auto-generates a `name`/row id; ordering is by `idx`)
**Module:** HR

This is a child-table doctype (`istable: 1`), owned exclusively by the `assets_allocated` Table field on `Full and Final Statement`.

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| reference | Reference | Link | Asset Movement | yes | — | yes | `columns: 2` (grid column width hint), in list view |
| status | Status | Select | `Owned\nReturned` | yes | — | no | `columns: 1`, in list view |
| description | Description | Small Text | — | no | — | no | Auto-populated by parent controller when `action == "Recover Cost"` and blank (see `Full and Final Statement` -> `set_total_asset_recovery_cost`) |
| asset_name | Asset Name | Data | — | no | — | yes | `columns: 2`, in list view |
| date | Date | Datetime | — | no | — | yes | |
| *(column_break_xezj)* | — | Column Break | — | — | — | — | layout only |
| action | Action | Select | `Return\nRecover Cost` | yes | `Return` | no | `columns: 2`, in list view |
| *(section_break_hudu)* | — | Section Break | — | — | — | — | layout only |
| cost | Cost | Currency | — | conditionally | — | conditionally read-only | `columns: 2`, in list view, `non_negative: 1` (framework-enforced: value cannot be < 0), `mandatory_depends_on: "eval:doc.action == \"Recover Cost\""`, `read_only_depends_on: "eval:doc.action != \"Recover Cost\""` — i.e. this field is editable ONLY when `action == "Recover Cost"`, and required in that same case. |
| account | Account | Link | Account | no | — | no | `columns: 1`, in list view |
| actual_cost | Actual Cost | Currency | — | no | — | yes | `columns: 2`. Set only by parent's `get_assets_movement()` when auto-generating rows (from the linked Asset's `total_asset_cost`) — not otherwise recalculated. |

`track_changes: 1`. `sort_field`: `creation` DESC.

## Child Tables

N/A (this doctype is itself a child table).

## State Machine

Not submittable. `status` (`Owned` / `Returned`) is a plain field with no controller-enforced transition logic on this child doctype itself — see `Full and Final Statement` -> `before_submit` -> `validate_assets()` for the parent-level rule that reads/writes this field:
- IF a row's `action == "Return"` AND `status == "Owned"` at submit time THEN the parent submission is blocked (asset not yet returned).
- IF a row's `action == "Recover Cost"` THEN the parent forces `status = "Owned"` at submit time (recovering the cost, rather than requiring physical return, still leaves the asset recorded as "Owned" by the employee in this record — i.e. cost recovery is treated as an alternative to a physical return, not equivalent to a return).

## Validation Rules (exact, in execution order)

None defined on this child doctype's own controller (`pass` body — no code at all). All logic affecting these fields lives in `Full and Final Statement`'s controller (see that file):
1. Framework-level: `cost` must be `>= 0` (`non_negative: 1`).
2. Framework-level: `cost` mandatory when `action == "Recover Cost"` (`mandatory_depends_on`).
3. Framework-level: `cost` is read-only in the UI when `action != "Recover Cost"` (`read_only_depends_on` — UI-level only; note this does NOT prevent an API caller from writing `cost` server-side when `action` is "Return", since `read_only_depends_on` is a client/form rendering hint, not a persisted server validation — the port should decide whether to also enforce this server-side, since Frappe itself does not enforce `read_only_depends_on` at the database/API layer).

## Business Logic / Calculations

Rows are typically auto-generated (not manually entered) by the parent's `get_assets_movement()` (see `Full and Final Statement.md`), which sources data from `Asset Movement Item` records where the employee is either the `to_employee` (inward) or `from_employee` (outward), counts net-inward assets still with the employee, and for each such asset builds a row: `reference = movement.parent (Asset Movement name)`, `asset_name`, `date = Asset Movement.transaction_date`, `actual_cost = cost = Asset.total_asset_cost`, `action = "Return"`, `status = "Owned"`.

## Lifecycle Hooks (exact)

None (child doctype controller body is `pass`).

## Whitelisted / API Methods

None on this doctype.

## Permissions

`permissions: []` (empty array in JSON) — child-table doctypes in Frappe do not carry their own permission rows; access is governed entirely by the parent document's (`Full and Final Statement`) permissions.

## Scheduled Jobs Touching This Doctype

None.

## Related Doctypes

- [[Full and Final Statement]] — parent via `assets_allocated` table.

## Port Notes

- **Client-only calc**: `full_and_final_asset.js` triggers `frm.trigger("calculate_total_receivable_amt")` on `cost` field change — this recalculates `total_asset_recovery_cost` and `total_receivable_amount` on the parent purely client-side for live UI feedback. The authoritative calculation is the server-side `set_total_asset_recovery_cost()` / `set_totals()` methods on `Full and Final Statement`, run at `validate()` — the port must implement the server-side calculation as the source of truth; the client recompute is a UX convenience only and must not be relied on.
- **`read_only_depends_on` is UI-only**: as noted above, a port targeting an API-first architecture must decide whether to add an explicit server-side guard preventing `cost` edits when `action != "Recover Cost"` — the original Frappe app does not enforce this at the database/controller level, only in the form renderer.
- **Row ownership**: since this is a pure child table, in a relational port it should be an owned/dependent table (foreign key to the parent `Full and Final Statement` id with cascade delete), not a standalone entity with its own lifecycle.
