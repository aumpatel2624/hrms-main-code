# Employees

An employee is the hub every other HR record links to — leave, payroll, performance and everything else eventually refers back to this record. Real employee codes and reporting lines carry over from the org chart, so most employees are already here.

![Employees](../screenshots/employee-light.png "light")

![Employees](../screenshots/employee-dark.png "dark")

## When you would use this

Add an employee when someone new joins, before creating any other record about them.

## What you fill in

### Identity

- **Employee Code** *(required)*
- **Employee Name** *(required)*
- **Gender** *(chosen from a list)*
- **Date of Birth** *(a date)*

### Organization

- **Company** *(required, chosen from a list)*
- **Department** *(required, chosen from a list)*
- **Designation** *(required, chosen from a list)*
- **Branch** *(required, chosen from a list)*
- **Reports To** *(chosen from a list)*

### Employment

- **Status** *(chosen from a list)*
- **Date of Joining** *(required, a date)*
- **Relieving Date** *(a date)*
- **Employment Type** *(chosen from a list)*
- **Employee Grade** *(chosen from a list)*
- **Work Mode** *(chosen from a list)*
- **Shift** *(chosen from a list)*

### Other

- **Health Insurance Provider** *(chosen from a list)*
- **Health Insurance No.**

### Status

- **Is Active** *(a yes/no tick box)* — Inactive records stay in the system and keep their history, but stop being offered in dropdowns on other screens.

## Finding a record

Use the search box for a quick look-up, or open the filter panel to narrow the list by:

- Employee Code
- Employee Name
- Company
- Department
- Designation
- Branch
- Status
- Date of Joining
- Active
- Created

Your filters and column layout are remembered, so the list looks the same next time you open it.

## Adding an Employee

Press **Add Employee** at the top right of the list. That opens a blank form.

1. Fill in the fields described above. Required ones are marked with an asterisk.
2. Press **Create employee** at the bottom of the form.

Anything missing or invalid is flagged underneath the field it belongs to, and nothing is saved until every one of those is cleared. Once it saves you are returned to the list with the new record in it.

**Cancel** leaves without saving. Nothing is kept, so a half-filled form is not waiting for you when you come back.

![Adding an Employee](../screenshots/employee-add-light.png "light")

![Adding an Employee](../screenshots/employee-add-dark.png "dark")

*Needs the **write** permission — without it the button is not shown.*

## Viewing an Employee

Press the view icon on a row to open the record on its own screen. It shows the same fields in the same order as the form, but read-only, with related records shown by name rather than as a reference.

At the bottom you get when the record was created and when it was last changed, and a badge at the top shows whether it is active. **Edit** takes you straight into changing it.

**Back** returns to the list. Passwords are never shown here, on any record.

![Viewing an Employee](../screenshots/employee-view-light.png "light")

![Viewing an Employee](../screenshots/employee-view-dark.png "dark")

*Needs the **read** permission — without it the button is not shown.*

## Editing an Employee

Press the edit icon on a row, or **Edit** while viewing a record. The form opens with the current values already in it.

Change what you need and press **Save changes**. The same checks as adding apply, and you are returned to the list once it saves.

Every change is recorded — who made it, when, and what each value was before. You can read that back on the **Audit Log** screen.

![Editing an Employee](../screenshots/employee-edit-light.png "light")

![Editing an Employee](../screenshots/employee-edit-dark.png "dark")

*Needs the **edit** permission — without it the button is not shown.*

## Deleting an Employee

Press the delete icon on a row. You are asked to confirm first, and nothing is removed until you do.

If something else in the system still refers to this employee, the deletion is refused and you are told what is using it. Clear or reassign those first, then try again.

Deleting hides the record rather than destroying it, so history and past reports stay intact. If you only want it out of the dropdowns on other screens, untick **Is Active** instead — that keeps it available to look up.

*Needs the **delete** permission — without it the button is not shown.*

## Things worth knowing

> [!WARNING] Worth knowing
> Company, Department, Designation, Branch and Date of Joining are all required — an employee cannot be saved without them.

> [!WARNING] Worth knowing
> You cannot delete an employee while other records still reference them.

> [!WARNING] Worth knowing
> Employment Type, Grade and the three approver fields are optional and are not pre-filled — set them here if you use them.

> [!WARNING] Worth knowing
> This screen does not create a login for the employee. Self-service login is separate, future work — most employees here have no login yet.

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
> Only HR User and HR Manager can add or edit employees.
