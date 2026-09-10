# Travel Request Costing

**Source:** `hrms/hr/doctype/travel_request_costing/travel_request_costing.json`, `travel_request_costing.py`
**Submittable:** no   **Tree:** no   **Naming:** child table — no `autoname` (standard Frappe child-row hash naming)
**Module:** HR

## Schema

`istable: 1` (child table only, used as `costings` field on `Travel Request`). `editable_grid: 1`, `quick_entry: 1`, `track_changes: 1`, `sort_field: creation`, `sort_order: DESC`.

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| expense_type | Expense Type | Link | [[Expense Claim Type]] | No | — | No | In list view. |
| *(column_break_2)* | — | Column Break | — | — | — | — | Layout only. |
| sponsored_amount | Sponsored Amount | Currency | `options: "Company:company:default_currency"` (dynamic currency resolved via the row's — actually the *parent transaction's* — `company` field, per Frappe's `DocType:fieldname:default_currency`-style dynamic currency-options convention) | No | — | No | In list view. `non_negative: 1`. |
| funded_amount | Funded Amount | Currency | `options: "Company:company:default_currency"` | No | — | No | In list view. `non_negative: 1`. |
| total_amount | Total Amount | Currency | `options: "Company:company:default_currency"` | No | — | No | In list view. `non_negative: 1`. Despite the name, **not computed** anywhere in source — see Business Logic below. |
| *(section_break_4)* | — | Section Break | — | — | — | — | Layout only. |
| comments | Comments | Small Text | — | No | — | No | — |

## Child Tables

None (no Table fields of its own).

## State Machine

Not applicable.

## Validation Rules (exact, in execution order)

The controller class (`TravelRequestCosting`) has no methods beyond the auto-generated type stub — `pass` is the entire body. **No server-side validation exists.** The only enforced rules are the framework-level `non_negative: 1` constraints on `sponsored_amount`, `funded_amount`, and `total_amount` (each independently rejects negative input; there is no cross-field check).

## Business Logic / Calculations

**None exists in source, despite the field name implying one.** There is no code anywhere in this doctype's controller (or in `Travel Request`'s controller) that computes `total_amount = sponsored_amount + funded_amount`, or that rolls these child-row amounts up into any total on the parent `Travel Request`. This is flagged explicitly per the ground rules: a developer would reasonably expect `total_amount` to be a derived sum, but the source neither computes it server-side nor (per the empty `travel_request.js` and absence of a `travel_request_costing.js` file) client-side. Treat `total_amount` as a plain manually-entered Currency field unless corroborated otherwise; do not invent a summation formula.

`options: "Company:company:default_currency"` on the three Currency fields is Frappe's dynamic-currency mechanism: it resolves the display currency by reading a field named `company` (looked up on the *parent* document, since this child table has no `company` field of its own) and using that Company's `default_currency`. In a port, this means: the currency/precision for these three amount fields is inherited from `Travel Request.company` (which itself is `fetch_from: "employee.company"`, see `Travel Request.md`) — replicate as "resolve display currency from parent.company.default_currency" rather than a fixed currency.

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| (none) | — | None. |

## Whitelisted / API Methods

None.

## Permissions

`permissions: []` — pure child table; access governed by the parent `Travel Request`'s permissions (see `Travel Request.md`).

## Scheduled Jobs Touching This Doctype

None found in `hrms/hooks.py`.

## Related Doctypes

- [[Expense Claim Type]] — via `expense_type`: In list view.

## Port Notes

- **`total_amount` is not auto-computed** — see Business Logic. This is the single most important gap to flag for a re-implementer, since the field name strongly suggests a derived value.
- **Dynamic currency via `Company:company:default_currency`** depends on a `company` field existing on the *parent* transaction (`Travel Request.company`), not on this child row — a port must resolve currency/rounding precision through the parent record, not locally.
- **Frappe framework behaviors relied on implicitly**: `non_negative: 1` field-level constraints (framework validates automatically on save — must be built as an explicit check in a new stack); Currency-field auto-rounding to the resolved currency's precision (Frappe rounds Currency fields to the linked currency's decimal places automatically on save — must be built explicitly); `track_changes: 1` automatic audit trail (tracked as part of parent Travel Request's version history); standard child-table `parent`/`parentfield`/`parenttype`/`idx` bookkeeping.
