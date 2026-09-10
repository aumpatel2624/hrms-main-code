# Salary Component Account

**Source:** `hrms/payroll/doctype/salary_component_account/salary_component_account.json`, `salary_component_account.py`
**Submittable:** no   **Tree:** no   **Naming:** child table (no autoname; row identified by parent+idx)
**Module:** Payroll

Child table of `Salary Component` (field `accounts`). Maps a Salary Component to the GL `Account` it should post to, per `Company` — a company-scoped override table since a multi-company Frappe site shares one `Salary Component` master but needs distinct chart-of-accounts postings per company.

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| company | Company | Link | Company | No | — | No | |
| account | Account | Link | Account | No | — | No | "Default Bank / Cash account will be automatically updated in Salary Journal Entry when this mode is selected." (description carried over from a shared field description; functionally this is the ledger account for this component in this company) |

Neither field is marked `reqd` in the schema — validation of "must be set" is enforced by the parent `Salary Component.validate_accounts()` at the row-set level, not per-field.

## Child Tables

None (leaf child table).

## State Machine

Not applicable — child table.

## Validation Rules (exact, in execution order)

None on this child doctype itself (`SalaryComponentAccount` controller body is `pass`). The only related validation is on the parent `Salary Component`:

1. `Salary Component.validate_accounts()`: IF NOT (`self.statistical_component` OR (`self.accounts` is non-empty AND every row has `account` set)) THEN `frappe.msgprint(title="Warning", msg="Accounts not set for Salary Component {0}", indicator="orange")` (source: `validate_accounts`). **Note this is a `msgprint` warning, not a `frappe.throw`** — it does not block saving a Salary Component with missing/incomplete accounts.

## Business Logic / Calculations

No computation of its own. Its rows are looked up when building payroll accounting entries (Journal Entry creation for salary payments/liabilities) — resolving, for a given `salary_component` + `company`, which GL `account` to debit/credit. That lookup/posting logic lives in the Payroll Entry / accounting-entry-generation code (owned by a different area — Payroll Entry doctype), not in this file; this doctype is purely the mapping table it reads from.

Also referenced by `Salary Slip.get_tax_components()` / `_fetch_tax_components_by_company()`: to determine which `Salary Component`s count as the "tax component" **for a given company**, the code left-joins `Salary Component` to `Salary Component Account` on `parent` and groups by `sca.company` (falling back to a `"default"` bucket when a tax-flagged component has no company-specific account row at all). This means the presence/absence of a company-scoped `Salary Component Account` row indirectly affects which company's Salary Slips auto-select which tax component when the Salary Structure omits one.

## Lifecycle Hooks (exact)

None on this doctype. Governed by the parent `Salary Component`'s `validate()` (see `validate_accounts` above) and `on_update()`/`clear_cache()` (which invalidate two Frappe caches — `SALARY_COMPONENT_VALUES` and `TAX_COMPONENTS_BY_COMPANY` — whenever any `Salary Component` document, including its `accounts` child table, is saved).

## Whitelisted / API Methods

None.

## Permissions

`permissions: []` — governed by the parent `Salary Component`'s permissions.

## Scheduled Jobs Touching This Doctype

None found.

## Related Doctypes

- [[Salary Component]] — sole parent doctype (`accounts` field); `validate_accounts()` warns (non-blocking) when rows are missing/incomplete.
- [[Salary Slip]] — `get_tax_components()`/`_fetch_tax_components_by_company()` reads this table's company-scoped rows to resolve which component counts as "the tax component" per company.

## Port Notes

- This is a straightforward company-scoped override/join table: `(salary_component_id, company_id) -> account_id`, with `company` optional (an unset company should be treated as a global/default fallback, since the querying code in `_fetch_tax_components_by_company()` explicitly groups un-companied rows under a `"default"` key). A port should enforce **uniqueness of `(salary_component, company)`** at the database level even though the Frappe schema does not declare this constraint explicitly — duplicate rows for the same company are only prevented by UI/data-entry discipline in the source, not by a DB constraint. Flag this as a gap to close in the port rather than silently reproduce.
- The "accounts not set" check is a non-blocking warning (`msgprint`), not a hard validation — a re-implementation should preserve this exact severity (warn on save, don't reject) rather than "fixing" it into a hard error, since the source explicitly allows a Salary Component to be saved and used in payroll without any account mapped (e.g. `statistical_component` rows never need one; other rows might be added before accounting is configured).
- Frappe's `frappe.cache()` invalidation triggered from `Salary Component.clear_cache()` (which fires whenever a Salary Component AND its child `accounts` rows are saved together, since child tables save atomically with the parent in Frappe) has no automatic analogue in most other stacks — a port must explicitly invalidate any cached "tax components by company" / "component abbreviation defaults" lookup whenever a `Salary Component` or its `Salary Component Account` rows change.
