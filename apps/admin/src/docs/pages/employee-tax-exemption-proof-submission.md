# Tax Exemption Proof Submissions

Employee's substantiated proof of actual tax-saving investments/expenses, used to finalize the year's tax calculation.

![Tax Exemption Proof Submissions](../screenshots/employee-tax-exemption-proof-submission-light.png "light")

![Tax Exemption Proof Submissions](../screenshots/employee-tax-exemption-proof-submission-dark.png "dark")

## When you would use this

Near the end of the fiscal year, employees submit actual proof of the exemptions they declared earlier.

## What you fill in

### Proof Details

- **Employee** *(required, chosen from a list)*
- **Payroll Period** *(required, chosen from a list)*
- **Submission Date** *(a date)*
- **Currency**
- **House Rent Payment Amount** *(a number)*
- **Rented From** *(a date)*
- **Rented To** *(a date)*
- **Rented in Metro City** *(a yes/no tick box)*
- **Monthly House Rent** *(a number)*
- **Eligible HRA Exemption** *(a number)*
- **Annual HRA Amount** *(a number)*
- **Total Actual Amount** *(a number)*
- **Exemption Amount** *(a number)*
- **Attachments**

### Status

- **Status**

## Finding a record

Use the search box for a quick look-up, or open the filter panel to narrow the list by:

- Employee
- Company
- Payroll Period
- Status
- Created

Your filters and column layout are remembered, so the list looks the same next time you open it.

## Adding a Tax Exemption Proof Submission

Press **Add Tax Exemption Proof Submission** at the top right of the list. That opens a blank form.

1. Fill in the fields described above. Required ones are marked with an asterisk.
2. Press **Create tax exemption proof submission** at the bottom of the form.

Anything missing or invalid is flagged underneath the field it belongs to, and nothing is saved until every one of those is cleared. Once it saves you are returned to the list with the new record in it.

**Cancel** leaves without saving. Nothing is kept, so a half-filled form is not waiting for you when you come back.

![Adding a Tax Exemption Proof Submission](../screenshots/employee-tax-exemption-proof-submission-add-light.png "light")

![Adding a Tax Exemption Proof Submission](../screenshots/employee-tax-exemption-proof-submission-add-dark.png "dark")

*Needs the **write** permission — without it the button is not shown.*

## Viewing a Tax Exemption Proof Submission

Press the view icon on a row to open the record on its own screen. It shows the same fields in the same order as the form, but read-only, with related records shown by name rather than as a reference.

At the bottom you get when the record was created and when it was last changed, and a badge at the top shows whether it is active. **Edit** takes you straight into changing it.

**Back** returns to the list. Passwords are never shown here, on any record.

![Viewing a Tax Exemption Proof Submission](../screenshots/employee-tax-exemption-proof-submission-view-light.png "light")

![Viewing a Tax Exemption Proof Submission](../screenshots/employee-tax-exemption-proof-submission-view-dark.png "dark")

*Needs the **read** permission — without it the button is not shown.*

## Editing a Tax Exemption Proof Submission

Press the edit icon on a row, or **Edit** while viewing a record. The form opens with the current values already in it.

Change what you need and press **Save changes**. The same checks as adding apply, and you are returned to the list once it saves.

Every change is recorded — who made it, when, and what each value was before. You can read that back on the **Audit Log** screen.

![Editing a Tax Exemption Proof Submission](../screenshots/employee-tax-exemption-proof-submission-edit-light.png "light")

![Editing a Tax Exemption Proof Submission](../screenshots/employee-tax-exemption-proof-submission-edit-dark.png "dark")

*Needs the **edit** permission — without it the button is not shown.*

## Deleting a Tax Exemption Proof Submission

Press the delete icon on a row. You are asked to confirm first, and nothing is removed until you do.

If something else in the system still refers to this tax exemption proof submission, the deletion is refused and you are told what is using it. Clear or reassign those first, then try again.

Deleting hides the record rather than destroying it, so history and past reports stay intact. If you only want it out of the dropdowns on other screens, untick **Is Active** instead — that keeps it available to look up.

*Needs the **delete** permission — without it the button is not shown.*

## Things worth knowing

> [!WARNING] Worth knowing
> In the final payroll period of the fiscal year, a submitted proof amount completely replaces the earlier declared amount for that category — it does not add to it.

> [!WARNING] Worth knowing
> Any exemption category with no proof submitted by the final period drops to zero exemption, increasing that period's tax deduction.

## What your role controls

Each of these is granted separately for this screen on the **User Roles** screen:

- **read** — see this screen at all
- **write** — add new records
- **delete** — remove records
- **edit** — change existing records
- **print** — print or export
- **mail** — send email from this screen

> [!NOTE] Missing a button?
> A button you cannot see is a permission your role has not been granted. Ask whoever manages roles to grant it on the User Roles screen.

> [!INFO] What you can see
> Employees can create and manage their own proof submissions; HR User and HR Manager can view all in their company.
