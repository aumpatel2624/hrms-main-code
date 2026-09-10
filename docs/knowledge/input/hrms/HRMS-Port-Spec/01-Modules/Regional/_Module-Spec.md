# Regional (Country-Specific Overrides)

**Source (mechanism):** `hrms/hooks.py` (`regional_overrides` dict), `hrms/hr/utils.py` (base
`@erpnext.allow_regional` stub functions), `hrms/regional/india/`, `hrms/regional/united_arab_emirates/`
**Nature:** This is NOT a set of standalone doctypes. It is a **strategy-override plugin
mechanism**: generic HR/Payroll code calls a small, fixed set of "regional hook points", and a
per-country module can swap in a country-specific implementation. India and UAE are the only two
countries with active overrides in this codebase.

## Contents

- [[India Gratuity Rule Setup + Custom Fields]]
- [[India HRA Exemption]]
- [[India Marginal Relief Tax]]
- [[UAE Gratuity Rules]]

## Purpose

Frappe/ERPNext HR logic is written generically (e.g. "calculate HRA exemption", "apply marginal
relief to tax"), but a handful of calculations are legally specific to one country (India's House
Rent Allowance tax exemption rules, India's income-tax marginal relief, Gratuity Rule presets for
India/UAE). Rather than branching on country inside the generic code, the framework defines an
**extension point**: a plain Python function decorated `@erpnext.allow_regional`, which by default
does nothing (returns `{}` / `None`). At app-install/boot time, if the current company's country
has an entry in `hooks.py`'s `regional_overrides` dict, Frappe monkey-patches that decorated
function to instead call the country-specific implementation.

## The `allow_regional` mechanism, generically

1. **Definition site (generic/core code):** A function that represents a country-swappable
   calculation is defined normally, then decorated `@erpnext.allow_regional`. It contains a
   trivial/no-op default body (e.g. `return {}`) and a comment noting it exists for localization.
   Example: `hrms/hr/utils.py::calculate_annual_eligible_hra_exemption`.
2. **Registration (`hooks.py`):** The app's `hooks.py` declares a dict:
   ```python
   regional_overrides = {
       "<Country Name>": {
           "<dotted.path.to.generic_function>": "<dotted.path.to.country_specific_function>",
       },
   }
   ```
   Key = exact country name as stored on the `Company`/`Country` doctype (here: `"India"`). Value
   = a map from the generic function's fully-qualified import path to the replacement function's
   fully-qualified import path. Both functions must have an identical call signature.
3. **Resolution (framework runtime, not app code):** When the framework loads regional overrides
   (this happens once, keyed off the current site's/company's country), it looks up
   `regional_overrides[country]`, imports each generic function's module, and replaces the
   function object in that module's namespace with the resolved override function. Every existing
   caller that imported/calls the generic function by qualified path (or that does
   `from module import function_name` and then calls it, since Python name binding is late for
   `module.function` attribute access, but early for a direct `from x import y` — Frappe's
   override mechanism specifically monkeypatches the function attribute on the module object, so
   callers must call through the module, e.g. `hrms.hr.utils.calculate_x(...)`, or via a fresh
   `from hrms.hr.utils import calculate_x` executed after the patch is applied at boot) transparently
   gets the country-specific behavior with zero call-site changes.
4. **No override registered for a country:** the original generic (no-op) function keeps running,
   so unhandled countries silently get `{}`/`None`/pass-through behavior — this is the same as
   "feature disabled" for that calculation.

Only 3 hook points are overridden in this codebase, all for `"India"`, all pointing at
`hrms/regional/india/utils.py`:

| Generic function (defined in) | Override function (`hrms/regional/india/utils.py`) |
|---|---|
| `hrms.hr.utils.calculate_annual_eligible_hra_exemption` | `calculate_annual_eligible_hra_exemption` |
| `hrms.hr.utils.calculate_hra_exemption_for_period` | `calculate_hra_exemption_for_period` |
| `hrms.hr.utils.calculate_tax_with_marginal_relief` | `calculate_tax_with_marginal_relief` |

UAE has **no calculation overrides** — it only contributes one-time fixture data via `setup()`
(see [[UAE Gratuity Rules]]). There is no `regional_overrides["United Arab Emirates"]` entry in
`hooks.py`.

## Doctype-ish list (fixture data seeded, not new doctypes)

- **Gratuity Rule** (existing core doctype, not defined in this module) — India seeds 1 record
  (`Indian Standard Gratuity Rule`), UAE seeds 3 records. See
  [[India Gratuity Rule Setup + Custom Fields]] and [[UAE Gratuity Rules]].
- **Custom Field** records added by India's `setup.py` onto `Salary Component`, `Employee`,
  `Company`, `Employee Tax Exemption Declaration`, `Employee Tax Exemption Proof Submission`,
  `Income Tax Slab` — see [[India Gratuity Rule Setup + Custom Fields]].
- **Custom Role** records added onto 3 standard reports — see the same file.

