# Salary Components

A reusable pay line item — Basic Salary, HRA, PF, TDS — addable to any Salary Structure.

![Salary Components](../screenshots/salary-component-light.png "light")

![Salary Components](../screenshots/salary-component-dark.png "dark")

## When you would use this

Set these up before building a Salary Structure; every earning, deduction and employer contribution row references one of these.

## What you fill in

### Component details

- **Name** *(required)*
- **Abbreviation** — Leave blank to auto-derive from the name's initials (e.g. "Basic Salary" -> "BS"), de-duplicated within the company.
- **Type** *(required, chosen from a list)*
- **Company** *(required, chosen from a list)*
- **Regional Component Type** *(chosen from a list)*

### Flags

- **Is tax applicable** *(a yes/no tick box)*
- **Depends on payment days** *(a yes/no tick box)*
- **Do not include in total** *(a yes/no tick box)*
- **Statistical component** *(a yes/no tick box)* — Value is referenceable by other components' formulas but never contributes to earnings/deductions totals.
- **Round to nearest integer** *(a yes/no tick box)*
- **Exempted from income tax** *(a yes/no tick box)*
- **Remove if zero valued** *(a yes/no tick box)*
- **Variable based on taxable salary** *(a yes/no tick box)* — Mutually exclusive with Arrear Component.
- **Arrear component** *(a yes/no tick box)* — Mutually exclusive with Variable Based On Taxable Salary.
- **Accrual component** *(a yes/no tick box)* — Only valid when Type is Earning.

### Status

- **Is Active** *(a yes/no tick box)* — Inactive records stay in the system and keep their history, but stop being offered in dropdowns on other screens.

## Finding a record

Use the search box for a quick look-up, or open the filter panel to narrow the list by:

- Name
- Abbreviation
- Type
- Company
- Active
- Created

Your filters and column layout are remembered, so the list looks the same next time you open it.

## Adding a Salary Component

Press **Add Salary Component** at the top right of the list. That opens a blank form.

1. Fill in the fields described above. Required ones are marked with an asterisk.
2. Press **Create salary component** at the bottom of the form.

Anything missing or invalid is flagged underneath the field it belongs to, and nothing is saved until every one of those is cleared. Once it saves you are returned to the list with the new record in it.

**Cancel** leaves without saving. Nothing is kept, so a half-filled form is not waiting for you when you come back.

![Adding a Salary Component](../screenshots/salary-component-add-light.png "light")

![Adding a Salary Component](../screenshots/salary-component-add-dark.png "dark")

*Needs the **write** permission — without it the button is not shown.*

## Viewing a Salary Component

Press the view icon on a row to open the record on its own screen. It shows the same fields in the same order as the form, but read-only, with related records shown by name rather than as a reference.

At the bottom you get when the record was created and when it was last changed, and a badge at the top shows whether it is active. **Edit** takes you straight into changing it.

**Back** returns to the list. Passwords are never shown here, on any record.

![Viewing a Salary Component](../screenshots/salary-component-view-light.png "light")

![Viewing a Salary Component](../screenshots/salary-component-view-dark.png "dark")

*Needs the **read** permission — without it the button is not shown.*

## Editing a Salary Component

Press the edit icon on a row, or **Edit** while viewing a record. The form opens with the current values already in it.

Change what you need and press **Save changes**. The same checks as adding apply, and you are returned to the list once it saves.

Every change is recorded — who made it, when, and what each value was before. You can read that back on the **Audit Log** screen.

![Editing a Salary Component](../screenshots/salary-component-edit-light.png "light")

![Editing a Salary Component](../screenshots/salary-component-edit-dark.png "dark")

*Needs the **edit** permission — without it the button is not shown.*

## Deleting a Salary Component

Press the delete icon on a row. You are asked to confirm first, and nothing is removed until you do.

If something else in the system still refers to this salary component, the deletion is refused and you are told what is using it. Clear or reassign those first, then try again.

Deleting hides the record rather than destroying it, so history and past reports stay intact. If you only want it out of the dropdowns on other screens, untick **Is Active** instead — that keeps it available to look up.

*Needs the **delete** permission — without it the button is not shown.*

## Things worth knowing

> [!WARNING] Worth knowing
> Leave Abbreviation blank to auto-derive it from the name's initials; it's de-duplicated within the company if it collides.

> [!WARNING] Worth knowing
> Arrear Component and Variable Based On Taxable Salary cannot both be set. Accrual Component only applies when Type is Earning.

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
> HR User and HR Manager manage records within their company.
