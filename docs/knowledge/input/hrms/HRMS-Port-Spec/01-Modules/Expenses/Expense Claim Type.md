# Expense Claim Type

**Source:** `hrms/hr/doctype/expense_claim_type/expense_claim_type.json`, `expense_claim_type.py`, `expense_claim_type.js`
**Submittable:** no   **Tree:** no   **Naming:** `field:expense_type` (name = value of `expense_type` field)
**Module:** HR

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| expense_type | Expense Claim Type | Data | - | yes | - | - | `unique`; used as document name (`autoname: field:expense_type`) |
| description | Description | Small Text | - | - | - | - | |
| accounts | Accounts | Table | `[[Expense Claim Account]]` | - | - | - | child table, per-company default account mapping |
| deferred_expense_account | Deferred Expense Account | Check | - | - | 0 | - | |

`allow_rename: 1` — renaming this doctype's document (i.e. changing the type name) is permitted.

## Child Tables

- `accounts` -> `Expense Claim Account` (see [[Expense Claim Account]])

## State Machine

Not submittable — no docstatus workflow beyond standard Draft (0) / Cancelled(2, unused since not submittable in practice) framework default. No custom status field.

## Validation Rules (exact, in execution order)

`validate()`:

1. `validate_accounts()` -> for each row `entry` in `accounts`: IF the linked `Account`'s `company` does not equal `entry.company` THEN throw `"Account {0} does not match with Company {1}"` (account, company).
2. `validate_repeating_companies()` -> collects `entry.company` for every row in `accounts`; IF the count of collected companies differs from the count of unique companies (i.e. any company repeats) THEN throw `"Same Company is entered more than once"`.

## Business Logic / Calculations

None — this doctype only maintains a lookup/config table (one default GL account per company for this expense type).

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| `validate` | `validate_accounts()`, `validate_repeating_companies()` | none |

Client script (`expense_claim_type.js`) only wires `Account` field query filters (`account_type` in a fixed list, `company` = row's company, `is_group=0`) — no business logic, UI-only.

## Whitelisted / API Methods

None on this doctype's controller. (Consumed by [[Expense Claim]]'s `get_expense_claim_account` / `get_expense_claim_account_and_cost_center`, documented in `Expense Claim.md`.)

## Permissions

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| HR Manager | yes | yes | yes | - | - | - | - | yes | - | |
| Employee | yes | - | - | - | - | - | - | - | - | read-only |
| HR User | yes | yes | yes | - | - | - | - | - | - | |

## Scheduled Jobs Touching This Doctype

None.

## Port Notes

- `allow_import: 1` — bulk import via Frappe's Data Import tool is enabled; a port should provide an equivalent bulk-load path if needed.
- Naming by field value (`autoname: field:expense_type`) means the primary key IS the human-entered type name; renaming the type name renames the record (and Frappe auto-updates all `Link` references elsewhere, e.g. on [[Expense Claim Detail]]`.expense_type`) — a new stack must either use a surrogate key with a unique constraint on the name and cascade renames explicitly, or preserve name-as-PK semantics.

## Related Doctypes

- [[Expense Claim Account]] — child table mapping one default GL account per company for this expense type.
- [[Expense Claim]] — consumes this doctype via `get_expense_claim_account`/`get_expense_claim_account_and_cost_center` to resolve the default account for a claim line.
- [[Expense Claim Detail]] — each row's `expense_type` field links to this doctype.
