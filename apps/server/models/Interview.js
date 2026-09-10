import mongoose from "mongoose";

// One scheduled interview round (ADR-019). No docstatus — `status` is the
// sole state machine (Pending/Under Review/Cleared/Rejected/Cancelled).
// Frappe's separate "Interview Detail" child-table doctype is folded into a
// plain array of User refs, same reasoning as InterviewType.defaultInterviewers.
const InterviewSchema = new mongoose.Schema(
  {
    interviewTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InterviewType",
      required: true,
    },
    jobApplicantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobApplicant",
      required: true,
    },
    // Fetched from jobApplicant.jobOpeningId.
    jobOpeningId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobOpening",
      required: false,
      default: null,
    },
    // Fetched from interviewType.designationId; validated against the
    // applicant's own designation (mismatch guard in the controller).
    designationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Designation",
      required: false,
      default: null,
    },
    scheduledOn: {
      type: Date,
      required: true,
    },
    fromTime: {
      type: String,
      required: true,
      trim: true,
    },
    toTime: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Under Review", "Cleared", "Rejected", "Cancelled"],
      default: "Pending",
      required: true,
    },
    interviewers: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    interviewSummary: {
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

InterviewSchema.index({ interviewTypeId: 1 });
InterviewSchema.index({ jobApplicantId: 1 });
InterviewSchema.index({ jobOpeningId: 1 });
InterviewSchema.index({ designationId: 1 });
InterviewSchema.index({ status: 1 });
InterviewSchema.index({ scheduledOn: 1 });
InterviewSchema.index({ isActive: 1, createdAt: -1 });
InterviewSchema.index({ createdAt: -1 });

export default mongoose.model("Interview", InterviewSchema);
