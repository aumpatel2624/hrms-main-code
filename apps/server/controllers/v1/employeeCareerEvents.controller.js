/**
 * Employee Transfer + Employee Promotion (ADR-021, HRMS module 5). Explicit
 * typed fields, not source's generic {fieldname, current, new} setattr
 * mechanism — applying a change is a plain field assignment plus an
 * EmployeePropertyChange log entry. No inter-company transfer path
 * (deferred). No docstatus/naming series (ADR-016).
 */
import EmployeeTransfer from "../../models/EmployeeTransfer.js";
import EmployeePromotion from "../../models/EmployeePromotion.js";
import EmployeePropertyChange from "../../models/EmployeePropertyChange.js";
import Employee from "../../models/Employee.js";
import { runListQuery } from "../../utils/listQuery.js";
import {
  getReferencingCounts,
  formatReferenceMessage,
} from "../../utils/referenceHelper.js";

// Applies whichever new*Id fields are set and differ from the Employee's
// current value; writes one EmployeePropertyChange row per applied change.
const applyPropertyChanges = async (employee, changes, effectiveDate, sourceDocType, sourceDocId) => {
  const entries = [];
  for (const { field, employeeField, newValue } of changes) {
    if (!newValue) continue;
    const oldValue = employee[employeeField] ? String(employee[employeeField]) : null;
    const newValueStr = String(newValue);
    if (oldValue === newValueStr) continue;
    employee[employeeField] = newValue;
    entries.push({
      employeeId: employee._id, field, oldValue, newValue: newValueStr,
      effectiveDate, sourceDocType, sourceDocId,
    });
  }
  if (entries.length) await EmployeePropertyChange.insertMany(entries);
  return entries.length > 0;
};

// ------------------------------------------------------------- Employee Transfer --

