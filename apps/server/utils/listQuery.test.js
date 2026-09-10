// ponytail: one runnable check, no framework. `node apps/server/utils/listQuery.test.js`
import assert from "node:assert/strict";
import { buildFilterMatch, OPERATORS } from "./listQuery.js";

const allow = { countryName: "string", isActive: "boolean", sequence: "number", createdAt: "date", roleId: "objectId" };

// nothing to do
assert.equal(buildFilterMatch(undefined, allow), null);
assert.equal(buildFilterMatch([], allow), null);

// basic operators
assert.deepEqual(buildFilterMatch([{ field: "countryName", op: "contains", value: "ind" }], allow), {
    $and: [{ countryName: { $regex: "ind", $options: "i" } }],
});
assert.deepEqual(buildFilterMatch([{ field: "sequence", op: "between", value: [2, 5] }], allow), {
    $and: [{ sequence: { $gte: 2, $lte: 5 } }],
});
assert.deepEqual(buildFilterMatch([{ field: "countryName", op: "isEmpty" }], allow), {
    $and: [{ countryName: { $in: [null, ""] } }],
});

// match type
assert.deepEqual(buildFilterMatch([{ field: "countryName", op: "eq", value: "x" }], allow, "any"), {
    $or: [{ countryName: { $eq: "x" } }],
});

// --- trust boundary: everything below arrives from the client ---

// a field that is not on the allowlist never reaches Mongo
assert.equal(buildFilterMatch([{ field: "password", op: "eq", value: "x" }], allow), null);
assert.equal(buildFilterMatch([{ field: "__proto__", op: "eq", value: "x" }], allow), null);

// an operator that does not suit the field's type is rejected
assert.equal(buildFilterMatch([{ field: "isActive", op: "contains", value: "x" }], allow), null);
assert.equal(buildFilterMatch([{ field: "sequence", op: "startsWith", value: "1" }], allow), null);

// regex metacharacters in a value are escaped, so a filter cannot inject a pattern
assert.deepEqual(buildFilterMatch([{ field: "countryName", op: "contains", value: ".*" }], allow), {
    $and: [{ countryName: { $regex: "\\.\\*", $options: "i" } }],
});

// values are coerced to the declared type; unusable ones drop the clause
assert.deepEqual(buildFilterMatch([{ field: "sequence", op: "eq", value: "7" }], allow), {
    $and: [{ sequence: { $eq: 7 } }],
});
assert.equal(buildFilterMatch([{ field: "sequence", op: "eq", value: "abc" }], allow), null);
assert.equal(buildFilterMatch([{ field: "roleId", op: "eq", value: "not-an-id" }], allow), null);
assert.equal(buildFilterMatch([{ field: "createdAt", op: "gt", value: "nonsense" }], allow), null);

// a valid clause survives alongside a rejected one
assert.deepEqual(
    buildFilterMatch(
        [
            { field: "evil", op: "eq", value: "x" },
            { field: "countryName", op: "eq", value: "India" },
        ],
        allow,
    ),
    { $and: [{ countryName: { $eq: "India" } }] },
);

// every declared type advertises at least one operator
for (const [type, ops] of Object.entries(OPERATORS)) assert.ok(ops.length > 0, `${type} has operators`);

console.log("listQuery: all checks passed");
