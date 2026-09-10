# Salary Slip Loan

**Source:** `hrms/payroll/doctype/salary_slip_loan/salary_slip_loan.json`, `salary_slip_loan.py`
**Submittable:** no   **Tree:** no   **Naming:** child table (no autoname; row identified by parent+idx)
**Module:** Payroll

Child table of `Salary Slip`. **Important:** the `loans` table field itself is **not defined in `salary_slip.json`** — grepping the schema confirms no `"loans"` fieldname exists there. The Salary Slip controller (`salary_slip.py`) nonetheless reads/writes `self.get("loans")` / `self.set("loans", ...)` throughout `calculate_net_pay()` and the loan-repayment flow. This means the `loans` Table field is injected onto Salary Slip only when the separate **Lending app** is installed (via a Custom Field / Property Setter shipped by that app), and `Salary Slip Loan` is this table's row doctype. See Port Notes.

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| loan | Loan | Link | Loan (Lending app) | Yes | — | Yes | |
| loan_product | Loan Product | Link | Loan Product (Lending app) | No | — | Yes | `fetch_from: loan.loan_product` |
| loan_account | Loan Account | Link | Account | No | — | Yes | |
| interest_income_account | Interest Income Account | Link | Account | No | — | Yes | |
| principal_amount | Principal Amount | Currency | company default currency | No | — | Yes | |
| interest_amount | Interest Amount | Currency | company default currency | No | — | Yes | |
| total_payment | Total Payment | Currency | company default currency | No | — | No | editable — user can reduce paid amount within the pending accrued amount |
| loan_repayment_entry | Loan Repayment Entry | Link | Loan Repayment (Lending app) | No | — | Yes | `no_copy`; set after `Loan Repayment` doc is created/submitted |

`quick_entry: 1`, `track_changes: 1`.

## Child Tables

None (leaf child table).

## State Machine

Not applicable — child table. Its `loan_repayment_entry` link tracks the lifecycle of an external `Loan Repayment` document (owned by the Lending app), which is created on Salary Slip submit and cancelled on Salary Slip cancel (see below).

## Validation Rules (exact, in execution order)

Enforced inside `set_loan_repayment()` in `hrms/payroll/doctype/salary_slip/salary_slip_loan_utils.py`, run once per row on every `calculate_net_pay()`:

1. `IF payment.total_payment > amounts["payable_amount"]` (current outstanding payable amount recomputed live from the Loan) `THEN frappe.throw("Row {idx}: Paid amount {total_payment} is greater than pending accrued amount {payable_amount} against loan {loan}")` (source: `set_loan_repayment`, in `salary_slip_loan_utils.py`).

No other field-level validation exists on the child doctype itself (`SalarySlipLoan` controller body is `pass`).

## Business Logic / Calculations

All of this logic lives in `hrms/payroll/doctype/salary_slip/salary_slip_loan_utils.py` and is gated by the `if_lending_app_installed` decorator:

```
def if_lending_app_installed(function):
    def wrapper(*args, **kwargs):
        if "lending" in frappe.get_installed_apps():
            return function(*args, **kwargs)
        return   # no-op if Lending app is not installed
    return wrapper
```

Functions decorated with `@if_lending_app_installed`: `set_loan_repayment`, `process_loan_interest_accrual_and_demand`, `make_loan_repayment_entry`, `cancel_loan_repayment_entry`. **If the Lending app is not installed, all four are silent no-ops** — the `loans` table never gets populated and no loan deduction occurs.

### `set_loan_repayment(doc)` — called from `Salary Slip.calculate_net_pay()`, after deductions are computed and before regional deductions

