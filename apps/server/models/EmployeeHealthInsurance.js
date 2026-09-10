import mongoose from "mongoose";

const EmployeeHealthInsuranceSchema = new mongoose.Schema(
  {
    providerName: {
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
// Simple lookup master (e.g. "Aetna", "Cigna") — same shape as
// EmploymentType/EmployeeGrade (module 1). Not company-scoped, same
// reasoning as those two: shared vocabulary, no data to justify scoping it.
EmployeeHealthInsuranceSchema.index({ providerName: 1 }, { unique: true });
EmployeeHealthInsuranceSchema.index({ isActive: 1, createdAt: -1 });
EmployeeHealthInsuranceSchema.index({ createdAt: -1 });

export default mongoose.model("EmployeeHealthInsurance", EmployeeHealthInsuranceSchema);
