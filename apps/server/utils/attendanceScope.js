import Employee from "../models/Employee.js";
import { ROLES } from "@demo-panel/shared/roles";
import { SCOPES } from "@demo-panel/shared/scopes";
import { resolveRequestEmployee } from "./requestEmployee.js";
import { buildScopeFilter } from "./scope.js";
import { getSubordinateEmployeeIds } from "./subordinates.js";

// ADR-025/ADR-040: company confinement is mandatory, independent of the
// menu's row scope. Employee is the login identity now (the former separate
// `User` collection was merged in), so it always carries its own companyId —
// no separate Department lookup needed to find it.
// `directReports`: an APPROVER-scoped caller sees own + their direct reports
// (org-tier "direct" scope) instead of only what the approver resolvers name.
// `companyViaEmployee`: for a collection with no companyId of its own (e.g.
// EmployeeSeparation), confine by company through its employeeId instead.
export const attendanceScope = async (req, employeeOwned = true, { directReports = false, companyViaEmployee = false } = {}) => {
  if (req.user.role === ROLES.ADMIN) return {};
  const employee = await resolveRequestEmployee(req);
  const companyId = employee?.companyId;
  const company = companyId ? { companyId } : { companyId: { $in: [] } };
  if (companyViaEmployee) {
    const companyEmployees = companyId ? await Employee.find({ companyId }).select("_id").lean() : [];
    const scope = await attendanceScope(req, employeeOwned, { directReports });
    const byEmployee = { employeeId: { $in: companyEmployees.map(row => row._id) } };
    return scope.$and ? { $and: [byEmployee, ...scope.$and.slice(1)] } : byEmployee;
  }
  if (employeeOwned && req.user.dataScope === SCOPES.DEPARTMENT) {
    return { $and: [company, { employeeId: { $in: await departmentEmployeeIds(req) } }] };
  }
  // SCOPES.TEAM (pre-launch, org-chart manager visibility): resolve the
  // caller's downward reportsToId chain the same way an APPROVER scope
  // resolves its approverIds — buildScopeFilter unions it with the caller's
  // own employeeId, so a non-manager (empty chain) still sees exactly "own".
  const teamIds = employeeOwned && req.user.dataScope === SCOPES.TEAM
    ? await getSubordinateEmployeeIds(employee?._id)
    : undefined;
  const approverIds = employeeOwned && directReports && req.user.dataScope === SCOPES.APPROVER
    ? (await Employee.find({ reportsToId: employee?._id }).select("_id").lean()).map((row) => row._id)
    : undefined;
  const row = employeeOwned ? buildScopeFilter({ ...req.user,
    id: employee?._id, departmentId: employee?.departmentId,
  }, { owner: "employeeId", department: "departmentId", teamIds, approverIds }) : null;
  return row ? { $and: [company, row] } : company;
};

// F3: an "Own department" row — the employees in the caller's current
// department and company (the caller among them). No department: nobody,
// fail closed. Shared by every employee-owned screen that honours the scope.
export const departmentEmployeeIds = async (req) => {
  const employee = await resolveRequestEmployee(req);
  if (!employee?.departmentId || !employee.companyId) return [];
  const employees = await Employee.find({ departmentId: employee.departmentId, companyId: employee.companyId }).select("_id").lean();
  return employees.map((row) => row._id);
};

/** Whether `employeeId` is one of departmentEmployeeIds — the by-id twin of the list filter. */
export const inCallerDepartment = async (req, employeeId) =>
  (await departmentEmployeeIds(req)).some((id) => String(id) === String(employeeId?._id ?? employeeId));

// ADR-043: a source's `selfServiceFilter` (config/widgetSources.js) narrows
// any caller whose row scope is less than "all" — an Employee sees submitted
// payslips only — on its screen and its dashboard widgets alike.
export const withSelfServiceFilter = (req, scope, selfServiceFilter) =>
  selfServiceFilter && (req.user.dataScope || SCOPES.ALL) !== SCOPES.ALL ? { $and: [scope, selfServiceFilter] } : scope;

// ADR-042: an employee-owned row scope, applied to Employee rows themselves
// — which employees' records it covers. The owner field `employeeId` becomes
// the Employee's own `_id`; companyId is shared.
export const asEmployeeFilter = (filter) => Object.fromEntries(Object.entries(filter).map(([key, value]) =>
  key === "$and" ? [key, value.map(asEmployeeFilter)] : [key === "employeeId" ? "_id" : key, value]));

export const attendanceEmployeeScope = async (req) => asEmployeeFilter(await attendanceScope(req, true));
