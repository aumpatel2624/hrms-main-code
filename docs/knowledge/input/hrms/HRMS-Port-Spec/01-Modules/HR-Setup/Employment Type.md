# Employment Type

**Source:** `hrms/hr/doctype/employment_type/employment_type.json`, `employment_type.py`
**Submittable:** no   **Tree:** no   **Naming:** `field:employee_type_name` (name = value of `employee_type_name`)
**Module:** HR

Simple master/lookup doctype: named categories of employment (e.g. "Full-time", "Contract", "Intern"), linked from `Employee.employment_type` (Employee doctype — see [[Employee Core Model]] — owned by HR-Core agent, referenced by name only).

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| employee_type_name | Employment Type | Data | - | yes | - | - | `unique`; used as document name (`autoname: field:employee_type_name`); `in_list_view` |

`allow_rename: 1`, `translated_doctype: 1` (label supports Frappe's UI translation layer — not schema-relevant for a port beyond noting the value may need an i18n lookup table if multi-language display names are required), `show_name_in_global_search: 1`.

## Child Tables

None.

## State Machine

Not applicable — no submittable lifecycle, no status field.

## Validation Rules (exact, in execution order)

None — controller is `class EmploymentType(Document): pass`. Only framework-level `unique` constraint on `employee_type_name` applies.

## Business Logic / Calculations

None.

## Lifecycle Hooks (exact)

None (no-op controller).

## Whitelisted / API Methods

None.

## Permissions (see [[Permission Model (RBAC)]])

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| HR User | yes | yes | yes | yes | - | - | - | yes | - | |
| HR Manager | yes | yes | yes | yes | - | - | - | yes | yes | also `import: 1` |

## Scheduled Jobs Touching This Doctype

None.

## Related Doctypes

- [[Employee Core Model]] — `Employee.employment_type` links to this doctype by name; renaming an `Employment Type` record cascades to every referencing Employee record.

## Port Notes

- Naming-by-field (`field:employee_type_name`, see [[Naming and Autoname Rules]]) means the primary key is the human-entered label; renaming cascades to every `Employee.employment_type` reference automatically under Frappe. A port using a surrogate integer/UUID key must instead expose a unique `name`/`code` column and handle rename-cascade (or FK-on-update-cascade) explicitly if it wants the same UX.
