import mongoose from "mongoose";

const CompanySchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    companyCode: {
      type: String,
      trim: true,
    },
    // ADR-034 (Regional). Optional HRA exemption inputs; no country dispatch
    // layer is needed because the calculation is gated by these real values.
    basicComponentId: { type: mongoose.Schema.Types.ObjectId, ref: "SalaryComponent", default: null },
    hraComponentId: { type: mongoose.Schema.Types.ObjectId, ref: "SalaryComponent", default: null },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  { timestamps: true },
);

// ---- indexes ----------------------------------------------------------
// Top of the multi-company hierarchy (ADR-016/ADR-017) — every Branch,
// Department, Designation and (from module 2 on) Employee foreign-keys here.
// companyCode is sparse: not every company needs a short code, but the ones
// that have one must not collide.
CompanySchema.index({ companyName: 1 }, { unique: true });
// Not `sparse` — the soft-delete plugin (models/softDelete.js) merges its own
// `partialFilterExpression: { isDeleted: false }` into every `unique: true`
// index, and MongoDB rejects mixing `sparse` with `partialFilterExpression`
// on the same index. A custom partial filter achieves the same "only unique
// among rows that actually have one" result without that conflict.
CompanySchema.index(
  { companyCode: 1 },
  { unique: true, partialFilterExpression: { companyCode: { $type: "string" } } },
);
CompanySchema.index({ isActive: 1, createdAt: -1 });
CompanySchema.index({ createdAt: -1 });
CompanySchema.index({ basicComponentId: 1 });
CompanySchema.index({ hraComponentId: 1 });

export default mongoose.model("Company", CompanySchema);
