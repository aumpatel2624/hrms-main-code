import mongoose from "mongoose";

/**
 * ADR-021 — explicit typed fields (department/designation/branch), not
 * source's generic {fieldname, current, new} mechanism. No inter-company
 * ("create new employee id") path — deferred, deliberately out of scope
 * (see ADR-021). No docstatus/naming series (ADR-016).
 */
const EmployeeTransferSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    transferDate: {
      type: Date,
      required: true,
    },
    newDepartmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: false,
      default: null,
    },
    newDesignationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Designation",
      required: false,
      default: null,
    },
    newBranchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: false,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  { timestamps: true },
);

EmployeeTransferSchema.index({ employeeId: 1 });
EmployeeTransferSchema.index({ transferDate: 1 });
EmployeeTransferSchema.index({ isActive: 1, createdAt: -1 });
EmployeeTransferSchema.index({ createdAt: -1 });

export default mongoose.model("EmployeeTransfer", EmployeeTransferSchema);
