# Performance Module — Overview

## Purpose

The Performance module implements a KRA/goal-based employee performance appraisal cycle: HR defines reusable **Appraisal Templates** (KRAs + rating criteria with weightages), runs a time-boxed **Appraisal Cycle** for a population of employees, generates one **Appraisal** per employee from their assigned template, tracks the employee's individual **Goals** (optionally nested, tagged to a KRA) whose progress automatically rolls up into the Appraisal's KRA scores, collects peer/manager **Employee Performance Feedback** and the employee's own self-rating on the Appraisal, and finally computes a weighted **Final Score** per employee (average of goal score, feedback score, and self-appraisal score, or a custom formula).

## Doctype List

| Doctype | Purpose |
|---|---|
| [[Appraisal]] | The per-employee, per-cycle submittable record aggregating KRA/goal scores, self-appraisal score, average peer feedback score, and a computed final score. |
| [[Appraisal Cycle]] | A named, time-boxed HR-managed cycle (e.g. "H1 2026") that generates and tracks Appraisals for a filtered population of employees. |
| [[Appraisal Goal]] | Child table row of `Appraisal.goals` — a single manually-rated goal/score line (used only when the cycle's evaluation method is "Manual Rating"). |
| [[Appraisal KRA]] | Child table row of `Appraisal.appraisal_kra` — a KRA with weightage and an auto-computed goal-completion/goal-score (used when the cycle's evaluation method is "Automated Based on Goal Progress", the default). |
| [[Appraisal Template]] | Reusable, named blueprint of KRAs (with weightages) and rating criteria (with weightages), assignable per-Designation or per-Appraisee. |
| [[Appraisal Template Goal]] | Child table row of `Appraisal Template.goals` — one KRA + weightage entry in a template. |
| [[Goal]] | An employee's individual (optionally nested/grouped) goal, with a progress percentage, status, and optional link to an Appraisal Cycle + KRA for automated scoring. |
| [[Employee Performance Feedback]] | A single reviewer's submitted feedback + criteria ratings for a given employee's Appraisal; contributes to that Appraisal's average feedback score. |
| [[Employee Feedback Criteria]] | Simple named master list of rating criteria (e.g. "Communication") referenced by rating rows. |
| [[Employee Feedback Rating]] | Shared child table row (criteria + weightage + optional rating) used across `Appraisal Template.rating_criteria`, `Appraisal.self_ratings`, and `Employee Performance Feedback.feedback_ratings`. |

Doctypes referenced by this module but owned elsewhere (do not create files for these; reference by name only): [[Employee Core Model]] (`Employee`), `Department`, `Designation` (including `Designation.appraisal_template`), `Company`, `Branch`, `KRA`, `Appraisal Cycle`'s `Appraisee` child doctype, `User`.

No `Self Appraisal` or `Energy Point` doctype exists in this repository — confirmed via directory listing of `hrms/hr/doctype/`; skipped per prior-pass guidance.

## Recommended Target Schema Shape

Suggested relational design for a Postgres/MySQL port (table names illustrative; adapt casing/pluralization to house style):

```
appraisal_cycles
  id (PK, or use cycle_name as natural key)
  cycle_name (unique)
  company_id (FK -> companies)
  status (enum: not_started | in_progress | completed)
  start_date, end_date
  description
  kra_evaluation_method (enum: automated_goal_progress | manual_rating)
  calculate_final_score_based_on_formula (bool)
  final_score_formula (text, nullable)
  branch_id, department_id, designation_id (FK, nullable — filter presets only, not enforced constraints)
  created_at, updated_at (+ full audit history table if track_changes parity is required)

appraisal_cycle_appraisees   (owned by another module — the "Appraisee" child doctype; FK to appraisal_cycles)

appraisal_templates
  id (PK, or template_title as natural key)
  template_title (unique)
  description

appraisal_template_goals
  id (PK)
  appraisal_template_id (FK -> appraisal_templates, cascade delete)
  key_result_area_id (FK -> kras)
  per_weightage (numeric)
  idx (row order)

appraisal_template_rating_criteria    -- Employee Feedback Rating in "template" context; rating column omitted/unused
  id (PK)
  appraisal_template_id (FK -> appraisal_templates, cascade delete)
  criteria_id (FK -> employee_feedback_criteria)
  per_weightage (numeric)
  idx

employee_feedback_criteria
  id (PK, or criteria text as natural key)
  criteria (unique)

appraisals
  id (PK, or naming-series-generated string like Appraisal doctype's name)
  employee_id (FK -> employees)
  employee_name, department_id, designation_id (denormalized/fetched — recompute or cache from employee_id, do not treat as independently authoritative)
  company_id (FK -> companies)
  appraisal_cycle_id (FK -> appraisal_cycles)
  start_date, end_date
  appraisal_template_id (FK -> appraisal_templates, nullable until first save)
  rate_goals_manually (bool)
  goal_score_percentage, total_score, self_score, avg_feedback_score, final_score (numeric)
  remarks (text, nullable)
  reflections (text, nullable)
  docstatus (0 draft / 1 submitted / 2 cancelled)
  amended_from_id (self-FK, nullable)
  UNIQUE / overlap-guard: see Module-Wide Invariants below (not a simple UNIQUE constraint — needs an application-level or exclusion-constraint check)
  created_at, updated_at (+ audit history table)

appraisal_kras           -- used when rate_goals_manually = false
  id (PK)
  appraisal_id (FK -> appraisals, cascade delete)
  kra_id (FK -> kras)
  per_weightage (numeric)
  goal_completion (numeric, computed/cached)
  goal_score (numeric, computed/cached)
  idx

appraisal_goals          -- used when rate_goals_manually = true
  id (PK)
  appraisal_id (FK -> appraisals, cascade delete)
  kra_description (text — free text, NOT an FK; distinct from appraisal_kras.kra_id)
  per_weightage (numeric)
  score (numeric, nullable)
  score_earned (numeric, computed/cached)
  idx

appraisal_self_ratings   -- Employee Feedback Rating in "self-appraisal" context
  id (PK)
  appraisal_id (FK -> appraisals, cascade delete)
  criteria_id (FK -> employee_feedback_criteria)
  per_weightage (numeric)
  rating (numeric, 0..max_stars fractional or raw star count — pick one convention and document it)
  idx

goals
  id (PK, or naming-format-generated string like HR-GOAL-YYYY-####)
  goal_name
  is_group (bool)
  parent_goal_id (self-FK, nullable)  -- adjacency list; OR maintain lft/rgt if replicating nested-set
  progress (numeric 0-100)
  status (enum: pending | in_progress | completed | archived | closed)
  employee_id (FK -> employees, immutable after first save)
  company_id (FK -> companies, denormalized from employee)
  start_date, end_date
  appraisal_cycle_id (FK -> appraisal_cycles, nullable, immutable after first save)
  kra_id (FK -> kras, nullable; required when top-level AND appraisal_cycle_id set)
  description (text)
  created_at, updated_at (+ audit history table)

employee_performance_feedbacks
  id (PK, or naming-format string like HR-PF-YYYY-#####)
  employee_id (FK -> employees)          -- the reviewee
  reviewer_id (FK -> employees)          -- the reviewer; != employee_id enforced
  company_id, department_id, designation_id, reviewer_designation_id (denormalized fetches)
  added_on (timestamp)
  appraisal_id (FK -> appraisals)
  appraisal_cycle_id (denormalized fetch from appraisal_id.appraisal_cycle_id)
  total_score (numeric, computed)
  feedback (text)
  docstatus (0/1/2)
  amended_from_id (self-FK, nullable)
  created_at, updated_at

employee_performance_feedback_ratings   -- Employee Feedback Rating in "feedback" context
  id (PK)
  employee_performance_feedback_id (FK, cascade delete)
  criteria_id (FK -> employee_feedback_criteria)
  per_weightage (numeric)
  rating (numeric)
  idx
```

Notes on the shape above:
- `Employee Feedback Rating` is intentionally split into three parent-specific tables (`appraisal_template_rating_criteria`, `appraisal_self_ratings`, `employee_performance_feedback_ratings`) rather than ported as one polymorphic table — see `Employee Feedback Rating.md` Port Notes for the rationale.
- `Appraisal KRA` and `Appraisal Goal` are two DIFFERENT owned child tables (not variants of the same table) because their schemas genuinely differ (`kra_id` FK with computed completion/score vs. free-text description with a directly-entered score) — keep them separate.
- All child tables are owned rows (cascade-deleted with their parent), not independent join tables, since none of them are ever referenced from more than one parent row.
- `Goal` is the one genuinely tree-shaped table in this module; everything else is flat.

## Module-Wide Invariants

- **One active Appraisal per employee per overlapping period**: an employee cannot have two non-cancelled Appraisals that either share the same `appraisal_cycle` OR have overlapping `[start_date, end_date]` windows. This is NOT a simple database UNIQUE constraint (the overlap condition is a range check, not equality) — implement as an application-level check (as the source does, in `Appraisal.validate_duplicate`) or a database exclusion constraint (e.g. Postgres `EXCLUDE USING gist` on a date range plus employee, if the target DB supports it).
- **Weightage-must-sum-to-100 invariant**, applied independently to FOUR different child tables across the module: `Appraisal.appraisal_kra`, `Appraisal.goals`, `Appraisal.self_ratings`, `Appraisal Template.goals`, `Appraisal Template.rating_criteria`, and `Employee Performance Feedback.feedback_ratings` — whenever any of these tables is non-empty, the sum of its rows' `per_weightage` must equal exactly 100 (compared after rounding to 2 decimal places). This is the single most-repeated business rule in the module (`AppraisalMixin.validate_total_weightage`) — implement once as a shared validator/constraint helper in the port, not six separate copies.
- **An Appraisal Cycle's KRA evaluation method is immutable once any non-cancelled Appraisal exists under it** — changing `Automated Based on Goal Progress` ↔ `Manual Rating` after Appraisals have been created is blocked, because it would silently make the existing Appraisals' `rate_goals_manually` flag (fixed at creation time per-Appraisal) inconsistent with new ones created after the change.
- **A cycle cannot be marked Completed while any linked Appraisal is still in Draft** (`Appraisal Cycle.complete_cycle()` guard).
- **No transactions may be created or edited against a Completed Appraisal Cycle** — this single guard (`validate_active_appraisal_cycle`) is applied uniformly across `Appraisal`, `Goal`, and `Employee Performance Feedback` — implement as one shared cross-doctype validator, not three copies.
- **No transactions may be created against an Inactive Employee** (`validate_active_employee`) — applied to `Appraisal.employee`, `Goal.employee`, and both `Employee Performance Feedback.employee`/`.reviewer`. Same "implement once, reuse everywhere" note as above.
- **Goal progress rollups are recomputed top-down through the whole ancestor chain on every relevant write** (a child goal's progress change recomputes its immediate parent's average, which — because that recompute is itself a save — recomputes the grandparent, and so on), and separately fan out to update the linked Appraisal's KRA-derived `total_score`/`final_score` whenever a Goal tagged to an `appraisal_cycle` changes or is deleted. A port must decide whether to replicate this as cascading application-level recomputation (matching current behavior exactly, including its potential performance cost on deep trees) or to redesign as a materialized/on-demand aggregate — but the *default* expectation for a faithful port is the cascading recompute-on-write behavior described in `Goal.md` and `Appraisal.md`.
- **Appraisal Template rows are copied by value, not referenced live**: once `Appraisal.set_kras_and_rating_criteria()` or `Employee Performance Feedback.set_feedback_criteria()` has copied a template's KRA/criteria rows into a document, later edits to the source `Appraisal Template` do not retroactively affect already-created documents.
- **Self-rating and peer-feedback scoring use inconsistent star-count constants** across the module (`Appraisal.calculate_self_appraisal_score` reads the max-star option dynamically; `Employee Performance Feedback.set_total_score` hardcodes `5`) — a pre-existing inconsistency in the source, not a design invariant; flagged so the port doesn't "fix" it silently and unintentionally change score parity with the original system (see `Employee Performance Feedback.md` Port Notes).
