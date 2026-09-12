import mongoose from "mongoose";

// ADR-030 (Tax & Exemptions). Employee substantiated tax exemption proof submission.
export const EmployeeTaxExemptionProofSubmissionDetailSchema = new mongoose.Schema(
  {
    exemptionSubCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmployeeTaxExemptionSubCategory",
      required: true,
    },
    exemptionCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmployeeTaxExemptionCategory",
      required: true,
    },
    maxAmount: { type: Number, default: 0, min: 0 },
    typeOfProof: { type: String, default: "", trim: true },
    amount: { type: Number, min: 0, default: 0 },
    attachProof: { type: String, default: null },
  },
  { _id: true },
);

const EmployeeTaxExemptionProofSubmissionSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    payrollPeriodId: { type: mongoose.Schema.Types.ObjectId, ref: "PayrollPeriod", required: true },
    submissionDate: { type: Date, default: Date.now },
    currency: { type: String, trim: true, default: "INR" },
    taxExemptionProofs: { type: [EmployeeTaxExemptionProofSubmissionDetailSchema], default: [] },
    totalActualAmount: { type: Number, default: 0 },
    exemptionAmount: { type: Number, default: 0 },
    houseRentPaymentAmount: { type: Number, default: null, min: 0 },
    rentedFrom: { type: Date, default: null },
    rentedTo: { type: Date, default: null },
    rentedInMetroCity: { type: Boolean, default: false },
    monthlyHouseRent: { type: Number, default: 0, min: 0 },
    totalEligibleHraExemption: { type: Number, default: 0, min: 0 },
    hraAmount: { type: Number, default: 0, min: 0 },
    attachments: { type: String, default: null },
    status: {
      type: String,
      enum: ["draft", "submitted", "cancelled"],
      default: "draft",
      required: true,
    },
  },
  { timestamps: true },
);

EmployeeTaxExemptionProofSubmissionSchema.index({ employeeId: 1, payrollPeriodId: 1 });
EmployeeTaxExemptionProofSubmissionSchema.index({ companyId: 1, status: 1 });
EmployeeTaxExemptionProofSubmissionSchema.index({ createdAt: -1 });

export default mongoose.model("EmployeeTaxExemptionProofSubmission", EmployeeTaxExemptionProofSubmissionSchema);
