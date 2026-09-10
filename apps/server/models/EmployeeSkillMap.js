import mongoose from "mongoose";

// ADR-022. `populateFromDesignation` (trainingSkills.controller.js) is the
// server-side version of source's client-only "copy Designation.skills in
// with a default proficiency" convenience.
const EmployeeSkillSchema = new mongoose.Schema(
  {
    skillId: { type: mongoose.Schema.Types.ObjectId, ref: "Skill", required: true },
    proficiency: { type: Number, min: 1, max: 5, default: 3 },
  },
  { _id: false },
);

const EmployeeSkillMapSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    employeeSkills: {
      type: [EmployeeSkillSchema],
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

EmployeeSkillMapSchema.index({ employeeId: 1 }, { unique: true });
EmployeeSkillMapSchema.index({ isActive: 1, createdAt: -1 });
EmployeeSkillMapSchema.index({ createdAt: -1 });

export default mongoose.model("EmployeeSkillMap", EmployeeSkillMapSchema);
