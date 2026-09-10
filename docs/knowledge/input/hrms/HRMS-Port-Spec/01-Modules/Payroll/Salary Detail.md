# Salary Detail

**Source:** `hrms/payroll/doctype/salary_detail/salary_detail.json`, `salary_detail.py`
**Submittable:** no   **Tree:** no   **Naming:** child table (no autoname; row identified by parent+idx)
**Module:** Payroll

Shared child-table doctype used by **three** different table fields across two parent doctypes: `Salary Structure.earnings` / `Salary Structure.deductions` (owned by another agent — see `Salary Structure`) and `Salary Slip.earnings` / `Salary Slip.deductions` / `Salary Slip.employer_contributions` (this module). It is the single row shape that represents "one salary component, with its amount/formula/condition, in the context of a structure (template) or a slip (instance)". Several fields only make sense (and only show, via `depends_on`) on one `parenttype` or the other — noted below.

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| salary_component | Component | Link | [[Salary Component]] | Yes | — | No | |
| abbr | Abbr | Data | — | No | — | Yes | `fetch_from: salary_component.salary_component_abbr`; shown only when `parenttype=='Salary Structure'` |
| statistical_component | Statistical Component | Check | — | No | 0 | No | `fetch_from: salary_component.statistical_component` |
| is_tax_applicable | Is Tax Applicable | Check | — | No | 0 | Yes | `fetch_from: salary_component.is_tax_applicable`; shown only when `parentfield=='earnings'` |
| is_flexible_benefit | Is Flexible Benefit | Check | — | No | 0 | Yes | `fetch_from: salary_component.is_flexible_benefit`; shown only when `parentfield=='earnings'` |
| variable_based_on_taxable_salary | Variable Based On Taxable Salary | Check | — | No | 0 | Yes | `fetch_from: salary_component.variable_based_on_taxable_salary`; shown only when `parentfield=='deductions'`; `search_index` |
| depends_on_payment_days | Depends on Payment Days | Check | — | No | 0 | Yes | `fetch_from: salary_component.depends_on_payment_days` |
| deduct_full_tax_on_selected_payroll_date | Deduct Full Tax on Selected Payroll Date | Check | — | No | 0 | Yes | |
| condition | Condition | Code (PythonExpression) | — | No | — | No | `allow_on_submit`; shown only when `parenttype=='Salary Structure'` |
| amount_based_on_formula | Amount based on formula | Check | — | No | 0 | No | shown only when `parenttype=='Salary Structure'` |
| formula | Formula | Code (PythonExpression) | — | No | — | No | `allow_on_submit`; shown only when `amount_based_on_formula` and `parenttype=='Salary Structure'` |
| amount | Amount | Currency | currency | No | — | No | shown when NOT `amount_based_on_formula`, OR when `parenttype=='Salary Slip'` (slip rows always carry a resolved numeric amount) |
| do_not_include_in_total | Do not include in total | Check | — | No | 0 | No | `fetch_from: salary_component.do_not_include_in_total` |
| default_amount | Default Amount | Currency | currency | No | — | No | `print_hide`; shown only when `parenttype=='Salary Structure'` — full-cycle (unprorated) amount |
| additional_amount | Additional Amount | Currency | currency | No | — | Yes | `hidden`, `no_copy`, `print_hide` — portion of `amount` contributed by an `Additional Salary` |
| tax_on_flexible_benefit | Tax on flexible benefit | Currency | currency | No | — | Yes | shown only on `Salary Slip` deduction rows where `variable_based_on_taxable_salary` |
| tax_on_additional_salary | Tax on additional salary | Currency | currency | No | — | Yes | shown only on `Salary Slip` deduction rows where `variable_based_on_taxable_salary` |
| additional_salary | Additional Salary | Link | [[Additional Salary]] | No | — | Yes | set when this row (or part of it) originates from an `Additional Salary` record |
| exempted_from_income_tax | Exempted from Income Tax | Check | — | No | 0 | Yes | `fetch_from: salary_component.exempted_from_income_tax`; shown only when `parentfield=='deductions'`; `search_index` |
| is_recurring_additional_salary | Is Recurring Additional Salary | Check | — | No | 0 | Yes | shown only when `parenttype=='Salary Slip'` and `additional_salary` set |
| do_not_include_in_accounts | Do Not Include in Accounting Entries | Check | — | No | 0 | No | `fetch_from: salary_component.do_not_include_in_accounts`; shown only when `do_not_include_in_total` |
| accrual_component | Accrual Component | Check | — | No | 0 | Yes | `fetch_from: salary_component.accrual_component` |
| year_to_date | Year To Date | Currency | currency | No | — | Yes | total booked against this component for this employee, from period start through this slip's end date (see `Salary Slip.compute_component_wise_year_to_date`) |

`quick_entry: 1`, `row_format: Dynamic` (columns vary by parent context, as reflected in the many `depends_on` conditions above).

## Child Tables

None (leaf child table). It is itself embedded as a child table under `Salary Structure` (`earnings`, `deductions`) and `Salary Slip` (`earnings`, `deductions`, `employer_contributions`).

## State Machine

Not applicable — child table with no `docstatus`/workflow of its own.

## Validation Rules (exact, in execution order)

None on the `Salary Detail` doctype itself — the controller class body is `pass`. All meaningful validation/evaluation of a row's `condition`/`formula`/`amount` happens in the parent doctype:

- On `Salary Structure`: condition/formula are stored as authored (validated only for evaluability lazily, at slip-generation time, not at Structure save time — see Port Notes).
- On `Salary Slip`: `eval_condition_and_formula()` (in `Salary Slip.py`) evaluates `condition`/`formula` against the run-time data context and raises on `NameError`/`SyntaxError`/other exceptions via `throw_error_message()` (see `Salary Slip.md` Business Logic and Validation sections for exact behavior).

