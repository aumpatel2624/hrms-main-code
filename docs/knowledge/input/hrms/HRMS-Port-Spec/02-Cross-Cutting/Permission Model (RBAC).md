# Permission Model (RBAC) — What a Port Must Reproduce

Frappe's permission system has three layers that stack. A port needs all three, or
role-scoped screens (like the "My X / Team X" portal tabs) silently show everything to
everyone.

## Layer 1 — Doctype-Level Role Permissions

Every doctype JSON has a `permissions` array: rows of
`{role, read, write, create, delete, submit, cancel, amend, report, export, share,
print, email, permlevel, if_owner}`. This is a straight allow-list: a user gets a
right on a doctype if ANY of their roles has that right = 1 for permlevel 0 (field-
level permlevel > 0 restricts specific fields to specific roles — rare in this app,
check per-doctype spec files for permlevel notes).

**Port equivalent:** a `role_permissions` table:
```
role_permissions(role, doctype, can_read, can_write, can_create, can_delete,
                  can_submit, can_cancel, can_amend, if_owner_only)
```
Check on every request: does the user hold a role with the needed permission bit set
for this doctype? The `can_submit`/`can_cancel`/`can_amend` bits gate the transitions
defined generically in [[Submittable Document Lifecycle]].

## Layer 2 — `if_owner` (Row-Level, Ownership-Based)

A permission row can be marked `if_owner: 1`, meaning that role's rights on this
doctype apply ONLY to documents where `owner` (the creating user) equals the current
user. This is Frappe's native mechanism, but HRMS mostly does NOT rely on `owner`
(the creator) — it relies on a specific business field instead (see Layer 3), because
"who created this record" and "which employee this record is about" are different
things (an HR User might create a Leave Application on behalf of an Employee).

**Port equivalent:** a boolean per role-permission row; when true, add
`WHERE created_by = current_user` to every query for that role.

## Layer 3 — Custom Permission Query Conditions (the layer HRMS actually uses)

Frappe lets an app register a `get_permission_query_conditions` hook per doctype that
injects an extra SQL `WHERE` clause for list views and reports, on top of Layer 1/2.
HRMS's real self-service and approver scoping is implemented here, not via `if_owner`:

- **Self-only doctypes** ([[Leave Application]], [[Expense Claim]], [[Attendance Request]],
  [[Shift Request]], [[Employee Checkin]], [[Employee Tax Exemption Declaration]], etc.):
  condition is effectively `employee = (SELECT name FROM Employee WHERE user_id =
  current_user)` — see [[Employee Core Model]] for the `user_id` field this join keys
  off — UNLESS the user also holds a role with unscoped access (HR User/HR Manager/System
  Manager), in which case no extra condition is added.
- **Approver-scoped doctypes** (same list, for Leave Approver/Expense Approver): the
  condition becomes `employee IN (SELECT name FROM Employee WHERE leave_approver =
  current_user OR department IN (SELECT department FROM "Department Approver" WHERE
  approver = current_user AND department = Employee.department))` — the OR'd
  [[Department Approver]] fallback is a real correlated condition, not just "my named
  reports." The `leave_approver`/`expense_approver` fields themselves, and the hooks
  that keep their role assignment consistent, are documented in
  [[Cross-Doctype Hooks (doc_events)]] (`User`/`Employee` validate/on_update hooks).
- Global roles (HR User, HR Manager, System Manager) get no additional condition —
  they see every row that Layer 1 already permits doctype-level access to.

**Port equivalent:** implement this as a per-doctype, per-role "row filter" function
that the query layer calls and ANDs into every list/detail fetch:
```
function getRowFilter(doctype, user):
    roles = getRolesForUser(user)
    if roles intersects {HR User, HR Manager, System Manager}:
        return NO_FILTER
    if doctype in SELF_OR_APPROVER_SCOPED_DOCTYPES:
        employee = getEmployeeForUser(user)
        if roles includes the doctype's approver role (e.g. Leave Approver for Leave Application):
            return "employee = :self OR employee IN (approver's scoped employees)"
        else:
            return "employee = :self"
    return NO_FILTER
```
This single function, called consistently by every read path (list view, detail view,
report, REST API, portal "My/Team" tabs), is what makes the whole self-service model
work. Missing it on even one code path is the most common way a port would leak data.

## Layer 4 — Framework Super-Users

`Administrator` and any user with `System Manager` bypass all of the above entirely.
**Port equivalent:** a hardcoded bypass flag checked before Layers 1–3 run at all.

## Field-Level Permission (`permlevel`)

A small number of fields across the app are marked with `permlevel: 1` and only
certain roles get write access at that level even if they can write the document
overall (e.g. a "locked after approval" field). Check each doctype's own spec file for
`permlevel` notes — most doctypes in this app use only permlevel 0.

## Role Catalog

See `HRMS-Obsidian-Vault/02-Roles/Roles Overview.md` for the full narrative role
catalog (Employee, HR User, HR Manager, Leave Approver, Expense Approver, Interviewer,
System Manager) — that file's role shapes map directly onto the three layers above:
Employee = Layer 3 self-only, Leave/Expense Approver = Layer 3 approver-scoped,
HR User/HR Manager/System Manager = Layer 1 only (no Layer 3 restriction).

## Roles List (from JSON `permissions[].role` across the whole app)

`System Manager`, `HR Manager`, `HR User`, `Employee`, `Employee Self Service`,
`Leave Approver`, `Expense Approver`, `Interviewer`, `All` (implicit, every logged-in
user), `Administrator` (bypasses everything). A handful of shared ERPNext roles
(`Accounts User`, `Projects User`, `Manufacturing User`, `Academics User`,
`Fleet Manager`) appear only on doctypes HRMS extends from core ERPNext, not on
HRMS-authored doctypes — a port that isn't also cloning ERPNext's other modules can
ignore these.
