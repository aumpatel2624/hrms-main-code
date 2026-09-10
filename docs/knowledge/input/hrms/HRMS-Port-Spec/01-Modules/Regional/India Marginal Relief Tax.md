# India Marginal Relief Tax

**Source:** `hrms/regional/india/utils.py`, `hrms/hr/utils.py` (hook stub), `hrms/hooks.py`
(`regional_overrides`), `hrms/payroll/doctype/income_tax_slab/income_tax_slab.py`
**Module:** Regional (India) — override logic, not a standalone doctype.

## 1. Exact Trigger

Core stub: `hrms.hr.utils.calculate_tax_with_marginal_relief(tax_slab, tax_amount,
annual_taxable_earning)` (`hrms/hr/utils.py:762-766`), decorated `@erpnext.allow_regional`,
default body `return None`.

`hooks.py` wiring (`hrms/hooks.py:310-316`):
```python
regional_overrides = {
    "India": {
        ...
        "hrms.hr.utils.calculate_tax_with_marginal_relief": "hrms.regional.india.utils.calculate_tax_with_marginal_relief",
    },
}
```

Call site: `hrms/payroll/doctype/income_tax_slab/income_tax_slab.py::calculate_tax_by_tax_slab`,
immediately after the base tax amount is computed from the slab brackets and BEFORE surcharge /
other-charges are applied (lines 58-61):
```python
if tax_with_marginal_relief := calculate_tax_with_marginal_relief(
    tax_slab, tax_amount, annual_taxable_earning
):
    tax_amount = tax_with_marginal_relief
```
The walrus-assigned truthiness check means: if the override returns `0`, `None`, or any falsy
value, `tax_amount` is left unchanged; only a truthy (nonzero) returned value replaces it.

## 2. Full Algorithm (numbered pseudocode)

Inputs: `tax_slab` (an `[[Income Tax Slab]]` record/object with `tax_relief_limit` and
`marginal_relief_limit` fields), `tax_amount` (the base tax computed from bracket rates before
marginal relief), `annual_taxable_earning` (the employee's projected annual taxable income).

**Business rule (India Income Tax Act):** if taxable income is between the tax relief limit and
the marginal relief limit, and the tax payable on that income exceeds the income in excess of the
relief limit, tax payable is reduced so it never exceeds that excess amount — this prevents a
sharp cliff where crossing the relief threshold by a small amount produces a disproportionately
large tax bill.

1. IF `tax_slab.marginal_relief_limit` is not set/zero THEN return `tax_amount` unchanged (no
   marginal relief configured for this slab — the calling `if` treats this as unchanged, matching
   the walrus/falsy-skip behavior only when this function ultimately returns the identical
   unchanged `tax_amount`, since the function returns `tax_amount` at the end regardless — see
   note in Port Notes about the always-returns-something behavior differing from the None-default
   stub).
2. `tax_relief_limit = tax_slab.tax_relief_limit or 0`.
3. `marginal_relief_limit = tax_slab.marginal_relief_limit or 0`.
4. IF `annual_taxable_earning > tax_relief_limit` AND `annual_taxable_earning <
   marginal_relief_limit`:
   a. `income_excess_over_tax_relief = annual_taxable_earning - tax_slab.tax_relief_limit`.
   b. IF `income_excess_over_tax_relief < tax_amount` THEN `tax_amount =
      income_excess_over_tax_relief` (marginal relief applies: cap the tax at the excess income
      over the relief limit).
5. Return `tax_amount` (possibly reduced, possibly unchanged from input).

## 3. Custom Fields

| DocType | Fieldname | Label | Type | Insert After | Notes |
|---|---|---|---|---|---|
| [[Income Tax Slab]] | `marginal_relief_limit` | Marginal Relief Threshold Limit | Currency | `column_break_pdmy` | Description: "Maximum taxable income for which marginal relief can be applied. Beyond this limit, normal tax slabs are used for tax calculation." `depends_on: eval:doc.tax_relief_limit > 0 && doc.currency == 'INR'` |

This is the only custom field tied to this feature (from `hrms/regional/india/setup.py::get_custom_fields()`).

## 4. Gratuity Rule Records

None.

## 5. Port Notes

- **Strategy interface method:** `calculateTaxWithMarginalRelief(taxSlab, taxAmount,
  annualTaxableEarning): number` on the `IndiaRegionalStrategy`; default strategy returns the
  input `taxAmount` unchanged (equivalent to core's no-op stub returning `None`, which the caller
  treats as "no change"). Call it from the generic tax-by-slab calculation immediately after base
  bracket tax is computed and before surcharge/other-charge calculation — do not fold this into
  the bracket-calculation function itself, since it is a distinct, country-specific
  post-processing step in the original design.
- **Field visibility gating** (`depends_on: eval:doc.tax_relief_limit > 0 && doc.currency ==
  'INR'`) is UI-only in Frappe; a port must independently guard the actual calculation so
  marginal relief logic only ever executes for INR-denominated slabs (or more precisely: only
  produces a nonzero result when `marginal_relief_limit` is actually set on the slab, which
  naturally only happens for India-configured slabs) — do not rely on a UI-layer condition to
  enforce this at the calculation layer.
- **Truthy-check semantics**: the calling code (`if tax_with_marginal_relief := ...`) only
  replaces `tax_amount` when the returned value is truthy. Since step 5 of the algorithm always
  returns a value (never `None`), and that value could legitimately be `0` in edge cases (e.g.
  `income_excess_over_tax_relief` computing to 0), a port should replicate the exact same
  truthy-check semantics at the call site to stay faithful: a returned `0` is treated as "no
  marginal relief" (tax_amount stays as originally computed) even though 0 could theoretically be
  the "correct" relieved amount — reproduce this literally rather than fixing the edge case.

## Related Doctypes

- [[Income Tax Slab]] — carries the `tax_relief_limit` and `marginal_relief_limit` fields this override reads, and is the doctype whose `calculate_tax_by_tax_slab` calls this override.
