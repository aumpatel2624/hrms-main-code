# Payroll Module — Overview

## Purpose

The Payroll module runs the recurring cycle of paying employees: defining reusable pay
components (`Salary Component`) and structures (`Salary Structure`), assigning a
structure/base to each employee for a date range (`Salary Structure Assignment`),
batch-generating and computing individual pay statements (`Salary Slip`) for a payroll
run (`Payroll Entry`) against a defined fiscal window (`Payroll Period`), applying
one-off adjustments (`Additional Salary`, `Arrear`, `Employee Incentive`, `Retention
Bonus`, `Employee Benefit Claim`), calculating statutory income tax per employee
(`Income Tax Slab` + the `Employee Tax Exemption *` declaration/proof chain), computing
end-of-service `Gratuity`, and handling exceptional pay-hold/release and correction
flows (`Salary Withholding`, `Payroll Correction`). `Salary Slip` is the computational
core of the module — nearly every other doctype exists either to configure its inputs
or to record something that feeds into it.

## Doctype List

> [!note] Tax & Benefits doctypes live here too
> The `Income Tax Slab`, `Employee Tax Exemption *`, and `Employee Other Income` rows
> below are conceptually grouped as "Tax & Benefits" elsewhere in this vault, but their
> full port specs are written here since they physically ship under `hrms/payroll/doctype/`
> in source. See `Tax-Benefits/_Module-Spec.md` for that navigational grouping.

| Doctype | Purpose |
|---|---|
| [[Salary Component]] | Master: a single earning/deduction type (name, abbr, type, tax behavior, GL accounts). |
| [[Salary Component Account]] | Child of Salary Component: per-company default GL account mapping. |
| [[Salary Detail]] | Child row (used by both Salary Structure and Salary Slip): one component's amount/formula/condition for a structure or a slip. |
| [[Salary Structure]] | Master: named set of earning/deduction `Salary Detail` rows + CTC/base formula config. |
| [[Salary Structure Assignment]] | Links an Employee to a Salary Structure + base/CTC + income tax slab, effective from a date. |
| [[Bulk Salary Structure Assignment]] | Non-persistent tool doctype: bulk-creates Salary Structure Assignment records for many employees. |
| [[Salary Slip]] | Submittable: one employee's computed pay statement for one payroll period/date range. |
| [[Salary Slip Leave]] | Child of Salary Slip: per-leave-type LWP/leave balance snapshot. |
| [[Salary Slip Loan]] | Child of Salary Slip: loan repayment lines (populated only if the external "lending" app is installed). |
| [[Salary Slip Timesheet]] | Child of Salary Slip: linked Timesheet(s) and hours, for timesheet-based salary. |
| [[Payroll Entry]] | Submittable: batch payroll run — selects employees, creates/submits their Salary Slips, posts GL. |
| [[Payroll Employee Detail]] | Child of Payroll Entry: one selected employee row. |
| [[Payroll Period]] | Master: a fiscal year-like window used for tax annualization and structure assignment scoping. |
| [[Payroll Period Date]] | Child of Payroll Period: sub-period date rows (schema exists; no controller code populates it in this repo — see file). |
| [[Payroll Settings]] | Single: global payroll configuration switches (email behavior, working-hour thresholds, etc). |
| [[Employee Benefit Application]] | Submittable: employee's flexible-benefit allocation request against a benefit-plan structure. |
| [[Employee Benefit Application Detail]] | Child of Employee Benefit Application: per-component requested amount. |
| [[Employee Benefit Claim]] | Submittable: employee's claim against a benefit allocation. |
| [[Employee Benefit Detail]] | Shared child table: per-component max-benefit config referenced by Salary Structure. |
| [[Employee Benefit Ledger]] | Ledger record of benefit claims/applications consumed, for running-balance tracking. |
| [[Employee Cost Center]] | Child table (used in Salary Structure Assignment): % split of an employee's pay across cost centers. |
| [[Employee Incentive]] | Submittable: one-off incentive payout, feeds Salary Slip via Additional Salary-style linkage. |
| [[Employee Other Income]] | Submittable: employee-declared other income used in tax computation. |
| [[Employee Tax Exemption Category]] | Master: a tax-exemption category with a max claimable amount. |
| [[Employee Tax Exemption Sub Category]] | Master: a sub-category under a category (specific exemption instrument). |
| [[Employee Tax Exemption Declaration]] | Submittable: employee's declared exemption amounts per sub-category for a payroll period. |
| [[Employee Tax Exemption Declaration Category]] | Child of Declaration: one sub-category + declared amount row. |
| [[Employee Tax Exemption Proof Submission]] | Submittable: employee's proof-backed (actual) exemption amounts, supersedes declaration late in the period. |
| [[Employee Tax Exemption Proof Submission Detail]] | Child of Proof Submission: one sub-category + proven amount row. |
| [[Income Tax Slab]] | Master: tax bracket set (`Taxable Salary Slab` rows) + config, assigned via Salary Structure Assignment. |
| [[Income Tax Slab Other Charges]] | Child of Income Tax Slab: sequential surcharge/cess-style charges applied on top of slab tax. |
| [[Taxable Salary Slab]] | Child of Income Tax Slab: one bracket (from/to amount, percent deduction). |
| [[Gratuity]] | Submittable: end-of-service gratuity payout computation and payment record. |
| [[Gratuity Rule]] | Master: gratuity calculation method + slab set for a jurisdiction/policy. |
| [[Gratuity Rule Slab]] | Child of Gratuity Rule: years-of-service bracket + fraction/percentage. |
| [[Gratuity Applicable Component]] | Child of Gratuity Rule: which Salary Component(s) count toward the gratuity base salary. |
| [[Retention Bonus]] | Submittable: scheduled retention bonus, paid out via a linked Additional Salary. |
| [[Additional Salary]] | Submittable: one-off or recurring extra earning/deduction applied to future Salary Slips. |
| [[Arrear]] | Submittable: back-pay adjustment, diffs old vs new structure/assignment and generates Additional Salary rows. |
| [[Payroll Correction]] | Submittable: correction tool that recomputes and generates adjusting Additional Salary rows after a slip was already processed. |
| [[Payroll Correction Child]] | Child of Payroll Correction: per-component correction breakup row. |
| [[Salary Withholding]] | Submittable: withholds an employee's pay for N cycles (e.g. pending investigation) then releases it. |
| [[Salary Withholding Cycle]] | Child of Salary Withholding: one withheld cycle's date range + release status. |

