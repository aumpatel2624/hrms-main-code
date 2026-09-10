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
    // ADR-024 (Leaves, Department Approver). Self-ref, optional — most
    // departments are flat (no parent). A direct self-reference
    // (parentDepartmentId === _id) is rejected in the controller; a deeper
    // cycle isn't practically preventable without a full graph walk on every
    // write, so utils/approvers.js's chain-walk is depth-bounded instead —
    // a manufactured deep cycle degrades to "approver not found", not an
    // infinite loop. Documented limitation, not a bug.
    parentDepartmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: false,
      default: null,
    },
    // Three approver fallback lists (ADR-024) — plain arrays of User refs,
    // not embedded objects. Matches this project's existing precedent for a
    // bare ref array (Recruitment's Interviewer.interviewers/
    // defaultInterviewers): schema-ready and API-accessible, but not given a
    // multi-select field on the Department form — this admin has no
    // multi-select field type yet, a known simplification, not an oversight.
    leaveApprovers: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    expenseApprovers: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    shiftRequestApprovers: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
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
DepartmentSchema.index({ parentDepartmentId: 1 });
DepartmentSchema.index({ isActive: 1, createdAt: -1 });
DepartmentSchema.index({ createdAt: -1 });

export default mongoose.model("Department", DepartmentSchema);
