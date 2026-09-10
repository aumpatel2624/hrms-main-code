# Recruitment Module — Overview

## Purpose

The Recruitment module covers the end-to-end hiring pipeline in Frappe HRMS: an
internal headcount request (`Job Requisition`) is approved and turned into one or more
public/internal postings (`Job Opening`, optionally seeded from a `Job Opening
Template`), candidates apply (`Job Applicant`, sourced via `Job Applicant Source`),
applicants are scheduled through one or more interview rounds (`Interview`, driven by a
reusable `Interview Type`, staffed by `Interviewer` rows and scored via `Interview
Detail` / `Interview Feedback`), and a selected applicant receives a formal offer
(`Job Offer`, built from `Job Offer Term` lines optionally seeded from a `Job Offer
Term Template`). Accepting the offer (via [[Employee Core Model|Employee]] creation) feeds back into
`Job Applicant`/`Job Offer` status through an Employee-side [[Cross-Doctype Hooks (doc_events)|hook]]. A public, unauthenticated
job board (`hrms/www/jobs/index.py`) exposes open, published Job Openings to external
candidates. A daily scheduled job auto-closes expired Job Openings and cascades that
back to the Job Requisition's fill status.

> [!note] Skill Assessment / Expected Skill Set live under HR-Core's output folder
> [[Skill Assessment]] and [[Expected Skill Set]] are functionally part of this module's
> Interview Feedback / Interview Type flow (assessing a candidate/interviewer against
> expected skills), but they physically sit under `hr/doctype` alongside HR-Core's
> skill doctypes and were documented there (`01-Modules/HR-Core/Skill Assessment.md`,
> `01-Modules/HR-Core/Expected Skill Set.md`) per this spec's module split. A port is
> free to place them wherever makes sense for its own module boundaries — there is no
> FK from them back into anything else in HR-Core, only into Interview-flow doctypes.

## Doctype List

| Doctype | Purpose |
|---|---|
| [[Job Requisition]] | Internal request to hire for a Designation; approval gate before a Job Opening can reference it; tracks time-to-fill. |
| [[Job Opening]] | A postable vacancy (internal and/or public job-board listing) for a Designation/Department; can auto-close on `closes_on`. |
| [[Job Opening Template]] | Reusable template of description/salary-range/employment defaults to prefill a new Job Opening. |
| [[Job Applicant]] | A candidate record captured against a Job Opening/Designation; central pipeline status field driving Interview/Job Offer creation. |
| [[Job Applicant Source]] | Simple lookup list of where an applicant came from (referral, website, agency, etc.). |
| [[Interview Type]] | Reusable interview-round definition (name, interviewer list defaults, skill list) — as of v16 this doctype absorbed the former `Interview Round` doctype via a merge patch. |
| [[Interviewer]] | Child table row (interviewer Employee/User) attached to `Interview Type` and to `Interview`. |
| [[Interview]] | A single scheduled interview round instance for a Job Applicant against an Interview Type; submittable; aggregates `Interview Feedback` into an average rating. |
| [[Interview Detail]] | Child table on `Interview` listing the interviewers assigned to that specific interview instance and their individual feedback linkage. |
| [[Interview Feedback]] | Submittable per-interviewer scorecard for one `Interview`, with per-skill ratings and an overall recommendation (result). |
| [[Job Offer]] | Submittable formal offer document issued to a Job Applicant; carries offer terms; status flow through Awaiting/Accepted/Rejected/Withdrawn. |
| [[Job Offer Term]] | Child table row on `Job Offer` (term label + value), also the row shape used inside `Job Offer Term Template`. |
| [[Job Offer Term Template]] | Reusable named set of `Job Offer Term` rows to prefill a new Job Offer. |

Confirmed: there is **no** separate `Interview Round` doctype folder under
`hrms/hr/doctype/` — `hrms/patches/v16_0/merge_interview_round_with_interview_type.py`
renamed any legacy `Interview Round` records into `Interview Type` during migration.
Any "round" concept in a ported system should be modeled as `Interview Type`.

Also covered outside the doctype folders (see the relevant doctype files for full detail):
- `hrms/www/jobs/index.py` — public job board query/rendering — documented in `Job Opening.md`.
- `hrms/overrides/employee_master.py: update_job_applicant_and_offer` — Employee-side
  hook that auto-accepts a Job Applicant/Job Offer on Employee creation — documented in
  `Job Applicant.md` (applicant side) and `Job Offer.md` (offer side).
- `hrms/hooks.py` scheduler_events — `close_expired_job_openings` (documented in
  `Job Opening.md`), `send_interview_reminder` (documented in `Interview.md`),
  `send_daily_feedback_reminder` (documented in `Interview Feedback.md`).

## Recommended Target Schema Shape

Model as one table per doctype (owned rows for child tables, since none of these child
tables are shared/reused across unrelated parents except the term/interviewer shapes
noted below).

