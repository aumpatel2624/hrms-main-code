# Arrears

Calculates retroactive salary differential pay when a Salary Structure Assignment is backdated.

![Arrears](../screenshots/arrear-light.png "light")

![Arrears](../screenshots/arrear-dark.png "dark")

## When you would use this

Create one after backdating an assignment to calculate and disburse retroactive pay differences.

## What you fill in

### Arrear Window

- **Employee** *(required, chosen from a list)*
- **Start Date (Retroactive)** *(required, a date)*
- **End Date (Retroactive)** *(required, a date)*
- **Payroll Date (Payout)** *(required, a date)*

## Finding a record

Use the search box for a quick look-up, or open the filter panel to narrow the list by:

- Employee
- Status
- Payroll date
- Created

Your filters and column layout are remembered, so the list looks the same next time you open it.

## Adding an Arrear

Press **Add Arrear** at the top right of the list. That opens a blank form.

1. Fill in the fields described above. Required ones are marked with an asterisk.
2. Press **Create arrear** at the bottom of the form.

Anything missing or invalid is flagged underneath the field it belongs to, and nothing is saved until every one of those is cleared. Once it saves you are returned to the list with the new record in it.

**Cancel** leaves without saving. Nothing is kept, so a half-filled form is not waiting for you when you come back.

![Adding an Arrear](../screenshots/arrear-add-light.png "light")

![Adding an Arrear](../screenshots/arrear-add-dark.png "dark")

*Needs the **write** permission — without it the button is not shown.*

## Viewing an Arrear

Press the view icon on a row to open the record on its own screen. It shows the same fields in the same order as the form, but read-only, with related records shown by name rather than as a reference.

At the bottom you get when the record was created and when it was last changed, and a badge at the top shows whether it is active. **Edit** takes you straight into changing it.

**Back** returns to the list. Passwords are never shown here, on any record.

![Viewing an Arrear](../screenshots/arrear-view-light.png "light")

![Viewing an Arrear](../screenshots/arrear-view-dark.png "dark")

*Needs the **read** permission — without it the button is not shown.*

## Editing an Arrear

Press the edit icon on a row, or **Edit** while viewing a record. The form opens with the current values already in it.

Change what you need and press **Save changes**. The same checks as adding apply, and you are returned to the list once it saves.

Every change is recorded — who made it, when, and what each value was before. You can read that back on the **Audit Log** screen.

![Editing an Arrear](../screenshots/arrear-edit-light.png "light")

![Editing an Arrear](../screenshots/arrear-edit-dark.png "dark")

*Needs the **edit** permission — without it the button is not shown.*

## Deleting an Arrear

Press the delete icon on a row. You are asked to confirm first, and nothing is removed until you do.

If something else in the system still refers to this arrear, the deletion is refused and you are told what is using it. Clear or reassign those first, then try again.

Deleting hides the record rather than destroying it, so history and past reports stay intact. If you only want it out of the dropdowns on other screens, untick **Is Active** instead — that keeps it available to look up.

*Needs the **delete** permission — without it the button is not shown.*

## Things worth knowing

> [!WARNING] Worth knowing
> Only positive differences (underpayments) are calculated; reductions in pay are not clawed back.

> [!WARNING] Worth knowing
> Submit generates active Additional Salary records; cancelling an Arrear cancels those generated records too.

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
