import mongoose from "mongoose";

// ADR-022. Guards (event Completed, employee was an attendee, attendance
// not Absent) enforced in the controller — replaces source's docstatus=1
// check with the equivalent eventStatus check.
const TrainingFeedbackSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    trainingEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TrainingEvent",
      required: true,
    },
    feedback: {
      type: String,
      required: true,
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

TrainingFeedbackSchema.index({ employeeId: 1 });
TrainingFeedbackSchema.index({ trainingEventId: 1 });
TrainingFeedbackSchema.index({ isActive: 1, createdAt: -1 });
TrainingFeedbackSchema.index({ createdAt: -1 });

export default mongoose.model("TrainingFeedback", TrainingFeedbackSchema);
