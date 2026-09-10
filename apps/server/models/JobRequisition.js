import mongoose from "mongoose";

// Headcount request (ADR-019). No docstatus, no naming series (ADR-016) —
// status is the sole state machine, and source itself enforces no
// transition graph beyond "completedOn required when Filled", so this
// port doesn't invent restrictions either.
const JobRequisitionSchema = new mongoose.Schema(
  {
    designationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Designation",
      required: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: false,
      default: null,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    noOfPositions: {
      type: Number,
      required: true,
      min: 0,
    },
    expectedCompensation: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["Pending", "Open & Approved", "Rejected", "Filled", "On Hold", "Cancelled"],
      default: "Pending",
      required: true,
    },
    requestedById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    postingDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expectedBy: {
      type: Date,
      required: false,
      default: null,
    },
    // Required only when status = Filled — validated in the controller, not
    // a schema-level conditional (Mongoose doesn't do cross-field `required`
    // cleanly), matching source's `depends_on`/`mandatory_depends_on` intent.
    completedOn: {
      type: Date,
      required: false,
      default: null,
    },
    description: {
      type: String,
      trim: true,
    },
    reasonForRequesting: {
      type: String,
      trim: true,
    },
    // Computed: completedOn - postingDate, in seconds, set only when status
    // becomes Filled and completedOn is set. Not recalculated/cleared
    // otherwise (matches source).
    timeToFillSeconds: {
      type: Number,
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

JobRequisitionSchema.index({ designationId: 1 });
JobRequisitionSchema.index({ departmentId: 1 });
JobRequisitionSchema.index({ companyId: 1 });
JobRequisitionSchema.index({ requestedById: 1 });
JobRequisitionSchema.index({ status: 1 });
JobRequisitionSchema.index({ isActive: 1, createdAt: -1 });
JobRequisitionSchema.index({ createdAt: -1 });

export default mongoose.model("JobRequisition", JobRequisitionSchema);
