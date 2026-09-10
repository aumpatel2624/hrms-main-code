# Expense Claim Account

**Source:** `hrms/hr/doctype/expense_claim_account/expense_claim_account.json`, `expense_claim_account.py`
**Submittable:** no   **Tree:** no   **Naming:** child table (no autoname; row-level `name` is a random hash, standard Frappe child-row naming)
**Module:** HR

Child doctype of [[Expense Claim Type]] (table field `accounts`). Maps one default GL account per Company for a given Expense Claim Type.

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| company | Company | Link | Company | - | - | - | not marked `reqd` in JSON, but functionally required (queried by `parent`+`company` elsewhere); `in_list_view` |
| default_account | Default Account | Link | Account | yes | - | - | `in_list_view` |

`quick_entry: 1` — Frappe UI allows adding a row via a lightweight quick-entry dialog.

## Child Tables

None (leaf child table).

## State Machine

N/A — plain child row, no submittable/status concept.

## Validation Rules (exact, in execution order)

None on this doctype's own controller (`ExpenseClaimAccount(Document): pass`). Validation of its data happens in the PARENT's `validate()` (see `Expense Claim Type.md`: `validate_accounts`, `validate_repeating_companies`).

## Business Logic / Calculations

None.

## Lifecycle Hooks (exact)

None (no-op controller).

## Whitelisted / API Methods

None.

## Permissions

None declared at the child-table level (`permissions: []`) — access is governed entirely by the parent doctype's (`Expense Claim Type`) permissions.

## Scheduled Jobs Touching This Doctype

None.

## Port Notes

- This is a pure child/owned-row table in the relational sense: model as `expense_claim_account(parent_expense_claim_type_id FK, company_id FK, default_account_id FK, idx)`. No independent lifecycle or permissions of its own.

## Related Doctypes

- [[Expense Claim Type]] — parent doctype; this child table holds its per-company default account mapping.
