# Salary Component

**Source:** `hrms/payroll/doctype/salary_component/salary_component.json`, `salary_component.py`, `salary_component.js`
**Submittable:** no   **Tree:** no   **Naming:** `autoname: "field:salary_component"` — the document name IS the value of the `salary_component` field (must be unique; `allow_rename: 1`)
**Module:** Payroll

Master doctype: defines a reusable "line item" (Basic Salary, HRA, PF, TDS, etc.) that can be added to any `Salary Structure` and, transitively, any `Salary Slip`, as an Earning / Deduction / Employer Contribution.

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| salary_component | Name | Data | — | Yes | — | No | unique; this IS the document name (autoname `field:salary_component`) |
| salary_component_abbr | Abbr | Data | — | Yes | — | No | auto-derived from initials of `salary_component` if left blank (see Validation); de-duplicated with `append_number_if_name_exists` |
| type | Type | Select | Earning / Deduction / Employer Contribution | Yes | — | No | |
| is_tax_applicable | Is Tax Applicable | Check | — | No | 1 | No | shown only when `type=="Earning"` |
| depends_on_payment_days | Depends on Payment Days | Check | — | No | 1 | No | `read_only_depends_on: eval:doc.arrear_component && !doc.amount_based_on_formula` |
| do_not_include_in_total | Do Not Include in Total | Check | — | No | 0 | No | shown only when `type != "Employer Contribution"` |
| deduct_full_tax_on_selected_payroll_date | Deduct Full Tax on Selected Payroll Date | Check | — | No | 0 | No | shown only when `is_tax_applicable && type=='Earning'` |
| disabled | Disabled | Check | — | No | 0 | No | |
| description | Description | Small Text | — | No | — | No | |
| statistical_component | Statistical Component | Check | — | No | 0 | No | shown only when `type != "Employer Contribution"`; "value... will not contribute to the earnings or deductions... can be referenced by other components" |
| is_flexible_benefit | Is Flexible Benefit | Check | — | No | 0 | No | shown only when `type != "Employer Contribution"` |
| max_benefit_amount | Max Benefit Amount (Yearly) | Currency | — | No | — | No | `depends_on: is_flexible_benefit`; `non_negative: 1`; "If greater than zero, this sets the maximum benefit amount assignable to any employee" |
| variable_based_on_taxable_salary | Variable Based On Taxable Salary | Check | — | No | 0 | No | shown only when `type=="Deduction"`; `search_index`; "the amount will be auto-calculated as per the configured income tax slabs" |
| accounts | Accounts | Table ([[Salary Component Account]]) | — | No | — | No | shown only when `!statistical_component && type != "Employer Contribution"` |
| condition | Condition | Code (PythonExpression) | — | No | — | No | shown only when `!is_flexible_benefit && !variable_based_on_taxable_salary` |
| amount_based_on_formula | Amount based on formula | Check | — | No | 0 | No | |
| formula | Formula | Code (PythonExpression) | — | No | — | No | `depends_on: amount_based_on_formula` |
| amount | Amount | Currency | — | No | — | No | `non_negative: 1`; `depends_on: eval:doc.amount_based_on_formula!==1` |
| help | Help | HTML | — | No | — | No | static help text/examples, no logic |
| round_to_the_nearest_integer | Round to the Nearest Integer | Check | — | No | 0 | No | |
| exempted_from_income_tax | Exempted from Income Tax | Check | — | No | 0 | No | shown only when `type=="Deduction" && !variable_based_on_taxable_salary`; "the full amount will be deducted from taxable income before calculating income tax without any declaration or proof submission" |
| is_income_tax_component | Is Income Tax Component | Check | — | No | 0 | No | shown only when `type=="Deduction"`; "considered in the Income Tax Deductions report" |
| remove_if_zero_valued | Remove if Zero Valued | Check | — | No | 1 | No | shown only when `!statistical_component && type != "Employer Contribution"`; "component will not be displayed in the salary slip if the amount is zero" |
| do_not_include_in_accounts | Do Not Include in Accounting Entries | Check | — | No | 0 | No | `depends_on: do_not_include_in_total` |
| arrear_component | Arrear Component | Check | — | No | 0 | No | shown only when `type != "Employer Contribution"`; `read_only_depends_on: variable_based_on_taxable_salary`; "included in arrear calculations" |
| accrual_component | Accrual Component | Check | — | No | 0 | No | shown only when `type=="Earning"`; `read_only_depends_on: eval:doc.is_flexible_benefit==1` |
| payout_method | Payout Method | Select | (blank)/Accrue and payout at end of payroll period/Accrue per cycle, pay only on claim/Allow claim for full benefit amount | `mandatory_depends_on: is_flexible_benefit` | — | No | `depends_on: is_flexible_benefit` |
| final_cycle_accrual_payout | Payout Unclaimed Amount in Final Payroll Cycle | Check | — | No | 0 | No | shown only when `is_flexible_benefit && payout_method=="Accrue per cycle, pay only on claim"` |

