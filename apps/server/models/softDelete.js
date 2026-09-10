import mongoose from "mongoose";

/**
 * Soft delete, applied to every model in the app. See ADR-001.
 *
 * Nothing here removes a document. The delete endpoints set `isDeleted` and
 * every read excludes flagged documents, so a deleted record behaves exactly
 * like a missing one — it disappears from lists, searches, dropdowns and the
 * `referenceHelper` delete guard — without the data leaving the database.
 *
 * This is a *global* plugin rather than a field on each model on purpose: a
 * model added later is covered without anyone remembering to, and no controller
 * ever filters `isDeleted` by hand, so no read can leak deleted rows by
 * forgetting to.
 *
 * Escape hatch: mention `isDeleted` in a filter yourself and this leaves the
 * query alone — `Model.find({ isDeleted: true })` lists what was deleted.
 *
 * `deleteOne`/`deleteMany` are deliberately NOT intercepted. A method named
 * delete that does not delete is a trap, and `Otp` genuinely wants its consumed
 * tokens gone.
 */

const NOT_DELETED = { isDeleted: { $ne: true } };

/**
 * Add the exclusion to a query, unless the caller said something about
 * `isDeleted` themselves. Exported for the test — the hooks below are the only
 * production callers.
 */
export const excludeDeleted = (query) => {
  const filter = query.getFilter();
  if (!("isDeleted" in filter)) query.setQuery({ ...filter, ...NOT_DELETED });
};

/**
 * The same exclusion for an aggregation, which does not go through the query
 * filter at all. Separate export for the same reason as above — it is the one
 * line standing between `runListQuery` and every list screen leaking deleted
 * rows, so it gets a test.
 */
export const excludeDeletedFromPipeline = (aggregate) => {
  aggregate.pipeline().unshift({ $match: NOT_DELETED });
};

/**
 * A unique index has to ignore deleted rows, or a value can never be reused
 * once its record is deleted — delete country "India", and "India" is taken
 * forever by a row nobody can see. Rewriting the indexes here rather than in
 * each model is what stops the next model with a `unique: true` from silently
 * reintroducing that.
 */
const ignoreDeletedRows = (options) => {
  if (options.unique) {
    options.partialFilterExpression = { ...options.partialFilterExpression, isDeleted: false };
  }
};

export const softDeletePlugin = (schema) => {
  // ponytail: no index on isDeleted — every query matches it with $ne, which is
  // too unselective for an index to help. The partial indexes below are what
  // actually needs the field.
  schema.add({ isDeleted: { type: Boolean, default: false } });

  // find/findOne/findOneAndUpdate/findOneAndDelete, countDocuments, distinct,
  // updateOne/updateMany, replaceOne. Not estimatedDocumentCount, which takes
  // no filter, and not deleteOne/deleteMany.
  schema.pre(/^(find|count|distinct|update|replace)/, function () {
    excludeDeleted(this);
  });

  // Aggregations bypass query middleware entirely, and every list screen in the
  // admin panel is an aggregation via `runListQuery`.
  schema.pre("aggregate", function () {
    excludeDeletedFromPipeline(this);
  });

  // Two loops because Mongoose stores the two kinds of index differently:
  // `schema.index(...)` options are live objects on the schema, while a
  // path-level `unique: true` lives on the path and is only ever *copied* into
  // schema.indexes().
  for (const [, options] of schema.indexes()) ignoreDeletedRows(options);
  schema.eachPath((_path, type) => {
    if (type._index) ignoreDeletedRows(type._index);
  });
};

// Global plugins only reach schemas compiled after this point, so a model
// imported ahead of this file would quietly keep hard-delete semantics and leak
// deleted records. Fail loudly instead: import this before any model — entry
// points do it on their first line.
if (mongoose.modelNames().length > 0) {
  throw new Error(
    `models/softDelete.js must be imported before any model, but ${mongoose.modelNames().join(", ")} ` +
      "were already compiled. Move the import to the top of the entry point.",
  );
}

mongoose.plugin(softDeletePlugin);
