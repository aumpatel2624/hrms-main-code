import mongoose from "mongoose";

const BranchSchema = new mongoose.Schema(
  {
    branchName: {
      type: String,
      required: true,
      trim: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  { timestamps: true },
);

// ---- indexes ----------------------------------------------------------
// A site/location under a Company (org-chart data: "Vadodara", "USA", ...).
// Plain name label, not a structured Country/State/City address — nobody has
// asked for that yet (ADR-017).
BranchSchema.index({ branchName: 1, companyId: 1 }, { unique: true });
BranchSchema.index({ companyId: 1 });
BranchSchema.index({ isActive: 1, createdAt: -1 });
BranchSchema.index({ createdAt: -1 });

export default mongoose.model("Branch", BranchSchema);
