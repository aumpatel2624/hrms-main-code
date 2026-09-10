# Appraisal Goal

**Source:** `hrms/hr/doctype/appraisal_goal/appraisal_goal.json`, `appraisal_goal.py`
**Submittable:** no (child table only)   **Tree:** no   **Naming:** `hash` (random autoname; only used as a child row of `Appraisal.goals`)
**Module:** HR

This is a child doctype (`istable: 1`) used exclusively as the `Appraisal.goals` table when `Appraisal.rate_goals_manually = 1` ("Manual Rating" mode).

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| kra | Goal | Small Text | — | yes | — | — | Despite fieldname/description ("Key Responsibility Area"), the label shown is "Goal" — free-text description of the goal being rated, NOT a Link to the `Goal` doctype. width 240px |
| per_weightage | Weightage (%) | Float | — | yes | — | — | non_negative |
| score | Score | Float | — | no | — | — | non_negative, no_copy; capped at `number_of_stars` (see `Appraisal.md` → `calculate_total_score`) |
| score_earned | Score Earned | Float | — | no | — | yes | no_copy; computed = `score * per_weightage / 100` |

(Two Section Break / one Column Break layout fields omitted.)

## Child Tables

N/A — this doctype has no child tables of its own.

## State Machine

N/A — not submittable; lifecycle is entirely governed by its parent `Appraisal`.

## Validation Rules (exact, in execution order)

None defined on this doctype's own controller (`AppraisalGoal(Document): pass`). All validation of its rows happens in the parent `Appraisal.calculate_total_score()` — see `Appraisal.md` Validation Rules #7 and Business Logic:
1. Row-level: IF `flt(score) > number_of_stars` THEN parent throws `"Row {idx}: Goal Score cannot be greater than {number_of_stars}"`.
2. Table-level: sum of `per_weightage` across all rows must equal 100 (parent-level check, see `Appraisal.md`).

Client-side only (not enforced server-side per-field, but the value it guards against is re-checked server-side via the rule above): in `appraisal.js`, on entering a `score` value, if `score > 5` a `msgprint` fires and the value is reset to 0 client-side.

## Business Logic / Calculations

`score_earned = flt(score) * flt(per_weightage) / 100`, recomputed by the parent `Appraisal.calculate_total_score()` on every save (also mirrored live in the browser by `appraisal.js`'s `set_score_earned` trigger for immediate UI feedback).

## Lifecycle Hooks (exact)

None on this child doctype directly. Its rows are read/written entirely from the parent `Appraisal` controller during `validate()`.

## Whitelisted / API Methods

None.

## Permissions ([[Permission Model (RBAC)]])

Empty `permissions` array in the JSON — governed by parent (`Appraisal`); a user's ability to read/write rows in this table is entirely determined by their permissions on the parent Appraisal document.

## Scheduled Jobs Touching This Doctype

None.

## Related Doctypes

- [[Appraisal]] — parent doctype; this child table is `Appraisal.goals`, used only when `rate_goals_manually = 1`.

## Port Notes

- Model as an owned child row table (not a join table) — one-to-many, `appraisal_id` FK, ON DELETE CASCADE with the parent Appraisal, ordered by an `idx`/sort column (Frappe child tables are ordered lists, tracked via `idx`).
- `kra` here is plain free text (Small Text), distinct in shape from `Appraisal KRA.kra` (a Link to the `KRA` doctype) — do not conflate the two similarly-named fields when designing columns; consider naming them distinctly in the target schema (e.g. `goal_description` vs `kra_id`) to avoid confusion, while preserving the original Frappe fieldname mapping in a comment for traceability.
- `no_copy` fields (`score`, `score_earned`): when the parent Appraisal is amended (cancel + create new draft copy), Frappe's "Amend" flow clears `no_copy` fields on the new copy. A port's amend/duplicate logic must reset `score` and `score_earned` to blank/zero on amendment, matching this behavior.
