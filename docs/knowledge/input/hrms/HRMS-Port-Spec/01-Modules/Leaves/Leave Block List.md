# Leave Block List

**Source:** `hrms/hr/doctype/leave_block_list/leave_block_list.json`, `leave_block_list.py`, `leave_block_list.js`
**Submittable:** no   **Tree:** no   **[[Naming and Autoname Rules|Naming]]:** `field:leave_block_list_name` (document name = value of the `leave_block_list_name` field, must be unique)
**Module:** HR

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| `leave_block_list_name` | Leave Block List Name | Data | — | Yes | — | No | Unique; used as document name (autoname `field:leave_block_list_name`) |
| `company` | Company | Link | Company | Yes | — | No | `remember_last_selected_value: 1` |
| `applies_to_all_departments` | Applies to Company | Check | — | No | `0` | No | Description: "If not checked, the list will have to be added to each Department where it has to be applied." |
| *(Section Break: "Block Days")* `block_days` | Block Days | Section Break | — | — | — | — | Section heading only; description "Stop users from making Leave Applications on following days." groups the fields below |
| `leave_block_list_dates` | Leave Block List Dates | Table | [[Leave Block List Date]] | Yes | — | No | Child table — see below |
| *(Section Break: "Allow Users")* `allow_list` | Allow Users | Section Break | — | — | — | — | Section heading only; description "Allow the following users to approve Leave Applications for block days." groups the field below |
| `leave_block_list_allowed` | Leave Block List Allowed | Table | [[Leave Block List Allow]] | No | — | No | Child table — see below |
| `column_break_4` | — | Column Break | — | — | — | — | Pure layout, skipped |
| `leave_type` | Leave Type | Link | [[Leave Type]] | No | — | No | If set, this block list only applies to leave applications of this Leave Type (see cross-reference logic below) |
| `add_day_wise_dates` | Add Day-wise Dates | Button | — | — | — | — | Client-only button; opens a dialog (see Lifecycle Hooks / Port Notes) that calls the `set_weekly_off_dates` whitelisted method |

## Child Tables

- `leave_block_list_dates` -> child doctype `Leave Block List Date` — see `Leave Block List Date.md`
- `leave_block_list_allowed` -> child doctype `Leave Block List Allow` — see `Leave Block List Allow.md`

## State Machine

Not submittable. No `status`/`workflow_state` field. No state machine.

## Validation Rules (exact, in execution order)

Executed inside `validate()`:

1. Iterate `self.leave_block_list_dates` in table row order, accumulating a `dates` list of `block_date` values seen so far. For each row `d`: IF `d.block_date` is already present in the `dates` list accumulated from prior rows THEN `frappe.msgprint(_("Date is repeated") + ":" + d.block_date, raise_exception=1)` — i.e. the message thrown is the string `"Date is repeated" + ":" + <block_date value>` (concatenation, no space around the colon), raised as an exception (source: `validate`, `leave_block_list.py`). This check compares each row's date only against dates from earlier rows already added to the list, then appends the current row's date to the list regardless of match — so a true duplicate always triggers on the second (or later) occurrence.

No other validations exist on this doctype's `validate()` method. There is no check that `leave_block_list_dates` actually contains at least one row beyond the field's `reqd: 1` schema constraint (framework-level "child table must have ≥1 row" enforcement), and no check that `applies_to_all_departments` and department-level assignment aren't both used.

## Business Logic / Calculations

None (no totals/formulas computed on this doctype itself). However, this doctype exposes helper logic used elsewhere (see Whitelisted Methods and Port Notes) to bulk-generate block dates from a day-of-week pattern.

### `get_block_dates_from_date(start_date, end_date, days)` (non-whitelisted helper, called by `set_weekly_off_dates`)

1. Convert `start_date` and `end_date` to date objects via `getdate()`.
2. Build `existing_date_list` = the `getdate()`-normalized `block_date` value of every row currently in `self.leave_block_list_dates`.
3. Initialize empty `date_list`.
4. Loop `start_date` from the given start date to the given end date inclusive, incrementing by 1 day each iteration:
   a. IF `start_date` is NOT already in `existing_date_list` AND the weekday name of `start_date` (via `calendar.day_name[start_date.weekday()]`, e.g. `"Monday"`) is in the `days` list passed in, THEN append `start_date` to `date_list`.