## Recommended Target Schema Shape

Model as a standard RDBMS with owned child tables as FK'd rows (not JSON blobs), so
component-level formulas/amounts remain queryable:

- `salary_component` (id, name, abbr, type[earning|deduction], is_tax_applicable, variable_based_on_taxable_salary, do_not_include_in_total, statistical_component, depends_on_payment_days, is_flexible_benefit, ...)
- `salary_component_account` (id, salary_component_id FK, company_id FK, account_id FK) — unique (salary_component_id, company_id)
- `salary_structure` (id, name, company_id FK, is_active, payroll_frequency, currency, ...)
- `salary_detail` (id, parent_type[Salary Structure|Salary Slip], parent_id, parentfield[earnings|deductions], salary_component_id FK, amount, formula, condition, amount_based_on_formula, statistical_component, default_amount, additional_salary_id FK nullable, tax_on_flexible_benefit, tax_on_additional_salary) — this is the single most important join table; both Salary Structure and Salary Slip rows live here distinguished by parent_type
- `salary_structure_assignment` (id, employee_id FK, salary_structure_id FK, from_date, base, variable, income_tax_slab_id FK nullable, payroll_period_id FK nullable, company_id FK, currency) — unique constraint reproducing source behavior is (employee_id, from_date) exact-match only (see `Salary Structure Assignment.md` Port Notes — source does NOT enforce true non-overlap)
- `employee_cost_center` (id, parent_id FK → salary_structure_assignment, cost_center_id FK, percentage)
- `payroll_period` (id, name, company_id FK, start_date, end_date)
- `payroll_period_date` (id, payroll_period_id FK, ...) — currently unpopulated by any controller; include for schema completeness
- `payroll_entry` (id, company_id FK, start_date, end_date, posting_date, payroll_frequency, status, ...)
- `payroll_employee_detail` (id, payroll_entry_id FK, employee_id FK)
- `salary_slip` (id, employee_id FK, payroll_entry_id FK nullable, salary_structure_id FK, salary_structure_assignment_id FK, start_date, end_date, posting_date, currency, payment_days, total_working_days, gross_pay, total_deduction, net_pay, status, docstatus, ...)
- `salary_slip_leave` (id, salary_slip_id FK, leave_type_id FK, total_allocated_leaves, expired_leaves, used_leaves, pending_leaves, available_leaves)
- `salary_slip_loan` (id, salary_slip_id FK, loan_id FK, loan_repayment_entry_id FK, principal_amount, interest_amount, total_payment)
- `salary_slip_timesheet` (id, salary_slip_id FK, timesheet_id FK, working_hours)
- `income_tax_slab` (id, name, company_id FK, effective_from, currency, allow_tax_exemption, standard_tax_exemption_amount, disabled)
- `taxable_salary_slab` (id, income_tax_slab_id FK, from_amount, to_amount, percent_deduction)
- `income_tax_slab_other_charges` (id, income_tax_slab_id FK, description, percent) — applied sequentially in row order, compounding on the running tax amount
- `employee_tax_exemption_category` (id, name, max_amount)
- `employee_tax_exemption_sub_category` (id, name, category_id FK)
- `employee_tax_exemption_declaration` (id, employee_id FK, payroll_period_id FK, total_exemption_amount, docstatus)
- `employee_tax_exemption_declaration_category` (id, declaration_id FK, sub_category_id FK, max_amount, amount)
- `employee_tax_exemption_proof_submission` (id, employee_id FK, payroll_period_id FK, submission_date, exemption_amount, docstatus)
- `employee_tax_exemption_proof_submission_detail` (id, proof_submission_id FK, sub_category_id FK, max_amount, amount)
- `gratuity_rule` (id, name, calculate_gratuity_amount_based_on, work_experience_calculation_function, minimum_year_for_gratuity)
- `gratuity_rule_slab` (id, gratuity_rule_id FK, from_year, to_year, fraction_of_applicable_earnings)
- `gratuity_applicable_component` (id, gratuity_rule_id FK, salary_component_id FK)
- `gratuity` (id, employee_id FK, gratuity_rule_id FK, boarding_date, relieving_date, current_work_experience, applicable_earnings, amount, paid_amount, pay_via_salary_slip, status, docstatus)
- `retention_bonus` (id, employee_id FK, bonus_payment_date, bonus_amount, salary_component_id FK, additional_salary_id FK — flagged gap, add this column even though source's JSON currently lacks it, see `Retention Bonus.md`)
- `additional_salary` (id, employee_id FK, salary_component_id FK, type[earning|deduction], amount, payroll_date, from_date, to_date, is_recurring, deduct_full_tax_on_selected_payroll_date, overwrite_salary_structure_amount, ref_doctype, ref_docname, docstatus)
- `arrear` (id, employee_id FK, ...)
- `payroll_correction` (id, salary_slip_id FK, ...)
- `payroll_correction_child` (id, payroll_correction_id FK, salary_component_id FK, old_amount, new_amount, difference_amount)
- `salary_withholding` (id, employee_id FK, from_date, to_date, number_of_withholding_cycles, status, docstatus)
- `salary_withholding_cycle` (id, salary_withholding_id FK, from_date, to_date, is_salary_released, salary_slip_id FK nullable)
- `employee_benefit_application` (id, employee_id FK, max_benefits, payroll_period_id FK, ...)
- `employee_benefit_application_detail` (id, application_id FK, salary_component_id FK, amount, max_amount, pro_rata_dispersed_amount)
- `employee_benefit_claim` (id, employee_id FK, salary_component_id FK, claimed_amount, max_amount, ...)
- `employee_benefit_detail` (id, parent_id FK → salary_structure, salary_component_id FK, max_benefit_amount, pay_against_benefit_claim)
- `employee_benefit_ledger` (id, employee_id FK, salary_component_id FK, application_id FK nullable, claim_id FK nullable, amount, payroll_period_id FK, is_leave_period nullable)
- `employee_incentive` (id, employee_id FK, salary_component_id FK, incentive_amount, payroll_date, additional_salary_id FK)
- `employee_other_income` (id, employee_id FK, payroll_period_id FK, amount, ...)
- `payroll_settings` (single row: max_working_hours_against_timesheet, email_salary_slip_to_employee, encrypt_salary_slips_in_emails, password_policy, ...)

Child tables such as `salary_detail`, `taxable_salary_slab`, `gratuity_rule_slab`,
`employee_tax_exemption_declaration_category`/`...proof_submission_detail`, and
`salary_slip_leave`/`salary_slip_loan`/`salary_slip_timesheet` are true owned rows
(delete-with-parent, ordered by an `idx` column) rather than many-to-many join tables —
model them with a `parent_id` FK and cascade delete, not a separate junction table.

## Module-Wide Invariants

1. **One structure assignment per (employee, from_date)** is the only uniqueness the
   source actually enforces (`frappe.db.exists` on exact `employee` + `from_date` +
   `docstatus=1`) — it does NOT prevent overlapping date ranges or multiple assignments
   with different `from_date`s being simultaneously "active." "Current" assignment as
   of a date is resolved purely by picking the latest `from_date <= that date`
   (`get_assigned_salary_structure`). A port should decide explicitly whether to
   preserve this weak invariant or strengthen it — document the choice; do not silently
   assume ERPNext-style strict non-overlap.
2. **Declaration vs Proof Submission precedence for tax**: for all sub-periods of a
   Payroll Period except the final one, `Salary Slip` uses the Employee Tax Exemption
   Declaration's `total_exemption_amount`; from the final sub-period onward it switches
   to a submitted Proof Submission's `exemption_amount` if one exists, else `0` — it
   never falls back to the declaration once past that point. This cross-doctype
   behavior lives in `Salary Slip` but is driven by data these two doctypes expose.
3. **No default Income Tax Slab concept exists** — there is no `is_default`/fallback
   slab resolution anywhere in source. `Salary Structure Assignment.income_tax_slab`
   must be explicitly set or `Salary Slip` tax calculation throws. Do not invent a
   default-slab fallback in the port unless intentionally adding one as a improvement.
4. **Exemption capping is two-level and lossy**: within both Declaration and Proof
   Submission, each row is first capped at its sub-category's `max_amount`, then the
   running per-category total is re-capped at the category's `max_amount` — any excess
   is dropped, not redistributed to other rows/categories.
5. **Additional Salary is the universal one-off-adjustment primitive**: `Gratuity`
   (via pay-via-salary-slip), `Retention Bonus`, `Employee Incentive`, `Arrear`, and
   `Payroll Correction` all ultimately create `Additional Salary` records rather than
   writing directly into a Salary Slip — a port should keep this indirection since
   Salary Slip's own generation logic already knows how to pull in Additional Salary
   rows for a period (overlap-checked at both doc-save time and slip-generation time,
   per two independent, non-symmetric code paths — see `Additional Salary.md`).
6. **Loan repayment fields are contributed by an external "lending" app, not native
   schema**: `Salary Slip.loans`/`total_loan_repayment`/`total_interest_amount`/
   `total_principal_amount` are read/written by `salary_slip.py` under an
   `if_lending_app_installed` gate but do not exist in `salary_slip.json` in this repo.
   A port must decide whether to make loan integration a first-class part of the core
   schema or keep it as a genuinely optional plugin extension — do not assume it's
   always present.
7. **Regional hook seams**: `Salary Slip.apply_regional_deductions()` and
   `Salary Structure Assignment`'s `apply_regional_ctc_components` hook are the two
   distinct extension points a port needs as pluggable seams (currently no-ops/
   unimplemented for India/UAE in this repo) — see `Salary Slip.md` and
   `Salary Structure.md`/`Salary Structure Assignment.md` Port Notes.

## Cross-Module References

Doctypes outside this module referenced here by name only (documented by other
agents): `Employee`, `Company`, `Cost Center`, `Account`, `Leave Type`, `Timesheet`,
`Journal Entry`, `Department`, `Designation`, `Branch`, and the external "lending" app's
`Loan`/`Loan Repayment` doctypes.
