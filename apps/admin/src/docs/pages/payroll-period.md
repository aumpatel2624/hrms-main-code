# Payroll Periods

A company-scoped date range payroll runs against — also used to work out which dates are holidays for a Salary Slip.

![Payroll Periods](../screenshots/payroll-period-light.png "light")

![Payroll Periods](../screenshots/payroll-period-dark.png "dark")

## When you would use this

Set one up for each payroll run's date range before creating Salary Slips against it.

## What you fill in

### Period details

- **Company** *(required, chosen from a list)*
- **Start date** *(required, a date)*
- **End date** *(required, a date)*

### Status

- **Is Active** *(a yes/no tick box)* — Inactive records stay in the system and keep their history, but stop being offered in dropdowns on other screens.

## Finding a record

Use the search box for a quick look-up, or open the filter panel to narrow the list by:

- Company
- Start date
- End date
- Active
- Created

Your filters and column layout are remembered, so the list looks the same next time you open it.

## Adding a Payroll Period

Press **Add Payroll Period** at the top right of the list. That opens a blank form.

1. Fill in the fields described above. Required ones are marked with an asterisk.
2. Press **Create payroll period** at the bottom of the form.

Anything missing or invalid is flagged underneath the field it belongs to, and nothing is saved until every one of those is cleared. Once it saves you are returned to the list with the new record in it.

**Cancel** leaves without saving. Nothing is kept, so a half-filled form is not waiting for you when you come back.

![Adding a Payroll Period](../screenshots/payroll-period-add-light.png "light")

![Adding a Payroll Period](../screenshots/payroll-period-add-dark.png "dark")

*Needs the **write** permission — without it the button is not shown.*

## Viewing a Payroll Period

Press the view icon on a row to open the record on its own screen. It shows the same fields in the same order as the form, but read-only, with related records shown by name rather than as a reference.

At the bottom you get when the record was created and when it was last changed, and a badge at the top shows whether it is active. **Edit** takes you straight into changing it.

**Back** returns to the list. Passwords are never shown here, on any record.

![Viewing a Payroll Period](../screenshots/payroll-period-view-light.png "light")

![Viewing a Payroll Period](../screenshots/payroll-period-view-dark.png "dark")

*Needs the **read** permission — without it the button is not shown.*

## Editing a Payroll Period

Press the edit icon on a row, or **Edit** while viewing a record. The form opens with the current values already in it.

Change what you need and press **Save changes**. The same checks as adding apply, and you are returned to the list once it saves.

Every change is recorded — who made it, when, and what each value was before. You can read that back on the **Audit Log** screen.

![Editing a Payroll Period](../screenshots/payroll-period-edit-light.png "light")

![Editing a Payroll Period](../screenshots/payroll-period-edit-dark.png "dark")

*Needs the **edit** permission — without it the button is not shown.*

## Deleting a Payroll Period

Press the delete icon on a row. You are asked to confirm first, and nothing is removed until you do.

If something else in the system still refers to this payroll period, the deletion is refused and you are told what is using it. Clear or reassign those first, then try again.

Deleting hides the record rather than destroying it, so history and past reports stay intact. If you only want it out of the dropdowns on other screens, untick **Is Active** instead — that keeps it available to look up.

*Needs the **delete** permission — without it the button is not shown.*

## Things worth knowing

> [!WARNING] Worth knowing
> Start Date cannot be after End Date.

> [!WARNING] Worth knowing
> Two periods for the SAME company cannot overlap. Different companies may freely overlap — a period is company-specific.

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