5. Return `date_list` (dates in chronological order, excluding both dates already present in the table and dates whose weekday isn't in `days`).

## [[Cross-Doctype Hooks (doc_events)|Lifecycle Hooks]] (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| `validate` | Duplicate-date check on `leave_block_list_dates` (see Validation Rules) | None |

Client script (`leave_block_list.js`) — UI-only, no server equivalent exists for this flow other than the whitelisted method it calls:
- `add_day_wise_dates` button click opens a dialog collecting `start_date`, `end_date`, `days` (MultiCheck of weekday names Monday–Sunday, "select all" supported), and `reason` (Small Text, required). On dialog's primary action it calls the server method `set_weekly_off_dates` with those four values, then marks the form dirty and closes the dialog. **Note:** this dialog itself does not re-fetch/refresh the child table grid client-side beyond `frm.dirty()` — the server method mutates `self.leave_block_list_dates` in place and the framework's `frm.call` response reloads the doc. No client-side validation beyond the dialog fields' own `reqd: 1` (start_date, end_date, days, reason all mandatory) — a port needs no additional server validation here since `set_weekly_off_dates` has none of its own either (see Port Notes: it silently accepts any date range/company mismatch).

## Whitelisted / API Methods

| Method name | HTTP-equivalent purpose | Args | Returns | What it does |
|---|---|---|---|---|
| `set_weekly_off_dates` | Bulk-append block dates matching given weekdays in a date range | `start_date: str`, `end_date: str`, `days: list` (weekday names, e.g. `["Monday","Friday"]`), `reason: str` | `None` (mutates the in-memory document; caller must still save) | Calls `get_block_dates_from_date(start_date, end_date, days)` to compute the list of new dates, then for each date appends a new row to `leave_block_list_dates` with `{"block_date": date, "reason": reason}`. Does NOT save the document itself — the client script relies on the framework's standard "method call mutates doc, then form is dirty, user must Save" flow. |

## Permissions

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes (if_owner, permlevel, etc) |
|---|---|---|---|---|---|---|---|---|---|---|
| HR User | 1 | 1 | 1 | 0 | — | — | — | 0 | 0 | `email: 1`, `print: 1`, `share: 1` |
| HR Manager | 1 | 1 | 1 | 0 | — | — | — | 1 | 0 | `email: 1`, `print: 1`, `share: 1` |

(No `delete`, `submit`, `cancel`, `amend`, or `export` rights granted to either role; doctype is not submittable so submit/cancel/amend columns are not applicable.)

## Scheduled Jobs Touching This Doctype

None found in `hrms/hooks.py` scheduler_events referencing `Leave Block List`.

## Related Doctypes

- [[Leave Block List Date]] — `leave_block_list_dates` child Table field, one row per blocked calendar date.
- [[Leave Block List Allow]] — `leave_block_list_allowed` child Table field, one row per role exempted from the block.
- [[Leave Type]] — `leave_type` Link field; if set, restricts this block list to applications of that leave type.
- [[Leave Application]] — reads this doctype (via `get_applicable_block_dates`/`get_applicable_block_lists`/`is_user_in_allow_list`) to block/warn on leave applications that fall on a block date.

## Port Notes

- **Cross-reference (do not reimplement here):** `Leave Application`'s validation logic reads `Leave Block List`/`Leave Block List Date`/`Leave Block List Allow` records (via the module-level functions `get_applicable_block_dates`, `get_applicable_block_lists`, and `is_user_in_allow_list` defined in `leave_block_list.py`, not on the `LeaveBlockList` class) to block leave applications that fall on a block date, unless the applying/approving user is listed in that block list's `leave_block_list_allowed` (Allow list). Document the full leave-application-side behavior in `Leave Application.md`; this file only documents what `Leave Block List` itself stores/exposes. For completeness, the exact lookup functions available for that cross-reference are:
  - `get_applicable_block_dates(from_date, to_date, employee=None, company=None, all_lists=False, leave_type=None)` — returns all `Leave Block List Date` rows (`block_date`, `reason`) between `from_date`/`to_date` whose parent is one of the applicable block lists (from `get_applicable_block_lists`).
  - `get_applicable_block_lists(employee=None, company=None, all_lists=False, leave_type=None)`:
    1. IF `employee` not given, resolve it from `frappe.session.user` via `Employee.user_id`.
    2. IF `company` not given and `employee` resolved, resolve `company` from that Employee's `company`.
    3. IF `company` is set: fetch all `Leave Block List` names where `applies_to_all_departments = 1 AND company = company`; if `leave_type` was given, additionally filter `leave_type IN (leave_type, "", None)`. Each match is added via `add_block_list` (see step 5).
    4. IF `employee` is set: look up that Employee's `department`; if a department exists, fetch `Department.leave_block_list`; fetch that block list's own `leave_type`; IF the block list has no `leave_type` set, OR no `leave_type` filter was passed in, OR the block list's `leave_type` equals the passed-in `leave_type`, THEN add that single block list via `add_block_list`.
    5. `add_block_list(block_list)`: for each candidate block list name, add it to the result UNLESS `all_lists` is False AND `is_user_in_allow_list(d)` is true for the current session user (i.e., normally, block lists the current user is explicitly allowed to bypass are excluded from the "applicable" set; passing `all_lists=True` includes them anyway).
    6. Return the de-duplicated (`set()`) list of applicable block list names.
  - `is_user_in_allow_list(block_list)` — returns truthy if a `Leave Block List Allow` row exists with `parent = block_list` and `allow_user = frappe.session.user`.
- **Department linkage:** `Department` doctype (not in this module's folder) has a `leave_block_list` field linking to this doctype for per-department block lists — this is how a non-"applies to all departments" block list gets attached. Reproduce that FK on the ported `Department` table.
- **Dashboard linkage:** `leave_block_list_dashboard.py` declares this doctype has a connected-documents dashboard entry showing linked `Department` records via the `leave_block_list` fieldname — informational only, no business logic.
- **Framework behaviors relied on implicitly:** `autoname: field:leave_block_list_name` means the primary key/name IS the `leave_block_list_name` value (must be enforced unique at the DB layer in the new stack — the JSON also sets `unique: 1` on the field itself, which is redundant with autoname but should still be modeled as a unique constraint). Standard Frappe audit fields (`creation`, `modified`, `modified_by`, `owner`) are auto-populated and not defined explicitly in `fields` — a port must add these columns explicitly (created_at, updated_at, updated_by, created_by equivalents) since they are not free in a non-Frappe stack. `track_changes` is not set (absent from JSON, defaults to not tracked) — no version/audit-trail history is auto-generated for this doctype.
- **Gap vs. expectation:** there is no server-side validation preventing an empty `leave_block_list_dates` table beyond the schema's `reqd: 1` on the table field (which in Frappe means "must have at least one row" — enforce this explicitly in the port). There is also no validation that `block_date` values are not in the past, and no dedupe check on `leave_block_list_allowed.allow_user` (a user could be listed twice with no error).
