/**
 * ADR-026. `getCurrentSalaryStructureAssignment` — "which structure applies
 * to this employee on this date," resolved by a query, not a stored
 * current-flag (the same "resolver utility, not a status field" shape as
 * Leaves' `getLeaveBalance`). Reproduces source's `get_assigned_salary_
 * structure` exactly: the latest assignment (by fromDate) with
 * `fromDate <= asOfDate`, for that employee — **no company filter**, matching
 * source precisely (see DECISIONS.md ADR-026).
 *
 * Used by the Leave Encashment retrofit (Q-14) and anywhere else "what's
 * this employee's current salary structure assignment" is needed.
 */
import SalaryStructureAssignment from "../models/SalaryStructureAssignment.js";

export const getCurrentSalaryStructureAssignment = async (employeeId, asOfDate = new Date()) => {
  if (!employeeId) return null;
  return SalaryStructureAssignment.findOne({
    employeeId,
    fromDate: { $lte: asOfDate },
  }).sort({ fromDate: -1 });
};
