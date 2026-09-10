import mongoose from "mongoose";

// Compensation/terms offer extended to a candidate (ADR-019). No docstatus,
// no naming series. offerTerms replaces Frappe's separate "Job Offer Term"
// doctype with a plain embedded array (same reasoning as
// JobOfferTermTemplate.offerTerms). Vacancy validation against Staffing Plan
// is deferred (OPEN-QUESTIONS.md Q-8).
const TermRowSchema = new mongoose.Schema(
  {
    term: { type: String, required: true, trim: true },
    value: { type: String, trim: true },
  },
  { _id: false },
);

const JobOfferSchema = new mongoose.Schema(
  {
    jobApplicantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobApplicant",
      required: true,
    },
    status: {
      type: String,
      enum: ["Awaiting Response", "Accepted", "Rejected", "Cancelled"],
      required: false,
      default: null,
    },
    offerDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    // Fetched from jobApplicant.designationId if empty.
    designationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Designation",
      required: false,
      default: null,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    offerTerms: {
      type: [TermRowSchema],
      default: [],
    },
    jobOfferTermTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobOfferTermTemplate",
      required: false,
      default: null,
    },
    terms: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  { timestamps: true },
);

JobOfferSchema.index({ jobApplicantId: 1 });
JobOfferSchema.index({ companyId: 1 });
JobOfferSchema.index({ designationId: 1 });
JobOfferSchema.index({ status: 1 });
JobOfferSchema.index({ isActive: 1, createdAt: -1 });
JobOfferSchema.index({ createdAt: -1 });

export default mongoose.model("JobOffer", JobOfferSchema);
