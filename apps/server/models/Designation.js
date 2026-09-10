import mongoose from "mongoose";

const DesignationSchema = new mongoose.Schema(
  {
    designationName: {
      type: String,
      required: true,
      trim: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
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
// Job title master, scoped per company like Department. Frappe's Designation
// also carries an appraisal_template ref and a Designation Skill child table —
// both are Performance/Skills-module concerns, added as fields here when
// those modules are built (ADR-017), not modelled speculatively now.
DesignationSchema.index({ designationName: 1, companyId: 1 }, { unique: true });
DesignationSchema.index({ companyId: 1 });
DesignationSchema.index({ isActive: 1, createdAt: -1 });
DesignationSchema.index({ createdAt: -1 });

export default mongoose.model("Designation", DesignationSchema);
