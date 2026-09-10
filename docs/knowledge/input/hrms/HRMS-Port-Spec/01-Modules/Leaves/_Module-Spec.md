# Leaves — Module Spec

## Purpose

The Leaves module governs how employees earn, request, consume, expire, and cash out
paid/unpaid time off. It defines the taxonomy of leave types (`Leave Type`), the
policies that determine how much of each type an employee gets (`Leave Policy`,
`Leave Policy Detail`, `Leave Policy Assignment`), the periods those policies apply
to (`Leave Period`), the actual per-employee grants of days (`Leave Allocation`,
`Earned Leave Schedule`, `Leave Adjustment`), the employee-facing request/approval
workflow (`Leave Application`), the immutable audit trail of every balance-affecting
event (`Leave Ledger Entry`), monetary payout of unused days (`Leave Encashment`),
requesting compensatory time off for holiday/weekend work (`Compensatory Leave
Request`), bulk-admin tooling (`Leave Control Panel`), calendar-wide leave blocking
(`Leave Block List`, `Leave Block List Date`, `Leave Block List Allow`), and the
assignment of a company/employee-specific holiday calendar (`Holiday List
Assignment`). The module leans on two external ERPNext core doctypes it doesn't
own — `Holiday List` and `Holiday` — purely as read dependencies.

## Doctype List

| Doctype | Purpose |
|---|---|
| [[Leave Type]] | Defines a category of leave (e.g. Casual, Sick, Earned) and its rules: paid/unpaid, encashable, carry-forward, earned-leave accrual settings, max consecutive/applicable-after/applicable-before constraints. |
| [[Leave Period]] | A named date range (e.g. a fiscal year) that leave policies and allocations can be scoped to. |
| [[Leave Policy]] | A named bundle of `Leave Policy Detail` rows, each pairing a `Leave Type` with an annual allocation count. |
| [[Leave Policy Detail]] | Child table row: one (Leave Type, annual_allocation) pair inside a `Leave Policy`. |
| [[Leave Policy Assignment]] | Assigns a `Leave Policy` to an employee for a period (or from joining date), and is the trigger that creates the actual `Leave Allocation` record(s), including pro-rated/earned-leave setup. |
| [[Leave Control Panel]] | Single (non-data-storing) doctype used as an admin bulk-action UI: create Leave Allocations or Leave Policy Assignments for many employees/departments at once. |
| [[Leave Allocation]] | The actual per-employee, per-leave-type, per-period grant of N days, submittable, with carry-forward, expiry, and earned-leave-schedule support. |
| [[Earned Leave Schedule]] | Child table of `Leave Allocation`; one row per scheduled earned-leave credit event (a date + number of leaves + whether it has been "attempted" by the scheduler). |
| [[Leave Adjustment]] | A standalone submittable doctype that manually adds/deducts leave days against an existing `Leave Allocation`, writing a `Leave Ledger Entry`. |
| [[Compensatory Leave Request]] | Employee-submitted request to convert a worked holiday/weekend day into extra leave balance; on approval, adds days to (or creates) a `Leave Allocation`. |
| [[Leave Application]] | The core submittable leave request: employee picks a `Leave Type` and date range, balance/overlap/block-list validations run, and on submit/approval it writes `Leave Ledger Entry` rows and (if half-pay) affects payroll via `Leave Type` linkage. |
| [[Leave Encashment]] | Submittable payout-in-lieu-of-leave record; created manually or by the daily scheduler for expiring allocations of encashable leave types. |
| [[Leave Ledger Entry]] | Append-only (mostly) internal ledger: every allocation, application, adjustment, encashment, and expiry event writes a signed `leaves` delta row here; balance = SUM(leaves) as-of a date. |
| [[Leave Block List]] | Names a set of blocked dates (optionally auto-populated from weekly offs) that certain roles cannot apply leave against, with an "allow list" of roles exempted. |
| [[Leave Block List Date]] | Child table of `Leave Block List`: one blocked calendar date + reason. |
| [[Leave Block List Allow]] | Child table of `Leave Block List`: one role exempted from that block list. |
| [[Holiday List Assignment]] | Submittable record assigning a `Holiday List` (external/core doctype) to an employee or company for a `from_date` onward, used to resolve which holiday calendar applies to a given employee on a given date. |

