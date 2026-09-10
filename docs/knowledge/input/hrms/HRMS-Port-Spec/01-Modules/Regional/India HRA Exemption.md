# India HRA Exemption

**Source:** `hrms/regional/india/utils.py`, `hrms/hr/utils.py` (hook stubs), `hrms/hooks.py`
(`regional_overrides`), `hrms/payroll/doctype/employee_tax_exemption_declaration/employee_tax_exemption_declaration.py`,
`hrms/payroll/doctype/employee_tax_exemption_proof_submission/employee_tax_exemption_proof_submission.py`
**Module:** Regional (India) — this is override logic, not a standalone doctype.

## 1. Exact Trigger

Two separate `@erpnext.allow_regional`-decorated functions in core are overridden, both feeding
India-specific House Rent Allowance (HRA) tax-exemption math:

- `hrms.hr.utils.calculate_annual_eligible_hra_exemption(doc)` — no-op stub, `return {}`
  (`hrms/hr/utils.py:748-752`).
- `hrms.hr.utils.calculate_hra_exemption_for_period(doc)` — no-op stub, `return {}`
  (`hrms/hr/utils.py:755-759`).

`hooks.py` wiring (`hrms/hooks.py:310-316`):
```python
regional_overrides = {
    "India": {
        "hrms.hr.utils.calculate_annual_eligible_hra_exemption": "hrms.regional.india.utils.calculate_annual_eligible_hra_exemption",
        "hrms.hr.utils.calculate_hra_exemption_for_period": "hrms.regional.india.utils.calculate_hra_exemption_for_period",
        ...
    },
}
```

Call sites (only active if the current company's country resolves to "India" so the override is
patched in):
- `[[Employee Tax Exemption Declaration]].validate()` (or equivalent lifecycle method) calls
  `calculate_annual_eligible_hra_exemption(self)` when `self.monthly_house_rent` is truthy, and
  adds the returned `annual_exemption` into `self.total_exemption_amount`. It also sets
  `self.salary_structure_hra`, `self.annual_hra_exemption`, `self.monthly_hra_exemption` from the
  returned dict (fields reset to 0 first).
- `[[Employee Tax Exemption Proof Submission]]` controller calls
  `calculate_hra_exemption_for_period(self)` when `self.house_rent_payment_amount` is truthy, and
  adds the returned `total_eligible_hra_exemption` into `self.exemption_amount`. Fields
  `self.monthly_hra_exemption`, `self.monthly_house_rent`, `self.total_eligible_hra_exemption` are
  reset to 0 first, then set from the returned dict.

## 2. Full Algorithm (numbered pseudocode)

### 2A. `calculate_annual_eligible_hra_exemption(doc)`

Inputs: `doc` — an `Employee Tax Exemption Declaration` (or similar) with fields `employee`,
`company`, `payroll_period`, `monthly_house_rent`, `rented_in_metro_city`, `docstatus`.

1. Read `basic_component` and `hra_component` link fields off the `Company` record
   (`doc.company`).
2. IF either `basic_component` or `hra_component` is unset THEN throw error:
   `"Please set Basic and HRA component in Company {company_link}"`.
3. Initialize `annual_exemption = monthly_exemption = hra_amount = basic_amount = 0`.
4. Fetch all submitted `[[Salary Structure Assignment]]` records for `doc.employee` whose `from_date`
   falls inside `doc.payroll_period`'s date range (`get_salary_assignments`, see
   `hrms/hr/utils.py:649` — order by `from_date`); if none found in-period, fall back to the most
   recent prior assignment before the period start.
5. IF no assignments found AND `doc.docstatus == 1` (submitted) THEN throw error:
   `"Salary Structure must be submitted before submission of {doctype}"`.
6. Get `period_start_date` = the `[[Payroll Period]]`'s `start_date`.
7. For each assignment, clamp its `from_date` to `max(assignment.from_date, period_start_date)`
   (so an assignment that started before the period is treated as starting at period start).
   Collect these clamped `from_date`s into `assignment_dates` in order.
