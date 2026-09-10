import mongoose from "mongoose";

// Per-interviewer scorecard (ADR-019). No docstatus. skillAssessment
// retrofitted by ADR-022 (module 6) now that Skill exists — closes the
// Skill Assessment half of OPEN-QUESTIONS.md Q-9 this file originally
// deferred. No average-rating rollup onto the parent Interview yet — a
// read-side reporting query, not a data-shape gap, added when a screen
// needs it. Guards (interviewer must be assigned, not before scheduledOn,
// one per interviewer per interview) are enforced in the controller.
const SkillAssessmentSchema = new mongoose.Schema(
  {
    skillId: { type: mongoose.Schema.Types.ObjectId, ref: "Skill", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
  },
  { _id: false },
);

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
    skillAssessment: {
      type: [SkillAssessmentSchema],
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

InterviewFeedbackSchema.index({ interviewId: 1, interviewerId: 1 }, { unique: true });
InterviewFeedbackSchema.index({ interviewId: 1 });
InterviewFeedbackSchema.index({ interviewerId: 1 });
InterviewFeedbackSchema.index({ isActive: 1, createdAt: -1 });
InterviewFeedbackSchema.index({ createdAt: -1 });

export default mongoose.model("InterviewFeedback", InterviewFeedbackSchema);
