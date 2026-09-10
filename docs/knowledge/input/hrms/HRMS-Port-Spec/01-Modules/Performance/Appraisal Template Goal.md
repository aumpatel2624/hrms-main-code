# Appraisal Template Goal

**Source:** `hrms/hr/doctype/appraisal_template_goal/appraisal_template_goal.json`, `appraisal_template_goal.py`
**Submittable:** no (child table only)   **Tree:** no   **Naming:** `hash` (random autoname; only used as a child row of `Appraisal Template.goals`)
**Module:** HR

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| key_result_area | KRA | Link | KRA | yes | — | — | "Key Result Area" |
| per_weightage | Weightage (%) | Percent | — | yes | — | — | non_negative |

## Child Tables

N/A.

## State Machine

N/A — not submittable; governed by parent `Appraisal Template`.

## Validation Rules (exact, in execution order)

None on this doctype's own controller (`AppraisalTemplateGoal(Document): pass`). Table-level weightage-sum validation is enforced by the parent (`Appraisal Template.validate_total_weightage("goals", "KRAs")` — see `Appraisal Template.md`).

## Business Logic / Calculations

None. This is a static blueprint row — no computed fields. Its two values (`key_result_area`, `per_weightage`) are copied verbatim into `Appraisal.appraisal_kra.kra`/`per_weightage` (or `Appraisal.goals.kra`/`per_weightage` in manual-rating mode) by `Appraisal.set_kras_and_rating_criteria()`.

## Lifecycle Hooks (exact)

None on this child doctype directly.

## Whitelisted / API Methods

None.

## Permissions ([[Permission Model (RBAC)]])

Empty `permissions` array in the JSON — governed by parent (`Appraisal Template`).

## Scheduled Jobs Touching This Doctype

None.

## Related Doctypes

- [[Appraisal Template]] — parent doctype; this child table is `Appraisal Template.goals`.

## Port Notes

- Model as an owned child row table under `Appraisal Template`, FK cascade-delete, ordered by `idx`.
- `key_result_area` is a real Link to the `KRA` doctype — enforce FK integrity in the port.
- Note the field-name mismatch across similarly-shaped doctypes: this doctype uses `key_result_area` for the KRA link, while `Appraisal KRA` (a different child doctype, same conceptual field) uses `kra` as its fieldname for the same Link-to-KRA relationship. When `Appraisal.set_kras_and_rating_criteria()` copies rows across, it explicitly remaps `entry.key_result_area` (source, this doctype) to `kra` (destination, `Appraisal KRA`/`Appraisal Goal`) — preserve this explicit field-name remap in the port rather than assuming a 1:1 column copy.