```
job_requisition
  id (PK, naming series HR-HIREQ-.....)
  designation_id FK -> designation
  department_id  FK -> department (nullable)
  company_id     FK -> company
  requested_by_employee_id FK -> employee
  no_of_positions INT
  expected_compensation DECIMAL
  status ENUM(Pending, Open & Approved, Rejected, Filled, On Hold, Cancelled)
  posting_date DATE, expected_by DATE, completed_on DATE (nullable)
  time_to_fill INTERVAL/seconds (computed, read-only)
  description TEXT, reason_for_requesting TEXT

job_opening
  id (PK)
  job_title VARCHAR
  company_id FK -> company
  designation_id FK -> designation
  department_id FK -> department (nullable)
  job_requisition_id FK -> job_requisition (nullable)
  job_opening_template_id FK -> job_opening_template (nullable)
  status ENUM(Open, Closed)
  publish BOOLEAN, publish_salary_range BOOLEAN, publish_applications_received BOOLEAN
  prevent_duplicate_applicant BOOLEAN
  route VARCHAR (unique slug for public URL)
  employment_type_id FK -> employment_type (nullable)
  location VARCHAR (nullable)
  currency_id FK -> currency, lower_range DECIMAL, upper_range DECIMAL, salary_per ENUM
  vacancies INT, planned_vacancies INT (from staffing plan, nullable)
  staffing_plan_id FK -> staffing_plan (nullable)
  posted_on DATE, closes_on DATE (nullable), closed_on DATE (nullable)
  description TEXT

job_opening_template
  id (PK), template_name VARCHAR
  description TEXT, currency_id FK, lower_range DECIMAL, upper_range DECIMAL, salary_per ENUM
  employment_type_id FK (nullable), publish_salary_range BOOLEAN

job_applicant_source
  id (PK), source_name VARCHAR (unique)

job_applicant
  id (PK)
  applicant_name VARCHAR, email_id VARCHAR
  job_opening_id FK -> job_opening (nullable), designation_id FK, job_title VARCHAR
  status ENUM(Open, Replied, Rejected, Hold, Accepted)  -- confirm exact list per Job Applicant.md
  source_id FK -> job_applicant_source (nullable), source_name VARCHAR (freeform, if source has no link), employee_referral_id FK -> employee_referral (nullable)
  cover_letter TEXT, resume_attachment FILE, resume_link URL, notes TEXT
  phone_number VARCHAR, country_id FK (nullable)
  applicant_rating DECIMAL
  currency_id FK, lower_range DECIMAL, upper_range DECIMAL (expected compensation)

interview_type
  id (PK), name VARCHAR
  interviewer rows (see interview_type_interviewer join table below)
  -- plus any skill-list child table: model as interview_type_skill(interview_type_id, skill)

interview_type_interviewer  (child table "Interviewer" owned by Interview Type)
  id (PK), parent_id FK -> interview_type, idx INT, interviewer_user_id FK -> user/employee

interview
  id (PK), naming series
  job_applicant_id FK -> job_applicant
  job_opening_id FK -> job_opening (nullable)
  interview_type_id FK -> interview_type
  designation_id FK (fetched)
  status ENUM(Pending, Under Review, Cleared, Rejected)  -- confirm exact list per Interview.md
  scheduled_on DATE, from_time TIME, to_time TIME
  average_rating DECIMAL, expected_average_rating DECIMAL
  interview_summary TEXT
  reminded BOOLEAN
  docstatus TINYINT (0/1/2), amended_from_id FK -> interview (self, nullable)

interview_detail  (child table on Interview)
  id (PK), parent_id FK -> interview, idx INT
  interviewer_user_id FK -> user
  interview_feedback_id FK -> interview_feedback (nullable, once submitted)

interview_feedback
  id (PK), naming series
  interview_id FK -> interview
  interviewer_user_id FK -> user
  job_applicant_id FK -> job_applicant (fetched)
  interview_type_id FK -> interview_type (fetched)
  average_rating DECIMAL
  result ENUM(Cleared, Rejected)  -- confirm exact per Interview Feedback.md
  feedback TEXT
  docstatus TINYINT, amended_from_id FK -> interview_feedback (self, nullable)

interview_feedback_skill (child table "skill_assessment" on Interview Feedback)
  id (PK), parent_id FK -> interview_feedback, idx INT
  skill VARCHAR, rating DECIMAL

job_offer
  id (PK), naming series
  job_applicant_id FK -> job_applicant
  applicant_name VARCHAR, applicant_email VARCHAR (fetched)
  designation_id FK, company_id FK
  job_offer_term_template_id FK -> job_offer_term_template (nullable)
  status ENUM(Awaiting Response, Accepted, Rejected, Withdrawn)  -- confirm exact list per Job Offer.md
  offer_date DATE
  select_print_heading VARCHAR (nullable), letter_head_id FK (nullable)
  docstatus TINYINT, amended_from_id FK -> job_offer (self, nullable)

job_offer_term  (child table "offer_terms" on Job Offer; also row shape reused inside Job Offer Term Template)
  id (PK), parent_id FK -> job_offer OR job_offer_term_template (owned by whichever parent), idx INT
  offer_term_id FK -> job_offer_term_template line label (or freeform VARCHAR if not templated), value TEXT

job_offer_term_template
  id (PK), template_name VARCHAR (unique)
  offer_terms rows -> job_offer_term_template_item(parent_id, idx, offer_term VARCHAR, value TEXT)
```

