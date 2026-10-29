# Attendance Requests

Ask for Attendance to be recorded for a date range — for working from home, being on duty elsewhere, or another reason attendance was not captured automatically.

![Attendance Requests](../screenshots/attendance-request-light.png "light")

![Attendance Requests](../screenshots/attendance-request-dark.png "dark")

## When you would use this

Use this screen instead of Employee Checkin when you were not able to check in/out for a shift but still worked.

## What you fill in

### Details

- **Employee** *(required, chosen from a list)*
- **From date** *(required, a date)*
- **To date** *(required, a date)*
- **Reason** *(required, chosen from a list)*
- **Half day** *(a yes/no tick box)*
- **Half day date** *(a date)*
- **Include holidays** *(a yes/no tick box)* — Select if any of the days in this request are holidays.
- **Explanation** *(free text)*

### Status

- **Status** *(chosen from a list)* — open until approved; active once approved and applied. Set by the actions below.

## Finding a record

Use the search box for a quick look-up, or open the filter panel to narrow the list by:

- Employee
- Company
- Approver
- Status
- Reason
- From date
- To date
- Created at

Your filters and column layout are remembered, so the list looks the same next time you open it.

## Adding an Attendance Request

Press **Add Attendance Request** at the top right of the list. That opens a blank form.

1. Fill in the fields described above. Required ones are marked with an asterisk.
2. Press **Create attendance request** at the bottom of the form.

Anything missing or invalid is flagged underneath the field it belongs to, and nothing is saved until every one of those is cleared. Once it saves you are returned to the list with the new record in it.

**Cancel** leaves without saving. Nothing is kept, so a half-filled form is not waiting for you when you come back.

![Adding an Attendance Request](../screenshots/attendance-request-add-light.png "light")

![Adding an Attendance Request](../screenshots/attendance-request-add-dark.png "dark")

*Needs the **write** permission — without it the button is not shown.*

## Viewing an Attendance Request

Press the view icon on a row to open the record on its own screen. It shows the same fields in the same order as the form, but read-only, with related records shown by name rather than as a reference.

At the bottom you get when the record was created and when it was last changed, and a badge at the top shows whether it is active. **Edit** takes you straight into changing it.

**Back** returns to the list. Passwords are never shown here, on any record.

![Viewing an Attendance Request](../screenshots/attendance-request-view-light.png "light")

![Viewing an Attendance Request](../screenshots/attendance-request-view-dark.png "dark")

*Needs the **read** permission — without it the button is not shown.*

## Editing an Attendance Request

Press the edit icon on a row, or **Edit** while viewing a record. The form opens with the current values already in it.

Change what you need and press **Save changes**. The same checks as adding apply, and you are returned to the list once it saves.

Every change is recorded — who made it, when, and what each value was before. You can read that back on the **Audit Log** screen.

![Editing an Attendance Request](../screenshots/attendance-request-edit-light.png "light")

![Editing an Attendance Request](../screenshots/attendance-request-edit-dark.png "dark")

*Needs the **edit** permission — without it the button is not shown.*

## Deleting an Attendance Request

Press the delete icon on a row. You are asked to confirm first, and nothing is removed until you do.

If something else in the system still refers to this attendance request, the deletion is refused and you are told what is using it. Clear or reassign those first, then try again.

Deleting hides the record rather than destroying it, so history and past reports stay intact. If you only want it out of the dropdowns on other screens, untick **Is Active** instead — that keeps it available to look up.

*Needs the **delete** permission — without it the button is not shown.*

## Things worth knowing

> [!WARNING] Worth knowing
> Saving is the action — it immediately creates or updates one Attendance record per day in the range.

> [!WARNING] Worth knowing
> A day that is a holiday is skipped unless Include Holidays is checked. A day already covered by an approved leave is always skipped.

> [!WARNING] Worth knowing
> Cancel reverses exactly the Attendance rows this request created — it does not touch any other Attendance record.

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
> Employees can create and read their own Attendance Requests and cancel them. HR User and HR Manager can read, edit and cancel every request.
