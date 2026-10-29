import Employee, { NO_ACCESS_STATUSES } from "../models/Employee.js";

/** The approver fields HR sets on an Employee, as the form labels them. */
export const EMPLOYEE_APPROVER_FIELDS = {
  leaveApproverId: "Leave Approver",
  expenseApproverId: "Expense Approver",
  shiftRequestApproverId: "Shift Request Approver",
};

/** The approver lists HR sets on a Department, as the form labels them. */
export const DEPARTMENT_APPROVER_FIELDS = {
  leaveApprovers: "Leave Approvers",
  expenseApprovers: "Expense Approvers",
  shiftRequestApprovers: "Shift Request Approvers",
};

/**
 * Why `ids` cannot be approvers here, or null. HR sets approvers on the
 * Employee and Department screens (29 Oct P5); each must be a current
 * employee of `companyId` — someone Left, Inactive or Suspended cannot sign
 * in to decide — and never `selfId`, the employee being approved for.
 */
export const approverChoiceProblem = async (ids, { companyId, label, whose, selfId = null }) => {
  for (const id of [].concat(ids ?? []).filter(Boolean)) {
    if (selfId && String(id) === String(selfId)) return `${label} cannot be the employee themself`;
    const approver = await Employee.findById(id).select("companyId status isActive").lean();
    if (!approver) return `${label} not found`;
    if (String(approver.companyId) !== String(companyId)) return `${label} must belong to ${whose}`;
    if (approver.isActive === false || NO_ACCESS_STATUSES.includes(approver.status)) return `${label} must be a current employee`;
  }
  return null;
};
