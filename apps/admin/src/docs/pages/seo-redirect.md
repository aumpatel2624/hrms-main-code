# Redirects

When a page on your website moves or disappears, a redirect sends anyone asking for the old address to the new one. Without it they see an error, and search engines eventually drop the page.

![Redirects](../screenshots/seo-redirect-light.png "light")

![Redirects](../screenshots/seo-redirect-dark.png "dark")

## When you would use this

Add a redirect whenever you change or remove a page's URL — before the change goes live, ideally.

## What you fill in

### Where it goes

The old address, and where visitors should end up instead.

- **Old URL** *(required)* — The path visitors are still asking for.
- **Type of move** *(chosen from a list)* — Use 301 unless the page is coming back.
- **New URL** — A path on your site, or a full URL to send them elsewhere. Leave blank only for 410.

### Notes

Why this redirect exists — useful a year from now.

- **Notes** *(free text)*

### Status

- **Is Active** *(a yes/no tick box)* — Inactive records stay in the system and keep their history, but stop being offered in dropdowns on other screens.

## Finding a record

Use the search box for a quick look-up, or open the filter panel to narrow the list by:

- From
- To
- Status Code
- Times Used
- Notes
- Active
- Last Used
- Created

Your filters and column layout are remembered, so the list looks the same next time you open it.

## Adding a Redirect

Press **Add Redirect** at the top right of the list. That opens a blank form.

1. Fill in the fields described above. Required ones are marked with an asterisk.
2. Press **Create redirect** at the bottom of the form.

Anything missing or invalid is flagged underneath the field it belongs to, and nothing is saved until every one of those is cleared. Once it saves you are returned to the list with the new record in it.

**Cancel** leaves without saving. Nothing is kept, so a half-filled form is not waiting for you when you come back.

![Adding a Redirect](../screenshots/seo-redirect-add-light.png "light")

![Adding a Redirect](../screenshots/seo-redirect-add-dark.png "dark")

*Needs the **write** permission — without it the button is not shown.*

## Viewing a Redirect

Press the view icon on a row to open the record on its own screen. It shows the same fields in the same order as the form, but read-only, with related records shown by name rather than as a reference.

At the bottom you get when the record was created and when it was last changed, and a badge at the top shows whether it is active. **Edit** takes you straight into changing it.

**Back** returns to the list. Passwords are never shown here, on any record.

![Viewing a Redirect](../screenshots/seo-redirect-view-light.png "light")

![Viewing a Redirect](../screenshots/seo-redirect-view-dark.png "dark")

*Needs the **read** permission — without it the button is not shown.*

## Editing a Redirect

Press the edit icon on a row, or **Edit** while viewing a record. The form opens with the current values already in it.

Change what you need and press **Save changes**. The same checks as adding apply, and you are returned to the list once it saves.

Every change is recorded — who made it, when, and what each value was before. You can read that back on the **Audit Log** screen.

![Editing a Redirect](../screenshots/seo-redirect-edit-light.png "light")

![Editing a Redirect](../screenshots/seo-redirect-edit-dark.png "dark")

*Needs the **edit** permission — without it the button is not shown.*

## Deleting a Redirect

Press the delete icon on a row. You are asked to confirm first, and nothing is removed until you do.

If something else in the system still refers to this redirect, the deletion is refused and you are told what is using it. Clear or reassign those first, then try again.

Deleting hides the record rather than destroying it, so history and past reports stay intact. If you only want it out of the dropdowns on other screens, untick **Is Active** instead — that keeps it available to look up.

*Needs the **delete** permission — without it the button is not shown.*

## Things worth knowing

> [!WARNING] Worth knowing
> Use 301 unless the page is genuinely coming back. It tells search engines the move is permanent and passes the old page's standing to the new one.

> [!WARNING] Worth knowing
> 410 means gone for good and needs no destination.

> [!WARNING] Worth knowing
> The Times Used column tells you whether a redirect is still earning its place.

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
