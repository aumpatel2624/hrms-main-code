import Employee from "../models/Employee.js";

/**
 * ADR-040: Employee absorbed the former separate `User` login collection —
 * `req.user.id` (the session identity) now IS the Employee's own `_id`, no
 * separate lookup-by-link needed. This helper's shape (memoized on
 * `req.employee`, sets `req.user.employeeId`) is kept identical to the
 * pre-merge version so every existing call site (own/department/approver/
 * team scope dimensions across ~15 controllers) needed zero changes.
 *
 * Call this lazily, only from controllers whose scope dimension actually
 * needs the full Employee document — it is NOT wired into any global
 * middleware, so every screen that doesn't need it never pays the extra
 * query. ADMIN has no Employee row at all — resolves to `null` for that
 * role, same as OPEN-QUESTIONS.md Q-10 documented for the pre-merge case.
 */
export const resolveRequestEmployee = async (req) => {
  if (req.employee !== undefined) return req.employee;

  const employee = await Employee.findById(req.user.id).lean();
  req.employee = employee || null;
  req.user.employeeId = employee?._id ?? null;
  return req.employee;
};
