# Employee Tax Exemption Sub Category

**Source:** `hrms/payroll/doctype/employee_tax_exemption_sub_category/employee_tax_exemption_sub_category.json`, `employee_tax_exemption_sub_category.py`, `employee_tax_exemption_sub_category.js`
**Submittable:** no   **Tree:** no   **Naming:** `Prompt` (user types the `name`, e.g. "House Rent Allowance under Section X")
**Module:** Payroll

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| exemption_category | Tax Exemption Category | Link | [[Employee Tax Exemption Category]] | yes | — | no | `in_list_view`, `in_standard_filter`. Parent category this sub-category rolls up into. |
| max_amount | Max Exemption Amount | Currency | — | no | — | no | `fetch_from: exemption_category.max_amount`, `fetch_if_empty: 1` — auto-populated from the parent category's `max_amount` only when this field is currently empty (does NOT auto-sync on every save once a value exists); `non_negative`. Validated server-side against the parent (see Validation Rules). |
| is_active | Is Active | Check | — | no | `1` | no | Filters selectable sub-categories in `Employee Tax Exemption Declaration` and `Employee Tax Exemption Proof Submission` row pickers (client-side `frm.set_query` filter `is_active: 1`). |
| description | Description | Small Text | — | no | — | no | |

## Child Tables

None.

## State Machine

Not submittable. No `status`/`workflow_state` field.

## Validation Rules (exact, in execution order)

1. Look up `category_max_amount` = `Employee Tax Exemption Category.max_amount` for `self.exemption_category` (`frappe.db.get_value`). IF `flt(self.max_amount) > flt(category_max_amount)` THEN `frappe.throw(_("Max Exemption Amount cannot be greater than maximum exemption amount {0} of Tax Exemption Category {1}").format(category_max_amount, self.exemption_category))` (source: `validate`).

Note: this check runs even when `category_max_amount` is `None`/falsy — in that case `flt(None)` evaluates to `0.0`, so any positive `self.max_amount` on a sub-category whose parent category has no `max_amount` set will fail this validation (an implicit "category must have a max_amount if sub-category has one" rule, not an explicit separate check).

## Business Logic / Calculations

None beyond the single comparison above. No aggregation happens on this doctype; aggregation across sub-categories happens in `hrms.hr.utils.get_total_exemption_amount()`, consumed by `Employee Tax Exemption Declaration` and `Employee Tax Exemption Proof Submission` (see those files).

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| validate | Enforces `max_amount <= parent category's max_amount` (see Validation Rules #1) | None (read-only lookup of `Employee Tax Exemption Category`) |

## Whitelisted / API Methods

None defined on this doctype's controller.

## Permissions

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| System Manager | 1 | 1 | 1 | 1 | n/a | n/a | n/a | 1 | 1 | share, email, print also 1 |
| HR Manager | 1 | 1 | 1 | 1 | n/a | n/a | n/a | 1 | 1 | share, email, print also 1 |
| HR User | 1 | 1 | 1 | 1 | n/a | n/a | n/a | 1 | 1 | share, email, print also 1 |

No `if_owner`/`permlevel` restrictions. No `Employee` role access.

## Scheduled Jobs Touching This Doctype

None found in `hrms/hooks.py`.

## Port Notes

- The `fetch_if_empty` semantics matter: on first creation, if the user leaves `max_amount` blank, Frappe auto-copies the parent category's `max_amount` into this row at save time (client + server). If the user has ever set an explicit value (even later cleared and it was non-empty once), `fetch_if_empty` will re-populate only while the field reads as empty; a port must replicate "populate default from parent only if currently null/blank" rather than "always mirror parent."
- As with the parent category, `autoname: Prompt` + `allow_rename: 1` means `name` is a free-text natural key that can be renamed with cascading Link updates — same porting consideration as `Employee Tax Exemption Category.md`.
- The validation compares against the CURRENT value of the parent's `max_amount` at save time (a live `frappe.db.get_value` lookup, not a cached/fetched copy), so changing a category's `max_amount` after sub-categories exist does NOT retroactively re-validate existing sub-category rows — only the next save of a sub-category re-checks. Flag this for the port: no cascading re-validation on parent category edits.

## Related Doctypes

- [[Employee Tax Exemption Category]] — parent category this sub-category rolls up into; `max_amount` here is fetched-if-empty from, and validated against, the category's own `max_amount`.
- [[Employee Tax Exemption Declaration Category]] — declaration-side child row that links to this sub-category via `exemption_sub_category` and fetches `exemption_category`/`max_amount` from it.
- [[Employee Tax Exemption Proof Submission Detail]] — proof-side child row that likewise links to this sub-category and fetches the same values from it.
