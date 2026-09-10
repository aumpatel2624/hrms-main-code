# Grievance Type

**Source:** `hrms/hr/doctype/grievance_type/grievance_type.json`, `grievance_type.py`, `grievance_type.js`
**Submittable:** no   **Tree:** no   **Naming:** `autoname: "Prompt"` (`naming_rule: "Set by user"` — the user types the document name/ID directly at creation time; no auto-numbering). `allow_rename: 1` (the name/primary key can be renamed after creation).
**Module:** HR

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| *(section_break_5)* | — | Section Break | — | — | — | — | layout only |
| description | Description | Text | — | no | — | no | |

`quick_entry: 1` (this doctype supports Frappe's "Quick Entry" minimal-fields creation dialog). `sort_field`: `creation` DESC. `index_web_pages_for_search: 1`.

Since `autoname` is `Prompt`, the document's primary-key/`name` value itself is a free-text user-entered field (effectively the "Grievance Type" name, e.g. "Harassment", "Workplace Safety") — in a relational port this is the natural-key/label column of this lookup table (see Port Notes on how to model this).

## Child Tables

None.

## State Machine

Not submittable — no docstatus/status state machine. Standard CRUD lifecycle only (create / read / update / rename / delete).

## Validation Rules (exact, in execution order)

None. The controller class body is `pass` — no `validate`, no custom checks of any kind.

## Business Logic / Calculations

None.

## Lifecycle Hooks (exact)

None — no methods are overridden on the `GrievanceType(Document)` controller class at all (body is literally `pass`).

## Whitelisted / API Methods

None.

## Permissions

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| System Manager | yes | yes | yes | yes | n/a | n/a | n/a | yes | yes | share, email, print all 1 |
| HR Manager | yes | yes | yes | yes | n/a | n/a | n/a | yes | yes | share, email, print all 1 |
| HR User | yes | yes | yes | yes | n/a | n/a | n/a | yes | yes | share, email, print all 1 |
| Employee | yes | no | no | no | n/a | n/a | n/a | yes | yes | share, email, print 1 (read-only lookup access) |

Not submittable, so Submit/Cancel/Amend columns are not applicable (no such rights exist in the JSON `permissions` array for this doctype).

## Scheduled Jobs Touching This Doctype

None found in `hrms/hooks.py`.

## Related Doctypes

- [[Employee Grievance]] — consumer via its `grievance_type` Link field.

## Port Notes

- **`autoname: "Prompt"` / `allow_rename: 1`**: this is a simple master/lookup table where the primary key is a user-typed string (not a system-generated code). In a relational port, model this as a table with a unique text primary key (or a surrogate integer PK plus a unique `name`/`title` column if the target ORM/framework does not support natural-string PKs well) plus the `description` text column. Renaming in Frappe updates the `name` value everywhere it's referenced (including on `Employee Grievance.grievance_type` foreign-key values) — a new stack must decide whether to use a surrogate ID with a separate mutable label, or a true natural-key rename-cascade, to reproduce this behavior; using a surrogate ID (avoiding rename-cascade complexity) is the simpler, still-faithful choice for most stacks, but it is worth calling out explicitly since Frappe's real behavior is a cascading rename of the natural key.
- **No business logic at all**: this is the simplest possible doctype in the assigned set — a two-column lookup table (name + description) with only permission and quick-entry framework features layered on.
- **`quick_entry: 1`**: purely a UI/UX affordance in Frappe (a lightweight modal for creating a record with just the mandatory/important fields) — no server-side behavior difference; no port equivalent required unless the target UI wants the same convenience.
