import mongoose from "mongoose";

/**
 * ADR-022. Source's separate "Training Result"/"Training Result Employee"
 * doctypes (a submittable wrapper around per-attendee scoring, gated on the
 * Training Event already being submitted) fold directly into this
 * document's own `employees[]` rows — once docstatus is gone (ADR-016)
 * there's no remaining reason for a second document. `markCompleted`/
 * `markScheduled` (trainingSkills.controller.js) reproduce source's real
 * `on_update_after_submit` cascade explicitly, since there's no docstatus
 * transition to trigger it automatically.
 */
const TrainingEventAttendeeSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    isMandatory: { type: Boolean, default: false },
    attendance: { type: String, enum: ["Present", "Absent"], default: null },
    status: { type: String, enum: ["Open", "Completed", "Feedback Submitted"], default: "Open" },
    hours: { type: Number, min: 0, default: null },
    grade: { type: String, trim: true },
    comments: { type: String, trim: true },
  },
  { _id: false },
);

const TrainingEventSchema = new mongoose.Schema(
  {
    eventName: {
      type: String,
      required: true,
      trim: true,
    },
    trainingProgramId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TrainingProgram",
      default: null,
    },
    eventStatus: {
      type: String,
      enum: ["Scheduled", "Completed", "Cancelled"],
      default: "Scheduled",
    },
    type: {
      type: String,
      enum: ["Seminar", "Theory", "Workshop", "Conference", "Exam", "Internet", "Self-Study"],
      required: true,
    },
    level: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advance"],
      default: null,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
    },
    trainerName: { type: String, trim: true },
    trainerEmail: { type: String, trim: true },
    supplierName: { type: String, trim: true },
    contactNumber: { type: String, trim: true },
    course: { type: String, trim: true },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    introduction: {
      type: String,
      required: true,
      trim: true,
    },
    employees: {
      type: [TrainingEventAttendeeSchema],
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

TrainingEventSchema.index({ eventName: 1 }, { unique: true });
TrainingEventSchema.index({ trainingProgramId: 1 });
TrainingEventSchema.index({ eventStatus: 1 });
TrainingEventSchema.index({ type: 1 });
TrainingEventSchema.index({ companyId: 1 });
TrainingEventSchema.index({ isActive: 1, createdAt: -1 });
TrainingEventSchema.index({ createdAt: -1 });

export default mongoose.model("TrainingEvent", TrainingEventSchema);
