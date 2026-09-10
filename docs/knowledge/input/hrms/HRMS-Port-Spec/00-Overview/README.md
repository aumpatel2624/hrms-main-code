# Frappe HRMS — Port Specification

This folder is an implementation-grade specification for rebuilding Frappe HRMS on a
different technology stack (any relational DB + any backend framework + any frontend).
It is written for a developer who has never seen Frappe and should not need to read
the original Python/JS source to reproduce identical behavior.

This is a different artifact from `HRMS-Obsidian-Vault` (a wiki explaining *why* the
system is shaped the way it is, for humans exploring the domain). This folder is the
opposite direction: *what exactly to build*, mechanically, to clone it.

## How To Use This Folder

1. Read `02-Cross-Cutting/` first — it explains Frappe framework mechanics (RBAC
   model, naming rules, submittable-document lifecycle, background jobs, auto-audit
   fields) that every module's spec assumes and relies on without re-explaining. Skipping
   this will make individual doctype specs look like they're missing context — they're
   not, the context is here.
2. Build in the dependency order in [[Build Order]] (`02-Cross-Cutting/Build Order.md`) — HR Setup and
   HR Core ([[Employee Core Model|Employee]]) first, since almost every other doctype foreign-keys to Employee.
3. Each module folder under `01-Modules/` has a `_Module-Spec.md` with a recommended
   relational schema shape, followed by one file per doctype with: full field table,
   state machine, exact validation rules (quoted, in order), full calculation
   algorithms as numbered pseudocode, lifecycle hooks, whitelisted API methods, and a
   full permissions table.
4. `03-API-Surface/` documents the REST/RPC contract shape a frontend needs, generically
   (Frappe auto-generates CRUD REST endpoints per doctype plus custom RPC-style
   whitelisted methods — both patterns are specified so you can implement either a
   REST or RPC equivalent).
5. `04-Data-Model/` has the full cross-module ERD-style relationship list and the
   global list of every doctype with its target table name, for schema-migration
   planning.

## Modules, in Recommended Build Order

1. **HR Setup** `01-Modules/HR-Setup/` (see `01-Modules/HR-Setup/_Module-Spec.md`) — global config, employment
   type, employee grade. Nothing else works without these existing first.
2. **HR Core** (`01-Modules/HR-Core/`) — Employee itself isn't separately specified
   here (see `02-Cross-Cutting/Employee Core Model.md` — it's core ERPNext, not an
   HRMS-authored doctype, but every module depends on it, so its full expected shape
   is specified there) plus onboarding, separation, transfer, promotion, grievance,
   training, skills, travel.
3. **Recruitment** (`01-Modules/Recruitment/`) — feeds Employee creation.
4. **Leaves** (`01-Modules/Leaves/`).
5. **Shift & Attendance** (`01-Modules/Shift-Attendance/`) — depends on Leaves for
   leave/attendance sync.
6. **Payroll** (`01-Modules/Payroll/`, includes Tax & Benefits doctypes — see note in
   that module's spec) — depends on Shift & Attendance for payable-days calculation.
7. **Performance** (`01-Modules/Performance/`).
8. **Expenses** (`01-Modules/Expenses/`).
9. **Regional** (`01-Modules/Regional/`) — implement last, as a pluggable strategy
   layer over Payroll/Gratuity, once the base calculations work correctly.

## Source of Truth

Every fact in this spec is traced to actual source in
`C:\Users\aum.patel\Desktop\Aum_Patel\hrms\hrms\`. Where source didn't support a
claim, the relevant file says so explicitly under "Port Notes" rather than guessing —
treat any such note as something to design a reasonable default for, since the
original app itself doesn't enforce it either.
