# Full Doctype-to-Table Index

Every doctype specified in this port, mapped to a recommended snake_case table name,
its owning module folder, and whether it's a standalone/parent doctype or a
child-table row. Use this as the master checklist when generating your target
schema's migration files.

**Convention:** doctype name -> `snake_case` table name, spaces/`&` removed
(e.g. `Employee Tax Exemption Declaration` -> `employee_tax_exemption_declaration`).
Child tables get the same treatment; foreign key column back to the parent is
conventionally `parent_id` plus an `idx` integer for row order (see
`02-Cross-Cutting/Implicit Framework Behaviors.md`).

| Doctype | Module Folder | Kind |
|---|---|---|
| Employee (reconstructed) -> [[Employee Core Model]] | `02-Cross-Cutting/Employee Core Model.md` | Standalone (hub) |
| [[Employee Onboarding]] | HR-Core | Standalone |
| [[Employee Onboarding Template]] | HR-Core | Standalone |
| [[Employee Boarding Activity]] | HR-Core | Child table |
| [[Employee Separation]] | HR-Core | Standalone |
| [[Employee Separation Template]] | HR-Core | Standalone |
| [[Exit Interview]] | HR-Core | Standalone |
| [[Employee Transfer]] | HR-Core | Standalone |
| [[Employee Promotion]] | HR-Core | Standalone |
| [[Employee Referral]] | HR-Core | Standalone |
| [[Employee Grievance]] | HR-Core | Standalone |
| [[Grievance Type]] | HR-Core | Standalone (lookup) |
| [[Full and Final Statement]] | HR-Core | Standalone |
| [[Full and Final Asset]] | HR-Core | Child table |
| [[Full and Final Outstanding Statement]] | HR-Core | Child table |
| [[Staffing Plan]] | HR-Core | Standalone |
| [[Staffing Plan Detail]] | HR-Core | Child table |
| [[Employee Property History]] | HR-Core | Child table |
| [[Employee Health Insurance]] | HR-Core | Standalone (lookup) |
| [[Employee Grade]] | HR-Core | Standalone (lookup) |
| [[Department Approver]] | HR-Core | Child table |
| [[Identification Document Type]] | HR-Core | Standalone (lookup) |
| [[Travel Request]] | HR-Core | Standalone |
| [[Travel Itinerary]] | HR-Core | Child table |
| [[Travel Request Costing]] | HR-Core | Child table |
| [[Purpose of Travel]] | HR-Core | Standalone (lookup) |
| [[Training Program]] | HR-Core | Standalone |
| [[Training Event]] | HR-Core | Standalone |
| [[Training Event Employee]] | HR-Core | Child table |
| [[Training Result]] | HR-Core | Standalone |
| [[Training Result Employee]] | HR-Core | Child table |
| [[Training Feedback]] | HR-Core | Standalone |
| [[Employee Training]] | HR-Core | Child table |
| [[Employee Skill Map]] | HR-Core | Standalone |
| [[Employee Skill]] | HR-Core | Child table |
| [[Skill]] | HR-Core | Standalone (lookup) |
| [[Skill Assessment]] | HR-Core (functionally Recruitment) | Child table |
| [[Designation Skill]] | HR-Core | Child table |
| [[Expected Skill Set]] | HR-Core (functionally Recruitment) | Child table |
| [[Leave Type]] | Leaves | Standalone (lookup) |
| [[Leave Period]] | Leaves | Standalone (lookup) |
| [[Leave Policy]] | Leaves | Standalone |
| [[Leave Policy Detail]] | Leaves | Child table |
| [[Leave Policy Assignment]] | Leaves | Standalone |
| [[Leave Control Panel]] | Leaves | Standalone (transient/tool) |
| [[Leave Allocation]] | Leaves | Standalone |
| [[Earned Leave Schedule]] | Leaves | Child table |
| [[Leave Adjustment]] | Leaves | Standalone |
| [[Compensatory Leave Request]] | Leaves | Standalone |
| [[Leave Application]] | Leaves | Standalone |
| [[Leave Encashment]] | Leaves | Standalone |
| [[Leave Ledger Entry]] | Leaves | Standalone (append-only ledger) |
| [[Leave Block List]] | Leaves | Standalone |
| [[Leave Block List Date]] | Leaves | Child table |
| [[Leave Block List Allow]] | Leaves | Child table |
| [[Holiday List Assignment]] | Leaves | Standalone |
| Holiday List (external/core) | Leaves (dependency) | Standalone |
| Holiday (external/core) | Leaves (dependency) | Child table |
| [[Salary Component]] | Payroll | Standalone (lookup) |
| [[Salary Component Account]] | Payroll | Child table |
| [[Salary Detail]] | Payroll | Child table |
| [[Salary Structure]] | Payroll | Standalone |
| [[Salary Structure Assignment]] | Payroll | Standalone |
| [[Bulk Salary Structure Assignment]] | Payroll | Standalone (transient/tool) |
| [[Salary Slip]] | Payroll | Standalone |
| [[Salary Slip Leave]] | Payroll | Child table |
| [[Salary Slip Loan]] | Payroll | Child table |
| [[Salary Slip Timesheet]] | Payroll | Child table |
| [[Payroll Entry]] | Payroll | Standalone |
| [[Payroll Employee Detail]] | Payroll | Child table |
| [[Payroll Period]] | Payroll | Standalone (lookup) |
| [[Payroll Period Date]] | Payroll | Child table |
| [[Payroll Settings]] | Payroll | Standalone (singleton) |
| [[Employee Benefit Application]] | Payroll | Standalone |
| [[Employee Benefit Application Detail]] | Payroll | Child table |
| [[Employee Benefit Claim]] | Payroll | Standalone |
| [[Employee Benefit Detail]] | Payroll | Child table |
| [[Employee Benefit Ledger]] | Payroll | Standalone (ledger) |
| [[Employee Incentive]] | Payroll | Standalone |
| [[Employee Other Income]] | Payroll | Standalone |
| [[Employee Tax Exemption Category]] | Payroll | Standalone (lookup) |
| [[Employee Tax Exemption Sub Category]] | Payroll | Standalone (lookup) |
| [[Employee Tax Exemption Declaration]] | Payroll | Standalone |
| [[Employee Tax Exemption Declaration Category]] | Payroll | Child table |
| [[Employee Tax Exemption Proof Submission]] | Payroll | Standalone |
| [[Employee Tax Exemption Proof Submission Detail]] | Payroll | Child table |
| [[Income Tax Slab]] | Payroll | Standalone |
| [[Income Tax Slab Other Charges]] | Payroll | Child table |
| [[Taxable Salary Slab]] | Payroll | Child table |
| [[Additional Salary]] | Payroll | Standalone |
| [[Arrear]] | Payroll | Standalone |
| [[Retention Bonus]] | Payroll | Standalone |
| [[Gratuity]] | Payroll | Standalone |
| [[Gratuity Rule]] | Payroll | Standalone (lookup) |
| [[Gratuity Rule Slab]] | Payroll | Child table |
| [[Gratuity Applicable Component]] | Payroll | Child table |
| [[Employee Cost Center]] | Payroll | Child table |
| [[Payroll Correction]] | Payroll | Standalone |
| [[Payroll Correction Child]] | Payroll | Child table |
| [[Salary Withholding]] | Payroll | Standalone |
| [[Salary Withholding Cycle]] | Payroll | Child table |
| [[Job Requisition]] | Recruitment | Standalone |
| [[Job Opening]] | Recruitment | Standalone |
| [[Job Opening Template]] | Recruitment | Standalone |
| [[Job Applicant]] | Recruitment | Standalone |
| [[Job Applicant Source]] | Recruitment | Standalone (lookup) |
| [[Interview Type]] | Recruitment | Standalone |
| [[Interviewer]] | Recruitment | Child table |
| [[Interview]] | Recruitment | Standalone |
| [[Interview Detail]] | Recruitment | Child table |
| [[Interview Feedback]] | Recruitment | Standalone |
| [[Job Offer]] | Recruitment | Standalone |
| [[Job Offer Term]] | Recruitment | Child table |
| [[Job Offer Term Template]] | Recruitment | Standalone |
| [[Appraisal]] | Performance | Standalone |
| [[Appraisal Cycle]] | Performance | Standalone |
| [[Appraisal Goal]] | Performance | Child table |
| [[Appraisal KRA]] | Performance | Child table |
| [[Appraisal Template]] | Performance | Standalone |
| [[Appraisal Template Goal]] | Performance | Child table |
| [[Goal]] | Performance | Standalone |
| [[Employee Performance Feedback]] | Performance | Standalone |
| [[Employee Feedback Criteria]] | Performance | Standalone (lookup) |
| [[Employee Feedback Rating]] | Performance | Child table |
| [[Attendance]] | Shift-Attendance | Standalone |
| [[Attendance Request]] | Shift-Attendance | Standalone |
| [[Employee Checkin]] | Shift-Attendance | Standalone |
| [[Employee Attendance Tool]] | Shift-Attendance | Standalone (transient/tool) |
| [[Shift Type]] | Shift-Attendance | Standalone (lookup) |
| [[Shift Assignment]] | Shift-Attendance | Standalone |
| [[Shift Request]] | Shift-Attendance | Standalone |
| [[Shift Schedule]] | Shift-Attendance | Standalone |
| [[Shift Schedule Assignment]] | Shift-Attendance | Standalone |
| [[Shift Assignment Tool]] | Shift-Attendance | Standalone (transient/tool) |
| [[Shift Location]] | Shift-Attendance | Standalone (lookup) |
| [[Expense Claim]] | Expenses | Standalone |
| [[Expense Claim Type]] | Expenses | Standalone (lookup) |
| [[Expense Claim Account]] | Expenses | Child table |
| [[Expense Claim Detail]] | Expenses | Child table |
| [[Expense Claim Advance]] | Expenses | Child table |
| [[Expense Taxes and Charges]] | Expenses | Child table |
| [[HR Settings]] | HR-Setup | Standalone (singleton) |
| [[Employment Type]] | HR-Setup | Standalone (lookup) |
| Company (external/core, hooked) | HR-Setup (dependency) | Standalone |
| Branch (external/core) | HR-Setup (dependency) | Standalone |

