import Employee from "../models/Employee.js";

/**
 * ADR-024 (Q-4): today `req.user.departmentId`/`.id` refer to the login
 * `User`, not `Employee` — Leaves' own data (`LeaveApplication.employeeId`,
 * etc.) refs `Employee`, not `User`. This resolves the Employee linked to
 * the logged-in User once per request and memoizes it on `req.employee`.
 *
 * Call this lazily, only from controllers whose scope dimension actually
 * needs it (own/department/approver on a Leaves screen) — it is NOT wired
 * into any global middleware, so every screen that doesn't need it never
 * pays the extra query.
 *
 * A User with no linked Employee is a real, expected case (OPEN-QUESTIONS.md
 * Q-10) — this resolves to `null`, not an error; callers decide what that
 * means for them (usually: scope matches nothing).
 */
export const resolveRequestEmployee = async (req) => {
  if (req.employee !== undefined) return req.employee;

  const employee = await Employee.findOne({ userId: req.user.id }).lean();
  req.employee = employee || null;
  req.user.employeeId = employee?._id ?? null;
  return req.employee;
};