1. Reset `doc.total_loan_repayment = 0`, `doc.total_interest_amount = 0`, `doc.total_principal_amount = 0`.
2. IF `doc.loans` is empty (first-time population, e.g. new slip) THEN:
   a. `_get_loan_details(doc)` — query `Loan` where `applicant = employee`, `docstatus = 1`, `repay_from_salary = 1`, `company = doc.company`, `status != "Closed"`.
   b. For each such Loan, call `calculate_amounts(loan.name, doc.end_date)` (Lending app function — external, not ported here) to get `payable_amount`, `interest_amount`, `payable_principal_amount`.
   c. IF `amounts["payable_amount"]` is truthy THEN append a `Salary Slip Loan` row with `loan`, `total_payment = payable_amount`, `interest_amount`, `principal_amount = payable_principal_amount`, `loan_account`, `interest_income_account` (from the Loan record).
3. IF `doc.loans` is still empty after step 2, explicitly set `doc.set("loans", [])`.
4. For every row currently in `doc.loans` (whether freshly populated in step 2, or already present e.g. on a re-save/re-open):
   a. Recompute `amounts = calculate_amounts(payment.loan, doc.end_date)`.
   b. Validation rule 1 above (row's `total_payment` must not exceed live `payable_amount`).
   c. Accumulate: `doc.total_interest_amount += payment.interest_amount`, `doc.total_principal_amount += payment.principal_amount`, `doc.total_loan_repayment += payment.total_payment`.
5. `doc.total_loan_repayment` is then subtracted from net pay in `Salary Slip.set_net_pay()`: `net_pay = gross_pay - (total_deduction + total_loan_repayment)`.

### `process_loan_interest_accrual_and_demand(doc)` — called from `Salary Slip.get_emp_and_working_day_details()` (i.e., when the slip is (re)built from the Salary Structure)

1. Fetch active repay-from-salary loans for the employee/company (same filter as `_get_loan_details`).
2. IF none, return.
3. IF DocType `Loan Demand` exists (newer Lending app schema) THEN import `process_daily_loan_demands` and `process_loan_interest_accrual_for_loans`; ELSE import `process_loan_interest_accrual_for_term_loans` (older schema).
4. For each loan where `loan.is_term_loan` is true:
   - IF `Loan Demand` exists: call `process_loan_interest_accrual_for_loans(doc.end_date, loan.loan_product, loan.name)` then `process_daily_loan_demands(doc.end_date, loan.loan_product, loan.name)`.
   - ELSE: call `process_loan_interest_accrual_for_term_loans(posting_date=doc.end_date, loan_product=loan.loan_product, loan=loan.name)`.
   These are Lending-app-owned functions that post/accrue interest as of the slip's end date — not re-implemented here; treat as an external service call a port would need an equivalent Loans/Lending module for.

### `make_loan_repayment_entry(doc)` — called from `Salary Slip.on_submit()`

1. Resolve `payroll_payable_account` via `get_payroll_payable_account(company, payroll_entry)`: if `payroll_entry` is set, use `Payroll Entry.payroll_payable_account`; else `Company.default_payroll_payable_account`.
2. Read Payroll Settings `process_payroll_accounting_entry_based_on_employee`.
3. For each row in `doc.loans` where `total_payment` is truthy:
   a. Call Lending app's `create_repayment_entry(loan, employee, company, posting_date, loan_product, "Normal Repayment", interest_amount, principal_amount, total_payment, payroll_payable_account=..., process_payroll_accounting_entry_based_on_employee=..., value_date=doc.end_date)` to build a `Loan Repayment` document.
   b. `repayment_entry.save()`.
   c. IF `process_payroll_accounting_entry_based_on_employee` is falsy, set `frappe.flags.party_not_required = True` (Lending-app-specific accounting flag) before submit, then reset it to `False` after.
   d. `repayment_entry.submit()`.
   e. `frappe.db.set_value("Salary Slip Loan", loan.name, "loan_repayment_entry", repayment_entry.name)` — direct DB write of the child row's `loan_repayment_entry` field (bypasses the parent Salary Slip's own save cycle).

### `cancel_loan_repayment_entry(doc)` — called from `Salary Slip.on_cancel()`

