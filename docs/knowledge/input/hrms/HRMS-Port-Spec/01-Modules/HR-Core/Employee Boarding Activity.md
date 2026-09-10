# Employee Boarding Activity

**Source:** `hrms/hr/doctype/employee_boarding_activity/employee_boarding_activity.json`, `employee_boarding_activity.py`
**Submittable:** no (child table, `istable: 1`)   **Tree:** no   **Naming:** child table row — no `autoname`; identified by `(parent, parenttype, parentfield, idx)` per Frappe's standard child-table addressing (plus its own internal `name`, a random hash, auto-generated).
**Module:** HR

This is a shared child doctype used as the `activities` table on three parent doctypes: `Employee Onboarding`, `Employee Onboarding Template`, `Employee Separation`, and `Employee Separation Template`.

## Schema

Full field list, in JSON `field_order`:

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| activity_name | Activity Name | Data | — | Yes | — | No | `in_list_view`, `columns: 3`. |
| user | User | Link | User | No | — | No | `columns: 2`, `in_list_view`. `depends_on: "eval:!doc.role"` — UI-only mutual exclusivity with `role`, not enforced server-side (see Port Notes). |
| role | Role | Link | Role | No | — | No | `columns: 1`. `depends_on: "eval:!doc.user"` — UI-only, same caveat. |
| task | Task | Link | Task | No | — | Yes | *(column_break_3)* `no_copy: 1`. Populated only by `EmployeeBoardingController.create_task_and_notify_user` via direct `db_set`; cleared to `""` on parent amendment and on parent cancel. |
| task_weight | Task Weight | Float | — | No | — | No | `non_negative: 1`. Copied to the generated `Task.task_weight`. |
| required_for_employee_creation | Required for Employee Creation | Check | — | No | `0` | No | `depends_on: "eval:['Employee Onboarding', 'Employee Onboarding Template'].includes(doc.parenttype)"` — field is only shown in the UI when the row's parent is one of those two doctypes (i.e. hidden when parent is Employee Separation / Employee Separation Template), but the underlying column and stored value exist regardless of parenttype. Field description: "Applicable in the case of Employee Onboarding". |
| description | Description | Text Editor | — | No | — | No | *(section_break_6)* Copied to generated `Task.description`; used as the assignment description if set (`task.description or task.subject`). |
| duration | Duration (Days) | Int | — | No | — | No | `non_negative: 1`, `columns: 2`, `in_list_view`. Offset in days, added to `begin_on` to compute `Task.exp_end_date`. |
| begin_on | Begin On (Days) | Int | — | No | — | No | `non_negative: 1`, `columns: 2`, `in_list_view`. Offset in days from the parent's `boarding_begins_on` to compute `Task.exp_start_date`. |

`quick_entry: 1` is set (allows quick add of a row via a mini-dialog in the desk grid — UI convenience only).

## Child Tables

N/A — this doctype has no child tables of its own.

## State Machine

Not submittable; no status field. Lifecycle is entirely governed by its parent document's docstatus and by direct `db_set` writes to the `task` field from the parent controller.

## Validation Rules (exact, in execution order)

None. The controller class body is `pass`. All constraints visible are declarative schema constraints only:
1. `activity_name` is mandatory (`reqd: 1`) — generic Frappe mandatory-field check, no custom message.
2. `task_weight`, `duration`, `begin_on` are `non_negative: 1` — generic Frappe non-negative numeric check (raises Frappe's standard "Value cannot be negative" style error if a negative number is entered), no custom message in this doctype's own code.

## Business Logic / Calculations

None directly on this doctype. Its `begin_on`/`duration` values are consumed by the parent controller's `get_task_dates` calculation — see `Employee Onboarding.md` → "Shared Boarding Controller Logic" for the full formula (this file does not duplicate it to keep one canonical source, per the port spec's precision-over-duplication intent, but flags here that these two fields are NOT self-contained — they only have meaning combined with the parent's `boarding_begins_on` and the effective holiday list).

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| (none, child doctype) | No controller hooks (`pass`). All mutation of this row happens from the parent's controller (`EmployeeBoardingController`): `task` is set via `activity.db_set("task", task.name)` on parent `on_submit`/`on_update_after_submit`, and cleared via `activity.db_set("task", "")` on parent `on_cancel`, and cleared via direct assignment (`activity.task = ""`) inside parent `validate()` when `self.amended_from` is set. | Indirectly creates a `Task` per row when parent submits (if `task` not already set); indirectly deletes that `Task` when the parent is cancelled (via parent's `on_cancel` force-deleting all Tasks under its Project). |

## Whitelisted / API Methods

None on this doctype directly. It is read via the shared whitelisted function `get_onboarding_details(parent, parenttype)` (documented in `Employee Onboarding.md`), which returns rows of this child doctype filtered by `{parent, parenttype}`, ordered by `idx`.

## Permissions

`"permissions": []` in the JSON — empty array. Per Frappe convention, a child table (`istable: 1`) has no independent permission set; its effective permissions are inherited entirely from whichever parent document row it belongs to (a user who can read/write the parent can read/write its child rows). No standalone role-based access table applies.

## Scheduled Jobs Touching This Doctype

None.

## Related Doctypes

- [[Employee Onboarding]] — parent via `activities` table.
- [[Employee Onboarding Template]] — parent via `activities` table.
- [[Employee Separation]] — parent via `activities` table.
- [[Employee Separation Template]] — parent via `activities` table.

## Port Notes

- **Client-only validation needing a server-side equivalent:** the `depends_on` mutual-exclusivity between `user` and `role` (`eval:!doc.role` / `eval:!doc.user`) is purely a UI show/hide condition — it does NOT prevent both `user` and `role` from being set simultaneously, nor does it prevent both being empty, at the server/database level. Neither `employee_boarding_activity.py` nor the parent controllers enforce this. If a port wants server-side enforcement (e.g., "exactly one of user/role must be set"), that would be a new validation not present in the original — call this out as a deliberate deviation if added; per ground rules do NOT silently add it.
- Because this is a shared child table across 4 different parent doctypes, and `required_for_employee_creation`'s `depends_on` list only names `Employee Onboarding`/`Employee Onboarding Template`, a port's UI layer should replicate that field-visibility rule per parent type, but the column itself must exist in the underlying child table schema regardless (a single physical table if reusing Frappe's shared-child-table pattern, or four separate child tables if the target ORM prefers per-parent tables — see `_Module-Spec.md` for the recommended relational shape).
- `quick_entry: 1` is UI-only (desk grid quick-add dialog); no server behavior to port.
- `track_changes: 1` on the child doctype — Frappe still records field-level history for child table rows under the parent document's version trail; a port needs to capture child-row changes in its audit log if reproducing full history.
- No default naming pattern needs porting beyond the generic child-row identity (`parent`, `parenttype`, `parentfield`, `idx`) plus a unique row id — this is standard Frappe child-table plumbing, not custom to this doctype.