Tab breaks group fields into "Overview", "Condition & Formula", "Flexible Benefits" (layout-only, no logic).

## Child Tables

- `accounts` (Table, [[Salary Component Account]]) — see `Salary Component Account.md`.

## State Machine

Not submittable — no docstatus workflow. `disabled` (Check) is the only lifecycle-like flag, and it is a plain boolean set/cleared manually by a user; no code path automatically flips it.

## Validation Rules (exact, in execution order)

Executed in `validate()`, which calls, in this exact order:

1. `validate_abbr()`:
   a. IF `self.salary_component_abbr` is falsy THEN derive it: `"".join([c[0] for c in self.salary_component.split()]).upper()` (first letter of each word of the name, uppercased).
   b. `self.salary_component_abbr = self.salary_component_abbr.strip()`.
   c. `self.salary_component_abbr = append_number_if_name_exists("Salary Component", self.salary_component_abbr, "salary_component_abbr", separator="_", filters={"name": ["!=", self.name]})` — if the abbreviation collides with another Salary Component's abbreviation, a numeric suffix (`_1`, `_2`, ...) is appended until unique.
2. `validate_accounts()`: IF NOT (`self.statistical_component` OR (`self.accounts` non-empty AND every row has `account`)) THEN `frappe.msgprint(title="Warning", msg="Accounts not set for Salary Component {0}", indicator="orange")` — **warning only, not blocking**.
3. `validate_accrual_component()`:
   a. IF `self.type != "Earning"` AND `self.accrual_component` THEN `frappe.throw("Accrual Component can only be set for Earning Salary Components.", title="Invalid Accrual Component")`.
   b. IF `self.is_flexible_benefit` THEN: `requires_accrual = self.payout_method in ["Accrue and payout at end of payroll period", "Accrue per cycle, pay only on claim"]`.
      - IF `requires_accrual` AND NOT `self.accrual_component` THEN `frappe.throw("Accrual Component must be set for Flexible Benefit Salary Components with accrual payout methods.", title="Invalid Accrual Component")`.
      - IF NOT `requires_accrual` AND `self.accrual_component` THEN `frappe.throw("Accrual Component can only be set for Flexible Benefit Salary Components with accrual payout methods.", title="Invalid Accrual Component")`.
4. `valide_arrear_component()` (typo preserved from source method name): IF `self.variable_based_on_taxable_salary` AND `self.arrear_component` THEN `frappe.throw("Arrear Component cannot be set for Salary Components based on taxable salary.", title="Invalid Arrear Component")`.

