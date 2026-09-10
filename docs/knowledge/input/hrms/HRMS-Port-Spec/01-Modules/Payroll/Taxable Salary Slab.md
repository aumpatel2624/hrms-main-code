# Taxable Salary Slab

**Source:** `hrms/payroll/doctype/taxable_salary_slab/taxable_salary_slab.json`, `taxable_salary_slab.py`
**Submittable:** no (child table; inherits submit state from parent)   **Tree:** no   **Naming:** child-table row, no standalone naming rule
**Module:** Payroll

Child table of `Income Tax Slab` (fieldname `slabs`, `istable: 1`, `quick_entry: 1`, `track_changes: 1`, parent's `row_format: "Dynamic"`). This is the actual bracket-definition table — each row is one income-tax bracket.

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| from_amount | From Amount | Currency | — | yes | `0` | no | `non_negative`, `in_list_view`. Lower bound of the bracket (annual taxable earning). |
| to_amount | To Amount | Currency | — | no | — | no | `non_negative`, `in_list_view`. Upper bound of the bracket; blank/0 means "open-ended" (top bracket, no upper limit). |
| percent_deduction | Percent Deduction | Percent | — | yes | `0` | no | `non_negative`, `in_list_view`. Marginal tax rate applied to income within this bracket. |
| condition | Condition | Code | — | no | — | no | `in_list_view`. Optional Python expression (evaluated via `frappe.safe_eval`) that must be true for this bracket row to apply at all — e.g. age-based, gender-based, or salary-component-based conditional brackets. Blank = always applies (no gating). |
| (column_break_5) | — | Column Break | — | — | — | — | layout only |
| html_6 | — | HTML | — | — | — | — | Static help text/examples block shown in the form; no data. |

## Child Tables

N/A — this is itself a child table.

## State Machine

N/A. Editable while parent `Income Tax Slab` is Draft; parent is submittable so rows follow the parent's submitted-state edit rules thereafter.

## Validation Rules (exact, in execution order)

None on this child doctype's own controller (`pass` body). No structural validation exists anywhere in the codebase enforcing that slab rows are contiguous, non-overlapping, or sorted by `from_amount` — this is a notable gap (see Port Notes).

## Business Logic / Calculations

Consumed by `calculate_base_tax_from_tax_slabs(annual_taxable_earning, tax_slab, eval_globals, eval_locals)` in `hrms/payroll/doctype/income_tax_slab/income_tax_slab.py`, itself called from `calculate_tax_by_tax_slab()` (the top-level slab-tax entry point — see `Income Tax Slab.md` for the full chain including the relief-limit short-circuit, marginal relief, surcharge, and other-charges steps that wrap around this function). Exact per-row algorithm (source: `calculate_base_tax_from_tax_slabs`):

1. `tax_amount = 0`
2. `eval_locals["annual_taxable_earning"] = annual_taxable_earning` (made available to any row's `condition` expression).
3. FOR EACH `slab` row in `tax_slab.slabs` (table/`idx` order):
   a. `cond = cstr(slab.condition).strip()`. IF `cond` is non-empty AND `eval_tax_slab_condition(cond, eval_globals, eval_locals)` evaluates falsy THEN skip this row (`continue`) — the bracket does not apply to this employee/earning at all this period.
      - `eval_tax_slab_condition` runs `frappe.safe_eval(condition, eval_globals, eval_locals)` inside a try/except: a `NameError` (missing/deleted field referenced in the condition) raises `frappe.throw(_("{0} <br> This error can be due to missing or deleted field.").format(str(err)), title=_("Name error"))`; a `SyntaxError` raises `frappe.throw(_("Syntax error in condition: {0} in Income Tax Slab").format(str(err)))`; any other `Exception` raises `frappe.throw(_("Error in formula or condition: {0} in Income Tax Slab").format(str(e)))` and additionally re-raises.
      - Default `eval_globals` (used when caller passes none) exposes: `int`, `float`, `long` (aliased to `int`), `round`, `date`, `getdate`, `get_first_day`, `get_last_day` — these are the only builtins/functions usable inside a `condition` expression besides whatever is in `eval_locals` (which the caller populates with employee/other context fields plus `annual_taxable_earning`).
   b. IF `not slab.to_amount` (i.e. `to_amount` is blank/0 — the open-ended top bracket) AND `annual_taxable_earning >= slab.from_amount` THEN:
      `tax_amount += (annual_taxable_earning - slab.from_amount + 1) * slab.percent_deduction * 0.01`, then `continue` to next row.
   c. ELSE IF `annual_taxable_earning >= slab.from_amount AND annual_taxable_earning < slab.to_amount` (earning falls strictly inside this closed bracket) THEN:
      `tax_amount += (annual_taxable_earning - slab.from_amount + 1) * slab.percent_deduction * 0.01`.
   d. ELSE IF `annual_taxable_earning >= slab.from_amount AND annual_taxable_earning >= slab.to_amount` (earning is at/above the top of this closed bracket — the full bracket width is taxed) THEN:
      `tax_amount += (slab.to_amount - slab.from_amount + 1) * slab.percent_deduction * 0.01`.
   e. (Implicit else: `annual_taxable_earning < slab.from_amount` — row contributes 0, no explicit branch, simply falls through with no addition.)
4. Return accumulated `tax_amount`.

Edge cases / quirks the code explicitly encodes (reproduce exactly, do not "fix"):
- **The `+ 1` in every bracket-width calculation.** Both the open-ended-bracket formula and the closed-bracket formulas compute the taxed width as `(upper - from_amount + 1)` rather than `(upper - from_amount)`. This is a literal off-by-one baked into the original implementation — a bracket defined `from_amount=0, to_amount=500000` taxes `500001` currency units' worth of width, not `500000`. Do not silently "correct" this in the port; it changes computed tax by design (i.e., as inherited) unless the target system's spec explicitly calls for fixing it.
- Because `calculate_tax_by_tax_slab()` (see `Income Tax Slab.md`) already short-circuits to `return 0, 0` when `annual_taxable_earning <= tax_slab.tax_relief_limit`, the whole slab loop is skipped entirely below the relief threshold — brackets never even get evaluated in that case.
- Slabs are summed cumulatively across ALL matching rows in table order — this is the standard progressive-bracket design (each bracket contributes only its own marginal-rate slice), but because there is no de-duplication or bracket-boundary validation (see Port Notes below), a misconfigured/overlapping slab table (e.g. two rows both matching `from_amount=0`) will double-count. The code trusts the configured data.
- `condition`-gated rows let a single `Income Tax Slab` document encode multiple parallel bracket ladders selected by employee attribute (age, gender, salary component) rather than one linear ladder — all matching rows' contributions are summed, so if a mis-configured slab table has more than one row whose `condition` is simultaneously true for the same earning range, both contribute (again, no mutual-exclusivity enforcement in code).

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| (none) | No overridden lifecycle methods on the child doctype itself | Consumed read-only by `Income Tax Slab.calculate_base_tax_from_tax_slabs()`, in turn called from `Salary Slip`'s tax computation (out of scope, referenced by name only). |

## Whitelisted / API Methods

None.

## Permissions

None defined in JSON (`"permissions": []`) — inherits from parent `Income Tax Slab`.

## Scheduled Jobs Touching This Doctype

None.

## Related Doctypes

- [[Income Tax Slab]] — sole parent doctype (`slabs` field); `calculate_base_tax_from_tax_slabs()` iterates these rows to compute base tax.
- [[Salary Slip]] — the ultimate consumer, via `Income Tax Slab`'s `calculate_tax_by_tax_slab()`, of the marginal tax computed from these brackets.

## Port Notes

- **No overlap/gap/ordering validation exists anywhere in source** for this bracket table — a re-implementer might reasonably expect the framework to enforce contiguous, ascending, non-overlapping `from_amount`/`to_amount` ranges across rows of the same conditional group, but no such check exists in `.py`. This is called out explicitly per the ground rules: it is a gap in the original system, not something to silently add unless the new product spec wants it.
- The `+ 1` off-by-one noted above is easy to "fix" by an engineer unfamiliar with the source; flagging it here specifically so the port's numeric output matches the original bit-for-bit rather than "more correct" bracket math.
- `condition` is a raw executable Python expression string evaluated with `frappe.safe_eval` (a restricted eval sandbox, not full `eval()`) against a limited global/local namespace. Porting to a non-Python stack requires either: (a) a safe expression-language evaluator (e.g. a rules engine or a small custom DSL parser) supporting comparisons/boolean logic over fields like `date_of_birth`, `gender`, or salary component base amounts, or (b) restricting condition authoring to a structured filter builder instead of free-text code (recommended for a rewrite, since arbitrary-code-in-DB-field is inherently a security/maintainability liability worth calling out even though it's out of scope to change here).
- Row order (`idx`) determines evaluation and accumulation order but does not by itself determine tax outcome correctness (each qualifying row's contribution is additive regardless of order) — order only matters for readability/audit, not the computed total, since there's no early-exit besides the `continue` when `to_amount` is open-ended (which just skips remaining branch checks for that row, not remaining rows).
