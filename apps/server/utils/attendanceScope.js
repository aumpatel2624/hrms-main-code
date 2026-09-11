import Employee from "../models/Employee.js";
import { ROLES } from "@demo-panel/shared/roles";
import User from "../models/User.js";
import Department from "../models/Department.js";
import { resolveRequestEmployee } from "./requestEmployee.js";
import { buildScopeFilter } from "./scope.js";

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
  const row = employeeOwned ? buildScopeFilter({ ...req.user,
    id: employee?._id, departmentId: employee?.departmentId || user?.departmentId,
  }, { owner: "employeeId", department: "departmentId" }) : null;
  return row ? { $and: [company, row] } : company;
};
