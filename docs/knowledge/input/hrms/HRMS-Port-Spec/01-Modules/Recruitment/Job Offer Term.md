# Job Offer Term

**Source:** `hrms/hr/doctype/job_offer_term/job_offer_term.json`, `job_offer_term.py`
**Submittable:** no   **Tree:** no   **Naming:** child table row — standard Frappe auto-generated row `name` (hash), no `autoname` rule defined (child tables use `istable: 1` and are named via internal row idx/hash, not a business-meaningful autoname)
**Module:** HR (Recruitment)

This is a child-table-only doctype (`istable: 1`) — it has no standalone list view, no permissions of its own, and is always owned by a parent document ([[Job Offer]]'s `offer_terms` or [[Job Offer Term Template]]'s `offer_terms`).

## Schema

| Field (fieldname) | Label | Type | Options/Link Target | Required | Default | Read-Only | Notes |
|---|---|---|---|---|---|---|---|
| offer_term | Offer Term | Link | Offer Term | Yes | — | No | in list view (grid column) |
| column_break_2 | — | Column Break | — | — | — | — | layout only |
| value | Value / Description | Small Text | — | Yes | — | No | in list view (grid column) |

Field order per JSON `field_order`: offer_term, column_break_2, value.

Standard child-row system fields implied by Frappe (not in the custom `fields` array, but present on every child doctype and referenced in the auto-generated type stub): `parent` (Data — parent document's name), `parentfield` (Data — the fieldname on the parent doc this row belongs to, i.e. `offer_terms`), `parenttype` (Data — `"Job Offer"` or `"Job Offer Term Template"` depending on owner), plus the implicit `idx` (row order integer) and `name` (row's own unique id). A port must model these as real columns on the child table (parent_id FK, parent_type discriminator, parent_field discriminator, sort/idx integer) since the target stack won't get them "for free."

`editable_grid: 1` at the doctype level means this child table is editable inline in a spreadsheet-like grid in the Frappe desk UI — a pure UI/UX detail with no server-side behavioral implication.

## Child Tables

N/A — this doctype IS a child table; it does not itself contain any Table fields.

## State Machine

Not submittable; no `status`/`workflow_state` field. Rows are created/updated/deleted purely as part of saving their parent document ([[Job Offer]] or [[Job Offer Term Template]]).

## Validation Rules (exact, in execution order)

None. The controller class body is `pass` — no `validate`, no custom methods, no `frappe.throw` calls anywhere in `job_offer_term.py`. Only the two `reqd: 1` field-level constraints (`offer_term`, `value`) apply, enforced generically by the Frappe framework's mandatory-field check on the parent document's save (both fields must be non-empty on every row).

## Business Logic / Calculations

None.

## Lifecycle Hooks (exact)

| Event | What Runs | Side Effects on Other Doctypes |
|---|---|---|
| (none) | Controller class body is `pass` — no method overrides at all | None |

## Whitelisted / API Methods

None defined in `job_offer_term.py`.

## Permissions

`"permissions": []` in the JSON — empty array. Child-table doctypes do not carry their own permission rules; access is governed entirely by the parent document's permissions ([[Job Offer]] or [[Job Offer Term Template]]). A port should NOT create independent ACL rows for this table — enforce access at the parent-document level only. See [[Permission Model (RBAC)]].

## Scheduled Jobs Touching This Doctype

None found.

## Port Notes

- This is a pure "owned rows" child table with zero business logic of its own — in a relational port, model it as a table with a foreign key to whichever parent owns it, and (since Frappe child tables are polymorphic — the same child doctype can be embedded in more than one parent doctype) either:
  (a) a single `job_offer_term` table with both a nullable `job_offer_id` FK and a nullable `job_offer_term_template_id` FK (exactly one populated per row), or
  (b) two separate join tables (`job_offer_terms`, `job_offer_term_template_terms`) if the target ORM strongly prefers non-polymorphic FKs.
  Reproduce Frappe's `parenttype` discriminator behavior via option (a)'s two-nullable-FK approach, or an explicit `parent_type` enum column, if a single shared table is preferred.
- `idx` (row order) must be preserved and is significant for display order — Frappe child tables are ordered lists, not unordered sets; the "Terms" grid renders rows top-to-bottom in `idx` order.
- No `track_changes` flag applies to child tables individually — any audit trail is inherited from the parent document's own `track_changes` setting (which is not enabled for `Job Offer` per its JSON, and not set for `Job Offer Term Template` either).
- Because both `offer_term` and `value` are `reqd: 1`, and there is no controller-level validation beyond that, a port only needs to enforce "both columns NOT NULL / non-empty" at the database or application-input-validation layer — there is no cross-field or cross-row uniqueness constraint (e.g., the same `offer_term` Link could legitimately appear more than once in the same parent's table; nothing in source prevents duplicate `offer_term` rows within one Job Offer or one Job Offer Term Template).

## Related Doctypes

- [[Job Offer]] — one of the two parents that own rows of this child table.
- [[Job Offer Term Template]] — the other parent; a reusable bundle of default term rows copied into a Job Offer client-side.
