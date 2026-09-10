import assert from "node:assert/strict";
import mongoose from "mongoose";
import { buildScopeFilter } from "./scope.js";

const DEPT = "64b000000000000000000001";
const USER = "64b000000000000000000002";

// "all" (and missing scope entirely) never filters.
assert.equal(buildScopeFilter({ dataScope: "all" }, { department: "departmentId" }), null);
assert.equal(buildScopeFilter({}, { department: "departmentId" }), null);
assert.equal(buildScopeFilter(undefined, { department: "departmentId" }), null);

// department scope matches the declared field against the user's department.
{
  const filter = buildScopeFilter(
    { dataScope: "department", departmentId: DEPT, id: USER },
    { department: "departmentId", owner: "createdBy" },
  );
  assert.deepEqual(Object.keys(filter), ["departmentId"]);
  assert.ok(filter.departmentId instanceof mongoose.Types.ObjectId);
  assert.equal(String(filter.departmentId), DEPT);
}

// own scope matches the declared owner field against the user's id.
{
  const filter = buildScopeFilter(
    { dataScope: "own", departmentId: DEPT, id: USER },
    { department: "departmentId", owner: "_id" },
  );
  assert.equal(String(filter._id), USER);
}

// A model that does not declare the demanded dimension stays unscoped.
assert.equal(
  buildScopeFilter({ dataScope: "department", departmentId: DEPT }, { owner: "createdBy" }),
  null,
);
assert.equal(buildScopeFilter({ dataScope: "own", id: USER }, {}), null);

// A user missing the attribute the scope needs matches nothing — fail closed.
assert.deepEqual(
  buildScopeFilter({ dataScope: "department", id: USER }, { department: "departmentId" }),
  { departmentId: { $in: [] } },
);
assert.deepEqual(
  buildScopeFilter({ dataScope: "department", departmentId: "not-an-id" }, { department: "departmentId" }),
  { departmentId: { $in: [] } },
);
assert.deepEqual(
  buildScopeFilter({ dataScope: "own" }, { owner: "createdBy" }),
  { createdBy: { $in: [] } },
);

// approver scope (ADR-024) matches the user's own employeeId plus every
// pre-resolved approverId, when the owner field is declared.
{
  const EMP = "64b000000000000000000003";
  const APPROVEE_1 = "64b000000000000000000004";
  const APPROVEE_2 = "64b000000000000000000005";
  const filter = buildScopeFilter(
    { dataScope: "approver", employeeId: EMP },
    { owner: "employeeId", approverIds: [APPROVEE_1, APPROVEE_2] },
  );
  assert.deepEqual(Object.keys(filter), ["employeeId"]);
  const ids = filter.employeeId.$in.map(String);
  assert.deepEqual(ids.sort(), [EMP, APPROVEE_1, APPROVEE_2].sort());
}

// approver scope with no approverIds still matches the user's own employeeId.
{
  const EMP = "64b000000000000000000003";
  const filter = buildScopeFilter(
    { dataScope: "approver", employeeId: EMP },
    { owner: "employeeId" },
  );
  assert.deepEqual(filter.employeeId.$in.map(String), [EMP]);
}

// approver scope stays unscoped when the model doesn't declare `owner`.
assert.equal(
  buildScopeFilter({ dataScope: "approver", employeeId: "64b000000000000000000003" }, {}),
  null,
);

// approver scope with no employeeId on the user (no linked Employee) matches nothing,
// when there are no approverIds either.
assert.deepEqual(
  buildScopeFilter({ dataScope: "approver" }, { owner: "employeeId" }),
  { employeeId: { $in: [] } },
);

// Issue #12 regression: a User with NO linked Employee (a real, expected
// case — OPEN-QUESTIONS.md Q-10) but WITH resolved approverIds must still
// see the employees they approve for. The original version short-circuited
// to `{ $in: [] }` as soon as employeeId was missing and never looked at
// approverIds at all.
{
  const APPROVEE_1 = "64b000000000000000000004";
  const APPROVEE_2 = "64b000000000000000000005";
  const filter = buildScopeFilter(
    { dataScope: "approver" }, // no employeeId — no linked Employee
    { owner: "employeeId", approverIds: [APPROVEE_1, APPROVEE_2] },
  );
  assert.deepEqual(filter.employeeId.$in.map(String).sort(), [APPROVEE_1, APPROVEE_2].sort());
}

console.log("scope: all checks passed");
