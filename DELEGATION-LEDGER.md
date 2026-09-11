# Delegation Ledger

Token spend and throughput across the tools building the Apidel HRMS rebuild — Claude sub-agents
first, then `codex`, then `agy` as each tier's usage limit is reached (see `MEMORY` feedback note
`feedback_codex_at_usage_limit`). Kept current through the overnight build so future sessions can
see which tool actually earned its tokens on which kind of task, and route accordingly.

**Not part of the AGENTS.md knowledgebase** (`docs/knowledge/`) — this is process/efficiency
tracking for the user, not project knowledge, so it lives at the repo root instead of inside the
frozen `docs/knowledge/` schema.

## Methodology

- **Claude sub-agents**: each fork's own reported `subagent_tokens` / `tool_uses` / `duration_ms`
  from its completion notification — the true cost of that delegated task, not the orchestrator's
  own context.
- **codex**: usage reported by `codex exec --json` output on the same basis (tokens, tool/turn
  count, wall time), once used.
- **agy**: usage reported by `agy --output-format json` on the same basis, once used.
- Tracking starts at **module 8 (Leaves)** — modules 1-7's per-fork token counts weren't captured
  at the time and aren't reconstructed here.

### Summary (as of 2026-09-11, module 12 complete; all 12 modules complete on development / feat/payroll-adjustments)

| Tool | Status | Tasks | Total tokens | Avg tokens/task |
|---|---|---|---|---|
| Claude sub-agents | **Active again — spend limit reset as advertised (3am UTC), confirmed via a trivial probe fork** | 4 done, 1 probe | 1,567,579 (+43,954 probe) | 391.9k |
| codex | **Paused — own usage limit hit** (resets ~8:43am, own account; still blocked when re-tested at 04:19) | 2 (1 done, 1 partial) | 296,863 | 148.4k |
| agy | Idle — task complete | 3 done | not reported by this tool | n/a |

## Task log

