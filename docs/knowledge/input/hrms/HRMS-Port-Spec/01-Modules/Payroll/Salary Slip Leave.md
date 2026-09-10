# Salary Slip Leave

**Source:** `hrms/payroll/doctype/salary_slip_leave/salary_slip_leave.json`, `salary_slip_leave.py`
**Submittable:** no   **Tree:** no   **Naming:** child table (no autoname; row identified by parent+idx)
**Module:** Payroll

Child table of `Salary Slip` (field `leave_details`, table field on `Salary Slip`, tab "Leaves"). Read-only snapshot row of one leave type's balance as of the slip's `end_date`.

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| leave_type | Leave Type | Link | [[Leave Type]] | No | — | Yes | `no_copy` |
| total_allocated_leaves | Total Allocated Leave(s) | Float | — | No | — | Yes | `no_copy` |
| expired_leaves | Expired Leave(s) | Float | — | No | — | Yes | `no_copy` |
| used_leaves | Used Leave(s) | Float | — | No | — | Yes | `no_copy` |
| pending_leaves | Leave(s) Pending Approval | Float | — | No | — | Yes | `no_copy` |
| available_leaves | Available Leave(s) | Float | — | No | — | Yes | `no_copy` |

`track_changes: 1` at doctype level (unusual for a child table — Frappe still tracks version history of the parent's changes to this child).

## Child Tables

None (leaf child table).

## State Machine

Not applicable — child table, no docstatus/workflow of its own; lifecycle is entirely driven by its parent `Salary Slip`.

## Validation Rules (exact, in execution order)

None. The controller class body is `pass` — no `validate()` override. All values are computed and written by the parent `Salary Slip.add_leave_balances()` method (see `Salary Slip.md`), not validated independently.

## Business Logic / Calculations

This doctype carries no computation of its own. It is a pure data-transfer row populated by `Salary Slip.add_leave_balances()`:

1. `Salary Slip.add_leave_balances()` first clears the table: `self.set("leave_details", [])`.
2. IF Payroll Settings' `show_leave_balances_in_salary_slip` is checked THEN:
   a. Call `get_leave_details(employee, salary_slip.end_date, True)` (defined in `Leave Application` — owned by another module) to get, per leave type, `total_leaves`, `expired_leaves`, `leaves_taken`, `leaves_pending_approval`, `remaining_leaves` as of the slip's end date.
   b. For each leave type in the result, append one `Salary Slip Leave` row mapping:
      - `leave_type` = leave type name
      - `total_allocated_leaves` = `flt(total_leaves)`
      - `expired_leaves` = `flt(expired_leaves)`
      - `used_leaves` = `flt(leaves_taken)`
      - `pending_leaves` = `flt(leaves_pending_approval)`
      - `available_leaves` = `flt(remaining_leaves)`
3. IF the setting is off, the table stays empty.

## Lifecycle Hooks (exact)

None on this child doctype itself — it has no `validate`/`on_submit`/etc. All population happens inside the parent `Salary Slip.validate()` (which calls `add_leave_balances()` on every save, draft or submit).

## Whitelisted / API Methods

None.

## Permissions

`permissions: []` in the JSON — no independent permission rows. Access is governed entirely by the parent `Salary Slip` doctype's permissions (standard Frappe child-table behavior).

## Scheduled Jobs Touching This Doctype

None found.

## Related Doctypes

- [[Salary Slip]] — sole parent doctype (`leave_details` field); fully cleared and repopulated by `add_leave_balances()` on every save.
- [[Leave Type]] — identifies which leave type each snapshot row summarizes.
- [[Leave Application]] — its `get_leave_details()` helper (from the Leaves module) is the actual source of the five balance numbers per leave type.

## Port Notes

- Purely a computed, denormalized snapshot — a re-implementation could store this as JSON on the Salary Slip row instead of a separate table, but a relational child table (FK to salary_slip id) is the direct equivalent and preserves per-leave-type reporting.
- Data is recomputed and **fully replaced** (not merged/upserted) on every parent save, including after submission is not re-triggered (only `validate()` on the parent runs this, and `validate()` runs pre-save for both draft saves and submit) — a port must replicate "delete all rows, reinsert" semantics rather than diff-based upsert.
- Depends on `Leave Application`/leave-balance logic owned by a different module's `get_leave_details()` — treat that as an external service call returning the 5 numbers per leave type.
- `track_changes: 1` on a child table is a Frappe-specific audit feature (child row diffs recorded against the parent's version history) — a port needs an explicit audit-log mechanism if this history is required; it is not automatic in most other stacks.
