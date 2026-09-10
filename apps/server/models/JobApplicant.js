import mongoose from "mongoose";

// Candidate application (ADR-019). Closed-opening and duplicate-application
// guards are enforced in the controller (jobApplicant.controller.js), not
// here — source-side.Employee-Referral status sync is deferred
// (OPEN-QUESTIONS.md Q-9): sourceId just points at the plain
// JobApplicantSource master, no special-cased values.
const JobApplicantSchema = new mongoose.Schema(
  {
    applicantName: {
      type: String,
      required: true,
      trim: true,
    },
    emailId: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    jobOpeningId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobOpening",
      required: false,
      default: null,
    },
    // Fetched from jobOpening.designationId if empty on create.
    designationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Designation",
      required: false,
      default: null,
    },
    countryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Country",
      required: false,
      default: null,
    },
    status: {
      type: String,
      enum: ["Open", "Replied", "Shortlisted", "Rejected", "Hold", "Accepted"],
      default: "Open",
      required: true,
    },
    applicantRating: {
      type: Number,
      required: false,
      default: null,
    },
    resumeLink: {
      type: String,
      trim: true,
    },
    resumeAttachment: {
      type: String,
      trim: true,
    },
    coverLetter: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobApplicantSource",
      required: false,
      default: null,
    },
    currency: {
      type: String,
      trim: true,
      default: "USD",
    },
    lowerRange: {
      type: Number,
      required: false,
      default: null,
      min: 0,
    },
    upperRange: {
      type: Number,
      required: false,
      default: null,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  { timestamps: true },
);

JobApplicantSchema.index({ emailId: 1 });
JobApplicantSchema.index({ jobOpeningId: 1 });
JobApplicantSchema.index({ designationId: 1 });
JobApplicantSchema.index({ sourceId: 1 });
JobApplicantSchema.index({ status: 1 });
JobApplicantSchema.index({ isActive: 1, createdAt: -1 });
JobApplicantSchema.index({ createdAt: -1 });

export default mongoose.model("JobApplicant", JobApplicantSchema);
