import mongoose from "mongoose";

const Schema = new mongoose.Schema(
  {
    shiftTypeName: { type: String, required: true, trim: true, index: true },
    startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    endTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    holidayListId: { type: mongoose.Schema.Types.ObjectId, ref: "HolidayList", index: true, default: null },
    determineCheckInAndCheckOut: { type: String, enum: ["alternating-entries", "strict-in-out"], default: "alternating-entries" },
    workingHoursCalculationBasis: { type: String, enum: ["first-and-last", "every-valid-pair"], default: "first-and-last" },
    color: { type: String, enum: ["Blue", "Cyan", "Fuchsia", "Green", "Lime", "Orange", "Pink", "Red", "Violet", "Yellow"], default: "Blue" },
    processAttendanceAfter: { type: Date, required: function () { return this.enableAutoAttendance; } },
    lastSyncOfCheckin: { type: Date, default: null },
    workingHoursThresholdForHalfDay: { type: Number, min: 0, default: 0 },
    workingHoursThresholdForAbsent: { type: Number, min: 0, default: 0 },
    beginCheckInBeforeShiftStartTime: { type: Number, min: 0, default: 60 },
    allowCheckOutAfterShiftEndTime: { type: Number, min: 0, default: 60 },
    lateEntryGracePeriod: { type: Number, min: 0, default: 0 },
    earlyExitGracePeriod: { type: Number, min: 0, default: 0 },
    enableAutoAttendance: { type: Boolean, default: false, index: true },
    markAutoAttendanceOnHolidays: { type: Boolean, default: false },
    enableLateEntryMarking: { type: Boolean, default: false },
    enableEarlyExitMarking: { type: Boolean, default: false },
    autoUpdateLastSync: { type: Boolean, default: false },
    allowOvertime: { type: Boolean, default: false },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    isActive: { type: Boolean, default: true, required: true, index: true },
  },
  { timestamps: true },
);
Schema.index({ createdAt: -1 });

Schema.index({ companyId: 1, shiftTypeName: 1 }, { unique: true });
Schema.pre("validate", function () {
  if (!this.startTime || !this.endTime) return;
  const minutes = t => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  const duration = (minutes(this.endTime) - minutes(this.startTime) + 1440) % 1440;
  if (!duration) this.invalidate("endTime", "Start time and end time cannot be same");
  if (duration + this.beginCheckInBeforeShiftStartTime + this.allowCheckOutAfterShiftEndTime >= 1440) {
    this.invalidate("endTime", "Shift duration including buffers must be under 24 hours");
  }
});

export default mongoose.model("ShiftType", Schema);
