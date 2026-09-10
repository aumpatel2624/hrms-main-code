# Interview Type

**Source:** `hrms/hr/doctype/interview_type/interview_type.json`, `interview_type.py`, `interview_type.js`
**Submittable:** no   **Tree:** no   **Naming:** By fieldname — `autoname: "field:interview_type_name"` (the document's `name` is set to the value of `interview_type_name`, which is also marked `unique: 1`).
**Module:** HR

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| interview_type_name | Interview Type Name | Data | — | no (`reqd` not set, but implicitly required by `autoname: field:` — Frappe requires the naming field to be filled) | — | no | `unique: 1`; supplies the document `name` |
| interviewers | Interviewers | Table MultiSelect | [[Interviewer]] (child) | no | — | no | see Child Tables |
| *(column_break_3)* | — | Column Break | — | — | — | — | |
| expected_average_rating | Expected Average Rating | Rating | — | no | — | no | target/benchmark rating for this round |
| *(expected_skills_section)* | — | Section Break | — | — | — | — | |
| designation | Designation | Link | Designation | no | — | no | when set, restricts this Interview Type to applicants/interviews of that Designation (enforced in [[Job Applicant]]'s `create_interview` / `schedule_interview` and [[Interview]]'s `validate_designation`) |
| expected_skill_set | Expected Skillset | Table | [[Expected Skill Set]] (child) | yes (`reqd: 1`) | — | no | see Child Tables |
| *(section_break_xlzv)* | — | Section Break | — | — | — | — | |
| description | Description | Text | — | no | — | no | |

## Child Tables

- `interviewers` -> **Interviewer** child doctype (module-scoped, simple — no separate file per assignment; documented in full in [[Interviewer]]). Table MultiSelect field type: in the Frappe UI this renders as a multi-select tag input rather than a grid, but the underlying storage is an ordinary child table row per selected User.
- `expected_skill_set` -> **Expected Skill Set** child doctype ([[Expected Skill Set]]). Not separately assigned in this port batch; inlined here since it is simple and module-scoped:

  | Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
  |---|---|---|---|---|---|---|---|
  | skill | Skill | Link | [[Skill]] | yes (`reqd: 1`) | — | no | |
  | description | Description | Small Text | — | no | — | no | `fetch_from: skill.description` |

  Populated client-side (see below) from the selected Designation's own skill list.

## State Machine

Not submittable, no `status`/`workflow_state` field. N/A.

## Validation Rules (exact, in execution order)

The Python controller (`InterviewType(Document)`) defines no `validate`, no custom methods — body is `pass`. All constraints are structural (JSON-level `reqd`/`unique`) or enforced by other doctypes that reference Interview Type (`Interview.validate_designation`, `Job Applicant.create_interview`/`schedule_interview` — see `Job Applicant.md` and `Interview.md`). No `frappe.throw` calls originate from this file's controller.

Client-side only (`interview_type.js`), flagged per spec instructions as needing a server-side equivalent if this behavior must be guaranteed regardless of client:
1. On changing `designation` in the form, the client fetches the full Designation document and repopulates `expected_skill_set` with one row per skill on that Designation (`designation.skills`), clearing any existing rows first. **This is a client-only convenience default with no server-side enforcement** — nothing prevents `expected_skill_set` from containing skills unrelated to the chosen Designation, or from being left stale after a Designation change via the API. A port should decide whether to enforce/re-derive this server-side (e.g. on save) or leave it as a UI-only default, matching current behavior only if intentionally replicating this gap.

## Business Logic / Calculations

None. No computed/derived fields.

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| (none) | Controller has no lifecycle methods beyond the inherited no-ops | none |

No cross-doctype hooks in `hrms/hooks.py` reference Interview Type directly.

## Whitelisted / API Methods

| Method name | HTTP-equivalent purpose | Args | Returns | What it does |
|---|---|---|---|---|
| `create_interview` | POST — build (not save) an Interview doc from this Interview Type | `docname: str` | New (unsaved) Interview `Document` | Loads the Interview Type. Creates a new Interview with `interview_type = interview_type.name`, `designation = interview_type.designation`. IF the Interview Type has any `interviewers` rows, resets `interview.interview_details = []` then appends one `interview_details` row per interviewer (`{"interviewer": d.user}`) for each row in `interview_type.interviewers`. Returns the unsaved document (client then routes to the new, unsaved Interview form via `frappe.model.sync`). |

## Permissions

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes (if_owner, permlevel, etc) |
|---|---|---|---|---|---|---|---|---|---|---|
| HR User | yes | yes | yes | yes | — | — | — | yes | yes | also `email`, `print`, `share` |
| HR Manager | yes | yes | yes | yes | — | — | — | yes | yes | also `email`, `print`, `share` |
| Interviewer | yes | yes | yes | yes | — | — | — | yes | yes | also `email`, `print`, `share`, and `select: 1` (can be picked in Link fields but with reduced list visibility per Frappe's `select` permission semantics) |

Not submittable — submit/cancel/amend columns not applicable.

## Scheduled Jobs Touching This Doctype

None. No `scheduler_events` entries reference Interview Type.

## Port Notes

- **Interview Round merge (v16 patch):** Frappe HRMS previously had a separate "Interview Round" doctype. A migration patch, `hrms/patches/v16_0/merge_interview_round_with_interview_type.py`, merges it into Interview Type: `execute()` checks `frappe.db.has_table("Interview Round")`; if that table exists, for every `(name, interview_type)` pair in the old Interview Round table where `interview_type != interview_round` and both are truthy, it calls `rename_doc("Interview Type", interview_type, interview_round)` — i.e. it renames the surviving Interview Type record to match the old Interview Round's name/identity, effectively collapsing the two into one doctype keyed by what used to be the Interview Round's name. Confirmed via directory listing: there is **no** separate `interview_round/` folder under `hrms/hr/doctype/` in the current codebase — only `interview_type/` exists. A port targeting a fresh install does not need to replicate the Interview Round doctype at all; this note is purely historical/migration context in case existing production data still carries the old naming.
- `autoname: field:interview_type_name` means the natural/business key IS the primary key in Frappe's model. In a relational port, either make `interview_type_name` the primary key directly, or use a surrogate PK with a `UNIQUE NOT NULL` constraint on `interview_type_name` and treat rename-of-name as a cascading update to all FKs that reference it by name (Frappe's `rename_doc` mechanism, used by the very patch above, is exactly this cascading rename — must be replicated as an explicit multi-table update or avoided by switching all downstream doctypes to reference a surrogate id instead of the name string).
- `track_changes: 1` in the JSON — Frappe auto-maintains a version/audit history of field changes (see [[Implicit Framework Behaviors]]). Must be built explicitly (e.g. an audit/history table capturing before/after values per save) if required in the new stack.
- The Table MultiSelect field type (`interviewers`) is functionally an ordinary one-to-many child table (`Interviewer` rows with `parent` = this Interview Type's name) with a different widget in Frappe Desk — no special backend modeling is needed beyond a normal child table.

## Related Doctypes

- [[Interviewer]] — child table (`interviewers`) of default interviewer rows for this type.
- [[Expected Skill Set]] — child table (`expected_skill_set`) of skills assessed for this round.
- [[Interview]] — created from an Interview Type via `create_interview`; fetches `designation`/`expected_average_rating` from it.
- [[Job Applicant]] — `create_interview`/`schedule_interview` build Interviews against a chosen Interview Type.
