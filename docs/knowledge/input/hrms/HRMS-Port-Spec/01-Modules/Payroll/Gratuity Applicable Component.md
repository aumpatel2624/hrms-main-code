# Gratuity Applicable Component

**Source:** `hrms/payroll/doctype/gratuity_applicable_component/gratuity_applicable_component.json`, `gratuity_applicable_component.py`
**Submittable:** no (child table, `istable: 1`)   **Tree:** no   **Naming:** child-table row naming (Frappe auto-generated internal `name`)
**Module:** Payroll

Child table of `Gratuity Rule` (field `applicable_earnings_component`, rendered as a Table MultiSelect widget in the UI). Each row names one Salary Component whose amount, when present on an employee's most recent submitted Salary Slip, is included in the "total applicable earnings" base figure used by the gratuity calculation.

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| salary_component | Salary Component | Link | [[Salary Component]] | yes | — | no | `in_list_view`; per JSON description on the parent field, "Salary components should be part of the Salary Structure." (advisory only — not enforced by code, see Port Notes) |

`quick_entry: 1`. `track_changes: 1`. `permissions: []` — inherits access from parent `Gratuity Rule`.

## Child Tables

N/A — leaf child table.

## State Machine

Not submittable, no status field.

## Validation Rules (exact, in execution order)

Controller class (`gratuity_applicable_component.py`) is a bare `pass` — **no validation logic of any kind in this doctype's own controller.** No duplicate-row check, no check that the linked Salary Component is actually of type "Earning" and actually present in the employee's/company's Salary Structure (despite the descriptive text suggesting it should be).

Framework-level: `salary_component` is `reqd` (a row cannot be saved with a blank Link).

## Business Logic / Calculations

No calculation logic lives on this doctype itself. Its rows are read by `Gratuity.get_applicable_components()`:

```
get_applicable_components():
  1. applicable_earning_components = pluck("salary_component") from all
     "Gratuity Applicable Component" rows WHERE parent = <this Gratuity's gratuity_rule>
  2. IF empty -> THROW "No applicable Earning components found for Gratuity Rule: {rule}"
  3. RETURN the list of salary_component names
```

This list is then used as a filter in `Gratuity.get_total_component_amount()` (see `Gratuity.md`): the employee's most recent submitted Salary Slip's `earnings` child-table rows are scanned, and any row whose `salary_component` is IN this list has its `default_amount` summed into `total_component_amount` — the base figure multiplied by the slab fraction and years of service to produce the final gratuity amount.

## Lifecycle Hooks (exact)

None — controller class body is `pass`.

## Whitelisted / API Methods

None.

## Permissions

No doctype-level `permissions` array entries (`permissions: []`). Access inherited from the parent `Gratuity Rule` document.

## Scheduled Jobs Touching This Doctype

None.

## Port Notes

- **Modeled in Frappe as a "Table MultiSelect"** (the parent field `applicable_earnings_component` has `fieldtype: "Table MultiSelect"`), which the Frappe UI renders as tag-style multi-select input over a child table whose only meaningful field is a single Link. Functionally this is equivalent to a many-to-many join table between `Gratuity Rule` and `Salary Component`. In a relational port, this can be modeled either as (a) a true child-row table with `parent` FK + `idx`, matching the underlying Frappe storage exactly, or (b) simplified to a straightforward join table `gratuity_rule_salary_component(gratuity_rule_id, salary_component_id)` since no row possesses additional data or ordering-dependent behavior (unlike `Gratuity Rule Slab`, row order here is not consumed by any algorithm — `get_applicable_components` uses `pluck` with no `order_by`). Recommend option (b) for a clean generic-RDBMS design, but document that the source system stores it as an ordered child table.
- **No enforcement of the "must be an Earning-type component that is part of the Salary Structure" description**: this is purely descriptive text in the parent doctype's JSON (`"description": "Salary components should be part of the Salary Structure."`) — no client or server code filters the `salary_component` Link's dropdown to Earning-type components, nor checks that the component is actually used on any Salary Structure. Contrast with `Gratuity.salary_component` and `Retention Bonus.salary_component`, both of which DO have client-side `frm.set_query` filters restricting to `type: "Earning"`. This asymmetry should be preserved (no filter here) unless the target system wants to proactively fix it — flag as a known gap rather than silently adding a filter.
- **No duplicate-row prevention**: nothing stops the same `salary_component` being added twice to one Gratuity Rule; if duplicated, `get_total_component_amount` would still only sum each matching Salary Slip earning row once (the earnings loop is driven by the Salary Slip's rows, not by this list, and a Salary Slip typically has at most one row per component), so a duplicate here is functionally harmless but wastes a row — no need to add a uniqueness constraint to stay faithful, though a new implementation MAY add one without behavior change.

## Related Doctypes

- [[Gratuity Rule]] — parent doctype; this is its `applicable_earnings_component` Table MultiSelect child table, listing the components that count toward the gratuity earnings base.
- [[Salary Component]] — linked via `salary_component`; each row names one component considered "applicable earnings" for gratuity purposes.
- [[Gratuity]] — reads this table (`get_applicable_components()`) to filter which [[Salary Slip]] earning rows are summed into `total_component_amount`.
- [[Retention Bonus]] — sibling doctype whose own `salary_component` field applies a client-side Earning-type filter that this doctype's field notably lacks (see Port Notes).
