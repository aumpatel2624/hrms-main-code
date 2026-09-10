# Employee Health Insurance

**Source:** `hrms/hr/doctype/employee_health_insurance/employee_health_insurance.json`, `employee_health_insurance.py`, `employee_health_insurance.js`
**Submittable:** no   **Tree:** no   **Naming:** `autoname: "field:health_insurance_name"` — the document's `name` is set directly to the value of `health_insurance_name` (must be unique; enforced by the field's `unique: 1` constraint plus Frappe's `field:` autoname mechanism)
**Module:** HR

## Schema

`document_type: "Document"` (standalone master, not a child table despite the name; it is used as an option-source doctype referenced from Employee's health-insurance child table in ERPNext core). `allow_rename: 1`, `quick_entry: 1`, `title_field: health_insurance_name`, `track_changes: 1`, `sort_field: creation`, `sort_order: DESC`.

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| health_insurance_name | Health Insurance Name | Data | — | Yes | — | No | In list view. `unique: 1`. Also the autoname source and title field — this value becomes the document's `name`. |

## Child Tables

None.

## State Machine

Not applicable (non-submittable master).

## Validation Rules (exact, in execution order)

The controller class (`EmployeeHealthInsurance`) has no methods beyond the auto-generated type stub — `pass` is the entire body. **No custom server-side validation.** The only enforced rule is the framework-level uniqueness constraint on `health_insurance_name` (from `unique: 1`), and the standard "required field" check on the same field (from `reqd: 1`).

Client script (`employee_health_insurance.js`) only implements an empty `refresh` handler — no client-side business logic to port.

## Business Logic / Calculations

None. This is a simple lookup/master list (e.g. "Aetna", "Cigna") referenced by employees for their health-insurance provider selection.

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| (none) | — | None found in this doctype's controller. |

## Whitelisted / API Methods

None.

## Permissions

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| HR Manager | Yes | Yes | Yes | Yes | — | — | — | Yes | Yes | `email: 1`, `share: 1`, `print: 1` also set. |
| HR User | Yes | No | No | No | — | — | — | Yes | Yes | `email: 1`, `share: 1`, `print: 1` also set; read-only access. |

(Doctype is not submittable, so Submit/Cancel/Amend columns are not applicable/absent from the permission rows.)

## Scheduled Jobs Touching This Doctype

None found in `hrms/hooks.py`.

## Related Doctypes

- [[Employee Core Model]] — this child table is embedded on the Employee master (per `_Module-Spec.md`'s Doctype List), one row per health insurance policy held by the employee.

## Port Notes

- **Referenced from ERPNext core `Employee`, not from this repo.** This doctype is used as a Link-target/option list for health-insurance data captured on the Employee master (a table field on Employee, e.g. `health_insurance` with a `health_insurance_name` Link and `health_insurance_no` Data field) — that consuming schema lives in ERPNext's `Employee` doctype (`erpnext.setup.doctype.employee.employee`), which is not present in this repository/environment and therefore could not be traced here. When porting, source the Employee-side health-insurance table schema and its validation from ERPNext directly.
- No `doc_events` or `scheduler_events` entries in `hrms/hooks.py` touch "Employee Health Insurance".
- **Frappe framework behaviors relied on implicitly**: `autoname: "field:health_insurance_name"` means the primary key is literally the name text entered by the user (must be built explicitly as "insert with PK = provided name, reject on duplicate PK" in a new stack, respecting the `unique` constraint semantics); `allow_rename: 1` permits later renaming the primary key value, which cascades to all Link references pointing at it (a rename/cascade-update operation must be built explicitly in a relational port, since a natural-key primary key does not get this for free); `track_changes: 1` provides automatic version history.
