---
type: reference
tags: [hrms, glossary]
---

# Glossary

- **Doctype** — Frappe's term for a data model/table definition; each `.json` in
  `hrms/<module>/doctype/<name>/` defines one, paired with a `.py` controller for
  business logic and often a `.js` for client-side form behavior.
- **Single doctype** — a doctype with exactly one document, used for global settings
  (e.g. [[HR Settings]], [[Payroll Settings]]).
- **Child table** — a doctype embedded inside a parent document's grid field (e.g.
  [[Salary Detail]] rows inside [[Salary Structure]]); has no independent list view
  and inherits its parent's permissions.
- **doc_events** — the `hrms/hooks.py` mapping of `{Doctype: {event: function}}` that
  wires cross-doctype logic (e.g. Journal Entry's submit updating [[Expense Claim]]
  payment status) without editing the target doctype's own controller.
- **Scheduler events** — recurring background jobs (`hourly`, `daily`, `daily_long`,
  etc. in `hrms/hooks.py`) that run scheduled logic like auto-attendance marking or
  leave allocation expiry, independent of any user action.
- **allow_regional** — an ERPNext/Frappe decorator pattern letting a core function
  (e.g. HRA exemption calculation) be silently replaced by a country-specific
  implementation registered in `hooks.py`'s `regional_overrides` map, without changing
  the calling code.
- **Workflow state** — for submittable doctypes, the Draft → Submitted → Cancelled
  lifecycle Frappe enforces natively; some doctypes layer an additional custom status
  field (e.g. [[Leave Application]]'s Open/Approved/Rejected) on top of this.
- **Link field** — a foreign-key-style field pointing at another doctype's document by
  name; the basis for most "Relationships" sections throughout this vault.
- **Table field** — a child-table Link, holding many rows of a child doctype.
- **Scoped-by-relationship role** — see [[Roles Overview]]: a role (like
  [[Leave Approver]]) that only grants rights on records where the user is also named
  in a specific field on the related record.

See also: [[Roles Overview]], [[Doctype Index]].
