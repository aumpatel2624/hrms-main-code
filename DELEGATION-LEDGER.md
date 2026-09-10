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

## Summary (as of 2026-09-10, module 8 complete — both halves merged into development)

| Tool | Status | Tasks | Total tokens | Avg tokens/task |
|---|---|---|---|---|
| Claude sub-agents | Active — tier 1 | 4 done | 1,567,579 | 391.9k |
| codex | Not yet used | 0 | — | — |
| agy | Not yet used | 0 | — | — |

## Task log

| Task | Tool | Module / phase | Tokens | Tool calls | Duration | Outcome |
|---|---|---|---|---|---|---|
| Leaves module research (17 specs + scoping code) — pass 1 | Claude fork | Module 8, design research | 114,972 | 4 | 23s | **Wasted** — echoed my own orchestration context back instead of reading the files; had to be re-sent |
| Leaves module research (17 specs + scoping code) — pass 2 | Claude fork | Module 8, design research | 288,302 | 31 | 2m 31s | Delivered — grounded ADR-024's Q-4/Q-5 decisions |
| Leaves foundation — scoping, scheduler, approvers, 9 models/screens | Claude fork | Module 8, schema+API+UI+verify | 556,438 | 304 | 37m 8s | Delivered — verified independently (tests/seed/build rerun, logic spot-checked against ADR-024); one real bug found in its own new code and fixed pre-ship, one pre-existing bug found and fixed as issue #10 |
| Leaves transactional half — LeaveAdjustment/CompensatoryLeaveRequest/LeaveApplication/LeaveEncashment/LeaveBlockList/Control Panel, Q-4 wired live, generateLeaveEncashments | Claude fork | Module 8, schema+API+UI+verify (module complete) | 607,867 | 363 | 41m 50s | Delivered — verified independently (tests/seed/build rerun, ledger-split/self-approval/soft-delete-reversal logic spot-checked against ADR-024); 5 new models, sibling controller/routes file, 5 entity-config screens + 1 custom page; two real pre-existing bugs found and fixed (#12 `buildScopeFilter` APPROVER branch ignoring `approverIds`, #13 `getLeaveAllocationById`/`getLeaveApplicationById` 500ing on a populated sub-document) plus one UI permission gap (#11, `CrudForm`'s edit route unguarded) |

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
  No codex/agy comparison yet on the same task shape — module 9 is the one to route there
  deliberately for a real comparison.
- **codex**: no data yet.
- **agy**: no data yet.

*Updated after every delegated task completes — check back for fresh rows as modules 8+ progress.*
