# Payroll Period Date

**Source:** `hrms/payroll/doctype/payroll_period_date/payroll_period_date.json` (no `.py` controller beyond the framework default `Document` base class; no `.js`)
**Submittable:** no   **Tree:** no   **Naming:** child table — no independent naming; framework-generated `name` (hash) within the parent's `periods` table
**Module:** Payroll

Child table of `Payroll Period` (fieldname `periods`, options `Payroll Period Date`). `istable: 1`, `quick_entry: 1`, `track_changes: 1`. As noted in `Payroll Period.md`, no controller code in this repo currently populates this table — it exists in schema only.

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| start_date | Start Date | Date | — | Yes | — | No | in_list_view |
| end_date | End Date | Date | — | Yes | — | No | in_list_view |

## Child Tables

N/A — this is itself a leaf child doctype with no nested tables.

## State Machine

N/A — not submittable, no status field.

## Validation Rules (exact, in execution order)

None (no `.py` controller override exists beyond the framework `Document` base — `start_date`/`end_date` being `reqd: 1` is the only enforcement, applied generically by the framework's mandatory-field check on save).

## Business Logic / Calculations

None. No code in the repository reads, writes, or computes against `Payroll Period Date` rows.

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| (none) | — | — |

## Whitelisted / API Methods

None.

## Permissions

No `permissions` array entries (`"permissions": []`) — governed by the parent `Payroll Period` doctype's permissions.

## Scheduled Jobs Touching This Doctype

None.

## Related Doctypes

- [[Payroll Period]] — sole parent doctype (`periods` field); this child table's section is hidden and unpopulated by any controller code in this repo.

## Port Notes

- This doctype is present purely as a schema shell for a feature (sub-period breakdown of a Payroll Period) that has no implemented logic anywhere in this version of the source tree. A port should still create the table (per the shared spec's "cover every doctype including child tables" rule) but should flag to product/engineering stakeholders that there is currently no generation, validation, or consumption logic to replicate — this is a genuine gap in the source, not an omission in this spec.
- Model as an owned-rows child table with a foreign key to the parent `Payroll Period` (e.g. `payroll_period_id`), consistent with `Payroll Employee Detail`'s treatment.
