# Training Program

**Source:** `hrms/hr/doctype/training_program/training_program.json`, `training_program.py`, `training_program.js`
**Submittable:** no   **Tree:** no   **Naming:** `field:training_program` (document name = value of the `training_program` field, must be unique)
**Module:** HR

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| training_program | Training Program | Data | — | Yes (reqd) | — | No | `unique`; used as the document name (autoname `field:training_program`); shown in list view |
| status | Status | Select | `Scheduled`, `Completed`, `Cancelled` | No | `Scheduled` | No | `allow_on_submit`; bold in UI; shown in list view. Note: this doctype is NOT submittable, so `allow_on_submit` has no functional effect here (dead flag) |
| column_break_3 | — | Column Break | — | — | — | — | layout only |
| company | Company | Link | Company | Yes (reqd) | — | No | shown in list view |
| section_break_5 | — | Section Break | — | — | — | — | layout only |
| trainer_name | Trainer Name | Data | — | No | — | No | |
| trainer_email | Trainer Email | Data | — | No | — | No | |
| column_break_8 | — | Column Break | — | — | — | — | layout only |
| supplier | Supplier | Link | Supplier | No | — | No | |
| contact_number | Contact Number | Data | — | No | — | No | |
| section_break_11 | — | Section Break | — | — | — | — | layout only |
| description | Description | Text Editor | — | Yes (reqd) | — | No | rich text (HTML) |
| amended_from | Amended From | Link | [[Training Program]] | No | — | Yes | `no_copy`, `print_hide`; standard Frappe amendment-tracking field. Since this doctype is not submittable, amendment is not actually usable — field exists but is vestigial |

## Child Tables

None.

## State Machine

Not submittable — there is no Draft/Submitted/Cancelled docstatus lifecycle for this doctype.

`status` is a plain Select field with values `Scheduled` (default), `Completed`, `Cancelled`. No controller code (`training_program.py` contains only `pass`) sets or transitions this value — it is set purely by direct user edit via the form. There is no automatic state machine to reproduce; a port only needs to store whichever value the user picks.

## Validation Rules (exact, in execution order)

None. `training_program.py`'s `TrainingProgram` class body is `pass` — no `validate`, no custom checks beyond the schema-declared `reqd`/`unique` constraints (`training_program`, `company`, `description` are mandatory; `training_program` must be unique — both enforced generically by the Frappe framework, not by custom code).

## Business Logic / Calculations

None.

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| (none) | Controller class body is `pass` — no overridden lifecycle methods | none |

## Whitelisted / API Methods

None defined in `training_program.py`.

## Permissions

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes (if_owner, permlevel, etc) |
|---|---|---|---|---|---|---|---|---|---|---|
| HR Manager | 1 | 1 | 1 | 1 | — | — | — | 1 | 1 | also `email`, `print`, `share` = 1 |
| HR User | 1 | 1 | — | — | — | — | — | 1 | — | no create/delete/print/email/share |

## Scheduled Jobs Touching This Doctype

None found in `hrms/hooks.py`.

## Related Doctypes

- [[Training Event]] — consumer via its `training_program` Link field; this doctype's status is rolled up from its linked Training Events.

## Port Notes

- `training_program_dashboard.py` only wires the "Training Events" linked-document count into the Frappe desk dashboard widget (links `Training Event.training_program` back to this doc) — no business logic, purely a UI convenience; a port only needs a query "find Training Events where training_program = this program" if it wants an equivalent dashboard count.
- Autoname `field:training_program` means the primary key/document name IS the free-text `training_program` value the user types (not a system-generated code). A port must enforce uniqueness on this field as it doubles as the row's identifier, and must not allow renaming to collide with another program (`allow_rename: 1` is set, meaning the name/PK can be changed later by a permitted user — this is a Frappe rename operation that cascades to all Link fields pointing at "Training Program" by name; a port on a different stack should model `training_program` as a natural-language unique business key, or introduce a surrogate ID and keep `training_program` as a separate unique display field, understanding that renames in the original system update all referencing Training Event rows' `training_program` link value transparently).
- `status`'s `allow_on_submit: 1` flag is inert here since `is_submittable` is not set on this doctype — likely a leftover/copy-paste artifact from a similar doctype. Do not port any submit-workflow implication for it.
- `track_changes: 1` — Frappe automatically keeps a version/audit history of every field change on this doctype. A port must build an explicit audit/version log table if this history is required.
- No JS business logic (`training_program.js` only registers an empty form handler `frappe.ui.form.on("Training Program", {})`), so there is nothing client-side to replicate server-side.
