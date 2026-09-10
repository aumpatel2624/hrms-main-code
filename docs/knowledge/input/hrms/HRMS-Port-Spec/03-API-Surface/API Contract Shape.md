# API Contract Shape

Frappe exposes two overlapping API patterns. A port needs an equivalent of both,
since the frontend (`frontend/` Vue app) and print/report tooling use whichever fits.

## Pattern 1 — Auto-Generated REST CRUD (per doctype, zero extra code)

For every doctype, Frappe auto-exposes:

```
GET    /api/resource/<Doctype>              -> list (supports filters, fields, limit, order_by via query params)
GET    /api/resource/<Doctype>/<name>       -> get one document (with all child tables inlined)
POST   /api/resource/<Doctype>              -> create (docstatus starts at 0)
PUT    /api/resource/<Doctype>/<name>       -> update (blocked on Submitted docs except allow-on-submit fields)
DELETE /api/resource/<Doctype>/<name>       -> delete (blocked unless docstatus = 0)
```

Plus method-style actions for the submit lifecycle, since submit/cancel aren't plain
field updates:

```
POST /api/method/frappe.client.submit          {doc: {...}}
POST /api/method/frappe.model.workflow.apply_workflow   {doctype, name, action}  (if workflow states are used)
```

**Port equivalent:** a generic REST controller generated/derived from your schema
metadata (doctype definitions), not hand-written per entity — list/get/create/update/
delete behavior should be IDENTICAL across all ~150 entities, differing only in which
table and which permission/validation rules apply. Add explicit `submit`/`cancel`
actions as separate endpoints (`POST /resource/<Doctype>/<name>/submit`, `/cancel`)
that run through the full validate-then-transition-then-fire-hooks pipeline in
`Submittable Document Lifecycle.md`.

Every list/get call must pass through the row-filter function from
`Permission Model (RBAC).md` before returning data — this is what makes "My Leaves"
vs "Team Leaves" work: it's the SAME endpoint, different effective filter based on
caller identity + role, not two different endpoints.

## Pattern 2 — Whitelisted RPC-Style Methods (per-doctype custom actions)

196 methods across this app are decorated `@frappe.whitelist()` on doctype
controllers or module-level files — these are actions that don't fit CRUD (compute
something, trigger a multi-step process, return a custom-shaped response). Called as:

```
POST /api/method/<dotted.python.path.to.function>   {arg1: ..., arg2: ...}
```

Each doctype's own spec file under `01-Modules/` documents its whitelisted methods in
a `## Whitelisted / API Methods` table (method name, args, return shape, what it
does) — treat each one as a distinct RPC endpoint in your port
(`POST /api/<doctype-kebab>/<method-name>` or similar convention), not as a REST
resource.

## App-Level (Non-Doctype) Endpoints

`hrms/api/` holds endpoints that aren't tied to any single doctype:

| File | Function | Purpose |
|---|---|---|
| `hrms/api/roster.py` | `get_default_company`, `get_events`, `get_schedule_from_assignment`, `create_shift_schedule_assignment`, `delete_shift_schedule_assignment`, `swap_shift`, `break_shift`, `insert_shift` | Backs the standalone Roster planning app (`/hr` route) — a calendar-style shift-planning UI. `get_events` aggregates holidays + leaves + shifts into one calendar feed (internal helpers `get_holidays`, `get_leaves`, `get_shifts`, `group_by_employee` are not whitelisted themselves, called internally by `get_events`). `swap_shift`/`break_shift`/`insert_shift` are direct shift-editing actions from the roster calendar UI. |
| `hrms/api/system_settings.py` | `get_user_pass_login_disabled` (`allow_guest=True`) | Lets the login screen check, before authentication, whether username/password login is disabled in favor of SSO only. |
| `hrms/api/oauth.py` | `oauth_providers` (`allow_guest=True`) | Lets the login screen list available SSO providers before authentication. |

**Port equivalent:** a small set of app-level (not entity-scoped) endpoints for
calendar aggregation and login-screen configuration, callable without
authentication only for the two `allow_guest=True` cases above — every other endpoint
in this app requires an authenticated session.

## Public (No-Auth) Surface

`GET /jobs` and its supporting AJAX calls (`hrms/www/jobs/index.py`) — the public job
board. See `01-Modules/Recruitment/_Module-Spec.md` for exactly what fields of
[[Job Opening]] are exposed publicly (this must NOT leak internal-only fields like
salary band or internal notes — check that file's Port Notes for the exact field
allowlist used).

## Realtime

`hrms.overrides.employee_master.publish_update` uses Frappe's built-in
Socket.IO-based realtime publish (`frappe.publish_realtime`) to push live updates to
open UIs when an Employee record changes. **Port equivalent:** a WebSocket/SSE channel
your frontend subscribes to per-relevant-record, with the backend publishing an event
on the same triggers (Employee on_update, after_delete) — needed if your port wants
the same "live updates without a manual refresh" UX; otherwise this can be safely
skipped as a nice-to-have.
