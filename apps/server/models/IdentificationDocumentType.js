import mongoose from "mongoose";

/**
 * ADR-018/ADR-023. Simple master, ADMIN-only per source's literal
 * permission table (only System Manager listed). No RoleMaster grants.
 */
const IdentificationDocumentTypeSchema = new mongoose.Schema(
  {
    identificationDocumentTypeName: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  { timestamps: true },
);

IdentificationDocumentTypeSchema.index({ identificationDocumentTypeName: 1 }, { unique: true });
IdentificationDocumentTypeSchema.index({ isActive: 1, createdAt: -1 });
IdentificationDocumentTypeSchema.index({ createdAt: -1 });

export default mongoose.model("IdentificationDocumentType", IdentificationDocumentTypeSchema);
