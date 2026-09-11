# Attendance

One row per employee per day, recording whether they were present, absent, on leave, etc.

![Attendance](../screenshots/attendance-light.png "light")

![Attendance](../screenshots/attendance-dark.png "dark")

## When you would use this

Minimal for now — module 9 (Shift & Attendance) will extend this with shift assignment, check-in/out and geolocation.

## What you fill in

- **Employee** *(required, chosen from a list)*
- **Company** *(chosen from a list)*
- **Attendance Date** *(required, a date)*
- **Status** *(required, chosen from a list)*
- **Leave Type** *(chosen from a list)*

- **Is Active** *(a yes/no tick box)* — Inactive records stay in the system and keep their history, but stop being offered in dropdowns on other screens.

## Finding a record

Use the search box for a quick look-up, or open the filter panel to narrow the list by:

- Department id
- Shift id
- Working hours
- Standard working hours
- Actual overtime duration
- Late entry
- Early exit
- In time
- Out time
- Half day status
- Employee
- Company
- Status
- Attendance Date
- Active
- Created

Your filters and column layout are remembered, so the list looks the same next time you open it.

## Adding an Attendance

Press **Add Attendance** at the top right of the list. That opens a blank form.

1. Fill in the fields described above. Required ones are marked with an asterisk.
2. Press **Create attendance** at the bottom of the form.

Anything missing or invalid is flagged underneath the field it belongs to, and nothing is saved until every one of those is cleared. Once it saves you are returned to the list with the new record in it.

**Cancel** leaves without saving. Nothing is kept, so a half-filled form is not waiting for you when you come back.

![Adding an Attendance](../screenshots/attendance-add-light.png "light")

![Adding an Attendance](../screenshots/attendance-add-dark.png "dark")

*Needs the **write** permission — without it the button is not shown.*

## Viewing an Attendance

Press the view icon on a row to open the record on its own screen. It shows the same fields in the same order as the form, but read-only, with related records shown by name rather than as a reference.

At the bottom you get when the record was created and when it was last changed, and a badge at the top shows whether it is active. **Edit** takes you straight into changing it.

**Back** returns to the list. Passwords are never shown here, on any record.

![Viewing an Attendance](../screenshots/attendance-view-light.png "light")

![Viewing an Attendance](../screenshots/attendance-view-dark.png "dark")

*Needs the **read** permission — without it the button is not shown.*

## Editing an Attendance

Press the edit icon on a row, or **Edit** while viewing a record. The form opens with the current values already in it.

Change what you need and press **Save changes**. The same checks as adding apply, and you are returned to the list once it saves.

Every change is recorded — who made it, when, and what each value was before. You can read that back on the **Audit Log** screen.

![Editing an Attendance](../screenshots/attendance-edit-light.png "light")

![Editing an Attendance](../screenshots/attendance-edit-dark.png "dark")

*Needs the **edit** permission — without it the button is not shown.*

## Deleting an Attendance

Press the delete icon on a row. You are asked to confirm first, and nothing is removed until you do.

If something else in the system still refers to this attendance, the deletion is refused and you are told what is using it. Clear or reassign those first, then try again.

Deleting hides the record rather than destroying it, so history and past reports stay intact. If you only want it out of the dropdowns on other screens, untick **Is Active** instead — that keeps it available to look up.

*Needs the **delete** permission — without it the button is not shown.*

## Things worth knowing

> [!WARNING] Worth knowing
> Only one Attendance row is allowed per employee per day.

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
> HR User and HR Manager only.
