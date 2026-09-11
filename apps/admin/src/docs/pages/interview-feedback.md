# Interview Feedback

A single interviewer's scorecard for one Interview — a result plus free-text feedback.

![Interview Feedback](../screenshots/interview-feedback-light.png "light")

![Interview Feedback](../screenshots/interview-feedback-dark.png "dark")

## When you would use this

Add one after conducting an interview round.

## What you fill in

### Details

- **Interview** *(required, chosen from a list)*
- **Interviewer** *(required, chosen from a list)*
- **Result** *(required, chosen from a list)*
- **Feedback** *(free text)*

### Status

- **Is Active** *(a yes/no tick box)* — Inactive records stay in the system and keep their history, but stop being offered in dropdowns on other screens.

## Finding a record

Use the search box for a quick look-up, or open the filter panel to narrow the list by:

- Interview
- Interviewer
- Result
- Active
- Created

Your filters and column layout are remembered, so the list looks the same next time you open it.

## Adding an Interview Feedback

Press **Add Interview Feedback** at the top right of the list. That opens a blank form.

1. Fill in the fields described above. Required ones are marked with an asterisk.
2. Press **Create interview feedback** at the bottom of the form.

Anything missing or invalid is flagged underneath the field it belongs to, and nothing is saved until every one of those is cleared. Once it saves you are returned to the list with the new record in it.

**Cancel** leaves without saving. Nothing is kept, so a half-filled form is not waiting for you when you come back.

![Adding an Interview Feedback](../screenshots/interview-feedback-add-light.png "light")

![Adding an Interview Feedback](../screenshots/interview-feedback-add-dark.png "dark")

*Needs the **write** permission — without it the button is not shown.*

## Viewing an Interview Feedback

Press the view icon on a row to open the record on its own screen. It shows the same fields in the same order as the form, but read-only, with related records shown by name rather than as a reference.

At the bottom you get when the record was created and when it was last changed, and a badge at the top shows whether it is active. **Edit** takes you straight into changing it.

**Back** returns to the list. Passwords are never shown here, on any record.

![Viewing an Interview Feedback](../screenshots/interview-feedback-view-light.png "light")

![Viewing an Interview Feedback](../screenshots/interview-feedback-view-dark.png "dark")

*Needs the **read** permission — without it the button is not shown.*

## Editing an Interview Feedback

Press the edit icon on a row, or **Edit** while viewing a record. The form opens with the current values already in it.

Change what you need and press **Save changes**. The same checks as adding apply, and you are returned to the list once it saves.

Every change is recorded — who made it, when, and what each value was before. You can read that back on the **Audit Log** screen.

![Editing an Interview Feedback](../screenshots/interview-feedback-edit-light.png "light")

![Editing an Interview Feedback](../screenshots/interview-feedback-edit-dark.png "dark")

*Needs the **edit** permission — without it the button is not shown.*

## Deleting an Interview Feedback

Press the delete icon on a row. You are asked to confirm first, and nothing is removed until you do.

If something else in the system still refers to this interview feedback, the deletion is refused and you are told what is using it. Clear or reassign those first, then try again.

Deleting hides the record rather than destroying it, so history and past reports stay intact. If you only want it out of the dropdowns on other screens, untick **Is Active** instead — that keeps it available to look up.

*Needs the **delete** permission — without it the button is not shown.*

## Things worth knowing

> [!WARNING] Worth knowing
> Only an interviewer assigned to the Interview can submit feedback for it.

> [!WARNING] Worth knowing
> Feedback cannot be submitted before the Interview's scheduled date.

> [!WARNING] Worth knowing
> Only one feedback per interviewer per interview is allowed.

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
> Only the Interviewer role can add or edit feedback here — HR User and HR Manager can view it but not change it.
