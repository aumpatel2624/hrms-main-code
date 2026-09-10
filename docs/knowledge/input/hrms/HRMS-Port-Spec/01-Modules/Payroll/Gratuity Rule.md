# Gratuity Rule

**Source:** `hrms/payroll/doctype/gratuity_rule/gratuity_rule.json`, `gratuity_rule.py`, `gratuity_rule.js`, `gratuity_rule_dashboard.py`
**Submittable:** no   **Tree:** no   **[[Naming and Autoname Rules|Naming]]:** Set by user (`autoname: "Prompt"` — user types the name directly, no auto-generated series)
**Module:** Payroll

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| *(Section: "Gratuity", `gratuity_details_tab`)* | | | | | | | heading only |
| disable | Disable | Check | — | no | 0 | no | when set, presumably excluded from selection elsewhere (no explicit filter found in Gratuity's own code — flagged in Port Notes) |
| *(Section Break `section_break_2`)* | | | | | | | layout |
| calculate_gratuity_amount_based_on | Calculate Gratuity Amount Based On | Select | `Current Slab` / `Sum of all previous slabs` | yes | — | no | `in_list_view`; drives the branching algorithm in `Gratuity.get_gratuity_amount` |
| total_working_days_per_year | Total working Days Per Year | Float | — | no | 365 | no | `non_negative`; denominator when computing work experience from working days |
| column_break_3 | — | Column Break | — | — | — | — | layout |
| work_experience_calculation_function | Work Experience Calculation Method | Select | `Round off Work Experience` / `Take Exact Completed Years` / `Manual` | no | Round off Work Experience | no | drives whether experience is computed automatically or taken from the manually entered `Gratuity.current_work_experience` |
| minimum_year_for_gratuity | Minimum Year for Gratuity | Int | — | no | — (blank/0) | no | `non_negative`; floor check in `Gratuity.get_work_experience` |
| column_break_8 | — | Column Break | — | — | — | — | layout |
| applicable_earnings_component | Applicable Earnings Component | Table MultiSelect | [[Gratuity Applicable Component]] | yes | — | no | description: "Salary components should be part of the Salary Structure." |
| gratuity_rules_section | Rules | Section Break | — | — | — | — | heading only |
| gratuity_rule_slabs | Current Work Experience (label; conceptually "Slabs") | Table | [[Gratuity Rule Slab]] | yes | — | no | description: 'Set "From(Year)" and "To(Year)" to 0 for no upper and lower limit.' |

`track_changes: 1` — full version/diff history kept for this doctype.

## Child Tables

- `applicable_earnings_component` -> **Gratuity Applicable Component** (Table MultiSelect) — see `Gratuity Applicable Component.md`. Despite being a "Table MultiSelect" (normally a lightweight tag-like multi-select UI backed by a child table with a single Link field), it is a real child doctype and must be modeled as an owned child table (parent = this Gratuity Rule row), not a pure many-to-many join, though functionally it behaves like one since `Gratuity Applicable Component`'s only field is `salary_component` (Link to Salary Component).
- `gratuity_rule_slabs` -> **Gratuity Rule Slab** (Table) — see `Gratuity Rule Slab.md`. Ordered list of year-of-service brackets.

## State Machine

Not submittable — no docstatus-based state machine. No `status`/`workflow_state` field exists.

## Validation Rules (exact, in execution order)

`validate()` iterates `self.gratuity_rule_slabs` (in table row order) and for each `current_slab`:

1. IF `current_slab.from_year > current_slab.to_year` AND `current_slab.to_year != 0` -> `frappe.throw(_("Row {0}: From (Year) can not be greater than To (Year)").format(current_slab.idx))` (source: `validate`, per-row check).
2. IF `current_slab.to_year == 0` AND `current_slab.from_year == 0` AND `len(self.gratuity_rule_slabs) > 1` -> `frappe.throw(_("You can not define multiple slabs if you have a slab with no lower and upper limits."))` (source: `validate`; this check re-fires for every row that happens to be a `0/0` slab when more than one slab total exists — effectively "no 0/0 slab may coexist with any other slab").

Both checks run for every row in table order; the first offending row's throw aborts the save (Frappe throws stop execution immediately).

Framework-level: `applicable_earnings_component` and `gratuity_rule_slabs` are `reqd` — at least one row required in each before save; `calculate_gratuity_amount_based_on` is `reqd`.

Client-side only (not enforced server-side — flag per spec instructions):
- `gratuity_rule.js`, on `Gratuity Rule Slab.to_year` change: IF `row.to_year <= row.from_year AND row.to_year === 0` -> `frappe.throw(__("To(Year) year can not be less than From(year)"))`. This exact condition (`to_year <= from_year` AND `to_year === 0`) is client-only; note it is a narrower and differently-shaped check than server rule #1 above (server checks `from_year > to_year AND to_year != 0`, i.e. essentially the opposite branch — the client check only fires when `to_year` is being reset to 0, the server check only fires when `to_year` is nonzero and smaller than `from_year`). **A server-side port must implement its own equivalent check for the `to_year == 0` sub-case since the current server code does not cover it** (a slab with `to_year=0` and `from_year>0` other than the very last "unbounded" slab is not rejected server-side at all).
- `gratuity_rule.js`, on `Gratuity Rule Slab` row add (`gratuity_rule_slabs_add`): auto-sets the new row's `from_year` to the previous row's `to_year` (convenience default only, not a validation).

## Business Logic / Calculations

No amount/total calculations happen on this doctype itself — it is purely a rule/configuration container consumed by `Gratuity.get_gratuity_amount()` and `Gratuity.get_work_experience()` (see `Gratuity.md` Business Logic section for the full consuming algorithm). Fields consumed by Gratuity:
- `work_experience_calculation_function` (aliased as `method` when fetched) -> selects Manual vs Round-off vs Exact experience calculation.
- `total_working_days_per_year` -> denominator for days-to-years conversion.
- `minimum_year_for_gratuity` -> minimum-service floor check.
- `calculate_gratuity_amount_based_on` -> selects "Current Slab" vs "Sum of all previous slabs" amount algorithm branch.
- `gratuity_rule_slabs` rows (`from_year`, `to_year`, `fraction_of_applicable_earnings`), read in `idx` order.
- `applicable_earnings_component` rows' `salary_component` values -> filter which Salary Slip earning rows feed the base "total component amount" used in the gratuity formula.

A module-level helper `get_gratuity_rule(name, slabs, **args)` exists (not whitelisted, used programmatically — e.g. from patches/tests) to construct a new in-memory Gratuity Rule document with default `calculate_gratuity_amount_based_on = "Current Slab"`, `minimum_year_for_gratuity = 1`, and appends provided slab dicts to `gratuity_rule_slabs`. Note: it sets an attribute `work_experience_calculation_method` which does NOT match the actual fieldname `work_experience_calculation_function` — this looks like a latent bug (the assignment is a no-op against a nonexistent field/attribute). Flagged in Port Notes; do not port the mismatched attribute name as functional.

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| validate | Per-slab-row checks described above | none (read-only validation) |

No `on_update`, `before_insert`, `on_trash`, etc. defined.

## Whitelisted / API Methods

None. `get_gratuity_rule(name, slabs, **args)` is a plain Python module function (not decorated `@frappe.whitelist()`), callable only from server-side code (e.g. tests/patches), not exposed as an API endpoint.

## [[Permission Model (RBAC)|Permissions]]

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| HR Manager | yes | yes | yes | yes | n/a (not submittable) | n/a | n/a | yes | yes | `email`, `share`, `print` all 1 |
| HR User | yes | yes | yes | yes | n/a | n/a | n/a | yes | yes | same as above |

No permlevel restrictions, no `if_owner`.

## Scheduled Jobs Touching This Doctype

None found in `hrms/hooks.py`.

## Related Doctypes

- [[Gratuity Applicable Component]] — child table (`applicable_earnings_component`) listing which Salary Component rows count as "applicable earnings" for this rule.
- [[Gratuity Rule Slab]] — child table (`gratuity_rule_slabs`) of year-of-service brackets consumed by this rule.
- [[Gratuity]] — the parent transaction doctype that links to a Gratuity Rule (`gratuity_rule` field) and calls into this rule's fields/child tables to compute the gratuity amount.
- [[Salary Component]] — `applicable_earnings_component` rows reference these by name; must be present in the employee's Salary Structure as earnings.
- [[Salary Slip]] — its earning rows (filtered to the rule's applicable components) are summed to form the "total component amount" fed into the gratuity formula.

## Port Notes

- **`disable` field has no enforcement found in this module's code**: no query filter in `Gratuity.js`/`Gratuity.py` excludes disabled Gratuity Rules from the `gratuity_rule` Link dropdown on the `Gratuity` doctype. If disregarding disabled rules is a business requirement, it must be added explicitly in the port (e.g. a Link filter `{"disable": 0}` on Gratuity's `gratuity_rule` field) — not present in source as extracted.
- **Client-side `to_year`/`from_year` ordering check is incomplete server-side**: see Validation Rules above — a slab with `to_year=0` while `from_year>0` (other than a legitimate single "no-upper-limit final slab") is not rejected by the server `validate()` method at all; only the client-side handler partially guards this, and only interactively (bypassable via API/import). A faithful-but-hardened port should decide whether to also enforce this server-side; document current gap either way.
- **`get_gratuity_rule` helper sets a nonexistent attribute** `work_experience_calculation_method` instead of the real fieldname `work_experience_calculation_function` — this line is effectively dead code (sets an ad hoc Python attribute on the in-memory doc that is never read back or persisted as that fieldname). Do not port this behavior as if it configures the calculation method; if replicating this helper for tests, note the discrepancy.
- **Naming is fully user-controlled** (`autoname: "Prompt"`) — the primary key/name is whatever string the user types when creating a Gratuity Rule (must be unique doctype-wide, framework-enforced). A port must allow arbitrary user-supplied primary keys for this table, not a generated ID, and must enforce uniqueness at the DB level.
- **`track_changes: 1`** — a full audit/version-history mechanism is expected for every save of a Gratuity Rule (including changes to its child tables). This must be implemented explicitly in a new stack (e.g. a `gratuity_rule_version` audit table) since it is [[Implicit Framework Behaviors|a Frappe-framework-provided behavior]], not something in this controller's code.
