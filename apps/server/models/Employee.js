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
    employeeName: {
      type: String,
      required: true,
      trim: true,
    },
    // Login/session identity (ADR-040: merged in from the former separate
    // `User` collection — this company confirmed every Employee always has
    // exactly one login, so the two-collection split was pure duplication).
    // This same document IS the login now; `req.user.id` from the session
    // equals this Employee's own `_id`, no separate identity to resolve.
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      trim: true,
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RoleMaster",
      required: true,
    },
    mobileNumber: {
      type: String,
      required: false,
      trim: true,
    },
    countryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Country",
      required: false,
      default: null,
    },
    stateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "State",
      required: false,
      default: null,
    },
    cityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "City",
      required: false,
      default: null,
    },
    address: {
      type: String,
      required: false,
      trim: true,
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
      ref: "Employee",
      required: false,
      default: null,
    },
    leaveApproverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: false,
      default: null,
    },
    shiftRequestApproverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
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
    // Plain "current total comp" figure (ADR-021) — Payroll's real Salary
    // Structure is modules away; Employee Promotion needs somewhere to
    // read/write this today. Revisit when Payroll exists.
    ctc: {
      type: Number,
      required: false,
      default: null,
      min: 0,
    },
    // Set when this Employee originated from a hired candidate (ADR-019,
    // Recruitment module). Drives the reverse hook in
    // employee.controller.js's create path: flips the linked JobApplicant
    // and its open JobOffer to Accepted.
    jobApplicantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobApplicant",
      required: false,
      default: null,
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
    // ADR-034 (Regional). Identity/banking values collected ahead of an
    // automated consumer, matching the EmployeeOtherIncome precedent.
    ifscCode: { type: String, trim: true, default: null },
    panNumber: { type: String, trim: true, default: null },
    micrCode: { type: String, trim: true, default: null },
    providentFundAccount: { type: String, trim: true, default: null },
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
// namespace — ADR-016). email is this document's login identity now
// (ADR-040) — its own `unique: true` on the field above already indexes it.
EmployeeSchema.index({ employeeCode: 1 }, { unique: true });
EmployeeSchema.index({ roleId: 1 });
EmployeeSchema.index({ companyId: 1 });
EmployeeSchema.index({ departmentId: 1 });
EmployeeSchema.index({ designationId: 1 });
EmployeeSchema.index({ branchId: 1 });
EmployeeSchema.index({ reportsToId: 1 });
EmployeeSchema.index({ jobApplicantId: 1 });
EmployeeSchema.index({ status: 1 });
EmployeeSchema.index({ isActive: 1, createdAt: -1 });
EmployeeSchema.index({ createdAt: -1 });

export default mongoose.model("Employee", EmployeeSchema);
