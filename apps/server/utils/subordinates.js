import Employee from "../models/Employee.js";

/**
 * Org-chart "manager sees their team" resolution (SCOPES.TEAM).
 *
 * Employee.reportsToId is a flat self-reference (org-chart's "manager"
 * column, see models/Employee.js) — the walk here is the mirror image of
 * approvers.js's Department ancestor walk: breadth-first DOWN the reporting
 * chain instead of up a department chain, same depth bound (10) as every
 * other hierarchy walk in this codebase, for the same reason (a manufactured
 * reportsToId cycle degrades to "no further reports found", not an infinite
 * loop).
 */
const MAX_DEPTH = 10;

/**
 * Every Employee _id in the given manager's downward reporting chain —
 * direct reports, their reports, and so on. Does NOT include the manager's
 * own id; buildScopeFilter's TEAM branch adds that separately, the same way
 * its APPROVER branch adds the caller's own employeeId alongside
 * scopeable.approverIds.
 *
 * @returns {Promise<string[]>} deduped Employee _id strings
 */
export const getSubordinateEmployeeIds = async (employeeId) => {
  if (!employeeId) return [];

  const found = new Set();
  let frontier = [String(employeeId)];
  let depth = 0;
  while (frontier.length > 0 && depth < MAX_DEPTH) {
    const reports = await Employee.find({ reportsToId: { $in: frontier } }).select("_id").lean();
    frontier = reports.map((e) => String(e._id)).filter((id) => !found.has(id));
    for (const id of frontier) found.add(id);
    depth += 1;
  }

  return [...found];
};
