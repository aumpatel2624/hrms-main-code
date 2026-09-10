import mongoose from "mongoose";

/**
 * ADR-021. Source's polymorphic `grievance_against_party`/`grievance_against`
 * (any DocType/any record) becomes a plain optional Employee ref plus a
 * free-text fallback — this project's entity set doesn't warrant a generic
 * document reference. `associated_document_type`/`associated_document`
 * (a second, unrelated polymorphic pair) is dropped entirely. No docstatus —
 * source itself has no state-machine guard on `status`, only conditional-
 * required fields, enforced in the controller.
 */
const EmployeeGrievanceSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    raisedByEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["Open", "Investigated", "Resolved", "Invalid", "Cancelled"],
      default: "Open",
      required: true,
    },
    grievanceTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GrievanceType",
      required: true,
    },
    grievanceAgainstEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: false,
      default: null,
    },
    grievanceAgainstText: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    // Required when status is Investigated or Resolved — enforced in the
    // controller (mandatory_depends_on has no schema-level equivalent).
    causeOfGrievance: {
      type: String,
      trim: true,
    },
    resolvedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
    resolutionDate: {
      type: Date,
      required: false,
      default: null,
    },
    resolutionDetail: {
      type: String,
      trim: true,
    },
    employeeResponsibleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
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

EmployeeGrievanceSchema.index({ raisedByEmployeeId: 1 });
EmployeeGrievanceSchema.index({ grievanceTypeId: 1 });
EmployeeGrievanceSchema.index({ grievanceAgainstEmployeeId: 1 });
EmployeeGrievanceSchema.index({ status: 1 });
EmployeeGrievanceSchema.index({ date: 1 });
EmployeeGrievanceSchema.index({ isActive: 1, createdAt: -1 });
EmployeeGrievanceSchema.index({ createdAt: -1 });

export default mongoose.model("EmployeeGrievance", EmployeeGrievanceSchema);
