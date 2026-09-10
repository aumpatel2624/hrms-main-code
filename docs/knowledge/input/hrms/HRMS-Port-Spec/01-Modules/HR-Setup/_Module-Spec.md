# HR Setup — Module Spec

## Purpose

HR Setup holds the small, module-wide configuration and master/lookup doctypes that other HR doctypes depend on: a single global settings record (`HR Settings`) governing naming rules, approval-mandatory toggles, reminder schedules, and exit/hiring workflow templates; plus two simple named-lookup masters (`Employment Type`, `Employee Grade`) used as `Link` targets from `Employee` and Payroll doctypes. `Branch` and `Company` are core ERPNext doctypes (not part of this app) and are not documented as full doctype files here — see "Port Notes: Company Hook Behavior" below for the HRMS-specific behavior this app bolts onto `Company` via `hrms/overrides/company.py`.

## Doctype List

| Doctype | Purpose |
|---|---|
| `HR Settings` | Site-wide singleton controlling Employee naming, leave/expense approval-mandatory flags, self-approval prevention, reminder schedules and templates, shift/attendance defaults, exit questionnaire config, and hiring/interview reminder config. — see [[HR Settings]] |
| `Employment Type` | Named lookup: employment categories (Full-time, Contract, etc.), linked from `Employee`. — see [[Employment Type]] |
| `Employee Grade` | Named lookup: employee grade/band, optionally carrying a default Salary Structure and base pay for pre-filling Employee/Payroll assignment. Documented under HR-Core, not this folder — see [[Employee Grade]] |

Not covered here (core ERPNext, no doctype JSON in this app): `Company`, `Branch`. Not covered here (owned by other agents, referenced by name only): `Employee` (HR-Core, see [[Employee Core Model]]), `Salary Structure`/`Salary Structure Assignment` (Payroll, see [[Salary Structure]] / [[Salary Structure Assignment]]).

## Recommended Target Schema Shape

```
hr_settings (                      -- singleton: one row per tenant/company scope
  id PK,
  emp_created_by ENUM('Naming Series','Employee Number','Full Name') DEFAULT 'Naming Series',
  standard_working_hours DECIMAL,
  retirement_age VARCHAR,
  send_holiday_reminders BOOLEAN DEFAULT true,
  send_work_anniversary_reminders BOOLEAN DEFAULT true,
  send_birthday_reminders BOOLEAN DEFAULT true,
  reminder_frequency ENUM('Weekly','Monthly') DEFAULT 'Weekly',
  sender_email_account_id FK NULL,
  hiring_sender_email_account_id FK NULL,
  auto_leave_encashment BOOLEAN DEFAULT false,
  leave_approver_mandatory BOOLEAN DEFAULT true,
  prevent_self_leave_approval BOOLEAN DEFAULT false,
  show_leaves_of_all_department_members_in_calendar BOOLEAN DEFAULT false,
  send_leave_notification BOOLEAN DEFAULT true,
  leave_approval_notification_template_id FK NULL,
  leave_status_notification_template_id FK NULL,
  restrict_backdated_leave_application BOOLEAN DEFAULT false,
  role_allowed_to_create_backdated_leave_application_id FK NULL,
  expense_approver_mandatory BOOLEAN DEFAULT true,
  prevent_self_expense_approval BOOLEAN DEFAULT false,
  allow_multiple_shift_assignments BOOLEAN DEFAULT false,
  allow_employee_checkin_from_mobile_app BOOLEAN DEFAULT true,
  allow_geolocation_tracking BOOLEAN DEFAULT false,
  unlink_payment_on_cancellation_of_employee_advance BOOLEAN DEFAULT false,
  exit_questionnaire_web_form_id FK NULL,
  exit_questionnaire_notification_template_id FK NULL,
  check_vacancies_on_job_offer BOOLEAN DEFAULT false,
  send_interview_reminder BOOLEAN DEFAULT false,
  interview_reminder_template_id FK NULL,
  remind_before TIME DEFAULT '00:15:00',
  send_interview_feedback_reminder BOOLEAN DEFAULT false,
  feedback_reminder_notification_template_id FK NULL
)

employment_type (
  id PK,                 -- or use employee_type_name itself as the natural PK
  employee_type_name UNIQUE NOT NULL
)

employee_grade (
  id PK,                  -- or the user-entered grade code/name as natural PK (autoname: Prompt)
  default_salary_structure_id FK -> salary_structure NULL,
  currency_id FK -> currency NULL,     -- derived, keep read-only / recompute on structure change
  default_base_pay DECIMAL
)
```

No child tables in this module; all three doctypes are flat/standalone with no owned rows.

## Port Notes: Company Hook Behavior (`hrms/overrides/company.py`)

`Company` and `Branch` are core ERPNext doctypes with no JSON schema in this app to source from. This app instead attaches behavior to `Company` via `hrms/hooks.py` `doc_events` (see [[Cross-Doctype Hooks (doc_events)]]):

```
"Company": {
    "validate": "hrms.overrides.company.validate_default_accounts",
    "on_update": [
        "hrms.overrides.company.make_company_fixtures",
        "hrms.overrides.company.set_default_hr_accounts",
    ],
    "on_trash": "hrms.overrides.company.handle_linked_docs",
}
```

### `validate_default_accounts(doc, method=None)` — Company `validate`
1. IF `doc.default_payroll_payable_account` is set:
   a. Fetch that Account's `company`; IF it does not equal `doc.name` (the Company being saved) THEN throw `"Account {0} does not belong to company: {1}"`.
   b. IF the account's currency (`get_account_currency`) does not equal `doc.default_currency` THEN throw `"The currency of {0} should be same as the company's default currency. Please select another account."` (referring to the field label "Default Payroll Payable Account").