8. FOR each assignment (indexed `idx`):
   a. IF the assignment's `[[Salary Structure]]` does NOT contain a `[[Salary Detail]]` row in the
      `earnings` table with `salary_component == hra_component` THEN skip this assignment
      (no HRA in that structure).
   b. ELSE: generate a preview `[[Salary Slip]]` for `(employee, salary_structure, posting_date =
      assignment.from_date)` and read off the `earnings` table: `basic_amt` = amount where
      `salary_component == basic_component`, `hra_amt` = amount where `salary_component ==
      hra_component` (loop stops early once both are found).
   c. Compute this assignment's `to_date` = the clamped `from_date` of the NEXT assignment in
      `assignment_dates` minus 1 day; if this is the last assignment, `to_date` = the Payroll
      Period's `end_date`.
   d. Read the assignment's Salary Structure's `payroll_frequency`.
   e. Compute the pro-rated pay for the (from_date, to_date) window via `get_component_pay`
      (step 2B below) for both basic and HRA amounts, and add to running totals `basic_amount`
      and `hra_amount`.
9. IF `hra_amount` is nonzero (i.e. at least one assignment actually paid HRA):
   a. IF `doc.monthly_house_rent` is set:
      - Compute `annual_exemption` via `calculate_hra_exemption` (step 2C) using
        `(basic_amount, hra_amount, doc.monthly_house_rent, doc.rented_in_metro_city)`. Note:
        this uses the salary_structure of the LAST assignment in the loop (loop variable leaks —
        this is a straight port of the source's behavior, not necessarily by original intent).
      - IF `annual_exemption > 0` THEN `monthly_exemption = annual_exemption / 12`.
      - ELSE `annual_exemption = 0` (negative/zero exemptions are clamped to 0).
10. Return `{hra_amount, annual_exemption, monthly_exemption}`.

### 2B. `get_component_pay(frequency, amount, from_date, to_date)`

1. `days = (to_date - from_date) + 1` (inclusive day count).
2. IF `frequency == "Daily"` -> `amount * days`.
3. IF `frequency == "Weekly"` -> `amount * floor(days / 7)`.
4. IF `frequency == "Fortnightly"` -> `amount * floor(days / 14)`.
5. IF `frequency == "Monthly"` -> `amount * month_diff(to_date, from_date)` (whole calendar-month
   count between the two dates).
6. IF `frequency == "Bimonthly"` -> `amount * (month_diff(to_date, from_date) / 2)`.
7. Any other frequency -> function falls through and returns `None` (not explicitly handled — port
   note: treat as an unsupported-frequency case and decide explicit behavior, e.g. throw).

### 2C. `calculate_hra_exemption(salary_structure, annual_basic, annual_hra, monthly_house_rent, rented_in_metro_city)`

Per Indian income-tax rules, exempt HRA = **minimum of 3 cases**:
1. **Case 1:** `annual_hra` (the actual annual HRA amount paid by the employer).
2. **Case 2:** `(monthly_house_rent * 12) - (annual_basic * 0.10)` (actual annual rent paid, less
   10% of annual basic salary).
3. **Case 3:** `annual_basic * 0.50` IF `rented_in_metro_city` is true, ELSE `annual_basic * 0.40`
   (metro cities get a 50% allowance, non-metro get 40%).
4. Return `min(case1, case2, case3)`.

(Source comment: `# TODO make this configurable` — the metro/non-metro percentages and the 10%
basic offset are hardcoded, not configurable via any settings doctype.)

### 2D. `calculate_hra_exemption_for_period(doc)`

Inputs: `doc` — an `Employee Tax Exemption Proof Submission` with `house_rent_payment_amount`,
`rented_from_date`, `rented_to_date`, plus the same `employee`/`company`/`payroll_period` fields
needed by 2A (this function reuses 2A internally).

1. Initialize `monthly_rent = eligible_hra = 0`.
2. IF `doc.house_rent_payment_amount` is falsy THEN return `None` (nothing computed).
3. ELSE:
   a. Call `validate_house_rent_dates(doc)` (step 2E) — throws on invalid input.
   b. Compute `factor = (date_diff(rented_to_date, rented_from_date) + 1) / 30` (approximate
      number of 30-day months covered by the rented period).
   c. Round `factor` to the nearest 0.5: `factor = round(factor * 2) / 2`.
   d. `monthly_rent = doc.house_rent_payment_amount / factor`.
   e. Set `doc.monthly_house_rent = monthly_rent` (mutates the doc in place — this field is read
      by step 2A's algorithm when it's invoked next).
   f. Call `calculate_annual_eligible_hra_exemption(doc)` (2A) to get `exemptions` dict.
   g. IF `exemptions["monthly_exemption"]` is truthy THEN `eligible_hra = exemptions
      ["monthly_exemption"] * factor` (total eligible amount for the actual rented period, not a
      full year).
   h. Add `monthly_house_rent = monthly_rent` and `total_eligible_hra_exemption = eligible_hra`
      into the `exemptions` dict.
   i. Return the augmented `exemptions` dict.

### 2E. `validate_house_rent_dates(doc)`

1. IF `doc.rented_to_date` or `doc.rented_from_date` is unset THEN throw:
   `"House rented dates required for exemption calculation"`.
2. IF `date_diff(rented_to_date, rented_from_date) < 14` THEN throw:
   `"House rented dates should be atleast 15 days apart"` (note: check is `< 14` days difference,
   i.e. requires the span to be at least 15 calendar days inclusive — message says "15 days
   apart", implementation checks the day-difference, not inclusive count, so port the check as
   `< 14` literally).
3. Query all **submitted** (`docstatus == 1`) `Employee Tax Exemption Proof Submission` records
   for the same `employee` and `payroll_period` whose `rented_from_date` OR `rented_to_date` falls
   inside `[doc.rented_from_date, doc.rented_to_date]` (inclusive range overlap check on either
   endpoint).
4. IF any such record exists THEN throw:
   `"House rent paid days overlapping with {other_submission_name}"`.

## 3. Custom Fields (India `setup.py::get_custom_fields`, HRA-relevant subset)

| DocType | Fieldname | Label | Type | Insert After | Notes |
|---|---|---|---|---|---|
| Company | `hra_section` | HRA Settings | Section Break | `default_payroll_payable_account` | collapsible |
| Company | `basic_component` | Basic Component | Link ([[Salary Component]]) | `hra_section` | |
| Company | `hra_component` | HRA Component | Link ([[Salary Component]]) | `basic_component` | |
| Company | `hra_column_break` | — | Column Break | `hra_component` | |
| Company | `arrear_component` | Arrear Component | Link ([[Salary Component]]) | `hra_column_break` | not used by HRA calc directly, seeded alongside |
| Employee Tax Exemption Declaration | `hra_section` | HRA Exemption | Section Break | `declarations` | |
| Employee Tax Exemption Declaration | `monthly_house_rent` | Monthly House Rent | Currency | `hra_section` | |
| Employee Tax Exemption Declaration | `rented_in_metro_city` | Rented in Metro City | Check | `monthly_house_rent` | `depends_on: monthly_house_rent` |
| Employee Tax Exemption Declaration | `salary_structure_hra` | HRA as per Salary Structure | Currency | `rented_in_metro_city` | read-only, `depends_on: monthly_house_rent` |
| Employee Tax Exemption Declaration | `hra_column_break` | — | Column Break | `salary_structure_hra` | `depends_on: monthly_house_rent` |
| Employee Tax Exemption Declaration | `annual_hra_exemption` | Annual HRA Exemption | Currency | `hra_column_break` | read-only, `depends_on: monthly_house_rent` |
| Employee Tax Exemption Declaration | `monthly_hra_exemption` | Monthly HRA Exemption | Currency | `annual_hra_exemption` | read-only, `depends_on: monthly_house_rent` |
| Employee Tax Exemption Proof Submission | `hra_section` | HRA Exemption | Section Break | `tax_exemption_proofs` | |
| Employee Tax Exemption Proof Submission | `house_rent_payment_amount` | House Rent Payment Amount | Currency | `hra_section` | |
| Employee Tax Exemption Proof Submission | `rented_in_metro_city` | Rented in Metro City | Check | `house_rent_payment_amount` | `depends_on: house_rent_payment_amount` |
| Employee Tax Exemption Proof Submission | `rented_from_date` | Rented From Date | Date | `rented_in_metro_city` | `depends_on: house_rent_payment_amount` |
| Employee Tax Exemption Proof Submission | `rented_to_date` | Rented To Date | Date | `rented_from_date` | `depends_on: house_rent_payment_amount` |
| Employee Tax Exemption Proof Submission | `hra_column_break` | — | Column Break | `rented_to_date` | `depends_on: house_rent_payment_amount` |
| Employee Tax Exemption Proof Submission | `monthly_house_rent` | Monthly House Rent | Currency | `hra_column_break` | read-only, `depends_on: house_rent_payment_amount` |
| Employee Tax Exemption Proof Submission | `monthly_hra_exemption` | Monthly Eligible Amount | Currency | `monthly_house_rent` | read-only, `depends_on: house_rent_payment_amount` |
| Employee Tax Exemption Proof Submission | `total_eligible_hra_exemption` | Total Eligible HRA Exemption | Currency | `monthly_hra_exemption` | read-only, `depends_on: house_rent_payment_amount` |

(Other India custom fields not related to HRA — `component_type` on Salary Component, bank/PAN
fields on Employee — are documented in `India Gratuity Rule Setup + Custom Fields.md` since they
ship from the same `setup.py::get_custom_fields()` fixture function.)

## 4. Gratuity Rule Records

None — HRA exemption has no Gratuity Rule involvement.

## 5. Port Notes

- **Pluggable regional-strategy pattern:** expose `calculateAnnualEligibleHraExemption(declaration)`
  and `calculateHraExemptionForPeriod(proofSubmission)` on a `RegionalStrategy` interface (see
  `_Module-Spec.md`); the `IndiaRegionalStrategy` implements both per the algorithm above, a
  default/no-country strategy returns `null`. Resolve the active strategy by the company's country
  once per request, and call it from the two exact points named in section 1 above (inside the
  Declaration/Proof Submission save-validation path) — do NOT branch on country inline in generic
  payroll code.
- The **loop-variable leak** in step 9a of `calculate_annual_eligible_hra_exemption` (using the
  last-iterated `assignment.salary_structure` rather than a specific one tied to `monthly_house_rent`)
  is present in the source; note it explicitly as-is rather than "fixing" it silently, since
  `calculate_hra_exemption`'s `salary_structure` parameter is actually unused inside that function
  body — it can be dropped entirely in a port with no behavior change.
- **Preview salary slip generation** (`make_salary_slip(..., for_preview=1)`) is a Frappe-specific
  mechanism to compute a component's amount as it would appear on a real payslip without
  persisting a document — in a port, this must be replicated as a pure calculation call into
  whatever computes salary component amounts (formula-based earnings/deductions), not a real
  transactional slip.
- **Currency/precision:** All amounts are plain floats via `frappe.utils.flt`; a port should apply
  standard currency rounding as configured for the tenant, not floating-point exact preservation.
- **Validation ordering matters**: `validate_house_rent_dates` runs BEFORE the exemption
  calculation and must short-circuit (throw) before any calculation proceeds, exactly as ordered
  in `calculate_hra_exemption_for_period` step 2D.

## Related Doctypes

- [[Employee Tax Exemption Declaration]] — carries the HRA custom fields and calls `calculate_annual_eligible_hra_exemption`.
- [[Employee Tax Exemption Proof Submission]] — carries the HRA custom fields and calls `calculate_hra_exemption_for_period`.
- [[Salary Structure Assignment]] — source of the employee's active salary structure(s) per payroll period.
- [[Salary Structure]] — checked for an `earnings` row matching the HRA component.
- [[Salary Detail]] — the child table row type used for the earnings/HRA lookup.
- [[Salary Slip]] — a preview slip is generated to read basic/HRA amounts.
- [[Payroll Period]] — bounds the date range used to select salary structure assignments.
- [[Salary Component]] — target of the Company `basic_component`/`hra_component`/`arrear_component` custom fields.
