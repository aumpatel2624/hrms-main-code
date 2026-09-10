import mongoose from "mongoose";

/**
 * Append-only change-log entry, written by Employee Transfer/Promotion
 * (ADR-021) — the safe, narrow replacement for source's generic
 * `Employee Property History` (a {fieldname, current, new} row applied via
 * Python `setattr`, whose own Port Notes flag the exclusion list protecting
 * fields like `status`/`ctc` as client-only, not server-enforced). No
 * generic field-setter here: Transfer/Promotion write explicit, known
 * fields only, and log what they changed for the audit trail.
 */
const EmployeePropertyChangeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    field: {
      type: String,
      required: true,
      trim: true,
    },
    oldValue: {
      type: String,
      trim: true,
    },
    newValue: {
      type: String,
      trim: true,
    },
    effectiveDate: {
      type: Date,
      required: true,
    },
    sourceDocType: {
      type: String,
      enum: ["EmployeeTransfer", "EmployeePromotion"],
      required: true,
    },
    sourceDocId: {
      type: mongoose.Schema.Types.ObjectId,
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

EmployeePropertyChangeSchema.index({ employeeId: 1, createdAt: -1 });
EmployeePropertyChangeSchema.index({ sourceDocType: 1, sourceDocId: 1 });
EmployeePropertyChangeSchema.index({ createdAt: -1 });

export default mongoose.model("EmployeePropertyChange", EmployeePropertyChangeSchema);
