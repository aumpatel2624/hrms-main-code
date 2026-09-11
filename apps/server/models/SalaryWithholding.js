import mongoose from "mongoose";
import { PAYROLL_FREQUENCIES, deriveWithholdingStatus } from "../utils/salaryWithholdingCycles.js";
const schema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
  fromDate: { type: Date, required: true, index: true },
  payrollFrequency: { type: String, enum: PAYROLL_FREQUENCIES, required: true },
  numberOfWithholdingCycles: { type: Number, required: true, min: 1, validate: Number.isInteger, index: true },
  status: { type: String, enum: ["draft", "withheld", "released", "cancelled"], default: "withheld", index: true },
  cycles: [{
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    isReleased: { type: Boolean, default: false },
    releasedAt: Date,
    releaseReference: { type: String, trim: true },
  }],
}, { timestamps: true, optimisticConcurrency: true });
schema.pre("validate", function () { this.status = deriveWithholdingStatus(this.cycles, this.status); });
schema.index({ employeeId: 1, "cycles.fromDate": 1, "cycles.toDate": 1 });
schema.index({ createdAt: -1 });
export default mongoose.model("SalaryWithholding", schema);
