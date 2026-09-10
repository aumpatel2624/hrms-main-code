import mongoose from "mongoose";

// Reusable set of Job Offer Terms (ADR-019) — the admin UI can copy a
// template's terms into a new Job Offer. Replaces Frappe's separate
// "Job Offer Term" doctype with a plain embedded array (bounded, never
// queried independently — the exact case 20-schema.md's modelling rules
// call out for embedding rather than a child collection).
const TermRowSchema = new mongoose.Schema(
  {
    term: { type: String, required: true, trim: true },
    value: { type: String, trim: true },
  },
  { _id: false },
);

const JobOfferTermTemplateSchema = new mongoose.Schema(
  {
    templateName: {
      type: String,
      required: true,
      trim: true,
    },
    offerTerms: {
      type: [TermRowSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  { timestamps: true },
);

JobOfferTermTemplateSchema.index({ templateName: 1 }, { unique: true });
JobOfferTermTemplateSchema.index({ isActive: 1, createdAt: -1 });
JobOfferTermTemplateSchema.index({ createdAt: -1 });

export default mongoose.model("JobOfferTermTemplate", JobOfferTermTemplateSchema);
