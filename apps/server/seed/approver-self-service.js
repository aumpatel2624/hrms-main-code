import RoleMaster from "../models/RoleMaster.js";
import UserRoles from "../models/UserRoles.js";
import { SELF_SERVICE_ROLE_NAMES, withEmployeeSelfService } from "./org-tiers.data.js";

/**
 * Leave Approver / Expense Approver / Interviewer keep the Employee role's
 * self-service (withEmployeeSelfService). Run last by both `npm run seed` and
 * `npm run seed:tiers`, so it copies whichever Employee matrix the install
 * ends up with. Additive and idempotent: re-running it on an existing install
 * is how that install gets it.
 */
export const seedApproverSelfService = async () => {
  const employeeRole = await RoleMaster.findOne({ roleName: "Employee" }).lean();
  const employeeMatrix = employeeRole && await UserRoles.findOne({ roleId: employeeRole._id }).lean();
  if (!employeeMatrix) {
    console.log("⚠️  Approver self-service: no Employee role matrix yet");
    return;
  }

  let changes = 0;
  for (const roleName of SELF_SERVICE_ROLE_NAMES) {
    const role = await RoleMaster.findOne({ roleName }).lean();
    const matrix = role && await UserRoles.findOne({ roleId: role._id }).lean();
    if (!matrix) continue;
    const merged = withEmployeeSelfService(matrix.roles, employeeMatrix);
    if (!merged.changes) continue;
    await UserRoles.updateOne({ _id: matrix._id }, { roles: merged.rows });
    changes += merged.changes;
  }
  console.log(`✅ Approver self-service: ${changes} grant(s) added or widened`);
};
