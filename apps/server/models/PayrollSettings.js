import mongoose from "mongoose";

/**
 * ADR-027 (Payroll — Run). A true global singleton, same exact pattern as
 * `SeoSettings.js` — a constant `key` carrying the uniqueness via a real
 * unique index, not a controller-only convention (survives a concurrent
 * double-save the way a controller-only convention doesn't).
 *
 * Fields are limited to what this module's own payment-days calculation
 * genuinely reads (see utils/payrollPaymentDays.js) — everything else
 * source's `Payroll Settings` holds (email/PDF passwords, GL posting mode,
 * timesheet-hours cap, overtime-slip gating, mandatory-benefit-application)
 * is out of scope for the same reasons named elsewhere in ADR-027: no email
 * infrastructure decision, no GL, no Timesheet, no Overtime Slip, no
 * Employee Benefit Application module. Distinct singleton from the
 * still-deferred `HR Settings` (ADR-017) — a different real consumer.
 */
const PayrollSettingsSchema = new mongoose.Schema(
  {
    // Constant. The only reason this field exists is to hang a unique index on.
    key: { type: String, default: "default", required: true },

    payrollBasedOn: { type: String, enum: ["Attendance", "Leave Application"], default: "Attendance" },
    considerUnmarkedAttendanceAs: { type: String, enum: ["Present", "Absent"], default: "Absent" },
    includeHolidaysInTotalWorkingDays: { type: Boolean, default: false },
    considerMarkedAttendanceOnHolidays: { type: Boolean, default: false },
    dailyWagesFractionForHalfDay: { type: Number, default: 0.5, min: 0, max: 1 },
    disableRoundedTotal: { type: Boolean, default: false },
    showLeaveBalancesInSalarySlip: { type: Boolean, default: true },
  },
  { timestamps: true },
);

PayrollSettingsSchema.index({ key: 1 }, { unique: true });

export default mongoose.model("PayrollSettings", PayrollSettingsSchema);
