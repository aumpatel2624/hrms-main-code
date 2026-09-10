# Appraisal Template

**Source:** `hrms/hr/doctype/appraisal_template/appraisal_template.json`, `appraisal_template.py`, `appraisal_template.js`
**Submittable:** no   **Tree:** no   **Naming:** `field:template_title` — document name = the `template_title` value (must be unique)
**Module:** HR

A reusable template of KRAs and rating criteria, assigned per-Designation (via `Designation.appraisal_template`, owned elsewhere) or per-Appraisee override on an `Appraisal Cycle`, and copied into each `Appraisal`/`Employee Performance Feedback` at creation time.

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| template_title | Appraisal Template Title | Data | — | yes | — | — | unique; in_list_view; this is also the document name |
| description | (no label) | Small Text | — | no | — | — | in_list_view; inside collapsible "Description" section |
| goals | KRAs | Table (Appraisal Template Goal) | [[Appraisal Template Goal]] | yes | — | — | the KRA + weightage blueprint |
| rating_criteria | Rating Criteria | Table (Employee Feedback Rating) | [[Employee Feedback Rating]] | no | — | — | "Criteria based on which employee should be rated in Performance Feedback and Self Appraisal"; the `rating` sub-field is hidden here via that child doctype's own `depends_on` (a template only carries criteria + weightage, no actual rating value) |

## Child Tables

- `goals` → **Appraisal Template Goal** — see `Appraisal Template Goal.md` (own file, this agent's scope).
- `rating_criteria` → **Employee Feedback Rating** — see `Employee Feedback Rating.md` (own file, this agent's scope; shared child doctype also used by `Appraisal.self_ratings` and `Employee Performance Feedback.feedback_ratings`).

## State Machine

N/A — plain (non-submittable) master/setup doctype. No `status` field.

## Validation Rules (exact, in execution order)

Runs inside `validate()` (via `AppraisalMixin`):

1. `validate_total_weightage("goals", "KRAs")`: IF `goals` is non-empty AND `sum(per_weightage)` rounded to 2 decimals `!= 100.0` THEN throw `"Total weightage for all {0} must add up to 100. Currently, it is {1}%"` (0 = bolded "KRAs", 1 = the actual total) — title "Incorrect Weightage Allocation".
2. `validate_total_weightage("rating_criteria", "Criteria")`: same check applied to `rating_criteria`, label "Criteria".

Both checks are skipped entirely if the respective table is empty (no forced non-empty rule at this level — but `goals` is marked `reqd: 1` at the field level, so Frappe's generic mandatory-table check still requires at least one row).

## Business Logic / Calculations

None beyond the weightage-sum validations above. This doctype is a pure data template; the actual scoring formulas live on `Appraisal` and `Employee Performance Feedback` (see their respective files), which copy `per_weightage` values out of this template's rows at creation time.

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| validate | weightage checks (see above) | none |

## Whitelisted / API Methods

None defined on this doctype's controller. It is *consumed* by whitelisted methods on other doctypes:
- `Appraisal.set_kras_and_rating_criteria()` copies `goals` → `Appraisal.appraisal_kra`/`Appraisal.goals` and `rating_criteria` → `Appraisal.self_ratings`.
- `Employee Performance Feedback.set_feedback_criteria()` copies `rating_criteria` → `Employee Performance Feedback.feedback_ratings` (looked up via the Appraisal's `appraisal_template`).

## Permissions ([[Permission Model (RBAC)]])

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| HR User | 1 | 1 | 1 | 0 | — | — | — | 1 | 0 | print, email, share also 1 (not submittable) |
| HR Manager | 1 | 1 | 1 | 1 | — | — | — | 1 | 1 | print, email, share also 1 |
| Employee | 1 | 0 | 0 | 0 | — | — | — | 0 | 0 | read-only |

## Scheduled Jobs Touching This Doctype

None.

## Related Doctypes

- [[Appraisal Template Goal]] — `goals` child table; the KRA + weightage blueprint.
- [[Employee Feedback Rating]] — `rating_criteria` child table; criteria + weightage blueprint (no `rating` value).
- [[Appraisal]] — consumer; `set_kras_and_rating_criteria()` copies this template's rows into a new Appraisal's `appraisal_kra`/`goals`/`self_ratings`.
- [[Employee Performance Feedback]] — consumer; `set_feedback_criteria()` copies `rating_criteria` into `feedback_ratings`.

## Port Notes

- **Naming = `field:template_title`**: same pattern as `Appraisal Cycle.cycle_name` — the document name IS the title text; enforce global uniqueness on `template_title` in the port's schema (natural key or unique constraint on a surrogate PK).
- **Client script** (`appraisal_template.js`): purely UI (`setup` sets the editable grid columns for `rating_criteria` to just `criteria` and `per_weightage`, hiding the `rating` column entirely in the template's own grid) — no server-equivalent needed beyond the already-hidden `rating` field via its own `depends_on`.
- This doctype is a "master data" template copied by value (not by reference) into consuming documents (`Appraisal`, `Employee Performance Feedback`) at creation time — changing a template after Appraisals have already copied its rows does NOT retroactively change those Appraisals' rows. A port must replicate this copy-on-create semantics rather than treating the template as a live foreign-key reference for row data (only the `appraisal_template` link field itself is a live reference, used for display/re-fetch actions, not for authoritative row data).
