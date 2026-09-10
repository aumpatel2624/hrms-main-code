import mongoose from "mongoose";

// Per-interviewer scorecard (ADR-019). No docstatus, no Skill Assessment
// child table (Skill doesn't exist until module 6 — OPEN-QUESTIONS.md Q-9,
// so no average-rating computation either). Guards (interviewer must be
// assigned, not before scheduledOn, one per interviewer per interview) are
// enforced in the controller.
const InterviewFeedbackSchema = new mongoose.Schema(
  {
    interviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Interview",
      required: true,
    },
    interviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    result: {
      type: String,
      enum: ["Cleared", "Rejected"],
      required: true,
    },
    feedback: {
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

InterviewFeedbackSchema.index({ interviewId: 1, interviewerId: 1 }, { unique: true });
InterviewFeedbackSchema.index({ interviewId: 1 });
InterviewFeedbackSchema.index({ interviewerId: 1 });
InterviewFeedbackSchema.index({ isActive: 1, createdAt: -1 });
InterviewFeedbackSchema.index({ createdAt: -1 });

export default mongoose.model("InterviewFeedback", InterviewFeedbackSchema);
