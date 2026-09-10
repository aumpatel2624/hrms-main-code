# Shift Location

**Source:** `hrms/hr/doctype/shift_location/shift_location.json`, `shift_location.py`, `shift_location.js`
**Submittable:** no   **Tree:** no   **Naming:** `autoname: "field:location_name"` (name = value of `location_name`, must be unique)
**Module:** HR

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| location_name | Location Name | Data | — | yes | — | no | in_list_view; `unique: 1`; also the naming source |
| checkin_radius | Checkin Radius | Int | — | no | — | no | non-negative; "Radius within which check-in is allowed (in meters)"; `0` or unset disables the radius check (see [[Employee Checkin]] validation step 6.e) |
| column_break_dlgd | (Column) | Column Break | — | — | — | — | |
| longitude | Longitude | Float | — | no | — | no | |
| section_break_xxli | (Section) | Section Break | — | — | — | — | |
| geolocation | Geolocation | Geolocation | — | no | — | no | computed by `set_geolocation()` from lat/long |
| latitude | Latitude | Float | — | no | — | no | |
| fetch_geolocation | Fetch Geolocation | Button | — | — | — | — | client action (browser geolocation API) that populates lat/long then calls `set_geolocation` |

## Child Tables

None.

## State Machine

Not submittable — no docstatus workflow, no `status` field.

## Validation Rules (exact, in execution order)

`validate()`:
1. `self.set_geolocation()` — see Business Logic. Not gated by `HR Settings.allow_geolocation_tracking` at the model layer (unlike `Employee Checkin.validate_distance_from_shift_location`, which IS gated by that setting) — `set_geolocation_from_coordinates` itself checks the setting and no-ops if disabled (see Port Notes).

No `reqd`-beyond-framework-default checks beyond `location_name` being mandatory+unique (framework-enforced).

## Business Logic / Calculations

### `set_geolocation()` — whitelisted; delegates to shared utility `hrms.hr.utils.set_geolocation_from_coordinates`

1. IF `HR Settings.allow_geolocation_tracking` is falsy THEN return (no-op).
2. IF either `latitude` or `longitude` is not set THEN return (no-op).
3. ELSE set `self.geolocation` to a GeoJSON `FeatureCollection` string with a single `Point` feature whose `coordinates` are `[longitude, latitude]` (GeoJSON's reversed long/lat ordering).

This exact function/logic is shared verbatim with `Employee Checkin.set_geolocation()`.

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| validate | `set_geolocation()` | none |

## Whitelisted / API Methods

| Method name | HTTP-equivalent purpose | Args | Returns | What it does |
|---|---|---|---|---|
| `set_geolocation` (instance) | Recompute the `geolocation` GeoJSON field from lat/long | none | none | See Business Logic |

## Permissions

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| System Manager | yes | yes | yes | yes | n/a | n/a | n/a | yes | yes | share, email, print |
| HR Manager | yes | yes | yes | yes | n/a | n/a | n/a | yes | yes | |
| HR User | yes | yes | yes | yes | n/a | n/a | n/a | yes | yes | |
| Employee | yes | no | no | no | n/a | n/a | n/a | yes | yes | read-only |

## Scheduled Jobs Touching This Doctype

None. Read (not written) by `Employee Checkin.validate_distance_from_shift_location` (see [[Employee Checkin]]) at checkin-time, via the employee's active [[Shift Assignment]]`.shift_location`.

## Port Notes

- **This doctype is referenced by `Shift Assignment.shift_location`** (a nullable FK), and consumed for the check-in radius/geofence enforcement in `Employee Checkin` — a port must keep this three-way relationship: Shift Location (geofence + radius) -> Shift Assignment (per-employee, per-period location assignment) -> Employee Checkin (validates the checkin coordinates against whichever Shift Location the employee's currently active shift assignment specifies).
- **`checkin_radius <= 0` disables the geofence check entirely for that location** — treat `0`/unset identically to "no radius enforcement", not as "radius of zero meters" (which would make check-in effectively impossible).
- **Naming by `location_name` field value (with uniqueness enforced)** means the location's display name IS its primary key/identifier used in FKs elsewhere — a port should be aware that renaming a Shift Location's `location_name` in source Frappe would, depending on framework rename-cascade behavior, need to cascade to every FK reference; a port choosing a separate surrogate ID for this entity (recommended, to avoid natural-key churn) should still preserve the uniqueness constraint on the display name.

## Related Doctypes

- [[Shift Assignment]] — `shift_location` on that doctype links to this one.
- [[Employee Checkin]] — validates checkin coordinates against this location's radius via the employee's active Shift Assignment.
