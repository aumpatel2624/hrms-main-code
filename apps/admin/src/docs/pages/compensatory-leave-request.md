# Compensatory Leave Requests

A request for comp-off leave for a day (or range) worked on a holiday.

![Compensatory Leave Requests](../screenshots/compensatory-leave-request-light.png "light")

![Compensatory Leave Requests](../screenshots/compensatory-leave-request-dark.png "dark")

## When you would use this

An employee raises one for themselves after working a holiday or weekend; HR or a manager approves it.

## What you fill in

### Details

- **Employee** *(required, chosen from a list)*
- **Leave Type (must be Is Compensatory)** *(required, chosen from a list)*
- **Work From Date** *(required, a date)*
- **Work End Date** *(required, a date)*
- **Half Day** *(a yes/no tick box)*
- **Half Day Date** *(a date)*
- **Reason** *(required, free text)*

### Status

- **Status** *(chosen from a list)* — Set by the Approve/Reject actions below.

## Finding a record

Use the search box for a quick look-up, or open the filter panel to narrow the list by:

- Employee
- Leave Type
- Status
- Company
- Work From Date
- Work End Date
- Created

Your filters and column layout are remembered, so the list looks the same next time you open it.

## Adding a Compensatory Leave Request

Press **Add Compensatory Leave Request** at the top right of the list. That opens a blank form.

1. Fill in the fields described above. Required ones are marked with an asterisk.
2. Press **Create compensatory leave request** at the bottom of the form.

Anything missing or invalid is flagged underneath the field it belongs to, and nothing is saved until every one of those is cleared. Once it saves you are returned to the list with the new record in it.

**Cancel** leaves without saving. Nothing is kept, so a half-filled form is not waiting for you when you come back.

![Adding a Compensatory Leave Request](../screenshots/compensatory-leave-request-add-light.png "light")

![Adding a Compensatory Leave Request](../screenshots/compensatory-leave-request-add-dark.png "dark")

*Needs the **write** permission — without it the button is not shown.*

## Viewing a Compensatory Leave Request

Press the view icon on a row to open the record on its own screen. It shows the same fields in the same order as the form, but read-only, with related records shown by name rather than as a reference.

At the bottom you get when the record was created and when it was last changed, and a badge at the top shows whether it is active. **Edit** takes you straight into changing it.

**Back** returns to the list. Passwords are never shown here, on any record.

![Viewing a Compensatory Leave Request](../screenshots/compensatory-leave-request-view-light.png "light")

![Viewing a Compensatory Leave Request](../screenshots/compensatory-leave-request-view-dark.png "dark")

*Needs the **read** permission — without it the button is not shown.*

## Editing a Compensatory Leave Request

Press the edit icon on a row, or **Edit** while viewing a record. The form opens with the current values already in it.

Change what you need and press **Save changes**. The same checks as adding apply, and you are returned to the list once it saves.

Every change is recorded — who made it, when, and what each value was before. You can read that back on the **Audit Log** screen.

![Editing a Compensatory Leave Request](../screenshots/compensatory-leave-request-edit-light.png "light")

![Editing a Compensatory Leave Request](../screenshots/compensatory-leave-request-edit-dark.png "dark")

*Needs the **edit** permission — without it the button is not shown.*

## Deleting a Compensatory Leave Request

Press the delete icon on a row. You are asked to confirm first, and nothing is removed until you do.

If something else in the system still refers to this compensatory leave request, the deletion is refused and you are told what is using it. Clear or reassign those first, then try again.

Deleting hides the record rather than destroying it, so history and past reports stay intact. If you only want it out of the dropdowns on other screens, untick **Is Active** instead — that keeps it available to look up.

*Needs the **delete** permission — without it the button is not shown.*

## Things worth knowing

> [!WARNING] Worth knowing
> Approving checks that every day in the range is actually a holiday on the employee's Holiday List, and that matching Attendance records exist for the whole range — both are hard blocks, not warnings.

> [!WARNING] Worth knowing
> The Leave Type must have Is Compensatory set.

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
> HR User and HR Manager have full access; Employees can create, read and edit (not delete once approved) their own requests, but cannot approve or reject.
