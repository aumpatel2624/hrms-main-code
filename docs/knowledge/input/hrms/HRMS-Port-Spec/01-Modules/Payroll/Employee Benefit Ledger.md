# Employee Benefit Ledger

**Source:** `hrms/payroll/doctype/employee_benefit_ledger/employee_benefit_ledger.json`, `employee_benefit_ledger.py`, `employee_benefit_ledger.js`, `employee_benefit_ledger_list.js`
**Submittable:** no   **Tree:** no   **Naming:** default (Frappe hash-based auto-name; no `autoname` key present)
**Module:** Payroll

An append-only accounting ledger of benefit accrual/payout transactions per employee/component/payroll period. Rows are only ever `insert()`ed or bulk-deleted (never updated/amended) — this doctype is not submittable.

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| posting_date | Posting Date | Date | | no | Today | no | |
| employee | Employee | Link | [[Employee Core Model]] | no | | no | `search_index: 1` |
| employee_name | Employee Name | Data | | no | | no | fetch_from `employee.employee_name` |
| salary_component | Salary Component | Link | [[Salary Component]] | no | | no | `link_filters`: Salary Component.accrual_component = 1 (UI-only); `search_index: 1`; must be type "Earning" (server-validated) |
| company | Company | Data | | no | | no | fetch_from `employee.company` (note: fieldtype is Data, not Link, despite semantics) |
| payroll_period | Payroll Period | Link | [[Payroll Period]] | no | | no | `search_index: 1` |
| reference_doctype | Reference Doctype | Link | DocType | no | | no | `depends_on: eval:doc.flexible_benefit`; set only when `flexible_benefit=1` |
| reference_document | Reference Document | Dynamic Link | options: `reference_doctype` | no | | no | `depends_on: eval:doc.flexible_benefit` |
| salary_slip | Salary Slip | Link | [[Salary Slip]] | no | | no | |
| transaction_type | Transaction Type | Select | `Accrual`, `Payout` | no | | no | |
| amount | Amount | Currency | | no | | no | `non_negative: 1` |
| flexible_benefit | Flexible Benefit | Check | | no | 0 | no | description: "Enabled only for Employee Benefit components from Salary Structure Assignment" |
| yearly_benefit | Yearly Benefit | Currency | | no | | no | `non_negative: 1` |
| remarks | Remarks | Data | | no | | no | |

Layout-only fields skipped: column_break_llqa, column_break_erll, employee_benefit_details_section.

## Child Tables

None.

## State Machine

Not submittable — no docstatus workflow (see [[Submittable Document Lifecycle]] for the contrast with submittable doctypes in this module). Rows exist only as `docstatus=0` inserted documents; there is no explicit `status` field.

## Validation Rules (exact, in execution order)

`validate()`:
1. Look up `type = frappe.get_cached_value("Salary Component", self.salary_component, "type")`. IF `type != "Earning"` THEN throw `"Salary Component {0} must be of type 'Earning' to be used in Employee Benefit Ledger"` (salary_component). (source: `validate`)

## Business Logic / Calculations

### `create_employee_benefit_ledger_entry(ref_doc, args=None, delete=False)` — module-level helper, entry point for creating ledger rows from other doctypes (Salary Slip, Arrear, Payroll Correction)
1. `components = args.get("benefit_ledger_components")` (a list of dict-like rows each with `salary_component`, `amount`, `transaction_type`, optional `yearly_benefit`, `flexible_benefit`, `remarks`). IF empty, return (no-op).
2. Build a `base_entry` dict: `employee`, `employee_name`, `company`, `posting_date` from `ref_doc`; `salary_slip = ref_doc.name`; `payroll_period = args.get("payroll_period")`.
3. Determine `reference_doctype`: IF `args.get("benefit_details_doctype") == "Employee Benefit Detail"` THEN `"Salary Structure Assignment"` ELSE `"Employee Benefit Application"`. `reference_document = args.get("benefit_details_parent")`.
4. For each component in `components`:
   a. Copy `base_entry`, then overlay `salary_component`, `amount`, `transaction_type`, `yearly_benefit` (default 0), `flexible_benefit` (default 0), `remarks`.
   b. IF `flexible_benefit == 1`:
      i. Set `reference_doctype`/`reference_document` as computed above.
      ii. IF `yearly_benefit` not already set (falsy), fetch it via `frappe.db.get_value(benefit_details_doctype, {"parent": benefit_details_parent, "salary_component": salary_component}, "amount")` defaulting to `0`.
   c. Insert the entry as a new `Employee Benefit Ledger` document.

