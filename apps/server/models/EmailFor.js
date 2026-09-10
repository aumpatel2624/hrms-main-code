import mongoose from "mongoose";

const EmailForSchema = new mongoose.Schema(
  {
    emailFor: {
      type: String,
      required: true,
    },
    // The stable machine name that makes this row resolvable from code
    // (ADR-015). Picked from a registry-fed dropdown in the admin UI, never
    // typed — see apps/server/config/emailTriggers.js. `unique: true` gets
    // the same isDeleted:false partial-index treatment as every other unique
    // field, courtesy of models/softDelete.js.
    triggerKey: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);


// ---- indexes ----------------------------------------------------------
// Every field the controller's `filterable` map exposes needs one, or the
// filter is a collection scan. isDeleted is deliberately NOT indexed on its
// own — see models/softDelete.js: `$ne: true` matches nearly every row and is
// too unselective to help. Compound indexes lead with the selective field.
// Small lookup table, but the list still sorts by createdAt. triggerKey's
// unique index (above) doubles as the lookup sendTriggeredEmail does on every
// trigger fire — no separate index needed for that.
EmailForSchema.index({ isActive: 1, createdAt: -1 });
EmailForSchema.index({ createdAt: -1 });

export default mongoose.model("EmailFor", EmailForSchema);
