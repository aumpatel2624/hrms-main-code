import mongoose from "mongoose";

const Schema = new mongoose.Schema(
  {
    frequency: { type: String, enum: ["every-1-week", "every-2-weeks", "every-3-weeks", "every-4-weeks"], default: "every-1-week", index: true },
    repeatOnDays: [{ type: String, enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] }],
    shiftTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "ShiftType", index: true, required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    isActive: { type: Boolean, default: true, required: true, index: true },
  },
  { timestamps: true },
);
Schema.index({ createdAt: -1 });
Schema.pre("validate", function () { this.repeatOnDays = [...new Set(this.repeatOnDays)]; });

export default mongoose.model("ShiftSchedule", Schema);