Note: `ref_doc` param name is generic but the function signature/body assumes it always represents a Salary Slip-like document for the `base_entry` fields (`employee_name`, `company`, `posting_date`, `name`) — callers from Arrear/Payroll Correction manually construct dicts matching the shape expected (see those doctypes' `create_benefit_ledger_entry` methods, which directly build `Employee Benefit Ledger` documents rather than calling this helper).

### `delete_employee_benefit_ledger_entry(ref_field, ref_value)`
Bulk SQL delete: `DELETE FROM Employee Benefit Ledger WHERE <ref_field> = <ref_value>`. Used on `on_cancel` of `Arrear` and `Payroll Correction` to remove ledger entries tied to `reference_document == self.name`.

### `get_max_claim_eligible(employee, payroll_period, benefit_component, current_month_benefit_amount=0)` — the core eligibility/pro-rata formula referenced by `Employee Benefit Claim`
Inputs: `benefit_component` is a dict-like row with `.name` (salary component), `.payout_method`, `.amount` (yearly benefit).
1. `precision = frappe.get_precision("Employee Benefit Detail", "amount")`.
2. `amounts = get_benefit_amount(employee, payroll_period, benefit_component.name)` — sums ledger `amount` grouped by `transaction_type` for this employee/component/payroll_period (see below).
3. `accrued = flt(amounts.get("Accrual", 0), precision)`; `paid = flt(amounts.get("Payout", 0), precision)`.
4. IF `payout_method == "Accrue per cycle, pay only on claim"`:
   a. `accrued += current_month_benefit_amount` (the not-yet-posted current cycle's accrual, from a preview salary slip).
   b. IF `accrued >= paid` THEN `claim_eligible = flt(accrued - paid, precision)`.
   c. ELSE throw `"Accrued amount {0} is less than paid amount {1} for Benefit {2} in payroll period {3}"` (accrued, paid, benefit_component.name, payroll_period) — a data-integrity guard, should never occur under correct sequencing.
5. ELIF `payout_method == "Allow claim for full benefit amount"`: `claim_eligible = benefit_component.amount - paid` (flat yearly ceiling minus what's already been paid out this payroll period, no accrual tracking needed).
6. ELSE (any other/unknown payout_method): `claim_eligible` stays `0` (initialized value; no branch matches).
7. Return `claim_eligible`.

### `get_benefit_amount(employee, payroll_period, salary_component)`
Query all `Employee Benefit Ledger` rows for `employee` + `salary_component` + `payroll_period`, select `transaction_type, amount`. Group and sum `amount` by `transaction_type` into a `defaultdict(float)` (keys: `"Accrual"`, `"Payout"`, absent if none). Return the dict.

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| validate | Salary Component type check (must be Earning) | none |

No `on_submit`/`on_cancel` (not submittable). Rows are created via `insert()` calls from: [[Salary Slip]] (payroll processing — owned by another agent), `Arrear.create_benefit_ledger_entry()`, `Payroll Correction.create_benefit_ledger_entry()` (these cross-doctype writes are the same style of coupling documented in [[Cross-Doctype Hooks (doc_events)]]). Rows are bulk-deleted via `delete_employee_benefit_ledger_entry` from `Arrear.on_cancel()` and `Payroll Correction.on_cancel()` (matching `reference_document == <cancelled doc name>`).

## Whitelisted / API Methods

None — all functions are internal Python helpers (no `@frappe.whitelist()` decorator found).

## Permissions

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| System Manager | yes | no | no | no | n/a | n/a | n/a | yes | yes | share/email/print also 1; no write/create/delete rights — ledger is system-generated only |
| Employee | yes | no | no | no | n/a | n/a | n/a | yes | yes | share/email/print also 1 |
| HR Manager | yes | no | no | no | n/a | n/a | n/a | yes | yes | share/email/print also 1 |
| Administrator | yes | no | no | no | n/a | n/a | n/a | yes | yes | share/email/print also 1 |
| HR User | yes | no | no | no | n/a | n/a | n/a | yes | no | only read+report; no share/email/export/print |

Client script (`employee_benefit_ledger.js`) additionally forces the form read-only and hides the primary save button in the UI (`frm.set_read_only()`, `frm.page.btn_primary.hide()`) — this is a UI-only reinforcement of the "no write" permission model above; the port's UI layer should replicate a read-only ledger view, but the actual enforcement must be server-side permissions as tabulated.

List view (`employee_benefit_ledger_list.js`) colors `transaction_type`: "Accrual" → blue pill, "Payout" → orange pill — cosmetic only.

## Scheduled Jobs Touching This Doctype

None found in `hrms/hooks.py`.

## Related Doctypes

- [[Employee Core Model]] — `employee` link; the ledger's per-employee accrual/payout ledger owner.
- [[Salary Component]] — `salary_component` link; must be type "Earning" (server-validated).
- [[Payroll Period]] — `payroll_period` link; scopes accrual/payout aggregation.
- [[Salary Slip]] — `salary_slip` link; also a creator of ledger rows during payroll processing.
- [[Arrear]] — creates ledger rows (`create_benefit_ledger_entry`) and bulk-deletes them on cancel.
- [[Payroll Correction]] — same create/on_cancel-delete pattern as Arrear.
- [[Employee Benefit Detail]] — `get_max_claim_eligible` uses its `amount` field's precision and, for flexible-benefit rows, its `amount` as the fallback `yearly_benefit`.
- [[Employee Benefit Claim]] — consumes `get_max_claim_eligible()`/`get_benefit_amount()` for eligibility calculations.

## Port Notes

- This doctype has no `permissions` allowing create/write for any role in the JSON table — yet rows are clearly inserted by controller code (`frappe.get_doc({...}).insert()`) from Arrear, Payroll Correction, and Salary Slip. In Frappe this works because controller-initiated `insert()` calls from privileged System/Administrator-context server code bypass per-role permission checks unless `ignore_permissions` is explicitly required — i.e., the doctype is designed be be written ONLY by trusted server-side business logic, never directly by any user role via the UI/API. A port must enforce this as an application-layer invariant (e.g., no public "create ledger entry" endpoint; only internal service methods write rows) since the RDBMS/API layer won't get this "no direct writes" behavior for free — see [[Permission Model (RBAC)]] for how this "trusted server context bypasses role checks" behavior is defined generally.
- No submittable/docstatus lifecycle — treat as an immutable event-log table in the RDBMS port (insert + occasional bulk delete-by-reference only, never update).
- The `company` field is typed `Data`, not `Link` to Company, in source — likely an oversight, but per ground rules this must be reproduced as-is (a plain string copy of `employee.company`), not corrected to a foreign key, unless the user asks for a deliberate improvement.
- `get_max_claim_eligible`'s fallback branch (payout_method neither of the two known values) silently returns `0` — no error is thrown for an unrecognized payout method. This is a real gap in the source; flagged rather than fixed.
