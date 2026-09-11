import mongoose from "mongoose";

// ADR-025: one attendance row per employee/day, including shift work.
const AttendanceSchema = new mongoose.Schema(
  {
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", index: true, default: null },
    shiftId: { type: mongoose.Schema.Types.ObjectId, ref: "ShiftType", index: true, default: null },
    attendanceRequestId: { type: mongoose.Schema.Types.ObjectId, ref: "AttendanceRequest", index: true, default: null },
    workingHours: { type: Number, min: 0 },
    standardWorkingHours: { type: Number, min: 0 },
    actualOvertimeDuration: { type: Number, min: 0 },
    lateEntry: { type: Boolean },
    earlyExit: { type: Boolean },
    inTime: { type: Date },
    outTime: { type: Date },
    halfDayStatus: { type: String, enum: ["", "Present", "Absent"] },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    attendanceDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["Present", "Absent", "On Leave", "Half Day", "Work From Home"],
      required: true,
      default: "Present",
    },
    // LeaveApplication doesn't exist in this branch (second fork) — declared
    // by string ref name; Mongoose doesn't need the model registered for a
    // ref field to be valid.
    leaveApplicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveApplication",
      required: false,
      default: null,
    },
    leaveTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveType",
      required: false,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  { timestamps: true },
);

// One row per employee per day — source's real invariant.
AttendanceSchema.index({ employeeId: 1, attendanceDate: 1 }, { unique: true });
AttendanceSchema.index({ companyId: 1 });
AttendanceSchema.index({ leaveApplicationId: 1 });
AttendanceSchema.index({ leaveTypeId: 1 });
AttendanceSchema.index({ status: 1 });
AttendanceSchema.index({ attendanceDate: 1 });
AttendanceSchema.index({ isActive: 1, createdAt: -1 });
AttendanceSchema.index({ createdAt: -1 });

AttendanceSchema.index({ workingHours: 1 });
AttendanceSchema.index({ standardWorkingHours: 1 });
AttendanceSchema.index({ actualOvertimeDuration: 1 });
AttendanceSchema.index({ lateEntry: 1 });
AttendanceSchema.index({ earlyExit: 1 });
AttendanceSchema.index({ inTime: 1 });
AttendanceSchema.index({ outTime: 1 });
AttendanceSchema.index({ halfDayStatus: 1 });

export default mongoose.model("Attendance", AttendanceSchema);
