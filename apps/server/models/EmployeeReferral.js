import mongoose from "mongoose";

/**
 * ADR-021. Three confirmed source bugs fixed, not reproduced: `status`
 * persists whatever it's set to (source force-resets to "Pending" on every
 * save, which meant Rejected/Accepted never actually stuck through a normal
 * save path); `departmentId` fetches from `referrerId` (source's fetch_from
 * pointed at a nonexistent field); `createAdditionalSalary` isn't built at
 * all (Payroll's Additional Salary doesn't exist yet — not a bug fix
 * decision, a deferred-module one, same as Transfer's inter-company path).
 */
const EmployeeReferralSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    fullName: {
      type: String,
      trim: true,
    },
    contactNo: {
      type: String,
      trim: true,
    },
    currentEmployer: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "In Process", "Accepted", "Rejected", "Cancelled"],
      default: "Pending",
      required: true,
    },
    currentJobTitle: {
      type: String,
      trim: true,
    },
    resume: {
      type: String,
      trim: true,
    },
    resumeLink: {
      type: String,
      trim: true,
    },
    // Fetched from referrerId's Employee record — source's own fetch_from
    // pointed at a nonexistent `employee` field, fixed here.
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: false,
      default: null,
    },
    workReferences: {
      type: String,
      trim: true,
    },
    forDesignationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Designation",
      required: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    referrerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    referrerName: {
      type: String,
      trim: true,
    },
    isApplicableForReferralBonus: {
      type: Boolean,
      default: true,
    },
    qualificationReason: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  { timestamps: true },
);

EmployeeReferralSchema.index({ referrerId: 1 });
EmployeeReferralSchema.index({ forDesignationId: 1 });
EmployeeReferralSchema.index({ status: 1 });
// Plain unique-while-not-deleted (the isDeleted:false merge every model
// gets from the soft-delete plugin) — MongoDB partial indexes don't support
// $ne/$in, so "unique only among non-Cancelled rows" can't be expressed at
// the index level; that finer rule is enforced in the controller's own
// duplicate check instead (createEmployeeReferral). A cancelled referral's
// email therefore still occupies the slot at the DB layer — a known,
// narrow simplification, not the common path.
EmployeeReferralSchema.index({ email: 1 }, { unique: true });
EmployeeReferralSchema.index({ isActive: 1, createdAt: -1 });
EmployeeReferralSchema.index({ createdAt: -1 });

export default mongoose.model("EmployeeReferral", EmployeeReferralSchema);
