# Designation Skill

**Source:** `hrms/hr/doctype/designation_skill/designation_skill.json`, `designation_skill.py`
**Submittable:** no   **Tree:** no   **Naming:** child table doctype — no `autoname`; generic auto-generated row `name` plus `parent`/`parentfield`/`parenttype`. `istable: 1`.
**Module:** HR

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| skill | Skill | Link | [[Skill]] | no (`reqd` key absent → not required at the JSON/schema level) | — | no | `in_list_view: 1` |

`field_order`: `["skill"]` — single-field child table.

`editable_grid: 1`.

## Child Tables

N/A — this is itself a child table with no nested Table fields.

## State Machine

Not submittable, no status field. Lifecycle is entirely bound to its parent document.

## Validation Rules (exact, in execution order)

`designation_skill.py` controller body is `class DesignationSkill(Document): pass` — **no custom validation code**.

No mandatory-field constraint applies at the schema level either, since `skill` does **not** have `reqd: 1` here (unlike the `skill` field on `Employee Skill`, `Skill Assessment`, and `Expected Skill Set`, all of which do require it). This asymmetry is real in source — flagged per ground rules rather than corrected.

## Business Logic / Calculations

None.

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| (none) | Controller class body is `pass`. | none |

## Whitelisted / API Methods

None.

## Permissions

`"permissions": []` — governed entirely by whichever parent doctype embeds this table via a `Table` field (in this repo, no parent doctype under `hrms/hr/doctype` was found referencing `Designation Skill` as a Table field's `options`; the only found reference is `employee_skill_map.js`'s client script reading `designation.skills`, implying the parent is the `Designation` doctype, which lives outside this repo's source tree — see Port Notes).

## Scheduled Jobs Touching This Doctype

None found in `hrms/hooks.py`.

## Related Doctypes

- [[Skill]] — via `skill`: `in_list_view: 1`

## Port Notes

- **Parent doctype not present in this repo:** A repo-wide search (`hrms/hrms/**`) found no `Designation` doctype folder under `hrms/hr/doctype` (or anywhere else in this repo) that declares a `Table` field with `options: "Designation Skill"`. The only evidence of how this child table is consumed is in `hrms/hr/doctype/employee_skill_map/employee_skill_map.js`, which calls `frappe.db.get_doc("Designation", frm.doc.designation)` and iterates `designation.skills` (each row exposing a `.skill` property), then uses that to populate `Employee Skill Map.employee_skills`. This strongly implies `Designation` (defined in another Frappe app/core, not in this `hrms` repo) has a child-table field named `skills` whose `options` is `Designation Skill`. **A re-implementer must source the `Designation` doctype's schema from elsewhere** (e.g. Frappe HR's core/ERPNext `Designation` doctype) to confirm the exact fieldname (`skills`) and field order on that parent — this spec cannot fabricate that doctype's definition since it is out of scope/not found in this repo.
- `track_changes: 1` is set — child-row versioning tied to whatever parent it's embedded in.
- `quick_entry: 1` — UI convenience only.
- No `description` or other metadata field exists on this child row despite `Skill` master having a `description` field — contrast with `Expected Skill Set` (below), which does fetch `skill.description` into its own row. This is a genuine asymmetry in source, not an omission by this spec.
