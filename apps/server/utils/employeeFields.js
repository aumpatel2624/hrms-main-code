import { ROLES } from "@demo-panel/shared/roles";
import { SCOPES } from "@demo-panel/shared/scopes";

/**
 * Field-level privacy on Employee reads. Row scope (utils/scope.js) decides
 * WHICH employees a caller sees; this decides how much of each. Only the
 * employee themself and a caller whose data scope on the screen is "all"
 * (HR, ADMIN) get the full record — a manager's team scope or an employee's
 * own scope gets just the work-directory fields below for anyone else, so
 * PAN, bank, CTC, date of birth, address, phone and insurance never reach
 * their browser.
 *
 * An allowlist, not a denylist: a personal field added to the model later
 * (Aadhaar, passport, emergency contacts, ...) stays hidden from managers
 * until someone deliberately adds it here.
 */
export const EMPLOYEE_DIRECTORY_FIELDS = [
  "_id", "employeeCode", "employeeName", "email",
  "companyId", "departmentId", "designationId", "branchId", "reportsToId",
  "status", "dateOfJoining", "isActive", "createdAt", "updatedAt",
  // Display names the Employee list's $lookups add.
  "companyName", "departmentName", "designationName", "branchName", "reportsToName",
];

export const employeeFieldsFor = (reqUser, employee) => {
  if (!employee) return employee;
  if (reqUser?.role === ROLES.ADMIN || reqUser?.dataScope === SCOPES.ALL) return employee;
  if (String(employee._id) === String(reqUser?.id)) return employee;
  return Object.fromEntries(
    EMPLOYEE_DIRECTORY_FIELDS.filter((key) => key in employee).map((key) => [key, employee[key]]),
  );
};
