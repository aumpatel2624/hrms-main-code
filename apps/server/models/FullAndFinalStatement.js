import mongoose from "mongoose";

// Final-settlement worksheet (ADR-020) — deliberately NOT an accounting
// document. Source drives `status` entirely off a linked Journal Entry and
// auto-populates payables/receivables from Salary Slip/Gratuity/Leave
// Encashment/Asset Movement/a separate Lending app; none of that exists
// here (no GL, per ADR-016 Q-3) and none of those source modules are built
// yet. HR enters line items by hand; totals are still server-computed and
// the settlement guard (every line Settled, every returned asset Returned)
// still gates the markAsPaid action — see fullAndFinalStatement.controller.js.
const OutstandingLineSchema = new mongoose.Schema(
  {
    component: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    amount: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: ["Settled", "Unsettled"], default: "Unsettled" },
  },
  { _id: false },
);

const AllocatedAssetSchema = new mongoose.Schema(
  {
    assetName: { type: String, required: true, trim: true },
    action: { type: String, enum: ["Return", "Recover Cost"], default: "Return" },
    // Required + only meaningful when action = "Recover Cost" — enforced in
    // the controller (Mongoose conditional-required on a sibling field is
    // awkward; the controller check is the real guard, per 20-schema.md's
    // "unique index does the enforcing" precedent applied to conditionals).
    cost: { type: Number, min: 0, default: null },
    status: { type: String, enum: ["Owned", "Returned"], default: "Owned" },
  },
  { _id: false },
);

const FullAndFinalStatementSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
    designationId: { type: mongoose.Schema.Types.ObjectId, ref: "Designation", default: null },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null },
    dateOfJoining: { type: Date, default: null },
    relievingDate: { type: Date, default: null },
    transactionDate: { type: Date, required: true },
    payables: { type: [OutstandingLineSchema], default: [] },
    receivables: { type: [OutstandingLineSchema], default: [] },
    assetsAllocated: { type: [AllocatedAssetSchema], default: [] },
    totalPayableAmount: { type: Number, min: 0, default: 0 },
    totalReceivableAmount: { type: Number, min: 0, default: 0 },
    totalAssetRecoveryCost: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: ["Unpaid", "Paid", "Cancelled"], default: "Unpaid" },
    isActive: { type: Boolean, default: true, required: true },
  },
  { timestamps: true },
);

FullAndFinalStatementSchema.index({ employeeId: 1 });
FullAndFinalStatementSchema.index({ companyId: 1 });
FullAndFinalStatementSchema.index({ status: 1 });
FullAndFinalStatementSchema.index({ isActive: 1, createdAt: -1 });
FullAndFinalStatementSchema.index({ createdAt: -1 });

export default mongoose.model("FullAndFinalStatement", FullAndFinalStatementSchema);
