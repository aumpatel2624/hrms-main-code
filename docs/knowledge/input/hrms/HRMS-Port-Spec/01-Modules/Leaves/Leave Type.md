# Leave Type

**Source:** `hrms/hr/doctype/leave_type/leave_type.json`, `leave_type.py`, `leave_type.js`
**Submittable:** no   **Tree:** no   **[[Naming and Autoname Rules|Naming]]:** `field:leave_type_name` (the document name IS the value of `leave_type_name`; must be unique)
**Module:** HR

## Schema

Full field table, in JSON `field_order`:

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| leave_type_name | Leave Type Name | Data | — | Yes (`reqd`) | — | No | `unique: 1`; this value becomes the document name (autoname `field:`) |
| is_compensatory | Is Compensatory | Check | — | No | 0 | No | — |
| is_lwp | Is Leave Without Pay | Check | — | No | 0 | No | `depends_on: eval:doc.is_ppl == 0` (hidden client-side when `is_ppl` is checked) |
| is_ppl | Is Partially Paid Leave | Check | — | No | 0 | No | `depends_on: eval:doc.is_lwp == 0` (hidden client-side when `is_lwp` is checked); mutually exclusive with `is_lwp` (server-enforced, see Validation) |
| fraction_of_daily_salary_per_leave | Fraction of Daily Salary per Leave | Float | — | Conditionally (`mandatory_depends_on: eval:doc.is_ppl == 1`) | — | No | Shown only if `is_ppl`; must be between 0 and 1 inclusive (server-enforced) |
| (column_break_3) | — | Column Break | — | — | — | — | layout only |
| allow_negative | Allow Negative Balance | Check | — | No | 0 | No | — |
| allow_over_allocation | Allow Over Allocation | Check | — | No | 0 | No | "Allows allocating more leaves than the number of days in the allocation period." |
| include_holiday | Include holidays within leaves as leaves | Check | — | No | 0 | No | — |
| is_optional_leave | Leave for optional holiday | Check | — | No | 0 | No | "These leaves are holidays permitted by the company however, availing it is optional for an Employee." |
| (carry_forward_section) | Carry Forward | Section Break | — | — | — | — | collapsible, `collapsible_depends_on: is_carry_forward`; groups the carry-forward fields below |
| is_carry_forward | Carry Forward | Check | — | No | 0 | No | — |
| maximum_carry_forwarded_leaves | Maximum Carry Forwarded Leaves | Float | — | No | — | No | `depends_on: is_carry_forward`; `non_negative: 1` |
| expire_carry_forwarded_leaves_after_days | Expire Carry Forwarded Leaves (Days) | Int | — | No | — | No | `depends_on: is_carry_forward`; `non_negative: 1`; description: "Calculated in days" |
| (column_break_lfjz) | — | Column Break | — | — | — | — | layout only |
| (encashment) | Encashment | Section Break | — | — | — | — | collapsible section |
| allow_encashment | Allow Encashment | Check | — | No | 0 | No | — |
| max_encashable_leaves | Maximum Encashable Leaves | Int | — | No | — | No | `depends_on: allow_encashment`; `non_negative: 1` |
| non_encashable_leaves | Non-Encashable Leaves | Int | — | No | — | No | `depends_on: allow_encashment`; `non_negative: 1`; description explains: with balance 10 and 4 non-encashable, 6 can be encashed, 4 carried forward/expired |
| (column_break_17) | — | Column Break | — | — | — | — | layout only |
| earning_component | Earning Component | Link | [[Salary Component]] | No | — | No | `depends_on: allow_encashment` |
| (earned_leave) | Earned Leave | Section Break | — | — | — | — | collapsible section |
| is_earned_leave | Is Earned Leave | Check | — | No | 0 | No | — |
| earned_leave_frequency | Earned Leave Frequency | Select | Monthly / Quarterly / Half-Yearly / Yearly | No | — | No | `depends_on: is_earned_leave` |
| (column_break_22) | — | Column Break | — | — | — | — | layout only |
| allocate_on_day | Allocate on Day | Select | First Day / Last Day / Date of Joining | No | "Last Day" | No | `depends_on: eval:doc.is_earned_leave`; description: "The day of the month when leaves should be allocated"; client script restricts the option list to `First Day\nLast Day` (removes "Date of Joining") whenever `earned_leave_frequency` != "Monthly" |
| rounding | Rounding | Select | "" / 0.25 / 0.5 / 1.0 | No | — | No | `depends_on: is_earned_leave` |
| (limits_tab) | Limits | Tab Break | — | — | — | — | tab container |
| max_leaves_allowed | Maximum Leave Allocation Allowed per Leave Period | Float | — | No | — | No | `non_negative: 1` |
| max_continuous_days_allowed | Maximum Consecutive Leaves Allowed | Int | — | No | — | No | `non_negative: 1`; `in_list_view: 1` |
| (column_break_bsas) | — | Column Break | — | — | — | — | layout only |
| applicable_after | Allow Leave Application After (Calendar Days) | Int | — | No | — | No | `non_negative: 1`; description: "Minimum calendar days required since Date of Joining to apply for this leave" |
| (connections_tab) | Connections | Tab Break | — | — | — | — | `show_dashboard: 1` — renders the linked-doctype dashboard (see Lifecycle Hooks / dashboard) |

