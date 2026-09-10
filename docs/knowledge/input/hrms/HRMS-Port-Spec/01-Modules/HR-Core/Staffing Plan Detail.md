# Staffing Plan Detail

**Source:** `hrms/hr/doctype/staffing_plan_detail/staffing_plan_detail.json`, `staffing_plan_detail.py`
**Submittable:** no (child table doctype)   **Tree:** no   **Naming:** none (child table row)
**Module:** HR

Child-table doctype (`istable: 1`), owned exclusively by the `staffing_details` Table field on `Staffing Plan`. No `.js` file exists for this doctype specifically — its field-change handlers (`designation`, `vacancies`, `current_count`, `estimated_cost_per_position`) are defined inside `staffing_plan.js` under `frappe.ui.form.on("Staffing Plan Detail", {...})`.

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| designation | Designation | Link | Designation | yes | — | no | In list view |
| number_of_positions | Number Of Positions | Int | — | no | — | yes | In list view. Computed server-side in `set_number_of_positions()` — see `Staffing Plan.md` Business Logic. |
| estimated_cost_per_position | Estimated Cost Per Position | Currency | `options: "Company:company:default_currency"` (dynamic currency symbol tied to the parent's `company` field's default currency) | no | — | no | In list view, `non_negative: 1` (framework: value must be >= 0) |
| *(column_break_5)* | — | Column Break | — | — | — | — | layout only |
| current_count | Current Count | Int | — | no | — | yes | Computed server-side — count of currently Active employees with this designation (see `get_designation_counts` in `Staffing Plan.md`) |
| current_openings | Current Openings | Int | — | no | — | yes | Computed server-side — count of currently Open Job Openings with this designation |
| vacancies | Vacancies | Int | — | no | — | no | In list view, `non_negative: 1` |
| total_estimated_cost | Total Estimated Cost | Currency | `options: "Company:company:default_currency"` | no | — | yes | In list view. Computed server-side in `set_total_estimated_budget()` on the parent — see `Staffing Plan.md`. |

`track_changes: 1`. `quick_entry: 1`. `sort_field`: `creation` DESC.

## Child Tables

N/A (this doctype is itself a child table).

## State Machine

Not submittable, no status field — plain data row.

## Validation Rules (exact, in execution order)

None defined on this child doctype's own controller (`pass` body — no code). Framework-level constraints only:
1. `estimated_cost_per_position` must be `>= 0` (`non_negative: 1`).
2. `vacancies` must be `>= 0` (`non_negative: 1`).

All business-rule validation involving these fields (overlap checks, parent/subsidiary company budget checks) is performed by the PARENT `Staffing Plan` controller, iterating these rows — see `Staffing Plan.md` Validation Rules and Business Logic sections in full (do not duplicate here; that file is authoritative).

Client-only validation (NOT enforced server-side — see Port Notes): `staffing_plan.js`'s `vacancies` change handler: IF `child.vacancies < child.current_openings` THEN `frappe.throw(__("Vacancies cannot be lower than the current openings"))`.

## Business Logic / Calculations

None directly on this doctype — all computation (`number_of_positions`, `total_estimated_cost`, `current_count`, `current_openings`) is performed by the parent `Staffing Plan` controller's `set_total_estimated_budget()` and `set_number_of_positions()` methods, executed per-row during the parent's `validate()`. See `Staffing Plan.md` for the full numbered algorithm.

## Lifecycle Hooks (exact)

None (child doctype controller body is `pass`).

## Whitelisted / API Methods

None on this doctype directly. Note: client-side field handlers on this child doctype (defined in `staffing_plan.js`) call the parent-module whitelisted function `hrms.hr.doctype.staffing_plan.staffing_plan.get_designation_counts(designation, company)` to live-refresh `current_count`/`current_openings`/`number_of_positions` in the UI before save — see `Staffing Plan.md` Whitelisted Methods for full behavior of `get_designation_counts`.

## Permissions

`permissions: []` (empty array) — governed entirely by the parent `Staffing Plan` document's permissions.

## Scheduled Jobs Touching This Doctype

None.

## Related Doctypes

- [[Staffing Plan]] — parent via `staffing_details` table.

## Port Notes

- **Client-only "vacancies >= current_openings" validation is NOT server-enforced**: `staffing_plan.js`'s `vacancies` field handler throws client-side if `vacancies < current_openings`, but neither `staffing_plan_detail.py` nor `staffing_plan.py`'s `validate()`/`validate_details()`/`set_total_estimated_budget()` repeat this check server-side. A port that accepts API writes bypassing the form UI (e.g. a REST client) could persist `vacancies < current_openings` without any error. Flag this to the port owner as a candidate for adding server-side enforcement, since the ground truth genuinely lacks it.
- **All read-only computed fields (`number_of_positions`, `current_count`, `current_openings`, `total_estimated_cost`) are recalculated by the PARENT on every save** (`Staffing Plan.validate()` -> `set_total_estimated_budget()`), not by this child doctype itself, and not incrementally/lazily — every row is fully recomputed from live Employee/Job Opening counts each time the parent is saved. A port must replicate this "recompute all rows on every parent save" behavior, not treat these as one-time-computed/cached values.
- **Dynamic currency (`options: "Company:company:default_currency"`)**: Frappe resolves the currency symbol/precision for `estimated_cost_per_position` and `total_estimated_cost` dynamically from the Company named in the PARENT `Staffing Plan.company` field (Frappe's "fetch currency from a Link field on the parent" mechanism, denoted `Company:company:default_currency` where `company` here refers to the fieldname on the parent doc that names the Company). A new stack must resolve/store the currency code from the parent's company at read/write time rather than hardcoding a single currency for this column.
