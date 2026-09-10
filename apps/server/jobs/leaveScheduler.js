/**
 * ADR-024 (Q-5): dependency-free background scheduler. AGENTS.md forbids
 * adding a dependency without asking, and the user was offline when this
 * module was designed — `node-cron` (the obvious choice) is out.
 *
 * This is explicitly a **single-process** design (docs/conventions/60-limits.md
 * already documents "single process assumed" as a starter-wide limit) — a
 * horizontally scaled deployment would double-fire jobs in the race window
 * between two processes' near-simultaneous `lastRunDate` checks. Not solved
 * here; named as the same known limitation, not a new gap. No distributed
 * lock, no leader election.
 *
 * `runDueJobs()` is called from server.js on a 5-minute `setInterval` plus
 * once ~10s after boot (so a long-stopped dev server catches up same-day
 * without waiting for the first tick). Each job runs at most once per
 * calendar day (`SchedulerRunLog.lastRunDate`, day-granularity) — a failed
 * run still counts as "attempted today" and is not retried until tomorrow;
 * that is deliberate (a permanently-broken job would otherwise hammer the
 * log every 5 minutes), not a bug.
 */
import SchedulerRunLog from "../models/SchedulerRunLog.js";
import { processExpiredAllocations } from "./processExpiredAllocations.js";
import { allocateEarnedLeaves } from "./allocateEarnedLeaves.js";

/**
 * Placeholder for the second fork — depends on `LeaveEncashment`, which
 * doesn't exist in this branch. Participates in SchedulerRunLog bookkeeping
 * like a real job so the second fork's real implementation slots into this
 * same ordered list without touching the runner itself.
 */
const generateLeaveEncashments = async () => {
  // TODO(second fork): read LeaveAllocation rows expiring yesterday whose
  // LeaveType.allowEncashment is set and draft LeaveEncashment documents.
  // No-op until LeaveEncashment exists.
};

// Fixed order (ADR-016/ADR-024) — later jobs in a run can depend on side
// effects of earlier ones in the SAME run (e.g. encashment generation would
// read allocations `processExpiredAllocations` may have just expired).
const JOBS = [
  { name: "processExpiredAllocations", fn: processExpiredAllocations },
  { name: "generateLeaveEncashments", fn: generateLeaveEncashments },
  { name: "allocateEarnedLeaves", fn: allocateEarnedLeaves },
];

const startOfDayUTC = (date = new Date()) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const isToday = (lastRunDate) => {
  if (!lastRunDate) return false;
  return startOfDayUTC(new Date(lastRunDate)).getTime() === startOfDayUTC().getTime();
};

export const runDueJobs = async () => {
  for (const { name, fn } of JOBS) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const log = await SchedulerRunLog.findOne({ jobName: name });
      if (isToday(log?.lastRunDate)) continue; // already attempted today

      const startedAt = Date.now();
      let status = "success";
      let error = null;
      try {
        // eslint-disable-next-line no-await-in-loop
        await fn();
      } catch (jobError) {
        status = "failed";
        error = jobError?.message || String(jobError);
        console.error(`leaveScheduler: job "${name}" failed:`, jobError);
      }

      // eslint-disable-next-line no-await-in-loop
      await SchedulerRunLog.findOneAndUpdate(
        { jobName: name },
        {
          jobName: name,
          lastRunDate: startOfDayUTC(),
          lastStatus: status,
          lastError: error,
          lastDurationMs: Date.now() - startedAt,
          isActive: true,
        },
        { upsert: true, setDefaultsOnInsert: true },
      );
      // A failed job does not block the next one — per-job isolation,
      // mirroring source's per-employee savepoint isolation at job
      // granularity instead.
    } catch (outerError) {
      // SchedulerRunLog itself is unreachable (e.g. DB hiccup) — log and
      // move on to the next job rather than crashing the interval.
      console.error(`leaveScheduler: bookkeeping failed for job "${name}":`, outerError);
    }
  }
};
