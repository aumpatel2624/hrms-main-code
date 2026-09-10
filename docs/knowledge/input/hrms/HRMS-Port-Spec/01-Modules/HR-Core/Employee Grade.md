# Employee Grade

**Source:** `hrms/hr/doctype/employee_grade/employee_grade.json`, `employee_grade.py`, `employee_grade.js`, `employee_grade_dashboard.py`
**Submittable:** no   **Tree:** no   **Naming:** `autoname: "Prompt"` (`naming_rule: "Set by user"`) — user types the grade name (e.g. "Grade A") directly as the document name when creating the record
**Module:** HR

## Schema

`allow_import: 1`, `allow_rename: 1`, `editable_grid: 1`, `index_web_pages_for_search: 1`, `track_changes: 1`, `sort_field: creation`, `sort_order: DESC`.

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| default_salary_structure | Default Salary Structure | Link | [[Salary Structure]] | No | — | No | Client-side query filter (see Port Notes) restricts choices to submitted (`docstatus: 1`), active (`is_active: "Yes"`) Salary Structures — not enforced server-side. |
| default_base_pay | Default Base Pay | Currency | `options: "currency"` (uses the sibling `currency` field for the currency symbol/precision) | No | — | No | `depends_on: "default_salary_structure"` (only shown/relevant once a structure is chosen). `non_negative: 1`. |
| currency | Currency | Link | Currency | No | — | Yes | Hidden. `fetch_from: "default_salary_structure.currency"` — auto-populated from the linked Salary Structure's currency. |

## Child Tables

None.

## State Machine

Not applicable (non-submittable master).

## Validation Rules (exact, in execution order)

The controller class (`EmployeeGrade`) has no methods beyond the auto-generated type stub — `pass` is the entire body. **No custom server-side validation exists.** The only enforced rules come from field-level schema constraints: `default_base_pay` is `non_negative: 1` (framework-level check rejects negative values), and `currency` is `read_only: 1` with `fetch_from` (framework overwrites it from the linked Salary Structure on save, ignoring any client-submitted value).

Client script (`employee_grade.js`) implements two `set_query` filters that are **UI-only and not enforced server-side**:
1. `default_salary_structure` query filter: `{docstatus: 1, is_active: "Yes"}` — restricts the link-field picker to only submitted, active Salary Structures. **Flag: a port needs an equivalent server-side validation** (e.g. reject save if `default_salary_structure` is set but the referenced Salary Structure is not submitted/active) since nothing currently enforces this outside the browser dropdown.
2. `default_leave_policy` query filter: `{docstatus: 1}`. **This field does not exist anywhere in the doctype's JSON `fields`/`field_order` array** — the client script references a field that is not part of the current schema. This is either dead/stale client code from a removed field, or a field defined elsewhere (e.g. via a Property Setter/customization not present in this repo). Flagged as a discrepancy — do not port a `default_leave_policy` field unless corroborated by another source; do not silently invent it.

## Business Logic / Calculations

None beyond the `fetch_from` auto-population described above (not a calculation, a direct copy).

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| (none) | — | None found in this doctype's controller. |

## Whitelisted / API Methods

None.

## Permissions

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| System Manager | Yes | Yes | Yes | Yes | — | — | — | Yes | Yes | `email: 1`, `share: 1`, `print: 1` also set. |
| HR Manager | Yes | Yes | Yes | Yes | — | — | — | Yes | Yes | Same flags as above. |
| HR User | Yes | Yes | Yes | Yes | — | — | — | Yes | Yes | Same flags as above. |

(Not submittable — Submit/Cancel/Amend not applicable.)

## Scheduled Jobs Touching This Doctype

None found in `hrms/hooks.py`. `Employee Grade` does appear in `hrms/hooks.py`'s `global_search_doctypes["Default"]` list (index 37) — this only affects global-search indexing/ranking, not scheduled processing.

## Related Doctypes

- [[Salary Structure]] — via `default_salary_structure`: Client-side query filter (see Port Notes) restricts choices to submitted (`docstatus: 1`), active (`is_active: "Yes"`) Salary Structures — not enforced server-side.

## Port Notes

- **Dashboard / linked-document map** (`employee_grade_dashboard.py::get_data()`): defines the "Connections" panel shown on the Employee Grade form in the Frappe desk UI. It groups links as: transaction group 1 → `["Employee", "Leave Period"]`; transaction group 2 → `["Employee Onboarding Template", "Employee Separation Template"]`. This is purely a UI affordance (which doctypes link back to this Employee Grade via a Link field) — it implies Employee, Leave Period, Employee Onboarding Template, and Employee Separation Template all have a Link field pointing at Employee Grade, but does not itself enforce or compute anything. No server-side logic to port beyond ensuring the equivalent doctypes in the new stack have a foreign key to Employee Grade if a similar "related records" view is desired.
- **`default_leave_policy` client-script reference with no matching field** — see Validation Rules above. Do not add this field to the schema without independent confirmation; call this out to stakeholders as a likely stale/orphaned reference in the source `employee_grade.js`.
- **Frappe framework behaviors relied on implicitly** (see [[Naming and Autoname Rules]] and [[Implicit Framework Behaviors]]): `autoname: "Prompt"` / `naming_rule: "Set by user"` means the primary key is freely typed by the user at creation (must build explicit "insert with caller-supplied PK, reject duplicates" semantics); `allow_rename: 1` permits later PK renames that cascade to all Link references (e.g. every Employee/Salary Structure Assignment pointing at this grade) — this cascade must be built explicitly in a relational port; `track_changes: 1` gives automatic version/audit history for free in Frappe.
- Employee Grade is consumed elsewhere in the HRMS codebase (e.g. Salary Structure Assignment default lookups, Employee master `grade` field) — those consumers are out of scope for this file (owned by their respective doctype specs) but should be cross-referenced when building the relational schema (`Employee Grade` as an FK target).
