# Job Requisition

**Source:** `hrms/hr/doctype/job_requisition/job_requisition.json`, `job_requisition.py`, `job_requisition.js`, `job_requisition_list.js`
**Submittable:** no   **Tree:** no   **Naming:** `naming_series:` — series field `naming_series`, options `HR-HIREQ-` (single option; autoname pattern `HR-HIREQ-.####` style auto-increment behind the naming series)
**Module:** HR

## Schema

Field order per JSON `field_order`. Section/Column Break/Tab Break rows are noted as group markers only.

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| naming_series | Naming Series | Select | `HR-HIREQ-` | no | — | no | Drives autoname |
| designation | Designation | Link | Designation | yes | — | no | `in_list_view`; title field |
| department | Department | Link | Department | no | — | no | — |
| *(column_break_qkna)* | | Column Break | | | | | layout only |
| no_of_positions | No of. Positions | Int | — | yes | — | no | `non_negative`; `in_list_view` |
| expected_compensation | Expected Compensation | Currency | — | yes | — | no | `non_negative`; `options: Company:company:default_currency` (currency derived from linked Company's default currency); `in_list_view` |
| *(column_break_4)* | | Column Break | | | | | layout only |
| status | Status | Select | `Pending`, `Open & Approved`, `Rejected`, `Filled`, `On Hold`, `Cancelled` | yes | — | no | `in_list_view` |
| company | Company | Link | Company | yes | — | no | — |
| *(section_break_7 "Requested By")* | | Section Break | | | | | group heading: Requested By |
| requested_by | Requested By | Link | [[Employee Core Model\|Employee]] | yes | — | no | `in_standard_filter` |
| requested_by_name | Requested By (Name) | Data | — | no | — | yes | fetch_from `requested_by.employee_name`; `in_list_view` |
| *(column_break_10)* | | Column Break | | | | | layout only |
| requested_by_dept | Department | Link | Department | no | — | yes | fetch_from `requested_by.department` |
| requested_by_designation | Designation | Link | Designation | no | — | yes | fetch_from `requested_by.designation` |
| *(timelines_tab "Timelines")* | | Tab Break | | | | | tab heading |
| posting_date | Posting Date | Date | — | yes | `Today` | no | — |
| *(column_break_15)* | | Column Break | | | | | layout only |
| expected_by | Expected By | Date | — | no | — | no | `in_list_view` |
| completed_on | Completed On | Date | — | conditionally | — | no | `depends_on`/`mandatory_depends_on`: `eval:doc.status=="Filled"` (shown and required only when status is Filled) |
| *(job_description_tab "Job Description")* | | Tab Break | | | | | tab heading |
| description | Job Description | Text Editor | — | yes | — | no | fetch_from `designation.description`, `fetch_if_empty` (only pulled in if field is empty; user edits are preserved) |
| reason_for_requesting | Reason for Requesting | Text | — | no | — | no | — |
| time_to_fill | Time to Fill | Duration | — | no | — | yes | `hide_seconds`; computed server-side, see Business Logic |
| *(connections_tab "Connections")* | | Tab Break | | | | | `show_dashboard: 1` — renders linked-doc dashboard (Job Opening via `links`) |

Doctype-level `links`: one entry — [[Job Opening]] linked via field `job_requisition` (drives the "Connections" tab document link count).

## Child Tables

None — Job Requisition has no Table fields.

## State Machine

Not submittable (no Draft/Submitted/Cancelled workflow). Behavior is driven entirely by the `status` Select field, whose allowed values are `Pending`, `Open & Approved`, `Rejected`, `Filled`, `On Hold`, `Cancelled`. There is no controller-enforced transition graph — a user (or another doctype's code) may set `status` to any of these values directly via the form; the only code-driven transition is:

- `Job Opening.update_job_requisition_status()` sets the linked Job Requisition's `status` to `Filled` and `completed_on` to today's date when the associated Job Opening is closed (see `Job Opening.md` Lifecycle Hooks).

Because there is no state-machine guard in `job_requisition.py`, a port should NOT invent restrictions on which status transitions are legal — none are enforced in source beyond the `completed_on` mandatory-when-Filled UI rule.

Plain list of known (from_state, event, to_state) transitions actually driven by code (not user-picklist changes, which are unconstrained):

| From | Event | To | Guard |
|---|---|---|---|
| any | Job Opening linked to this requisition is set to `Closed` (`on_update`) | Filled | `job_requisition` field is set on the Job Opening |

## Validation Rules (exact, in execution order)

`validate()` runs a single step:

1. `set_time_to_fill()`: IF `status == "Filled"` AND `completed_on` is set THEN `time_to_fill = time_diff_in_seconds(completed_on, posting_date)` (seconds between posting_date and completed_on). No `frappe.throw` in this doctype's controller — there are no blocking validations in `job_requisition.py`. (Source: `validate`, `set_time_to_fill`.)

Client-side only (`job_requisition.js`), no server-side equivalent exists — **flagged for port**:

2. `handle_duplicate_check` (client `before_save`): on first save of a new document, calls whitelisted method `check_duplicate_job_requisition`; if a duplicate is found, blocks the save (`frappe.validated = false`) and shows a confirm dialog: `"A Job Requisition already exists for {0} requested by {1} for the same department.<br> Do you want to continue?"` (designation, requested_by). If the user confirms, the client re-submits with a `duplicate_confirmed` flag that skips the check on the next attempt. **This is a soft/overridable warning, not a hard validation, and it exists only in the client script — a server-side port has no enforcement at all today.** A faithful port should decide whether to replicate this as a pure confirmation-gate in application/API-layer code (not a DB constraint), since Frappe's original design allows the user to proceed anyway.

## Business Logic / Calculations

**Time to Fill** (`set_time_to_fill`, called from `validate`):
1. IF `status` is `"Filled"` AND `completed_on` has a value:
   a. `time_to_fill` (Duration field, stored as seconds) = `completed_on` (as timestamp) − `posting_date` (as timestamp), in seconds.
2. ELSE `time_to_fill` is left unchanged (not recalculated/cleared).

**Average Time to Fill** (whitelisted module function `get_avg_time_to_fill`, not a controller method):
1. Build filter `{"status": "Filled"}`.
2. Optionally AND-in `company`, `department`, `designation` filters if passed as arguments.
3. Run `AVG(time_to_fill)` over `Job Requisition` matching the filters.
4. IF the average is truthy, return it formatted via `format_duration()` (human-readable duration string, e.g. "1 day"); ELSE return `0`.

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| validate | `set_time_to_fill()` | none (self only) |

No `before_insert`, `on_update`, `on_submit`, `on_cancel`, `on_trash`, `after_insert` are defined on this controller.

## Whitelisted / API Methods

| Method name | HTTP-equivalent purpose | Args | Returns | What it does |
|---|---|---|---|---|
| `check_duplicate_job_requisition` (instance method) | Pre-save duplicate check | none (uses `self`) | `str` (name of existing doc) or falsy | Runs `frappe.db.exists("Job Requisition", {designation: self.designation, department: self.department, requested_by: self.requested_by, status: not in ["Cancelled","Filled"], name: != self.name})`. Returns the existing matching document's name if found. |
| `associate_job_opening` (instance method) | Link an existing [[Job Opening]] to this requisition | `job_opening: str` | none (raises on failure) | 1) Checks caller has `write` permission on the target Job Opening (`frappe.has_permission(..., throw=True)`) — throws standard Frappe permission error if not. 2) `frappe.db.set_value("Job Opening", job_opening, {"job_requisition": self.name, "vacancies": self.no_of_positions})` (direct DB write, bypasses that doc's own `validate`). 3) `frappe.msgprint` with title `"Job Opening Associated"` and message `"Job Requisition {0} has been associated with Job Opening {1}"` (bold requisition name, link to the Job Opening form). |
| `make_job_opening` (module-level function) | "Create Job Opening" mapped-doc action | `source_name: str`, `target_doc: str | Document | None` | New (unsaved) [[Job Opening]] Document | Uses `get_mapped_doc` from Job Requisition to Job Opening with field map `designation→designation`, `name→job_requisition`, `department→department`, `no_of_positions→vacancies`. Additionally sets on the target: `job_title = designation`, `status = "Open"`, `currency = Company.default_currency` (looked up via `source.company`), `lower_range = expected_compensation`, `description = description`. |
| `get_avg_time_to_fill` (module-level function) | Reporting/dashboard aggregate | `company: str | None`, `department: str | None`, `designation: str | None` | Formatted duration string or `0` | See Business Logic above. |

## Permissions

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| System Manager | yes | yes | yes | yes | n/a | n/a | n/a | yes | yes | email, print, share also granted |
| HR User | yes | no | no | no | n/a | n/a | n/a | no | no | read-only |
| HR Manager | yes | yes | yes | yes | n/a | n/a | n/a | yes | yes | email, print, share also granted |

(Doctype is not submittable, so Submit/Cancel/Amend columns are not applicable/present in the permission rows.)

## Scheduled Jobs Touching This Doctype

None directly. (See `Job Opening.md` for `close_expired_job_openings`, which indirectly updates a Job Requisition's `status`/`completed_on` via `Job Opening.update_job_requisition_status()` whenever a linked Job Opening transitions to Closed — including via that scheduled job.)

## Port Notes

- `naming_series` has only one legal option (`HR-HIREQ-`); the actual generated name is `HR-HIREQ-#####` style Frappe auto-increment behind that series prefix — reproduce as a per-series incrementing counter table (Frappe's naming series counters are global per prefix string, not per-tenant/company), e.g. `HR-HIREQ-00001`. See [[Naming and Autoname Rules]].
- `requested_by_name`, `requested_by_dept`, `requested_by_designation` are "fetch" fields: Frappe auto-populates them from the linked `Employee` (`requested_by`) whenever that link field changes, both client-side and re-verified server-side on save. A port must replicate this fetch-on-change behavior explicitly (it is not automatic in a generic ORM).
- `description` uses `fetch_if_empty`: unlike normal fetch fields, this one only auto-populates when currently blank, so it will NOT silently overwrite user edits if `designation` changes later. Reproduce as "populate from Designation.description only if field is currently empty."
- `expected_compensation`'s `options: "Company:company:default_currency"` is Frappe's dynamic-currency-link idiom — the field's display/precision currency is looked up live from the `company` field's linked Company's `default_currency`. A port needs an explicit join/derivation for this rather than a stored currency code, unless it denormalizes it.
- Standard Frappe automatic behavviors relied on implicitly and not present in the Python/JS: `creation`/`modified`/`modified_by`/`owner` audit columns, `track_changes` is not explicitly set in this JSON (defaults apply per site config) — verify if audit trail (version log) is required and add a change-log table if so.
- `sort_field`/`sort_order` = `creation DESC` — default list ordering to replicate.
- `title_field` = `designation` — used for link-field display and breadcrumb titles; a port's UI should show `designation` as the record's display title, not `name`.
- The duplicate-check `frappe.confirm` dialog (see Validation Rules #2) is a **soft warning only** — Frappe does not block the save if the user clicks through. There is no equivalent server-side hard-stop; if the target stack wants a genuine constraint (e.g. unique per designation+department+requested_by while open), that would be a new invariant not present in the original code — call this out to the developer rather than silently adding it.
- Cross-doctype: [[Employee Referral]] records (in `job_requisition.js` `refresh`) are queried client-side by `for_designation = designation, status = "Pending"` purely to show an informational banner + link on the form; this is UI-only and has no server-side coupling to port as data logic.

## Related Doctypes

- [[Job Opening]] — postings created from/associated with this requisition (`make_job_opening`, `associate_job_opening`); closing the opening cascades this requisition's status to Filled.
- [[Employee Core Model]] — `requested_by` links to the requesting Employee, whose name/department/designation are fetched onto this doctype.
- [[Employee Referral]] — queried client-side (informational only) for pending referrals against the same designation.
