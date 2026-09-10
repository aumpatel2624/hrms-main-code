# Cross-Doctype Hooks — Full Reproduction of `hrms/hooks.py` `doc_events`

Frappe lets one doctype's controller run code in response to events on a DIFFERENT
doctype, registered centrally in `hooks.py` rather than inside either doctype's own
file. A port must implement this as an explicit **event-bus / observer pattern**:
when doctype X fires event E, look up and run every registered handler, regardless of
which "module" logically owns X. Missing this layer is the single easiest way for a
port to silently diverge from the original — none of this logic lives in the doctype
files themselves.

Source: `hrms/hooks.py` lines 169–246. Grouped below by the doctype that FIRES the
event (not by which module the handler function lives in — that's the point: it's
cross-cutting). Many of the events below (`on_submit`, `on_cancel`,
`on_update_after_submit`) are the submit/cancel transitions defined generically in
[[Submittable Document Lifecycle]]; several handlers also touch
[[Employee Core Model|Employee]] fields directly, and the time-triggered counterpart
to this event-driven layer is [[Background Jobs (Scheduler Events)]].

## `User`

| Event | Handler | Effect |
|---|---|---|
| validate | `erpnext.setup.doctype.employee.employee.validate_employee_role` | Core ERPNext check ensuring an Employee-linked User's role assignment stays consistent. |
| validate | `hrms.overrides.employee_master.update_approver_user_roles` | When a User is set as an Employee's `leave_approver`/`expense_approver`, ensures that User actually holds the `Leave Approver`/`Expense Approver` role — auto-assigns it if missing. **Port this as an insert/update trigger on the Employee approver fields**, not on User. |

## `Company` (core ERPNext doctype, HRMS attaches behavior)

| Event | Handler | Effect |
|---|---|---|
| validate | `hrms.overrides.company.validate_default_accounts` | Checks `default_payroll_payable_account` belongs to the company and matches its currency. |
| on_update | `hrms.overrides.company.make_company_fixtures` | When country changes, runs `hrms.regional.<country>.setup.setup()` and seeds default Salary Components for that country. |
| on_update | `hrms.overrides.company.set_default_hr_accounts` | Auto-fills `default_payroll_payable_account`/`default_employee_advance_account` by name-matching against the company's chart of accounts if unset. |
| on_trash | `hrms.overrides.company.handle_linked_docs` | Deletes records in `company_data_to_be_ignored` doctypes (Salary Component Account, Salary Structure, Salary Structure Assignment, Payroll Period, Income Tax Slab, Leave Period, Leave Policy Assignment, Employee Onboarding Template, Employee Separation Template) referencing the deleted company; clears `company` on Single doctypes that pointed at it. |

## `Holiday List` (core ERPNext)

| Event | Handler | Effect |
|---|---|---|
| on_update, on_trash | `hrms.utils.holiday_list.invalidate_cache` | Busts a cached holiday-lookup used by attendance/leave calculations — **port as cache invalidation on your own holiday-lookup cache**, not core logic itself. |

## `Timesheet` (core ERPNext)

| Event | Handler | Effect |
|---|---|---|
| validate | `hrms.hr.utils.validate_active_employee` | Blocks the Timesheet if the linked Employee is not Active. |

## `Payment Entry` (core ERPNext)

| Event | Handler | Effect |
|---|---|---|
| on_submit, on_cancel, on_update_after_submit | `hrms.hr.doctype.expense_claim.expense_claim.update_payment_for_expense_claim` | Recomputes the linked [[Expense Claim]]'s paid/outstanding amount and payment status. Same function for submit and cancel — it checks `docstatus` to decide direction. Full algorithm in `01-Modules/Expenses/Expense Claim.md`. |

## `Unreconcile Payment` (core ERPNext)

| Event | Handler | Effect |
|---|---|---|
| on_submit | `hrms.hr.doctype.expense_claim.expense_claim.update_payment_for_expense_claim` | Same handler as above — unreconciling a payment must also re-open the Expense Claim's outstanding balance. |

## `Journal Entry` (core ERPNext) — the busiest cross-cutting hook in the app

