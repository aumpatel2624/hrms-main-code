import mongoose from "mongoose";

// Vacancy posting (ADR-019). `route` is the public-listing slug, server-
// generated when `publish` is set. No daily auto-close job (ADR-016/019) —
// the public listing query filters expired-but-still-"Open" postings out
// at read time instead (see controllers/v1/jobsPublic.controller.js).
// Staffing-plan vacancy fields exist but are unvalidated — Staffing Plan
// doesn't exist until module 5 (OPEN-QUESTIONS.md Q-8).
const JobOpeningSchema = new mongoose.Schema(
  {
    jobTitle: {
      type: String,
      required: true,
      trim: true,
    },
    designationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Designation",
      required: true,
    },
    status: {
      type: String,
      enum: ["Open", "Closed"],
      default: "Open",
      required: true,
    },
    postedOn: {
      type: Date,
      required: true,
      default: Date.now,
    },
    closesOn: {
      type: Date,
      required: false,
      default: null,
    },
    closedOn: {
      type: Date,
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
      required: false,
      default: null,
    },
    employmentTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmploymentType",
      required: false,
      default: null,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: false,
      default: null,
    },
    jobRequisitionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobRequisition",
      required: false,
      default: null,
    },
    // Fetched from jobRequisition.noOfPositions when linked. Present but
    // unvalidated against Staffing Plan (deferred, Q-8).
    vacancies: {
      type: Number,
      required: false,
      default: null,
    },
    staffingPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      default: null,
    },
    plannedVacancies: {
      type: Number,
      required: false,
      default: null,
    },
    publish: {
      type: Boolean,
      default: false,
      required: true,
    },
    preventDuplicateApplicant: {
      type: Boolean,
      default: false,
      required: true,
    },
    // Server-generated slug when publish is true and route is empty:
    // scrub(company) + "/" + scrub(jobTitle) with underscores -> hyphens.
    route: {
      type: String,
      trim: true,
      default: null,
    },
    publishSalaryRange: {
      type: Boolean,
      default: false,
      required: true,
    },
    publishApplicationsReceived: {
      type: Boolean,
      default: true,
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    currency: {
      type: String,
      trim: true,
      default: "USD",
    },
    lowerRange: {
      type: Number,
      required: false,
      default: null,
      min: 0,
    },
    upperRange: {
      type: Number,
      required: false,
      default: null,
      min: 0,
    },
    salaryPer: {
      type: String,
      enum: ["Month", "Year"],
      default: "Month",
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  { timestamps: true },
);

JobOpeningSchema.index({ designationId: 1 });
JobOpeningSchema.index({ companyId: 1 });
JobOpeningSchema.index({ departmentId: 1 });
JobOpeningSchema.index({ employmentTypeId: 1 });
JobOpeningSchema.index({ branchId: 1 });
JobOpeningSchema.index({ jobRequisitionId: 1 });
JobOpeningSchema.index({ status: 1 });
// Not `sparse` — same soft-delete-plugin/partialFilterExpression conflict
// noted throughout modules 1-2; route is only ever set when publish=true.
JobOpeningSchema.index(
  { route: 1 },
  { unique: true, partialFilterExpression: { route: { $type: "string" } } },
);
JobOpeningSchema.index({ publish: 1, status: 1, closesOn: 1 });
JobOpeningSchema.index({ isActive: 1, createdAt: -1 });
JobOpeningSchema.index({ createdAt: -1 });

export default mongoose.model("JobOpening", JobOpeningSchema);
