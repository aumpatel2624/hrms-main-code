import mongoose from "mongoose";

/**
 * ADR-032 (Performance, module 16, foundation half). A plain CRUD master —
 * source's real spec set never defines this doctype at all (confirmed by
 * the module's own research pass: no `hrms/hr/doctype/kra/` files exist,
 * despite `Appraisal Template Goal`/`Appraisal KRA`/`Appraisal Goal` all
 * referencing it constantly), so it's built here as the simplest possible
 * shape rather than left as a dangling reference — matching
 * `EmployeeFeedbackCriteria`'s exact shape (a unique name, nothing else).
 */
const KRASchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

KRASchema.index({ name: 1 }, { unique: true });
KRASchema.index({ createdAt: -1 });

export default mongoose.model("KRA", KRASchema);
