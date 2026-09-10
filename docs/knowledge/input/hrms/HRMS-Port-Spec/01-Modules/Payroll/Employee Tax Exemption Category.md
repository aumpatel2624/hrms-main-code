# Employee Tax Exemption Category

**Source:** `hrms/payroll/doctype/employee_tax_exemption_category/employee_tax_exemption_category.json`, `employee_tax_exemption_category.py`, `employee_tax_exemption_category.js`
**Submittable:** no   **Tree:** no   **Naming:** `Prompt` (user types the `name` on creation, e.g. "House Rent Allowance" — see [[Naming and Autoname Rules]])
**Module:** Payroll

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| max_amount | Max Exemption Amount | Currency | — | no | — | no | `non_negative` constraint (framework-level, blocks negative input in UI; no matching server-side `frappe.throw` found in `.py`). |
| is_active | Is Active | Check | — | no | `1` | no | Used to filter selectable sub-categories/categories in downstream link queries. |
| description | Description | Small Text | — | no | — | no | |

## Child Tables

None.

## State Machine

Not submittable. Simple CRUD document — no `status`/`workflow_state` field.

## Validation Rules (exact, in execution order)

None. The controller class (`EmployeeTaxExemptionCategory(Document)`) has no `validate`, `before_save`, or any other lifecycle override — body is `pass`. The only integrity constraint is the `non_negative` flag on `max_amount`, which is a Frappe framework-level field constraint (rejects negative values at the ORM/UI layer), not an explicit business-rule check in code.

## Business Logic / Calculations

None on this doctype itself. `max_amount` is the ceiling value consumed by:
- [[Employee Tax Exemption Sub Category]] (validates its own `max_amount` does not exceed this category's `max_amount`, see that file).
- `hrms.hr.utils.get_total_exemption_amount()` (caps aggregated declared/proof amounts per category at this `max_amount` — see [[Employee Tax Exemption Declaration]] and [[Employee Tax Exemption Proof Submission]] for the exact algorithm).

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| (none) | No overridden lifecycle methods | None |

## Whitelisted / API Methods

None defined on this doctype's controller.

## Permissions

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| System Manager | 1 | 1 | 1 | 1 | n/a | n/a | n/a | 1 | 1 | share, email, print also 1 |
| HR Manager | 1 | 1 | 1 | 1 | n/a | n/a | n/a | 1 | 1 | share, email, print also 1 |
| HR User | 1 | 1 | 1 | 1 | n/a | n/a | n/a | 1 | 1 | share, email, print also 1 |

No `if_owner` or `permlevel` restrictions (see [[Permission Model (RBAC)]]). No `Employee` role access (unlike the Declaration/Proof Submission doctypes) — categories are HR-admin-managed master data only.

## Scheduled Jobs Touching This Doctype

None found in `hrms/hooks.py`.

## Related Doctypes

- [[Employee Tax Exemption Sub Category]] — `exemption_category` link references this doctype's `name`; validates its own `max_amount` does not exceed this category's `max_amount`.
- [[Employee Tax Exemption Declaration Category]] — `exemption_category` link references this doctype's `name`.
- [[Employee Tax Exemption Declaration]] — `hrms.hr.utils.get_total_exemption_amount()` caps aggregated declared amounts per category at this doctype's `max_amount`.
- [[Employee Tax Exemption Proof Submission]] — same capping logic applies to aggregated proof-submission amounts.

## Port Notes

- `autoname: Prompt` means the primary key (`name`) is a free-text string typed by the creating user (e.g. "House Rent Allowance", "Section 80C") — there is no separate numeric ID and no naming series. In a relational port, use this string as the natural primary key (or add a surrogate PK plus a unique `name`/`code` column) since `Employee Tax Exemption Sub Category.exemption_category` and `Employee Tax Exemption Declaration Category.exemption_category` reference it by this string value (Frappe `Link` fields store the linked doc's `name`, not a surrogate integer ID).
- `allow_rename: 1` — the primary key/name can be renamed after creation; a renaming cascades to all Link fields referencing it site-wide via Frappe's rename-doc machinery. A new stack must implement equivalent cascading updates (or forbid renames and use a separate immutable surrogate key + a mutable display label instead, which is simpler to port).
- No automatic `max_amount` non-negativity check exists at the Python layer; if the target framework's UI layer doesn't enforce `non_negative` the way Frappe's client-side/DB-layer constraint does, add an explicit `>= 0` check when porting.
- `track_changes` is not set on this JSON (absent from the doctype meta), so no built-in version/audit history is guaranteed for this small master doctype — confirm no audit trail is expected for it.
