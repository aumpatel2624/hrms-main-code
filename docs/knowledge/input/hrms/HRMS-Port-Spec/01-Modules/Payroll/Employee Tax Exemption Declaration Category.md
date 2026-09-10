# Employee Tax Exemption Declaration Category

**Source:** `hrms/payroll/doctype/employee_tax_exemption_declaration_category/employee_tax_exemption_declaration_category.json`, `employee_tax_exemption_declaration_category.py`
**Submittable:** no (child table; inherits submit state from parent)   **Tree:** no   **Naming:** child-table row (`parent`/`parentfield`/`parenttype` + auto `idx`), no standalone naming rule
**Module:** Payroll

Child table of `Employee Tax Exemption Declaration` (fieldname `declarations`, `istable: 1`, `quick_entry: 1`, `track_changes: 1`).

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| exemption_sub_category | Exemption Sub Category | Link | [[Employee Tax Exemption Sub Category]] | yes | — | no | `in_list_view`. Client-side query filters to `is_active: 1` rows only (`employee_tax_exemption_declaration.js`, `setup` handler on the `declarations` grid). |
| exemption_category | Exemption Category | Link | [[Employee Tax Exemption Category]] | yes | — | yes | `fetch_from: exemption_sub_category.exemption_category` — always mirrors the sub-category's parent category; not independently editable. |
| max_amount | Maximum Exempted Amount | Currency | — | yes | — | yes | `fetch_from: exemption_sub_category.max_amount` — mirrors the sub-category's ceiling amount at fetch time; not independently editable. |
| amount | Declared Amount | Currency | — | yes | — | no | `non_negative`. The employee's self-declared amount for this sub-category; this is the value the aggregation logic caps against `max_amount`/category ceiling. |

## Child Tables

N/A — this is itself a child table.

## State Machine

N/A. Rows are edited only while the parent `Employee Tax Exemption Declaration` is in Draft (docstatus 0); once the parent is submitted, rows become read-only along with the rest of the submitted document per standard Frappe submit semantics.

## Validation Rules (exact, in execution order)

None on this child doctype's own controller (`pass` body — no `validate` override). All cross-row and amount-vs-ceiling validation happens on the **parent** `Employee Tax Exemption Declaration`, specifically via `hrms.hr.utils.validate_tax_declaration()` and `hrms.hr.utils.get_total_exemption_amount()` — see `Employee Tax Exemption Declaration.md` for the exact rules (duplicate-sub-category check, per-category cap).

## Business Logic / Calculations

None on the row itself. This row's `amount` is one input into the parent's `get_total_exemption_amount()` aggregation — see `Employee Tax Exemption Declaration.md`.

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| (none) | No overridden lifecycle methods | None |

## Whitelisted / API Methods

None.

## Permissions

None defined in JSON (`"permissions": []`) — child tables inherit access control from the parent doctype (`Employee Tax Exemption Declaration`); there is no independent permission set for this child table.

## Scheduled Jobs Touching This Doctype

None.

## Port Notes

- In a relational port, this becomes a plain owned child row table: `employee_tax_exemption_declaration_category(id PK, parent_id FK -> employee_tax_exemption_declaration.id, idx, exemption_sub_category_id FK, exemption_category_id FK, max_amount, amount)`. It is NOT a many-to-many join table — each row belongs to exactly one parent declaration and is deleted/recreated with the parent's child-table diffing on save (standard Frappe child-table semantics: on save, Frappe replaces the full row-set for the table field, matching by `name` where present).
- `exemption_category` and `max_amount` are both denormalized copies (fetched at row-creation/edit time) of data on `Employee Tax Exemption Sub Category`/`Employee Tax Exemption Category`. A port must decide: either replicate the denormalization (copy-on-write, matching Frappe's `fetch_from` behavior — copies once when the link field is set, not live-recomputed), or normalize away these two columns and compute them via JOIN at read/query time. Denormalizing changes behavior subtly: if the sub-category's `max_amount` changes after this row was created, the stored `max_amount` here stays stale (Frappe's fetch_from only re-fires client-side when the source Link field itself is changed in the form, not on every save) — this is a known Frappe quirk worth flagging explicitly since a straightforward "always join live" port would silently change behavior.
- The `track_changes: 1` flag on the child doctype means row-level edits are versioned; port needs an explicit history table if audit trail on this child data is required.

## Related Doctypes

- [[Employee Tax Exemption Declaration]] — parent doctype; this is its `declarations` child table, holding one row per declared exemption sub-category.
- [[Employee Tax Exemption Sub Category]] — linked via `exemption_sub_category`; source of the fetched `exemption_category` and `max_amount` values.
- [[Employee Tax Exemption Category]] — reached indirectly via the sub-category; `max_amount` on this doctype caps the parent's aggregated exemption total.