## Business Logic / Calculations

`Salary Detail` itself computes nothing — it is the row shape that `Salary Slip`'s calculation engine reads from and writes into. Its role, precisely:

1. **On a Salary Structure**, a `Salary Detail` row is a *template* line: `salary_component`, `condition`, `amount_based_on_formula`, `formula` or flat `amount`, and structural flags (`statistical_component`, `depends_on_payment_days`, `do_not_include_in_total`, `do_not_include_in_accounts`, `exempted_from_income_tax`, etc., all sourced from `Salary Component` at row-creation time via `fetch_from`, but editable/overridable per-row thereafter since `fetch_from` only fires once on field-set).
2. **On a Salary Slip**, a `Salary Detail` row is the *resolved instance* for one payroll period: `default_amount` (unprorated, full-cycle value), `amount` (the actual, payment-days-prorated and/or additional-salary-adjusted value that contributes to totals), `additional_amount` (portion coming from an `Additional Salary` override/addition), and `year_to_date` (running total). See `Salary Slip.md` for the exact algorithm (`add_structure_component`, `update_component_row`, `get_amount_based_on_payment_days`, `eval_condition_and_formula`) that populates these fields.
3. `abbr` is the token by which a component is referenced from *other* components' formulas (e.g. `HRA = BS * 0.4` where `BS` is the `Basic Salary` component's `salary_component_abbr`). This is why `abbr` is fetched from `Salary Component.salary_component_abbr` and used as a dict key (`data[struct_row.abbr] = amount`) in the eval context built by `Salary Slip.get_data_for_eval()`.
4. `statistical_component` rows are evaluated (their formula/condition run, and their resolved value is placed into the eval context under their `abbr`) but are **never appended as an actual `earnings`/`deductions` row** on the Salary Slip and thus never contribute to `gross_pay`/`total_deduction`/GL postings — see `Salary Slip.add_structure_component()`, which branches on `struct_row.statistical_component or struct_row.accrual_component` and, in that branch, updates `self.data[abbr]`/`self.default_data[abbr]` instead of calling `update_component_row()`.
5. `accrual_component` rows (flagged on `Salary Component`, fetched here) behave similarly to statistical components (evaluated, value stored in eval context) but additionally get appended to the parent Salary Slip's `accrued_benefits` table and to `benefit_ledger_components`, instead of to `earnings` — again, never contributing to gross pay directly. See `Salary Slip.add_structure_component()`.

## Lifecycle Hooks (exact)

None on this doctype (`pass`-only controller). All hook behavior belongs to the parent doctypes (`Salary Structure`, out of scope; `Salary Slip`, documented in `Salary Slip.md`).

## Whitelisted / API Methods

None.

## Permissions

`permissions: []` — governed by whichever parent doctype (`Salary Structure` or `Salary Slip`) the row belongs to.

## Scheduled Jobs Touching This Doctype

None directly. `Salary Slip`'s `compute_component_wise_year_to_date()` runs on every slip save (not a scheduled job) and updates each row's `year_to_date` — see `Salary Slip.md`.

## Related Doctypes

- [[Salary Structure]] — one of two parent doctypes (`earnings`/`deductions` fields); rows here are the *template* lines.
- [[Salary Slip]] — the other parent doctype (`earnings`/`deductions`/`employer_contributions` fields); rows here are the *resolved instance* lines for one pay period, computed via `add_structure_component`/`update_component_row`/`eval_condition_and_formula`.
- [[Salary Component]] — every row's `salary_component` Link; most other fields (`abbr`, `statistical_component`, flags) are one-time `fetch_from` copies of this master.
- [[Additional Salary]] — `additional_salary` Link marks a row (or the portion of its amount) as originating from an Additional Salary override/addition.

## Port Notes

- This is a genuinely **polymorphic child table** (same table/shape, different valid-field-subsets and meanings depending on `parenttype`/`parentfield`). A relational port has two reasonable options: (a) one physical `salary_detail` table with a `parent_type` discriminator column and all fields nullable (mirrors Frappe's actual on-disk shape, keeps a single FK target for both "structure line" and "slip line" queries used across the codebase, e.g. `Salary Slip.get_salary_slip_details()`), or (b) split into two tables (`salary_structure_detail`, `salary_slip_detail`) with only the fields relevant to each — cleaner types, but then formula-sharing logic (both read the same shape) must be duplicated or abstracted via a shared interface/base type. Given how much shared logic (`abbr`, `formula`, `amount_based_on_formula`, `statistical_component`) crosses both contexts in the source, option (a) most faithfully reproduces behavior; option (b) is cleaner if strict typing matters more.
- Every `fetch_from` field (`abbr`, `statistical_component`, `is_tax_applicable`, `is_flexible_benefit`, `variable_based_on_taxable_salary`, `depends_on_payment_days`, `exempted_from_income_tax`, `do_not_include_in_total`, `do_not_include_in_accounts`, `accrual_component`) is a **one-time client-side copy at the moment `salary_component` is set**, not a live foreign-key-derived value — Frappe does not keep it in sync if the source `Salary Component` is edited afterward (this is also why `Salary Component.update_salary_structures()` exists: an explicit "sync formula/condition to all structures using this component" whitelisted action, since there's no automatic propagation). A port must replicate this "denormalize once at write time" behavior explicitly (copy the flags into the row on insert/update of `salary_component`), not treat these as computed columns/joins, or historical Salary Slips will retroactively change meaning if a Salary Component's flags are edited later — which is explicitly NOT what the source does.
- `amount` is `Currency` with `options: currency` (dynamic currency reference to the parent's own `currency` field) rather than a fixed ISO code — a port should model the same "amount currency follows the document's currency field" pattern rather than hardcoding a currency per row.
