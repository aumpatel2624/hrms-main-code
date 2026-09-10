import mongoose from "mongoose";
import { SCOPES } from "@demo-panel/shared/scopes";

/**
 * Row-level data scoping (ADR-002).
 *
 * A controller declares which of its model's fields carry each scope
 * dimension — the same declare-per-call-site style as `filterable`:
 *
 *   const scopeFilter = buildScopeFilter(req.user, {
 *     department: "departmentId",   // field matched against the user's department
 *     owner: "_id",                 // field matched against the user's id
 *   });
 *   runListQuery(User, req.body, { ..., scopeFilter });
 *   // or merged into a findOne: { _id: userId, ...(scopeFilter ?? {}) }
 *
 * `req.user.dataScope` is set by checkPermission from the role's
 * UserRoles.dataScope (or, as of ADR-024, the menu row's own override);
 * missing (ADMIN bypass, ungoverned route) means "all".
 *
 * A model that does not declare the demanded dimension stays unscoped —
 * master data (countries, currencies) is readable whatever the scope. But a
 * user missing the attribute the scope needs (no departmentId on a
 * department-scoped role) matches nothing: fail closed, not open.
 *
 * ADR-024 (Q-4) adds a fourth scope, "approver": rows owned by the user
 * themself OR by anyone the user resolves as the approver for. Declare it
 * with `scopeable.owner` (same field-name convention as "own" — the field on
 * the target model holding the Employee ref) and pass `scopeable.
 * approverIds`, an array the *caller* has already resolved asynchronously
 * (utils/approvers.js's getEmployeesApprovedBy) — this function stays
 * synchronous and does no querying of its own, so every existing call site
 * (7 modules) is untouched by this addition.
 */
export const buildScopeFilter = (reqUser, scopeable = {}) => {
  const scope = reqUser?.dataScope || SCOPES.ALL;
  if (scope === SCOPES.ALL) return null;

  if (scope === SCOPES.APPROVER) {
    if (!scopeable.owner) return null; // dimension not declared for this model
    const employeeId = reqUser?.employeeId;
    if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
      return { [scopeable.owner]: { $in: [] } }; // no linked Employee — matches nothing
    }
    const ids = [
      new mongoose.Types.ObjectId(String(employeeId)),
      ...(scopeable.approverIds || [])
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(String(id))),
    ];
    return { [scopeable.owner]: { $in: ids } };
  }

  const field =
    scope === SCOPES.DEPARTMENT ? scopeable.department : scopeable.owner;
  if (!field) return null; // dimension not declared for this model

  const value = scope === SCOPES.DEPARTMENT ? reqUser.departmentId : reqUser.id;
  if (!value || !mongoose.Types.ObjectId.isValid(value)) {
    return { [field]: { $in: [] } }; // matches nothing
  }

  return { [field]: new mongoose.Types.ObjectId(String(value)) };
};