## External Dependencies (not in this repo)

**`Holiday List`** and **`Holiday`** are core ERPNext doctypes (module: Setup),
not part of the HRMS app. They are read-only dependencies for this module:

- `Holiday List` — minimal expected shape: `name`, `from_date`, `to_date`,
  `total_holidays` (computed count), `company` (optional link), and a child table
  `holidays` of `Holiday` rows. Used by `Leave Application` (to exclude holidays
  from leave-day counts) and by `Holiday List Assignment` (as the assigned
  calendar).
- `Holiday` — child-table-only doctype (rows always live inside a `Holiday List`).
  Minimal expected shape: `holiday_date` (date), `description` (string label,
  e.g. "New Year's Day"), `weekly_off` (checkbox — 1 if this row exists because
  it's a recurring weekly off rather than a named holiday).
- A port must reproduce at minimum: a table of (holiday_list_id, holiday_date,
  description, weekly_off) rows and a table of (holiday_list_id, from_date,
  to_date, company) so that `get_holiday_dates_between(holiday_list, start, end)`
  style range queries (used throughout Leave Application's day-counting) and
  `get_holiday_list_for_employee`/`get_assigned_holiday_list` (used by Holiday
  List Assignment resolution, see `hrms/utils/holiday_list.py`) can be
  implemented identically.

## Recommended Target Schema Shape

Relational modeling for a generic RDBMS (Postgres/MySQL), owned tables only
(FK-owned child rows are noted as "owned by parent", true many-to-many/reference
tables noted separately):

```
leave_type
  id (pk), name, max_leaves_allowed, max_continuous_days_allowed,
  applicable_after (int days), max_carry_forwarded_leaves,
  is_carry_forward (bool), is_lwp (bool), is_ppl (bool, partial-pay leave),
  fraction_of_daily_salary_per_leave (float), is_optional_leave (bool),
  allow_negative (bool), is_compensatory (bool), maximum_carry_forwarded_leaves,
  expire_carry_forwarded_leaves_after_days (int), include_holiday (bool),
  is_earned_leave (bool), earned_leave_frequency (enum), rounding (enum),
  max_leaves_from_earned_leave (float), allow_over_allocation (bool),
  allow_encashment (bool), encashment_threshold_days, earning_component (link->
  Salary Component, optional), allow_negative_encashment_days? (bool),
  allocate_on_day (enum), ... (see Leave Type.md for full field list)

leave_period
  id (pk), name, from_date, to_date, is_active (bool), company (fk->company)

leave_policy
  id (pk), name, effective_from (may not exist — see Leave Policy.md), company

leave_policy_detail   -- OWNED child table of leave_policy
  id (pk), leave_policy_id (fk, not null), idx,
  leave_type_id (fk -> leave_type), annual_allocation (float)

leave_policy_assignment
  id (pk), employee_id (fk), leave_policy_id (fk), assignment_based_on (enum:
  "Leave Period" | "Joining Date"), leave_period_id (fk, nullable),
  effective_from (date), effective_to (date), carry_forward (bool),
  leaves_allocated (bool, idempotency flag), docstatus, amended_from (fk, self)

leave_allocation
  id (pk), employee_id (fk), leave_type_id (fk), leave_period_id (fk, nullable),
  leave_policy_id (fk, nullable), leave_policy_assignment_id (fk, nullable),
  from_date, to_date, new_leaves_allocated (float),
  carry_forwarded_leaves_count (float), total_leaves_allocated (float,
  computed = new + carried), unused_leaves (float, set on expiry),
  compensatory_leave_request_id (fk, nullable), docstatus, amended_from (fk, self)

earned_leave_schedule   -- OWNED child table of leave_allocation
  id (pk), leave_allocation_id (fk, not null), idx,
  allocation_date (date), number_of_leaves (float), attempted (bool)

leave_adjustment
  id (pk), employee_id (fk), leave_type_id (fk), leave_allocation_id (fk),
  leaves (float, signed), reason (text), docstatus, amended_from (fk, self)

compensatory_leave_request
  id (pk), employee_id (fk), leave_type_id (fk), work_from_date, work_end_date,
  reason (enum), half_day (bool), half_day_date (date, nullable),
  leave_allocation_id (fk, nullable, set on approval), docstatus,
  amended_from (fk, self)

leave_application
  id (pk), employee_id (fk), leave_type_id (fk), from_date, to_date,
  half_day (bool), half_day_date (date, nullable), total_leave_days (float),
  description (text), leave_approver (fk -> user, nullable),
  leave_approver_name (denorm), status (enum: Open|Approved|Rejected|Cancelled),
  docstatus, leave_balance (float, snapshot), posting_date, follow_via_email (bool),
  color (string), salary_slip_id (fk, nullable), amended_from (fk, self)

leave_encashment
  id (pk), employee_id (fk), leave_type_id (fk), leave_period_id (fk),
  leave_allocation_id (fk), encashment_date, currency, exchange_rate,
  encashment_amount (float), pay_via_payment_entry / additional_salary linkage,
  status (enum: Draft|Payment Awaited|Paid — see Leave Encashment.md for exact
  enum), docstatus, amended_from (fk, self), company (fk), + inherited
  AccountsController fields (cost_center, GL/accounting-dimension fields) if the
  port keeps the encashment→accounting linkage

leave_ledger_entry
  id (pk, append-only), employee_id (fk), leave_type_id (fk),
  transaction_type (enum: Leave Allocation|Leave Encashment|Leave Application|
  Leave Adjustment), transaction_name (polymorphic fk — string + type, NOT a
  clean FK; a port should model this as (transaction_doctype, transaction_id)),
  leaves (float, signed delta), from_date, to_date, is_carry_forward (bool),
  is_expired (bool), is_lwp (bool), holiday_list (string ref), company (fk),
  docstatus (mirrors source transaction's docstatus — 0/1/2)

leave_block_list
  id (pk), name (label), applies_to_all_departments? / block-scope fields,
  allow_negative_balance? (n/a here — see Leave Block List.md)

leave_block_list_date   -- OWNED child table of leave_block_list
  id (pk), leave_block_list_id (fk, not null), idx, block_date, reason

leave_block_list_allow   -- OWNED child table of leave_block_list
  id (pk), leave_block_list_id (fk, not null), idx, role (fk -> role)

holiday_list_assignment
  id (pk), assigned_to (polymorphic: Employee or Company — model as
  (assigned_to_type, assigned_to_id) in a port, or split into two nullable FKs),
  holiday_list_id (fk -> holiday_list, external table), from_date, docstatus,
  amended_from (fk, self)
```

Notes on the schema:
- `leave_policy_detail`, `earned_leave_schedule`, `leave_block_list_date`, and
  `leave_block_list_allow` are true owned child rows (Frappe "Table" fieldtype) —
  they have no independent lifecycle outside their parent and should cascade-delete
  with it.
- `leave_ledger_entry.transaction_name` is Frappe's generic Dynamic Link pattern
  (`transaction_type` + `transaction_name`) pointing at whichever doctype created
  the entry. A relational port should use a discriminator column pair rather than
  a single polymorphic FK, or maintain per-source-type nullable FK columns.
- `docstatus` (0=Draft, 1=Submitted, 2=Cancelled) is a Frappe-framework convention
  underlying every submittable doctype in this module (`Leave Allocation`,
  `Leave Application`, `Leave Encashment`, `Leave Adjustment`, `Compensatory Leave
  Request`, `Leave Policy Assignment`, `Holiday List Assignment`) — it must be
  modeled explicitly as an integer/enum column plus application-level guards
  (submitted/cancelled records become immutable except for a small whitelist of
  fields updated via `db_set`) since a generic ORM won't provide this for free.
  See individual doctype files' "Port Notes" for exactly which fields are exempt.
- `amended_from` (self-referencing FK, nullable) exists on every submittable
  doctype per Frappe convention (a cancelled document can be "amended" into a new
  draft copy that references the original) — several doctypes in this module grant
  no role `amend` permission despite having the field (see per-doctype Port Notes
  for oversights flagged).

## Module-Wide Invariants

1. **Leave balance is a materialized-view-over-ledger concept, not a stored
   column.** The authoritative source of an employee's leave balance for a given
   `Leave Type` as of a given date is `SUM(leave_ledger_entry.leaves)` filtered to
   that employee/leave_type/docstatus=1/date <= as-of-date (with carry-forward and
   expiry entries factored in as their own signed rows). `Leave Allocation.
   total_leaves_allocated` and similar fields are denormalized snapshots for
   display, not the source of truth — a port must keep the ledger as the
   authoritative table and treat allocation/application total fields as derived/
   cached.
2. **One active, non-overlapping `Leave Allocation` per (employee, leave_type,
   date) is expected**, though the source code does not appear to hard-enforce
   global non-overlap at the database level beyond period-based checks in `Leave
   Policy Assignment`/`Leave Allocation` validation (see those files' Port Notes
   for exactly what is and isn't checked) — a port should decide whether to add a
   stricter DB-level exclusion constraint or preserve the source's looser
   behavior.
3. **An employee cannot have overlapping `Leave Application` date ranges of
   docstatus 0 or 1** (draft or submitted) for the same employee — enforced in
   `Leave Application.validate_dates`/overlap check (see `Leave Application.md`
   for the exact query and message).
4. **Every balance-affecting action must write a `Leave Ledger Entry`.** This
   includes: allocation creation (+N), allocation expiry (-unused, is_expired=1),
   leave application submission (-days consumed), leave application cancellation
   (reversal, +days), leave adjustment (± signed), leave encashment (-days
   encashed). A port must not let any of these mutate a cached balance column
   without also appending the corresponding ledger row, or the ledger and
   materialized balance will drift.
5. **Leave Policy Assignment is the only supported entry point for creating
   earned-leave-enabled Leave Allocations with a proper `Earned Leave Schedule`.**
   Allocations created directly (bypassing the assignment flow) for an
   earned-leave `Leave Type` will not get a populated schedule unless the creator
   explicitly builds one — see `Leave Allocation.md` and `Leave Policy
   Assignment.md` for the exact schedule-generation algorithm.
6. **The three daily-scheduler jobs (`process_expired_allocation`,
   `generate_leave_encashment`, `allocate_earned_leaves`) run in that fixed order**
   under the `daily_long` scheduler event bucket (`hrms/hooks.py`), and later jobs
   in the list can depend on side effects of earlier ones in the same run (e.g.
   encashment generation reads `Leave Allocation.to_date = yesterday`, which is the
   same population `process_expired_allocation` may have just expired) — a port
   reproducing these as separate cron jobs should preserve this ordering.
7. **Holiday List resolution is a two-level fallback**: an employee's effective
   holiday list is found by looking up `Holiday List Assignment` rows for the
   employee directly (most recent `from_date <= as_on`, submitted only); if none
   is found, the same lookup is repeated against the employee's `company` as the
   `assigned_to` value. If neither resolves and the caller requires one, an
   exception is raised naming both the employee and company and linking to
   `Holiday List Assignment` (see `hrms/utils/holiday_list.py:get_holiday_list_for_employee`).
   This fallback chain must be reproduced exactly since `Leave Application`'s
   day-counting depends on it.
8. **Role-based leave blocking is company/department-agnostic at the block-list
   level**: a `Leave Block List` blocks its listed dates for everyone *except*
   users holding a role present in that list's `Leave Block List Allow` child
   rows — there is no per-employee exemption, only per-role. See `Leave Block
   List.md` for the exact `is_user_in_allow_list`/`get_applicable_block_dates`
   logic that `Leave Application` calls into.
