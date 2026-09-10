# Job Opening Template

**Source:** `hrms/hr/doctype/job_opening_template/job_opening_template.json`, `job_opening_template.py`, `job_opening_template.js`
**Submittable:** no   **Tree:** no   **Naming:** `field:template_title` (document name = the value of the `template_title` field; `template_title` is also `unique: 1`, so effectively acts as a natural key)
**Module:** HR

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| template_title | Template Title | Data | — | yes | — | no | `unique: 1`; `in_list_view`; drives autoname |
| department | Department | Link | Department | no | — | no | `in_list_view` |
| designation | Designation | Link | Designation | no | — | no | — |
| *(column_break_wkcr)* | | Column Break | | | | | layout only |
| employment_type | Employment Type | Link | [[Employment Type]] | no | — | no | — |
| location | Location | Link | Branch | no | — | no | — |
| *(pay_details_section "Pay Details")* | | Section Break | | | | | group heading |
| currency | Currency | Link | Currency | no | — | no | — |
| upper_range | Upper Range | Currency | — | no | — | no | `non_negative` |
| lower_range | Lower Range | Currency | — | no | — | no | `non_negative` |
| *(column_break_vqyu)* | | Column Break | | | | | layout only |
| salary_per | Salary Paid Per | Select | `Month`, `Year` | no | `Month` | no | — |
| publish_salary_range | Publish Salary Range | Check | — | no | `0` | no | — |
| *(section_break_dwfh)* | | Section Break | | | | | group heading |
| description | Description | Text Editor | — | no | — | no | — |

## Child Tables

None — Job Opening Template has no Table fields.

## State Machine

Not applicable. No `status`/`workflow_state` field exists on this doctype; it is a static reusable template record with no lifecycle of its own.

## Validation Rules (exact, in execution order)

None. The controller class body is `pass` — there is no `validate()` or any other override. The only enforced rule is the JSON-level `unique: 1` constraint on `template_title` (uniqueness is enforced by the framework/database, not by controller code) and `reqd: 1` on `template_title`.

## Business Logic / Calculations

None on the doctype itself. The only logic is in the module-level whitelisted mapped-doc function (below), which copies field values into a new Job Opening — it performs no calculation, only field copying.

## Lifecycle Hooks (exact)

No lifecycle methods are defined (controller body is `pass`).

## Whitelisted / API Methods

| Method name | HTTP-equivalent purpose | Args | Returns | What it does |
|---|---|---|---|---|
| `create_job_opening_from_template` (module-level function) | "Create Job Opening" mapped-doc action from a template | `source: str | Document` (the Job Opening Template's name or doc) | New (unsaved) [[Job Opening]] Document | Creates a new `Job Opening` via `get_mapped_doc` from the source template, with field map `name → job_opening_template` (i.e., the new Job Opening records which template it came from). Additionally sets `target_doc.job_title = source_doc.designation`. Because `get_mapped_doc`'s default behavior (with no explicit `field_map` entries for the other shared fields) still copies same-named fields when both doctypes define them, `department`, `designation`, `employment_type`, `location`, `currency`, `upper_range`, `lower_range`, `salary_per`, `publish_salary_range`, and `description` are copied across automatically since both doctypes share those exact fieldnames — this is standard `get_mapped_doc` behavior, not an explicit field_map entry, so a port must replicate "copy all identically-named fields" as the default mapping semantic, not just the two fields explicitly named in `field_map`. |

## Permissions

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| System Manager | yes | yes | yes | yes | n/a | n/a | n/a | yes | yes | email, print, share also granted |
| HR Manager | yes | yes | yes | yes | n/a | n/a | n/a | no | no | no report/export/email/print/share granted |
| HR User | yes | yes | yes | no | n/a | n/a | n/a | no | no | no delete/report/export/email/print/share granted |

## Scheduled Jobs Touching This Doctype

None.

## Port Notes

- `autoname: "field:template_title"` means the primary key/document name literally IS the `template_title` value (not a generated code) — renaming the template's title in a Frappe-native rebuild would rename the record's identity; a port using a surrogate ID plus a unique `template_title` column achieves equivalent behavior for query/display purposes, but be aware any code that treats "name" as immutable would break under true Frappe semantics (renaming a doc changes all its links) — check whether the target stack needs a rename-cascade to `Job Opening.job_opening_template` link values.
- The client script (`job_opening_template.js`) adds a "Create Job Opening" button on saved (non-new) records that calls `create_job_opening_from_template` — pure UI convenience, no additional business rule to port beyond the whitelisted function itself.
- No field on this doctype is fetched from elsewhere and no field feeds elsewhere except via the explicit mapped-doc copy in `create_job_opening_from_template`.
- Frappe automatic behaviors relied on implicitly: `creation`/`modified`/`modified_by`/`owner` audit columns; `sort_field`/`sort_order` = `creation DESC` for default list ordering; `grid_page_length: 50` and `rows_threshold_for_grid_search: 20` are UI/grid display settings only, not data-layer concerns.

## Related Doctypes

- [[Job Opening]] — created from this template via `create_job_opening_from_template`; also linkable back via `Job Opening.job_opening_template`.
- [[Employment Type]] — copied onto the new Job Opening as a default.
