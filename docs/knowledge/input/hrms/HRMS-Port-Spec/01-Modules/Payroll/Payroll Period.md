# Payroll Period

**Source:** `hrms/payroll/doctype/payroll_period/payroll_period.json`, `payroll_period.py` (no `.js` file exists for this doctype — form uses default generated UI only)
**Submittable:** no   **Tree:** no   **Naming:** `autoname: "Prompt"` (user types the `name` directly on creation; no auto-generated series)
**Module:** Payroll

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| company | Company | Link | Company | Yes | — | No | in_list_view |
| start_date | Start Date | Date | — | Yes | — | No | |
| end_date | End Date | Date | — | Yes | — | No | |
| *(Section: Payroll Periods — `section_break_5`, hidden)* | | | | | | | |
| periods | Payroll Periods | Table | [[Payroll Period Date]] | No | — | No | see Child Tables; section is `hidden: 1` in the JSON (not shown by default in the standard form layout) |

## Child Tables

- `periods` (Table, options [[Payroll Period Date]]) — see `Payroll Period Date.md`. Its section (`section_break_5`) is marked `hidden: 1` in the doctype JSON, and **no controller code in `payroll_period.py` ever populates it** — there is no method in this repo that generates `Payroll Period Date` rows from `start_date`/`end_date` (e.g. splitting the period into monthly sub-periods). Port Note: this is a gap — the field exists in schema but the "period-date generation logic" a re-implementer might expect is **not present in this codebase**; if such rows are needed they must currently be entered manually by a user, or the generation logic was removed/never implemented in this version of HRMS.

## State Machine

Not submittable — no `docstatus` states beyond the implicit Draft(0)/Cancelled(2) that Frappe still exposes for any doctype, and no custom `status` field exists. No mermaid diagram applies (this doctype has no explicit workflow states).

## Validation Rules (exact, in execution order)

`validate()`:
1. `validate_from_to_dates("start_date", "end_date")` — Frappe framework helper: throws (framework-level message, not custom to this doctype) if `end_date < start_date`.
2. `validate_overlap()`:
   - IF `self.name` is falsy (new/unsaved doc), temporarily set `self.name = "New " + self.doctype` (a workaround so the subsequent `!=` self-exclusion comparison works before the real name is assigned).
   - Query all other `Payroll Period` records WHERE `name != self.name AND company == self.company AND (start_date BETWEEN self.start_date AND self.end_date OR end_date BETWEEN self.start_date AND self.end_date OR (start_date < self.start_date AND end_date > self.end_date))`.
   - IF any such overlapping record exists THEN `frappe.throw(msg)` where `msg` = `"A {doctype} exists between {start_date} and {end_date} ("` + a link to the conflicting record's form + `") for {company}"` (exact concatenation, includes an HTML `<a>` link to `/app/Form/Payroll Period/{overlap_doc.name}`).

## Business Logic / Calculations

### Module-level helper functions (not doc methods, but tightly coupled — used by `Salary Structure Assignment`, `Salary Slip`, tax/gratuity calculations elsewhere)

**`get_payroll_period_days(start_date, end_date, employee, company=None)`**
1. IF `company` not passed, resolve it from `Employee.company`.
2. Find the single `Payroll Period` for `company` WHERE `start_date <= given start_date AND end_date >= given start_date AND start_date <= given end_date AND end_date >= given end_date` (i.e. the queried date range must fall entirely within one Payroll Period record).
3. IF found: `actual_no_of_days = date_diff(period.end_date, period.start_date) + 1`; `working_days = actual_no_of_days`; IF `Payroll Settings.include_holidays_in_total_working_days` is falsy THEN subtract `len(get_holiday_dates_for_employee(employee, period.start_date, period.end_date))` from `working_days`.
4. Return `(period.name, working_days, actual_no_of_days)`.
5. IF no matching Payroll Period found, return `(False, False, False)`.

**`get_payroll_period(from_date, to_date, company)`** (decorated `@redis_cache()` — memoized):
1. Find the single `Payroll Period` for `company` WHERE `start_date <= from_date AND end_date >= to_date` (the requested range must fit inside the period).
2. Return the first match as a dict (`{name, start_date, end_date}`) or `None`.
3. Cache is cleared by `PayrollPeriod.clear_cache()` (overridden `clear_cache` doc method) whenever any Payroll Period document's cache is cleared (e.g. on save) — calls `get_payroll_period.clear_cache()` then `super().clear_cache()`.

