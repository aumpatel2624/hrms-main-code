import mongoose from "mongoose";

/**
 * ADR-025 (module complete — second/transactional fork), with an approval
 * step added after the pre-production simulation: create records an "open"
 * request naming `approverId` (the employee's resolved Shift Approver, or
 * null — then only HR decides); `approve` writes/updates one `Attendance`
 * row per covered day and sets "active"; `reject` sets "rejected". "active"
 * keeps its old meaning (applied), so rows written before the approval step
 * need no backfill. `cancel` soft-deletes the specific `Attendance` rows this
 * request created (tracked via `Attendance.attendanceRequestId`), reusing
 * `LeaveApplication.cancel`'s soft-delete-reversal pattern (ADR-024).
 */
const AttendanceRequestSchema = new mongoose.Schema(
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
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    halfDay: { type: Boolean, default: false },
    includeHolidays: { type: Boolean, default: false },
    halfDayDate: { type: Date, required: false, default: null },
    reason: {
      type: String,
      enum: ["Work From Home", "On Duty"],
      required: true,
    },
    explanation: { type: String, trim: true, default: "" },
    approverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: false,
      default: null,
    },
    status: {
      type: String,
      enum: ["open", "active", "rejected", "cancelled"],
      default: "open",
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

AttendanceRequestSchema.index({ employeeId: 1, status: 1 });
AttendanceRequestSchema.index({ companyId: 1 });
AttendanceRequestSchema.index({ status: 1 });
AttendanceRequestSchema.index({ approverId: 1 });
AttendanceRequestSchema.index({ reason: 1 });
AttendanceRequestSchema.index({ fromDate: 1 });
AttendanceRequestSchema.index({ toDate: 1 });
AttendanceRequestSchema.index({ employeeId: 1, fromDate: 1, toDate: 1 });
AttendanceRequestSchema.index({ isActive: 1, createdAt: -1 });
AttendanceRequestSchema.index({ createdAt: -1 });

export default mongoose.model("AttendanceRequest", AttendanceRequestSchema);
