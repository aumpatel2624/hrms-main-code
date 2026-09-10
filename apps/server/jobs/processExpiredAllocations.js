import LeaveAllocation from "../models/LeaveAllocation.js";
import LeaveLedgerEntry from "../models/LeaveLedgerEntry.js";

/**
 * ADR-024. Idiomatic-rebuild version of source's `process_expired_allocation`
 * (see `Leave Ledger Entry.md`/`Leave Allocation.md`): expires any `active`
 * `LeaveAllocation` whose `toDate` has passed, writing a negative ledger
 * entry for whatever balance is still attributable to it and flipping its
 * status to `expired`.
 *
 * Simplified from source's carry-forward-vs-plain two-phase split (which
 * exists because source models carry-forward as a *separate* ledger entry
 * needing its own expiry event): "remaining balance attributable to this
 * allocation" is computed by summing every `LeaveLedgerEntry` whose
 * `transactionId` points at this allocation (its initial grant, any
 * carry-forward portion, and any `/adjust` deltas) — correct for this fork,
 * since nothing here yet writes a *consuming* transaction against an
 * allocation (Leave Application is the second fork's work). Once
 * consumption exists, this should be revisited to also net out application/
 * encashment debits scoped to the allocation's period.
 */
export const processExpiredAllocations = async () => {
  const today = new Date();

  const candidates = await LeaveAllocation.find({
    status: "active",
    toDate: { $lt: today },
  });

  for (const allocation of candidates) {
    // eslint-disable-next-line no-await-in-loop
    const [sum] = await LeaveLedgerEntry.aggregate([
      { $match: { isDeleted: { $ne: true }, transactionType: "LeaveAllocation", transactionId: allocation._id } },
      { $group: { _id: null, balance: { $sum: "$leaves" } } },
    ]);
    const remaining = sum?.balance ?? 0;

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
