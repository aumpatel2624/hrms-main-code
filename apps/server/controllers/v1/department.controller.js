import { runListQuery } from "../../utils/listQuery.js";
import DepartmentModels from "../../models/Department.js";
import {
  getReferencingCounts,
  formatReferenceMessage,
} from "../../utils/referenceHelper.js";

export const createDepartment = async (req, res) => {
  try {
    const { departmentName, departmentCode, isActive } = req.body;
    console.log("Request Body:", req.body); // Debugging line

    if (!departmentName && !departmentCode) {
      return res.status(400).json({
        message: "Department name and code are required",
        isOk: false,
        status: 400,
      });
    }

    const existingDepartment = await DepartmentModels.findOne({
      departmentCode,
    });

    if (existingDepartment) {
      return res.status(400).json({
        message: "Department already exists",
        isOk: true,
        status: 400,
      });
    }

    const department = new DepartmentModels({
      departmentName,
      departmentCode,
      isActive,
    });

    await department.save();

    return res.status(201).json({
      message: "Department created successfully",
      isOk: true,
      status: 201,
    });
  } catch (error) {
    console.log("Error in createDepartmentName", error);
    return res.status(500).json({
      message: "Internal server error",
      isOk: false,
      status: 500,
    });
  }
};

export const updateDepartment = async (req, res) => {
  try {
    const { departmentName, departmentCode, isActive } = req.body;
    const { departmentId } = req.params;

    const department = await DepartmentModels.findById(departmentId);

    if (!department) {
      return res.status(400).json({
        message: "Department not found",
        isOk: true,
        status: 400,
      });
    }

    department.departmentName = departmentName;
    department.departmentCode = departmentCode;
    department.isActive = isActive;

    await department.save();

    return res.status(200).json({
      message: "Department updated successfully",
      isOk: true,
      status: 200,
    });
  } catch (error) {
    console.log("Error in updateDepartment", error);
    return res.status(500).json({
      message: "Internal server error",
      isOk: false,
      status: 500,
    });
  }
};

export const deleteDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;

    const department = await DepartmentModels.findById(departmentId);

    if (!department) {
      return res.status(400).json({
        message: "Department not found",
        isOk: false,
        status: 400,
      });
    }

    // Check if this department is referenced by other documents
    const referenceInfo = await getReferencingCounts(
      "Department",
      departmentId,
    );

    if (referenceInfo.totalReferences > 0) {
      return res.status(409).json({
        message: "Cannot delete department. It is being used by other records.",
        isOk: false,
        status: 409,
        totalReferences: referenceInfo.totalReferences,
        references: referenceInfo.details,
        formattedMessage: formatReferenceMessage(referenceInfo.details),
      });
    }

    // No references found, safe to delete
    await DepartmentModels.findByIdAndUpdate(departmentId, { isDeleted: true });

    return res.status(200).json({
      message: "Department deleted successfully",
      isOk: true,
      status: 200,
    });
  } catch (error) {
    console.log("Error in deleteDepartment", error);
    return res.status(500).json({
      message: "Internal server error",
      isOk: false,
      status: 500,
      error: error.message,
    });
  }
};

export const getDeparmentById = async (req, res) => {
  try {
    const { departmentId } = req.params;

    const department = await DepartmentModels.findById(departmentId);

    if (!department) {
      return res.status(400).json({
        message: "Department not found",
        isOk: true,
        status: 400,
      });
    }

    return res.status(200).json({
      message: "Department found",
      data: department,
      isOk: true,
      status: 200,
    });
  } catch (error) {
    console.log("Error in getDeparmentById", error);
    return res.status(500).json({
      message: "Internal server error",
      isOk: false,
      status: 500,
    });
  }
};

export const listDepartmentByParams = async (req, res) => {
  try {
    const list = await runListQuery(DepartmentModels, req.body, {
      searchFields: ["departmentName", "departmentCode"],
      filterable: {
        departmentName: "string",
        departmentCode: "string",
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

export const listDepartments = async (req, res) => {
  try {
    const departments = await DepartmentModels.find({ isActive: true });

    return res.status(200).json({
      isOk: true,
      data: departments,
      status: 200,
    });
  } catch (error) {
    console.error("Error in listBranch:", error);
    return res.status(500).json({
      isOk: false,
      message: error.message,
      status: 500,
    });
  }
};
