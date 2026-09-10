import mongoose from "mongoose";

const EmploymentTypeSchema = new mongoose.Schema(
  {
    employmentTypeName: {
      type: String,
      required: true,
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

// ---- indexes ----------------------------------------------------------
// Deliberately NOT company-scoped (ADR-017): Frappe's own source doesn't
// scope Employment Type per company either, and with one seeded company the
// distinction is unobservable anyway. Global unique name.
EmploymentTypeSchema.index({ employmentTypeName: 1 }, { unique: true });
EmploymentTypeSchema.index({ isActive: 1, createdAt: -1 });
EmploymentTypeSchema.index({ createdAt: -1 });

export default mongoose.model("EmploymentType", EmploymentTypeSchema);
