import mongoose from "mongoose";

// Reusable interview-round definition (ADR-019). Frappe's separate
// "Interviewer" child-table doctype (default interviewer pool) is folded
// into a plain array of User refs — bounded, never queried independently.
// Expected-skills-to-assess is dropped for now: it references Skill, which
// doesn't exist until module 6 (Training & Skills) — OPEN-QUESTIONS.md Q-9.
const InterviewTypeSchema = new mongoose.Schema(
  {
    interviewTypeName: {
      type: String,
      required: true,
      trim: true,
    },
    designationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Designation",
      required: false,
      default: null,
    },
    expectedAverageRating: {
      type: Number,
      required: false,
      default: null,
    },
    defaultInterviewers: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
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

InterviewTypeSchema.index({ interviewTypeName: 1 }, { unique: true });
InterviewTypeSchema.index({ designationId: 1 });
InterviewTypeSchema.index({ isActive: 1, createdAt: -1 });
InterviewTypeSchema.index({ createdAt: -1 });

export default mongoose.model("InterviewType", InterviewTypeSchema);
