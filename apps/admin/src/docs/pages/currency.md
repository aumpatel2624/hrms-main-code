# Currencies

Currencies available for prices and reporting, each with the symbol shown to users.

![Currencies](../screenshots/currency-light.png "light")

![Currencies](../screenshots/currency-dark.png "dark")

## When you would use this

Add a currency when you start trading in one you do not already have.

## What you fill in

### Currency details

Name, ISO code and the symbol shown to users.

- **Currency Name** *(required)*
- **Currency Code** *(required)*
- **Currency Symbol** *(required)*

### Status

- **Is Active** *(a yes/no tick box)* — Inactive records stay in the system and keep their history, but stop being offered in dropdowns on other screens.

## Finding a record

Use the search box for a quick look-up, or open the filter panel to narrow the list by:

- Currency Name
- Currency Code
- Symbol
- Active
- Created

Your filters and column layout are remembered, so the list looks the same next time you open it.

## Adding a Currency

Press **Add Currency** at the top right of the list. That opens a blank form.

1. Fill in the fields described above. Required ones are marked with an asterisk.
2. Press **Create currency** at the bottom of the form.

Anything missing or invalid is flagged underneath the field it belongs to, and nothing is saved until every one of those is cleared. Once it saves you are returned to the list with the new record in it.

**Cancel** leaves without saving. Nothing is kept, so a half-filled form is not waiting for you when you come back.

![Adding a Currency](../screenshots/currency-add-light.png "light")

![Adding a Currency](../screenshots/currency-add-dark.png "dark")

*Needs the **write** permission — without it the button is not shown.*

## Viewing a Currency

Press the view icon on a row to open the record on its own screen. It shows the same fields in the same order as the form, but read-only, with related records shown by name rather than as a reference.

At the bottom you get when the record was created and when it was last changed, and a badge at the top shows whether it is active. **Edit** takes you straight into changing it.

**Back** returns to the list. Passwords are never shown here, on any record.

![Viewing a Currency](../screenshots/currency-view-light.png "light")

![Viewing a Currency](../screenshots/currency-view-dark.png "dark")

*Needs the **read** permission — without it the button is not shown.*

## Editing a Currency

Press the edit icon on a row, or **Edit** while viewing a record. The form opens with the current values already in it.

Change what you need and press **Save changes**. The same checks as adding apply, and you are returned to the list once it saves.

Every change is recorded — who made it, when, and what each value was before. You can read that back on the **Audit Log** screen.

![Editing a Currency](../screenshots/currency-edit-light.png "light")

![Editing a Currency](../screenshots/currency-edit-dark.png "dark")

*Needs the **edit** permission — without it the button is not shown.*

## Deleting a Currency

Press the delete icon on a row. You are asked to confirm first, and nothing is removed until you do.

If something else in the system still refers to this currency, the deletion is refused and you are told what is using it. Clear or reassign those first, then try again.

Deleting hides the record rather than destroying it, so history and past reports stay intact. If you only want it out of the dropdowns on other screens, untick **Is Active** instead — that keeps it available to look up.

*Needs the **delete** permission — without it the button is not shown.*

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