1. For each row in `doc.loans` with a `loan_repayment_entry` set, load and `cancel()` the `Loan Repayment` document.

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| (none on this child doctype itself) | — | — |

All lifecycle behavior is driven by the parent `Salary Slip`'s hooks, listed here for traceability:

| Salary Slip Event | What Runs re: loans | Side Effects |
|---|---|---|
| `get_emp_and_working_day_details` (whitelisted, re-pulls structure) | `process_loan_interest_accrual_and_demand(self)` | Posts/accrues interest on active Loans (Lending app) |
| `validate` -> `calculate_net_pay` | `set_loan_repayment(self)` | Populates/validates `loans` child rows, sets `total_loan_repayment`/`total_interest_amount`/`total_principal_amount` on the slip |
| `on_submit` | `make_loan_repayment_entry(self)` | Creates + submits a `Loan Repayment` document per loan row; writes back `loan_repayment_entry` |
| `on_cancel` | `cancel_loan_repayment_entry(self)` | Cancels the linked `Loan Repayment` document(s) |

## Whitelisted / API Methods

None on this child doctype. (`make_loan_repayment_entry`, `set_loan_repayment`, etc. are plain Python functions, not `@frappe.whitelist()`.)

## Permissions

`permissions: []` — governed entirely by the parent `Salary Slip`'s permissions.

## Scheduled Jobs Touching This Doctype

None found in `hrms/hooks.py` directly referencing `Salary Slip Loan`. (Loan interest accrual scheduling, if any, is owned by the external Lending app, out of scope here.)

## Related Doctypes

- [[Salary Slip]] — parent doctype whose `loans` table field is injected only when the external Lending app is installed; drives `total_loan_repayment`/`total_interest_amount`/`total_principal_amount` at the parent level.
- [[Payroll Entry]] — `get_payroll_payable_account()` falls back to `Payroll Entry.payroll_payable_account` when resolving the account for repayment postings.
- [[Payroll Settings]] — `process_payroll_accounting_entry_based_on_employee` affects the accounting-party behavior of the created `Loan Repayment` entry.

## Port Notes

- **The whole feature is conditional on an external app ("lending") being installed.** A port must decide: either (a) always support loan repayment as a first-class module (recommended for a clean port — remove the conditional), or (b) replicate the plugin-gate pattern (`if_lending_app_installed`) as a feature flag / optional module so the base Payroll module works standalone when loans aren't needed.
- The `loans` table field on Salary Slip is added by the Lending app via a Frappe Custom Field / Property Setter, not by the core `Salary Slip.json` schema — this is a base-app / plugin-app schema-extension pattern with no direct equivalent in most non-Frappe stacks. A port should decide up front whether `loans` is a native column of the Salary Slip's schema (simpler) or an extension mechanism.
- `total_loan_repayment`, `total_interest_amount`, `total_principal_amount` are referenced on `Salary Slip` (`self.total_loan_repayment`, etc.) but are **also not present** as declared fields in `salary_slip.json` — same externally-injected-field pattern. A port targeting first-class loan support should add these as real columns on the Salary Slip/payslip table.
- `calculate_amounts`, `create_repayment_entry`, `process_loan_interest_accrual_for_term_loans`, `process_loan_interest_accrual_for_loans`, `process_daily_loan_demands` are Lending-app functions whose internals are out of scope for the Payroll module port — document them here only as external call boundaries with the exact inputs/outputs shown above.
- `frappe.flags.party_not_required` is a global mutable flag toggled around `repayment_entry.submit()` — a thread/request-scoped hack in Frappe. A port must pass this as an explicit parameter/context rather than a global, to avoid race conditions in a multi-threaded server.
- The direct `frappe.db.set_value("Salary Slip Loan", loan.name, "loan_repayment_entry", ...)` call bypasses the parent document's own validate/save cycle — a port's equivalent must ensure this partial update doesn't clobber concurrent edits to the same child row (optimistic locking recommended).
