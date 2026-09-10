import assert from "node:assert/strict";
import { listApplies } from "./leaveBlockList.js";

const deptId = "507f1f77bcf86cd799439011";
const otherDeptId = "507f1f77bcf86cd799439012";
const leaveTypeId = "507f1f77bcf86cd799439013";
const otherLeaveTypeId = "507f1f77bcf86cd799439014";
const userId = "507f1f77bcf86cd799439015";

// appliesToAllDepartments:true always matches on department, whatever departmentId is passed.
assert.equal(
  listApplies({ appliesToAllDepartments: true, allowList: [] }, { departmentId: otherDeptId }),
  true,
);

// department-specific list only matches its own department.
assert.equal(
  listApplies({ appliesToAllDepartments: false, departmentId: deptId, allowList: [] }, { departmentId: deptId }),
  true,
);
assert.equal(
  listApplies({ appliesToAllDepartments: false, departmentId: deptId, allowList: [] }, { departmentId: otherDeptId }),
  false,
);

// leaveTypeId set on the list restricts it to that leave type; unset blocks every type.
assert.equal(
  listApplies(
    { appliesToAllDepartments: true, leaveTypeId, allowList: [] },
    { departmentId: deptId, leaveTypeId: otherLeaveTypeId },
  ),
  false,
);
assert.equal(
  listApplies({ appliesToAllDepartments: true, allowList: [] }, { departmentId: deptId, leaveTypeId: otherLeaveTypeId }),
  true,
);

// A user on the allow list bypasses the block (listApplies returns false).
assert.equal(
  listApplies(
    { appliesToAllDepartments: true, allowList: [{ allowUserId: userId }] },
    { departmentId: deptId, bypassUserId: userId },
  ),
  false,
);
// A different user is still blocked.
assert.equal(
  listApplies(
    { appliesToAllDepartments: true, allowList: [{ allowUserId: userId }] },
    { departmentId: deptId, bypassUserId: otherDeptId },
  ),
  true,
);

console.log("leaveBlockList.test.js passed");