### `make_company_fixtures(doc, method=None)` — Company `on_update`
1. IF `frappe.flags.country_change` is NOT set, return immediately (this only runs when the Company's `country` field is being changed/set, e.g. first-time setup or a deliberate country switch).
2. `run_regional_setup(doc.country)`:
   - Attempts to import and call `hrms.regional.<scrubbed country name>.setup.setup()`. IF that module doesn't exist (`ImportError`), silently no-ops (most countries have no regional fixtures). IF the call raises any OTHER exception, logs an error and throws a user-facing `"Failed to setup defaults for country {0}."` message with the underlying error appended.
3. `make_salary_components(doc.country)`:
   a. IF the "Basic" Salary Component does NOT already exist anywhere (global check, not company-scoped): load and stage default salary components from `hrms/payroll/data/salary_components.json`.
   b. ALSO load country-specific salary components from `hrms/regional/<scrubbed country>/data/salary_components.json` (missing file resolves to `"{}"`, i.e. no-op).
   c. For each staged doc: insert with `ignore_if_duplicate=True`, `ignore_permissions=True`, `ignore_mandatory=True`; log (not throw) on any per-doc failure, continue to the next; clear queued messages after each attempt so failures don't bubble up as user-facing errors.

### `set_default_hr_accounts(doc, method=None)` — Company `on_update`
1. IF `frappe.local.flags.ignore_chart_of_accounts` is set, return immediately (used during bulk/company-creation flows that skip account auto-wiring).
2. IF `doc.default_payroll_payable_account` is empty: look up an Account named `_("Payroll Payable")` (translated label) under this company that is not a group account, and `db_set` it onto `default_payroll_payable_account` if found.
3. IF `doc.default_employee_advance_account` is empty: same pattern, looking up an Account named `_("Employee Advances")`, `db_set` onto `default_employee_advance_account`.

### `handle_linked_docs(doc, method=None)` — Company `on_trash`
Runs two cleanup steps when a Company is deleted:
1. `delete_docs_with_company_field(doc)`: for every doctype listed in the `company_data_to_be_ignored` hook list (`hrms/hooks.py`: `Salary Component Account`, [[Salary Structure]], [[Salary Structure Assignment]], [[Payroll Period]], [[Income Tax Slab]], [[Leave Period]], [[Leave Policy Assignment]], [[Employee Onboarding Template]], [[Employee Separation Template]]), find all records where `company == doc.name` and hard-delete them directly via `frappe.db.delete` (bypasses normal delete validation/hooks on those doctypes entirely).
2. `clear_company_field_for_single_doctypes(doc)`: finds every Single doctype (`issingle=1`) in modules `HR` or `Payroll` that has a `Link` field pointing at `Company`, and blanks out that field's stored value (in Frappe's `Singles` key-value table) wherever it currently equals the deleted company's name — e.g. this is how `HR Settings`-like singletons in the `Payroll` module (not `HR Settings` itself, which has no `company` field) get their dangling Company reference cleared instead of raising a broken-link error.

**Port Notes:**
- These four functions are the ONLY HRMS-specific logic attached to core ERPNext's `Company` doctype; everything else about `Company` (its own full schema, chart-of-accounts creation, etc.) belongs to ERPNext core and is out of scope for this HRMS-only port spec.
- `delete_docs_with_company_field` performs a raw bulk SQL-level delete with `ignore permissions/hooks` bypassed — a port must decide whether cascading company deletion should really skip child-record lifecycle hooks (e.g. does deleting a `Salary Structure Assignment` this way leave orphaned references elsewhere?) or whether this is a latent risk in the source worth flagging (it is: hard-deleting `Salary Structure`/`Salary Structure Assignment` etc. without going through their own `on_trash` could leave dangling FKs in tables not listed in `company_data_to_be_ignored`).
- `make_company_fixtures`'s "Basic" Salary Component existence check is GLOBAL (not company-scoped) — in a genuinely multi-company single-database install, the base salary components are seeded once, the first time any company sets a country, not once per company. A port must replicate this "seed once globally, then per-company regional add-ons" split intentionally, not assume it's per-company.
- Regional/country-specific setup (`hrms.regional.<country>.setup.setup`) and salary component JSON fixtures are file-system-driven fixture loaders specific to this Python app's package layout — a port needs its own equivalent seed-data mechanism (e.g. versioned seed migrations per country) rather than dynamic module imports.

## Module-Wide Invariants

1. `HR Settings` is a true singleton — exactly one row must exist per tenant scope; there is no create/delete lifecycle for it beyond initial provisioning.
2. `Employment Type.employee_type_name` and `Employee Grade`'s name (user-prompted) must each be unique — both are used as natural-key `Link` targets from `Employee` and Payroll doctypes, so renames must cascade to every referencing record if the port preserves name-as-identity semantics, or must instead use a surrogate key with a separate unique display-name column.
3. `Employee Grade.currency` is always derived from `default_salary_structure.currency` and must never be independently editable — treat it as a computed/cached column, recomputed whenever the linked Salary Structure (or that structure's currency) changes.
4. Any new stack must decide explicitly where `HR Settings.expense_approver_mandatory_in_expense_claim` and `emp_created_by` are ENFORCED — in the source they only take effect via client-side JS branching (`Expense Claim` approver required-ness) or ERPNext-core meta-programming (`Employee` naming rule), neither of which exists by default in a from-scratch port; both must be reimplemented as explicit server-side logic (see [[Expense Claim]] Port Notes and `HR Settings.md` Business Logic #1).
