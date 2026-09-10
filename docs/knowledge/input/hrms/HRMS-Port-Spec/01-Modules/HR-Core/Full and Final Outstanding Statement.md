# Full and Final Outstanding Statement

**Source:** `hrms/hr/doctype/full_and_final_outstanding_statement/full_and_final_outstanding_statement.json`, `full_and_final_outstanding_statement.py`
**Submittable:** no (child table doctype)   **Tree:** no   **Naming:** none (child table row)
**Module:** HR

This is a child-table doctype (`istable: 1`), reused by TWO Table fields on `Full and Final Statement`: `payables` and `receivables` (same child doctype, two different parent tables — the `parentfield` value distinguishes which logical table a row belongs to). There is no `.js` file for this doctype itself (its client-side field behavior — `reference_document`/`amount` change handlers — is defined inside `full_and_final_statement.js` under `frappe.ui.form.on("Full and Final Outstanding Statement", {...})`).

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| *(column_break_4)* | — | Column Break | — | — | — | — | layout only |
| status | Status | Select | `Settled\nUnsettled` | no | `Unsettled` | no | `columns: 1`, in list view. NOTE: field is not `reqd` in JSON despite having a default — practically always populated by parent controller code. |
| remark | Remark | Small Text | — | no | — | no | |
| reference_document | Reference Document | Dynamic Link | dynamic — target doctype named by `reference_document_type` | conditionally | — | no | `columns: 2`, in list view, `depends_on: "reference_document_type"` (UI show/hide), `mandatory_depends_on: "reference_document_type"` (mandatory whenever `reference_document_type` has any value), `search_index: 1`. |
| component | Component | Data | — | yes | — | no | `columns: 2`, in list view. Free-text label such as "Gratuity", "Expense Claim", "Bonus", "Leave Encashment", "Employee Advance", "Loan", "Salary Slip" — set programmatically by parent, not a Select/enum. |
| account | Account | Link | Account | no | — | no | `columns: 1`, in list view |
| amount | Amount | Currency | — | no | — | no | `columns: 2`, in list view, `non_negative: 1` (framework-enforced >= 0) |
| reference_document_type | Reference Document Type | Link | DocType | no | — | no | `columns: 2`, in list view |
| paid_via_salary_slip | Paid via Salary Slip | Check | — | no | `0` | no | Set to `1` only for rows auto-created from a withheld Salary Slip (`add_withheld_salary_slips`) |

`track_changes: 1`. `sort_field`: `creation` DESC.

## Child Tables

N/A (this doctype is itself a child table, reused for both `payables` and `receivables` on the parent).

## State Machine

Not submittable. `status` values are `Settled` / `Unsettled`. No controller code on this child doctype sets or reads `status` — it is set/read entirely by the parent (`Full and Final Statement`):
- Rows are created with `status = "Unsettled"` by `create_component_row()` and `add_withheld_salary_slips()`.
- `Full and Final Statement.before_submit()` -> `validate_settlement("payables")` and `validate_settlement("receivables")`: IF ANY row in that table has `status == "Unsettled"` THEN block submission with `frappe.throw(_("Settle all Payables and Receivables before submission"), title=_("Unsettled Transactions"))`.
- There is no code anywhere in the assigned doctype set that ever sets a row's `status` to `"Settled"` — this must happen via direct user edit in the grid (or an external integration not present in these files). Flag as Port Note.

## Validation Rules (exact, in execution order)

None defined on this child doctype's own controller (`pass` body). Framework-level field constraints only:
1. `amount` must be `>= 0` (`non_negative: 1`).
2. `reference_document` is mandatory whenever `reference_document_type` is set (`mandatory_depends_on: "reference_document_type"`).

All business logic that populates/consumes these rows lives on the parent `Full and Final Statement` controller — see that file's Business Logic section for: `add_withheld_salary_slips`, `create_component_row`, `get_payable_component`, `get_receivable_component`, `set_totals`, `validate_settlement`.

## Business Logic / Calculations

None on this doctype directly — see `Full and Final Statement.md` for how rows in `payables`/`receivables` are populated and summed into `total_payable_amount`/`total_receivable_amount`.

## Lifecycle Hooks (exact)

None (child doctype controller body is `pass`).

## Whitelisted / API Methods

None on this doctype directly. Note: the client-side handler for this child doctype's `reference_document` field change (defined in `full_and_final_statement.js`) calls the parent module-level whitelisted function `hrms.hr.doctype.full_and_final_statement.full_and_final_statement.get_account_and_amount(ref_doctype, ref_document, company)` to auto-populate this row's `account` and `amount` fields — see `Full and Final Statement.md` Whitelisted Methods table for the full behavior of `get_account_and_amount`.

## Permissions

`permissions: []` (empty array) — governed entirely by the parent `Full and Final Statement` document's permissions.

## Scheduled Jobs Touching This Doctype

None.

## Related Doctypes

- [[Full and Final Statement]] — parent via both the `payables` and `receivables` tables (same child doctype reused for both).

## Port Notes

- **`status` never programmatically set to "Settled"**: no source file in this build spec's assigned doctypes ever transitions a row from Unsettled to Settled — this is presumably a manual user action in the grid UI (ticking the Select from Unsettled to Settled) before the parent is submitted. A port must expose this as a plain editable field with no server-side auto-transition, and rely on the parent's before_submit guard to enforce that all rows are Settled before allowing submission.
- **Reused child doctype for two logical tables**: `payables` and `receivables` on the parent both use this exact same child doctype — a relational port can implement this either as (a) one owned/dependent table with a `line_type` discriminator column (`payable`/`receivable`) derived from which parent field it belongs to, or (b) two separate tables with identical schema. Given the child rows carry no explicit "which table am I in" field of their own (Frappe distinguishes via `parentfield` internally), the port must add an explicit discriminator column if unifying into one table, since business logic (e.g. sign of amount in the Journal Entry: payables = debit, receivables = credit) depends on which logical table the row lives in.
- **`component` is free text, not an enum**: despite representing a fixed conceptual set of values (Gratuity, Expense Claim, Bonus/Additional Salary, Leave Encashment, Employee Advance, Loan, Salary Slip), the field type is plain `Data`, not `Select` — the port can choose to make this an enum for stronger typing since the actual value set is fully enumerated in the parent's `get_payable_component()`/`get_receivable_component()`/`add_withheld_salary_slips()` methods, but should note this deviates slightly from a literal 1:1 schema port (a literal port would keep it free text).
- **`mandatory_depends_on` on `reference_document`**: framework-level conditional-mandatory; no custom error message defined in source.
