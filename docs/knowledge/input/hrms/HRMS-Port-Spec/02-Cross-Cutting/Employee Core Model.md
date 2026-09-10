# Employee — Core Model (Reconstructed)

`Employee` is the single most-referenced doctype in the entire app, but it is NOT an
HRMS doctype — it belongs to core ERPNext (`erpnext.setup.doctype.employee`), which
is a separate, required app (`required_apps = ["frappe/erpnext"]` in `hrms/hooks.py`)
not vendored inside this repository. This spec cannot read `employee.json` directly.

This file is split into two parts with different confidence levels:

## Part A — HRMS-Added Fields (exact, verified from source)

`hrms/setup.py`, function `get_custom_fields()`, dict key `"Employee"`, installed via
Frappe's Custom Field fixture mechanism when the HRMS app is installed. These are
real, exact fields a port MUST include on its Employee table:

| Field (fieldname) | Type | Options/Link Target | Notes |
|---|---|---|---|
| `employment_type` | Link | Employment Type | In list view. |
| `job_applicant` | Link | Job Applicant | Set when this Employee originated from a hired candidate. |
| `grade` | Link | Employee Grade | |
| `default_shift` | Link | Shift Type | |
| `health_insurance_section` | Section Break | — | UI grouping only. |
| `health_insurance_provider` | Link | Employee Health Insurance | |
| `health_insurance_no` | Data | — | `depends_on: eval:doc.health_insurance_provider` |
| `approvers_section` | Section Break | — | UI grouping only. |
| `expense_approver` | Link | User | `ignore_user_permissions: 1` — the field driving `Expense Approver` scoping (see [[Permission Model (RBAC)]]). |
| `leave_approver` | Link | User | Same pattern, drives `Leave Approver` scoping. |
| `shift_request_approver` | Link | User | Same pattern, for Shift Request approval. |
| `employee_advance_account` | Link | Account | |
| `payroll_cost_center` | Link | Cost Center | `fetch_from: department.payroll_cost_center`, `fetch_if_empty: 1` — auto-populated from the Employee's Department when empty, NOT force-overwritten if manually set. |

Also on **Department** (`hrms/setup.py`, same function): `leave_approvers` (Table,
options [[Department Approver]]) and `expense_approvers` (Table, options
`Department Approver`) — these back the "Department Approver fallback" scoping rule
documented in [[Permission Model (RBAC)]] and in `01-Modules/HR-Core/Department Approver.md`.

Also on **Designation**: `appraisal_template` (Link to Appraisal Template — a
Designation can suggest a default appraisal template) and `skills` (Table, options
`Designation Skill`).

## Part B — Reconstructed Core Fields (inferred from usage across this app; NOT independently verified against ERPNext source)

Every field below is one that some HRMS doctype in this app reads, writes, fetches
from, or validates against via a `Link`/`fetch_from` to Employee. This list is
therefore a reliable **lower bound** — it's everything HRMS itself actually depends
on — but is not guaranteed complete or field-type-exact the way Part A is. Before
finalizing a port's Employee table, cross-check this list against your target
version of ERPNext's actual `employee.json` if available; otherwise treat this as
sufficient, since it covers everything this app's own logic touches.

| Field (fieldname) | Likely Type | Notes |
|---|---|---|
| `employee` / `name` | Data (naming series or field-based) | Primary key, generated per [[Naming and Autoname Rules]], referenced as `employee` Link target from virtually every doctype in this app. |
| `employee_name` | Data | Denormalized full name, `fetch_from`'d onto most child/related doctypes for display. |
| `user_id` | Link (User) | Connects an Employee record to a login account — this is what `frappe.session.user` is resolved against for all self-service scoping. |
| `status` | Select | Active / Inactive / Suspended / Left — gates `validate_active_employee` checks across Timesheet, Leave, [[Attendance]], etc. (see also [[Cross-Doctype Hooks (doc_events)]]'s `Timesheet` validate hook). |
| `company` | Link (Company) | Scopes almost every transaction; used in `company_data_to_be_ignored` cleanup logic. |
| `department` | Link (Department) | Drives Department Approver fallback and `payroll_cost_center` fetch. |
| `designation` | Link (Designation) | Drives `appraisal_template` default and `Designation Skill` expected-skills matching. |
| `branch` | Link (Branch) | Referenced in HR Setup workspace; `grade` field is inserted `after: branch`. |
| `reports_to` | Link (Employee, self-referential) | Org chart hierarchy; likely used for a manager-based approval fallback in some contexts. |
| `date_of_joining` | Date | Used for proration in [[Salary Slip]], tenure checks for Gratuity eligibility, "New Hires" dashboard counts. |
| `relieving_date` | Date | Set on separation; used for F&F Statement and final Salary Slip proration. |
| `holiday_list` | Link (Holiday List) | Per-employee override of which Holiday List applies; `default_shift` field is inserted `after: holiday_list`. |
| `salary_mode` | Select | Bank/Cash/Cheque; `employee_advance_account` field inserted `after: salary_mode`. |
| `salary_currency` | Link (Currency) | Payroll calculations. |
| `date_of_birth` | Date | Birthday reminder scheduler job. |
| `gender` | Select | Referenced in various HR reports. |
| `health_details` | small text/section | `health_insurance_section` is inserted `after: health_details`, implying core ERPNext already has a health-details grouping. |
| `employment_details` | section | `job_applicant` field is inserted `after: employment_details`. |

## Port Recommendation

Model `Employee` as its own first-class table (not reconstructed piecemeal per
module) with at minimum every field in Part A plus the Part B fields your target
feature set actually reads — cross-check each module's own doctype specs under
`01-Modules/` for the exact subset of Employee fields THAT module's logic reads, and
make sure your Employee table has all of them before wiring that module up.

See also: [[Permission Model (RBAC)]] (self/approver scoping keys off `user_id`,
`leave_approver`, `expense_approver`), [[Cross-Doctype Hooks (doc_events)]] (the
`Employee` event handlers), `HRMS-Obsidian-Vault/03-Flows/Hire to Retire Overview.md`
(narrative context for why Employee is the hub).
