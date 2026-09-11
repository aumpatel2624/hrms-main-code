import mongoose from "mongoose";
import { PAYROLL_FREQUENCIES } from "../utils/salaryWithholdingCycles.js";
const ref = (model, required = false) => ({ type: mongoose.Schema.Types.ObjectId, ref: model, required, index: true });
const EmployeeDetailSchema = new mongoose.Schema({
  employeeId: ref("Employee", true),
  employeeName: { type: String, trim: true, required: true },
  departmentId: ref("Department"),
  designationId: ref("Designation"),
  isSalaryWithheld: { type: Boolean, default: false },
  salarySlipId: ref("SalarySlip"),
  status: { type: String, enum: ["pending", "created", "failed", "submitted"], default: "pending" },
  failureReason: { type: String, trim: true, default: "" },
});
const schema = new mongoose.Schema({
  companyId: ref("Company", true),
  startDate: { type: Date, required: true, index: true },
  endDate: { type: Date, required: true, index: true },
  payrollFrequency: { type: String, enum: PAYROLL_FREQUENCIES, required: true, index: true },
  validateAttendance: { type: Boolean, default: false },
  status: { type: String, enum: ["draft", "submitted", "cancelled"], default: "draft", index: true },
  employeeDetails: { type: [EmployeeDetailSchema], default: [] },
}, { timestamps: true, optimisticConcurrency: true });
schema.index({ createdAt: -1 });
export default mongoose.model("PayrollEntry", schema);
