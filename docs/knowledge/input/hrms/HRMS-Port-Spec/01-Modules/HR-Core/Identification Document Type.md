# Identification Document Type

**Source:** `hrms/hr/doctype/identification_document_type/identification_document_type.json`, `identification_document_type.py`, `identification_document_type.js`
**Submittable:** no   **Tree:** no   **Naming:** `autoname: "field:identification_document_type"` — document `name` is set directly to the value of the `identification_document_type` field
**Module:** HR

## Schema

`editable_grid: 1`, `quick_entry: 1`, `sort_field: creation`, `sort_order: DESC`.

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| identification_document_type | Identification Document Type | Data | — | No (`reqd` not set) | — | No | `unique: 1`. Autoname source — becomes the document's `name`. Not in list view, not marked required despite being the sole field and the naming source (see Port Notes). |

## Child Tables

None.

## State Machine

Not applicable.

## Validation Rules (exact, in execution order)

The controller class (`IdentificationDocumentType`) has no methods beyond the auto-generated type stub — `pass` is the entire body. **No custom server-side validation.** Only framework-level constraint: `unique: 1` on `identification_document_type` rejects duplicate values.

Client script (`identification_document_type.js`) implements only an empty `refresh` handler — no logic to port.

## Business Logic / Calculations

None. Simple master list (e.g. "Passport", "National ID", "Driver's License") referenced from `Travel Request.personal_id_type` (this module) and from the Employee master's identification-document fields (ERPNext core, out of scope).

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| (none) | — | None found. |

## Whitelisted / API Methods

None.

## Permissions

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| System Manager | Yes | Yes | Yes | Yes | — | — | — | Yes | Yes | `email: 1`, `share: 1`, `print: 1` also set. Only role listed — no HR Manager/HR User row exists for this doctype in source. |

## Scheduled Jobs Touching This Doctype

None found in `hrms/hooks.py`.

## Related Doctypes

- [[Travel Request]] — consumer via its `personal_id_type` Link field.

## Port Notes

- **`identification_document_type` field is not marked `reqd: 1`** even though it is both the sole visible field and the `autoname` source. In Frappe, `autoname: "field:X"` implicitly requires `X` to be set at save time (the framework raises its own naming error if the field is empty when trying to derive the document name) even without an explicit `reqd` flag on the field. A port must therefore still enforce "value required" as an effective validation rule, sourced from the `autoname` mechanism rather than a `reqd` flag — do not skip this check just because `reqd` is absent from the JSON.
- **Only `System Manager` has permissions** — unlike the sibling master `Purpose of Travel` (also System-Manager-only) and unlike `Employee Health Insurance`/`Employee Grade` (which grant HR Manager/HR User access), this doctype has no HR Manager or HR User permission row in source. This is intentional per the JSON as read — do not add HR roles unless corroborated elsewhere.
- **Frappe framework behaviors relied on implicitly**: `autoname: "field:identification_document_type"` (PK = user-entered text, uniqueness enforced by the `unique` constraint + naming collision check); no `allow_rename` set (defaults to not renameable — once created, the name/value pair cannot be changed via the standard rename dialog, unlike `Employee Grade`/`Employee Health Insurance` which do set `allow_rename: 1`); no `track_changes` set (defaults to off — no automatic version history for this doctype, unlike most siblings in this module).
