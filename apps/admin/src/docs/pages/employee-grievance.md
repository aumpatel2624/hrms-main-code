# Employee Grievances

A filed workplace grievance and its investigation/resolution.

![Employee Grievances](../screenshots/employee-grievance-light.png "light")

![Employee Grievances](../screenshots/employee-grievance-dark.png "dark")

## When you would use this

Log a grievance as soon as it's raised, then update its Status as it's investigated and resolved.

## What you fill in

### Details

- **Subject** *(required)*
- **Raised By** *(required, chosen from a list)*
- **Date** *(required, a date)*
- **Status** *(chosen from a list)*
- **Grievance Type** *(required, chosen from a list)*
- **Grievance Against (Employee)** *(chosen from a list)*
- **Grievance Against (free text, if not a specific employee)**
- **Description** *(required, free text)*

### Investigation & Resolution

- **Cause of Grievance** *(free text)*
- **Resolved By (User id)**
- **Resolution Date** *(a date)*
- **Resolution Detail** *(free text)*
- **Employee Responsible** *(chosen from a list)*

## Finding a record

Use the search box for a quick look-up, or open the filter panel to narrow the list by:

- Raised By
- Grievance Type
- Status
- Date
- Active
- Created

Your filters and column layout are remembered, so the list looks the same next time you open it.

## Adding an Employee Grievance

Press **Add Employee Grievance** at the top right of the list. That opens a blank form.

1. Fill in the fields described above. Required ones are marked with an asterisk.
2. Press **Create employee grievance** at the bottom of the form.

Anything missing or invalid is flagged underneath the field it belongs to, and nothing is saved until every one of those is cleared. Once it saves you are returned to the list with the new record in it.

**Cancel** leaves without saving. Nothing is kept, so a half-filled form is not waiting for you when you come back.

![Adding an Employee Grievance](../screenshots/employee-grievance-add-light.png "light")

![Adding an Employee Grievance](../screenshots/employee-grievance-add-dark.png "dark")

*Needs the **write** permission — without it the button is not shown.*

## Viewing an Employee Grievance

Press the view icon on a row to open the record on its own screen. It shows the same fields in the same order as the form, but read-only, with related records shown by name rather than as a reference.

At the bottom you get when the record was created and when it was last changed, and a badge at the top shows whether it is active. **Edit** takes you straight into changing it.

**Back** returns to the list. Passwords are never shown here, on any record.

![Viewing an Employee Grievance](../screenshots/employee-grievance-view-light.png "light")

![Viewing an Employee Grievance](../screenshots/employee-grievance-view-dark.png "dark")

*Needs the **read** permission — without it the button is not shown.*

## Editing an Employee Grievance

Press the edit icon on a row, or **Edit** while viewing a record. The form opens with the current values already in it.

Change what you need and press **Save changes**. The same checks as adding apply, and you are returned to the list once it saves.

Every change is recorded — who made it, when, and what each value was before. You can read that back on the **Audit Log** screen.

![Editing an Employee Grievance](../screenshots/employee-grievance-edit-light.png "light")

![Editing an Employee Grievance](../screenshots/employee-grievance-edit-dark.png "dark")

*Needs the **edit** permission — without it the button is not shown.*

## Deleting an Employee Grievance

Press the delete icon on a row. You are asked to confirm first, and nothing is removed until you do.

If something else in the system still refers to this employee grievance, the deletion is refused and you are told what is using it. Clear or reassign those first, then try again.

Deleting hides the record rather than destroying it, so history and past reports stay intact. If you only want it out of the dropdowns on other screens, untick **Is Active** instead — that keeps it available to look up.

*Needs the **delete** permission — without it the button is not shown.*

## Things worth knowing

> [!WARNING] Worth knowing
> Cause of Grievance becomes required once Status is Investigated or Resolved.

> [!WARNING] Worth knowing
> Resolved By, Resolution Date and Resolution Detail all become required once Status is Resolved.

> [!WARNING] Worth knowing
> "Grievance Against" can name a specific employee or just be typed as free text — use whichever fits.

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
> HR User, HR Manager and the Employee role can all fully manage grievances, including delete.
