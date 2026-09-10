/**
 * Travel (ADR-023, HRMS module 7): Purpose of Travel, Identification
 * Document Type, Travel Request. Grouped in one file — a small module,
 * same reasoning as organizationSetup.controller.js.
 */
import { runListQuery } from "../../utils/listQuery.js";
import PurposeOfTravel from "../../models/PurposeOfTravel.js";
import IdentificationDocumentType from "../../models/IdentificationDocumentType.js";
import TravelRequest from "../../models/TravelRequest.js";
import Employee from "../../models/Employee.js";
import {
  getReferencingCounts,
  formatReferenceMessage,
} from "../../utils/referenceHelper.js";

const referenceGuardedDelete = async (Model, modelName, id, label) => {
  const referenceInfo = await getReferencingCounts(modelName, id);
  if (referenceInfo.totalReferences > 0) {
    return {
      blocked: true,
      body: {
        isOk: false,
        status: 409,
        message: `Cannot delete ${label}. It is being used by other records.`,
        totalReferences: referenceInfo.totalReferences,
        references: referenceInfo.details,
        formattedMessage: formatReferenceMessage(referenceInfo.details),
      },
    };
  }
  await Model.findByIdAndUpdate(id, { isDeleted: true });
  return { blocked: false };
};

// --------------------------------------------------------- Purpose of Travel --

