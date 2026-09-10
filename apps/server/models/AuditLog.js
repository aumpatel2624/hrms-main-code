import mongoose from "mongoose";

/**
 * One recorded change to one document: who, what, when, and the fields either
 * side of it.
 *
 * Append-only by design. There is no create, update or delete endpoint for this
 * collection — a log anyone can edit answers no question worth asking — so the
 * only writer is the plugin in `models/auditPlugin.js`.
 *
 * The actor is **denormalised, not a ref**. An audit row has to stay readable
 * after the user who caused it is gone, and joining to a deleted account would
 * render "unknown" for exactly the rows most worth reading.
 */

const ChangeSchema = new mongoose.Schema(
  {
    field: { type: String, required: true },
    // Stored as strings: this is a record of what a human did, not a fixture to
    // replay. Mixed types would make the list screen and its filters harder for
    // no benefit.
    from: { type: String, default: null },
    to: { type: String, default: null },
  },
  { _id: false },
);

const ActorSchema = new mongoose.Schema(
  {
    userId: { type: String, default: "" },
    name: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    role: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const AuditLogSchema = new mongoose.Schema(
  {
    // The mongoose model name, e.g. "Department". Matches `ref` strings.
    model: { type: String, required: true, trim: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, default: null },
    // A human-readable name for the record at the time of the change, so the
    // list reads "Department · Sales" rather than a row of ObjectIds.
    recordLabel: { type: String, trim: true, default: "" },

    action: {
      type: String,
      enum: ["create", "update", "delete", "restore", "updateMany"],
      required: true,
    },
    changes: { type: [ChangeSchema], default: [] },

    actor: { type: ActorSchema, default: () => ({}) },
    ip: { type: String, trim: true, default: "" },

    isActive: { type: Boolean, default: true, required: true },
  },
  { timestamps: true },
);

// The three questions this collection exists to answer: what happened to this
// record, what has this person been doing, and what happened recently.
AuditLogSchema.index({ model: 1, documentId: 1, createdAt: -1 });
AuditLogSchema.index({ "actor.userId": 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ isActive: 1 });

export default mongoose.model("AuditLog", AuditLogSchema);
