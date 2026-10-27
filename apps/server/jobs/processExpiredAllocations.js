import LeaveAllocation from "../models/LeaveAllocation.js";
import LeaveLedgerEntry from "../models/LeaveLedgerEntry.js";
import { leavesLeftToExpire } from "../utils/leaveExpiry.js";

/**
 * ADR-024. Idiomatic-rebuild version of source's `process_expired_allocation`
 * (see `Leave Ledger Entry.md`/`Leave Allocation.md`): expires any `active`
 * `LeaveAllocation` whose `toDate` has passed, writing a negative ledger
 * entry for whatever balance is still attributable to it and flipping its
 * status to `expired`.
 *
 * Simplified from source's carry-forward-vs-plain two-phase split (which
 * exists because source models carry-forward as a *separate* ledger entry
 * needing its own expiry event): what is written off is the allocation's own
 * rows (its grant, any carry-forward portion, any `/adjust` deltas) net of
 * the leave taken in the period it covers — `leavesLeftToExpire`
 * (utils/leaveExpiry.js, ADR-053). Before ADR-053 the leave taken was not
 * netted, so the whole grant expired and the next period came out short;
 * `seed/backfill-leave-expiry.js` corrects rows written that way.
 */
export const processExpiredAllocations = async () => {
  const today = new Date();

  const candidates = await LeaveAllocation.find({
    status: "active",
    toDate: { $lt: today },
  });

  for (const allocation of candidates) {
    // eslint-disable-next-line no-await-in-loop
    const rows = await LeaveLedgerEntry.find({ employeeId: allocation.employeeId, leaveTypeId: allocation.leaveTypeId }).lean();
    const remaining = leavesLeftToExpire(allocation, rows);

    if (remaining > 0) {
      // eslint-disable-next-line no-await-in-loop
      await LeaveLedgerEntry.create({
        employeeId: allocation.employeeId,
        leaveTypeId: allocation.leaveTypeId,
        transactionType: "LeaveAllocation",
        transactionId: allocation._id,
        leaves: -remaining,
        fromDate: allocation.toDate,
        toDate: allocation.toDate,
        isCarryForward: false,
        isExpired: true,
        companyId: allocation.companyId,
      });
    }

    allocation.status = "expired";
    // eslint-disable-next-line no-await-in-loop
    await allocation.save();
  }

  return { processed: candidates.length };
};
