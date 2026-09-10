# Employee Separation Template

**Source:** `hrms/hr/doctype/employee_separation_template/employee_separation_template.json`, `employee_separation_template.py`, `employee_separation_template.js`, `employee_separation_template_dashboard.py`
**Submittable:** no   **Tree:** no   **Naming:** `autoname: "HR-EMP-STP-.#####"` (prefix `HR-EMP-STP-` + 5-digit auto-incrementing counter, no year segment)
**Module:** HR

## Schema

Structurally identical to `Employee Onboarding Template` (same field set, same layout), only the doctype name and permission table differ.

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| title | Title | Data | — | Yes | — | No | `in_list_view`, `translatable: 1`. `title_field`, `show_title_field_in_link: 1`. |
| company | Company | Link | Company | No | — | No | |
| department | Department | Link | Department | No | — | No | `in_list_view`. *(no client-side company-scoped filter on this doctype's `.js` — see Port Notes; this differs from Employee Onboarding Template, which does filter department by company.)* |
| designation | Designation | Link | Designation | No | — | No | *(column_break_7)* `in_list_view`. |
| employee_grade | Employee Grade | Link | [[Employee Grade]] | No | — | No | `in_list_view`. |
| activities | Activities | Table | [[Employee Boarding Activity]] | No | — | No | *(section_break_7, labeled "Activities")* — see `Employee Boarding Activity.md`. |

Controller class body is `pass` — no server-side logic.

## Child Tables

- `activities` → `Employee Boarding Activity` (see `Employee Boarding Activity.md`). Rows created under this parenttype have `required_for_employee_creation` hidden in the UI (per that field's `depends_on`, which lists only the Onboarding-side doctypes) and, functionally, that field is never read for anything when the parenttype is Employee Separation Template.

## State Machine

Not submittable; no status field.

## Validation Rules (exact, in execution order)

None. `EmployeeSeparationTemplate(Document)` body is `pass`. Only declarative schema constraint: `title` is `reqd: 1` (generic Frappe mandatory check).

## Business Logic / Calculations

None.

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| (none) | No custom Python hooks. `employee_separation_template.js` only has an empty `refresh: function(frm) {}` handler. | None. |

Dashboard metadata (`employee_separation_template_dashboard.py`) declares `Employee Separation` as a related transaction shown in the desk "Connections" panel via the `employee_separation_template` fieldname — UI-only, no enforcement.

## Whitelisted / API Methods

None on this doctype directly. Consumed via the shared `get_onboarding_details(parent, parenttype)` function (documented in `Employee Onboarding.md`) with `parenttype="Employee Separation Template"`.

## Permissions

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| System Manager | Yes | Yes | Yes | Yes | — | — | — | Yes | Yes | Also `email:1`, `print:1`, `share:1`. |
| HR Manager | Yes | Yes | Yes | Yes | — | — | — | No | No | **Note:** unlike `Employee Onboarding Template`'s HR Manager row (which has `report:1`/`export:1`), this doctype's HR Manager permission row has neither. Verified directly from `employee_separation_template.json`. |
| HR User | Yes | No | No | No | — | — | — | No | No | **Note:** significantly more restrictive than `Employee Onboarding Template`'s HR User row (which has create/write/report). Here HR User has read-only access. |

No `if_owner` or `permlevel` restrictions present in the JSON.

## Scheduled Jobs Touching This Doctype

None.

## Related Doctypes

- [[Employee Grade]] — via `employee_grade`: `in_list_view`.
- [[Employee Boarding Activity]] — via `activities`: *(section_break_7, labeled "Activities")* — see `Employee Boarding Activity.md`.

## Port Notes

- Naming counter (`HR-EMP-STP-.#####`) — same implicit-sequence caveat as `Employee Onboarding Template`; implement as an explicit counter, global to this doctype (no year/company scoping).
- `track_changes: 1` — implicit audit trail; port needs an explicit history table if required.
- `show_title_field_in_link: 1` — display-only convention (Link fields referencing this doctype show `title`, not the raw name).
- **Asymmetry vs. Employee Onboarding Template flagged explicitly (do not assume symmetry when porting):**
  1. No department-company filter in this doctype's client script (Employee Onboarding Template has one; this one does not) — this is a UI-only difference, no server validation is affected either way.
  2. Permission table is materially different/more restrictive for both HR User and HR Manager roles versus its Onboarding counterpart (see Permissions table above) — a port MUST implement these two doctypes' access control separately rather than assuming they mirror each other.
- Company fixture handling: `hooks.py`'s `company_data_to_be_ignored` list includes `"Employee Separation Template"` alongside `"Employee Onboarding Template"` — deleting/renaming a Company should not cascade-delete these template records; same caveat as noted in `Employee Onboarding Template.md`.