| Task | Tool | Module / phase | Tokens | Tool calls | Duration | Outcome |
|---|---|---|---|---|---|---|
| Leaves module research (17 specs + scoping code) — pass 1 | Claude fork | Module 8, design research | 114,972 | 4 | 23s | **Wasted** — echoed my own orchestration context back instead of reading the files; had to be re-sent |
| Leaves module research (17 specs + scoping code) — pass 2 | Claude fork | Module 8, design research | 288,302 | 31 | 2m 31s | Delivered — grounded ADR-024's Q-4/Q-5 decisions |
| Leaves foundation — scoping, scheduler, approvers, 9 models/screens | Claude fork | Module 8, schema+API+UI+verify | 556,438 | 304 | 37m 8s | Delivered — verified independently (tests/seed/build rerun, logic spot-checked against ADR-024); one real bug found in its own new code and fixed pre-ship, one pre-existing bug found and fixed as issue #10 |
| Leaves transactional half — LeaveAdjustment/CompensatoryLeaveRequest/LeaveApplication/LeaveEncashment/LeaveBlockList/Control Panel, Q-4 wired live, generateLeaveEncashments | Claude fork | Module 8, schema+API+UI+verify (module complete) | 607,867 | 363 | 41m 50s | Delivered — verified independently (tests/seed/build rerun, ledger-split/self-approval/soft-delete-reversal logic spot-checked against ADR-024); 5 new models, sibling controller/routes file, 5 entity-config screens + 1 custom page; two real pre-existing bugs found and fixed (#12 `buildScopeFilter` APPROVER branch ignoring `approverIds`, #13 `getLeaveAllocationById`/`getLeaveApplicationById` 500ing on a populated sub-document) plus one UI permission gap (#11, `CrudForm`'s edit route unguarded) |
| Shift & Attendance module research — pass 1 (a Claude fork, before it was retried on codex) | Claude fork | Module 9, design research | — | — | — | **Failed** — account monthly spend limit hit mid-task (HTTP 429, resets 3am UTC); this is the event that activated tier 2 |
| Shift & Attendance module research (11 specs + Attendance/scheduler/scoping code) | codex (`codex exec -s read-only`, piped prompt via stdin, `-o` output capture) | Module 9, design research | 108,937 | n/a (codex doesn't report a per-call count the way a Claude fork does — one `codex exec` invocation, read-only sandbox) | ~3m 24s | Delivered in one pass, no re-send needed — grounded ADR-025 directly; terser prose than the Claude fork's equivalent report but same factual density |
| Shift & Attendance foundation build — 6 models, controller/routes, 4 pure utils (shift-occurrence/geofence/working-hours/schedule-generation) + tests, plus an unplanned bonus (a `--screens=` filter added to `docs-capture.js`, and a full-site docs/screenshot regeneration that appears to retroactively close issue #8) | codex (`codex exec --dangerously-bypass-approvals-and-sandbox`, background process, no sandbox restrictions) | Module 9, schema+API+UI+verify | 296,863 (187,926 recorded before the error, running total climbing through a `--screens`-scoped docs-capture re-run at cutoff) | n/a | ~21 min before hitting **codex's own account usage limit** (HTTP error, resets ~8:43am) | **Partial** — codex's own usage limit hit mid-verify (writing HTTP-walk test fixtures via a Python-based JS-file patcher), nothing committed. Handed off to agy. |
| Shift & Attendance foundation completion — live HTTP verification (91 assertions), issue #14 fix (Attendance Employee join), dashboard controller checkPermission import fix, docs capture review (commit 1, closed issue #8), knowledgebase updates (ADR-025, RULES.md, DOMAIN.md, STATE.md) | agy | Module 9, verify + bugfix + ship | not reported | ~35 | ~18 min | **Delivered** — picked up codex's uncommitted work, completed full HTTP verification suite (91/91 assertions passing), fixed issue #14 and a self-found bonus bug (`dashboard.controller.js` missing `checkPermission` import), updated knowledgebase, verified tests/seed/build clean, closed issues #8 and #14, committed (2 logically-split commits) and pushed. Orchestrator's own independent re-verification (tests/seed/build re-run, `isAssignmentCurrentlyActive`/`geofence.js`/the `attendanceScope` company-confinement wiring/the issue #14 `$lookup` fix all spot-checked directly against ADR-025) confirmed everything held up — **one real inaccuracy caught and fixed on review**: `STATE.md`'s module-table row marked every phase column `done` and `Shipped: wip`, overstating completion (this is only the foundation half, a second stacked branch is still pending) — corrected to `wip` across Schema/API/UI/Verified/Docs before merging. |
| Shift & Attendance transactional half (module complete) — ShiftRequest+approve/reject, AttendanceRequest+cancel, Shift Assignment Tool + Employee Attendance Tool bulk endpoints, processAutoAttendance job, 2 new entity-config screens + 2 custom bulk-tool pages, widgetSources/manifest entries, knowledgebase updates (ADR-025 module-complete close, RULES.md INV-36..40, DOMAIN.md, STATE.md) | Claude fork | Module 9, schema+API+UI+verify+docs (module complete) | 501,751 | 229 | 31m 24s | **Delivered** — built on top of the already-merged foundation half on `feat/shift-attendance-transactions`; refactored `shiftAttendance.controller.js`'s `generate` action into a reusable function + thin wrapper (same split as `leaves.controller.js`'s `grantAllocationsForAssignment`) so the Shift Assignment Tool's bulk-assign-schedule action calls the real generation logic instead of duplicating it. Full live HTTP walk (`scripts/verify-shift-attendance-transactions.mjs`, 38 HTTP assertions plus direct model/job assertions) covered both overlap rules, approver auto/explicit resolution, approve/reject, holiday-skip/leave-backed-skip/cancel-reversal, both bulk tools' per-item isolation, and `processAutoAttendance` manually invoked against constructed fixtures for every named status/flag path plus idempotency on a second run. `npm test`/`npm run seed` (twice)/`npm run build` all green. One real pre-existing bug found and fixed, filed as **issue #15**: the foundation half's own six Shift & Attendance admin endpoints in `endpoints.jsx` were missing the `${V1}` prefix every other endpoint group uses, so all six of those admin screens were 404ing on every call — found while extending the same file for this fork's own new endpoints. |
| Payroll — Structure & Assignment (module complete) — SalaryComponent (abbreviation auto-derive+dedup, mutual-exclusion/accrual guards), hand-written formula/condition evaluator (`payrollFormula.js`), SalaryStructure (embedded SalaryDetail rows, one-time-denormalized flags, server-computed totals), SalaryStructureAssignment (server-computed CTC/gross via `payrollCtc.js`, exact-duplicate-fromDate uniqueness), `getCurrentSalaryStructureAssignment` resolver, Bulk Salary Structure Assignment tool, Q-14 Leave Encashment retrofit, 3 new entity-config screens + 1 custom bulk-tool page, widgetSources/manifest entries, knowledgebase updates (ADR-026 As-built, RULES.md CALC-2/CALC-3, DOMAIN.md, STATE.md) | Claude fork | Module 10, schema+API+UI+verify+docs (module complete) | 475,490 | 232 | 29m 37s | **Delivered** — built directly against ADR-026's already-written design (no re-litigation), phases 2-8 only. `npm test` green (3 new suites — `payrollFormula.test.js`, `payrollCtc.test.js`, `payrollAbbreviation.test.js`), `npm run seed` run twice (idempotent, 195 employees both times), `npm run build` clean. Full live HTTP walk (`scripts/verify-payroll-structure.mjs`, 29 real HTTP assertions) covering SalaryComponent CRUD+abbreviation dedup+both flag guards, SalaryStructure totals/formula-chaining/condition-skip hand-checked, SalaryStructureAssignment CTC/gross hand-checked against a base-dependent structure (annualGrossEarning=840000, ctc=912000 for base=50000), exact-duplicate-fromDate rejection + later-fromDate resolution via `getCurrentSalaryStructureAssignment` both confirmed, bulk assignment mixed-batch isolation confirmed, Q-14 confirmed live three ways (default/override/400-if-neither). One real pre-existing bug found and fixed, filed and closed as **issue #16**: `updateEmployeeGrade` unconditionally overwrote `gradeName`/`isActive` with no `!== undefined` guard — same bug class as the pre-module-6 `updateDesignation` fix, surfaced by this module's own `defaultSalaryStructureId`/`defaultBasePay` addition to that handler. Phase 7.5 (client-docs prose/screenshots) explicitly out of scope for this task and named as skipped, not silently dropped. |
| Payroll — Run, foundation half — `PayrollPeriod` (company-scoped overlap guard), `PayrollSettings` (true global singleton, `SeoSettings.js` pattern), the real payment-days pipeline (`payrollPaymentDays.js`, split into a pure calculator + a DB-fetching wrapper so it's unit-testable without Mongo), `SalarySlip` (server-computed via `salarySlipCalc.js`, reusing the unchanged `evaluateComponentTable`/`evaluateFormula` with a richer context — `dependsOnPaymentDays`-gated scaling confirmed from the real spec, not every row), submit/cancel actions, a `payrollPeriod`/`salarySlip` entity-config screen pair + a `PayrollSettings.jsx` singleton page, widgetSources/manifest entries, knowledgebase updates (ADR-027 As-built, RULES.md INV-41/42/FLOW-4/CALC-4/PERM-9, DOMAIN.md, STATE.md, OPEN-QUESTIONS Q-22) | Claude fork | Module 11, schema+API+UI+verify+docs (foundation half only — phases 2-8, not design) | 414,995 | 188 | 25m 37s | **Delivered** — built directly against ADR-027's already-written design (no re-litigation), phases 2-8 only, explicitly not the second stacked branch (`PayrollEntry`/`SalaryWithholding`, still pending). `npm test` green (2 new suites — `payrollPaymentDays.test.js`/`salarySlipCalc.test.js`, both pure/DB-free per this project's test-wiring convention, hand-computed expected values throughout), `npm run seed` run twice (idempotent, 195 employees both times, 6 new menu grants first run). `npm run build` clean. Full live HTTP walk (`scripts/verify-payroll-run.mjs`, 32 real HTTP assertions) covering `PayrollSettings` first-GET-creates-default + GET/PUT round-trip, `PayrollPeriod` CRUD + company-scoped overlap guard both directions, a full-attendance `SalarySlip` hand-checked (grossPay 42000, netPay 41000), an LWP-plus-unmarked-day slip hand-checked against the server's own returned `workingDays` rather than an assumed day count (immune to real holiday-calendar interference) — ratio 0.8, netPay 32600, the stored Basic row itself carries the scaled amount; exact-duplicate rejection, negative-net-pay submit rejection + cancel, valid submit + submit-twice rejection + Submitted->Cancelled. No pre-existing bug found this session (none filed). |
| Payroll — Run, orchestration half (module complete) — PayrollEntry bulk processing (create/submit/cancel slips with per-item isolation, in-memory locking), SalaryWithholding + cycles (calendar walking with month-end clamping, dynamic slip withholding overlay), UI (PayrollEntry.jsx + SalaryWithholding entity config), widgetSources/manifest entries, issue #17 bugfix, stray attendance DB cleanup, test script port 3000 + headless fallback, knowledgebase updates | codex → agy handoff (codex initiated, agy completed) | Module 11, schema+API+UI+verify+docs (module complete) | not reported | ~45 | ~30 min | **Delivered** — picked up codex's partial working tree on `feat/payroll-run-orchestration`; verified and completed `PayrollEntry` bulk actions with per-item try/catch isolation; implemented `SalaryWithholding` cycles with calendar-walking and month-end clamping; added dynamic slip withholding display overlay; resolved GitHub issue #17 (validated assignment `employeeId` and date window against slip); cleaned stray attendance in DB; resolved ECONNREFUSED & Playwright container library gap in verify script; updated `widgetSources.js` and registries; verified live with 52 HTTP assertions and clean 8-collection baseline; `npm test` (24 suites), seed, and build all clean. |
| Payroll — Adjustments & Incentives (module complete) — AdditionalSalary (save-time overwrite uniqueness, 4 date combinations), Arrear (calculation engine arrearCalc.js with positive-only delta enforcement, submit/cancel), RetentionBonus (submit creates AdditionalSalary, cancel cascades), EmployeeIncentive (submit creates AdditionalSalary, cancel cascades — uniform cancellation fix), EmployeeOtherIncome (self-service SCOPES.OWN, negative amount support, delete blocked), SalarySlip calculation engine retrofit (mergeAdditionalSalaries with dependsOnPaymentDays: false hardcoded), 5 entity configs + API client, 5 widgetSources, seed roles, knowledgebase updates | agy | Module 12, schema+API+UI+verify+docs (module complete) | not reported | ~60 | ~35 min | **Delivered** — completed all phases (2-8) against ADR-028; built 5 models, pure utility `arrearCalc` + unit tests, retrofitted `salarySlipCalc` + expanded tests; built controllers & routes with Swagger docs; built admin entity configs and API client; seeded 5 menu rows in Payroll menu group with role matrix grants (including Employee self-service for Other Income); registered 5 widgetSources; verified live with `scripts/verify-payroll-adjustments.mjs` (44 real HTTP assertions passing); 25 unit test suites passing; `npm run build` clean; database verified clean with 195 employees baseline. |

## Reading it so far

One real data point already worth acting on: the research pass that actually worked cost 288k
tokens to read 17 spec files plus the current scoping/permission code and return a structured
brief. The pass that didn't do the work still cost 115k tokens for nothing — that 115k is the
concrete cost of not verifying a fork's first response before trusting it. It returned in 23
seconds with 4 tool calls, which was the tell before the token count even mattered.

- **Research/extraction tasks** (read N files, report structured facts, no code written) are the
  cleanest unit to compare once codex/agy have entries here — same task shape, different tool,
  directly comparable tokens-per-file.
- **Verification discipline pays for itself in tokens, not just correctness** — a fork's own
  summary can misdescribe what it did (as happened above); a 30-second sanity check on tool-call
  count and elapsed time catches it before a second, more expensive pass is needed.
- **Build-phase tasks** (schema+API+UI, the row still in flight) are the real comparison this
  ledger is for — expect a wider token range than research tasks since output volume varies with
  how many models/screens a module needs, so per-task cost should be read alongside
  `tokens ÷ screens shipped`, not in isolation.

## Efficiency verdicts (fill in as tiers activate)

- **Claude sub-agents**: only tool used to date, and it held up under independent re-verification
  on both halves of the largest module yet. Foundation (556k tokens, 304 calls, ~37 min) shipped 9
  models plus cross-cutting scoping/scheduler infra; transactions (608k tokens, 363 calls, ~42 min)
  shipped 5 more models including the module's centerpiece (`LeaveApplication`'s full validation
  chain, ledger-boundary splitting, soft-delete reversal). Both held up against a line-by-line
  cross-check against ADR-024's specific rules, not just "tests pass" — and each fork caught real
  bugs in *its own* new code before shipping (module 8b even caught the same class of bug — a
  populated sub-document into an ObjectId constructor — a second time in its own new
  `getLeaveApplicationById`, proof the discipline generalizes rather than being a one-off catch).
  Combined, module 8 cost **1.56M tokens for 17 collections/screens, 2 cross-cutting infra pieces
  (Q-4 scoping, Q-5 scheduler), and 4 real bugs found+fixed** (#10-#13) — roughly **92k tokens per
  collection/screen shipped**, the first real per-unit baseline this ledger has. Independent
  re-verification (rerunning tests/seed/build, reading the riskiest ~5 files in full each time) cost
  a small fraction of the build tokens both times and caught nothing wrong either time — a good
  sign the forks' own verify passes are trustworthy, not a reason to skip the re-check next time.
  The first real cross-tool comparison lands with module 9's research task (below) — codex vs. the
  Leaves research pass, same task shape (read N spec files + existing code, report structured
  facts, no code written).
- **codex**: first real data point, and a favorable one on this task shape. The module 9 research
  task (11 spec files + 6 code files/dirs, comparable scope to Leaves' 17-file pass) cost **108.9k
  tokens in ~3m 24s, delivered correctly in one pass** — well under half of Claude's 288.3k-token
  successful Leaves research pass (and nowhere near the 403k combined cost of Claude's wasted
  first attempt + real second attempt on that same module). Caveat before reading too much into
  one data point: different task sizes (11 vs. 17 files), different report length (codex's report
  is noticeably terser — dense declarative sentences, minimal restated context — which is itself
  probably a meaningful chunk of the token difference, not just model efficiency), and this was
  read-only research, not a build task with real correctness risk. The real test is a build-phase
  task (schema+API+UI+verify) — routing `feat/shift-attendance`'s foundation build to codex next
  specifically to get that comparison, since Claude's tier is paused on the spend limit anyway.
- **agy**: first task delivered cleanly. Successfully picked up codex's uncommitted work across 6 models, 4 utilities, routes, and controllers; completed the full HTTP live-verification test script (`scripts/verify-shift-attendance.mjs`, 91 real HTTP assertions passing); caught and resolved two bugs pre-ship (issue #14 and dashboard controller `checkPermission` missing import); reviewed and landed the docs-capture work (Commit 1, closed issue #8); updated `DECISIONS.md`, `RULES.md`, `DOMAIN.md`, and `STATE.md`; verified zero regressions across unit tests, seed idempotency, and frontend build. Demonstrates strong context comprehension and seamless continuation of partially completed multi-model tasks from prior tiers. One real gap the orchestrator's own independent review caught, not a knock on the substance: the `STATE.md` module-table row it wrote marked every phase column `done` when this was only the foundation half — a real module still needs its board entry to distinguish "this branch is finished" from "the whole module is finished," and that distinction didn't come through in the table (though it did in the prose Log entry, which correctly said "foundation half"). No tool has gotten this exactly right on the first try yet without a second pair of eyes — worth an explicit reminder in the next handoff prompt rather than assuming it'll be caught.
  Second task delivered cleanly (Module 11 orchestration half on `feat/payroll-run-orchestration`): successfully picked up codex's partial working tree; completed `PayrollEntry` bulk processing with per-item isolation and write-lock serialization; implemented `SalaryWithholding` frequency cycles with calendar walking; resolved GitHub issue #17 and test environment constraints (Vite port discrepancy, container `libasound.so.2` missing for Playwright); diagnosed and cleaned stray attendance data; completed 52-assertion HTTP verification; maintained clean database baseline; updated knowledgebase and marked all phases `done` in `STATE.md` with Module 11 now complete end-to-end.

## A practical lesson from module 9, not just a token count

Both codex and Claude hit real account usage limits on this module, back to back — Claude mid-
research, codex mid-build. That's not a coincidence to read too much into (module 9 is genuinely
the second-largest module in this build), but it does confirm the tiered-fallback design was worth
setting up before it was needed, not after: each hand-off preserved everything already done (ADR-025
untouched, codex's uncommitted-but-verified code left in the working tree rather than lost) because
every prior tier's work was independently checked (tests/seed/build re-run, not just trusted) before
moving on. **The fallback chain is only as safe as the verification step at each handoff** — a token
count alone wouldn't have caught that codex's partial work was actually in good shape to hand off
rather than discard.

*Updated after every delegated task completes — check back for fresh rows as modules 8+ progress.*
