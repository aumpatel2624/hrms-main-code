# Employee Tax Exemption Proof Submission Detail

**Source:** `hrms/payroll/doctype/employee_tax_exemption_proof_submission_detail/employee_tax_exemption_proof_submission_detail.json`, `employee_tax_exemption_proof_submission_detail.py`
**Submittable:** no (child table)   **Tree:** no   **Naming:** child-table row, no standalone naming rule
**Module:** Payroll

Child table of `Employee Tax Exemption Proof Submission` (fieldname `tax_exemption_proofs`, `istable: 1`, `quick_entry: 1`, `track_changes: 1`).

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| exemption_sub_category | Exemption Sub Category | Link | [[Employee Tax Exemption Sub Category]] | yes | — | no | `in_list_view`, grid column width 2. Client-side query filters to `is_active: 1`. |
| exemption_category | Exemption Category | Read Only (fieldtype `Read Only`, distinct from `Link` with `read_only: 1`) | — (no `options` link target set on the field itself; value is a plain fetched string) | yes | — | yes (fieldtype-inherent) | `fetch_from: exemption_sub_category.exemption_category`, grid column width 2. |
| max_amount | Maximum Exemption Amount | Currency | — | yes | — | yes | `fetch_from: exemption_sub_category.max_amount`, grid column width 2. |
| type_of_proof | Type of Proof | Data | — | yes | — | no | Free-text description of the proof document type (e.g. "Rent Receipt", "Insurance Premium Receipt"), grid column width 1. |
| amount | Actual Amount | Currency | — | no | — | no | `non_negative`, grid column width 2. The actually-substantiated/proven amount (as opposed to the earlier self-declared `amount` on the Declaration row). |
| attach_proof | Attach Proof | Attach | — | no | — | no | Per-row file attachment holding the scanned proof document; grid column width 1. |

## Child Tables

N/A — this is itself a child table.

## State Machine

N/A. Editable only while the parent `Employee Tax Exemption Proof Submission` is Draft.

## Validation Rules (exact, in execution order)

None on this child doctype's own controller (`pass` body). Cross-row and cap validation happens on the parent, via the same shared utilities as the Declaration flow: `validate_tax_declaration()` (duplicate sub-category check) and `get_total_exemption_amount()` (per-category cap) — see `Employee Tax Exemption Proof Submission.md`.

## Business Logic / Calculations

None on the row itself; feeds into parent aggregation (`set_total_actual_amount`, `set_total_exemption_amount`) — see `Employee Tax Exemption Proof Submission.md`.

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| (none) | No overridden lifecycle methods | None |

## Whitelisted / API Methods

None.

## Permissions

None defined in JSON (`"permissions": []`) — inherits from parent `Employee Tax Exemption Proof Submission`.

## Scheduled Jobs Touching This Doctype

None.

## Port Notes

- Structurally identical in shape to `Employee Tax Exemption Declaration Category` plus two extra columns (`type_of_proof`, `attach_proof`). Same denormalization caveat applies to `exemption_category`/`max_amount` (copy-on-set from the sub-category, not live-joined) — see that file's Port Notes for the exact implication.
- `attach_proof` is a per-row file upload; in a relational port this is typically a nullable file-reference column (path/URL/object-storage key) on the row, or a separate `attachments` table keyed by this row's id if multiple files per proof-row are ever needed (current schema only allows one file per row).
- Unlike the Declaration Category child table, `amount` here is NOT marked `reqd` (declared amount on the Declaration side is mandatory; the proven "Actual Amount" here is optional) — a port must preserve this asymmetry: a proof line can exist with a `type_of_proof` and attachment but no amount yet (e.g. proof pending amount confirmation).

## Related Doctypes

- [[Employee Tax Exemption Proof Submission]] — parent doctype; this is its `tax_exemption_proofs` child table, holding one proof row per declared exemption sub-category.
- [[Employee Tax Exemption Sub Category]] — linked via `exemption_sub_category`; source of the fetched `exemption_category` and `max_amount` values.
- [[Employee Tax Exemption Declaration Category]] — structurally analogous child row on the sibling Declaration doctype; rows are mapped 1:1 into this table by `make_proof_submission`.
