import mongoose from "mongoose";

const Schema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", index: true, required: true },
    shiftScheduleId: { type: mongoose.Schema.Types.ObjectId, ref: "ShiftSchedule", index: true, required: true },
    shiftLocationId: { type: mongoose.Schema.Types.ObjectId, ref: "ShiftLocation", index: true, default: null },
    enabled: { type: Boolean, default: true, index: true },
    createShiftsAfter: { type: Date, default: () => new Date(new Date().toISOString().slice(0, 10)), required: function () { return this.enabled; }, index: true },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    isActive: { type: Boolean, default: true, required: true, index: true },
  },
  { timestamps: true },
);
Schema.index({ createdAt: -1 });

export default mongoose.model("ShiftScheduleAssignment", Schema);