There are no country-specific doctypes; everything here either (a) overrides a calculation
function, or (b) seeds data into existing generic doctypes (Custom Field defs, Gratuity Rule
records, Custom Role records) via a one-time `setup()` fixture function.

## Recommended target schema shape (generic stack)

No new tables are needed for the override *mechanism* itself — it is pure application-layer
dispatch, not persisted data. What must be modeled:

- **`gratuity_rules`** table (already required by core Gratuity module) with a child table
  **`gratuity_rule_slabs`** (`gratuity_rule_id` FK, `from_year`, `to_year`, `fraction_of_applicable_earnings`).
  India/UAE presets are just rows inserted here at seed/migration time (see per-file specs for
  exact values) — no schema change required, only seed data.
- **`income_tax_slabs`** table needs a `marginal_relief_limit` column/field (India-only,
  conditionally shown when `tax_relief_limit > 0` and `currency == 'INR'`) — see
  [[India Marginal Relief Tax]].
- **`companies`** needs `basic_component_id` and `hra_component_id` FK columns (+ optional
  `arrear_component_id`) pointing at `salary_components` — used by the HRA exemption calculation.
- **`employees`** needs `pan_number`, `provident_fund_account`, `ifsc_code`, `micr_code` fields
  (India-only bank/tax identifiers) — no calculation logic depends on these except display/report
  usage; port as plain nullable string columns, conditionally shown in UI for India-based tenants.
- **`salary_components`** needs a `component_type` enum column (`Provident Fund`, `Additional
  Provident Fund`, `Provident Fund Loan`, `Professional Tax`, or empty), shown only when
  `type == "Deduction"`.
- **`employee_tax_exemption_declarations`** and **`employee_tax_exemption_proof_submissions`**
  need the HRA fields listed in [[India HRA Exemption]].

## Module-wide invariant / design guidance for a port

- **Model this as a `RegionalStrategy` interface + country-keyed registry**, not as `if country ==
  "India"` branches scattered through payroll code. Define one interface per hook point (or one
  interface with multiple methods, since India's 3 hooks are related):
  ```
  interface PayrollRegionalStrategy {
      calculateAnnualEligibleHraExemption(declaration): HraExemptionResult | null
      calculateHraExemptionForPeriod(proofSubmission): HraExemptionResult | null
      calculateTaxWithMarginalRelief(taxSlab, taxAmount, annualTaxableEarning): number | null
  }
  ```
  A `DefaultRegionalStrategy` implements every method as a no-op (returns `null`/`{}`, matching
  the core `allow_regional` stubs' behavior of doing nothing for unhandled countries). An
  `IndiaRegionalStrategy` implements the real logic from [[India HRA Exemption]] /
  [[India Marginal Relief Tax]]. A registry resolves `country -> strategy instance` (e.g. a map
  or DI-container binding keyed by the company's/tenant's country code), looked up once per
  request/company context — analogous to how Frappe resolves `regional_overrides` once per site
  boot. UAE needs no strategy class since it has no calculation overrides — its gratuity presets
  are pure seed data, not code.
- **Exact call sites the port's generic Payroll/Gratuity logic must call through the strategy
  interface** (these are the 3 real integration points, found by tracing each override target):
  1. `Employee Tax Exemption Declaration` save/validate logic (`employee_tax_exemption_declaration.py`,
     around where `self.total_exemption_amount` is accumulated): call
     `strategy.calculateAnnualEligibleHraExemption(declaration)` when `declaration.monthly_house_rent`
     is set; add the returned `annual_exemption` into the total exemption amount.
  2. `Employee Tax Exemption Proof Submission` save/validate logic
     (`employee_tax_exemption_proof_submission.py`, around where `self.exemption_amount` is
     accumulated): call `strategy.calculateHraExemptionForPeriod(proofSubmission)` when
     `proofSubmission.house_rent_payment_amount` is set; add the returned
     `total_eligible_hra_exemption` into the exemption amount.
  3. Tax-slab-based tax calculation (`income_tax_slab.py::calculate_tax_by_tax_slab`, immediately
     after the base tax amount is computed from the slab brackets, before surcharge/other-charges
     are applied): call `strategy.calculateTaxWithMarginalRelief(taxSlab, taxAmount,
     annualTaxableEarning)`; if it returns a non-null/non-zero-equivalent value, replace
     `taxAmount` with it before continuing to surcharge calculation.
- **A tenant/company's country determines which strategy is active** — resolve it once (e.g. from
  the company's country field, or a per-tenant config value) rather than re-deriving it inline at
  each call site.
- **Fixture seeding (India's Gratuity Rule + custom fields, UAE's Gratuity Rule presets) is a
  one-time data migration**, not runtime logic — port as idempotent seed/migration scripts (check-
  then-insert, matching the source's `frappe.db.exists(...)` / `ignore_if_duplicate=True` guards)
  run once per tenant/environment setup, not as application code executed per request.
