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

console.log("scope: all checks passed");
