import { runListQuery } from "../../utils/listQuery.js";
import DepartmentModels from "../../models/Department.js";
import {
  getReferencingCounts,
  formatReferenceMessage,
} from "../../utils/referenceHelper.js";

export const createDepartment = async (req, res) => {
  try {
    const { departmentName, departmentCode, companyId, isActive } = req.body;

    if (!departmentName || !companyId) {
      return res.status(400).json({
        message: "Department name and company are required",
        isOk: false,
        status: 400,
      });
    }

    // ADR-017: uniqueness is scoped per company — two companies may each
    // legitimately have a "Finance" department.
    const existingDepartment = await DepartmentModels.findOne({
      departmentName,
      companyId,
    });

    if (existingDepartment) {
      return res.status(400).json({
        message: "Department already exists for this company",
        isOk: false,
        status: 400,
      });
    }

    const department = new DepartmentModels({
      departmentName,
      departmentCode,
      companyId,
      isActive,
    });

    await department.save();

    return res.status(201).json({
      message: "Department created successfully",
      isOk: true,
      status: 201,
    });
  } catch (error) {
    console.log("Error in createDepartment", error);
    return res.status(500).json({
      message: "Internal server error",
      isOk: false,
      status: 500,
    });
  }
};

export const updateDepartment = async (req, res) => {
  try {
    const { departmentName, departmentCode, companyId, isActive } = req.body;
    const { departmentId } = req.params;

    const department = await DepartmentModels.findById(departmentId);

    if (!department) {
      return res.status(404).json({
        message: "Department not found",
        isOk: false,
        status: 404,
      });
    }

    department.departmentName = departmentName;
    department.departmentCode = departmentCode;
    department.companyId = companyId;
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
      return res.status(404).json({
        message: "Department not found",
        isOk: false,
        status: 404,
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
    });
  }
};

export const getDeparmentById = async (req, res) => {
  try {
    const { departmentId } = req.params;

    const department = await DepartmentModels.findById(departmentId);

    if (!department) {
      return res.status(404).json({
        message: "Department not found",
        isOk: false,
        status: 404,
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
        companyId: "objectId",
        isActive: "boolean",
        createdAt: "date",
      },
      stages: [
        {
          $lookup: {
            from: "companies",
            localField: "companyId",
            foreignField: "_id",
            as: "company",
          },
        },
        { $addFields: { companyName: { $arrayElemAt: ["$company.companyName", 0] } } },
      ],
    });

    return res.status(200).json({ isOk: true, data: list, status: 200 });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ isOk: false, message: "Internal server error", status: 500 });
  }
};

export const listDepartments = async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.companyId) filter.companyId = req.query.companyId;

    const departments = await DepartmentModels.find(filter);

    return res.status(200).json({
      isOk: true,
      data: departments,
      status: 200,
    });
  } catch (error) {
    console.error("Error in listDepartments:", error);
    return res.status(500).json({
      isOk: false,
      message: "Internal server error",
      status: 500,
    });
  }
};