`track_changes: 1` — every save is versioned (audit trail).

## Child Tables

None.

## State Machine

Not submittable — no docstatus workflow. No `status`/`workflow_state` field.

## Validation Rules (exact, in execution order)

`validate()` calls, in order: `validate_lwp()` -> `validate_leave_types()` -> `validate_allocated_earned_leave()`.

1. **`validate_lwp`**: IF `is_lwp` is checked THEN query `Leave Allocation` for any record with `leave_type == self.name` AND `from_date <= today()` AND `to_date >= today()`. IF any such allocations exist -> `frappe.throw(_("Leave application is linked with leave allocations {0}. Leave application cannot be set as leave without pay").format(", ".join(leave_allocation_names)))` (source: `validate_lwp`).
2. **`validate_leave_types`** — check 1: IF `is_compensatory` AND `is_earned_leave` are both checked -> throw with title `_("Not Allowed")` and message (HTML, built from concatenated `_()` strings with `<br>`/`<br><br>` separators):
   "Leave Type can either be compensatory or earned leave.<br><br>Earned Leaves are allocated as per the configured frequency via scheduler.<br>Whereas allocation for Compensatory Leaves is automatically created or updated on submission of Compensatory Leave Request.<br><br>Disable **Is Compensatory Leave** or **Is Earned Leave** to proceed." (the two field names are bolded via `bold()`) (source: `validate_leave_types`).
3. **`validate_leave_types`** — check 2: IF `is_lwp` AND `is_ppl` are both checked -> `frappe.throw(_("Leave Type can either be without pay or partial pay"), title=_("Not Allowed"))` (source: `validate_leave_types`).
4. **`validate_leave_types`** — check 3: IF `is_ppl` is checked AND (`fraction_of_daily_salary_per_leave < 0` OR `fraction_of_daily_salary_per_leave > 1`) -> `frappe.throw(_("The fraction of Daily Salary per Leave should be between 0 and 1"))` (source: `validate_leave_types`).
5. **`validate_allocated_earned_leave`**: Load `old_configuration = self.get_doc_before_save()` (the pre-edit version of this document, `None` on insert). IF `old_configuration` exists AND `old_configuration.is_earned_leave` was true AND `old_configuration.max_leaves_allowed > self.max_leaves_allowed` (i.e. the limit is being reduced) THEN check `frappe.db.exists("Leave Allocation", {"leave_type": self.name, "from_date": ("<=", today()), "to_date": (">=", today())}, cache=True)`. IF a current allocation exists -> **non-blocking** `frappe.msgprint(title=_("Leave Allocation Exists"), msg=_("Reducing maximum leaves allowed after allocation may cause scheduler to allocate incorrect number of earned leaves. Proceed with caution."))` — this does NOT stop the save; it is a warning only (source: `validate_allocated_earned_leave`).

## Business Logic / Calculations

This doctype itself performs no numeric allocation calculation (that logic lives in `Leave Policy Assignment` / `hrms/hr/utils.py`). It only stores the configuration flags/parameters consumed by that logic:
- `is_earned_leave` + `earned_leave_frequency` + `allocate_on_day` + `rounding` drive the earned-leave pro-rata schedule computed in `Leave Policy Assignment` (see that file).
- `is_ppl` + `fraction_of_daily_salary_per_leave` drive partial-pay leave deduction in payroll (out of scope of this file).
- `is_carry_forward` + `maximum_carry_forwarded_leaves` + `expire_carry_forwarded_leaves_after_days` drive carry-forward and expiry logic in `Leave Allocation` / `Leave Ledger Entry` (out of scope of this file).
- `allow_encashment` + `earning_component` + `max_encashable_leaves` + `non_encashable_leaves` drive `Leave Encashment` (out of scope of this file).

