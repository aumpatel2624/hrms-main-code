import mongoose from "mongoose";

const EmailTemplateSchema = new mongoose.Schema(
  {
    templateName: {
      type: String,
      required: true,
    },
    emailFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmailSetup",
      required: true,
    },
    emailFor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmailFor",
      required: true,
    },
    mailerName: {
      type: String,
      required: true,
    },
    emailCC: {
      type: String,
      required: false,
      default: "",
    },
    emailBCC: {
      type: String,
      required: false,
      default: "",
    },
    emailSubject: {
      type: String,
      required: true,
    },
    emailSignature: {
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
// The two refs are also read by the delete guard, which counts
// referencing rows on every delete.
EmailTemplateSchema.index({ templateName: 1 });
// Named explicitly: two indexes share the { emailFor: 1 } key pattern below,
// and Mongoose warns about "duplicate" indexes on identical key patterns
// unless each has its own name, even though their options (and therefore
// their jobs) differ.
EmailTemplateSchema.index({ emailFor: 1 }, { name: "emailFor_ref" });
// At most one *active* template per EmailFor (INV-5, ADR-015) — closes the
// ambiguity where otp.controller.js's unsorted lookup picked whichever Mongo
// returned first. The plain emailFor_ref index above still covers lookups
// across active *and* inactive rows (the delete guard, the admin list); this
// one is the uniqueness constraint. models/softDelete.js merges in
// isDeleted:false — do not add that by hand.
EmailTemplateSchema.index(
  { emailFor: 1 },
  { unique: true, partialFilterExpression: { isActive: true }, name: "emailFor_active_unique" },
);
EmailTemplateSchema.index({ emailFrom: 1 });
EmailTemplateSchema.index({ isActive: 1, createdAt: -1 });
EmailTemplateSchema.index({ createdAt: -1 });

export default mongoose.model("EmailTemplate", EmailTemplateSchema);
