---
type: flow
tags: [hrms, flow]
roles: [HR Manager, HR User, Employee]
---

# Performance Appraisal Cycle

## Flow

```mermaid
flowchart TD
    AT[Appraisal Template defined\n(Appraisal Template Goal rows = weighted competencies)] --> AC[Appraisal Cycle opened\n(a period, e.g. H1 2026, with participating employees)]
    AC --> Ap[Appraisal created per Employee\nfrom the Template]
    Ap --> Goals[Appraisal Goal rows set\n(individual, often linked to a standalone Goal record)]
    Goals --> KRA[Appraisal KRA groups goals\ninto weighted Key Result Areas]
    KRA --> Track[Ongoing: Goal progress updated through the cycle]
    Track --> SelfEval[Employee self-rates against goals]
    SelfEval --> PeerFB[Employee Performance Feedback collected\nfrom nominated reviewers, scored against Employee Feedback Criteria]
    PeerFB --> MgrEval[Manager/HR finalizes ratings]
    MgrEval --> Sub[Appraisal submitted]
    Sub --> Close[Appraisal Cycle closed]
    Close -->|often feeds| Comp[Employee Promotion / Additional Salary / Retention Bonus decisions]
```

## Roles at Each Step

| Step | Role |
|---|---|
| Design [[Appraisal Template]], open [[Appraisal Cycle]] | [[HR Manager]] |
| Create individual Appraisals for the cycle | [[HR User]] |
| Set/track [[Goal]]s, self-rate | [[Employee]] (self) |
| Give peer feedback | [[Employee]] (as nominated reviewer) |
| Finalize and submit [[Appraisal]] | manager / [[HR User]] / [[HR Manager]] |

## Why This Structure, Not a Single Rating Field

- **Appraisal Template is separated from Appraisal** so an organization's competency
  framework (what gets measured, and its weighting) is defined once and applied
  consistently across every employee in a cycle, rather than each Appraisal being
  built from scratch with inconsistent criteria.
- **[[Appraisal KRA]] groups goals with weights** because raw goal completion isn't equally
  important across areas — grouping into weighted Key Result Areas lets a final score
  reflect that, e.g., "revenue targets" might matter more than "internal process
  improvements" for a given role.
- **Goal exists as its own doctype, not just a field on Appraisal**, because goals are
  meant to be tracked continuously *during* the cycle (progress updates, check-ins),
  not just filled in retrospectively at appraisal time — separating them lets ongoing
  goal-tracking happen independent of when the formal Appraisal document gets created.
- **[[Employee Performance Feedback]] is collected as its own submittable record**, scored
  against defined [[Employee Feedback Criteria]], so peer input is structured and
  attributable (who said what, against which criteria) rather than freeform comments
  that are hard to aggregate fairly across many reviewers.
- **Appraisal Cycle is the batching unit** (like Payroll Entry batches Salary Slips)
  because performance reviews are inherently periodic and comparative — ratings only
  mean something in the context of "everyone was reviewed against the same template in
  the same window," which the Cycle enforces.

See also: [[Hire to Retire Overview]], [[01-Modules/Performance/_Overview|Performance Module]],
[[Appraisal Cycle]], [[Appraisal]], [[Goal]].
