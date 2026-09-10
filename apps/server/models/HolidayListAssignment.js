import mongoose from "mongoose";

/**
 * ADR-024. Source's `assigned_to` is a Dynamic Link (Employee or Company,
 * chosen by `applicable_for`) — modelled here as two nullable ref fields
 * with exactly-one-set validation in the controller, the same
 * discriminator-plus-two-nullable-refs shape this project already uses
 * (no prior "ref to one of several types" precedent existed before this
 * module, so this is the pattern being established).
 */
const HolidayListAssignmentSchema = new mongoose.Schema(
  {
    holidayListId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HolidayList",
      required: true,
    },
    applicableFor: {
      type: String,
      enum: ["Employee", "Company"],
      required: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: false,
      default: null,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: false,
      default: null,
    },
    fromDate: { type: Date, required: true },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  { timestamps: true },
);

HolidayListAssignmentSchema.index({ holidayListId: 1 });
HolidayListAssignmentSchema.index({ employeeId: 1, fromDate: 1 });
HolidayListAssignmentSchema.index({ companyId: 1, fromDate: 1 });
HolidayListAssignmentSchema.index({ isActive: 1, createdAt: -1 });
HolidayListAssignmentSchema.index({ createdAt: -1 });

export default mongoose.model("HolidayListAssignment", HolidayListAssignmentSchema);
