import mongoose from "mongoose";

// ADR-027 (Payroll — Run). Company-scoped date-range bookkeeping used to
// resolve "which payroll period does this Salary Slip fall in" for holiday
// scoping — deliberately shrunk from source's own doctype, which also drives
// income-tax annualization (deferred, see DECISIONS.md ADR-027: no
// Income Tax Slab yet). `Payroll Period Date` (source's child table) is a
// confirmed-dead field in source itself and is not ported at all.
//
// Overlap is rejected only within the same company — two different
// companies' periods may freely overlap (per ADR-027, matching source: a
// Payroll Period has no cross-company meaning).
const PayrollPeriodSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true, required: true },
  },
  { timestamps: true },
);

PayrollPeriodSchema.index({ companyId: 1 });
PayrollPeriodSchema.index({ startDate: 1 });
PayrollPeriodSchema.index({ endDate: 1 });
PayrollPeriodSchema.index({ isActive: 1, createdAt: -1 });
PayrollPeriodSchema.index({ createdAt: -1 });

export default mongoose.model("PayrollPeriod", PayrollPeriodSchema);