export const createPurposeOfTravel = async (req, res) => {
  try {
    const { purposeOfTravelName, isActive } = req.body;
    if (!purposeOfTravelName) {
      return res.status(400).json({ isOk: false, status: 400, message: "Purpose of Travel name is required" });
    }
    const existing = await PurposeOfTravel.findOne({ purposeOfTravelName });
    if (existing) {
      return res.status(400).json({ isOk: false, status: 400, message: "Purpose of Travel already exists" });
    }
    await PurposeOfTravel.create({ purposeOfTravelName, isActive });
    return res.status(201).json({ isOk: true, status: 201, message: "Purpose of Travel created successfully" });
  } catch (error) {
    console.log("Error in createPurposeOfTravel", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updatePurposeOfTravel = async (req, res) => {
  try {
    const { purposeOfTravelId } = req.params;
    const { purposeOfTravelName, isActive } = req.body;
    const doc = await PurposeOfTravel.findById(purposeOfTravelId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Purpose of Travel not found" });
    }
    doc.purposeOfTravelName = purposeOfTravelName ?? doc.purposeOfTravelName;
    doc.isActive = isActive ?? doc.isActive;
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Purpose of Travel updated successfully" });
  } catch (error) {
    console.log("Error in updatePurposeOfTravel", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deletePurposeOfTravel = async (req, res) => {
  try {
    const { purposeOfTravelId } = req.params;
    const doc = await PurposeOfTravel.findById(purposeOfTravelId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Purpose of Travel not found" });
    }
    const result = await referenceGuardedDelete(PurposeOfTravel, "PurposeOfTravel", purposeOfTravelId, "purpose of travel");
    if (result.blocked) return res.status(409).json(result.body);
    return res.status(200).json({ isOk: true, status: 200, message: "Purpose of Travel deleted successfully" });
  } catch (error) {
    console.log("Error in deletePurposeOfTravel", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getPurposeOfTravelById = async (req, res) => {
  try {
    const { purposeOfTravelId } = req.params;
    const doc = await PurposeOfTravel.findById(purposeOfTravelId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Purpose of Travel not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getPurposeOfTravelById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listPurposeOfTravels = async (req, res) => {
  try {
    const docs = await PurposeOfTravel.find({ isActive: true });
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    console.log("Error in listPurposeOfTravels", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listPurposeOfTravelByParams = async (req, res) => {
  try {
    const list = await runListQuery(PurposeOfTravel, req.body, {
      searchFields: ["purposeOfTravelName"],
      filterable: {
        purposeOfTravelName: "string",
        isActive: "boolean",
        createdAt: "date",
      },
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log("Error in listPurposeOfTravelByParams", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// ------------------------------------------------ Identification Document Type --

export const createIdentificationDocumentType = async (req, res) => {
  try {
    const { identificationDocumentTypeName, isActive } = req.body;
    if (!identificationDocumentTypeName) {
      return res.status(400).json({ isOk: false, status: 400, message: "Identification Document Type name is required" });
    }
    const existing = await IdentificationDocumentType.findOne({ identificationDocumentTypeName });
    if (existing) {
      return res.status(400).json({ isOk: false, status: 400, message: "Identification Document Type already exists" });
    }
    await IdentificationDocumentType.create({ identificationDocumentTypeName, isActive });
    return res.status(201).json({ isOk: true, status: 201, message: "Identification Document Type created successfully" });
  } catch (error) {
    console.log("Error in createIdentificationDocumentType", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateIdentificationDocumentType = async (req, res) => {
  try {
    const { identificationDocumentTypeId } = req.params;
    const { identificationDocumentTypeName, isActive } = req.body;
    const doc = await IdentificationDocumentType.findById(identificationDocumentTypeId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Identification Document Type not found" });
    }
    doc.identificationDocumentTypeName = identificationDocumentTypeName ?? doc.identificationDocumentTypeName;
    doc.isActive = isActive ?? doc.isActive;
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Identification Document Type updated successfully" });
  } catch (error) {
    console.log("Error in updateIdentificationDocumentType", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteIdentificationDocumentType = async (req, res) => {
  try {
    const { identificationDocumentTypeId } = req.params;
    const doc = await IdentificationDocumentType.findById(identificationDocumentTypeId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Identification Document Type not found" });
    }
    const result = await referenceGuardedDelete(
      IdentificationDocumentType,
      "IdentificationDocumentType",
      identificationDocumentTypeId,
      "identification document type",
    );
    if (result.blocked) return res.status(409).json(result.body);
    return res.status(200).json({ isOk: true, status: 200, message: "Identification Document Type deleted successfully" });
  } catch (error) {
    console.log("Error in deleteIdentificationDocumentType", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getIdentificationDocumentTypeById = async (req, res) => {
  try {
    const { identificationDocumentTypeId } = req.params;
    const doc = await IdentificationDocumentType.findById(identificationDocumentTypeId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Identification Document Type not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getIdentificationDocumentTypeById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listIdentificationDocumentTypes = async (req, res) => {
  try {
    const docs = await IdentificationDocumentType.find({ isActive: true });
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    console.log("Error in listIdentificationDocumentTypes", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listIdentificationDocumentTypeByParams = async (req, res) => {
  try {
    const list = await runListQuery(IdentificationDocumentType, req.body, {
      searchFields: ["identificationDocumentTypeName"],
      filterable: {
        identificationDocumentTypeName: "string",
        isActive: "boolean",
        createdAt: "date",
      },
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log("Error in listIdentificationDocumentTypeByParams", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// ------------------------------------------------------------- Travel Request --

const TRAVEL_REQUEST_FIELDS = [
  "employeeId", "travelType", "travelFunding", "purposeOfTravelId", "detailsOfSponsor",
  "description", "personalIdTypeId", "personalIdNumber", "itinerary", "costings",
  "status", "companyId", "isActive",
];

/** Inactive-employee guard — source's validate_active_employee, same message convention as Employee Promotion/Transfer. */
const assertActiveEmployee = async (employeeId) => {
  const employee = await Employee.findById(employeeId);
  if (!employee) return { ok: false, status: 404, message: "Employee not found" };
  if (employee.status === "Inactive") {
    return { ok: false, status: 400, message: `Transactions cannot be created for an Inactive Employee ${employee.employeeName}` };
  }
  return { ok: true, employee };
};

export const createTravelRequest = async (req, res) => {
  try {
    const { employeeId, travelType, purposeOfTravelId } = req.body;
    if (!employeeId || !travelType || !purposeOfTravelId) {
      return res.status(400).json({ isOk: false, status: 400, message: "Employee, Travel Type and Purpose of Travel are required" });
    }
    const guard = await assertActiveEmployee(employeeId);
    if (!guard.ok) return res.status(guard.status).json({ isOk: false, status: guard.status, message: guard.message });

    const payload = {};
    for (const field of TRAVEL_REQUEST_FIELDS) if (req.body[field] !== undefined) payload[field] = req.body[field];
    if (!payload.companyId) payload.companyId = guard.employee.companyId;

    await TravelRequest.create(payload);
    return res.status(201).json({ isOk: true, status: 201, message: "Travel Request created successfully" });
  } catch (error) {
    console.log("Error in createTravelRequest", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateTravelRequest = async (req, res) => {
  try {
    const { travelRequestId } = req.params;
    const doc = await TravelRequest.findById(travelRequestId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Travel Request not found" });
    }

    const nextEmployeeId = req.body.employeeId ?? String(doc.employeeId);
    const guard = await assertActiveEmployee(nextEmployeeId);
    if (!guard.ok) return res.status(guard.status).json({ isOk: false, status: guard.status, message: guard.message });

    for (const field of TRAVEL_REQUEST_FIELDS) if (req.body[field] !== undefined) doc[field] = req.body[field];
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Travel Request updated successfully" });
  } catch (error) {
    console.log("Error in updateTravelRequest", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteTravelRequest = async (req, res) => {
  try {
    const { travelRequestId } = req.params;
    const doc = await TravelRequest.findById(travelRequestId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Travel Request not found" });
    }
    const result = await referenceGuardedDelete(TravelRequest, "TravelRequest", travelRequestId, "travel request");
    if (result.blocked) return res.status(409).json(result.body);
    return res.status(200).json({ isOk: true, status: 200, message: "Travel Request deleted successfully" });
  } catch (error) {
    console.log("Error in deleteTravelRequest", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listTravelRequests = async (_req, res) => {
  try {
    const docs = await TravelRequest.find({ isActive: true }).select("employeeId travelType status purposeOfTravelId");
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    console.log("Error in listTravelRequests", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getTravelRequestById = async (req, res) => {
  try {
    const { travelRequestId } = req.params;
    const doc = await TravelRequest.findById(travelRequestId)
      .populate("employeeId", "employeeName employeeCode")
      .populate("purposeOfTravelId", "purposeOfTravelName")
      .populate("personalIdTypeId", "identificationDocumentTypeName")
      .populate("companyId", "companyName");
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Travel Request not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getTravelRequestById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listTravelRequestByParams = async (req, res) => {
  try {
    const list = await runListQuery(TravelRequest, req.body, {
      searchFields: ["detailsOfSponsor", "description", "personalIdNumber"],
      filterable: {
        employeeId: "objectId",
        travelType: "string",
        status: "string",
        companyId: "objectId",
        createdAt: "date",
      },
      stages: [
        { $lookup: { from: "employees", localField: "employeeId", foreignField: "_id", as: "employee" } },
        { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } },
        { $addFields: { employeeName: { $ifNull: ["$employee.employeeName", ""] } } },
      ],
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log("Error in listTravelRequestByParams", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};
