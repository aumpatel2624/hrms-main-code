// ponytail: one runnable check, no framework, no database.
// `node apps/server/models/softDelete.test.js`
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { excludeDeleted, excludeDeletedFromPipeline } from "./softDelete.js";

// Stand-ins for a mongoose Query and Aggregate. The hooks only ever touch these
// methods, and faking them keeps this runnable without a database.
const fakeQuery = (filter) => ({
  filter,
  getFilter() {
    return this.filter;
  },
  setQuery(next) {
    this.filter = next;
  },
});

const fakeAggregate = (stages) => ({
  stages,
  pipeline() {
    return this.stages;
  },
});

// --- reads hide deleted documents ---

const list = fakeQuery({ departmentCode: "OPS" });
excludeDeleted(list);
assert.deepEqual(list.getFilter(), { departmentCode: "OPS", isDeleted: { $ne: true } });

// $ne rather than false, so documents written before this existed stay visible
// even if the backfill has not run yet.
const all = fakeQuery({});
excludeDeleted(all);
assert.deepEqual(all.getFilter(), { isDeleted: { $ne: true } });

// ...unless the caller asked about isDeleted, which is the escape hatch for
// listing what was deleted.
const deleted = fakeQuery({ isDeleted: true });
excludeDeleted(deleted);
assert.deepEqual(deleted.getFilter(), { isDeleted: true });

// --- the same for aggregations, which skip the query filter entirely ---

// The exclusion goes first, before any $lookup or user-supplied $match.
const pipeline = fakeAggregate([{ $match: { isActive: true } }]);
excludeDeletedFromPipeline(pipeline);
assert.deepEqual(pipeline.stages, [{ $match: { isDeleted: { $ne: true } } }, { $match: { isActive: true } }]);

// --- unique indexes stop applying to deleted rows ---
// Otherwise deleting "India" would reserve the name forever against a row
// nobody can see. Importing this module registers the plugin globally, so
// compiling a schema here exercises what a real model gets.

const schema = new mongoose.Schema({
  code: { type: String, unique: true },
  name: String,
  parentId: mongoose.Schema.Types.ObjectId,
});
schema.index({ name: 1, parentId: 1 }, { unique: true });
schema.index({ parentId: 1 });

const Thing = mongoose.model("Thing", schema);
const indexes = new Map(Thing.schema.indexes().map(([fields, options]) => [JSON.stringify(fields), options]));

assert.ok(Thing.schema.path("isDeleted"), "the plugin adds the field");

// path-level `unique: true`
assert.deepEqual(indexes.get('{"code":1}').partialFilterExpression, { isDeleted: false });
// and a compound `schema.index(...)` — mongoose stores the two differently
assert.deepEqual(indexes.get('{"name":1,"parentId":1}').partialFilterExpression, { isDeleted: false });
// a non-unique index is left alone; making it partial would only hide rows
assert.equal(indexes.get('{"parentId":1}').partialFilterExpression, undefined);

console.log("softDelete: ok");
