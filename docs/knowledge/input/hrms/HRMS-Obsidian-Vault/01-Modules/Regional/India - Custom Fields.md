---
type: regional-logic
module: Regional
tags: [hrms, regional, india]
---

# India - Custom Fields

Adds the identifiers and classifications India-specific payroll/compliance processes need but that don't exist in the generic core schema — bank routing codes for NEFT/RTGS payroll disbursement, PAN for tax filing, a dedicated PF account number on the employee, and a way to mark a [[Salary Component]] as a statutory deduction type (Provident Fund, Additional PF, PF Loan, Professional Tax) so reports and payroll logic can identify them.

## Hooked Into

Not a `doc_events` hook — installed via `create_custom_fields()` (Frappe framework's Custom Field fixture API) from `hrms/regional/india/setup.py: make_custom_fields()`, called from `setup()` during install/regional setup, and reversible via `uninstall()` → `delete_custom_fields()`. Fields attach to:

- [[Salary Component]] — `component_type` (Select: blank / Provident Fund / Additional Provident Fund / Provident Fund Loan / Professional Tax), shown only when `type == "Deduction"`.
- [[Employee]] — `ifsc_code`, `micr_code` (both shown only when `salary_mode == "Bank"`), `pan_number`, `provident_fund_account`.
- [[Company]] — `basic_component`, `hra_component`, `arrear_component` (Links to [[Salary Component]]), grouped under a new "HRA Settings" section — these are what [[India - HRA Exemption]] reads to identify which salary components are Basic/HRA.
- [[Employee Tax Exemption Declaration]] and [[Employee Tax Exemption Proof Submission]] — the HRA input/output fields (`monthly_house_rent`, `rented_in_metro_city`, `house_rent_payment_amount`, `rented_from_date`/`rented_to_date`, computed exemption amounts) consumed/produced by [[India - HRA Exemption]].
- [[Income Tax Slab]] — `marginal_relief_limit`, consumed by [[India - Marginal Relief Tax Calculation]]; only shown when `tax_relief_limit > 0` and `currency == 'INR'`.

`add_custom_roles_for_reports()` (also called from `setup()`) additionally registers `Custom Role` records granting **[[HR User]]**, **[[HR Manager]]**, and **[[Employee]]** access to three standard reports: "Professional Tax Deductions", "Provident Fund Deductions", "Income Tax Deductions" — otherwise these reports would default to System Manager-only visibility.

## Logic — What Happens and Why

`make_custom_fields(update=True)` simply calls Frappe's `create_custom_fields(get_custom_fields(), update=update)`, which is idempotent — re-running setup updates existing field definitions rather than duplicating them. `uninstall()` reverses this via `delete_custom_fields()` from `hrms.setup`. There is no other business logic here; this file's role is purely schema extension in support of the calculations documented in [[India - HRA Exemption]] and [[India - Marginal Relief Tax Calculation]], and in support of manual PF/Professional Tax salary component configuration (this app does not compute PF/ESI/Professional Tax amounts in code — component_type is a classification flag only, used by reports, not a calculation trigger).

No mermaid flow — this is static fixture registration, not a decision-driven process.

## Roles & Permissions

- The three statutory reports (Professional Tax Deductions, Provident Fund Deductions, Income Tax Deductions) are explicitly granted to **[[HR User]]**, **[[HR Manager]]**, and **[[Employee]]** via `add_custom_roles_for_reports()`.
- The custom fields themselves carry no field-level permission changes beyond standard doctype permissions; several are `print_hide: 1` (IFSC, MICR, PAN) so they don't leak onto printed documents by default.
