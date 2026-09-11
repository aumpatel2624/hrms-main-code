# Travel Requests

An employee's request to travel, with an itinerary (one row per leg) and costings (sponsored/funded amounts).

![Travel Requests](../screenshots/travel-request-light.png "light")

![Travel Requests](../screenshots/travel-request-dark.png "dark")

## When you would use this

Create one whenever an employee needs to travel for work.

## What you fill in

### Details

- **Employee** *(required, chosen from a list)*
- **Travel Type** *(required, chosen from a list)*
- **Travel Funding** *(chosen from a list)*
- **Purpose of Travel** *(required, chosen from a list)*
- **Details of Sponsor**
- **Description** *(free text)*
- **Identification Document Type** *(chosen from a list)*
- **Personal ID Number**
- **Company** *(chosen from a list)*
- **Status** *(chosen from a list)*

## Finding a record

Use the search box for a quick look-up, or open the filter panel to narrow the list by:

- Employee
- Travel Type
- Status
- Company
- Created

Your filters and column layout are remembered, so the list looks the same next time you open it.

## Adding a Travel Request

Press **Add Travel Request** at the top right of the list. That opens a blank form.

1. Fill in the fields described above. Required ones are marked with an asterisk.
2. Press **Create travel request** at the bottom of the form.

Anything missing or invalid is flagged underneath the field it belongs to, and nothing is saved until every one of those is cleared. Once it saves you are returned to the list with the new record in it.

**Cancel** leaves without saving. Nothing is kept, so a half-filled form is not waiting for you when you come back.

![Adding a Travel Request](../screenshots/travel-request-add-light.png "light")

![Adding a Travel Request](../screenshots/travel-request-add-dark.png "dark")

*Needs the **write** permission — without it the button is not shown.*

## Viewing a Travel Request

Press the view icon on a row to open the record on its own screen. It shows the same fields in the same order as the form, but read-only, with related records shown by name rather than as a reference.

At the bottom you get when the record was created and when it was last changed, and a badge at the top shows whether it is active. **Edit** takes you straight into changing it.

**Back** returns to the list. Passwords are never shown here, on any record.

![Viewing a Travel Request](../screenshots/travel-request-view-light.png "light")

![Viewing a Travel Request](../screenshots/travel-request-view-dark.png "dark")

*Needs the **read** permission — without it the button is not shown.*

## Editing a Travel Request

Press the edit icon on a row, or **Edit** while viewing a record. The form opens with the current values already in it.

Change what you need and press **Save changes**. The same checks as adding apply, and you are returned to the list once it saves.

Every change is recorded — who made it, when, and what each value was before. You can read that back on the **Audit Log** screen.

![Editing a Travel Request](../screenshots/travel-request-edit-light.png "light")

![Editing a Travel Request](../screenshots/travel-request-edit-dark.png "dark")

*Needs the **edit** permission — without it the button is not shown.*

## Deleting a Travel Request

Press the delete icon on a row. You are asked to confirm first, and nothing is removed until you do.

If something else in the system still refers to this travel request, the deletion is refused and you are told what is using it. Clear or reassign those first, then try again.

Deleting hides the record rather than destroying it, so history and past reports stay intact. If you only want it out of the dropdowns on other screens, untick **Is Active** instead — that keeps it available to look up.

*Needs the **delete** permission — without it the button is not shown.*

## Things worth knowing

> [!WARNING] Worth knowing
> Can't be created or edited for an Inactive employee.

> [!WARNING] Worth knowing
> Total Amount on a costing row is entered manually, not calculated from Sponsored/Funded amounts.

> [!WARNING] Worth knowing
> Itinerary dates (departure/arrival, check-in/check-out) aren't validated against each other.

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
> HR User and HR Manager have full access; Employees can create, read and edit (not delete) their own requests.
