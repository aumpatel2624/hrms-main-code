# Users

Everyone who signs in to the panel has a user record here. It holds who they are, how to reach them, which department they work in, and which role decides what they can do.

![Users](../screenshots/user-light.png "light")

![Users](../screenshots/user-dark.png "dark")

## When you would use this

Create a user when someone joins. When they leave, mark them inactive rather than deleting them — an inactive user cannot sign in, but everything they did stays attributable to a name.

## What you fill in

### User details

Name, contact details and where they sit in the organisation.

- **User Name** *(required)*
- **Department** *(required, chosen from a list)*
- **Role** *(required, chosen from a list)*
- **Email** *(required, an email address)*
- **Mobile Number**

### Location

Country, state and city. Each list narrows the next.

- **Country** *(required, chosen from a list)*
- **State** *(required, chosen from a list)*
- **City** *(required, chosen from a list)*
- **Address** *(required, free text)*

### Security

- **Password** *(required, a password)*

### Status

- **Is Active** *(a yes/no tick box)* — Inactive records stay in the system and keep their history, but stop being offered in dropdowns on other screens.

## Finding a record

Use the search box for a quick look-up, or open the filter panel to narrow the list by:

- User Name
- Email
- Mobile
- Address
- Department
- Role
- Active
- Created

Your filters and column layout are remembered, so the list looks the same next time you open it.

## Adding a User

Press **Add User** at the top right of the list. That opens a blank form.

1. Fill in the fields described above. Required ones are marked with an asterisk.
2. Press **Create user** at the bottom of the form.

Anything missing or invalid is flagged underneath the field it belongs to, and nothing is saved until every one of those is cleared. Once it saves you are returned to the list with the new record in it.

**Cancel** leaves without saving. Nothing is kept, so a half-filled form is not waiting for you when you come back.

![Adding a User](../screenshots/user-add-light.png "light")

![Adding a User](../screenshots/user-add-dark.png "dark")

*Needs the **write** permission — without it the button is not shown.*

## Viewing a User

Press the view icon on a row to open the record on its own screen. It shows the same fields in the same order as the form, but read-only, with related records shown by name rather than as a reference.

At the bottom you get when the record was created and when it was last changed, and a badge at the top shows whether it is active. **Edit** takes you straight into changing it.

**Back** returns to the list. Passwords are never shown here, on any record.

![Viewing a User](../screenshots/user-view-light.png "light")

![Viewing a User](../screenshots/user-view-dark.png "dark")

*Needs the **read** permission — without it the button is not shown.*

## Editing a User

Press the edit icon on a row, or **Edit** while viewing a record. The form opens with the current values already in it.

Change what you need and press **Save changes**. The same checks as adding apply, and you are returned to the list once it saves.

Every change is recorded — who made it, when, and what each value was before. You can read that back on the **Audit Log** screen.

![Editing a User](../screenshots/user-edit-light.png "light")

![Editing a User](../screenshots/user-edit-dark.png "dark")

*Needs the **edit** permission — without it the button is not shown.*

## Deleting a User

Press the delete icon on a row. You are asked to confirm first, and nothing is removed until you do.

If something else in the system still refers to this user, the deletion is refused and you are told what is using it. Clear or reassign those first, then try again.

Deleting hides the record rather than destroying it, so history and past reports stay intact. If you only want it out of the dropdowns on other screens, untick **Is Active** instead — that keeps it available to look up.

*Needs the **delete** permission — without it the button is not shown.*

## Things worth knowing

> [!WARNING] Worth knowing
> Email addresses must be unique, and they are what people sign in with.

> [!WARNING] Worth knowing
> The password field only appears when adding someone. To change an existing user's password, use the reset option on their record instead.

> [!WARNING] Worth knowing
> Changing someone's role changes what they can see and do the next time they sign in.

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
> Whether you can add, edit or delete users depends on your role's permissions. If a button is missing, your role has not been granted that action.
