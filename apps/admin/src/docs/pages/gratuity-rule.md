# Gratuity Rules

Master rule defining years-of-service slabs and the fraction of applicable earnings paid out for each, used to compute an employee's gratuity.

![Gratuity Rules](../screenshots/gratuity-rule-light.png "light")

![Gratuity Rules](../screenshots/gratuity-rule-dark.png "dark")

## When you would use this

Setting up or updating the gratuity payout formula before creating Gratuity records for departing employees.

## What you fill in

### Rule Details

- **Name** *(required)*
- **Disable** *(a yes/no tick box)*
- **Calculate Gratuity Amount Based On** *(required, chosen from a list)*
- **Total Working Days Per Year** *(a number)*
- **Work Experience Calculation Method** *(chosen from a list)*
- **Minimum Year for Gratuity** *(a number)*

## Finding a record

Use the search box for a quick look-up, or open the filter panel to narrow the list by:

- Name
- Disabled
- Calculate based on
- Work experience method
- Minimum year for gratuity
- Total working days per year
- Created

Your filters and column layout are remembered, so the list looks the same next time you open it.

## Adding a Gratuity Rule

Press **Add Gratuity Rule** at the top right of the list. That opens a blank form.

1. Fill in the fields described above. Required ones are marked with an asterisk.
2. Press **Create gratuity rule** at the bottom of the form.

Anything missing or invalid is flagged underneath the field it belongs to, and nothing is saved until every one of those is cleared. Once it saves you are returned to the list with the new record in it.

**Cancel** leaves without saving. Nothing is kept, so a half-filled form is not waiting for you when you come back.

![Adding a Gratuity Rule](../screenshots/gratuity-rule-add-light.png "light")

![Adding a Gratuity Rule](../screenshots/gratuity-rule-add-dark.png "dark")

*Needs the **write** permission — without it the button is not shown.*

## Viewing a Gratuity Rule

Press the view icon on a row to open the record on its own screen. It shows the same fields in the same order as the form, but read-only, with related records shown by name rather than as a reference.

At the bottom you get when the record was created and when it was last changed, and a badge at the top shows whether it is active. **Edit** takes you straight into changing it.

**Back** returns to the list. Passwords are never shown here, on any record.

![Viewing a Gratuity Rule](../screenshots/gratuity-rule-view-light.png "light")

![Viewing a Gratuity Rule](../screenshots/gratuity-rule-view-dark.png "dark")

*Needs the **read** permission — without it the button is not shown.*

## Editing a Gratuity Rule

Press the edit icon on a row, or **Edit** while viewing a record. The form opens with the current values already in it.

Change what you need and press **Save changes**. The same checks as adding apply, and you are returned to the list once it saves.

Every change is recorded — who made it, when, and what each value was before. You can read that back on the **Audit Log** screen.

![Editing a Gratuity Rule](../screenshots/gratuity-rule-edit-light.png "light")

![Editing a Gratuity Rule](../screenshots/gratuity-rule-edit-dark.png "dark")

*Needs the **edit** permission — without it the button is not shown.*

## Deleting a Gratuity Rule

Press the delete icon on a row. You are asked to confirm first, and nothing is removed until you do.

If something else in the system still refers to this gratuity rule, the deletion is refused and you are told what is using it. Clear or reassign those first, then try again.

Deleting hides the record rather than destroying it, so history and past reports stay intact. If you only want it out of the dropdowns on other screens, untick **Is Active** instead — that keeps it available to look up.

*Needs the **delete** permission — without it the button is not shown.*

## Things worth knowing

> [!WARNING] Worth knowing
> A disabled rule is hidden from the picker when creating a new Gratuity record, but still shows up here so it can be re-enabled.

> [!WARNING] Worth knowing
> Slab year ranges cannot overlap, and only the last slab may be left open-ended (no upper year).

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
> HR User and HR Manager manage records.
