# Employee Training

**Source:** `hrms/hr/doctype/employee_training/employee_training.json`, `employee_training.py`
**Submittable:** no (child table — `istable: 1`)   **Tree:** no   **Naming:** standard Frappe child-table row naming (no `autoname` rule)
**Module:** HR

Child doctype. **Port Note:** unlike the other doctypes in this file set, `Employee Training` is not a child of `Training Event`/`Training Result`/`Training Feedback` — it is a small, separately-defined child table intended to be embedded as a `Table` field on the `Employee` doctype (owned by a different module agent) to let an Employee record list which trainings that employee attended. No doctype JSON in `hrms/hr/doctype/` was found that currently declares a `Table` field with `options: "Employee Training"` pointing at this child doctype (searched `hrms/hr/doctype/employee/employee.json` context is out of scope for this file — flag to the Employee doctype's owning agent to confirm whether/where this child table is actually wired in as a field). Document its own schema/logic here regardless, per assignment.

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| training | Training | Link | [[Training Event]] | No (not `reqd`) | — | No | shown in list view (grid column); links to a `Training Event` document despite the generic field label "Training" |
| training_date | Training Date | Date | — | No | — | No | `fetch_from: training.end_time` — a Date field fetching from a Datetime source field (Frappe will take the date portion of `Training Event.end_time`); shown in list view |

## Child Tables

N/A — this is itself a child table. No child tables of its own.

## State Machine

None. No status field, no docstatus-driven behavior, no lifecycle hooks.

## Validation Rules (exact, in execution order)

None. `employee_training.py`'s `EmployeeTraining` class body is `pass` — no custom `validate`. No fields are marked `reqd` in the schema, so even `training` can be left blank at the framework level.

## Business Logic / Calculations

None.

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| (none — controller is `pass`) | — | — |

## Whitelisted / API Methods

None.

## Permissions

`permissions: []` — governed entirely by whichever parent doctype ultimately embeds this table (per the Port Note above, not currently found wired to any parent in this repo's `hr` doctype folder as searched).

## Scheduled Jobs Touching This Doctype

None.

## Related Doctypes

- [[Training Event]] — via `training`: shown in list view (grid column); links to a `Training Event` document despite the generic field label "Training"

## Port Notes

- **Unresolved/ambiguous item:** could not confirm which parent doctype currently embeds `Employee Training` as a `Table` field (it is plausible this is embedded on `Employee` itself, which lives under a different module/owning agent's assignment — recommend that agent search `hrms/hr/doctype/employee/employee.json`'s `field_order`/`fields` for an `options: "Employee Training"` Table field to confirm placement, table ordering (`sort_field: creation`, `sort_order: ASC` — i.e., rows display oldest-first, the opposite sort order convention used by every other doctype in this file set, all of which sort `DESC`), and whether any Employee-side controller logic populates or reads this table). Noting this explicitly per the ground rule against inventing unconfirmed relationships.
- `track_changes: 1` is set on this child doctype's JSON (unusual for a child table — most child tables in this file set do not set this) — Frappe will keep field-level version history for edits to these rows if a parent's own tracked-change mechanism surfaces child-table diffs; a port needing full parity should build an equivalent audit trail specifically for this table's `training`/`training_date` fields.
- `training_date`'s `fetch_from: training.end_time` fetches a Datetime value into a Date-typed field — implement as "take the date component of the linked Training Event's end_time at the time this row's `training` link is set/saved" (point-in-time snapshot copy, not a live join, consistent with every other `fetch_from` field documented across this doctype's siblings).
