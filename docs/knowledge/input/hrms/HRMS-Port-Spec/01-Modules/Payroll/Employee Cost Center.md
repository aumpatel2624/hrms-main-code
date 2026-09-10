# Employee Cost Center

**Source:** `hrms/payroll/doctype/employee_cost_center/employee_cost_center.json`, `employee_cost_center.py`
**Submittable:** no (child table)   **Tree:** no   **Naming:** row-based (child table)
**Module:** Payroll

Child table used in `Salary Structure Assignment` (owned by another module agent) to split an employee's salary cost across multiple cost centers by percentage. Cross-reference: `Salary Structure Assignment.md`.

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| cost_center | Cost Center | Link | Cost Center | yes | | no | `allow_on_submit: 1` — editable even after parent is submitted |
| percentage | Percentage (%) | Int | | yes | | no | `non_negative: 1`; `allow_on_submit: 1` |

## Business Logic / Calculations

None on this child doctype itself — controller class body is `pass`. No aggregate/sum validation (e.g. "percentages must total 100") exists in this file; if such a check exists it would live in the parent `Salary Structure Assignment` controller (outside this agent's scope — flag for that module's spec to confirm/deny).

## Permissions

None defined (`"permissions": []`) — inherited from parent doctype.

## Related Doctypes

- [[Salary Structure Assignment]] — parent doctype; this child table splits the employee's salary cost across cost centers by percentage.

## Port Notes

- Both fields carry `allow_on_submit: 1`, meaning Frappe permits editing `cost_center`/`percentage` rows on an already-submitted parent document (bypassing the normal "submitted docs are locked" rule) — a port must explicitly allow post-submit mutation of this specific child table while keeping other parent fields locked, if replicating this behavior.
- No validation was found anywhere in this doctype's own `.py` enforcing that `percentage` values across all rows of a parent sum to 100 (or any other constraint) — flagged as a possible gap to verify against the `Salary Structure Assignment` spec (owned by another agent) rather than assumed/invented here.
