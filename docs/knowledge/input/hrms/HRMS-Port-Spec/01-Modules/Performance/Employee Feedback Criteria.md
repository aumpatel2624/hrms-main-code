# Employee Feedback Criteria

**Source:** `hrms/hr/doctype/employee_feedback_criteria/employee_feedback_criteria.json`, `employee_feedback_criteria.py`
**Submittable:** no   **Tree:** no   **Naming:** `field:criteria` ([[Naming and Autoname Rules]]) — document name = the `criteria` value (must be unique)
**Module:** HR

A simple master list of named feedback/rating criteria (e.g. "Communication", "Teamwork") referenced by `Employee Feedback Rating` rows.

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| criteria | Criteria | Data | — | yes | — | — | unique; in_list_view; this is also the document name |

`quick_entry: 1` — Frappe shows a lightweight single-field "quick entry" creation dialog for this doctype instead of the full form (UI convenience only, no schema/behavior implication for the port beyond a simplified create flow).

## Child Tables

None.

## State Machine

N/A — plain master/lookup doctype, not submittable, no status field.

## Validation Rules (exact, in execution order)

None. Controller is `EmployeeFeedbackCriteria(Document): pass`. The only constraint is the field-level `unique: 1` + `reqd: 1` on `criteria`, enforced generically by the framework (not custom application code).

## Business Logic / Calculations

None.

## Lifecycle Hooks (exact)

None defined.

## Whitelisted / API Methods

None.

## Permissions ([[Permission Model (RBAC)]])

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| System Manager | 1 | 1 | 1 | 1 | — | — | — | 1 | 1 | print, email, share also 1 (not submittable) |
| HR Manager | 1 | 1 | 1 | 1 | — | — | — | 1 | 1 | print, email, share also 1 |
| HR User | 1 | 1 | 1 | 1 | — | — | — | 1 | 1 | print, email, share also 1 |

(No Employee-role row in this JSON — employees do not have direct access to manage the criteria master list.)

## Scheduled Jobs Touching This Doctype

None.

## Related Doctypes

- [[Employee Feedback Rating]] — referenced by that child doctype's `criteria` Link field, across all three of its parent contexts.

## Port Notes

- Simple lookup/master table: `criteria` (unique string) is both the display value and the natural key/PK. Model as a small reference table (`id`/`name` PK = the criteria text, or a surrogate PK with a unique constraint on the text — pick whichever matches how the rest of the port's schema references natural-key doctypes like `Appraisal Cycle`/`Appraisal Template`).
- Referenced by `Employee Feedback Rating.criteria` (a Link field) across all three of that child doctype's parent contexts (`Appraisal.self_ratings`, `Employee Performance Feedback.feedback_ratings`, `Appraisal Template.rating_criteria`) — enforce FK integrity from those tables to this one.
