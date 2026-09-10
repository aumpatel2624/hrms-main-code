import mongoose from "mongoose";

const DepartmentSchema = new mongoose.Schema(
  {
    departmentName: {
      type: String,
      required: true,
      trim: true,
    },
    // Optional as of ADR-017: the starter's original 6 fixture departments
    // carry a short code (SLS, OPS, ...), but the real Apidel org-chart data
    // has no code concept at all — making this required would force
    // inventing fake codes for 23 real departments. The index below uses a
    // custom partial filter (not `sparse`) so departments without one never
    // collide with each other.
    departmentCode: {
      type: String,
      trim: true,
    },
    // Added by ADR-017 (Organization Setup) — every Department now belongs
    // to exactly one Company (RULES.md INV-8). Required going forward;
    // seed/backfillDepartmentCompany.js assigns it on any pre-existing row.
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
// Every field the controller's `filterable` map exposes needs one, or the
// filter is a collection scan. isDeleted is deliberately NOT indexed on its
// own — see models/softDelete.js: `$ne: true` matches nearly every row and is
// too unselective to help. Compound indexes lead with the selective field.
// Uniqueness is scoped per company (ADR-017), not global as it was before —
// two companies may legitimately both have a "Finance" department.
DepartmentSchema.index({ departmentName: 1, companyId: 1 }, { unique: true });
// Not `sparse` — see models/Company.js's companyCode index for why a custom
// partialFilterExpression is used instead (conflicts with the soft-delete
// plugin's own partial-index rewrite otherwise).
DepartmentSchema.index(
  { departmentCode: 1, companyId: 1 },
  { unique: true, partialFilterExpression: { departmentCode: { $type: "string" } } },
);
DepartmentSchema.index({ companyId: 1 });
DepartmentSchema.index({ isActive: 1, createdAt: -1 });
DepartmentSchema.index({ createdAt: -1 });

export default mongoose.model("Department", DepartmentSchema);