## Regional (strategy-layer, not standalone tables)

[[India HRA Exemption]], [[India Marginal Relief Tax]], [[India Gratuity Rule Setup + Custom
Fields]], [[UAE Gratuity Rules]] — these are calculation overrides and fixture-seeding
routines, not their own tables; see `01-Modules/Regional/` for the exact custom
fields they add to existing tables (Company, Salary Component, Employee) and the
Gratuity Rule/Gratuity Rule Slab records they seed.

## "Transient/Tool" Doctypes

Several rows above are marked "transient/tool" — these are Frappe's pattern for a
non-persistent, form-only utility (Leave Control Panel, Bulk Salary Structure
Assignment, Employee Attendance Tool, Shift Assignment Tool) that exists purely to
run a bulk operation and doesn't represent data that needs to persist long-term
beyond an audit log of "this bulk action ran." **Port equivalent:** implement these
as request-scoped bulk-operation endpoints (a POST that runs a batch job) rather than
full CRUD-backed tables — optionally log the invocation (who ran it, what parameters,
result count) to a lightweight audit table if you want traceability, but don't model
them as editable/listable records the way the rest of this index implies.

See also: `02-Cross-Cutting/Employee Core Model.md`, `02-Cross-Cutting/Naming and Autoname Rules.md`,
each module's own `_Module-Spec.md` for the actual FK/relationship-level schema
recommendation (this index is the flat checklist, the module specs have the ERD detail).
