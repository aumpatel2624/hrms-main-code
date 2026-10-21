# Salary Slips

One payslip for one employee for one period — computed from their current Salary Structure Assignment plus their actual attendance/leave for that period.

![Salary Slips](../screenshots/salary-slip-light.png "light")

![Salary Slips](../screenshots/salary-slip-dark.png "dark")

## When you would use this

Create one once a period's attendance and leave are finalized. Everything on it — payment days, every earning/deduction row, the totals — is computed once at that moment and does not change afterward, even if attendance is corrected later.

## What you fill in

### Slip details

- **Employee** *(required, chosen from a list)*
- **Start date** *(required, a date)*
- **End date** *(required, a date)*
- **Salary Structure Assignment (blank = auto-resolve the employee's current one)** *(chosen from a list)*

## Finding a record

Use the search box for a quick look-up, or open the filter panel to narrow the list by:

- Employee
- Company
- Start date
- End date
- Status
- Created

Your filters and column layout are remembered, so the list looks the same next time you open it.

## Adding a Salary Slip

Press **Add Salary Slip** at the top right of the list. That opens a blank form.

1. Fill in the fields described above. Required ones are marked with an asterisk.
2. Press **Create salary slip** at the bottom of the form.

Anything missing or invalid is flagged underneath the field it belongs to, and nothing is saved until every one of those is cleared. Once it saves you are returned to the list with the new record in it.

**Cancel** leaves without saving. Nothing is kept, so a half-filled form is not waiting for you when you come back.

![Adding a Salary Slip](../screenshots/salary-slip-add-light.png "light")

![Adding a Salary Slip](../screenshots/salary-slip-add-dark.png "dark")

*Needs the **write** permission — without it the button is not shown.*

## Viewing a Salary Slip

Press the view icon on a row to open the record on its own screen. It shows the same fields in the same order as the form, but read-only, with related records shown by name rather than as a reference.

At the bottom you get when the record was created and when it was last changed, and a badge at the top shows whether it is active. **Edit** takes you straight into changing it.

**Back** returns to the list. Passwords are never shown here, on any record.

![Viewing a Salary Slip](../screenshots/salary-slip-view-light.png "light")

![Viewing a Salary Slip](../screenshots/salary-slip-view-dark.png "dark")

*Needs the **read** permission — without it the button is not shown.*

## Editing a Salary Slip

Press the edit icon on a row, or **Edit** while viewing a record. The form opens with the current values already in it.

Change what you need and press **Save changes**. The same checks as adding apply, and you are returned to the list once it saves.

Every change is recorded — who made it, when, and what each value was before. You can read that back on the **Audit Log** screen.

![Editing a Salary Slip](../screenshots/salary-slip-edit-light.png "light")

![Editing a Salary Slip](../screenshots/salary-slip-edit-dark.png "dark")

*Needs the **edit** permission — without it the button is not shown.*

## Deleting a Salary Slip

Press the delete icon on a row. You are asked to confirm first, and nothing is removed until you do.

If something else in the system still refers to this salary slip, the deletion is refused and you are told what is using it. Clear or reassign those first, then try again.

Deleting hides the record rather than destroying it, so history and past reports stay intact. If you only want it out of the dropdowns on other screens, untick **Is Active** instead — that keeps it available to look up.

*Needs the **delete** permission — without it the button is not shown.*

## Things worth knowing

> [!WARNING] Worth knowing
> Payment Days can be less than the period's Working Days — an unpaid leave day, an unmarked day (depending on Payroll Settings), a half day, or joining/leaving mid-period all reduce it.

> [!WARNING] Worth knowing
> A Draft slip may show a negative Net Pay — that's a warning sign to check the Salary Structure, not a blocked state. Submitting is what enforces Net Pay >= 0.

> [!WARNING] Worth knowing
> Submit and Cancel are the two actions — there is no edit-in-place; get the period/structure right before creating it, since a slip is a point-in-time snapshot.

> [!WARNING] Worth knowing
> Only one Salary Slip per employee per exact (Start Date, End Date) pair is allowed.

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
> HR User and HR Manager manage records within their company.
