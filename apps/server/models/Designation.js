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
    // Retrofitted by ADR-022 (Training & Skills, module 6) — source's
    // "Designation Skill" child table, folded into a plain ref array now
    // that Skill exists. Consumed by EmployeeSkillMap.populateFromDesignation.
    skills: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Skill" }],
      default: [],
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
// also carries an appraisal_template ref — a Performance-module concern,
// added as a field here when that module is built, not modelled speculatively
// now.
DesignationSchema.index({ designationName: 1, companyId: 1 }, { unique: true });
DesignationSchema.index({ companyId: 1 });
DesignationSchema.index({ isActive: 1, createdAt: -1 });
DesignationSchema.index({ createdAt: -1 });

export default mongoose.model("Designation", DesignationSchema);
