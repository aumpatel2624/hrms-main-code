/**
 * Full and Final Statement (ADR-020, HRMS module 4) — a manual final-
 * settlement worksheet, deliberately NOT an accounting document. No Journal
 * Entry/GL, no auto-population from Salary Slip/Gratuity/Asset Movement
 * (none of those exist here); HR enters payable/receivable/asset rows by
 * hand. Totals are still server-computed on every save (never trust a
 * client-supplied total) and the settlement guard (every line Settled,
 * every returned asset Returned) still gates markAsPaid, same as source's
 * real before_submit checks.
 */
import { runListQuery } from "../../utils/listQuery.js";
import FullAndFinalStatement from "../../models/FullAndFinalStatement.js";
import Employee from "../../models/Employee.js";
import {
  getReferencingCounts,
  formatReferenceMessage,
} from "../../utils/referenceHelper.js";

const computeTotals = (doc) => {
  const totalPayableAmount = (doc.payables ?? []).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const totalAssetRecoveryCost = (doc.assetsAllocated ?? [])
    .filter((a) => a.action === "Recover Cost")
    .reduce((sum, a) => sum + (Number(a.cost) || 0), 0);
  const totalReceivableAmount =
    (doc.receivables ?? []).reduce((sum, r) => sum + (Number(r.amount) || 0), 0) + totalAssetRecoveryCost;
  doc.totalPayableAmount = totalPayableAmount;
  doc.totalReceivableAmount = totalReceivableAmount;
  doc.totalAssetRecoveryCost = totalAssetRecoveryCost;
};

const validateAssetCostRule = (assetsAllocated = []) => {
  const bad = assetsAllocated.find((a) => a.action === "Recover Cost" && !(Number(a.cost) > 0));
  return bad ? `Cost is required for asset "${bad.assetName}" when action is Recover Cost` : null;
};

const settlementBlockers = (doc) => {
  const unsettled = [
    ...doc.payables.filter((r) => r.status !== "Settled").map((r) => `payable "${r.component}"`),
    ...doc.receivables.filter((r) => r.status !== "Settled").map((r) => `receivable "${r.component}"`),
  ];
  const notReturned = doc.assetsAllocated
    .filter((a) => a.action === "Return" && a.status !== "Returned")
    .map((a) => `asset "${a.assetName}"`);
  return [...unsettled, ...notReturned];
};

const REQUIRED_FIELDS = ["employeeId", "transactionDate"];
const OPTIONAL_FIELDS = ["payables", "receivables", "assetsAllocated", "isActive"];
const pickFields = (body) =>
  Object.fromEntries(
    [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].filter((k) => body[k] !== undefined).map((k) => [k, body[k]]),
  );

export const createFullAndFinalStatement = async (req, res) => {
  try {
    const missing = REQUIRED_FIELDS.filter((k) => !req.body[k]);
    if (missing.length) {
      return res.status(400).json({ isOk: false, status: 400, message: `Missing required field(s): ${missing.join(", ")}` });
    }
    const { employeeId } = req.body;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee not found" });
    }
    if (!employee.relievingDate) {
      return res.status(400).json({ isOk: false, status: 400, message: `Please set the relieving date for employee ${employee.employeeName} first` });
    }

    const fields = pickFields(req.body);
    const costError = validateAssetCostRule(fields.assetsAllocated);
    if (costError) {
      return res.status(400).json({ isOk: false, status: 400, message: costError });
    }

    fields.departmentId = employee.departmentId;
    fields.designationId = employee.designationId;
    fields.companyId = employee.companyId;
    fields.dateOfJoining = employee.dateOfJoining;
    fields.relievingDate = employee.relievingDate;
    fields.payables = fields.payables ?? [];
    fields.receivables = fields.receivables ?? [];
    fields.assetsAllocated = fields.assetsAllocated ?? [];

    const doc = new FullAndFinalStatement(fields);
    computeTotals(doc);
    await doc.save();
    return res.status(201).json({ isOk: true, status: 201, message: "Full and Final Statement created successfully", data: { _id: doc._id } });
  } catch (error) {
    console.log("Error in createFullAndFinalStatement", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateFullAndFinalStatement = async (req, res) => {
  try {
    const { statementId } = req.params;
    const doc = await FullAndFinalStatement.findById(statementId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Full and Final Statement not found" });
    }
    const fields = pickFields(req.body);
    const costError = validateAssetCostRule(fields.assetsAllocated ?? doc.assetsAllocated);
    if (costError) {
      return res.status(400).json({ isOk: false, status: 400, message: costError });
    }
    Object.assign(doc, fields);
    computeTotals(doc);
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Full and Final Statement updated successfully" });
  } catch (error) {
    console.log("Error in updateFullAndFinalStatement", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteFullAndFinalStatement = async (req, res) => {
  try {
    const { statementId } = req.params;
    const doc = await FullAndFinalStatement.findById(statementId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Full and Final Statement not found" });
    }
    const referenceInfo = await getReferencingCounts("FullAndFinalStatement", statementId);
    if (referenceInfo.totalReferences > 0) {
      return res.status(409).json({
        isOk: false, status: 409, message: "Cannot delete Full and Final Statement. It is being used by other records.",
        totalReferences: referenceInfo.totalReferences, references: referenceInfo.details,
        formattedMessage: formatReferenceMessage(referenceInfo.details),
      });
    }
    await FullAndFinalStatement.findByIdAndUpdate(statementId, { isDeleted: true });
    return res.status(200).json({ isOk: true, status: 200, message: "Full and Final Statement deleted successfully" });
  } catch (error) {
    console.log("Error in deleteFullAndFinalStatement", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getFullAndFinalStatementById = async (req, res) => {
  try {
    const doc = await FullAndFinalStatement.findById(req.params.statementId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Full and Final Statement not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getFullAndFinalStatementById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listFullAndFinalStatements = async (req, res) => {
  try {
    const docs = await FullAndFinalStatement.find({ isActive: true }).select("employeeId status totalPayableAmount totalReceivableAmount");
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    console.log("Error in listFullAndFinalStatements", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listFullAndFinalStatementsByParams = async (req, res) => {
  try {
    const list = await runListQuery(FullAndFinalStatement, req.body, {
      searchFields: [],
      filterable: {
        employeeId: "objectId", companyId: "objectId", status: "enum",
        transactionDate: "date", isActive: "boolean", createdAt: "date",
      },
      stages: [
        { $lookup: { from: "employees", localField: "employeeId", foreignField: "_id", as: "employee" } },
        { $addFields: { employeeName: { $arrayElemAt: ["$employee.employeeName", 0] } } },
      ],
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const markStatementAsPaid = async (req, res) => {
  try {
    const doc = await FullAndFinalStatement.findById(req.params.statementId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Full and Final Statement not found" });
    }
    if (doc.status === "Paid") {
      return res.status(400).json({ isOk: false, status: 400, message: "This statement is already marked as paid" });
    }
    const blockers = settlementBlockers(doc);
    if (blockers.length) {
      return res.status(409).json({
        isOk: false, status: 409,
        message: `Settle all payables and receivables, and confirm all returned assets, before marking as paid: ${blockers.join(", ")}`,
      });
    }
    doc.status = "Paid";
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Full and Final Statement marked as paid" });
  } catch (error) {
    console.log("Error in markStatementAsPaid", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};
