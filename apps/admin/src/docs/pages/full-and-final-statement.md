# Full and Final Statements

A final-settlement worksheet for a departing employee — what the company owes them, what they owe the company, and any company assets to recover.

![Full and Final Statements](../screenshots/full-and-final-statement-light.png "light")

![Full and Final Statements](../screenshots/full-and-final-statement-dark.png "dark")

## When you would use this

Create one once the employee's Relieving Date is confirmed, and fill in payables, receivables and any allocated assets by hand.

## What you fill in

### Details

- **Employee** *(required, chosen from a list)*
- **Transaction Date** *(required, a date)*

## Finding a record

Use the search box for a quick look-up, or open the filter panel to narrow the list by:

- Employee
- Company
- Status
- Transaction Date
- Active
- Created

Your filters and column layout are remembered, so the list looks the same next time you open it.

## Adding a Full and Final Statement

Press **Add Full and Final Statement** at the top right of the list. That opens a blank form.

1. Fill in the fields described above. Required ones are marked with an asterisk.
2. Press **Create full and final statement** at the bottom of the form.

Anything missing or invalid is flagged underneath the field it belongs to, and nothing is saved until every one of those is cleared. Once it saves you are returned to the list with the new record in it.

**Cancel** leaves without saving. Nothing is kept, so a half-filled form is not waiting for you when you come back.

![Adding a Full and Final Statement](../screenshots/full-and-final-statement-add-light.png "light")

![Adding a Full and Final Statement](../screenshots/full-and-final-statement-add-dark.png "dark")

*Needs the **write** permission — without it the button is not shown.*

## Viewing a Full and Final Statement

Press the view icon on a row to open the record on its own screen. It shows the same fields in the same order as the form, but read-only, with related records shown by name rather than as a reference.

At the bottom you get when the record was created and when it was last changed, and a badge at the top shows whether it is active. **Edit** takes you straight into changing it.

**Back** returns to the list. Passwords are never shown here, on any record.

![Viewing a Full and Final Statement](../screenshots/full-and-final-statement-view-light.png "light")

![Viewing a Full and Final Statement](../screenshots/full-and-final-statement-view-dark.png "dark")

*Needs the **read** permission — without it the button is not shown.*

## Editing a Full and Final Statement

Press the edit icon on a row, or **Edit** while viewing a record. The form opens with the current values already in it.

Change what you need and press **Save changes**. The same checks as adding apply, and you are returned to the list once it saves.

Every change is recorded — who made it, when, and what each value was before. You can read that back on the **Audit Log** screen.

![Editing a Full and Final Statement](../screenshots/full-and-final-statement-edit-light.png "light")

![Editing a Full and Final Statement](../screenshots/full-and-final-statement-edit-dark.png "dark")

*Needs the **edit** permission — without it the button is not shown.*

## Deleting a Full and Final Statement

Press the delete icon on a row. You are asked to confirm first, and nothing is removed until you do.

If something else in the system still refers to this full and final statement, the deletion is refused and you are told what is using it. Clear or reassign those first, then try again.

Deleting hides the record rather than destroying it, so history and past reports stay intact. If you only want it out of the dropdowns on other screens, untick **Is Active** instead — that keeps it available to look up.

*Needs the **delete** permission — without it the button is not shown.*

## Things worth knowing

> [!WARNING] Worth knowing
> The linked employee must already have a Relieving Date set, or this cannot be created.

> [!WARNING] Worth knowing
> Totals are calculated automatically from the rows below — don't try to type them in directly.

> [!WARNING] Worth knowing
> "Mark as Paid" is blocked until every payable and receivable row is Settled and every returned asset is marked Returned.

> [!WARNING] Worth knowing
> This is a worksheet, not an accounting entry — it does not post to any ledger.

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
> HR User and HR Manager can both fully manage statements, including delete — the one screen in this group where HR User isn't more restricted than HR Manager.
