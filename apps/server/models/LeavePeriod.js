import mongoose from "mongoose";

/** ADR-024. A named date range Leave Policy Assignments/Allocations scope to. */
const LeavePeriodSchema = new mongoose.Schema(
  {
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    optionalHolidayListId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HolidayList",
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

LeavePeriodSchema.index({ companyId: 1 });
LeavePeriodSchema.index({ optionalHolidayListId: 1 });
LeavePeriodSchema.index({ fromDate: 1, toDate: 1 });
LeavePeriodSchema.index({ isActive: 1, createdAt: -1 });
LeavePeriodSchema.index({ createdAt: -1 });

export default mongoose.model("LeavePeriod", LeavePeriodSchema);
