# Appraisal Cycles

A named, time-boxed cycle (e.g. "H1 2026") that generates and tracks Appraisals for a filtered population of employees.

![Appraisal Cycles](../screenshots/appraisal-cycle-light.png "light")

![Appraisal Cycles](../screenshots/appraisal-cycle-dark.png "dark")

## When you would use this

Starting a new performance review period.

## What you fill in

### Cycle Details

- **Cycle Name** *(required)*
- **Company** *(required, chosen from a list)*
- **Start Date** *(required, a date)*
- **End Date** *(required, a date)*
- **Description**
- **Status** *(chosen from a list)*

### Scoring Settings

- **KRA Evaluation Method** *(chosen from a list)*
- **Calculate Final Score based on Formula** *(a yes/no tick box)*
- **Final Score Formula (required if enabled above)**

### Applicable For

- **Branch (optional filter)** *(chosen from a list)*
- **Department (optional filter)** *(chosen from a list)*
- **Designation (optional filter)** *(chosen from a list)*

## Finding a record

Use the search box for a quick look-up, or open the filter panel to narrow the list by:

- Cycle Name
- Company
- Status
- Evaluation Method
- Start Date
- End Date
- Created

Your filters and column layout are remembered, so the list looks the same next time you open it.

## Adding an Appraisal Cycle

Press **Add Appraisal Cycle** at the top right of the list. That opens a blank form.

1. Fill in the fields described above. Required ones are marked with an asterisk.
2. Press **Create appraisal cycle** at the bottom of the form.

Anything missing or invalid is flagged underneath the field it belongs to, and nothing is saved until every one of those is cleared. Once it saves you are returned to the list with the new record in it.

**Cancel** leaves without saving. Nothing is kept, so a half-filled form is not waiting for you when you come back.

![Adding an Appraisal Cycle](../screenshots/appraisal-cycle-add-light.png "light")

![Adding an Appraisal Cycle](../screenshots/appraisal-cycle-add-dark.png "dark")

*Needs the **write** permission — without it the button is not shown.*

## Viewing an Appraisal Cycle

Press the view icon on a row to open the record on its own screen. It shows the same fields in the same order as the form, but read-only, with related records shown by name rather than as a reference.

At the bottom you get when the record was created and when it was last changed, and a badge at the top shows whether it is active. **Edit** takes you straight into changing it.

**Back** returns to the list. Passwords are never shown here, on any record.

![Viewing an Appraisal Cycle](../screenshots/appraisal-cycle-view-light.png "light")

![Viewing an Appraisal Cycle](../screenshots/appraisal-cycle-view-dark.png "dark")

*Needs the **read** permission — without it the button is not shown.*

## Editing an Appraisal Cycle

Press the edit icon on a row, or **Edit** while viewing a record. The form opens with the current values already in it.

Change what you need and press **Save changes**. The same checks as adding apply, and you are returned to the list once it saves.

Every change is recorded — who made it, when, and what each value was before. You can read that back on the **Audit Log** screen.

![Editing an Appraisal Cycle](../screenshots/appraisal-cycle-edit-light.png "light")

![Editing an Appraisal Cycle](../screenshots/appraisal-cycle-edit-dark.png "dark")

*Needs the **edit** permission — without it the button is not shown.*

## Deleting an Appraisal Cycle

Press the delete icon on a row. You are asked to confirm first, and nothing is removed until you do.

If something else in the system still refers to this appraisal cycle, the deletion is refused and you are told what is using it. Clear or reassign those first, then try again.

Deleting hides the record rather than destroying it, so history and past reports stay intact. If you only want it out of the dropdowns on other screens, untick **Is Active** instead — that keeps it available to look up.

*Needs the **delete** permission — without it the button is not shown.*

## Things worth knowing

> [!WARNING] Worth knowing
> "Get Eligible Employees" must be run before "Create Appraisals" — it loads the candidate list and each one's default Appraisal Template from their Designation.

> [!WARNING] Worth knowing
> The KRA Evaluation Method (Automated vs. Manual Rating) cannot be changed once any Appraisal exists under the cycle.

> [!WARNING] Worth knowing
> Completing a cycle is blocked while any linked Appraisal is still a draft.

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
