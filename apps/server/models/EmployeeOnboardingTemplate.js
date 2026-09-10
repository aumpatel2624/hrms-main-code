import mongoose from "mongoose";
import { BoardingActivitySchema } from "./EmployeeOnboarding.js";

// Reusable activity checklist, copied server-side into a new Employee
// Onboarding when selected (ADR-020) — source only did this client-side.
const EmployeeOnboardingTemplateSchema = new mongoose.Schema(
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

EmployeeOnboardingTemplateSchema.index({ title: 1 }, { unique: true });
EmployeeOnboardingTemplateSchema.index({ companyId: 1 });
EmployeeOnboardingTemplateSchema.index({ isActive: 1, createdAt: -1 });
EmployeeOnboardingTemplateSchema.index({ createdAt: -1 });

export default mongoose.model("EmployeeOnboardingTemplate", EmployeeOnboardingTemplateSchema);
