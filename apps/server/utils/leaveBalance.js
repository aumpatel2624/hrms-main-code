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
 * `asOfDate` filters on `createdAt` — "the ledger as it stood chronologically
 * at that point" — rather than reproducing source's per-transaction-type
 * date-field logic (`get_leave_balance_on` reads `to_date` for allocations
 * but `from_date`/`to_date` differently for applications/encashments). A
 * deliberate simplification: nothing in this fork yet writes application/
 * encashment rows, so there is no mixed-date-field case to get right today —
 * the second fork should revisit this if it needs true "balance as of an
 * arbitrary past date" semantics once those transaction types exist.
 *
 * @param {string|ObjectId} employeeId
 * @param {string|ObjectId} leaveTypeId
 * @param {Date} [asOfDate] — defaults to now
 * @returns {Promise<number>}
 */
export const getLeaveBalance = async (employeeId, leaveTypeId, asOfDate = new Date()) => {
  const match = {
    isDeleted: { $ne: true }, // manual — aggregate bypasses the soft-delete plugin
    employeeId: new mongoose.Types.ObjectId(String(employeeId)),
    leaveTypeId: new mongoose.Types.ObjectId(String(leaveTypeId)),
    createdAt: { $lte: asOfDate },
  };

  const [result] = await LeaveLedgerEntry.aggregate([
    { $match: match },
    { $group: { _id: null, balance: { $sum: "$leaves" } } },
  ]);

  return result?.balance ?? 0;
};
