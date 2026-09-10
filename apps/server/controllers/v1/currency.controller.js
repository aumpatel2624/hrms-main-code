import { runListQuery } from "../../utils/listQuery.js";
import CurrencyMaster from "../../models/CurrencyMaster.js";
import {
  getReferencingCounts,
  formatReferenceMessage,
} from "../../utils/referenceHelper.js";

// Create CurrencyMaster
export const createCurrencyMaster = async (req, res) => {
  try {
    const { currencyName, currencyCode, currencySymbol, isActive } = req.body;

    // Check if currency with same name already exists
    const existingCurrencyByName = await CurrencyMaster.findOne({
      currencyName: { $regex: new RegExp(`^${currencyName}$`, "i") },
    });

    if (existingCurrencyByName) {
      return res.status(400).json({
        isOk: false,
        message: "Currency with this name already exists",
      });
    }

    // Check if currency with same code already exists
    const existingCurrencyByCode = await CurrencyMaster.findOne({
      currencyCode: { $regex: new RegExp(`^${currencyCode}$`, "i") },
    });

    if (existingCurrencyByCode) {
      return res.status(400).json({
        isOk: false,
        message: "Currency with this code already exists",
      });
    }

    const newCurrencyMaster = new CurrencyMaster({
      currencyName,
      currencyCode,
      currencySymbol,
      isActive,
    });

    const savedCurrencyMaster = await newCurrencyMaster.save();
    res.status(201).json({
      isOk: true,
      data: savedCurrencyMaster,
      message: "Currency created successfully",
    });
  } catch (error) {
    console.error("Error creating currency:", error);
    res.status(500).json({
      isOk: false,
      message: "Failed to create currency",
      error: error.message,
    });
  }
};

// Get CurrencyMaster by ID
export const getCurrencyMasterById = async (req, res) => {
  try {
    const { id } = req.params;
    const currencyMaster = await CurrencyMaster.findById(id);

    if (!currencyMaster) {
      return res.status(404).json({
        isOk: false,
        message: "Currency not found",
      });
    }

    res.status(200).json({
      isOk: true,
      data: currencyMaster,
    });
  } catch (error) {
    console.error("Error fetching currency:", error);
    res.status(500).json({
      isOk: false,
      message: "Failed to fetch currency",
      error: error.message,
    });
  }
};

// Update CurrencyMaster
export const updateCurrencyMaster = async (req, res) => {
  try {
    const { id } = req.params;
    const { currencyName, currencyCode, currencySymbol, isActive } = req.body;

    // Check if another currency with same name already exists (excluding current currency)
    const existingCurrencyByName = await CurrencyMaster.findOne({
      _id: { $ne: id },
      currencyName: { $regex: new RegExp(`^${currencyName}$`, "i") },
    });

    if (existingCurrencyByName) {
      return res.status(400).json({
        isOk: false,
        message: "Currency with this name already exists",
      });
    }

    // Check if another currency with same code already exists (excluding current currency)
    const existingCurrencyByCode = await CurrencyMaster.findOne({
      _id: { $ne: id },
      currencyCode: { $regex: new RegExp(`^${currencyCode}$`, "i") },
    });

    if (existingCurrencyByCode) {
      return res.status(400).json({
        isOk: false,
        message: "Currency with this code already exists",
      });
    }

    const updatedCurrencyMaster = await CurrencyMaster.findByIdAndUpdate(
      id,
      {
        currencyName,
        currencyCode,
        currencySymbol,
        isActive,
      },
      { new: true, runValidators: true },
    );

    if (!updatedCurrencyMaster) {
      return res.status(404).json({
        isOk: false,
        message: "Currency not found",
      });
    }

    res.status(200).json({
      isOk: true,
      data: updatedCurrencyMaster,
      message: "Currency updated successfully",
    });
  } catch (error) {
    console.error("Error updating currency:", error);
    res.status(500).json({
      isOk: false,
      message: "Failed to update currency",
      error: error.message,
    });
  }
};

// Delete CurrencyMaster
export const deleteCurrencyMaster = async (req, res) => {
  try {
    const { id } = req.params;

    // Check for references before deletion
    const referenceInfo = await getReferencingCounts("CurrencyMaster", id);

    if (referenceInfo.totalReferences > 0) {
      return res.status(409).json({
        message: "Cannot delete Currency. It is being used by other records.",
        isOk: false,
        status: 409,
        totalReferences: referenceInfo.totalReferences,
        references: referenceInfo.details,
        formattedMessage: formatReferenceMessage(referenceInfo.details),
      });
    }

    const deletedCurrencyMaster = await CurrencyMaster.findByIdAndUpdate(id, { isDeleted: true });

    if (!deletedCurrencyMaster) {
      return res.status(404).json({
        isOk: false,
        message: "Currency not found",
      });
    }

    res.status(200).json({
      isOk: true,
      message: "Currency deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting currency:", error);
    res.status(500).json({
      isOk: false,
      message: "Failed to delete currency",
      error: error.message,
    });
  }
};

// List CurrencyMasters with pagination, sorting, and filtering
export const listCurrencyMastersByParams = async (req, res) => {
  try {
    const list = await runListQuery(CurrencyMaster, req.body, {
      searchFields: ["currencyName", "currencyCode", "currencySymbol"],
      filterable: {
        currencyName: "string",
        currencyCode: "string",
        currencySymbol: "string",
        isActive: "boolean",
        createdAt: "date",
      },
    });

    return res.status(200).json({ isOk: true, data: list, status: 200 });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ isOk: false, message: error.message, status: 500 });
  }
};

// Get all active CurrencyMasters (for dropdowns)
export const getAllActiveCurrencyMasters = async (req, res) => {
  try {
    const currencies = await CurrencyMaster.find({ isActive: true })
      .select("currencyName currencyCode currencySymbol")
      .sort({ currencyName: 1 });

    res.status(200).json({
      isOk: true,
      data: currencies,
    });
  } catch (error) {
    console.error("Error fetching active currencies:", error);
    res.status(500).json({
      isOk: false,
      message: "Failed to fetch active currencies",
      error: error.message,
    });
  }
};
