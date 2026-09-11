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
    // Retrofitted by ADR-032 (Performance, module 16, foundation half) —
    // source's `Designation.appraisal_template`. The default Appraisal
    // Template an AppraisalCycle's "get eligible employees" action resolves
    // for an employee of this Designation, when the cycle's appraisee row
    // doesn't carry its own override. Optional: a Designation with none set
    // shows up as "template missing" for that action, same as source.
    appraisalTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AppraisalTemplate",
      default: null,
    },
  },
  { timestamps: true },
);

// ---- indexes ----------------------------------------------------------
// Job title master, scoped per company like Department.
DesignationSchema.index({ designationName: 1, companyId: 1 }, { unique: true });
DesignationSchema.index({ companyId: 1 });
DesignationSchema.index({ isActive: 1, createdAt: -1 });
DesignationSchema.index({ createdAt: -1 });

export default mongoose.model("Designation", DesignationSchema);
