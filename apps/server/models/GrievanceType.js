import mongoose from "mongoose";

const GrievanceTypeSchema = new mongoose.Schema(
  {
    grievanceTypeName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
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

GrievanceTypeSchema.index({ grievanceTypeName: 1 }, { unique: true });
GrievanceTypeSchema.index({ isActive: 1, createdAt: -1 });
GrievanceTypeSchema.index({ createdAt: -1 });

export default mongoose.model("GrievanceType", GrievanceTypeSchema);
