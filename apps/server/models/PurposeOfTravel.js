import mongoose from "mongoose";

/**
 * ADR-023. Simple master, ADMIN-only per source's literal permission table
 * (only System Manager listed — no HR User/HR Manager row, unlike most
 * masters in this project). No RoleMaster grants for this screen.
 */
const PurposeOfTravelSchema = new mongoose.Schema(
  {
    purposeOfTravelName: {
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

PurposeOfTravelSchema.index({ purposeOfTravelName: 1 }, { unique: true });
PurposeOfTravelSchema.index({ isActive: 1, createdAt: -1 });
PurposeOfTravelSchema.index({ createdAt: -1 });

export default mongoose.model("PurposeOfTravel", PurposeOfTravelSchema);
