import mongoose from "mongoose";

// Simple master (ADR-019) — where a Job Applicant came from. Seeded with a
// small starter set (Referral, Job Board, LinkedIn, Career Site, Walk-in),
// not derived from any real data.
const JobApplicantSourceSchema = new mongoose.Schema(
  {
    sourceName: {
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

JobApplicantSourceSchema.index({ sourceName: 1 }, { unique: true });
JobApplicantSourceSchema.index({ isActive: 1, createdAt: -1 });
JobApplicantSourceSchema.index({ createdAt: -1 });

export default mongoose.model("JobApplicantSource", JobApplicantSourceSchema);
