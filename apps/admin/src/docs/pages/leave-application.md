# Leave Applications

The centerpiece of Leaves — an employee's request for time off.

![Leave Applications](../screenshots/leave-application-light.png "light")

![Leave Applications](../screenshots/leave-application-dark.png "dark")

## When you would use this

An employee (or someone on their behalf) creates one for a date range; their Leave Approver — or HR — approves or rejects it.

## What you fill in

### Details

- **Employee** *(required, chosen from a list)*
- **Leave Type** *(required, chosen from a list)*
- **From Date** *(required, a date)*
- **To Date** *(required, a date)*
- **Half Day** *(a yes/no tick box)*
- **Half Day Date** *(a date)*
- **Reason** *(free text)*
- **Total Leave Days (computed)** *(a number)* — Always recomputed server-side on save — never trust a typed value here.

### Approval

- **Leave Approver (leave blank to auto-resolve)** *(chosen from a list)*
- **Posting Date** *(a date)*

### Status

- **Status** *(chosen from a list)* — Set by the Approve/Reject/Cancel actions below.

## Finding a record

Use the search box for a quick look-up, or open the filter panel to narrow the list by:

- Employee
- Leave Type
- Status
- Company
- Leave Approver
- From Date
- To Date
- Created

Your filters and column layout are remembered, so the list looks the same next time you open it.

## Adding a Leave Application

Press **Add Leave Application** at the top right of the list. That opens a blank form.

1. Fill in the fields described above. Required ones are marked with an asterisk.
2. Press **Create leave application** at the bottom of the form.

Anything missing or invalid is flagged underneath the field it belongs to, and nothing is saved until every one of those is cleared. Once it saves you are returned to the list with the new record in it.

**Cancel** leaves without saving. Nothing is kept, so a half-filled form is not waiting for you when you come back.

![Adding a Leave Application](../screenshots/leave-application-add-light.png "light")

![Adding a Leave Application](../screenshots/leave-application-add-dark.png "dark")

*Needs the **write** permission — without it the button is not shown.*

## Viewing a Leave Application

Press the view icon on a row to open the record on its own screen. It shows the same fields in the same order as the form, but read-only, with related records shown by name rather than as a reference.

At the bottom you get when the record was created and when it was last changed, and a badge at the top shows whether it is active. **Edit** takes you straight into changing it.

**Back** returns to the list. Passwords are never shown here, on any record.

![Viewing a Leave Application](../screenshots/leave-application-view-light.png "light")

![Viewing a Leave Application](../screenshots/leave-application-view-dark.png "dark")

*Needs the **read** permission — without it the button is not shown.*

## Editing a Leave Application

Press the edit icon on a row, or **Edit** while viewing a record. The form opens with the current values already in it.

Change what you need and press **Save changes**. The same checks as adding apply, and you are returned to the list once it saves.

Every change is recorded — who made it, when, and what each value was before. You can read that back on the **Audit Log** screen.

![Editing a Leave Application](../screenshots/leave-application-edit-light.png "light")

![Editing a Leave Application](../screenshots/leave-application-edit-dark.png "dark")

*Needs the **edit** permission — without it the button is not shown.*

## Deleting a Leave Application

Press the delete icon on a row. You are asked to confirm first, and nothing is removed until you do.

If something else in the system still refers to this leave application, the deletion is refused and you are told what is using it. Clear or reassign those first, then try again.

Deleting hides the record rather than destroying it, so history and past reports stay intact. If you only want it out of the dropdowns on other screens, untick **Is Active** instead — that keeps it available to look up.

*Needs the **delete** permission — without it the button is not shown.*

## Things worth knowing

> [!WARNING] Worth knowing
> Total Leave Days and the Leave Approver (when left blank) are always computed/resolved on save — a typed value is never trusted.

> [!WARNING] Worth knowing
> Approving creates Attendance records for the range and posts to the Leave Ledger; Cancelling an approved application reverses both.

> [!WARNING] Worth knowing
> An Employee sees only their own applications here; a Leave Approver sees their own plus everyone they're the resolved approver for.

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
> Employee: own applications only (create/read/edit, no delete). Leave Approver: read/approve/reject/cancel on their own plus everyone they approve for. HR User and HR Manager: everyone's.
