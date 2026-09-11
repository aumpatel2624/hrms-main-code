# Shift Types

Define shift hours and how punches become worked hours.

![Shift Types](../screenshots/shift-type-light.png "light")

![Shift Types](../screenshots/shift-type-dark.png "dark")

## When you would use this

Use this screen when setting up shifts or recording attendance.

## What you fill in

### Details

- **Shift type name** *(required)*
- **Start time** *(required)* — 24-hour time, HH:mm (UTC).
- **End time** *(required)* — 24-hour time, HH:mm (UTC).
- **Holiday list** *(chosen from a list)*
- **Determine check in and check out** *(chosen from a list)*
- **Working hours calculation basis** *(chosen from a list)*
- **Color** *(chosen from a list)*
- **Process attendance after** *(a date)*
- **Last sync of checkin**
- **Working hours threshold for half day** *(a number)*
- **Working hours threshold for absent** *(a number)*
- **Begin check in before shift start time** *(a number)*
- **Allow check out after shift end time** *(a number)*
- **Late entry grace period** *(a number)*
- **Early exit grace period** *(a number)*
- **Enable auto attendance** *(a yes/no tick box)*
- **Mark auto attendance on holidays** *(a yes/no tick box)*
- **Enable late entry marking** *(a yes/no tick box)*
- **Enable early exit marking** *(a yes/no tick box)*
- **Auto update last sync** *(a yes/no tick box)*
- **Allow overtime** *(a yes/no tick box)*
- **Company** *(required, chosen from a list)*
- **Is active** *(required, a yes/no tick box)*

## Finding a record

Use the search box for a quick look-up, or open the filter panel to narrow the list by:

- Shift type name
- Holiday list id
- Enable auto attendance
- Company id
- Is active
- Created at

Your filters and column layout are remembered, so the list looks the same next time you open it.

## Adding a Shift Type

Press **Add Shift Type** at the top right of the list. That opens a blank form.

1. Fill in the fields described above. Required ones are marked with an asterisk.
2. Press **Create shift type** at the bottom of the form.

Anything missing or invalid is flagged underneath the field it belongs to, and nothing is saved until every one of those is cleared. Once it saves you are returned to the list with the new record in it.

**Cancel** leaves without saving. Nothing is kept, so a half-filled form is not waiting for you when you come back.

![Adding a Shift Type](../screenshots/shift-type-add-light.png "light")

![Adding a Shift Type](../screenshots/shift-type-add-dark.png "dark")

*Needs the **write** permission — without it the button is not shown.*

## Viewing a Shift Type

Press the view icon on a row to open the record on its own screen. It shows the same fields in the same order as the form, but read-only, with related records shown by name rather than as a reference.

At the bottom you get when the record was created and when it was last changed, and a badge at the top shows whether it is active. **Edit** takes you straight into changing it.

**Back** returns to the list. Passwords are never shown here, on any record.

![Viewing a Shift Type](../screenshots/shift-type-view-light.png "light")

![Viewing a Shift Type](../screenshots/shift-type-view-dark.png "dark")

*Needs the **read** permission — without it the button is not shown.*

## Editing a Shift Type

Press the edit icon on a row, or **Edit** while viewing a record. The form opens with the current values already in it.

Change what you need and press **Save changes**. The same checks as adding apply, and you are returned to the list once it saves.

Every change is recorded — who made it, when, and what each value was before. You can read that back on the **Audit Log** screen.

![Editing a Shift Type](../screenshots/shift-type-edit-light.png "light")

![Editing a Shift Type](../screenshots/shift-type-edit-dark.png "dark")

*Needs the **edit** permission — without it the button is not shown.*

## Deleting a Shift Type

Press the delete icon on a row. You are asked to confirm first, and nothing is removed until you do.

If something else in the system still refers to this shift type, the deletion is refused and you are told what is using it. Clear or reassign those first, then try again.

Deleting hides the record rather than destroying it, so history and past reports stay intact. If you only want it out of the dropdowns on other screens, untick **Is Active** instead — that keeps it available to look up.

*Needs the **delete** permission — without it the button is not shown.*

## Things worth knowing

> [!WARNING] Worth knowing
> Records referenced elsewhere cannot be deleted.

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
> HR User and HR Manager manage records within their company. Employees can read shift types and their own assignments, and create/read their own checkins.
