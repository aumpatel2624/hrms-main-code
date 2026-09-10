# Implicit Framework Behaviors a Port Must Build Explicitly

None of this appears in any individual doctype's `.py` controller because Frappe
provides it automatically for every doctype. A port on a different stack gets none of
it for free — each item below needs to be built once, generically, and applied to
every table/entity.

## Automatic Metadata Fields

Every document (including every child-table row) silently carries:

| Field | Type | Set When |
|---|---|---|
| `name` | string PK | On insert, per the doctype's naming rule ([[Naming and Autoname Rules]]). |
| `owner` | User reference | On insert, the creating user — permanent, never changes. |
| `creation` | datetime | On insert. |
| `modified` | datetime | On every save, auto-updated. |
| `modified_by` | User reference | On every save, the saving user. |
| `docstatus` | 0/1/2 | See [[Submittable Document Lifecycle]]. |
| `idx` | integer | Row order within a parent's child table (child rows only). |
| `parent`, `parentfield`, `parenttype` | references | Child rows only — which parent document/field they belong to. |

**Port equivalent:** add these columns to every table, and enforce
`modified`/`modified_by` update via a DB trigger or ORM hook (not left to each
handler to remember) so it's impossible for a code path to forget it.

## Audit Trail (`track_changes`)

Doctypes with `"track_changes": 1` get every field-level change automatically logged
to a version history table, viewable per-document. `hooks.py`'s `audit_trail_doctypes`
list ([[Expense Claim]], [[Payroll Entry]], [[Salary Slip]], [[Leave Encashment]],
[[Gratuity]]) additionally marks these as needing a stricter/longer-retained audit
trail — treat this list as the doctypes where a port absolutely needs field-level
change history (who changed what value to what, when), even if you don't build full
versioning for every table.

## Optimistic Locking

Frappe stores a `modified` timestamp and rejects a save if the timestamp submitted by
the client doesn't match the current DB value (someone else saved in between) —
prevents silent overwrite of concurrent edits. **Port equivalent:** standard
optimistic-concurrency check (compare-and-swap on `modified`/a version column) on
every update.

## Currency/Float Precision

Currency fields round to the site's configured decimal precision automatically on
save (commonly 2 decimals, but configurable) — payroll and expense calculations rely
on this consistent rounding happening at the framework level rather than each
formula remembering to round. **Port equivalent:** a shared money/decimal type with
enforced rounding applied uniformly, not per-calculation ad hoc rounding (this is the
kind of thing that causes off-by-a-cent payroll bugs if skipped).

## Automatic Linked-Document Validation

A `Link` field is validated against the target doctype existing — Frappe won't save a
document referencing a non-existent `Employee`/`Department`/etc. **Port equivalent:**
foreign key constraints (or application-level existence checks if using a
non-relational store) on every reference field, not just the ones a controller
explicitly re-checks.

## Cascade Behavior on Delete/Cancel

Frappe blocks deleting a document that other documents still Link to (unless the
linking doctype is in `ignore_links_on_delete`, e.g. `PWA Notification` in this app's
`hooks.py`) and requires explicit `on_trash`/`on_cancel` handlers for anything more
nuanced (see `Company`'s `handle_linked_docs` in [[Cross-Doctype Hooks (doc_events)]]).
**Port equivalent:** default to `ON DELETE RESTRICT` on foreign keys, with explicit
cascade/cleanup logic only where a `Port Notes` section calls it out.

## Notifications / Email Templates

[[HR Settings]] and several doctypes reference configurable Email Template fields for
outbound notifications (hiring confirmations, leave status changes, etc.) rather than
hardcoded email bodies. A port should model notification content as
data (a template keyed by event type, with merge fields), not hardcoded strings, to
match this. There are no dedicated `notification/*.json` fixtures for most modules in
this app (confirmed absent per module agent reports for Leaves, Shift-Attendance,
Performance) — outbound email in those areas is driven by HR Settings' template
fields and inline `frappe.sendmail()` calls in controllers, documented per-doctype
where found.

## Reports and Dashboards

Out of scope for this port spec — reports (`hrms/*/report/`) and dashboard charts
(`hrms/*/dashboard_chart*/`) are read-only analytical views over the same tables
already specified; build them last, generically, once your core tables and business
logic are correct, using your own reporting stack's conventions rather than porting
Frappe's specific report/chart JSON format.

## Related

- [[Employee Core Model]] — the `owner`/`modified_by` metadata fields above resolve
  against `User`, distinct from the Employee's own `user_id` field.
- [[Background Jobs (Scheduler Events)]] — the scheduler itself is framework
  infrastructure a port must build explicitly, same as everything else in this file.
