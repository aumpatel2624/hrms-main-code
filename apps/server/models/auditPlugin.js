import mongoose from "mongoose";
// Imported before the plugin is registered below, which is what keeps AuditLog
// from auditing itself. SKIP_MODELS enforces the same thing explicitly, because
// depending on import order for an infinite-loop guard is not a plan.
import AuditLog from "./AuditLog.js";
import { SKIP_MODELS } from "../config/audit.js";
import { getAuditContext } from "../utils/auditContext.js";
import { applyUpdate, classifyUpdate, diffDocuments } from "../utils/auditDiff.js";

/**
 * Audit trail, applied to every model in the app — the same global-plugin shape
 * as `softDelete.js`, and for the same reason: a model added tomorrow is covered
 * without anyone remembering to cover it, and no controller writes audit code by
 * hand, so none can forget to.
 *
 * **No actor, no row.** The plugin only records writes that happened inside a
 * logged-in request (see `utils/auditContext.js`). That is deliberate and it is
 * what makes the log readable: the seeder, the public SEO endpoints and the
 * redirect hit counter all write without an actor, and a hit counter firing on
 * every page view of the public website must not fill this collection.
 *
 * **Cost.** One extra indexed read per update, to capture the before-image. The
 * after-image is derived from the update payload rather than read back, so an
 * audited update is two queries rather than three. Creates and deletes add
 * nothing beyond the log write itself.
 *
 * **Not covered:** `deleteOne`/`deleteMany` (real deletions — only `Otp` and
 * sessions use them, both skipped) and `bulkWrite`, which does not run query
 * middleware. Nothing user-facing uses either.
 */

const auditable = (modelName) => !SKIP_MODELS.includes(modelName);

/** Best-effort human name for a record, for the list screen. */
const LABEL_FIELDS = [
  "name", "title", "email", "path", "fromPath", "menuName", "menuGroupName",
  "templateName", "roleName", "adminName", "userName", "departmentName",
  "countryName", "stateName", "cityName", "currencyName", "emailFor",
];

const labelFor = (doc) => {
  if (!doc) return "";
  const plain = typeof doc.toObject === "function" ? doc.toObject() : doc;
  for (const field of LABEL_FIELDS) {
    if (plain[field]) return String(plain[field]).slice(0, 120);
  }
  // Fall back to any *Name field the model happens to have.
  const named = Object.keys(plain).find((key) => /name$/i.test(key) && plain[key]);
  return named ? String(plain[named]).slice(0, 120) : "";
};

/**
 * Never let auditing break the thing it is auditing. A failed log write is a
 * problem for whoever reads the server log, not for the user mid-save.
 */
const record = async (entry) => {
  try {
    await AuditLog.create(entry);
  } catch (error) {
    console.error("Audit log write failed:", error?.message);
  }
};

export const auditPlugin = (schema) => {
  // ---- document writes: Model.create() and doc.save() ----
  schema.pre("save", async function () {
    if (!auditable(this.constructor.modelName) || !getAuditContext()?.actor) return;
    // $locals survives to the post hook; isNew does not.
    this.$locals.auditWasNew = this.isNew;
    this.$locals.auditBefore = this.isNew
      ? null
      : await this.constructor.findById(this._id).lean();
  });

  schema.post("save", async function (doc) {
    const context = getAuditContext();
    if (!auditable(this.constructor.modelName) || !context?.actor) return;

    const before = this.$locals.auditBefore ?? null;
    const wasNew = this.$locals.auditWasNew;
    const action = wasNew ? "create" : classifyUpdate(before, doc);
    const changes = diffDocuments(wasNew ? null : before, doc);

    // An edit that changed nothing is not worth a row — but a delete legitimately
    // has an empty change list, because `isDeleted` is carried by the action.
    if (action === "update" && changes.length === 0) return;

    await record({
      model: this.constructor.modelName,
      documentId: doc._id,
      recordLabel: labelFor(doc),
      action,
      changes,
      actor: context.actor,
      ip: context.ip,
    });
  });

  // ---- query writes: findByIdAndUpdate, findOneAndUpdate, updateOne/Many ----
  const UPDATE_OPS = /^(findOneAndUpdate|findOneAndReplace|updateOne|updateMany|replaceOne)$/;

  schema.pre(UPDATE_OPS, async function () {
    if (!auditable(this.model.modelName) || !getAuditContext()?.actor) return;
    this._auditBefore = await this.model.findOne(this.getFilter()).lean();
  });

  schema.post(UPDATE_OPS, async function () {
    const context = getAuditContext();
    if (!auditable(this.model.modelName) || !context?.actor) return;

    const before = this._auditBefore;
    // Nothing matched, or an upsert that inserted — the insert path has no
    // before-image to diff against and no document handed back here.
    if (!before) return;

    const update = this.getUpdate() ?? {};
    const after = applyUpdate(before, update);
    const changes = diffDocuments(before, after);
    const isMany = this.op === "updateMany";
    const action = isMany ? "updateMany" : classifyUpdate(before, after);

    // Same rule as above: only a no-op *edit* is dropped. A soft delete arrives
    // here as `{ isDeleted: true }`, which diffs to nothing on purpose.
    if (action === "update" && changes.length === 0) return;
    await record({
      model: this.model.modelName,
      documentId: isMany ? null : before._id,
      recordLabel: isMany ? "" : labelFor(before),
      action,
      changes,
      actor: context.actor,
      ip: context.ip,
    });
  });
};

// Same rule as softDelete.js: a global plugin only reaches schemas compiled
// after it, so a model imported ahead of this file goes unaudited — silently,
// which for an audit trail is the worst possible failure. Fail on boot instead.
// AuditLog is the one legitimate exception; it is compiled by the import above.
const compiledEarly = mongoose.modelNames().filter((name) => name !== "AuditLog");
if (compiledEarly.length > 0) {
  throw new Error(
    `models/auditPlugin.js must be imported before any model except AuditLog, but ` +
      `${compiledEarly.join(", ")} were already compiled and will not be audited. ` +
      "Move the import to the top of the entry point, just after models/softDelete.js.",
  );
}

mongoose.plugin(auditPlugin);
