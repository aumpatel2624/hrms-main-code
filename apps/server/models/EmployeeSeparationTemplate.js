import mongoose from "mongoose";
import { BoardingActivitySchema } from "./EmployeeOnboarding.js";

// Structurally identical to EmployeeOnboardingTemplate (source: same shape,
// only the doctype name and permission table differ — Employee Separation
// Template.md).
const EmployeeSeparationTemplateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
    designationId: { type: mongoose.Schema.Types.ObjectId, ref: "Designation", default: null },
    employeeGradeId: { type: mongoose.Schema.Types.ObjectId, ref: "EmployeeGrade", default: null },
    activities: { type: [BoardingActivitySchema], default: [] },
    isActive: { type: Boolean, default: true, required: true },
  },
  { timestamps: true },
);

EmployeeSeparationTemplateSchema.index({ title: 1 }, { unique: true });
EmployeeSeparationTemplateSchema.index({ companyId: 1 });
EmployeeSeparationTemplateSchema.index({ isActive: 1, createdAt: -1 });
EmployeeSeparationTemplateSchema.index({ createdAt: -1 });

export default mongoose.model("EmployeeSeparationTemplate", EmployeeSeparationTemplateSchema);
