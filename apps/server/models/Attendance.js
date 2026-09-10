import mongoose from "mongoose";

/**
 * ADR-024. Minimal shape now — module 9 (Shift & Attendance) extends this
 * with shift assignment, check-in/out and geolocation; it does not rebuild
 * it. Built now because Leave Application's real on-submit behavior
 * creates/checks Attendance rows and Compensatory Leave Request's
 * validation checks against them, and both are module-8-second-fork work
 * that needs the collection to exist. Same precedent as module 2 adding
 * Employee's three approver fields early for modules that needed them later.
 */
const AttendanceSchema = new mongoose.Schema(
  {
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

export default mongoose.model("Attendance", AttendanceSchema);
