# Payroll Settings

**Source:** `hrms/payroll/doctype/payroll_settings/payroll_settings.json`, `payroll_settings.py` (a `.js` file exists at `hrms/payroll/doctype/payroll_settings/payroll_settings.js` but contains no business-rule logic beyond standard form scripting — not reproduced here per the spec's "check for logic beyond show/hide" instruction; none found)
**Submittable:** no   **Tree:** no   **Naming:** N/A — `issingle: 1` (Single doctype: exactly one record ever exists, conventionally addressed by doctype name itself, e.g. `frappe.get_single("Payroll Settings")` / `frappe.get_cached_doc("Payroll Settings")`)
**Module:** Payroll

## Schema

Every field, in JSON `field_order`. Section/Column Break fields are noted as group headers only.

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| *(Section: Working Days and Hours — `working_days_section`)* | | | | | | | |
| payroll_based_on | Calculate Payroll Working Days Based On | Select | Leave / Attendance | No | `Leave` | No | consumed in `Salary Slip.get_working_days_details` to decide whether payment-days calc is Leave-ledger-driven or Attendance-record-driven |
| consider_unmarked_attendance_as | Consider Unmarked Attendance As | Select | Present / Absent | No | — | No | `depends_on: eval:doc.payroll_based_on == 'Attendance'`; consumed in `Salary Slip` (defaults to `"Present"` at the point of use if blank: `payroll_settings.consider_unmarked_attendance_as or "Present"`) |
| include_holidays_in_total_working_days | Include holidays in Total no. of Working Days | Check | — | 0 | No | description: "If enabled, total no. of working days will include holidays, and this will reduce the value of Salary Per Day"; consumed in `Payroll Period.get_payroll_period_days` (subtracts holiday count from working days when this is falsy) and in `Salary Slip` working-days calc |
| consider_marked_attendance_on_holidays | Consider Marked Attendance on Holidays | Check | — | 0 | No | `depends_on: include_holidays_in_total_working_days`; description: "If enabled, deducts payment days for absent attendance on holidays. By default, holidays are considered as paid"; consumed in `Salary Slip.get_working_days_details` / `get_half_absent_days` |
| *(Column Break — `column_break_6`)* | | | | | | | |
| max_working_hours_against_timesheet | Max working hours against Timesheet | Float | — | No | non_negative | No | consumed in `Salary Slip.set_salary_structure_assignment`/validate flow: if `salary_slip_based_on_timesheet` and `total_working_hours > max_working_hours`, shows a non-blocking alert msgprint ("Total working hours should not be greater than max working hours {0}") — **advisory only, does not block save/submit** |
| daily_wages_fraction_for_half_day | Fraction of Daily Salary for Half Day | Float | — | 0.5 default | No | non_negative; description: "The fraction of daily wages to be paid for half-day attendance"; consumed throughout `Salary Slip` half-day payment-days/LWP calculations; `PayrollSettings.validate()` re-defaults it to `0.5` if falsy on every save |
| *(Column Break — `column_break_rnoq`, labeled "Salary Slip")* | | | | | | | |
| disable_rounded_total | (no explicit label field entry beyond `column_break_rnoq` acting as section label "Salary Slip"; the actual checkbox is below) | — | — | — | — | — | see next row — the JSON lists `disable_rounded_total` fields separately |
| disable_rounded_total | Disable Rounded Total | Check | — | 0 | No | description: "If checked, hides and disables Rounded Total field in Salary Slips"; consumed via `Salary Slip.is_rounding_total_disabled()` (`cint(frappe.db.get_single_value("Payroll Settings", "disable_rounded_total"))`), and `PayrollSettings.on_update() -> toggle_rounded_total()` applies/removes a Property Setter making `Salary Slip.rounded_total` `hidden`/`print_hide` accordingly |
| *(Column Break — `column_break_gzpl`)* | | | | | | | |
| show_leave_balances_in_salary_slip | Show Leave Balances in Salary Slip | Check | — | 0 | No | consumed in `Salary Slip` — if enabled, leave balances are rendered on the salary slip (via `Payroll Entry.get_employees_with_unmarked_attendance`-adjacent code path is unrelated; actual consumer is `Salary Slip`'s own leave-balance-fetch logic at the cited line) |
| *(Section: Email — `email_section`)* | | | | | | | |
| email_salary_slip_to_employee | Email Salary Slip to Employee | Check | — | 1 (default checked) | No | description: "Emails salary slip to employee based on preferred email selected in Employee"; consumed in `Salary Slip.on_submit` (auto-emails on submit unless `frappe.flags.via_payroll_entry` or `frappe.flags.in_patch`) and in `Payroll Entry.email_salary_slip` (bulk-email path used after `submit_salary_slips_for_employees`) |
| sender | Sender | Link | Email Account | No | — | No | `depends_on: eval:doc.email_salary_slip_to_employee`; the outgoing email account used when emailing salary slips |
| sender_copy | Sender Copy | Link | Email Account | No | — | No | `depends_on: eval:doc.email_salary_slip_to_employee`; an additional account to CC/copy on salary-slip emails |
| sender_email | Sender Email | Data | — | No | — | Yes | `fetch_from: sender.email_id`; `depends_on: eval:doc.sender` |
| email_template | Email Template | Link | Email Template | No | — | No | `depends_on: eval:doc.email_salary_slip_to_employee`; consumed in `Salary Slip.email_salary_slip()` — if set, renders the template's `subject`/`response` with the salary slip as Jinja context instead of the hardcoded default subject/message |
| *(Column Break — `column_break_iewr`)* | | | | | | | |
| encrypt_salary_slips_in_emails | Encrypt Salary Slips in Emails | Check | — | 0 | No | `depends_on: eval:doc.email_salary_slip_to_employee == 1`; description: "The salary slip emailed to the employee will be password protected, the password will be generated based on the password policy"; consumed in `Salary Slip.email_salary_slip()` — if set, calls `generate_password_for_pdf(password_policy, employee)` to derive a PDF password, appends a note about the password format to the email body when no custom `email_template` is set |
| password_policy | Password Policy | Data | — | Conditionally required — `PayrollSettings.validate_password_policy()` throws `"Password policy for Salary Slips is not set"` if `email_salary_slip_to_employee AND encrypt_salary_slips_in_emails` are both true and this is blank | — | No | `depends_on: eval:doc.encrypt_salary_slips_in_emails == 1`; description/example: "SAL-{first_name}-{date_of_birth.year} → SAL-Jane-1972"; in_list_view |
| *(Section: Other Settings — `other_settings_section`)* | | | | | | | |
| process_payroll_accounting_entry_based_on_employee | Process Payroll Accounting Entry based on Employee | Check | — | 0 | No | description: "If checked, Payroll Payable will be booked against each employee"; consumed in `Payroll Entry.make_accrual_jv_entry` and `Payroll Entry.make_bank_entry` to switch between aggregate vs. per-employee GL posting (see `Payroll Entry.md` Business Logic §7) |
| mandatory_benefit_application | Mandatory Benefit Application | Check | — | 0 | No | description: "If checked, flexible benefits are considered only if benefit application exists"; consumed in `Salary Slip` flexible-benefit calculation (line ~2508-2520: gates whether flexible-benefit salary components are included absent an approved Employee Benefit Application) |
| *(Column Break — `column_break_zi9y`)* | | | | | | | |
| create_overtime_slip | Create Overtime Slip For Eligible Employee(s) | Check | — | 0 | No | description: "If checked, overtime slip creation can be handled as part of payroll processing"; consumed in `Payroll Entry.get_overtime_slip_details()` — gates whether the "Create/Submit Overtime Slips" step appears in the Payroll Entry workflow at all |

## Child Tables

None — Payroll Settings has no Table fields.

## State Machine

N/A — Single doctype, not submittable, no status field. Only ever exists in one implicit "configured" state; `on_update()` runs on every save.

## Validation Rules (exact, in execution order)

`validate()`:
1. `validate_password_policy()`: IF `self.email_salary_slip_to_employee` is truthy AND `self.encrypt_salary_slips_in_emails` is truthy AND `self.password_policy` is falsy THEN `frappe.throw(_("Password policy for Salary Slips is not set"))` (source: `validate_password_policy`).
2. IF `self.daily_wages_fraction_for_half_day` is falsy (0, None, or blank) THEN `self.daily_wages_fraction_for_half_day = 0.5` (silent correction, not a throw — source: `validate`).

## Business Logic / Calculations

No numeric computation happens inside this doctype's own controller beyond the default-correction in Validation Rule 2 above. Payroll Settings functions purely as a configuration source consumed by other doctypes' controllers (see the "Notes" column of the Schema table above for every consumption site found via repository-wide search). Summary of consumers by field:

| Setting | Consumed in | Effect |
|---|---|---|
| `payroll_based_on` | `Salary Slip.py` (working-days calc, ~line 596-631) | Chooses Leave-ledger vs. Attendance-record basis for payment-days calculation |
| `consider_unmarked_attendance_as` | `Salary Slip.py` (~line 629-643) | Default treatment ("Present"/"Absent") for days with no Attendance record, when `payroll_based_on == "Attendance"` |
| `include_holidays_in_total_working_days` | `Payroll Period.get_payroll_period_days`; `Salary Slip.py` working-days calc | Whether holidays count toward paid working days |
| `consider_marked_attendance_on_holidays` | `Salary Slip.py` (`get_half_absent_days`, LWP calc, ~lines 566-880) | Whether an explicit Absent/Half-Day attendance record marked ON a holiday still reduces payment days |
| `max_working_hours_against_timesheet` | `Salary Slip.py` (~line 256-266) | Advisory (non-blocking) warning when timesheet-based total working hours exceed this cap |
| `daily_wages_fraction_for_half_day` | `Salary Slip.py` (multiple half-day/LWP calc sites) | Fraction of a day's wage paid for half-day attendance/leave |
| `disable_rounded_total` | `Salary Slip.is_rounding_total_disabled()`; `PayrollSettings.toggle_rounded_total()` | Hides/disables the `rounded_total` field on Salary Slip (via Property Setter) and changes which total (`net_pay` vs `rounded_total`) is used in words-conversion (`set_net_total_in_words`) |
| `show_leave_balances_in_salary_slip` | `Salary Slip.py` (~line 2481) | Whether leave balances render on the payslip |
| `email_salary_slip_to_employee` | `Salary Slip.on_submit`; `Payroll Entry.email_salary_slip` | Whether salary slips are auto-emailed on submit / bulk-submit |
| `sender`, `sender_copy`, `sender_email` | Salary-slip email sending (delegated to Frappe's email-queue via `Salary Slip.email_salary_slip`, which is outside this doctype's file — referenced by name only) | Which Email Account sends/copies the salary-slip email |
| `email_template` | `Salary Slip.email_salary_slip()` | Custom subject/body template (Jinja-rendered against the slip) instead of hardcoded default |
| `encrypt_salary_slips_in_emails`, `password_policy` | `Salary Slip.email_salary_slip()` | PDF password-protection of the emailed slip; password derived from the policy pattern and the employee's data |
| `process_payroll_accounting_entry_based_on_employee` | `Payroll Entry.make_accrual_jv_entry`, `Payroll Entry.make_bank_entry` | Aggregate vs. per-employee GL posting for payroll payable |
| `mandatory_benefit_application` | `Salary Slip.py` (~line 2508-2520) | Flexible-benefit components only apply if an approved Employee Benefit Application exists |
| `create_overtime_slip` | `Payroll Entry.get_overtime_slip_details()` | Enables the overtime-slip creation/submission step in the Payroll Entry flow |

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| `validate` | `validate_password_policy()`; default-correct `daily_wages_fraction_for_half_day` to 0.5 if falsy | None |
| `on_update` | `toggle_rounded_total()`; `frappe.clear_cache()` | `toggle_rounded_total()` creates/updates two Property Setters on `Salary Slip.rounded_total` (`hidden` and `print_hide`, both set to `cint(self.disable_rounded_total)`) via `make_property_setter(..., validate_fields_for_doctype=False)`. `frappe.clear_cache()` busts the site-wide document/metadata cache (affects every doctype's cached metadata and any `@redis_cache()`/`get_cached_doc`/`get_single_value` consumers of Payroll Settings itself, forcing them to re-read fresh values on next access). |

## Whitelisted / API Methods

None — no `@frappe.whitelist()` decorated methods in `payroll_settings.py`.

## Permissions

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| System Manager | Yes | Yes | Yes | N/A (Single doctypes have no delete in the conventional sense; `delete` not listed) | N/A | N/A | N/A | (not listed) | (not listed) | `email: 1`, `print: 1`, `share: 1` |
| HR Manager | Yes | Yes | (not listed — `create` absent, consistent with Single doctype semantics where only one record ever exists) | No | N/A | N/A | N/A | (not listed) | (not listed) | Only `read`/`write` granted |

## Scheduled Jobs Touching This Doctype

None found in `hrms/hooks.py` `scheduler_events` that write to Payroll Settings. It is read (not scheduled-job-triggered) on-demand by the consumers listed above.

## Related Doctypes

- [[Salary Slip]] — the primary consumer of nearly every setting here (working-days basis, half-day fraction, rounding, email, flexible-benefit gating).
- [[Payroll Entry]] — reads `process_payroll_accounting_entry_based_on_employee` for GL posting mode and `create_overtime_slip` to gate the overtime-slip step.
- [[Payroll Period]] — `include_holidays_in_total_working_days` affects `get_payroll_period_days()`.
- [[Employee Benefit Application]] — `mandatory_benefit_application` gates whether flexible-benefit components apply without an approved application.

## Port Notes

- **Single doctype semantics**: Frappe's "Single" doctype pattern means there is exactly one row for this "table" ever, conventionally with no primary key beyond the fixed doctype name. A port should model this as either (a) a table with a single fixed-id row (e.g. `id=1`), or (b) a dedicated key-value settings table/config service — but must preserve the "exactly one record system-wide, no per-company/per-tenant variation" semantic, since nothing in the source scopes these settings by Company.
- **`frappe.clear_cache()` on every save**: this is a heavy, site-wide cache invalidation (clears all cached doctype metadata, not just Payroll Settings) — a port does not need to replicate this exact blast radius, but must ensure that *every* consumer reading via `get_single_value`/`get_cached_doc`/`frappe.get_single` picks up new values promptly after a Payroll Settings save (i.e. avoid a stale long-lived cache with no invalidation hook on settings update).
- **Property Setter side effect (`toggle_rounded_total`)**: this is a schema-level UI customization mechanism unique to Frappe (dynamically hides a field on another doctype's form). A port has no direct equivalent; the practical requirement to replicate is: *when `disable_rounded_total` is enabled, the Salary Slip UI/API must stop exposing/requiring the `rounded_total` field*, implemented however fits the target stack's UI-metadata system (e.g. a computed API flag, a feature-toggle read by the frontend).
- **`max_working_hours_against_timesheet` is advisory only**: source uses `frappe.msgprint(..., alert=True)`, which does not block save or submission — a port must not turn this into a hard validation error, as that would be a behavior change from source.
- **Default value note**: `email_salary_slip_to_employee` defaults to `1` (checked) — a fresh install will auto-email salary slips unless explicitly disabled; a port's seed/migration data must set this default explicitly to match out-of-the-box behavior.
- **No field-level precision override** is declared on the Float fields (`max_working_hours_against_timesheet`, `daily_wages_fraction_for_half_day`) — they use whatever the site's default float precision is (Frappe's system default, not overridden here); a port should apply its own default decimal precision policy consistently rather than inventing a specific precision for these two fields.
