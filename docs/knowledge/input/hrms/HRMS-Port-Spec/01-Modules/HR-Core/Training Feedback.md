# Training Feedback

**Source:** `hrms/hr/doctype/training_feedback/training_feedback.json`, `training_feedback.py`, `training_feedback.js`
**Submittable:** yes   **Tree:** no   **Naming:** `HR-TRF-.YYYY.-.#####` (naming_rule "Expression (old style)" — same naming-series pattern style as Training Result, e.g. `HR-TRF-2026-00001`)
**Module:** HR

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| employee | Employee | Link | [[Employee Core Model|Employee]] | Yes (reqd) | — | No | `in_global_search`, `in_standard_filter` |
| employee_name | Employee Name | Read Only | — | No | — | Yes | `fetch_from: employee.employee_name`; `in_global_search` |
| department | Department | Link | Department | No | — | Yes | `fetch_from: employee.department` |
| course | Course | Data | — | No | — | Yes | `fetch_from: training_event.course` |
| column_break_3 | — | Column Break | — | — | — | — | layout only |
| training_event | Training Event | Link | [[Training Event]] | Yes (reqd) | — | No | `in_standard_filter` |
| event_name | Event Name | Data | — | No | — | Yes | `fetch_from: training_event.event_name`; shown in list view |
| trainer_name | Trainer Name | Data | — | No | — | Yes | `fetch_from: training_event.trainer_name`; shown in list view |
| section_break_6 | — | Section Break | — | — | — | — | layout only |
| feedback | Feedback | Text | — | Yes (reqd) | — | No | free-text feedback body |
| amended_from | Amended From | Link | [[Training Feedback]] | No | — | Yes | `no_copy`, `print_hide`; standard amendment field |

## Child Tables

None.

## State Machine

Submittable doctype (see [[Submittable Document Lifecycle]]); standard docstatus lifecycle only (Draft -> Submitted -> Cancelled -> Amend). No independent status field on this doctype itself — but submitting/cancelling this document DOES drive the `status` field on a *different* doctype's row (`Training Event Employee`, matched by `training_event`+`employee`).

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Submitted: submit (validate: Training Event submitted, employee is a participant, attendance != Absent; on_submit sets matching Training Event Employee.status = Feedback Submitted)
    Submitted --> Cancelled: cancel (on_cancel sets matching Training Event Employee.status back to Completed)
    Cancelled --> Submitted: amend (new Draft, then submitted; re-runs on_submit)