## [[Cross-Doctype Hooks (doc_events)|Lifecycle Hooks]] (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| validate | `validate_lwp`, `validate_leave_types`, `validate_allocated_earned_leave` (see Validation Rules) | Reads `Leave Allocation` only; no writes |
| after_insert (hooks.py, `doc_events`) | `hrms.telemetry.on_milestone_insert` | Telemetry/analytics only — records a first-time "created a Leave Type" activation milestone. Not business logic. |
| `clear_cache` (overridden method, called by framework whenever the doc's cache is cleared, e.g. after any save) | Deletes the cached `LEAVE_TYPE_MAP` value (`frappe.cache().delete_value(LEAVE_TYPE_MAP)`) imported from `hrms.payroll.doctype.salary_slip.salary_slip`, then calls `super().clear_cache()` | Forces `Salary Slip` payroll logic to rebuild its cached leave-type lookup map on next access — a pure cache-invalidation side effect, not a data write. A port needs an equivalent invalidation of any leave-type lookup cache used by payroll whenever a Leave Type is edited. |

## Whitelisted / API Methods

None defined on this controller or a dedicated module file for Leave Type.

## Permissions

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| HR User | Yes | Yes | Yes | Yes | — | — | — | Yes | — | `email`, `print`, `share` also 1; `export` not set (0) |
| HR Manager | Yes | Yes | Yes | Yes | — | — | — | Yes | — | `email`, `print`, `share` also 1; `export` not set (0) |
| Employee | Yes | — | — | — | — | — | — | — | — | read-only |

(No `if_owner` or `permlevel` restrictions present in the JSON.)

## Scheduled Jobs Touching This Doctype

None directly. (`allocate_earned_leaves`, a `daily_long` scheduler job in `hrms/hooks.py` -> `hrms.hr.utils.allocate_earned_leaves`, reads Leave Type rows via `get_earned_leaves()` filtered on `is_earned_leave: 1` and fields `max_leaves_allowed`, `earned_leave_frequency`, `rounding`, `allocate_on_day` — it reads this doctype's data but does not write to it. See `Leave Allocation`/`Leave Policy Assignment` specs for the write side.)

## Related Doctypes

- [[Salary Component]] — `earning_component` Link field, used by [[Leave Encashment]] to build the `Additional Salary` earning row.
- [[Leave Allocation]] — read in `validate_lwp`/`validate_allocated_earned_leave` to block/warn on configuration changes that conflict with existing allocations.
- [[Salary Slip]] — its cached `LEAVE_TYPE_MAP` is invalidated whenever a Leave Type is saved (`clear_cache` override).

## Port Notes

- `autoname: field:leave_type_name` means the primary key of the new table should be a natural key equal to the (unique) name field, OR the new stack can use a surrogate ID plus a `UNIQUE` constraint on `leave_type_name` — but any FK from other tables (`Leave Policy Detail.leave_type`, `Leave Allocation.leave_type`, etc.) in the original system references this literal string name, so a straightforward port keeps `leave_type_name` as the natural/textual key unless all downstream tables are also remapped to a surrogate ID with a lookup.
- `unique: 1` on `leave_type_name` must be enforced as a DB-level unique constraint, not just UI validation.
- `track_changes: 1` implies Frappe automatically writes a full version history (a "Version" doctype record) on every save — a port needs an explicit audit-log table/table-versioning mechanism to replicate this if audit history is required.
- Frappe auto-manages `creation`, `modified`, `modified_by`, `owner`, `idx` timestamp/audit columns on every doctype; these are not itemized above but must be replicated as standard framework columns in the new schema.
- The `depends_on`/`mandatory_depends_on` expressions (e.g. `is_lwp` vs `is_ppl` mutual visibility) are CLIENT-SIDE ONLY show/hide logic; the mutual-exclusivity itself IS additionally enforced server-side in `validate_leave_types` (see Validation Rules #3), so no gap there. However, `mandatory_depends_on: eval:doc.is_ppl == 1` for `fraction_of_daily_salary_per_leave` is a client-side "required when visible" rule — the server only validates the 0–1 range (Validation Rule #4), NOT that the field is actually populated when `is_ppl` is set. A port should add an explicit server-side "required if is_ppl" check since the original does not strictly enforce it server-side beyond the range check (an empty/None value compared with `< 0`/`> 1` may behave differently across languages — flag this gap explicitly rather than assuming the original enforces presence).
- The client script's dynamic option-narrowing for `allocate_on_day` (removing "Date of Joining" when frequency isn't Monthly) is CLIENT-SIDE ONLY — there is no equivalent server-side validation rejecting `allocate_on_day = "Date of Joining"` when `earned_leave_frequency != "Monthly"`. A port should add a server-side validation for this if data integrity is desired, since the original schema and controller do not block it at the API level.
