# Leave Period

**Source:** `hrms/hr/doctype/leave_period/leave_period.json`, `leave_period.py`, `leave_period.js`
**Submittable:** no   **Tree:** no   **[[Naming and Autoname Rules|Naming]]:** `HR-LPR-.YYYY.-.#####` (naming series: prefix `HR-LPR-`, current 4-digit year, then a 5-digit auto-incrementing counter reset per series key, e.g. `HR-LPR-2026-00001`)
**Module:** HR

## Schema

Full field table, in JSON `field_order`:

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| from_date | From Date | Date | — | Yes (`reqd`) | — | No | `in_list_view: 1`; must be strictly before `to_date` (server-enforced) |
| to_date | To Date | Date | — | Yes (`reqd`) | — | No | `in_list_view: 1`; must be strictly after `from_date` (server-enforced) |
| is_active | Is Active | Check | — | No | 0 | No | Used elsewhere (e.g. `Leave Policy Assignment` client script filters `leave_period` link query to `is_active: 1`) |
| (column_break_3) | — | Column Break | — | — | — | — | layout only |
| company | Company | Link | Company | Yes (`reqd`) | — | No | `in_list_view: 1`; used as the overlap-check scope key |
| optional_holiday_list | Holiday List for Optional Leave | Link | Holiday List | No | — | No | — |

`track_changes: 1`. `search_fields: "from_date, to_date, company"` (used for quick-search UI, not a business rule).

## Child Tables

None.

## State Machine

Not submittable — no docstatus workflow. No custom `status`/`workflow_state` field.

## Validation Rules (exact, in execution order)

`validate()` calls, in order: `validate_dates()` -> `validate_overlap(self, self.from_date, self.to_date, self.company)` (imported from `hrms.hr.utils`).

1. **`validate_dates`**: IF `getdate(self.from_date) >= getdate(self.to_date)` -> `frappe.throw(_("To date can not be equal or less than from date"))` (source: `validate_dates`). Note: this is a `>=` check, i.e. `from_date == to_date` is also rejected (period must span at least 1 day beyond from_date, i.e. `to_date > from_date` strictly).
2. **`validate_overlap`** (source: `hrms.hr.utils.validate_overlap`, generic overlap-check utility shared by other doctypes): builds a query against the `Leave Period` table itself, excluding the current document by name (if the document is new/unsaved, its `name` is temporarily set to the string `"New Leave Period"` purely to make the `!=` name-exclusion comparison well-defined). The overlap condition, via `get_doc_condition` for `doctype == "Leave Period"`:
   `(table.company == company) AND (table.from_date BETWEEN from_date AND to_date OR table.to_date BETWEEN from_date AND to_date OR (table.from_date < from_date AND table.to_date > to_date))`
   IF any other Leave Period row for the same `company` matches that condition -> `throw_overlap_error` is called, which raises:
   `frappe.throw(_("A {0} exists between {1} and {2} (").format(doc.doctype, formatdate(from_date), formatdate(to_date)) + ' <b><a href="/app/Form/{doctype}/{overlap_doc}">{overlap_doc}</a></b>' + _(") for {0}").format(exists_for))`
   where `exists_for` is the `company` value (since Leave Period has no `employee` field, the `doc.get("employee")` branch is skipped and `exists_for = company`). In plain words: "A Leave Period exists between <from_date> and <to_date> (<link to overlapping doc>) for <company>." (source: `validate_overlap` / `throw_overlap_error` in `hrms/hr/utils.py`).

## Business Logic / Calculations

None — this doctype stores a date range plus scoping fields; no numeric computation.

## [[Cross-Doctype Hooks (doc_events)|Lifecycle Hooks]] (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| validate | `validate_dates`, `validate_overlap` (see Validation Rules) | Reads other `Leave Period` rows only; no writes to other doctypes |

`Leave Period` also appears in `hrms/hooks.py` `company_data_to_be_ignored` list — this only affects Frappe's "Delete Company" cascading-cleanup behavior (records of this doctype are NOT auto-deleted/reassigned when a Company is deleted via the standard company-deletion utility); it is a framework-level admin behavior, not application business logic. A port should decide explicitly how `Leave Period` rows behave when their referenced Company is deleted (e.g. restrict-delete vs. orphan-allow), since Frappe's original behavior here is "leave them untouched."

## Whitelisted / API Methods

None defined on this controller or a dedicated module file for Leave Period.

## Permissions

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| System Manager | Yes | Yes | Yes | Yes | — | — | — | Yes | Yes | `email`, `print`, `share` also 1 |
| HR Manager | Yes | Yes | Yes | Yes | — | — | — | Yes | Yes | `email`, `print`, `share` also 1 |
| HR User | Yes | Yes | Yes | Yes | — | — | — | Yes | Yes | `email`, `print`, `share` also 1 |

(No `if_owner` or `permlevel` restrictions present in the JSON. No Employee read access, unlike `Leave Type`.)

## Scheduled Jobs Touching This Doctype

None found referencing `Leave Period` in `hrms/hooks.py` `scheduler_events`.

## Related Doctypes

- [[Leave Policy Assignment]] — `leave_period` Link field on that doctype; client-side link-query restricts selection to `is_active: 1` and matching `company`.
- [[Leave Application]] — used when the leave type is Optional Leave, to find the period's `optional_holiday_list`.
- [[Leave Allocation]] — `leave_period` Link field; scopes an allocation to this date range.
- [[Leave Encashment]] — `leave_period` Link field.
- [[Leave Control Panel]] — `leave_period` Link field, one of its date-resolution modes.

## Port Notes

- `autoname: HR-LPR-.YYYY.-.#####` is a Frappe "naming series" pattern: `.YYYY.` expands to the current 4-digit year at creation time, `.#####.`-style tokens (`#####`) auto-increment a persistent counter keyed by the literal prefix string (here effectively per calendar year, since the year is embedded in the key). A port must implement an equivalent sequence generator keyed by `"HR-LPR-<year>-"` that persists across restarts (Frappe stores this in a `Series` table keyed by the prefix-with-year).
- The client script's `from_date` change handler (`leave_period.js`) auto-fills `to_date` to `from_date + 12 months - 1 day` when `to_date` is empty. This is CLIENT-SIDE ONLY convenience/default-value logic; the server does not replicate or enforce this default, so a port only needs to reproduce it in the UI layer if desired — it is not a data-integrity rule.
- The client script's `onload` handler references `frm.set_query("department", ...)` filtering by `company` — this refers to a `department` field that does NOT exist in this doctype's schema (dead/stale code, likely leftover from a template). Flagging this explicitly per ground rules: no `department` field exists on `Leave Period`; this client code branch is effectively a no-op and should NOT be ported.
- `track_changes: 1` requires an audit/version history mechanism in the new stack, as with other doctypes (see `Leave Type` Port Notes for detail — same framework behavior applies here).
- Standard Frappe auto-fields (`creation`, `modified`, `modified_by`, `owner`, `idx`) apply here as well and must be added explicitly as system columns in the new schema.