| Event | Handler | Effect |
|---|---|---|
| validate | `hrms.hr.doctype.expense_claim.expense_claim.validate_expense_claim_in_jv` | Validates a manually-created Journal Entry referencing an Expense Claim is consistent with it. |
| on_submit | `hrms.hr.doctype.expense_claim.expense_claim.update_payment_for_expense_claim` | Same as Payment Entry's hook — a JE can also be the payment instrument for an Expense Claim. |
| on_submit | `hrms.hr.doctype.full_and_final_statement.full_and_final_statement.update_full_and_final_statement_status` | Marks a [[Full and Final Statement]] as paid once its settlement JE is submitted. |
| on_submit | `hrms.payroll.doctype.salary_withholding.salary_withholding.update_salary_withholding_payment_status` | Marks a [[Salary Withholding]] as released/paid once its JE is submitted. |
| on_update_after_submit | `hrms.hr.doctype.expense_claim.expense_claim.update_payment_for_expense_claim` | Re-syncs if a submitted JE's amount/status is edited after submit. |
| on_cancel | `hrms.hr.doctype.expense_claim.expense_claim.update_payment_for_expense_claim` | Reverses the payment-applied state on the Expense Claim. |
| on_cancel | `hrms.payroll.doctype.salary_slip.salary_slip.unlink_ref_doc_from_salary_slip` | Removes the JE reference from any [[Salary Slip]] it was linked to. |
| on_cancel | `hrms.hr.doctype.full_and_final_statement.full_and_final_statement.update_full_and_final_statement_status` | Reverses the F&F Statement's paid status. |
| on_cancel | `hrms.payroll.doctype.salary_withholding.salary_withholding.update_salary_withholding_payment_status` | Reverses the Salary Withholding's paid status. |

**Port as:** an `AccountingEntryPosted`/`AccountingEntryCancelled` domain event, with
subscribers on Expense Claim, Full and Final Statement, and Salary Withholding — this
is the cleanest single place in the whole app to use an explicit event-driven design
in the port, since the original code already treats it that way structurally (one
firing doctype, several unrelated subscriber doctypes).

## `Loan` (from the separate, optional `lending` app)

| Event | Handler | Effect |
|---|---|---|
| validate | `hrms.hr.utils.validate_loan_repay_from_salary` | If a Loan is set to be repaid via salary deduction, validates that's actually configured correctly against the employee's Salary Structure. Only relevant if the `lending` app is installed — see `payroll` module's Port Notes on `if_lending_app_installed`. |

## `Employee` (core ERPNext, HRMS attaches most of its lifecycle logic here)

See [[Employee Core Model]] for the field-level detail behind the handlers below, and
[[Permission Model (RBAC)]] for how `leave_approver`/`expense_approver` role syncing
feeds into approver-scoped row filtering.

| Event | Handler | Effect |
|---|---|---|
| validate | `hrms.overrides.employee_master.validate_onboarding_process` | Blocks certain Employee edits/status changes while an [[Employee Onboarding]] is still in progress for them. |
| on_update | `hrms.overrides.employee_master.update_approver_role` | Ensures a newly-set `leave_approver`/`expense_approver` on this Employee holds the matching role (Employee-side trigger of the same policy as the `User` validate hook above). |
| on_update | `hrms.overrides.employee_master.publish_update` | Publishes a realtime update event (e.g. for live-updating open UI showing this employee). |
| after_insert | `hrms.overrides.employee_master.update_job_applicant_and_offer` | If this Employee was created from a hired candidate, links back to and updates the originating [[Job Applicant]]/[[Job Offer]] records. Full logic in `01-Modules/Recruitment/_Module-Spec.md`. |
| after_insert | `hrms.telemetry.on_milestone_insert` | Internal analytics only. |
| on_trash | `hrms.overrides.employee_master.update_employee_transfer` | Cleans up/updates any [[Employee Transfer]] records referencing this Employee if it's deleted. |
| after_delete | `hrms.overrides.employee_master.publish_update` | Same realtime publish, for deletion. |

## `Project` / `Task` (core ERPNext, used as the Employee Onboarding/Separation checklist engine)

| Event | Handler | Effect |
|---|---|---|
| Project validate | `hrms.controllers.employee_boarding_controller.update_employee_boarding_status` | Keeps an Employee Onboarding/[[Employee Separation]] record's overall status synced to the completion state of its underlying Project (HRMS models the onboarding/offboarding checklist AS a Project with Tasks). |
| Task on_update | `hrms.controllers.employee_boarding_controller.update_task` | Syncs an [[Employee Boarding Activity]] row's completion state when its linked Task's status changes. |

**Port note:** a port does not need to model onboarding as a generic "Project" — that's
Frappe reusing an existing core doctype opportunistically. A port can model
Employee Onboarding/Employee Separation with their own first-class checklist/task
child table and skip the Project/Task indirection entirely; see
`01-Modules/HR-Core/Employee Onboarding.md` Port Notes for the recommended direct
shape.

## Usage/Activation Telemetry Hooks (all internal analytics — do not replicate as features)

`Leave Application.on_submit`, `Expense Claim.on_submit`, `Attendance Request.on_submit`,
`Shift Request.on_submit`, `Employee Checkin.after_insert`, `Payroll Entry.on_submit`,
`Job Offer.on_submit`, `Appraisal.on_submit`, `Interview.on_submit`, and
`after_insert` milestones on `Shift Type`, `Leave Type`, `Salary Structure`,
`Job Opening`, `Appraisal Cycle`, `Employee Onboarding`, plus `Salary Slip.on_submit`
all fire into `hrms.telemetry` — this is Frappe HR's own product-analytics
instrumentation (tracking feature adoption), not business logic. Skip entirely in a
port unless you want equivalent analytics for your own product decisions.