Additionally, in `before_validate()` (runs before the above, and before Frappe's own mandatory/type validation):

5. `self._condition, self.condition = self.condition, sanitize_expression(self.condition)` — the raw multi-line `condition` text as authored is stashed in a private `_condition` attribute (not persisted), while `self.condition` is overwritten with the sanitized single-line form (`sanitize_expression`: strip, split on lines, join with a single space) used for actual evaluation.
6. Same transformation for `formula` / `_formula`.
7. In `on_update()` (runs after save): IF `self._condition != self.condition` THEN `self.db_set("condition", self._condition)` — i.e., the **original multi-line text is written back to the database** after the sanitized version was used only in-memory for the save cycle (so what's persisted in `condition`/`formula` columns is the human-readable multi-line form, but what gets evaluated at runtime via `Salary Detail`/`Salary Slip` is always re-sanitized on each use, since `Salary Structure`/`Salary Slip` call `sanitize_expression`-equivalent logic — actually per source, sanitization happens on the Salary Component's own condition/formula at every save, and the resulting sanitized string is what other code paths copy via `fetch_from`/row copy — see Port Notes for the exact nuance).

## Business Logic / Calculations

`Salary Component` does not itself compute payroll amounts — it is the master/template record. Its two whitelisted methods implement **bulk propagation of a formula/condition change to structures already using this component**:

1. `get_structures_to_be_updated()`: join `Salary Structure` to `Salary Detail` on `Salary Structure.name == Salary Detail.parent`, filter `Salary Detail.salary_component == self.name` and `Salary Structure.docstatus != 2`, return the list of matching Salary Structure names (`pluck`).
2. `update_salary_structures(field, value, structures=None)`:
   a. `is_formula_related = (field == "formula")`.
   b. IF `structures` not passed, compute via step 1.
   c. FOR each structure name: check write permission (`frappe.has_permission("Salary Structure", "write", structure, throw=True)`), load the `Salary Structure` document, snapshot it (`_doc_before_save = copy.deepcopy(...)`) for versioning purposes without an extra DB read.
   d. Find the matching `Salary Detail` row in the structure's `earnings`/`deductions`/`employer_contributions` table (via `COMPONENT_TYPE_TO_PARENTFIELD[self.type]`) whose `salary_component == self.name`; IF none found, skip this structure.
   e. IF `is_formula_related`: `value = value if self.amount_based_on_formula else None` (a pushed formula value is only kept if the component itself still has `amount_based_on_formula` on; otherwise it's nulled), and set `salary_detail_row.amount_based_on_formula = self.amount_based_on_formula` on the row too.
   f. `salary_detail_row.set(field, value)` — writes `condition` or `formula` onto the row.
   g. `salary_structure.db_update_all()` — a bulk direct-SQL update of the parent + all child rows, bypassing the full `save()`/`validate()` cycle for performance.
   h. Set `updater_reference` flags and call `salary_structure.save_version()` to still record an audit-trail version despite bypassing `save()`.
   i. `salary_structure.clear_cache()` — since `db_update_all()` does not itself invalidate any cached document, this is required so that subsequent Salary Slip generation reads the updated formula.

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| `before_validate` | sanitize `condition`/`formula` into single-line form for validation/use; original text stashed | none |
| `validate` | `validate_abbr`, `validate_accounts`, `validate_accrual_component`, `valide_arrear_component` (in that order) | none |
| `on_update` | restore original multi-line `condition`/`formula` text to DB if it differs from the sanitized value | direct `db_set` writes (no other doctype) |
| `clear_cache` (Frappe framework hook, fired on every save/delete) | deletes `SALARY_COMPONENT_VALUES` and `TAX_COMPONENTS_BY_COMPANY` cache keys (module-level constants imported from `hrms.payroll.doctype.salary_slip.salary_slip`), then calls `super().clear_cache()` | invalidates cross-doctype caches read by every `Salary Slip` during formula evaluation and tax-component resolution |

## Whitelisted / API Methods

| Method name | HTTP-equivalent purpose | Args | Returns | What it does |
|---|---|---|---|---|
| `get_structures_to_be_updated` | GET-like (read) | none (instance method, uses `self.name`/`self.type`) | `list[str]` of Salary Structure names | Finds all non-cancelled Salary Structures whose `earnings`/`deductions`/`employer_contributions` table contains this component |
| `update_salary_structures` | POST-like (bulk write) | `field: str`, `value: str | int | float | None`, `structures: list | None` | `None` | Pushes this component's `condition` or `formula` value onto the matching `Salary Detail` row in each given (or discovered) Salary Structure, bypassing full document save for performance, then versions + clears cache |

## Permissions

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| HR User | Yes | Yes | Yes | No | — | — | — | Yes | Yes | `email: 1`, `print: 1`, `share: 1` |
| HR Manager | Yes | Yes | Yes | Yes | — | — | — | Yes | Yes | `email: 1`, `print: 1`, `share: 1` |
| Employee | Yes | No | No | No | — | — | — | No | No | read-only |

(Not submittable, so Submit/Cancel/Amend columns are not applicable/blank for all roles.)

## Scheduled Jobs Touching This Doctype

None found in `hrms/hooks.py`.

## Related Doctypes

- [[Salary Component Account]] — child table mapping this component to a GL account per company.
- [[Salary Structure]] — `get_structures_to_be_updated()`/`update_salary_structures()` bulk-propagate a formula/condition change into every structure's `Salary Detail` rows referencing this component.
- [[Salary Detail]] — the shared child-row shape (on both Salary Structure and Salary Slip) that carries `salary_component`, `condition`, `formula`, `amount`.
- [[Salary Slip]] — evaluates each component's `condition`/`formula`/flags at slip-generation time; also the target of the `SALARY_COMPONENT_VALUES`/`TAX_COMPONENTS_BY_COMPANY` cache invalidation on save.

## Port Notes

- **`autoname: field:salary_component`**: the document's primary key/name IS a user-editable text field. A port must either (a) keep the component name as the literal primary key (simplifest, matches source, but renaming means the PK changes and every FK/reference — including `Salary Detail.salary_component`, GL account mappings, formula-abbr caches — must cascade), or (b) introduce a separate surrogate `id` and treat `salary_component` as a unique display name (recommended for a relational port, avoids cascading-rename complexity); if (b), `allow_rename: 1` behavior (Frappe auto-renames the doc and cascades all Link-field references site-wide) needs an explicit rename-cascade routine.
- The condition/formula "sanitize on save, restore original text via a follow-up `db_set` after save" dance (`before_validate` + `on_update`) is essentially a workaround so multi-line formulas display nicely in the code editor UI while a single-line normalized string is what's actually evaluated. A port can simplify this: store the human-authored (possibly multi-line) text as entered, and apply the equivalent of `sanitize_expression` (trim + join lines with a single space) at the point of **evaluation** rather than persisting two representations via a second write. Flag: confirm downstream evaluation call sites (`Salary Slip.eval_condition_and_formula`) rely on the already-sanitized in-memory value from the same request, not a fresh re-sanitize of the persisted (restored, un-sanitized) DB value — i.e., a port evaluating from a freshly-loaded row must re-apply `sanitize_expression` to the stored text before `eval`, since what's in the DB row itself is the multi-line original.
- `condition`/`formula` are stored as raw Python-expression text (`options: PythonExpression`) evaluated via `_safe_eval` (see `hrms/payroll/utils.py`, AST-based denylist sandbox, not a full sandbox — explicitly documented in source as safe only for "trusted, admin-authored" expressions). A port on a non-Python stack must choose: (a) implement an equivalent tiny expression language/interpreter (recommended — avoids embedding a general-purpose scripting language in payroll config), or (b) embed a scripting engine with equivalent sandboxing. This is a significant, non-trivial subsystem to reproduce faithfully; treat it as its own design task, not a one-line port.
- `get_structures_to_be_updated`/`update_salary_structures` intentionally bypass full document validation (`db_update_all`) for bulk-update performance across potentially many Salary Structures — a port should preserve the "explicit propagate" UX (nothing auto-propagates; a user must click "Sync Condition"/"Sync Formula") but can choose either a bulk update or full per-row validated save depending on the target stack's transaction/performance characteristics; just don't silently auto-propagate on every Salary Component edit, since the source explicitly does not.
- The Salary Component -> Salary Structure -> Salary Slip cache invalidation chain (`clear_cache()` deleting `SALARY_COMPONENT_VALUES`/`TAX_COMPONENTS_BY_COMPANY`) is essential for correctness (stale caches would cause wrong tax-component selection or wrong abbreviation defaults in formulas) — a port must wire equivalent cache invalidation on every Salary Component (and its `accounts` child rows) write.