export const createEmployeeTransfer = async (req, res) => {
  try {
    const { employeeId, transferDate, newDepartmentId, newDesignationId, newBranchId } = req.body;
    if (!employeeId || !transferDate) {
      return res.status(400).json({ isOk: false, status: 400, message: "Employee and Transfer Date are required" });
    }
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee not found" });
    }
    if (employee.status !== "Active") {
      return res.status(400).json({ isOk: false, status: 400, message: "Employee Transfer can only be created for an Active employee" });
    }

    const doc = await EmployeeTransfer.create({ employeeId, transferDate, newDepartmentId, newDesignationId, newBranchId });

    const changed = await applyPropertyChanges(
      employee,
      [
        { field: "department", employeeField: "departmentId", newValue: newDepartmentId },
        { field: "designation", employeeField: "designationId", newValue: newDesignationId },
        { field: "branch", employeeField: "branchId", newValue: newBranchId },
      ],
      transferDate, "EmployeeTransfer", doc._id,
    );
    if (changed) await employee.save();

    return res.status(201).json({ isOk: true, status: 201, message: "Employee Transfer created successfully" });
  } catch (error) {
    console.log("Error in createEmployeeTransfer", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteEmployeeTransfer = async (req, res) => {
  try {
    const { transferId } = req.params;
    const doc = await EmployeeTransfer.findById(transferId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee Transfer not found" });
    }
    const referenceInfo = await getReferencingCounts("EmployeeTransfer", transferId);
    if (referenceInfo.totalReferences > 0) {
      return res.status(409).json({
        isOk: false, status: 409, message: "Cannot delete Employee Transfer. It is being used by other records.",
        totalReferences: referenceInfo.totalReferences, references: referenceInfo.details,
        formattedMessage: formatReferenceMessage(referenceInfo.details),
      });
    }
    await EmployeeTransfer.findByIdAndUpdate(transferId, { isDeleted: true });
    return res.status(200).json({ isOk: true, status: 200, message: "Employee Transfer deleted successfully" });
  } catch (error) {
    console.log("Error in deleteEmployeeTransfer", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getEmployeeTransferById = async (req, res) => {
  try {
    const doc = await EmployeeTransfer.findById(req.params.transferId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee Transfer not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getEmployeeTransferById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listEmployeeTransfers = async (_req, res) => {
  try {
    const docs = await EmployeeTransfer.find({ isActive: true }).select("employeeId transferDate");
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    console.log("Error in listEmployeeTransfers", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listEmployeeTransfersByParams = async (req, res) => {
  try {
    const list = await runListQuery(EmployeeTransfer, req.body, {
      searchFields: [],
      filterable: { employeeId: "objectId", transferDate: "date", isActive: "boolean", createdAt: "date" },
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// ------------------------------------------------------------ Employee Promotion --

export const createEmployeePromotion = async (req, res) => {
  try {
    const { employeeId, promotionDate, newDepartmentId, newDesignationId, newGradeId, revisedCtc } = req.body;
    let { currentCtc } = req.body;
    if (!employeeId || !promotionDate) {
      return res.status(400).json({ isOk: false, status: 400, message: "Employee and Promotion Date are required" });
    }
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee not found" });
    }
    if (employee.status === "Inactive") {
      return res.status(400).json({ isOk: false, status: 400, message: `Transactions cannot be created for an Inactive Employee ${employee.employeeName}` });
    }

    // fetch_if_empty semantic — only fetched here, at create time, when the
    // caller didn't already supply one.
    if (!currentCtc && employee.ctc) currentCtc = employee.ctc;

    const doc = await EmployeePromotion.create({
      employeeId, promotionDate, newDepartmentId, newDesignationId, newGradeId, currentCtc, revisedCtc,
    });

    const changed = await applyPropertyChanges(
      employee,
      [
        { field: "department", employeeField: "departmentId", newValue: newDepartmentId },
        { field: "designation", employeeField: "designationId", newValue: newDesignationId },
        { field: "grade", employeeField: "gradeId", newValue: newGradeId },
      ],
      promotionDate, "EmployeePromotion", doc._id,
    );
    if (revisedCtc) {
      employee.ctc = revisedCtc;
      await employee.save();
    } else if (changed) {
      await employee.save();
    }

    return res.status(201).json({ isOk: true, status: 201, message: "Employee Promotion created successfully" });
  } catch (error) {
    console.log("Error in createEmployeePromotion", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteEmployeePromotion = async (req, res) => {
  try {
    const { promotionId } = req.params;
    const doc = await EmployeePromotion.findById(promotionId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee Promotion not found" });
    }
    const referenceInfo = await getReferencingCounts("EmployeePromotion", promotionId);
    if (referenceInfo.totalReferences > 0) {
      return res.status(409).json({
        isOk: false, status: 409, message: "Cannot delete Employee Promotion. It is being used by other records.",
        totalReferences: referenceInfo.totalReferences, references: referenceInfo.details,
        formattedMessage: formatReferenceMessage(referenceInfo.details),
      });
    }
    await EmployeePromotion.findByIdAndUpdate(promotionId, { isDeleted: true });
    return res.status(200).json({ isOk: true, status: 200, message: "Employee Promotion deleted successfully" });
  } catch (error) {
    console.log("Error in deleteEmployeePromotion", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getEmployeePromotionById = async (req, res) => {
  try {
    const doc = await EmployeePromotion.findById(req.params.promotionId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee Promotion not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getEmployeePromotionById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listEmployeePromotions = async (_req, res) => {
  try {
    const docs = await EmployeePromotion.find({ isActive: true }).select("employeeId promotionDate");
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    console.log("Error in listEmployeePromotions", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listEmployeePromotionsByParams = async (req, res) => {
  try {
    const list = await runListQuery(EmployeePromotion, req.body, {
      searchFields: [],
      filterable: { employeeId: "objectId", promotionDate: "date", isActive: "boolean", createdAt: "date" },
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// ------------------------------------------------------ Employee Property Change --

export const listEmployeePropertyChangesByParams = async (req, res) => {
  try {
    const list = await runListQuery(EmployeePropertyChange, req.body, {
      searchFields: ["field"],
      filterable: { employeeId: "objectId", sourceDocType: "enum", createdAt: "date" },
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};