```

Plain list:
| From State | Event | To State | Guard Condition |
|---|---|---|---|
| Draft | submit | Submitted | linked Training Event is submitted (`docstatus == 1`); this `employee` exists as a row in that Training Event's `employees` table; that row's `attendance != "Absent"` |
| Submitted | cancel | Cancelled | standard Frappe cancel; `on_cancel` unconditionally attempts to reset the matched `Training Event Employee.status` to `Completed` if a match is found |
| Cancelled | amend | new Draft | standard Frappe amend; re-submitting re-validates and re-runs `on_submit` |

## Validation Rules (exact, in execution order)

Executed inside `validate()`, in this exact order:

1. Load the linked Training Event: `training_event = frappe.get_doc("Training Event", self.training_event)`.
2. IF `training_event.docstatus != 1` THEN `frappe.throw(_("{0} must be submitted").format(_("Training Event")))` -> exact rendered message: `"Training Event must be submitted"` (source: `validate`).
3. Look up the attendee row: `emp_event_details = frappe.db.get_value("Training Event Employee", {"parent": self.training_event, "employee": self.employee}, ["name", "attendance"], as_dict=True)`.
4. IF `not emp_event_details` (no such attendee row found for this employee on this Training Event) THEN `frappe.throw(_("Employee {0} not found in Training Event Participants.").format(frappe.bold(self.employee_name)))` -> exact rendered message (with `frappe.bold` markup around the employee name): `"Employee <b>{employee_name}</b> not found in Training Event Participants."`
5. IF `emp_event_details.attendance == "Absent"` THEN `frappe.throw(_("Feedback cannot be recorded for an absent Employee."))` -> exact message: `"Feedback cannot be recorded for an absent Employee."`

Framework-level: `employee`, `training_event`, `feedback` are mandatory.

## Business Logic / Calculations

None (no computed/derived numeric fields on this doctype).

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| validate | Steps 1–5 above, in exact order (load Training Event -> must be submitted -> find matching attendee row -> must exist -> attendance must not be Absent) | none (only reads `Training Event` and `Training Event Employee`) |
| on_submit | `employee = frappe.db.get_value("Training Event Employee", {"parent": self.training_event, "employee": self.employee})` (fetches just the row `name`); IF `employee` (truthy, i.e. found) THEN `frappe.db.set_value("Training Event Employee", employee, "status", "Feedback Submitted")` | direct DB write to `Training Event Employee.status = "Feedback Submitted"` for the matching row |
| on_cancel | Same lookup pattern as on_submit; IF found THEN `frappe.db.set_value("Training Event Employee", employee, "status", "Completed")` | direct DB write to `Training Event Employee.status = "Completed"` for the matching row |

Both `on_submit` and `on_cancel` use `frappe.db.set_value` (a direct, single-column DB write that bypasses the target child row's own `validate`/save hooks and does not update its `modified`/`modified_by` audit trail the same way a full document save would... actually `frappe.db.set_value` in Frappe DOES update `modified`/`modified_by` by default, but does NOT trigger the parent Training Event's own `on_update` or `validate`). Confirm this generic Frappe semantic if reproducing an equivalent "partial column update without triggering full save cascade" primitive in the new stack.

## Whitelisted / API Methods

None defined in `training_feedback.py`.

## Permissions

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes (if_owner, permlevel, etc) |
|---|---|---|---|---|---|---|---|---|---|---|
| HR Manager | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | also `email`, `print`, `share` = 1 |
| Employee | 1 | 1 | 1 | — | 1 | — | — | 1 | 1 | can create/read/write/submit/report/export/email/print/share their own (and, per this permissions array, apparently ANY) Training Feedback record — **no `if_owner` restriction is present in the JSON**, so as configured this role is not scoped to "only their own" at the DocType-permission level (a separate mechanism, such as a permission query condition hook, would be needed to restrict Employees to only their own records; none was found for this doctype in `hrms/hooks.py` — flag as a gap/likely-relies-on-something-external rather than assuming it's safely scoped) |
| HR User | 1 | 1 | — | — | — | — | — | 1 | — | no create/delete/submit/cancel/amend/print/email/share/export |

## Scheduled Jobs Touching This Doctype

None found in `hrms/hooks.py`.

## Related Doctypes

- [[Employee Core Model|Employee]] — via `employee`: `in_global_search`, `in_standard_filter`
- [[Training Event]] — via `training_event`: `in_standard_filter`

## Port Notes

- **Employee-role scoping gap:** the `Employee` role has broad create/read/write/submit rights on Training Feedback with no `if_owner` flag in the permissions array and no matching `has_permission`/permission-query-conditions override found under `hrms/hooks.py` or in this doctype's own `.py` for Training Feedback specifically. A literal port of "exactly what's in this repo" would NOT scope Employees to only their own feedback records at the data-access layer purely from this doctype's declared permissions — if the live system does scope it, that logic lives elsewhere (e.g. a global Employee-role permission query condition applied to many doctypes) and is out of scope for this file; call this out explicitly to whichever agent/owner covers global permission-query-condition hooks, and do not assume/invent an `if_owner` restriction here.
- `frm.add_fetch(...)` calls in `training_feedback.js` (`onload`) are pure UI convenience duplicating the JSON's own `fetch_from` declarations for `course`, `event_name`, `trainer_name` — no additional client-only business rule beyond what the schema's `fetch_from` already declares; nothing extra to port server-side here.
- The `on_cancel` "revert status to Completed" behavior assumes the attendee's status was `Feedback Submitted` only because of this exact feedback document; if multiple Training Feedback documents could ever exist for the same (training_event, employee) pair (blocked implicitly for the *submitted* case by the validate flow only insofar as... actually nothing in `validate()` prevents creating a second Training Feedback for the same employee+event even after the first was submitted — there's no uniqueness constraint across `training_event`+`employee` on this doctype), cancelling one could incorrectly flip status back to `Completed` even if another feedback for the same pair is still submitted. This is a real, undocumented edge case in the source; do not silently fix it — flag it, and preserve the same behavior (last on_submit/on_cancel wins, no cross-document awareness) unless the port owner explicitly wants to add a uniqueness guard.
- Standard Frappe submittable-doctype behaviors relied on implicitly: naming-series counter (`HR-TRF-.YYYY.-.#####`), `amended_from` chain, automatic `modified`/`modified_by`/`owner`/`creation` timestamp columns needed on every doctype table in a port (this doctype has no explicit `track_changes: 1`, so no extended version history is guaranteed here beyond the base audit columns).
