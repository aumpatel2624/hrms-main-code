import mongoose from "mongoose";

const Schema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", index: true, required: true },
    shiftId: { type: mongoose.Schema.Types.ObjectId, ref: "ShiftType", index: true, default: null },
    attendanceId: { type: mongoose.Schema.Types.ObjectId, ref: "Attendance", index: true, default: null },
    time: { type: Date, required: true, default: Date.now, index: true },
    logType: { type: String, enum: ["IN", "OUT", null], default: null, index: true },
    deviceId: { type: String, trim: true },
    skipAutoAttendance: { type: Boolean, default: false, index: true },
    offshift: { type: Boolean, default: true, index: true },
    latitude: { type: Number, min: -90, max: 90, set: v => v == null ? v : Math.round(v * 1e7) / 1e7 },
    longitude: { type: Number, min: -180, max: 180, set: v => v == null ? v : Math.round(v * 1e7) / 1e7 },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    isActive: { type: Boolean, default: true, required: true, index: true },
  },
  { timestamps: true },
);
Schema.index({ createdAt: -1 });
Schema.index({ employeeId: 1, time: 1, logType: 1 }, { unique: true });

export default mongoose.model("EmployeeCheckin", Schema);
