import mongoose from "mongoose";
import LeaveLedgerEntry from "../models/LeaveLedgerEntry.js";

/**
 * ADR-024's module-wide invariant: an employee's leave balance is always
 * `SUM(LeaveLedgerEntry.leaves)`, never a cached field. `LeaveAllocation.
 * totalLeavesAllocated` etc. are display snapshots only.
 *
 * **Trap, flagged explicitly in the ADR**: `.aggregate()` does NOT run the
 * soft-delete plugin's query middleware (that only hooks `find`/`findOne`/
 * `count*`/`update*`), so this pipeline must exclude soft-deleted ledger
 * rows itself in its own `$match` stage — it is not automatic here the way
 * it is for a plain list query.
 *
 * Which rows count as of `asOfDate`:
 * - an allocation's grant (a positive, unexpired `LeaveAllocation` row)
 *   counts from the start of the period it covers (`fromDate`), whenever it
 *   was recorded — so 2026's allocation, entered after go-live, covers leave
 *   dated earlier in 2026, and next year's, entered early, does not count yet;
 * - every other row (applications, encashments, adjustments, expiry) counts
 *   once it was recorded (`createdAt`) — "the ledger as it stood at that
 *   point", unchanged, so expiry and carry-forward behave as before;
 * - `forConsumption` (a leave application's sufficiency check) also counts
 *   every debit recorded so far, whatever its date: leave already taken or
 *   booked is gone, even when it was recorded after — or is dated after —
 *   the leave being checked.
 *
 * @param {string|ObjectId} employeeId
 * @param {string|ObjectId} leaveTypeId
 * @param {Date} [asOfDate] — defaults to now
 * @param {{ forConsumption?: boolean }} [options]
 * @returns {Promise<number>}
 */
export const getLeaveBalance = async (employeeId, leaveTypeId, asOfDate = new Date(), { forConsumption = false } = {}) => {
  const grant = { transactionType: "LeaveAllocation", isExpired: { $ne: true }, leaves: { $gt: 0 } };
  const match = {
    isDeleted: { $ne: true }, // manual — aggregate bypasses the soft-delete plugin
    employeeId: new mongoose.Types.ObjectId(String(employeeId)),
    leaveTypeId: new mongoose.Types.ObjectId(String(leaveTypeId)),
    $or: [
      { ...grant, fromDate: { $lte: asOfDate } },
      { $nor: [grant], createdAt: { $lte: asOfDate } },
      ...(forConsumption ? [{ leaves: { $lt: 0 }, isExpired: { $ne: true } }] : []),
    ],
  };

  const [result] = await LeaveLedgerEntry.aggregate([
    { $match: match },
    { $group: { _id: null, balance: { $sum: "$leaves" } } },
  ]);

  return result?.balance ?? 0;
};
