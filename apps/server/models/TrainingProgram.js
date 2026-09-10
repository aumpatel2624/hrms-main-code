import mongoose from "mongoose";

// ADR-022. No docstatus — status is a plain user-set field, matching source
// (no controller logic drives it there either).
const TrainingProgramSchema = new mongoose.Schema(
  {
    trainingProgramName: {
      type: String,
      required: true,
      trim: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    trainerName: { type: String, trim: true },
    trainerEmail: { type: String, trim: true },
    supplierName: { type: String, trim: true },
    contactNumber: { type: String, trim: true },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Scheduled", "Completed", "Cancelled"],
      default: "Scheduled",
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  { timestamps: true },
);

TrainingProgramSchema.index({ trainingProgramName: 1 }, { unique: true });
TrainingProgramSchema.index({ companyId: 1 });
TrainingProgramSchema.index({ status: 1 });
TrainingProgramSchema.index({ isActive: 1, createdAt: -1 });
TrainingProgramSchema.index({ createdAt: -1 });

export default mongoose.model("TrainingProgram", TrainingProgramSchema);
