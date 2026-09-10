# Purpose of Travel

**Source:** `hrms/hr/doctype/purpose_of_travel/purpose_of_travel.json`, `purpose_of_travel.py`, `purpose_of_travel.js`
**Submittable:** no   **Tree:** no   **Naming:** `autoname: "field:purpose_of_travel"` — document `name` is set directly to the value of the `purpose_of_travel` field
**Module:** HR

## Schema

`editable_grid: 1`, `quick_entry: 1`, `sort_field: creation`, `sort_order: DESC`.

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| purpose_of_travel | Purpose of Travel | Data | — | No (`reqd` not set) | — | No | `unique: 1`. Autoname source — becomes the document's `name`. Not in list view. |

## Child Tables

None.

## State Machine

Not applicable.

## Validation Rules (exact, in execution order)

The controller class (`PurposeofTravel`) has no methods beyond the auto-generated type stub — `pass` is the entire body. **No custom server-side validation.** Only the framework-level `unique: 1` constraint on `purpose_of_travel`, plus the implicit "must be set" requirement carried by the `autoname: "field:purpose_of_travel"` mechanism (same pattern as `Identification Document Type` — see that file's Port Notes for the general explanation).

Client script (`purpose_of_travel.js`) implements only an empty `refresh` handler — no logic to port.

## Business Logic / Calculations

None. Simple master list (e.g. "Conference", "Client Visit", "Training") referenced from `Travel Request.purpose_of_travel` (required Link field on that doctype, see `Travel Request.md`).

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| (none) | — | None found. |

## Whitelisted / API Methods

None.

## Permissions

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| System Manager | Yes | Yes | Yes | Yes | — | — | — | Yes | Yes | `email: 1`, `share: 1`, `print: 1` also set. Only role listed. |

## Scheduled Jobs Touching This Doctype

None found in `hrms/hooks.py`.

## Related Doctypes

- [[Travel Request]] — consumer via its `purpose_of_travel` Link field.

## Port Notes

- Same naming-mechanics caveat as `Identification Document Type`: `purpose_of_travel` is not marked `reqd: 1` in the JSON, but `autoname: "field:purpose_of_travel"` implicitly requires it to be set at save time to derive the document name — enforce this in the port even though no explicit `reqd` flag is present.
- Only `System Manager` has permissions — no HR Manager/HR User row exists in source; do not add one without corroboration.
- Is required (`reqd: 1`) and consumed as a Link target on `Travel Request.purpose_of_travel` — see `Travel Request.md`.
- **Frappe framework behaviors relied on implicitly**: `autoname: "field:purpose_of_travel"` (PK = user-entered text, uniqueness via the `unique` constraint); no `allow_rename` set (defaults to not renameable); no `track_changes` set (defaults to off — no automatic version history for this doctype).
