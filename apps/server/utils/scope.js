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
 * UserRoles.dataScope; missing (ADMIN bypass, ungoverned route) means "all".
 *
 * A model that does not declare the demanded dimension stays unscoped —
 * master data (countries, currencies) is readable whatever the scope. But a
 * user missing the attribute the scope needs (no departmentId on a
 * department-scoped role) matches nothing: fail closed, not open.
 */
export const buildScopeFilter = (reqUser, scopeable = {}) => {
  const scope = reqUser?.dataScope || SCOPES.ALL;
  if (scope === SCOPES.ALL) return null;

  const field =
    scope === SCOPES.DEPARTMENT ? scopeable.department : scopeable.owner;
  if (!field) return null; // dimension not declared for this model

  const value = scope === SCOPES.DEPARTMENT ? reqUser.departmentId : reqUser.id;
  if (!value || !mongoose.Types.ObjectId.isValid(value)) {
    return { [field]: { $in: [] } }; // matches nothing
  }

  return { [field]: new mongoose.Types.ObjectId(String(value)) };
};
