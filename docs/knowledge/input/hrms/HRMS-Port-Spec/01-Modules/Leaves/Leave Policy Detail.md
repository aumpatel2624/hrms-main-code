# Leave Policy Detail

**Source:** `hrms/hr/doctype/leave_policy_detail/leave_policy_detail.json`, `leave_policy_detail.py`, `leave_policy_detail.js`
**Submittable:** no   **Tree:** no   **Naming:** child table row — standard Frappe child-doctype naming (auto-generated `name` = hash/idx-based row id; not user-facing). `istable: 1`.
**Module:** HR

This is a **child table doctype**, owned exclusively by `Leave Policy.leave_policy_details`. It has no standalone list view or permissions of its own.

## Schema

Full field table, in JSON `field_order`:

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| leave_type | Leave Type | Link | [[Leave Type]] | Yes (`reqd`) | — | No | `in_list_view: 1`, `columns: 3` (grid column width hint); client script (in parent `leave_policy.js`) auto-fills `annual_allocation` from `Leave Type.max_leaves_allowed` when this changes — CLIENT-SIDE ONLY, see `Leave Policy.md` Port Notes |
| annual_allocation | Annual Allocation | Float | — | Yes (`reqd`) | — | No | `in_list_view: 1`, `columns: 2`, `non_negative: 1`; server-validated against `Leave Type.max_leaves_allowed` in the parent `Leave Policy.validate()` (see `Leave Policy.md` Validation Rules #1) |

Implicit child-row system fields (auto-generated types confirm these exist per standard Frappe child-table convention, not itemized in the JSON `fields` array): `parent` (Data — parent doc name), `parentfield` (Data — `"leave_policy_details"`), `parenttype` (Data — `"Leave Policy"`), plus standard `idx` (row order), `name`, `creation`, `modified`, `modified_by`, `owner`.

`track_changes: 1`, `quick_entry: 1` (allows this child row to be filled via a Frappe "Quick Entry" modal dialog — UI convenience only).

## Child Tables

N/A — this is itself a child table doctype with no nested tables of its own.

## State Machine

Not submittable, no docstatus of its own beyond inheriting the parent's (child rows are locked from editing once the parent `Leave Policy` is submitted, since `leave_policy_details` on the parent has no `allow_on_submit: 1`).

## Validation Rules (exact, in execution order)

The controller class body is literally `pass` — **no validation logic exists on `Leave Policy Detail` itself.** All validation of its fields (the `annual_allocation` vs. `Leave Type.max_leaves_allowed` cap) happens in the **parent** `Leave Policy.validate()` method, iterating `self.leave_policy_details` (see `Leave Policy.md`, Validation Rules #1, for the exact condition and exact thrown message).

Field-level constraints enforced purely by the framework from the JSON schema (not custom Python code): `leave_type` required (`reqd: 1`) and must reference an existing `Leave Type`; `annual_allocation` required (`reqd: 1`) and non-negative (`non_negative: 1`, i.e. framework rejects negative values before `validate()` even runs).

## Business Logic / Calculations

None on this doctype directly. `annual_allocation` is the input value consumed downstream by `Leave Policy Assignment.create_leave_allocation` / `get_new_leaves` (pro-ration and earned-leave schedule math — see `Leave Policy Assignment.md`) and by the scheduler job `allocate_earned_leaves` (via `get_annual_allocation_from_policy`, which reads `Leave Policy Detail` by `{"parent": <leave_policy_name>, "leave_type": <leave_type_name>}` to fetch the `annual_allocation` figure for ongoing earned-leave scheduler runs).

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| (none) | Controller has no method overrides (`pass`) | none |

Row-level validation happens as part of the **parent** `Leave Policy`'s `validate` event, not this doctype's own event (child-table rows do not fire their own independent `validate` hook in Frappe when saved as part of a parent doc save — the parent's `validate()` explicitly loops over the child rows).

## Whitelisted / API Methods

None. It is also read (not written) by `hrms.hr.utils.get_annual_allocation_from_policy` (plain internal function, not `@frappe.whitelist()`), used by the `allocate_earned_leaves` scheduled job.

## Permissions

`"permissions": []` — empty in the JSON. As a child table (`istable: 1`), Frappe does not apply independent role permissions to it; access is governed entirely by the parent `Leave Policy` doctype's permissions (see `Leave Policy.md`).

## [[Background Jobs (Scheduler Events)|Scheduled Jobs]] Touching This Doctype

- `daily_long` -> `hrms.hr.utils.allocate_earned_leaves`: reads (not writes) `Leave Policy Detail` rows via `get_annual_allocation_from_policy(allocation, e_leave_type)`, which does `frappe.db.get_value("Leave Policy Detail", filters={"parent": allocation.leave_policy, "leave_type": e_leave_type.name}, fieldname=["annual_allocation"])`. This value feeds `update_previous_leave_allocation`'s cap check against the annual allocation (see `Leave Policy Assignment.md` for the full trace).

## Related Doctypes

- [[Leave Policy]] — parent doctype; this table is embedded via its `leave_policy_details` Table field.
- [[Leave Type]] — `leave_type` Link field; each row pairs a leave type with an `annual_allocation`.

## Port Notes

- As a child table, this maps most naturally in a relational port to a plain **owned-rows table** (e.g. `leave_policy_detail(id, leave_policy_id FK -> leave_policy.id, idx, leave_type_id FK -> leave_type.id, annual_allocation, created_at, updated_at)`) with an `ON DELETE CASCADE` from `leave_policy` — it is not a many-to-many join table since each row is exclusively owned by exactly one parent Leave Policy and carries its own scalar data (`annual_allocation`), not just a foreign-key pair. It should still be modeled as its own table (not flattened/denormalized into `Leave Policy`) since a Leave Policy has an arbitrary number of these rows (one per Leave Type it covers).
- The `idx` column (row order within the parent) must be preserved explicitly in a port, since Frappe always maintains and displays child rows in `idx` order in the grid UI, and (as this file's Port Notes and `Leave Policy.md` note) other logic may implicitly rely on iteration order over `leave_policy_details` in `Leave Policy.validate()` and `Leave Policy Assignment.grant_leave_alloc_for_employee()` (both iterate in table order, i.e. `idx` order).
- `quick_entry: 1` is a pure UI/UX flag (enables a simplified add-row dialog) with no business-rule implication for a port.
- No uniqueness constraint exists in the schema preventing duplicate `leave_type` rows within the same `Leave Policy` (i.e. the same Leave Type could theoretically appear twice in one policy's `leave_policy_details`, and nothing in `Leave Policy.validate()` or this doctype's `pass`-only controller rejects that). Flagging this explicitly per ground rules — it is a plausible expected constraint that is NOT actually enforced in source. A port should decide deliberately whether to add a `UNIQUE(leave_policy_id, leave_type_id)` constraint (tightening) or intentionally preserve the current permissive behavior for parity.
