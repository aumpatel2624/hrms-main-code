# Employee Feedback Rating

**Source:** `hrms/hr/doctype/employee_feedback_rating/employee_feedback_rating.json`, `employee_feedback_rating.py`
**Submittable:** no (child table only)   **Tree:** no   **Naming:** `hash` (random autoname)
**Module:** HR

A shared child doctype used in THREE different parent contexts:
1. `Appraisal Template.rating_criteria` — defines the criteria + weightage blueprint (no rating value stored here).
2. `Appraisal.self_ratings` — the employee's own self-rating against each criterion (self-appraisal).
3. `Employee Performance Feedback.feedback_ratings` — a reviewer's rating of another employee against each criterion.

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| criteria | Criteria | Link | [[Employee Feedback Criteria]] | yes | — | — | in_list_view |
| per_weightage | Weightage (%) | Percent | — | yes | — | — | non_negative; in_list_view |
| rating | Rating | Rating | — | no | — | — | in_list_view; `depends_on: eval: doc.parenttype != "Appraisal Template"` — hidden/unused when this row's parent document is an `Appraisal Template` (a template only carries criteria+weightage; the actual 0..N-star rating is only meaningful once copied into an `Appraisal.self_ratings` or `Employee Performance Feedback.feedback_ratings` row) |

## Child Tables

None.

## State Machine

N/A — not submittable; governed entirely by whichever parent document owns the row.

## Validation Rules (exact, in execution order)

None on this doctype's own controller (`EmployeeFeedbackRating(Document): pass`). Table-level weightage-sum validation is enforced by whichever parent uses it:
- `Appraisal.validate_total_weightage("self_ratings", "Self Ratings")` — see `Appraisal.md`.
- `Employee Performance Feedback.validate_total_weightage("feedback_ratings", "Feedback Ratings")` — see `Employee Performance Feedback.md`.
- `Appraisal Template.validate_total_weightage("rating_criteria", "Criteria")` — see `Appraisal Template.md`.

## Business Logic / Calculations

The `rating` value (a Frappe "Rating" fieldtype, internally stored as a 0.0–1.0 fraction and displayed as filled stars out of a configured max, default 5) feeds two different parent-level score formulas that both read this same field but compute slightly differently:
- `Appraisal.calculate_self_appraisal_score()`: `score = rating * number_of_stars * (per_weightage / 100)`, where `number_of_stars` is dynamically read from this field's metadata (max option, default 5) — see `Appraisal.md`.
- `Employee Performance Feedback.set_total_score()`: `score = rating * 5 * (per_weightage / 100)` — hardcodes `5` rather than reading it dynamically — see `Employee Performance Feedback.md` Port Notes for the discrepancy.

When used under `Appraisal Template.rating_criteria`, `rating` is never populated/read — only `criteria` and `per_weightage` are meaningful there, and those two values are copied by value into consuming documents' rows (`Appraisal.set_kras_and_rating_criteria()`, `Employee Performance Feedback.set_feedback_criteria()`).

## Lifecycle Hooks (exact)

None on this child doctype directly.

## Whitelisted / API Methods

None.

## Permissions ([[Permission Model (RBAC)]])

Empty `permissions` array in the JSON — governed by parent (whichever of `Appraisal`, `Employee Performance Feedback`, or `Appraisal Template` owns the row at the time).

## Scheduled Jobs Touching This Doctype

None.

## Related Doctypes

- [[Employee Feedback Criteria]] — `criteria` link; the named criterion this row rates against.
- [[Appraisal Template]] — parent context `rating_criteria` (blueprint only; `rating` unused).
- [[Appraisal]] — parent context `self_ratings` (employee self-appraisal).
- [[Employee Performance Feedback]] — parent context `feedback_ratings` (reviewer's rating of another employee).

## Port Notes

- **Polymorphic-by-parent child table**: this single child doctype is reused across three different parent tables. In an RDBMS port, the cleanest equivalent is still three separate child/join tables (`appraisal_self_ratings`, `employee_performance_feedback_ratings`, `appraisal_template_rating_criteria`) each with the same three columns (`criteria_id` FK, `per_weightage`, `rating` nullable) — rather than one polymorphic table keyed by `(parenttype, parent, parentfield)` as Frappe does internally — unless the target ORM/framework has first-class support for polymorphic child tables and the team prefers that shape. Either is behaviorally equivalent; pick based on the target stack's conventions.
- **`rating` is conditionally meaningless** depending on parent type — a port's schema should either (a) keep `rating` nullable and simply leave it unset/ignored for the template-context table, or (b) omit the `rating` column entirely from the template-specific table variant if the three parents are split into separate tables as suggested above (recommended — it makes the "templates don't carry ratings" invariant structural rather than a runtime convention).
- **Frappe `Rating` fieldtype storage**: stored internally as a float fraction between 0.0 and 1.0 (e.g. 3 stars out of 5 = 0.6), NOT as a raw star count. Both consuming formulas (`rating * number_of_stars` / `rating * 5`) rely on this fractional storage to convert back to a "stars earned" value before applying weightage. A port must replicate this same fractional-storage convention (or explicitly convert if it chooses to store raw star counts instead) to keep the formulas numerically correct.
- `criteria` FK → `Employee Feedback Criteria` (see that file) — enforce referential integrity.
