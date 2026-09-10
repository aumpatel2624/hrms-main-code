import LeaveAllocation from "../models/LeaveAllocation.js";
import LeaveType from "../models/LeaveType.js";
import LeavePolicy from "../models/LeavePolicy.js";
import LeaveLedgerEntry from "../models/LeaveLedgerEntry.js";

/**
 * ADR-024. Idiomatic-rebuild version of source's `allocate_earned_leaves`
 * scheduler job (see `Leave Allocation.md` Business Logic —
 * `update_previous_leave_allocation`). Reads every `active` LeaveAllocation
 * for an earned-leave `LeaveType` with a pre-built `earnedLeaveSchedule[]`
 * (built by `LeavePolicyAssignment`'s `grant-allocations` action — see
 * utils/leaveProration.js) and, for each schedule row whose `allocationDate`
 * has arrived and hasn't been attempted yet, grants that tranche.
 *
 * Failure isolation is per schedule ROW, not per allocation and not per
 * job — one bad row is marked failed and the rest of that allocation's
 * (and every other allocation's) rows still get a chance to allocate.
 */
export const allocateEarnedLeaves = async () => {
  const today = new Date();
  const startOfToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);

  const leaveTypes = await LeaveType.find({ isEarnedLeave: true }).lean();
  const leaveTypeById = new Map(leaveTypes.map((lt) => [String(lt._id), lt]));
  if (leaveTypes.length === 0) return { attempted: 0, allocated: 0, failed: 0 };

  const allocations = await LeaveAllocation.find({
    status: "active",
    leaveTypeId: { $in: leaveTypes.map((lt) => lt._id) },
    "earnedLeaveSchedule.isAllocated": false,
    "earnedLeaveSchedule.attempted": false,
    "earnedLeaveSchedule.allocationDate": { $gte: startOfToday, $lte: endOfToday },
  });

  let attempted = 0;
  let allocated = 0;
  let failed = 0;

  for (const allocation of allocations) {
    const leaveType = leaveTypeById.get(String(allocation.leaveTypeId));
    if (!leaveType) continue;

    // Annual allocation ceiling, when this allocation traces back to a
    // Leave Policy (Leave Policy Detail's annual_allocation) — allocations
    // created outside that flow have no ceiling to check here, matching
    // source's own "only via Leave Policy Assignment" precondition for a
    // populated earnedLeaveSchedule in the first place.
    // eslint-disable-next-line no-await-in-loop
    const policy = allocation.leavePolicyId ? await LeavePolicy.findById(allocation.leavePolicyId).lean() : null;
    const policyDetail = policy?.leavePolicyDetails?.find((d) => String(d.leaveTypeId) === String(allocation.leaveTypeId));
    const annualAllocation = policyDetail?.annualAllocation ?? null;

    // eslint-disable-next-line no-await-in-loop
    const [nonCarryForwardSum] = await LeaveLedgerEntry.aggregate([
      {
        $match: {
          isDeleted: { $ne: true },
          transactionType: "LeaveAllocation",
          transactionId: allocation._id,
          isCarryForward: false,
        },
      },
      { $group: { _id: null, balance: { $sum: "$leaves" } } },
    ]);
    let existingWithoutCF = nonCarryForwardSum?.balance ?? 0;

    let changed = false;
    for (const row of allocation.earnedLeaveSchedule) {
      const due = !row.isAllocated && !row.attempted
        && row.allocationDate >= startOfToday && row.allocationDate <= endOfToday;
      if (!due) continue;

      attempted += 1;
      changed = true;
      try {
        let earnedLeaves = row.numberOfLeaves;

        if (annualAllocation != null && leaveType.earnedLeaveFrequency !== "Yearly") {
          const wouldBe = existingWithoutCF + earnedLeaves;
          if (wouldBe > annualAllocation) {
            throw new Error("Allocation was skipped due to exceeding annual allocation set in leave policy");
          }
        }
        if (leaveType.maxLeavesAllowed) {
          const quota = leaveType.maxLeavesAllowed - allocation.totalLeavesAllocated;
          if (quota <= 0) {
            throw new Error("Allocation was skipped due to maximum leave allocation limit set in leave type");
          }
          if (quota < earnedLeaves) earnedLeaves = quota;
        }

        // eslint-disable-next-line no-await-in-loop
        await LeaveLedgerEntry.create({
          employeeId: allocation.employeeId,
          leaveTypeId: allocation.leaveTypeId,
          transactionType: "LeaveAllocation",
          transactionId: allocation._id,
          leaves: earnedLeaves,
          fromDate: today,
          toDate: today,
          isCarryForward: false,
          companyId: allocation.companyId,
        });

        allocation.totalLeavesAllocated += earnedLeaves;
        existingWithoutCF += earnedLeaves;
        row.numberOfLeaves = earnedLeaves;
        row.isAllocated = true;
        row.attempted = true;
        row.allocatedVia = "Scheduler";
        allocated += 1;
      } catch (error) {
        row.attempted = true;
        row.failed = true;
        row.failureReason = error.message;
        failed += 1;
      }
    }

    if (changed) {
      // eslint-disable-next-line no-await-in-loop
      await allocation.save();
    }
  }

  return { attempted, allocated, failed };
};
