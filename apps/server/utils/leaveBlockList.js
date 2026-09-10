import LeaveBlockList from "../models/LeaveBlockList.js";

/**
 * ADR-024 (module complete — second fork). Reusable block-date checker,
 * shared by `LeaveApplication`'s create validation chain and (indirectly)
 * anything else that needs "is this date blocked for this employee" — built
 * once here rather than duplicated per caller, per the task's own
 * instruction.
 *
 * A block list applies to an employee when its `companyId` matches AND
 * either `appliesToAllDepartments` is true OR its `departmentId` matches the
 * employee's department, AND (when the list has a `leaveTypeId` set) the
 * leave type matches too. A user on the list's `allowList[]` bypasses it —
 * matches source's `is_user_in_allow_list` precedent (see `Leave Block
 * List.md` Port Notes), applied here against the requesting/approving
 * user's User id.
 */

const sameCalendarDay = (a, b) => {
  const da = new Date(a);
  const db = new Date(b);
  return da.getUTCFullYear() === db.getUTCFullYear()
    && da.getUTCMonth() === db.getUTCMonth()
    && da.getUTCDate() === db.getUTCDate();
};

/**
 * Pure predicate (no I/O, independently testable): does this one block list
 * apply to the given department/leaveType, and is `bypassUserId` NOT on its
 * allow list? `list` must already be company-matched by the caller (a
 * cross-company block list is never applicable regardless of this check).
 */
export const listApplies = (list, { departmentId, leaveTypeId, bypassUserId }) => {
  const departmentMatches = list.appliesToAllDepartments
    || (departmentId != null && String(list.departmentId) === String(departmentId));
  if (!departmentMatches) return false;
  if (list.leaveTypeId && leaveTypeId && String(list.leaveTypeId) !== String(leaveTypeId)) return false;
  if (bypassUserId && (list.allowList || []).some((row) => String(row.allowUserId) === String(bypassUserId))) {
    return false; // this user is explicitly allowed to bypass this list
  }
  return true;
};

/** Every applicable (not-bypassed) LeaveBlockList for this employee/leaveType, lean. */
export const getApplicableBlockLists = async ({ companyId, departmentId, leaveTypeId, bypassUserId }) => {
  if (!companyId) return [];
  const lists = await LeaveBlockList.find({ isActive: true, companyId }).lean();
  return lists.filter((list) => listApplies(list, { departmentId, leaveTypeId, bypassUserId }));
};

/**
 * Every blocked date within [fromDate, toDate] across every applicable,
 * non-bypassed block list, as `{ blockDate, reason, leaveBlockListId,
 * leaveBlockListName }`.
 */
export const getBlockedDatesInRange = async ({ companyId, departmentId, leaveTypeId, fromDate, toDate, bypassUserId }) => {
  const lists = await getApplicableBlockLists({ companyId, departmentId, leaveTypeId, bypassUserId });
  const from = new Date(fromDate);
  const to = new Date(toDate);

  const blocked = [];
  for (const list of lists) {
    for (const row of list.blockDates || []) {
      const blockDate = new Date(row.blockDate);
      if (blockDate >= from && blockDate <= to) {
        blocked.push({
          blockDate: row.blockDate,
          reason: row.reason,
          leaveBlockListId: list._id,
          leaveBlockListName: list.leaveBlockListName,
        });
      }
    }
  }
  return blocked;
};

/** Is a single `date` blocked for this employee/leaveType (allow-list-aware)? */
export const isDateBlocked = async ({ companyId, departmentId, leaveTypeId, date, bypassUserId }) => {
  const blocked = await getBlockedDatesInRange({
    companyId, departmentId, leaveTypeId, fromDate: date, toDate: date, bypassUserId,
  });
  return blocked.some((b) => sameCalendarDay(b.blockDate, date));
};
