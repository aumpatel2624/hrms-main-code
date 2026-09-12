import mongoose from "mongoose";

const ExpenseClaimTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: "" },
}, { timestamps: true });

ExpenseClaimTypeSchema.index({ name: 1 }, { unique: true });
ExpenseClaimTypeSchema.index({ createdAt: -1 });

export default mongoose.model("ExpenseClaimType", ExpenseClaimTypeSchema);