Notes on the schema above:
- `Interview Detail` and `Interview Feedback` are two distinct concepts that a port must
  keep separate: `Interview Detail` is the *scheduling* child row (which interviewers
  are assigned) living on `Interview`; `Interview Feedback` is its own submittable
  top-level doctype (one per interviewer per interview) that `Interview Detail` links
  back to once that interviewer submits their scorecard.
- `Job Offer Term` rows are structurally duplicated between `Job Offer` (actual offer's
  terms) and `Job Offer Term Template` (reusable template's default terms) — these are
  two separate child tables in Frappe sharing the same child doctype definition; a
  relational port can either give them one shared child table with a `parent_type`
  discriminator column, or two separate owned tables (`job_offer_term` and
  `job_offer_term_template_item`) — check the field lists in `Job Offer Term.md` for
  the exact columns to replicate on each side.
- Treat every `naming series` autoname field (`Job Requisition` = `HR-HIREQ-.....`,
  and any series on `Interview`/`Interview Feedback`/`Job Offer` — confirm exact prefix
  per file) as an application-level auto-incrementing formatted ID generator; this is
  not automatic in a generic RDBMS and must be implemented explicitly (e.g. a sequence
  table keyed by prefix+fiscal segment, guarded against races). See
  [[Naming and Autoname Rules]].
- `docstatus` (submittable lifecycle: 0 Draft / 1 Submitted / 2 Cancelled) plus the
  `amended_from` self-link (a cancelled submitted doc can be "amended" into a fresh
  Draft copy that links back to the cancelled one) apply to `Interview`,
  `Interview Feedback`, and `Job Offer`. This three-state lifecycle plus amend-chain
  must be built explicitly in a new stack — Frappe provides `docstatus`,
  auto-numbering, `amended_from` linking, and cancel-permission checks for free. See
  [[Submittable Document Lifecycle]].
- `track_changes` (Frappe's automatic field-level audit trail) is relied on implicitly
  wherever a doctype JSON sets it — check each per-doctype file's Port Notes for
  whether it's enabled; if so, a port needs an explicit version/audit table. See
  [[Implicit Framework Behaviors]].

## Module-Wide Invariants

- **Job Requisition -> Job Opening is a soft link, not an enforced one-to-one.** A
  `Job Opening` may optionally reference a `Job Requisition` (`job_requisition` field),
  but nothing in the schema prevents multiple Job Openings pointing at the same
  Job Requisition, nor does it prevent a Job Requisition from having zero Job Openings.
  The only cross-doctype write-back found is the scheduled `close_expired_job_openings`
  job's cascade into the linked Job Requisition's status (see `Job Opening.md`).
- **A Job Applicant pipeline status is the hub of the whole module.** Interview
  scheduling and Job Offer creation are both driven from a Job Applicant record;
  neither `Interview` nor `Job Offer` can exist without a `job_applicant` link. A port
  must preserve `Job Applicant.status` as the single source of truth the UI/workflow
  reads to decide what actions (schedule interview, extend offer) are currently valid,
  even though — per the per-doctype files — Frappe does not appear to hard-enforce most
  of these as server-side state-machine guards (see each file's Validation Rules /
  Port Notes for exactly which transitions ARE enforced vs merely UI convention).
  Interview and Job Offer records are described in full only in `Job Applicant.md`,
  `Interview.md`, and `Job Offer.md` — see those files for the exact enforced rules.
  Do not assume additional guards beyond what those files quote.
- **Interview Feedback vs Interview average rating.** `Interview.average_rating` is
  derived from its child `Interview Feedback` submissions (aggregation logic is spelled
  out in `Interview.md`'s Business Logic section) — a port must recompute this
  server-side whenever a linked `Interview Feedback` is submitted/cancelled, not treat
  it as independently editable.
- **Amend chains must not double-count.** For any submittable doctype in this module
  (`Interview`, `Interview Feedback`, `Job Offer`), a cancelled-then-amended document
  produces a new document row linked via `amended_from`; queries/aggregations (e.g. the
  Job Applicant's effective current offer, or an interview's current feedback) must
  filter to the latest non-cancelled document in the chain, not sum across all amends.
- **Public job board exposure is a deliberate, unauthenticated read surface.** Only
  `Job Opening` rows with `status = Open` and `publish = 1` are ever eligible to appear
  via `hrms/www/jobs/index.py`; a port's equivalent public endpoint must reproduce that
  same filter server-side (not rely on client-side hiding) since it is a public,
  unauthenticated route. See `Job Opening.md` for the complete filter/field-exposure
  contract.
