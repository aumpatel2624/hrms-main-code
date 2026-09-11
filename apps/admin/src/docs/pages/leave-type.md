# Leave Types

A category of leave (Casual, Sick, Earned, ...) and the rules that govern it — paid/unpaid, carry-forward, encashment, earned-leave accrual.

![Leave Types](../screenshots/leave-type-light.png "light")

![Leave Types](../screenshots/leave-type-dark.png "dark")

## When you would use this

Set these up once, before building Leave Policies on top of them.

## What you fill in

### Details

- **Leave Type Name** *(required)*
- **Is Compensatory** *(a yes/no tick box)*
- **Is Leave Without Pay** *(a yes/no tick box)*
- **Is Partially Paid Leave** *(a yes/no tick box)*
- **Fraction of Daily Salary per Leave** *(a number)* — Required, 0-1, when Is Partially Paid Leave is set.
- **Allow Negative Balance** *(a yes/no tick box)*
- **Allow Over Allocation** *(a yes/no tick box)*
- **Include holidays within leaves as leaves** *(a yes/no tick box)*
- **Leave for optional holiday** *(a yes/no tick box)*

### Carry Forward

- **Carry Forward** *(a yes/no tick box)*
- **Maximum Carry Forwarded Leaves** *(a number)*
- **Expire Carry Forwarded Leaves (Days)** *(a number)*

### Encashment

- **Allow Encashment** *(a yes/no tick box)*
- **Maximum Encashable Leaves** *(a number)*
- **Non-Encashable Leaves** *(a number)*

### Earned Leave

- **Is Earned Leave** *(a yes/no tick box)*
- **Earned Leave Frequency** *(chosen from a list)*
- **Allocate on Day** *(chosen from a list)*
- **Rounding** *(chosen from a list)*

### Limits

- **Maximum Leave Allocation Allowed per Leave Period** *(a number)*
- **Maximum Consecutive Leaves Allowed** *(a number)*
- **Allow Leave Application After (Calendar Days)** *(a number)*

### Status

- **Is Active** *(a yes/no tick box)* — Inactive records stay in the system and keep their history, but stop being offered in dropdowns on other screens.

## Finding a record

Use the search box for a quick look-up, or open the filter panel to narrow the list by:

- Name
- Leave Without Pay
- Earned Leave
- Compensatory
- Active
- Created

Your filters and column layout are remembered, so the list looks the same next time you open it.

## Adding a Leave Type

Press **Add Leave Type** at the top right of the list. That opens a blank form.

1. Fill in the fields described above. Required ones are marked with an asterisk.
2. Press **Create leave type** at the bottom of the form.

Anything missing or invalid is flagged underneath the field it belongs to, and nothing is saved until every one of those is cleared. Once it saves you are returned to the list with the new record in it.

**Cancel** leaves without saving. Nothing is kept, so a half-filled form is not waiting for you when you come back.

![Adding a Leave Type](../screenshots/leave-type-add-light.png "light")

![Adding a Leave Type](../screenshots/leave-type-add-dark.png "dark")

*Needs the **write** permission — without it the button is not shown.*

## Viewing a Leave Type

Press the view icon on a row to open the record on its own screen. It shows the same fields in the same order as the form, but read-only, with related records shown by name rather than as a reference.

At the bottom you get when the record was created and when it was last changed, and a badge at the top shows whether it is active. **Edit** takes you straight into changing it.

**Back** returns to the list. Passwords are never shown here, on any record.

![Viewing a Leave Type](../screenshots/leave-type-view-light.png "light")

![Viewing a Leave Type](../screenshots/leave-type-view-dark.png "dark")

*Needs the **read** permission — without it the button is not shown.*

## Editing a Leave Type

Press the edit icon on a row, or **Edit** while viewing a record. The form opens with the current values already in it.

Change what you need and press **Save changes**. The same checks as adding apply, and you are returned to the list once it saves.

Every change is recorded — who made it, when, and what each value was before. You can read that back on the **Audit Log** screen.

![Editing a Leave Type](../screenshots/leave-type-edit-light.png "light")

![Editing a Leave Type](../screenshots/leave-type-edit-dark.png "dark")

*Needs the **edit** permission — without it the button is not shown.*

## Deleting a Leave Type

Press the delete icon on a row. You are asked to confirm first, and nothing is removed until you do.

If something else in the system still refers to this leave type, the deletion is refused and you are told what is using it. Clear or reassign those first, then try again.

Deleting hides the record rather than destroying it, so history and past reports stay intact. If you only want it out of the dropdowns on other screens, untick **Is Active** instead — that keeps it available to look up.

*Needs the **delete** permission — without it the button is not shown.*

## Things worth knowing

> [!WARNING] Worth knowing
> The starter set (Casual/Sick/Earned/Compensatory Off/Leave Without Pay) is a generic placeholder, not confirmed against any client document — review and adjust before relying on it.

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
> HR User and HR Manager can fully manage leave types; Employees can only view them.
