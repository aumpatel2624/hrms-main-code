import mongoose from "mongoose";

const EmployeeSchema = new mongoose.Schema(
  {
    // Real codes from the org-chart data (A005, U001, ...) — no naming-series
    // engine (ADR-016 idiomatic rebuild); the source data already has a
    // numbering scheme, reused as-is rather than inventing a new one.
    employeeCode: {
      type: String,
      required: true,
      trim: true,
    },
    // Independent of any linked login account — not every Employee has one
    // (ADR-018: bulk-creating 195 real people's login credentials was
    // explicitly rejected).
    employeeName: {
      type: String,
      required: true,
      trim: true,
    },
    // Self-service login link. Optional/nullable — provisioning a specific
    // person's login is deliberate future work, not part of this seed.
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    designationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Designation",
      required: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    // Self-referential — org-chart's "manager" column. Null only for the
    // top-of-hierarchy rows (MD & Founder, CEO).
    reportsToId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: false,
      default: null,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Suspended", "Left"],
      default: "Active",
      required: true,
    },
    dateOfJoining: {
      type: Date,
      required: true,
    },
    // Set later by the Separation module (module 4).
    relievingDate: {
      type: Date,
      required: false,
      default: null,
    },
    // Not in the org-chart CSV — kept for future manual entry.
    dateOfBirth: {
      type: Date,
      required: false,
      default: null,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: false,
      default: null,
    },
    // Optional/unseeded (ADR-018) — the CSV has no employment-type or grade
    // data per employee; forcing a value would mean inventing HR
    // classification facts about real people with no source for them.
    employmentTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmploymentType",
      required: false,
      default: null,
    },
    gradeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmployeeGrade",
      required: false,
      default: null,
    },
    // Fields exist now (Employee Core Model Part A) so Leaves/Expenses/Shift
    // Request don't need a later Employee schema change — the scoping
    // mechanism that reads them is still open (OPEN-QUESTIONS.md Q-4).
    expenseApproverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
    leaveApproverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
    shiftRequestApproverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
    healthInsuranceProviderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmployeeHealthInsurance",
      required: false,
      default: null,
    },
    healthInsuranceNo: {
      type: String,
      trim: true,
      required: false,
    },
    // Placeholder fields (ADR-018) preserving real org-chart data
    // (CSV "shift"/"work_mode" columns) ahead of the real Shift & Attendance
    // module (module 9) — not a preview of that module's design.
    shiftPreference: {
      type: String,
      enum: ["Day", "Night", "UK"],
      required: false,
      default: null,
    },
    workMode: {
      type: String,
      enum: ["WFO", "WFH"],
      required: false,
      default: null,
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
// employeeCode is globally unique (matches Frappe's own single `name`
// namespace — ADR-018). userId unique-when-set uses a custom partial filter,
// not `sparse`, for the same reason Company.companyCode/Department.
// departmentCode do (models/softDelete.js's own partialFilterExpression
// rewrite conflicts with `sparse` on the same index).
EmployeeSchema.index({ employeeCode: 1 }, { unique: true });
EmployeeSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: "objectId" } } },
);
EmployeeSchema.index({ companyId: 1 });
EmployeeSchema.index({ departmentId: 1 });
EmployeeSchema.index({ designationId: 1 });
EmployeeSchema.index({ branchId: 1 });
EmployeeSchema.index({ reportsToId: 1 });
EmployeeSchema.index({ status: 1 });
EmployeeSchema.index({ isActive: 1, createdAt: -1 });
EmployeeSchema.index({ createdAt: -1 });

export default mongoose.model("Employee", EmployeeSchema);
