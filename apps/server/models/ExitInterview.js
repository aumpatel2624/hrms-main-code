import mongoose from "mongoose";

// Exit interview record (ADR-020). No docstatus, no naming series, no
// email-thread/Web-Form questionnaire flow (infra this starter doesn't
// have). interviewers are Employee refs, not raw User/Role links, matching
// this HR context (same reasoning as EmployeeBoardingActivity).
const ExitInterviewSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    status: { type: String, enum: ["Pending", "Scheduled", "Completed", "Cancelled"], default: "Pending" },
    date: { type: Date, default: null },
    interviewers: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Employee" }], default: [] },
    interviewSummary: { type: String, trim: true },
    employeeStatus: { type: String, enum: ["Employee Retained", "Exit Confirmed"], default: null },
    isActive: { type: Boolean, default: true, required: true },
  },
  { timestamps: true },
);

ExitInterviewSchema.index({ employeeId: 1 });
ExitInterviewSchema.index({ status: 1 });
ExitInterviewSchema.index({ isActive: 1, createdAt: -1 });
ExitInterviewSchema.index({ createdAt: -1 });

export default mongoose.model("ExitInterview", ExitInterviewSchema);
