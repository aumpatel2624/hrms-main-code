# Travel Itinerary

**Source:** `hrms/hr/doctype/travel_itinerary/travel_itinerary.json`, `travel_itinerary.py`
**Submittable:** no   **Tree:** no   **Naming:** child table — no `autoname` (standard Frappe child-row hash naming)
**Module:** HR

## Schema

`istable: 1` (child table only, used as `itinerary` field on `Travel Request`). `editable_grid: 1`, `quick_entry: 1`, `track_changes: 1`, `sort_field: creation`, `sort_order: DESC`.

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| travel_from | Travel From | Data | — | No | — | No | In list view. |
| travel_to | Travel To | Data | — | No | — | No | In list view. |
| mode_of_travel | Mode of Travel | Select | `"", "Flight", "Train", "Taxi", "Rented Car"` | No | — | No | In list view. |
| meal_preference | Meal Preference | Select | `"", "Vegetarian", "Non-Vegetarian", "Gluten Free", "Non Diary"` | No | — | No | — |
| travel_advance_required | Travel Advance Required | Check | — | No | `0` | No | — |
| advance_amount | Advance Amount | Data | — | No | — | No | `depends_on: "travel_advance_required"`. Note: fieldtype is **Data**, not Currency — no numeric enforcement or precision at the schema level. |
| *(column_break_6)* | — | Column Break | — | — | — | — | Layout only. |
| departure_date | Departure Datetime | Datetime | — | No | — | No | In list view. |
| arrival_date | Arrival Datetime | Datetime | — | No | — | No | — |
| lodging_required | Lodging Required | Check | — | No | `0` | No | — |
| preferred_area_for_lodging | Preferred Area for Lodging | Data | — | No | — | No | `depends_on: "lodging_required"`. |
| check_in_date | Check-in Date | Date | — | No | — | No | `depends_on: "lodging_required"`. |
| check_out_date | Check-out Date | Date | — | No | — | No | `depends_on: "lodging_required"`. |
| *(section_break_14)* | — | Section Break | — | — | — | — | Layout only. |
| other_details | Other Details | Small Text | — | No | — | No | — |

## Child Tables

None (this doctype has no Table fields of its own).

## State Machine

Not applicable.

## Validation Rules (exact, in execution order)

The controller class (`TravelItinerary`) has no methods beyond the auto-generated type stub — `pass` is the entire body. **No server-side validation of any kind exists** — not even a check that `arrival_date >= departure_date`, or that `check_out_date >= check_in_date`, or that `advance_amount` is numeric/non-negative when `travel_advance_required` is checked. All of these are plausible checks a developer might expect, but none are present in source; flagged here explicitly per the ground rules rather than assumed.

## Business Logic / Calculations

None.

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| (none) | — | None. |

## Whitelisted / API Methods

None.

## Permissions

`permissions: []` — pure child table, no independent permission list; access governed by the parent `Travel Request`'s permissions (see `Travel Request.md`).

## Scheduled Jobs Touching This Doctype

None found in `hrms/hooks.py`.

## Related Doctypes

- [[Travel Request]] — parent via `itinerary` table.

## Port Notes

- **No date-order validation exists** despite having paired date/datetime fields that clearly imply an order (`departure_date`/`arrival_date`, `check_in_date`/`check_out_date`). Do not add such validation silently when porting — call it out to product/stakeholders as a possible gap in the original implementation, and only add it if explicitly requested, since the ground rules forbid inventing validations not present in source.
- **`advance_amount` is a Data field, not Currency** — this is unusual given it represents a monetary amount, and means the source schema does not enforce numeric-ness or currency precision/rounding on this value at all. A port should preserve this as free-text unless directed otherwise, or explicitly flag the type change if "fixing" it.
- **Frappe framework behaviors relied on implicitly**: `track_changes: 1` (automatic audit trail even for child rows, tracked as part of the parent Travel Request's version history); `quick_entry: 1` is a UI affordance only; standard child-table `parent`/`parentfield`/`parenttype`/`idx` bookkeeping.
