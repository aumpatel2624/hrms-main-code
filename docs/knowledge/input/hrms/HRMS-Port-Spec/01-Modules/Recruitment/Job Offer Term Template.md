# Job Offer Term Template

**Source:** `hrms/hr/doctype/job_offer_term_template/job_offer_term_template.json`, `job_offer_term_template.py`, `job_offer_term_template.js`, `test_job_offer_term_template.py`
**Submittable:** no   **Tree:** no   **Naming:** `autoname: "field:title"` (document name = value of the `title` field, i.e. the template's Title doubles as its primary key/name — must be unique)
**Module:** HR (Recruitment)

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| title | Title | Data | — | No (`reqd` not set, but functions as the document's name via `autoname: field:title`, so it is effectively required — Frappe will error on insert if the naming field is blank) | — | No | `unique: 1` — enforced as a DB-level unique constraint by Frappe since it doubles as the document name |
| offer_terms | Offer Terms | Table | [[Job Offer Term]] | No | — | No | see Child Tables |

Field order per JSON `field_order`: title, offer_terms.

`allow_rename: 1` — since the document name IS the `title` field value, renaming the document (changing its `title`) is explicitly permitted (as opposed to some `field:` autoname doctypes which lock renaming).
`index_web_pages_for_search: 1` — this doctype's documents are indexed for Frappe's website/portal full-text search (a platform feature, not custom logic).

## Child Tables

- `offer_terms` (Table, options `Job Offer Term`) — identical child doctype as used by [[Job Offer]]'s `offer_terms`; see [[Job Offer Term]]. When a user selects this template on a `Job Offer` record, the Job Offer's client script (`job_offer.js`, `job_offer_term_template` field handler) copies every row from this template's `offer_terms` into the target Job Offer's `offer_terms` table (full client-side copy, clearing the target table first — see [[Job Offer]] Port Notes for the exact client logic and its lack of a server-side equivalent).

## State Machine

Not submittable; no `status`/`workflow_state` field; no custom states. Simple Draft-only master-data doctype (rows just exist, are edited, or are deleted — no docstatus lifecycle beyond Frappe's default docstatus=0 for non-submittable doctypes).

## Validation Rules (exact, in execution order)

None. The controller class body is `pass` — no `validate`, no `frappe.throw` calls, no custom methods anywhere in `job_offer_term_template.py`. The only enforced constraint is the field-level `unique: 1` on `title`, enforced generically by the Frappe framework/DB unique index — attempting to insert or rename to a `title` that already exists on another Job Offer Term Template raises a generic Frappe "already exists" / duplicate-name error (framework-level, not a custom `frappe.throw` message defined in this doctype's own source).

## Business Logic / Calculations

None.

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| (none) | Controller class body is `pass` — no method overrides at all | None |

The `.js` client script file (`job_offer_term_template.js`) contains only a commented-out `refresh` stub — no active client logic at all for this doctype itself. (The consuming logic that copies its `offer_terms` into a Job Offer lives in `job_offer.js`, documented under `Job Offer.md`.)

## Whitelisted / API Methods

None defined in `job_offer_term_template.py`.

## Permissions

| Role | Read | Write | Create | Delete | Submit | Cancel | Amend | Report | Export | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| System Manager | Yes | Yes | Yes | Yes | N/A (not submittable) | N/A | N/A | Yes | Yes | share=1, email=1, print=1 |
| HR Manager | Yes | Yes | Yes | Yes | N/A | N/A | N/A | Yes | Yes | share=1, email=1, print=1 |
| HR User | Yes | Yes | Yes | No | N/A | N/A | N/A | No | No | no delete/report/export rights; no share/email/print flags set either |

No `if_owner` or `permlevel` restrictions present in the JSON.

## Scheduled Jobs Touching This Doctype

None found in `hrms/hooks.py` `scheduler_events`.

## Port Notes

- **`autoname: "field:title"`**: the primary key of this table in a relational port should either (a) literally use `title` as the primary key/unique natural key (simplest, matches source exactly), or (b) use a surrogate id column plus a separate DB-level `UNIQUE` constraint on `title` if the target ORM strongly prefers surrogate keys — either is behaviorally equivalent as long as uniqueness-on-title and rename-cascades (see below) are preserved.
- **Rename cascade risk**: because `allow_rename: 1` and the name IS `title`, renaming a Job Offer Term Template changes its primary key. Frappe automatically updates any Link field elsewhere in the system that references the old name (e.g. `Job Offer.job_offer_term_template`) as part of its generic rename-and-relink mechanism (see [[Naming and Autoname Rules]]). A port using `title` as a literal primary key must implement equivalent cascade-on-rename (`ON UPDATE CASCADE` FK, or an application-level rename routine that walks referencing tables) to preserve this behavior; a port using a surrogate id key sidesteps this problem entirely since the FK would reference the surrogate id, not the display title.
- **No validation at all on this doctype**: unlike many master-data doctypes, there is no check preventing an empty `offer_terms` table (a template with zero terms is valid and can be linked from a Job Offer), and no check preventing duplicate `offer_term` Link values within its own `offer_terms` rows (see [[Job Offer Term]] Port Notes).
- **No server-side sync obligation**: this doctype has no outbound relationship logic of its own — it is purely a reusable named bundle of term rows that other documents (`Job Offer`) copy from at a point in time (client-side, on field change). Editing a template after it has already been copied into a Job Offer does NOT retroactively update that Job Offer's own `offer_terms` — the copy is a one-time snapshot. This must be preserved in a port: do not implement live-linking between a Job Offer's terms and its template.

## Related Doctypes

- [[Job Offer Term]] — child table (`offer_terms`) of reusable default term rows.
- [[Job Offer]] — the consumer doctype; copies this template's `offer_terms` client-side when selected.
