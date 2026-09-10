import mongoose from "mongoose";

// ADR-022. Shared master four doctypes hang off: Designation.skills[],
// InterviewType.expectedSkillSet[], InterviewFeedback.skillAssessment[]
// (all retrofitted in this module) and EmployeeSkillMap.employeeSkills[].
const SkillSchema = new mongoose.Schema(
  {
    skillName: {
      type: String,
      required: true,
      trim: true,
    },
    description: { type: String, trim: true },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  { timestamps: true },
);

SkillSchema.index({ skillName: 1 }, { unique: true });
SkillSchema.index({ isActive: 1, createdAt: -1 });
SkillSchema.index({ createdAt: -1 });

export default mongoose.model("Skill", SkillSchema);
