# Job Applicant Source

**Source:** `hrms/hr/doctype/job_applicant_source/job_applicant_source.json`, `job_applicant_source.py`, `job_applicant_source.js`
**Submittable:** no   **Tree:** no   **Naming:** `field:source_name` (document name = the value of the `source_name` field; `source_name` is also `unique: 1`)
**Module:** HR

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| source_name | Source Name | Data | — | yes | — | no | `unique: 1`; `in_list_view`; drives autoname |
| details | Details | Text Editor | — | no | — | no | free-text notes about the source |

## Child Tables

None — Job Applicant Source has no Table fields.

## State Machine

Not applicable. No status/workflow field; this is a pure lookup/reference doctype (e.g. "LinkedIn", "Referral", "Campus", "Walk-in").

## Validation Rules (exact, in execution order)

None. The controller class body is `pass`. The only enforced rule is the JSON-level `unique: 1` + `reqd: 1` constraint on `source_name` (framework/database-enforced, not controller code).

## Business Logic / Calculations

None.

## Lifecycle Hooks (exact)

No lifecycle methods are defined (controller body is `pass`).

## Whitelisted / API Methods

None defined on this doctype's controller or module file.

## Permissions

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| System Manager | yes | yes | yes | yes | n/a | n/a | n/a | yes | yes | email, print, share also granted |
| HR User | yes | yes | yes | no | n/a | n/a | n/a | no | no | no delete/report/export/email/print/share granted |
| HR Manager | yes | yes | yes | yes | n/a | n/a | n/a | yes | yes | email, print, share also granted |

## Scheduled Jobs Touching This Doctype

None.

## Port Notes

- `autoname: "field:source_name"` — same "name is a natural key" caveat as [[Job Opening Template]] (see [[Naming and Autoname Rules]]): renaming a source in true Frappe semantics renames the record identity and cascades to all links. Verify whether the target stack needs an equivalent rename-cascade for any `Job Applicant.source` (or similarly-named) link field — that field lives on [[Job Applicant]], owned by another agent, but is the primary consumer of this doctype.
- `quick_entry: 1` in the JSON enables Frappe's lightweight "Quick Entry" creation dialog (just `source_name` prompted) instead of the full form — a UI/UX detail, not a data-layer rule, but worth replicating as a lightweight "add new source inline" affordance since this doctype exists mainly to be picked from a dropdown while filling out a Job Applicant.
- `allow_import: 1` permits bulk import via Frappe's Data Import tool — no special server logic beyond standard CRUD to replicate.
- Frappe automatic behaviors relied on implicitly: `creation`/`modified`/`modified_by`/`owner` audit columns; `sort_field`/`sort_order` = `creation DESC` for default list ordering; `editable_grid: 1` is a UI setting (allows inline grid editing in list views) with no data-layer implication.
- No cross-doctype controller logic (overrides/controllers/hooks) references `Job Applicant Source` anywhere in `hrms/overrides/`, `hrms/controllers/`, or `hrms/hooks.py` — its only consumer relationship is as a Link-field option source for `Job Applicant.source` (and a dashboard chart `hrms/hr/dashboard_chart/job_applicant_source/job_applicant_source.json`, and the `Job Application` web form), both outside this agent's scope.

## Related Doctypes

- [[Job Applicant]] — the sole consumer; `Job Applicant.source` links to a Job Applicant Source record.
