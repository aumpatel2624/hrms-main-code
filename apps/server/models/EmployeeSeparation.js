import mongoose from "mongoose";
import { BoardingActivitySchema } from "./EmployeeOnboarding.js";

// Separation checklist (ADR-020) — same activities/boardingStatus shape as
// Employee Onboarding, no Project/Task. Unlike source, this project adds a
// duplicate-active-separation-per-employee guard (a deliberate improvement
// over a gap the source spec flagged explicitly, not silently copied) and
// enforces it here with a real unique index, not just a controller check.
const EmployeeSeparationSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    employeeSeparationTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: "EmployeeSeparationTemplate", default: null },
    boardingBeginsOn: { type: Date, required: true },
    activities: { type: [BoardingActivitySchema], default: [] },
    boardingStatus: { type: String, enum: ["Pending", "In Process", "Completed"], default: "Pending" },
    // Free-text notes only — explicitly NOT linked to the ExitInterview
    // collection (matches source, don't conflate the two).
    exitInterviewSummary: { type: String, trim: true },
    isActive: { type: Boolean, default: true, required: true },
  },
  { timestamps: true },
);

EmployeeSeparationSchema.index({ employeeId: 1 }, { unique: true });
EmployeeSeparationSchema.index({ boardingStatus: 1 });
EmployeeSeparationSchema.index({ isActive: 1, createdAt: -1 });
EmployeeSeparationSchema.index({ createdAt: -1 });

export default mongoose.model("EmployeeSeparation", EmployeeSeparationSchema);
