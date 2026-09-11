import mongoose from "mongoose";

const Schema = new mongoose.Schema(
  {
    locationName: { type: String, required: true, trim: true, index: true },
    checkinRadius: { type: Number, min: 0, default: 0 },
    latitude: { type: Number, min: -90, max: 90, default: null },
    longitude: { type: Number, min: -180, max: 180, default: null },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    isActive: { type: Boolean, default: true, required: true, index: true },
  },
  { timestamps: true },
);
Schema.index({ createdAt: -1 });
Schema.index({ companyId: 1, locationName: 1 }, { unique: true });

export default mongoose.model("ShiftLocation", Schema);
