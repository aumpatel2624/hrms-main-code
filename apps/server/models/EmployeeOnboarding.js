import mongoose from "mongoose";

// Onboarding checklist (ADR-020, HRMS module 4). No docstatus, no naming
// series, no Project/Task — activities are embedded rows carrying their own
// status; boardingStatus derives directly from them (see
// employeeOnboarding.controller.js's deriveBoardingStatus). Replaces
// source's Task-per-activity + assign-to-User/notify with a plain
// assignedToEmployeeId ref, since this starter has no generic
// assignment/ToDo mechanism.
const BoardingActivitySchema = new mongoose.Schema(
  {
    activityName: { type: String, required: true, trim: true },
    assignedToEmployeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
    description: { type: String, trim: true },
    status: { type: String, enum: ["Pending", "Completed", "Cancelled"], default: "Pending" },
    requiredForEmployeeCreation: { type: Boolean, default: false },
    beginOnDays: { type: Number, min: 0, default: null },
    durationDays: { type: Number, min: 0, default: null },
  },
  { _id: false },
);

const EmployeeOnboardingSchema = new mongoose.Schema(
  {
    jobApplicantId: { type: mongoose.Schema.Types.ObjectId, ref: "JobApplicant", required: true },
    jobOfferId: { type: mongoose.Schema.Types.ObjectId, ref: "JobOffer", required: true },
    employeeOnboardingTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: "EmployeeOnboardingTemplate", default: null },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
    designationId: { type: mongoose.Schema.Types.ObjectId, ref: "Designation", default: null },
    employeeGradeId: { type: mongoose.Schema.Types.ObjectId, ref: "EmployeeGrade", default: null },
    // Auto-resolved on save if empty (an Employee already exists for this
    // applicant); otherwise created later via the makeEmployee action.
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
    employeeName: { type: String, trim: true },
    dateOfJoining: { type: Date, required: true },
    boardingBeginsOn: { type: Date, required: true },
    activities: { type: [BoardingActivitySchema], default: [] },
    boardingStatus: { type: String, enum: ["Pending", "In Process", "Completed"], default: "Pending" },
    isActive: { type: Boolean, default: true, required: true },
  },
  { timestamps: true },
);

EmployeeOnboardingSchema.index({ jobApplicantId: 1 }, { unique: true });
EmployeeOnboardingSchema.index({ jobOfferId: 1 });
EmployeeOnboardingSchema.index({ employeeId: 1 });
EmployeeOnboardingSchema.index({ companyId: 1 });
EmployeeOnboardingSchema.index({ departmentId: 1 });
EmployeeOnboardingSchema.index({ boardingStatus: 1 });
EmployeeOnboardingSchema.index({ isActive: 1, createdAt: -1 });
EmployeeOnboardingSchema.index({ createdAt: -1 });

export default mongoose.model("EmployeeOnboarding", EmployeeOnboardingSchema);
export { BoardingActivitySchema };
