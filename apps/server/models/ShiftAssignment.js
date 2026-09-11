import mongoose from "mongoose";

const Schema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", index: true, required: true },
    shiftTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "ShiftType", index: true, required: true },
    shiftLocationId: { type: mongoose.Schema.Types.ObjectId, ref: "ShiftLocation", index: true, default: null },
    shiftScheduleAssignmentId: { type: mongoose.Schema.Types.ObjectId, ref: "ShiftScheduleAssignment", index: true, default: null },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, default: null, index: true },
    status: { type: String, enum: ["active", "inactive", "cancelled"], default: "active", index: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    isActive: { type: Boolean, default: true, required: true, index: true },
  },
  { timestamps: true },
);
Schema.index({ createdAt: -1 });
Schema.index({ employeeId: 1, status: 1, startDate: 1, endDate: 1 });

export default mongoose.model("ShiftAssignment", Schema);
