# Income Tax Slab Other Charges

**Source:** `hrms/payroll/doctype/income_tax_slab_other_charges/income_tax_slab_other_charges.json`, `income_tax_slab_other_charges.py`
**Submittable:** no (child table; inherits submit state from parent)   **Tree:** no   **Naming:** child-table row, no standalone naming rule
**Module:** Payroll

Child table of `Income Tax Slab` (fieldname `other_taxes_and_charges`, `istable: 1`, `quick_entry: 1`, `track_changes: 1`). Represents surcharge/cess-style additional charges applied ON TOP of the base slab-computed tax amount, each gated by a min/max annual-taxable-income band.

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| description | Description | Data | — | yes | — | no | `in_list_view`, grid column width 4. Free-text label (e.g. "Education Cess", "Surcharge"). |
| percent | Percent | Percent | — | yes | — | no | `non_negative`, `in_list_view`, grid column width 2. Rate applied to the running tax amount (not to income) — see Business Logic. |
| min_taxable_income | Min Taxable Income | Currency | — | no | — | no | `non_negative`, `in_list_view`, grid column width 2. Inclusive-lower-bound gate: charge applies only when annual taxable earning >= this value (0/blank = no lower bound). |
| max_taxable_income | Max Taxable Income | Currency | — | no | — | no | `non_negative`, `in_list_view`, grid column width 2. Inclusive-upper-bound gate: charge applies only when annual taxable earning <= this value (0/blank = no upper bound). |

## Child Tables

N/A — this is itself a child table.

## State Machine

N/A. Editable while parent `Income Tax Slab` is Draft; parent is submittable, so rows become locked once the parent is submitted (row edits still permitted post-submit only via the parent's own submitted-doc edit rules, i.e., normally not editable through the UI without amend, since child tables under a `Table` field on a submitted parent follow the parent's own submitted-state edit restrictions).

## Validation Rules (exact, in execution order)

None on this child doctype's own controller (`pass` body). Gating logic is applied at consumption time in `income_tax_slab.py`'s `calculate_other_charges()` — see Business Logic below and in `Income Tax Slab.md`.

## Business Logic / Calculations

This child table's rows are iterated by `calculate_other_charges(tax_amount, annual_taxable_earning, tax_slab)` in `hrms/payroll/doctype/income_tax_slab/income_tax_slab.py`, called from `calculate_tax_by_tax_slab()` AFTER the base slab tax and any marginal-relief/surcharge adjustment have already been computed. Exact algorithm (source: `calculate_other_charges`):

1. `total_other_taxes_and_charges = 0`
2. FOR EACH row `d` in `tax_slab.other_taxes_and_charges` (in table order, i.e. `idx` order):
   a. IF `d.min_taxable_income` is truthy (non-zero) AND `d.min_taxable_income > annual_taxable_earning` THEN skip this row (`continue`) — charge does not apply.
   b. IF `d.max_taxable_income` is truthy (non-zero) AND `d.max_taxable_income < annual_taxable_earning` THEN skip this row (`continue`) — charge does not apply.
   c. Otherwise: `other_taxes_and_charges = tax_amount * flt(d.percent) / 100` — **note `tax_amount` here is the running/cumulative tax amount as of this iteration, already including any prior rows' charges added in earlier loop iterations** (i.e. charges compound sequentially on top of each other, not all computed independently off the original base tax).
   d. `tax_amount += other_taxes_and_charges` (mutate the running total for subsequent rows).
   e. `total_other_taxes_and_charges += other_taxes_and_charges`.
3. Return `(tax_amount, total_other_taxes_and_charges)` — the final tax-plus-all-charges amount, and the sum of just the charges portion.

Edge cases handled explicitly: `flt(d.min_taxable_income)`/`flt(d.max_taxable_income)` being `0`/`None`/blank is treated as "no bound on that side" (the `if` conditions only trigger comparison when the bound is truthy), so a row with both bounds blank always applies. No explicit divide-by-zero risk (no division by earnings/tax_amount). No rounding is applied inside this function — rounding of the final `tax_amount` happens further up the call chain in Salary Slip.

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| (none) | No overridden lifecycle methods on the child doctype itself | Consumed read-only by `Income Tax Slab.calculate_other_charges()`, in turn called from [[Salary Slip]]'s tax computation (`Salary Slip` is out of this agent's scope — referenced by name only). |

## Whitelisted / API Methods

None.

## [[Permission Model (RBAC)|Permissions]]

None defined in JSON (`"permissions": []`) — inherits from parent `Income Tax Slab`.

## Scheduled Jobs Touching This Doctype

None.

## Related Doctypes

- [[Income Tax Slab]] — parent doctype; this child table (`other_taxes_and_charges`) holds its surcharge/cess rows, iterated by the parent's `calculate_other_charges()`.
- [[Salary Slip]] — indirectly consumes this data via `Income Tax Slab.calculate_tax_by_tax_slab()`, which is called during Salary Slip's tax computation.

## Port Notes

- **Charges compound sequentially, not independently.** This is the single most important behavioral detail to preserve: row 2's `percent` is applied to `tax_amount` AFTER row 1's charge has already been added in. A port that naively computes `sum(tax_amount_base * row.percent / 100 for row in rows)` (i.e. all charges based off the pre-charge base tax) will produce a DIFFERENT total than the original whenever more than one "Other Charges" row exists and both apply to the same earning band. Reproduce the accumulating-loop exactly.
- Row order (`idx`) is semantically significant given the above — a port's storage/query layer must preserve and iterate in `idx` (table row) order, not e.g. alphabetically by description or by insertion id if that differs from the on-form order.
- `min_taxable_income`/`max_taxable_income` bounds are both **inclusive** of the boundary value: the skip condition is `min_taxable_income > annual_taxable_earning` (so earning == min is NOT skipped, i.e. inclusive lower bound) and `max_taxable_income < annual_taxable_earning` (so earning == max is NOT skipped, i.e. inclusive upper bound).
