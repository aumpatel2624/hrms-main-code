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
import LeaveAllocation from "../models/LeaveAllocation.js";
import LeaveType from "../models/LeaveType.js";
import LeaveEncashment from "../models/LeaveEncashment.js";
import LeaveLedgerEntry from "../models/LeaveLedgerEntry.js";
import { getLeaveBalance } from "../utils/leaveBalance.js";
import { processExpiredAllocations } from "./processExpiredAllocations.js";
import { allocateEarnedLeaves } from "./allocateEarnedLeaves.js";

/**
 * ADR-024 (module complete, second fork). Idiomatic-rebuild version of
 * source's `generate_leave_encashment` (`Leave Encashment.md` Scheduled
 * Jobs): for every `LeaveType.allowEncashment` type, finds `LeaveAllocation`
 * rows whose `toDate` was yesterday and drafts a `LeaveEncashment` for each,
 * skipping employees who already have one for that allocation (idempotent
 * across runs, mirroring the job's own daily-once bookkeeping in
 * `runDueJobs`).
 *
 * **Ordering matters here** (see the file-level comment on `JOBS` below):
 * this runs AFTER `processExpiredAllocations` in the same pass, so an
 * allocation whose `toDate` was yesterday has already been flipped from
 * `active` to `expired` by the time this queries — matched on `status:
 * "expired"`, not `"active"`.
 *
 * Source's `create_leave_encashment` skips an allocation entirely when no
 * Salary Structure Assignment exists to derive a per-day rate from — this
 * project has no Payroll module yet (same gap as the manual create
 * endpoint), so every drafted row instead gets `perDayEncashmentAmount: 0`
 * and is left `pending` for HR to fill in the real rate before marking it
 * paid, rather than being silently skipped. The ledger debit is written
 * immediately, exactly like a manually-created encashment (ADR-024's
 * "create is the action" precedent) — so the balance reflects the draft
 * right away; HR correcting `perDayEncashmentAmount` later only changes the
 * money, never the days already debited.
 *
 * Per-item failure isolation, matching `processExpiredAllocations`/
 * `allocateEarnedLeaves`'s own pattern — one allocation's failure doesn't
 * block the rest.
 */
export const generateLeaveEncashments = async () => {
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const startOfYesterday = new Date(Date.UTC(yesterday.getUTCFullYear(), yesterday.getUTCMonth(), yesterday.getUTCDate()));
  const endOfYesterday = new Date(startOfYesterday.getTime() + 24 * 60 * 60 * 1000 - 1);

  const encashableTypes = await LeaveType.find({ allowEncashment: true }).lean();
  if (encashableTypes.length === 0) return { attempted: 0, created: 0, skipped: 0, failed: 0 };
  const leaveTypeById = new Map(encashableTypes.map((lt) => [String(lt._id), lt]));

  const allocations = await LeaveAllocation.find({
    status: "expired",
    leaveTypeId: { $in: encashableTypes.map((lt) => lt._id) },
    toDate: { $gte: startOfYesterday, $lte: endOfYesterday },
  });

  let attempted = 0;
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const allocation of allocations) {
    attempted += 1;
    try {
      // eslint-disable-next-line no-await-in-loop
      const existing = await LeaveEncashment.findOne({ leaveAllocationId: allocation._id });
      if (existing) { skipped += 1; continue; } // eslint-disable-line no-continue

      const leaveType = leaveTypeById.get(String(allocation.leaveTypeId));
      // eslint-disable-next-line no-await-in-loop
      const leaveBalance = await getLeaveBalance(allocation.employeeId, allocation.leaveTypeId, allocation.toDate);

      let actualEncashableDays = Math.max(leaveBalance, 0);
      if (leaveType.nonEncashableLeaves) actualEncashableDays = Math.max(actualEncashableDays - leaveType.nonEncashableLeaves, 0);
      if (leaveType.maxEncashableLeaves) actualEncashableDays = Math.min(actualEncashableDays, leaveType.maxEncashableLeaves);

      if (actualEncashableDays <= 0) { skipped += 1; continue; } // eslint-disable-line no-continue

      // eslint-disable-next-line no-await-in-loop
      const doc = await LeaveEncashment.create({
        employeeId: allocation.employeeId,
        leaveTypeId: allocation.leaveTypeId,
        leaveAllocationId: allocation._id,
        leavePeriodId: allocation.leavePeriodId || null,
        companyId: allocation.companyId,
        encashmentDate: allocation.toDate,
        leaveBalance,
        actualEncashableDays,
        encashmentDays: actualEncashableDays,
        perDayEncashmentAmount: 0,
        encashmentAmount: 0,
      });

      // eslint-disable-next-line no-await-in-loop
      await LeaveLedgerEntry.create({
        employeeId: allocation.employeeId,
        leaveTypeId: allocation.leaveTypeId,
        transactionType: "LeaveEncashment",
        transactionId: doc._id,
        leaves: -actualEncashableDays,
        fromDate: allocation.toDate,
        toDate: allocation.toDate,
        isCarryForward: false,
        companyId: allocation.companyId,
      });

      created += 1;
    } catch (error) {
      failed += 1;
      console.error(`generateLeaveEncashments: failed for allocation ${allocation._id}:`, error);
    }
  }

  return { attempted, created, skipped, failed };
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
