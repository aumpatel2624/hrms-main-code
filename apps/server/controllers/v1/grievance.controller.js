/**
 * Grievance Type + Employee Grievance (ADR-021, HRMS module 5). No
 * docstatus — status transitions freely, matching source's own lack of a
 * state-machine guard; only the conditional-required fields (cause of
 * grievance when Investigated/Resolved, resolution fields when Resolved)
 * are enforced here, since Mongoose has no `mandatory_depends_on` primitive.
 */
import { runListQuery } from "../../utils/listQuery.js";
import GrievanceType from "../../models/GrievanceType.js";
import EmployeeGrievance from "../../models/EmployeeGrievance.js";
import {
  getReferencingCounts,
  formatReferenceMessage,
} from "../../utils/referenceHelper.js";

// ---------------------------------------------------------- Grievance Type --

export const createGrievanceType = async (req, res) => {
  try {
    const { grievanceTypeName, description, isActive } = req.body;
    if (!grievanceTypeName) {
      return res.status(400).json({ isOk: false, status: 400, message: "Grievance type name is required" });
    }
    const existing = await GrievanceType.findOne({ grievanceTypeName });
    if (existing) {
      return res.status(400).json({ isOk: false, status: 400, message: "Grievance type already exists" });
    }
    await GrievanceType.create({ grievanceTypeName, description, isActive });
    return res.status(201).json({ isOk: true, status: 201, message: "Grievance type created successfully" });
  } catch (error) {
    console.log("Error in createGrievanceType", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateGrievanceType = async (req, res) => {
  try {
    const { grievanceTypeId } = req.params;
    const doc = await GrievanceType.findById(grievanceTypeId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Grievance type not found" });
    }
    Object.assign(doc, { grievanceTypeName: req.body.grievanceTypeName, description: req.body.description, isActive: req.body.isActive });
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Grievance type updated successfully" });
  } catch (error) {
    console.log("Error in updateGrievanceType", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteGrievanceType = async (req, res) => {
  try {
    const { grievanceTypeId } = req.params;
    const doc = await GrievanceType.findById(grievanceTypeId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Grievance type not found" });
    }
    const referenceInfo = await getReferencingCounts("GrievanceType", grievanceTypeId);
    if (referenceInfo.totalReferences > 0) {
      return res.status(409).json({
        isOk: false, status: 409, message: "Cannot delete grievance type. It is being used by other records.",
        totalReferences: referenceInfo.totalReferences, references: referenceInfo.details,
        formattedMessage: formatReferenceMessage(referenceInfo.details),
      });
    }
    await GrievanceType.findByIdAndUpdate(grievanceTypeId, { isDeleted: true });
    return res.status(200).json({ isOk: true, status: 200, message: "Grievance type deleted successfully" });
  } catch (error) {
    console.log("Error in deleteGrievanceType", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getGrievanceTypeById = async (req, res) => {
  try {
    const doc = await GrievanceType.findById(req.params.grievanceTypeId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Grievance type not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getGrievanceTypeById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listGrievanceTypes = async (_req, res) => {
  try {
    const docs = await GrievanceType.find({ isActive: true });
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    console.log("Error in listGrievanceTypes", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listGrievanceTypesByParams = async (req, res) => {
  try {
    const list = await runListQuery(GrievanceType, req.body, {
      searchFields: ["grievanceTypeName"],
      filterable: { grievanceTypeName: "string", isActive: "boolean", createdAt: "date" },
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// ------------------------------------------------------- Employee Grievance --

const REQUIRED_FIELDS = ["subject", "raisedByEmployeeId", "date", "grievanceTypeId", "description"];
const OPTIONAL_FIELDS = [
  "status", "grievanceAgainstEmployeeId", "grievanceAgainstText", "causeOfGrievance",
  "resolvedByUserId", "resolutionDate", "resolutionDetail", "employeeResponsibleId", "isActive",
];
const pickFields = (body) =>
  Object.fromEntries(
    [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].filter((k) => body[k] !== undefined).map((k) => [k, body[k]]),
  );

// mandatory_depends_on has no Mongoose-schema equivalent — enforced here.
const validateConditionalFields = (fields) => {
  const status = fields.status ?? "Open";
  if ((status === "Investigated" || status === "Resolved") && !fields.causeOfGrievance) {
    return "Cause of Grievance is required when status is Investigated or Resolved";
  }
  if (status === "Resolved") {
    if (!fields.resolvedByUserId) return "Resolved By is required when status is Resolved";
    if (!fields.resolutionDate) return "Resolution Date is required when status is Resolved";
    if (!fields.resolutionDetail) return "Resolution Details are required when status is Resolved";
  }
  return null;
};

export const createEmployeeGrievance = async (req, res) => {
  try {
    const missing = REQUIRED_FIELDS.filter((k) => !req.body[k]);
    if (missing.length) {
      return res.status(400).json({ isOk: false, status: 400, message: `Missing required field(s): ${missing.join(", ")}` });
    }
    const fields = pickFields(req.body);
    const conditionalError = validateConditionalFields(fields);
    if (conditionalError) {
      return res.status(400).json({ isOk: false, status: 400, message: conditionalError });
    }
    await EmployeeGrievance.create(fields);
    return res.status(201).json({ isOk: true, status: 201, message: "Employee Grievance created successfully" });
  } catch (error) {
    console.log("Error in createEmployeeGrievance", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateEmployeeGrievance = async (req, res) => {
  try {
    const { grievanceId } = req.params;
    const doc = await EmployeeGrievance.findById(grievanceId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee Grievance not found" });
    }
    const fields = pickFields(req.body);
    const merged = { ...doc.toObject(), ...fields };
    const conditionalError = validateConditionalFields(merged);
    if (conditionalError) {
      return res.status(400).json({ isOk: false, status: 400, message: conditionalError });
    }
    Object.assign(doc, fields);
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Employee Grievance updated successfully" });
  } catch (error) {
    console.log("Error in updateEmployeeGrievance", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteEmployeeGrievance = async (req, res) => {
  try {
    const { grievanceId } = req.params;
    const doc = await EmployeeGrievance.findById(grievanceId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee Grievance not found" });
    }
    const referenceInfo = await getReferencingCounts("EmployeeGrievance", grievanceId);
    if (referenceInfo.totalReferences > 0) {
      return res.status(409).json({
        isOk: false, status: 409, message: "Cannot delete Employee Grievance. It is being used by other records.",
        totalReferences: referenceInfo.totalReferences, references: referenceInfo.details,
        formattedMessage: formatReferenceMessage(referenceInfo.details),
      });
    }
    await EmployeeGrievance.findByIdAndUpdate(grievanceId, { isDeleted: true });
    return res.status(200).json({ isOk: true, status: 200, message: "Employee Grievance deleted successfully" });
  } catch (error) {
    console.log("Error in deleteEmployeeGrievance", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getEmployeeGrievanceById = async (req, res) => {
  try {
    const doc = await EmployeeGrievance.findById(req.params.grievanceId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee Grievance not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getEmployeeGrievanceById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listEmployeeGrievances = async (_req, res) => {
  try {
    const docs = await EmployeeGrievance.find({ isActive: true }).select("subject status raisedByEmployeeId");
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    console.log("Error in listEmployeeGrievances", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listEmployeeGrievancesByParams = async (req, res) => {
  try {
    const list = await runListQuery(EmployeeGrievance, req.body, {
      searchFields: ["subject"],
      filterable: {
        raisedByEmployeeId: "objectId", grievanceTypeId: "objectId", status: "enum",
        date: "date", isActive: "boolean", createdAt: "date",
      },
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};
