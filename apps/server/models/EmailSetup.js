import mongoose from "mongoose";

const EmailSetupSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
    },
    /**
     * SMTP credential. `select: false` keeps it out of every query result by
     * default — it was previously returned in plaintext by the list and
     * detail endpoints to any authenticated user.
     *
     * The mailer needs the real value, so the one place that sends mail asks
     * for it explicitly with `.select("+appPassword")`. Anything that forgets
     * gets `undefined` and fails loudly, rather than a credential quietly
     * riding along in an API response.
     */
    appPassword: {
      type: String,
      required: true,
      select: false,
    },
    SSL: {
      type: Boolean,
      default: true,
      required: true,
    },
    port: {
      type: Number,
      required: true,
    },
    host: {
      type: String,
      required: true,
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
// email is the natural key the create/update handlers check for duplicates.
EmailSetupSchema.index({ email: 1 });
EmailSetupSchema.index({ isActive: 1, createdAt: -1 });
EmailSetupSchema.index({ createdAt: -1 });

export default mongoose.model("EmailSetup", EmailSetupSchema);
