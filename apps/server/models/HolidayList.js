import mongoose from "mongoose";

/**
 * ADR-024. Source treats Holiday List as an external core doctype this
 * module only reads; this project has no such external dependency, so it is
 * folded in here as its own collection — `holidays[]` is the source's
 * separate `Holiday` child-table doctype, embedded (bounded, always read
 * with its parent, per docs/conventions/20-schema.md).
 */
const HolidaySchema = new mongoose.Schema(
  {
    holidayDate: { type: Date, required: true },
    description: { type: String, trim: true },
    weeklyOff: { type: Boolean, default: false },
  },
  { _id: false },
);

const HolidayListSchema = new mongoose.Schema(
  {
    holidayListName: { type: String, required: true, trim: true },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    holidays: { type: [HolidaySchema], default: [] },
    // A genuinely derivable cached field (unlike Leave Allocation's total,
    // which the ADR explicitly says NOT to trust) — trivial to recompute on
    // every save, kept in sync by the pre-save hook below rather than
    // trusting a client-supplied value.
    totalHolidays: { type: Number, default: 0 },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  { timestamps: true },
);

HolidayListSchema.pre("save", function computeTotalHolidays(next) {
  this.totalHolidays = (this.holidays || []).length;
  next();
});

HolidayListSchema.index({ companyId: 1 });
HolidayListSchema.index({ fromDate: 1, toDate: 1 });
HolidayListSchema.index({ isActive: 1, createdAt: -1 });
HolidayListSchema.index({ createdAt: -1 });

export default mongoose.model("HolidayList", HolidayListSchema);
