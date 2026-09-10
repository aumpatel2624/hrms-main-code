# HR Core — Module Spec

## Purpose

HR Core covers the employee lifecycle event doctypes that sit around (but are not) the
Employee master itself: onboarding and separation workflows, internal mobility
(transfer/promotion), grievances, referrals, full-and-final settlement, workforce
planning (staffing plans, grades), employee-attached master data (property history,
health insurance, identification documents), domestic/international travel requests,
training administration, and the skills/competency framework (skills, designation
skill requirements, employee skill maps). It does not include Leave, Attendance,
Payroll, Performance/Appraisal, Expense Claims, or Recruitment (Job Requisition,
Job Applicant, Job Offer, Interview*) — those are separate modules/agents. Doctypes
in this module are consumed heavily by the Employee master (via `overrides/employee_master.py`)
and by `hrms/controllers/employee_boarding_controller.py`, a shared base controller for
the two "boarding" workflows (Employee Onboarding, Employee Separation).

## Doctype List

| Doctype | Purpose |
|---|---|
| [[Employee Onboarding]] | Submittable workflow driving a new hire's checklist of boarding activities before/after joining; on completion can auto-create the Employee record. |
| [[Employee Onboarding Template]] | Reusable template of default onboarding activities per designation/department, cloned into new Employee Onboarding docs. |
| [[Employee Boarding Activity]] | Child table (shared shape) listing one checklist activity + assigned user + task link; used by both Onboarding and Separation. |
| [[Employee Separation]] | Submittable workflow driving an exiting employee's offboarding checklist; can trigger Employee `relieving_date`/status update and generation of Full and Final Statement. |
| [[Employee Separation Template]] | Reusable template of default separation activities per designation/department. |
| [[Exit Interview]] | Submittable record of the exit interview conducted for a separating employee; holds questionnaire responses and a status (Pending/Scheduled/Completed). |
| [[Employee Transfer]] | Submittable record of one employee's transfer between company/department/designation/branch, etc.; snapshots old values and creates an Employee Property History entry per changed field, optionally creates a new Employee record for company transfers. |
| [[Employee Promotion]] | Submittable record of an employee's promotion; updates Employee's designation/grade/CTC and appends Employee Property History / Employee Internal Work History (ERPNext core) entries. |
| [[Employee Referral]] | Non-submittable record of an employee referring a candidate; tracks referral bonus eligibility/payment via an Additional Salary link. |
| [[Employee Grievance]] | Submittable grievance case with type, raised-by, resolution fields, and escalation. |
| [[Grievance Type]] | Simple master listing grievance categories, each optionally linked to a default resolution department/user. |
| [[Full and Final Statement]] | Submittable final-settlement document for a separating employee: aggregates payables/receivables (assets, outstanding statements) and can post a Journal Entry. |
| [[Full and Final Asset]] | Child table on Full and Final Statement: one company asset assigned to the employee, with return/handover status. |
| [[Full and Final Outstanding Statement]] | Child table on Full and Final Statement: one outstanding payable/receivable line item (e.g. loan, advance, deduction) with computed running total. |
| [[Staffing Plan]] | Submittable multi-department hiring plan for a date range: budgeted vacancies per designation. |
| [[Staffing Plan Detail]] | Child table on Staffing Plan: one designation's planned vacancy count, current openings, and estimated cost. |
| [[Employee Property History]] | Child table (owned by Employee, populated by Transfer/Promotion) recording a single field-level change (property, old value, new value) as an audit trail row. |
| [[Employee Health Insurance]] | Child table (owned by Employee) listing one health insurance provider + policy number for the employee. |
| [[Employee Grade]] | Master defining a salary/seniority grade, optionally linked to a default leave policy reference used elsewhere. |
| [[Department Approver]] | Child table (owned by Department, out of this module's scope) listing users authorized to approve Leave Applications/Expense Claims for that department. |
| [[Identification Document Type]] | Simple master listing types of ID documents (Passport, SSN, etc.) employees can be asked to provide. |
| [[Travel Request]] | Submittable request for company travel: itinerary, costing, purpose, advance/reimbursement flags. |
| [[Travel Itinerary]] | Child table on Travel Request: one leg of the trip (mode, from/to, dates). |
| [[Travel Request Costing]] | Child table on Travel Request: one cost line item (sponsored/funded amount by category). |
| [[Purpose of Travel]] | Simple master listing reasons for travel (Conference, Training, Onsite, etc.), referenced by Travel Request. |
| [[Training Program]] | Master describing a training curriculum; tracks overall status (Scheduled/Completed) rolled up from its Training Events. |
| [[Training Event]] | Submittable/schedulable session under a Training Program with a location, trainer, date/time, and attendee list. |
| [[Training Event Employee]] | Child table on Training Event: one attendee (employee) + attendance/completion status. |
| [[Training Result]] | Submittable record of one employee's outcome for a Training Event (used mainly to cascade a "Completed" status). |
| [[Training Result Employee]] | Child table on Training Result: one employee + result grade/comment. |
| [[Training Feedback]] | Submittable feedback form filled by an employee about a Training Event they attended. |
| [[Employee Training]] | Child table (owned by Employee) listing training programs an employee has completed, for the Employee's own training history section. |
| [[Employee Skill Map]] | Non-submittable snapshot of one employee's self/manager-rated skills, seeded from their Designation's expected skill set. |
| [[Employee Skill]] | Child table on Employee Skill Map: one skill + proficiency rating. |
| [[Skill]] | Simple master listing distinct skill names. |
| [[Skill Assessment]] | Doctype physically present in `hr/doctype` but functionally tied to Recruitment's Interview Feedback flow, not to Employee Skill Map — no structural FK to any other HR Core doctype in this list; document standalone. |
| [[Designation Skill]] | Child table listing one expected skill for a Designation (Designation itself lives in ERPNext core, outside this repo). |
| [[Expected Skill Set]] | Doctype physically present in `hr/doctype` but functionally tied to Recruitment's Interview Type, not to Designation/Employee Skill Map — no structural FK to any other HR Core doctype in this list; document standalone. |

[[Job Requisition]] (Recruitment module, out of scope here) is referenced by name only where
Staffing Plan/Employee Onboarding logic touches it.

## Recommended Target Schema Shape

Table names below are `snake_case`, singular-domain, PK `id` (surrogate) unless noted.
FK columns named `<referenced_table>_id`.

**Standalone masters** (own table, no child rows):
- `employee_grades`, `identification_document_types`, `purpose_of_travels`,
  `grievance_types`, `skills` — simple lookup tables (id, name/label, a few flags).
- `training_programs` (id, name, status, description).

**Onboarding/Separation cluster:**
- `employee_onboarding_templates` (id, designation_id, department_id, ...) — 1:N →
  `employee_onboarding_template_activities` (owned child rows: activity name, role, required flag).
- `employee_onboardings` (id, employee_id nullable until created, template_id FK nullable,
  job_applicant_id, boarding_status, ...) — 1:N → `employee_boarding_activities`
  (parent_type discriminator column since this child shape is reused by both Onboarding
  and Separation: `parent_table` enum('employee_onboarding','employee_separation'),
  `parent_id`, activity, role, task_id, status, completed_by, completed_on).
- `employee_separation_templates` mirrors `employee_onboarding_templates`.
- `employee_separations` (id, employee_id, boarding_status, ...) — 1:N →
  `employee_boarding_activities` (same shared child table as above).
- `exit_interviews` (id, employee_id, separation_id nullable FK, status, questions as
  owned child rows in `exit_interview_questions` if the source models them as a child
  table — otherwise inline JSON/columns).

**Mobility cluster:**
- `employee_transfers` (id, employee_id, transfer_date, new_company_id nullable,
  new_department_id, new_designation_id, ...) — 1:N owned rows are NOT a child table in
  source, they're generated as `employee_property_histories` rows on the Employee.
- `employee_promotions` (id, employee_id, promotion_date, new_designation_id,
  new_grade_id, new_ctc, current_ctc, ...).
- `employee_property_histories` (id, employee_id FK, property, current_value, new_value,
  fieldname, source_doctype, source_id) — append-only audit table, populated by both
  Transfer and Promotion.

**Referral/Grievance:**
- `employee_referrals` (id, referrer_employee_id FK, candidate fields, status,
  additional_salary_id nullable FK).
- `employee_grievances` (id, raised_by_employee_id FK, grievance_type_id FK, status,
  resolved_by, resolution_detail).
- `grievance_types` — see masters above; add `default_department_id` FK nullable.

**Full and Final:**
- `full_and_final_statements` (id, employee_id FK, boarding_status/status, journal_entry_id
  nullable FK) — 1:N → `full_and_final_assets` (asset_id FK, status) and 1:N →
  `full_and_final_outstanding_statements` (component/reference, amount, running total —
  computed at read time, not stored, unless source persists it — check source before
  assuming).

**Staffing:**
- `staffing_plans` (id, company_id, department_id?, from_date, to_date, status) — 1:N →
  `staffing_plan_details` (designation_id FK, vacancies, current_openings,
  estimated_cost_per_position, total_estimated_cost).

**Employee-attached masters (owned child rows on Employee, not top-level tables with
independent lifecycle):**
- `employee_health_insurances` (employee_id FK, provider, policy_number).
- `employee_trainings` (employee_id FK, training_program_id FK, ...).
- These stay as owned/child rows keyed by `employee_id` — no independent CRUD API of
  their own in source beyond the Employee form.

**Travel:**
- `travel_requests` (id, employee_id, purpose_of_travel_id FK, ...) — 1:N →
  `travel_itineraries` (mode, from/to, departure/arrival datetime) and 1:N →
  `travel_request_costings` (expense category, sponsored_amount, funded_amount).

**Training:**
- `training_events` (id, training_program_id FK, event_status, location, trainer, ...)
  — 1:N → `training_event_employees` (employee_id FK, status).
- `training_results` (id, training_event_id FK, status) — 1:N →
  `training_result_employees` (employee_id FK, grade/comment).
- `training_feedbacks` (id, training_event_id FK, employee_id FK, feedback fields).

**Skills:**
- `skills` (master, see above).
- `designation_skills` (designation_id FK — external/ERPNext-core table not modeled here,
  skill_id FK).
- `employee_skill_maps` (id, employee_id FK, designation_id FK) — 1:N →
  `employee_skills` (skill_id FK, proficiency).
- `skill_assessments`, `expected_skill_sets` — model standalone per their own file;
  their real parents (Interview Feedback / Interview Type) belong to the Recruitment
  module's schema, not this one — add the FK there, not here.

**Department Approver** — child table owned by `departments` (external to this module):
`department_approvers` (department_id FK, user_id/approver, parentfield discriminator
for "leave" vs "expense_claim" approver list — confirm exact discriminator in source
before implementing, per that file's Port Notes).

## Module-Wide Invariants

- **Boarding activity checklist is 100%-completion-gated:** both Employee Onboarding
  and Employee Separation only allow moving `boarding_status` to "Completed" once every
  row in their `activities` child table (shared `Employee Boarding Activity` shape) is
  itself marked completed — enforced in the shared `employee_boarding_controller.py`,
  not duplicated per-doctype. A port must implement this as one shared service/base
  class, not copy-pasted logic, to avoid the two doctypes drifting.
- **Full and Final Statement is downstream of Employee Separation:** it expects the
  employee's `relieving_date` to already be set (normally by a completed Separation)
  before its own payable/receivable computation is meaningful — there is no hard DB
  FK enforcing this order in source; a stricter port may want to add one.
  **Property history is append-only and cross-doctype-sourced:** `employee_property_histories`
  rows are written by both `Employee Transfer` and `Employee Promotion` (and,
  per Employee Transfer's Port Notes, deleted/reverted with a shared, sometimes
  overly-broad filter dict on cancel) — treat this table as a shared audit log, not a
  child table owned exclusively by one parent doctype.
- **Skill Assessment and Expected Skill Set are physically in HR Core's source folder
  but functionally belong to Recruitment's Interview flow.** Do not build FKs from them
  into Employee Skill Map or Designation Skill — none exist in source. Flag this
  physical/functional mismatch to the Recruitment module owner since their spec may
  want to claim these two doctypes' business documentation even though this agent
  produced their schema files here (per assignment, since they live under `hr/doctype`).
- **An employee can be the subject of at most one open/un-completed Employee Onboarding
  or Employee Separation at a time** in normal usage, but per the batch findings, this
  is enforced with an explicit duplicate-guard only on the Onboarding side
  (`validate_duplicate_employee_onboarding`) — Employee Separation has no equivalent
  guard in source. Flagged, not silently added, per ground rules; a port should decide
  deliberately whether to add symmetric enforcement.
- **Several submittable doctypes in this module (Exit Interview, Travel Request,
  Staffing Plan, per the batch findings) have permission rows in their JSON that omit
  explicit `submit`/`cancel`/`amend` grants** despite being submittable — this is
  ambiguous in source (Frappe may default these from `write` at the framework level).
  A port must decide explicitly which roles can submit/cancel/amend each of these
  rather than inferring it silently; see each file's own Permissions/Port Notes section.
