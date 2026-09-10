# Employee Onboarding Template

**Source:** `hrms/hr/doctype/employee_onboarding_template/employee_onboarding_template.json`, `employee_onboarding_template.py`, `employee_onboarding_template.js`, `employee_onboarding_template_dashboard.py`
**Submittable:** no   **Tree:** no   **Naming:** `autoname: "HR-EMP-ONT-.#####"` (prefix `HR-EMP-ONT-` + 5-digit auto-incrementing counter, e.g. `HR-EMP-ONT-00001`; no year segment)
**Module:** HR

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| title | Title | Data | — | Yes | — | No | `in_list_view`, `translatable: 1`. Also the `title_field` and `show_title_field_in_link: 1` (link fields display this instead of the auto-name). |
| company | Company | Link | Company | No | — | No | |
| department | Department | Link | Department | No | — | No | `in_list_view`. Client script filters this field's picker to `company == frm.doc.company`. |
| designation | Designation | Link | Designation | No | — | No | *(column_break_7)* `in_list_view`. |
| employee_grade | Employee Grade | Link | [[Employee Grade]] | No | — | No | `in_list_view`. |
| activities | Activities | Table | [[Employee Boarding Activity]] | No | — | No | *(section_break_7, labeled "Activities")* — see `Employee Boarding Activity.md`. |

The controller class body is `pass` — no server-side logic beyond the auto-generated type stubs.

## Child Tables

- `activities` → `Employee Boarding Activity` (documented fully in `Employee Boarding Activity.md`). When `parenttype` is `Employee Onboarding Template`, the child's `required_for_employee_creation` field is shown (per its `depends_on` condition, which includes both `Employee Onboarding` and `Employee Onboarding Template` as parenttypes) but has no functional meaning at the template level — it is only acted on by `Employee Onboarding.validate_employee_creation()`, i.e. it is simply carried through when activities are copied from template to transaction.

## State Machine

Not submittable — no docstatus state machine. No custom `status`/`workflow_state` field exists on this doctype.

## Validation Rules (exact, in execution order)

None. The Python controller (`EmployeeOnboardingTemplate(Document)`) has no `validate()` override — `pass` only. All field-level constraints are limited to the schema-declared `reqd: 1` on `title` (Frappe's generic mandatory-field check).

## Business Logic / Calculations

None.

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| (none) | No custom Python hooks defined on this doctype. | None. |

Dashboard link (`employee_onboarding_template_dashboard.py`, non-functional metadata only, drives the "Connections" panel in the desk UI): declares that documents of type `Employee Onboarding` linking back via the `employee_onboarding_template` fieldname should be shown as a related transaction. This is a UI convenience with no server-side enforcement or side effect — a port need not replicate it unless reproducing that UI panel.

## Whitelisted / API Methods

None defined on this doctype's controller or module file. (It is consumed via the shared `get_onboarding_details(parent, parenttype)` whitelisted function documented in `Employee Onboarding.md`, passing `parenttype="Employee Onboarding Template"`.)

## Permissions

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| System Manager | Yes | Yes | Yes | Yes | — | — | — | Yes | Yes | Also `email:1`, `print:1`, `share:1`. Not submittable so submit/cancel/amend N/A. |
| HR User | Yes | Yes | Yes | No | — | — | — | Yes | No | No delete/export. |
| HR Manager | Yes | Yes | Yes | Yes | — | — | — | Yes | Yes | |

No `if_owner` or `permlevel` restrictions present in the JSON.

## Scheduled Jobs Touching This Doctype

None.

## Related Doctypes

- [[Employee Grade]] — via `employee_grade`: `in_list_view`.
- [[Employee Boarding Activity]] — via `activities`: *(section_break_7, labeled "Activities")* — see `Employee Boarding Activity.md`.

## Port Notes

- `naming_rule` key is absent from this JSON (only `autoname` is set); see [[Naming and Autoname Rules]]. Frappe infers the naming style from the `autoname` pattern (`"HR-EMP-ONT-.#####"` → simple incrementing counter with fixed prefix, no date component). A port should implement this as a persistent counter (e.g., a dedicated sequence or counter row) scoped globally to this doctype (not per-company or per-year).
- `track_changes: 1` — implicit audit trail via Frappe's Version mechanism; a port needs an explicit audit log table to reproduce history if required.
- `show_title_field_in_link: 1` + `title_field: "title"` — when this doctype is referenced from a Link field elsewhere (e.g. `Employee Onboarding.employee_onboarding_template`), the UI shows `title` instead of the raw `name`/autoname. This is purely a display convention; the actual foreign-key value stored is still the auto-generated `name`.
- `quick_entry` is NOT set on this doctype (only on `Employee Separation`, `Employee Transfer`, `Employee Promotion`) — no notable behavioral difference besides the desk "Quick Entry" dialog availability, which is UI-only.
- Company-scoped fixture handling: `hooks.py` lists `"Employee Onboarding Template"` under `company_data_to_be_ignored`, meaning when a Company record is deleted/renamed, Frappe's generic "delete linked company data" cleanup routine explicitly skips cascading into this doctype. A port should ensure deleting a Company does NOT cascade-delete or orphan-check Employee Onboarding Template rows referencing that company (i.e., no FK-cascade delete should be wired for this relationship, mirroring the ignore-list intent — though the FK itself remains and a stale `company` link could persist).
