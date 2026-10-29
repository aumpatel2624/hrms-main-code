// ponytail: one runnable check, no framework. `node apps/server/utils/listQuery.test.js`
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { buildFilterMatch, employeeSearch, MAX_PER_PAGE, OPERATORS, runListQuery } from "./listQuery.js";

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

// A list request from CrudList always includes isActive. Models that do not
// declare that optional field must still return their existing documents.
const NoIsActive = mongoose.model("ListQueryNoIsActiveTest", new mongoose.Schema({ name: String }));
const document = new NoIsActive({ name: "Existing salary slip" });
let pipeline;
NoIsActive.aggregate = async (stages) => {
    pipeline = stages;
    return [{ count: 1, data: [document] }];
};
const result = await runListQuery(NoIsActive, { skip: 0, per_page: 10, match: "", isActive: true });
assert.deepEqual(pipeline[0], { $match: {} });
assert.equal(result[0].data[0].name, "Existing salary slip");

// Models that opt into isActive keep the existing active-only behaviour.
const HasIsActive = mongoose.model("ListQueryHasIsActiveTest", new mongoose.Schema({ name: String, isActive: Boolean }));
HasIsActive.aggregate = async (stages) => {
    pipeline = stages;
    return [];
};
await runListQuery(HasIsActive, { isActive: false });
assert.deepEqual(pipeline[0], { $match: { isActive: false } });

// searchRefs (ADR-044): the term also matches rows whose ref points at a
// document with the term in its own fields — looked up by id, after scope.
const RefTarget = mongoose.model("ListQueryRefTargetTest", new mongoose.Schema({ employeeName: String, employeeCode: String }));
const asha = new mongoose.Types.ObjectId();
let refFilter;
RefTarget.find = (filter) => {
    refFilter = filter;
    return { lean: async () => [{ _id: asha }] };
};
const WithRef = mongoose.model("ListQueryWithRefTest", new mongoose.Schema({ remarks: String, employeeId: mongoose.Schema.Types.ObjectId }));
WithRef.aggregate = async (stages) => {
    pipeline = stages;
    return [];
};
await runListQuery(WithRef, { match: "as.ha" }, {
    searchFields: ["remarks"],
    searchRefs: [{ ...employeeSearch(), model: "ListQueryRefTargetTest" }],
    scopeFilter: { companyId: "c1" },
});
assert.deepEqual(refFilter, { $or: [{ employeeName: { $regex: "as\\.ha", $options: "i" } }, { employeeCode: { $regex: "as\\.ha", $options: "i" } }] });
assert.deepEqual(pipeline[0], { $match: { companyId: "c1" } }, "scope stays first");
assert.deepEqual(pipeline[1], { $match: { $or: [{ remarks: { $regex: "as\\.ha", $options: "i" } }, { employeeId: { $in: [asha] } }] } });

// A ref-only search with no matching employee matches nothing, never everything.
RefTarget.find = () => ({ lean: async () => [] });
await runListQuery(WithRef, { match: "nobody" }, { searchRefs: [{ ...employeeSearch(), model: "ListQueryRefTargetTest" }] });
assert.deepEqual(pipeline[1], { $match: { $or: [{ employeeId: { $in: [] } }] } });

// A page is at most MAX_PER_PAGE rows: a search asking for 100,000 got them
// all (29 Oct security test, low). A negative or junk size or offset falls
// back to the defaults instead of reaching Mongo.
const pageOf = () => pipeline.find((stage) => stage.$facet).$facet.stage2;
await runListQuery(HasIsActive, { per_page: 100000 });
assert.deepEqual(pageOf().slice(0, 2), [{ $skip: 0 }, { $limit: MAX_PER_PAGE }]);
assert.equal(MAX_PER_PAGE, 500, "the largest page a screen asks for");
await runListQuery(HasIsActive, { per_page: -5, skip: -20 });
assert.deepEqual(pageOf().slice(0, 2), [{ $skip: 0 }, { $limit: 1 }]);
await runListQuery(HasIsActive, { per_page: "lots", skip: "x" });
assert.deepEqual(pageOf().slice(0, 2), [{ $skip: 0 }, { $limit: 100 }]);

console.log("listQuery: all checks passed");
