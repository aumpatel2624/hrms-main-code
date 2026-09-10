# Skill Assessment

**Source:** `hrms/hr/doctype/skill_assessment/skill_assessment.json`, `skill_assessment.py`
**Submittable:** no   **Tree:** no   **Naming:** child table doctype — no `autoname`; generic auto-generated row `name` plus `parent`/`parentfield`/`parenttype`. `istable: 1`.
**Module:** HR

`Skill Assessment` is a real, distinct child-table doctype folder (`hrms/hr/doctype/skill_assessment/`) — it is **not** a field pattern embedded directly inside `Employee Skill Map`. It is used elsewhere in the codebase (see Permissions/Port Notes) rather than by any doctype in this HR-Core assignment.

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| skill | Skill | Link | [[Skill]] | yes (`reqd: 1`) | — | yes (`read_only: 1`) | `in_list_view: 1` — read-only once set (typically pre-populated by the parent flow, not hand-typed) |
| rating | Rating | Rating | — | yes (`reqd: 1`) | — | no | `in_list_view: 1` |

`field_order`: `["skill", "rating"]`.

`editable_grid: 1`, `index_web_pages_for_search: 1`.

## Child Tables

N/A — this is itself a child table.

## State Machine

Not submittable, no status field. Lifecycle entirely bound to its parent document.

## Validation Rules (exact, in execution order)

`skill_assessment.py` controller body is `class SkillAssessment(Document): pass` — **no custom validation code**.

Implicit framework-level constraints:
1. `skill` is mandatory (`reqd: 1`).
2. `rating` is mandatory (`reqd: 1`).
3. `skill` is `read_only: 1` at the field level — the framework will not accept direct user edits to this field from a standard form once rendered read-only client-side; however, read-only at the DocField level is primarily a UI/display constraint in Frappe and is **not** itself a server-side "reject if changed" validation unless `permlevel` restrictions or explicit controller code enforce it — no such enforcing code exists here, so a value change submitted directly via API bypassing the UI would not be blocked by any code in this file. Flagged as a gap rather than assumed enforced.

## Business Logic / Calculations

None on this doctype itself. However, its data is consumed by an averaging calculation elsewhere:

`hrms/hr/doctype/interview/interview.py`, whitelisted function `get_skill_wise_average_rating(interview: str)`:
1. Build a query joining `Skill Assessment` (aliased) to `Interview Feedback` on `skill_assessment.parent == interview_feedback.name`.
2. Filter to feedback rows for the given `interview`.
3. Group by `skill_assessment.skill`.
4. Compute `Avg(skill_assessment.rating)` as `rating` per skill group.
5. Order by `skill_assessment.idx`.

This logic lives on and belongs to the `Interview` doctype (Recruitment module) — referenced here only because it is the sole consumer of `Skill Assessment` rows found in this repo; the full `Interview`/`Interview Feedback` behavior should be documented in the Recruitment module's own spec files, not duplicated here.

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| (none) | Controller class body is `pass`. | none |

## Whitelisted / API Methods

None defined directly on this child doctype's own controller file. (The averaging method described above is defined on `Interview`, not on `Skill Assessment`.)

## Permissions

`"permissions": []` — governed entirely by the parent doctype embedding it.

**Parent doctype found in this repo:** `hrms/hr/doctype/interview_feedback/interview_feedback.json` declares a `Table` field `skill_assessment` (section label "Skill Assessment", `reqd: 1`, `allow_in_quick_entry: 1`) with `options: "Skill Assessment"`. `Interview Feedback` belongs to the Recruitment module — out of scope for this HR-Core file set, cross-referenced by name only.

`Employee Skill Map` (this module) does **not** embed `Skill Assessment` anywhere in its schema — confirmed by direct inspection of `employee_skill_map.json`'s `field_order`/`fields`, which only reference `Employee Skill` and `Employee Training` as Table fields.

## Scheduled Jobs Touching This Doctype

None found in `hrms/hooks.py`.

## Related Doctypes

- [[Skill]] — via `skill`: `in_list_view: 1` — read-only once set (typically pre-populated by the parent flow, not hand-typed)

## Port Notes

- **Correcting a plausible assumption:** despite being requested alongside `Employee Skill Map` in this assignment, `Skill Assessment` has no structural relationship to `Employee Skill Map`, `Employee Skill`, or `Designation Skill` in source — it is a standalone child table consumed exclusively by the Recruitment module's interview-feedback flow (`Interview Feedback` → per-skill rating rows → averaged by `Interview.get_skill_wise_average_rating`). Do not merge or conflate this with `Employee Skill Map`'s proficiency-rating concept (`Employee Skill.proficiency`) — they are separate rating concepts on separate parent flows.
- `track_changes: 1` is set — child-row versioning tied to `Interview Feedback`.
- `sort_order: "DESC"` — same non-ASC default ordering noted for `Expected Skill Set`; the actual consuming query (`get_skill_wise_average_rating`) explicitly orders by `idx`, so replicate `idx`-based ordering for any read path that needs deterministic skill ordering, not `sort_order`.
- The `skill` field's `read_only: 1` combined with no field-level permission/validation enforcement in the Python controller means a re-implementer choosing to enforce true immutability of `skill` after row creation must add that check explicitly — it is not guaranteed by anything in this file today.