**`get_period_factor(employee, start_date, end_date, payroll_frequency, payroll_period, depends_on_payment_days=0, joining_date=None, relieving_date=None)`** — computes the fraction of the annual/period tax-slab period a given salary-slip sub-period represents (used for prorating annual tax projections):
1. `period_start, period_end = payroll_period.start_date, payroll_period.end_date`.
2. IF `joining_date`/`relieving_date` not passed, fetch from cached `Employee` record.
3. IF `joining_date > period_start` THEN `period_start = joining_date` (employee didn't work the full period).
4. IF `relieving_date` is set AND `relieving_date < period_end` THEN `period_end = relieving_date`.
5. IF `payroll_frequency == "Monthly"` AND NOT `depends_on_payment_days`:
   - `total_sub_periods = get_exact_month_diff(payroll_period.end_date, payroll_period.start_date)`.
   - `remaining_sub_periods = get_exact_month_diff(period_end, start_date)`.
6. ELSE (non-monthly, or monthly-but-payment-days-dependent):
   - `salary_days = date_diff(end_date, start_date) + 1` (length of the current salary slip's sub-period in days).
   - `days_in_payroll_period = date_diff(payroll_period.end_date, payroll_period.start_date) + 1`.
   - `total_sub_periods = days_in_payroll_period / salary_days` (float division — how many "sub-periods" of this length fit in the whole payroll period).
   - `remaining_days_in_payroll_period = date_diff(period_end, start_date) + 1` (days from the sub-period start to the effective period end, accounting for joining/relieving clipping).
   - `remaining_sub_periods = remaining_days_in_payroll_period / salary_days`.
7. Return `(total_sub_periods, remaining_sub_periods)` — used by tax-projection code (in `Salary Slip`, out of scope here) to annualize/de-annualize income across the number of pay-runs remaining in the fiscal/payroll period.
8. Edge case explicitly left as a `# TODO` in source (not implemented): "if both deduct checked update the factor to make tax consistent" — a known incompleteness the original authors flagged but did not resolve; carry this forward as a known gap rather than inventing a fix.

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| `validate` | `validate_from_to_dates`, `validate_overlap` (see Validation Rules) | Reads other `Payroll Period` records for overlap check |
| `clear_cache` (framework cache-invalidation hook, not a document lifecycle event in the validate/submit sense — called by Frappe whenever this doctype's cache needs busting, e.g. after save) | Clears the `@redis_cache()`-memoized `get_payroll_period` function's cache, then calls `super().clear_cache()` | None directly, but any code relying on `get_payroll_period`'s cache (e.g. `Salary Structure Assignment`, tax calculations) will see fresh data afterward |

## Whitelisted / API Methods

None — no `@frappe.whitelist()` decorated methods in `payroll_period.py`.

## Permissions

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| System Manager | Yes | Yes | Yes | Yes | N/A (not submittable) | N/A | N/A | Yes | Yes | `email: 1`, `print: 1`, `share: 1` |
| Employee | Yes | No | No | No | N/A | N/A | N/A | Yes | Yes | read-only self-service visibility; `email`, `print`, `share: 1` |
| HR Manager | Yes | Yes | Yes | Yes | N/A | N/A | N/A | Yes | Yes | `email`, `print`, `share: 1` |
| HR User | Yes | Yes | Yes | Yes | N/A | N/A | N/A | Yes | Yes | `email`, `print`, `share: 1` |

## Scheduled Jobs Touching This Doctype

None found in `hrms/hooks.py` `scheduler_events`. (Payroll Period appears in the unrelated `company_data_to_be_ignored` list in `hooks.py`, which controls what gets wiped when a Company's transactional data is deleted — not a scheduled job.)

## Related Doctypes

- [[Payroll Period Date]] — unpopulated `periods` child table (schema shell only, no generation logic in this repo).
- [[Salary Structure Assignment]] — resolves its effective Payroll Period via `get_payroll_period()` to decide tax-projection behavior.
- [[Salary Slip]] — consumes `get_payroll_period_days()`/`get_period_factor()` for working-days and annualized-tax-projection calculations.
- [[Payroll Settings]] — `include_holidays_in_total_working_days` toggle changes how `get_payroll_period_days()` computes working days.

## Port Notes

- **`autoname: "Prompt"`**: the primary key/name is a free-text value the user types (e.g. "2025-2026"), not a generated code. A port should treat `name` as a required, user-supplied, presumably-unique string primary key (Frappe enforces name uniqueness per doctype automatically) rather than an auto-incrementing surrogate key alone — though a synthetic surrogate key plus a unique `name`/`title` column is also a reasonable relational mapping.
- **Overlap validation is company-scoped only**: two Payroll Periods for *different* companies may freely overlap in date range; the uniqueness/overlap constraint is `(company, date-range)`-scoped, not global.
- **No `Payroll Period Date` generation logic exists in this codebase** — despite the `periods` child table field being present in schema, nothing in `payroll_period.py` populates it, and its section is hidden by default. Do not invent generation logic (e.g. "split into 12 monthly rows") when porting; document the field as present-but-unused-by-current-controller-code, matching source exactly per the Ground Rules.
- **`@redis_cache()` on `get_payroll_period`**: a process/site-wide cache keyed by `(from_date, to_date, company)`. A port must implement an equivalent read-through cache (or accept the extra query cost) and must invalidate it whenever a Payroll Period is created/edited/deleted — the source ties this specifically to the doctype's `clear_cache()` hook, which Frappe calls on save; a port's ORM-level "after save" hook should call the equivalent cache-bust.
- **How `Salary Structure Assignment` references Payroll Period**: `salary_structure_assignment.py` calls `get_payroll_period(self.from_date, self.from_date, self.company)` and checks `if payroll_period and getdate(self.from_date) <= getdate(payroll_period.start_date)` — this determines whether a new Salary Structure Assignment's effective date sits at/before the start of its containing Payroll Period, used to decide tax-projection behavior (full detail belongs to `Salary Structure Assignment`, owned by another agent — referenced here by name only per the shared spec's cross-doctype-logic instruction).
