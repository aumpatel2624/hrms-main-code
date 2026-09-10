# Gratuity Rule Slab

**Source:** `hrms/payroll/doctype/gratuity_rule_slab/gratuity_rule_slab.json`, `gratuity_rule_slab.py`
**Submittable:** no (child table, `istable: 1`)   **Tree:** no   **Naming:** child-table row naming (Frappe auto-generates a `hash`-style internal `name`; no user-facing autoname rule)
**Module:** Payroll

Child table of `Gratuity Rule` (field `gratuity_rule_slabs`). Represents one years-of-service bracket and the fraction of applicable earnings payable for that bracket.

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| from_year | From(Year) | Int | — | yes | 0 | yes (UI read-only; server does not enforce read-only, only the UI does) | `in_list_view`; lower bound of years-of-service bracket, inclusive |
| to_year | To(Year) | Int | — | yes | 0 | no | `in_list_view`, `non_negative`; upper bound, inclusive; `0` combined with `from_year` semantics means "no upper limit" per parent doctype's field description |
| fraction_of_applicable_earnings | Fraction of Applicable Earnings | Float | — | yes | — | no | `in_list_view`, `non_negative`; multiplier (e.g. 0.5 = half of one year's applicable-earnings total per year of service) applied per `Gratuity.get_gratuity_amount` |

Row order (`idx`) is significant — slabs are evaluated in table row order by `Gratuity.get_gratuity_rule_slabs()` (`order_by="idx"`), and the algorithm depends on slabs being defined in ascending year order (per the client-script comment in `gratuity_rule.js`: "So, on row addition setting current_row.from = previous row.to. Wrong order may lead to Wrong Calculation").

`quick_entry: 1`. `track_changes: 1` (inherited row-level change tracking as part of parent's versioning). `permissions: []` — no doctype-level permissions of its own; access is governed entirely through the parent `Gratuity Rule`'s permissions.

## Child Tables

N/A — this is itself a child table with no children of its own.

## State Machine

Not submittable, no status field. Rows exist only as part of a parent `Gratuity Rule` save.

## Validation Rules (exact, in execution order)

The controller class (`gratuity_rule_slab.py`) is a bare `pass` — **no row-level validation exists in this doctype's own controller.** All cross-row/ordering validation for slabs is implemented in the PARENT doctype's `validate()` method (see `Gratuity Rule.md` Validation Rules #1 and #2), which iterates the parent's `gratuity_rule_slabs` table.

Framework-level: `from_year`, `to_year`, `fraction_of_applicable_earnings` are all `reqd`; `to_year` and `fraction_of_applicable_earnings` are `non_negative` (framework rejects negative values before doc-level validate runs).

## Business Logic / Calculations

No calculation logic lives on this doctype. Its three fields are pure inputs consumed by `Gratuity.get_gratuity_amount()` — see the full algorithm in `Gratuity.md`. Summary of how each field participates:
- `from_year` / `to_year`: define the inclusive bracket boundaries checked via `_is_experience_within_slab` (`from_year <= experience <= to_year`, or `to_year == 0` treated as +infinity) and `_is_experience_beyond_slab` (`from_year < experience AND to_year < experience AND to_year != 0`).
- `fraction_of_applicable_earnings`: multiplier against `total_component_amount` (see `Gratuity.md`), applied either to the full years of experience ("Current Slab" mode) or to the width of the completed slab / remaining years ("Sum of all previous slabs" mode).

## Lifecycle Hooks (exact)

None — controller class body is `pass`.

## Whitelisted / API Methods

None.

## [[Permission Model (RBAC)|Permissions]]

No doctype-level `permissions` array entries (`permissions: []` in JSON). Access control is entirely inherited from the parent `Gratuity Rule` document's permissions (standard Frappe child-table behavior: a user who can read/write the parent Gratuity Rule can read/write its slab rows).

## Scheduled Jobs Touching This Doctype

None.

## Related Doctypes

- [[Gratuity Rule]] — parent doctype; this child table's rows (`gratuity_rule_slabs`) belong to, and are ordered (`idx`) within, a single Gratuity Rule record.
- [[Gratuity]] — reads these slab rows via `Gratuity Rule.get_gratuity_rule_slabs()` to compute the gratuity amount for an employee.

## Port Notes

- **This is a genuine child table, not a lookup/reference table** — in a relational port it should be modeled as its own table with a foreign key to the parent `Gratuity Rule` (e.g. `gratuity_rule_id`), plus an explicit `idx`/`sort_order` integer column, since row order drives the calculation algorithm and Frappe's `idx` is exactly this ordering column.
- **`from_year` is UI-read-only but not server-enforced**: the JSON marks `from_year` `"read_only": 1` — this is a form/UI convention (client script auto-fills it from the previous row's `to_year`) but nothing in the Python controller prevents a value being written directly via the API/import. A port should decide explicitly whether to enforce this server-side (current source does not).
- **No server-side check that slabs are contiguous/non-overlapping/ascending** beyond the two checks living in the parent's `validate()` (`from_year > to_year` rejected; only one `0/0` "unlimited" slab allowed). Gaps between slabs (e.g. slab A `to_year=4`, slab B `from_year=6`) or overlaps are NOT rejected by any code found — they would silently produce whatever result the iteration order happens to yield (potentially "No applicable slab found" for years 4–6, or double-counting under overlap in "Sum of all previous slabs" mode). Flag this as a known gap rather than silently adding stricter validation.
- [[Implicit Framework Behaviors|Standard Frappe child-table framework behaviors to build explicitly in a new stack]]: auto-generated row `name` (a random 10-char hash-like ID in Frappe), `parent`/`parentfield`/`parenttype` linkage columns, and `idx` (1-based row position) — all must be modeled explicitly as columns on the new relational table.
