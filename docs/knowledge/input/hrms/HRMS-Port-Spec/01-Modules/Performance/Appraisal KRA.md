# Appraisal KRA

**Source:** `hrms/hr/doctype/appraisal_kra/appraisal_kra.json`, `appraisal_kra.py`
**Submittable:** no (child table only)   **Tree:** no   **Naming:** `hash` (random autoname; only used as a child row of `Appraisal.appraisal_kra`)
**Module:** HR

This is a child doctype (`istable: 1`) used exclusively as the `Appraisal.appraisal_kra` table when `Appraisal.rate_goals_manually = 0` ("Automated Based on Goal Progress" mode, the default).

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| kra | KRA | Link | KRA | yes | — | — | Key Result Area — links to the `KRA` doctype (owned elsewhere, referenced only); columns=2, width 200px |
| per_weightage | Weightage (%) | Percent | — | yes | — | — | non_negative |
| goal_completion | Goal Completion (%) | Percent | — | no | — | yes | precision 2; computed |
| goal_score | Goal Score (weighted) | Float | — | no | — | yes | precision 2; computed |

(One Column Break layout field omitted.)

## Child Tables

N/A.

## State Machine

N/A — not submittable; governed by parent `Appraisal`.

## Validation Rules (exact, in execution order)

None defined on this doctype's own controller (`AppraisalKRA(Document): pass`). Row values are computed and validated at the parent level:
1. `Appraisal.set_goal_score()` recomputes `goal_completion` and `goal_score` for every row on every save of the parent (see `Appraisal.md`).
2. `Appraisal.calculate_total_score()` enforces that `sum(per_weightage)` across all rows equals 100 (see `Appraisal.md` Validation Rules #7 and `AppraisalMixin.validate_total_weightage`, rule #5).

## Business Logic / Calculations

Computed entirely by the parent (`Appraisal.set_goal_score()`):
```
FOR each row (this doctype's instance):
    avg_goal_completion = AVG(Goal.progress)
        WHERE Goal.kra = row.kra
          AND Goal.employee = <parent appraisal's employee>
          AND Goal.status != "Archived"
          AND (Goal.parent_goal = "" OR Goal.parent_goal IS NULL)
          AND Goal.appraisal_cycle = <parent appraisal's appraisal_cycle>
    row.goal_completion = round(avg_goal_completion, 2)
    row.goal_score = round(row.goal_completion * row.per_weightage / 100, 2)
```

## Lifecycle Hooks (exact)

None on this child doctype directly.

## Whitelisted / API Methods

None. (Note: `Appraisal.get_kras_for_employee` — a module-level whitelisted method on the parent `Appraisal` controller — queries this table's rows directly via `frappe.get_all("Appraisal KRA", filters={"parent": appraisal, "kra": ("like", ...)})` to power the `Goal.kra` link-field's autocomplete; documented fully in `Appraisal.md`.)

## Permissions ([[Permission Model (RBAC)]])

Empty `permissions` array in the JSON — governed by parent (`Appraisal`).

## Scheduled Jobs Touching This Doctype

None.

## Related Doctypes

- [[Appraisal]] — parent doctype; this child table is `Appraisal.appraisal_kra`, used when `rate_goals_manually = 0` (the default).
- [[Goal]] — read (not a schema link) by `Appraisal.set_goal_score()` to compute `goal_completion`/`goal_score` for each row.

## Port Notes

- Model as an owned child row table, one-to-many FK to the parent Appraisal, cascade-deleted with it, ordered by `idx`.
- `goal_completion`/`goal_score` are derived/cached values (a materialized aggregate of `Goal.progress`), recomputed on every Appraisal save — NOT the source of truth for goal progress (the `Goal` doctype is). A port must recompute these the same way rather than trusting stale stored values across writes to `Goal`, mirroring the `Goal.on_update`/`after_delete` -> `Appraisal.set_goal_score(update=True)` propagation documented in `Appraisal.md` and `Goal.md`.
- `kra` here is a real Link to the `KRA` doctype (unlike `Appraisal Goal.kra`, which is free text) — enforce referential integrity (FK) against the `KRA` table in the port.
