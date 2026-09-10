import Employee from "../models/Employee.js";
import Department from "../models/Department.js";

/**
 * Department Approver resolution (ADR-024, Leaves module 8 foundation).
 *
 * Source (Frappe HRMS) walks a nested-set (`lft`/`rgt`) ancestor chain via
 * `get_approvers()`. This project's `Department` (ADR-017) is flat, so the
 * walk is a plain `parentDepartmentId` chain instead, bounded to depth 10 as
 * a hard cycle guard — a manufactured cycle degrades to "approver not
 * found", not an infinite loop. See models/Department.js.
 */

const MAX_DEPTH = 10;

/** approverType -> { employeeField, departmentArrayField } */
const APPROVER_FIELDS = {
  leave: { employeeField: "leaveApproverId", departmentField: "leaveApprovers" },
  expense: { employeeField: "expenseApproverId", departmentField: "expenseApprovers" },
  shiftRequest: { employeeField: "shiftRequestApproverId", departmentField: "shiftRequestApprovers" },
};

const assertApproverType = (approverType) => {
  const fields = APPROVER_FIELDS[approverType];
  if (!fields) {
    throw new Error(`resolveApprovers: unknown approverType "${approverType}" (expected leave|expense|shiftRequest)`);
  }
  return fields;
};

/**
 * Resolve the approver(s) for one employee.
 *
 * If the Employee's own direct approver field is set, that's the answer,
 * full stop — no department walk. Otherwise walk `parentDepartmentId`
 * upward from the employee's department, collecting every ancestor level's
 * matching approver array — union across the WHOLE chain, not just the
 * nearest non-empty level (matches source's own dedup-across-ancestors
 * behavior). Returns `[]` if nothing resolves; this is a pure resolver, it
 * does not throw — callers decide what an empty result means for them
 * (e.g. a Leave Application's second fork throwing a validation error).
 *
 * @returns {Promise<string[]>} deduped User _id strings
 */
export const resolveApprovers = async (employeeId, approverType) => {
  const { employeeField, departmentField } = assertApproverType(approverType);

  const employee = await Employee.findById(employeeId).lean();
  if (!employee) return [];

  if (employee[employeeField]) {
    return [String(employee[employeeField])];
  }

  const found = new Set();
  let departmentId = employee.departmentId;
  let depth = 0;
  while (departmentId && depth < MAX_DEPTH) {
    const department = await Department.findById(departmentId).lean();
    if (!department) break;
    for (const userId of department[departmentField] || []) found.add(String(userId));
    departmentId = department.parentDepartmentId;
    depth += 1;
  }

  return [...found];
};

/**
 * The inverse: which Employees does the given User (login account) approve
 * for, for a given approver dimension. Used by Leaves' own list screens to
 * resolve `scopeable.approverIds` for the "approver" data scope.
 *
 * Step 1: every Employee whose own direct approver field is this user.
 * Step 2: every Department where this user appears in the matching approver
 * array; for each, walk DESCENDANTS (the reverse of parentDepartmentId,
 * same depth bound) and collect every Employee in that department or any
 * descendant whose own direct approver field is UNSET — a direct override
 * always wins, so an employee with their own explicit approver is never
 * covered by a department fallback approver.
 *
 * @returns {Promise<string[]>} deduped Employee _id strings
 */
export const getEmployeesApprovedBy = async (userId, approverType) => {
  const { employeeField, departmentField } = assertApproverType(approverType);
  const userIdStr = String(userId);

  const direct = await Employee.find({ [employeeField]: userId }).select("_id").lean();
  const result = new Set(direct.map((e) => String(e._id)));

  const rootDepartments = await Department.find({ [departmentField]: userId }).select("_id").lean();
  if (rootDepartments.length === 0) return [...result];

  // Breadth-first walk of descendants, depth-bounded the same way the
  // ancestor walk is.
  let frontier = rootDepartments.map((d) => String(d._id));
  const allDepartmentIds = new Set(frontier);
  let depth = 0;
  while (frontier.length > 0 && depth < MAX_DEPTH) {
    const children = await Department.find({ parentDepartmentId: { $in: frontier } }).select("_id").lean();
    frontier = children.map((d) => String(d._id)).filter((id) => !allDepartmentIds.has(id));
    for (const id of frontier) allDepartmentIds.add(id);
    depth += 1;
  }

  const employeesInScope = await Employee.find({ departmentId: { $in: [...allDepartmentIds] } })
    .select(`_id ${employeeField}`)
    .lean();
  for (const employee of employeesInScope) {
    // A direct override always wins — never covered by the department fallback.
    if (!employee[employeeField]) result.add(String(employee._id));
  }

  return [...result];
};
