import Employee from "../models/Employee.js";
import { ROLES } from "@demo-panel/shared/roles";
import { SCOPES } from "@demo-panel/shared/scopes";
import User from "../models/User.js";
import Department from "../models/Department.js";
import { resolveRequestEmployee } from "./requestEmployee.js";
import { buildScopeFilter } from "./scope.js";
import { getSubordinateEmployeeIds } from "./subordinates.js";

// ADR-025: company confinement is mandatory, independent of the menu's row scope.
// Login Users have no companyId: Employee wins, otherwise their Department supplies it.
export const attendanceScope = async (req, employeeOwned = true) => {
  if (req.user.role === ROLES.ADMIN) return {};
  const employee = await resolveRequestEmployee(req);
  const user = await User.findById(req.user.id).select("departmentId").lean();
  const department = user && await Department.findById(user.departmentId).select("companyId").lean();
  const companyId = employee?.companyId || department?.companyId;
  const company = companyId ? { companyId } : { companyId: { $in: [] } };
  // Adapt only this call: the shared own dimension still means User._id elsewhere.
  if (employeeOwned && req.user.dataScope === "department") {
    const departmentId = employee?.departmentId || user?.departmentId;
    const employees = departmentId ? await Employee.find({ departmentId, ...company }).select("_id").lean() : [];
    return { $and: [company, { employeeId: { $in: employees.map(row => row._id) } }] };
  }
  // SCOPES.TEAM (pre-launch, org-chart manager visibility): resolve the
  // caller's downward reportsToId chain the same way an APPROVER scope
  // resolves its approverIds — buildScopeFilter unions it with the caller's
  // own employeeId, so a non-manager (empty chain) still sees exactly "own".
  const teamIds = employeeOwned && req.user.dataScope === SCOPES.TEAM
    ? await getSubordinateEmployeeIds(employee?._id)
    : undefined;
  const row = employeeOwned ? buildScopeFilter({ ...req.user,
    id: employee?._id, departmentId: employee?.departmentId || user?.departmentId,
  }, { owner: "employeeId", department: "departmentId", teamIds }) : null;
  return row ? { $and: [company, row] } : company;
};
