import mongoose from "mongoose";

/**
 * ADR-021 — explicit typed fields, same reasoning as EmployeeTransfer.
 * currentCtc mirrors source's `fetch_if_empty` semantic (fetched from
 * Employee.ctc only when this field is itself empty — a user-entered value
 * is never clobbered by a later re-fetch); revisedCtc, when set, applies to
 * Employee.ctc on save.
 */
const EmployeePromotionSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    promotionDate: {
      type: Date,
      required: true,
    },
    newDepartmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: false,
      default: null,
    },
    newDesignationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Designation",
      required: false,
      default: null,
    },
    newGradeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmployeeGrade",
      required: false,
      default: null,
    },
    currentCtc: {
      type: Number,
      required: false,
      default: null,
      min: 0,
    },
    revisedCtc: {
      type: Number,
      required: false,
      default: null,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  { timestamps: true },
);

EmployeePromotionSchema.index({ employeeId: 1 });
EmployeePromotionSchema.index({ promotionDate: 1 });
EmployeePromotionSchema.index({ isActive: 1, createdAt: -1 });
EmployeePromotionSchema.index({ createdAt: -1 });

export default mongoose.model("EmployeePromotion", EmployeePromotionSchema);
