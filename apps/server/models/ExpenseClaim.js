import mongoose from "mongoose";

const ExpenseClaimDetailSchema = new mongoose.Schema({
  expenseDate: { type: Date, default: Date.now },
  expenseTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "ExpenseClaimType", required: true },
  description: { type: String, trim: true, default: "" },
  amount: { type: Number, required: true, min: 0 },
  sanctionedAmount: { type: Number, min: 0, default: null },
}, { _id: true });

const ExpenseTaxAndChargeSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true },
  rate: { type: Number, default: null, min: 0 },
  taxAmount: { type: Number, default: 0, min: 0 },
}, { _id: true });

const ExpenseClaimSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
  postingDate: { type: Date, default: Date.now, required: true },
  expenseApproverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  expenses: { type: [ExpenseClaimDetailSchema], default: [] },
  taxes: { type: [ExpenseTaxAndChargeSchema], default: [] },
  totalClaimedAmount: { type: Number, default: 0, min: 0 },
  totalSanctionedAmount: { type: Number, default: 0, min: 0 },
  totalTaxesAndCharges: { type: Number, default: 0, min: 0 },
  grandTotal: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ["draft", "approved", "rejected", "submitted", "cancelled"], default: "draft", required: true },
  isPaid: { type: Boolean, default: false },
}, { timestamps: true });

for (const field of ["employeeId", "companyId", "departmentId", "expenseApproverId", "postingDate", "status", "isPaid"]) ExpenseClaimSchema.index({ [field]: 1 });
ExpenseClaimSchema.index({ createdAt: -1 });

export default mongoose.model("ExpenseClaim", ExpenseClaimSchema);
