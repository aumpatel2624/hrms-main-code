/**
 * Organization Setup (ADR-017, HRMS module 1): Company, Branch, Designation,
 * Employment Type, Employee Grade. Grouped in one file the way
 * location.controller.js groups Country/State/City — one small domain, not
 * five one-model controllers. Department stays in its own existing file
 * (department.controller.js) since it predates this module.
 *
 * Employee Health Insurance (ADR-018, module 2) joins this file too — a
 * simple lookup master, same shape as Employment Type/Employee Grade, not
 * substantial enough to earn its own file the way Employee itself did.
 */
import { runListQuery } from "../../utils/listQuery.js";
import Company from "../../models/Company.js";
import Branch from "../../models/Branch.js";
import Designation from "../../models/Designation.js";
import EmploymentType from "../../models/EmploymentType.js";
import EmployeeGrade from "../../models/EmployeeGrade.js";
import EmployeeHealthInsurance from "../../models/EmployeeHealthInsurance.js";
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

// ---------------------------------------------------------------- Company --

export const createCompany = async (req, res) => {
  try {
    const { companyName, companyCode, isActive } = req.body;
    if (!companyName) {
      return res.status(400).json({ isOk: false, status: 400, message: "Company name is required" });
    }

    const existing = await Company.findOne({ companyName });
    if (existing) {
      return res.status(400).json({ isOk: false, status: 400, message: "Company already exists" });
    }

    await Company.create({ companyName, companyCode, isActive });
    return res.status(201).json({ isOk: true, status: 201, message: "Company created successfully" });
  } catch (error) {
    console.log("Error in createCompany", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { companyName, companyCode, isActive } = req.body;

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ isOk: false, status: 404, message: "Company not found" });
    }

    company.companyName = companyName;
    company.companyCode = companyCode;
    company.isActive = isActive;
    await company.save();

    return res.status(200).json({ isOk: true, status: 200, message: "Company updated successfully" });
  } catch (error) {
    console.log("Error in updateCompany", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ isOk: false, status: 404, message: "Company not found" });
    }

    const result = await referenceGuardedDelete(Company, "Company", companyId, "company");
    if (result.blocked) return res.status(409).json(result.body);

    return res.status(200).json({ isOk: true, status: 200, message: "Company deleted successfully" });
  } catch (error) {
    console.log("Error in deleteCompany", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getCompanyById = async (req, res) => {
  try {
    const { companyId } = req.params;
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ isOk: false, status: 404, message: "Company not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: company });
  } catch (error) {
    console.log("Error in getCompanyById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listCompanies = async (_req, res) => {
  try {
    const companies = await Company.find({ isActive: true });
    return res.status(200).json({ isOk: true, status: 200, data: companies });
  } catch (error) {
    console.log("Error in listCompanies", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listCompanyByParams = async (req, res) => {
  try {
    const list = await runListQuery(Company, req.body, {
      searchFields: ["companyName", "companyCode"],
      filterable: {
        companyName: "string",
        companyCode: "string",
        isActive: "boolean",
        createdAt: "date",
      },
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// ----------------------------------------------------------------- Branch --

export const createBranch = async (req, res) => {
  try {
    const { branchName, companyId, isActive } = req.body;
    if (!branchName || !companyId) {
      return res.status(400).json({ isOk: false, status: 400, message: "Branch name and company are required" });
    }

    const existing = await Branch.findOne({ branchName, companyId });
    if (existing) {
      return res.status(400).json({ isOk: false, status: 400, message: "Branch already exists for this company" });
    }

    await Branch.create({ branchName, companyId, isActive });
    return res.status(201).json({ isOk: true, status: 201, message: "Branch created successfully" });
  } catch (error) {
    console.log("Error in createBranch", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateBranch = async (req, res) => {
  try {
    const { branchId } = req.params;
    const { branchName, companyId, isActive } = req.body;

    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(404).json({ isOk: false, status: 404, message: "Branch not found" });
    }

    branch.branchName = branchName;
    branch.companyId = companyId;
    branch.isActive = isActive;
    await branch.save();

    return res.status(200).json({ isOk: true, status: 200, message: "Branch updated successfully" });
  } catch (error) {
    console.log("Error in updateBranch", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteBranch = async (req, res) => {
  try {
    const { branchId } = req.params;
    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(404).json({ isOk: false, status: 404, message: "Branch not found" });
    }

    const result = await referenceGuardedDelete(Branch, "Branch", branchId, "branch");
    if (result.blocked) return res.status(409).json(result.body);

    return res.status(200).json({ isOk: true, status: 200, message: "Branch deleted successfully" });
  } catch (error) {
    console.log("Error in deleteBranch", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getBranchById = async (req, res) => {
  try {
    const { branchId } = req.params;
    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(404).json({ isOk: false, status: 404, message: "Branch not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: branch });
  } catch (error) {
    console.log("Error in getBranchById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listBranches = async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.companyId) filter.companyId = req.query.companyId;
    const branches = await Branch.find(filter);
    return res.status(200).json({ isOk: true, status: 200, data: branches });
  } catch (error) {
    console.log("Error in listBranches", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listBranchByParams = async (req, res) => {
  try {
    const list = await runListQuery(Branch, req.body, {
      searchFields: ["branchName"],
      filterable: {
        branchName: "string",
        companyId: "objectId",
        isActive: "boolean",
        createdAt: "date",
      },
      stages: [
        {
          $lookup: { from: "companies", localField: "companyId", foreignField: "_id", as: "company" },
        },
        { $addFields: { companyName: { $arrayElemAt: ["$company.companyName", 0] } } },
      ],
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// ------------------------------------------------------------- Designation --

export const createDesignation = async (req, res) => {
  try {
    // ADR-032 (Performance, module 16) retrofit — optional default
    // Appraisal Template for this Designation's employees.
    const { designationName, companyId, isActive, appraisalTemplateId } = req.body;
    if (!designationName || !companyId) {
      return res.status(400).json({ isOk: false, status: 400, message: "Designation name and company are required" });
    }

    const existing = await Designation.findOne({ designationName, companyId });
    if (existing) {
      return res.status(400).json({ isOk: false, status: 400, message: "Designation already exists for this company" });
    }

    await Designation.create({ designationName, companyId, isActive, appraisalTemplateId: appraisalTemplateId || null });
    return res.status(201).json({ isOk: true, status: 201, message: "Designation created successfully" });
  } catch (error) {
    console.log("Error in createDesignation", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateDesignation = async (req, res) => {
  try {
    const { designationId } = req.params;
    // Merge only the fields the caller actually sent — the previous version
    // unconditionally overwrote designationName/companyId with `undefined`
    // whenever a caller (e.g. a skills[]-only update, ADR-022) omitted them,
    // failing their `required` validators with an uncaught-looking 500. Real
    // bug, found live wiring the Designation.skills[] retrofit, not part of
    // that retrofit's own scope — fixed here since it blocks it outright.
    const { designationName, companyId, isActive, skills, appraisalTemplateId } = req.body;

    const designation = await Designation.findById(designationId);
    if (!designation) {
      return res.status(404).json({ isOk: false, status: 404, message: "Designation not found" });
    }

    if (designationName !== undefined) designation.designationName = designationName;
    if (companyId !== undefined) designation.companyId = companyId;
    if (isActive !== undefined) designation.isActive = isActive;
    if (skills !== undefined) designation.skills = skills;
    // ADR-032 (Performance, module 16) retrofit.
    if (appraisalTemplateId !== undefined) designation.appraisalTemplateId = appraisalTemplateId || null;
    await designation.save();

    return res.status(200).json({ isOk: true, status: 200, message: "Designation updated successfully" });
  } catch (error) {
    console.log("Error in updateDesignation", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteDesignation = async (req, res) => {
  try {
    const { designationId } = req.params;
    const designation = await Designation.findById(designationId);
    if (!designation) {
      return res.status(404).json({ isOk: false, status: 404, message: "Designation not found" });
    }

    const result = await referenceGuardedDelete(Designation, "Designation", designationId, "designation");
    if (result.blocked) return res.status(409).json(result.body);

    return res.status(200).json({ isOk: true, status: 200, message: "Designation deleted successfully" });
  } catch (error) {
    console.log("Error in deleteDesignation", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getDesignationById = async (req, res) => {
  try {
    const { designationId } = req.params;
    const designation = await Designation.findById(designationId);
    if (!designation) {
      return res.status(404).json({ isOk: false, status: 404, message: "Designation not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: designation });
  } catch (error) {
    console.log("Error in getDesignationById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listDesignations = async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.companyId) filter.companyId = req.query.companyId;
    const designations = await Designation.find(filter);
    return res.status(200).json({ isOk: true, status: 200, data: designations });
  } catch (error) {
    console.log("Error in listDesignations", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listDesignationByParams = async (req, res) => {
  try {
    const list = await runListQuery(Designation, req.body, {
      searchFields: ["designationName"],
      filterable: {
        designationName: "string",
        companyId: "objectId",
        isActive: "boolean",
        createdAt: "date",
      },
      stages: [
        {
          $lookup: { from: "companies", localField: "companyId", foreignField: "_id", as: "company" },
        },
        { $addFields: { companyName: { $arrayElemAt: ["$company.companyName", 0] } } },
      ],
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// --------------------------------------------------------- Employment Type --

export const createEmploymentType = async (req, res) => {
  try {
    const { employmentTypeName, isActive } = req.body;
    if (!employmentTypeName) {
      return res.status(400).json({ isOk: false, status: 400, message: "Employment type name is required" });
    }

    const existing = await EmploymentType.findOne({ employmentTypeName });
    if (existing) {
      return res.status(400).json({ isOk: false, status: 400, message: "Employment type already exists" });
    }

    await EmploymentType.create({ employmentTypeName, isActive });
    return res.status(201).json({ isOk: true, status: 201, message: "Employment type created successfully" });
  } catch (error) {
    console.log("Error in createEmploymentType", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateEmploymentType = async (req, res) => {
  try {
    const { employmentTypeId } = req.params;
    const { employmentTypeName, isActive } = req.body;

    const employmentType = await EmploymentType.findById(employmentTypeId);
    if (!employmentType) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employment type not found" });
    }

    employmentType.employmentTypeName = employmentTypeName;
    employmentType.isActive = isActive;
    await employmentType.save();

    return res.status(200).json({ isOk: true, status: 200, message: "Employment type updated successfully" });
  } catch (error) {
    console.log("Error in updateEmploymentType", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteEmploymentType = async (req, res) => {
  try {
    const { employmentTypeId } = req.params;
    const employmentType = await EmploymentType.findById(employmentTypeId);
    if (!employmentType) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employment type not found" });
    }

    const result = await referenceGuardedDelete(EmploymentType, "EmploymentType", employmentTypeId, "employment type");
    if (result.blocked) return res.status(409).json(result.body);

    return res.status(200).json({ isOk: true, status: 200, message: "Employment type deleted successfully" });
  } catch (error) {
    console.log("Error in deleteEmploymentType", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getEmploymentTypeById = async (req, res) => {
  try {
    const { employmentTypeId } = req.params;
    const employmentType = await EmploymentType.findById(employmentTypeId);
    if (!employmentType) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employment type not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: employmentType });
  } catch (error) {
    console.log("Error in getEmploymentTypeById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listEmploymentTypes = async (_req, res) => {
  try {
    const employmentTypes = await EmploymentType.find({ isActive: true });
    return res.status(200).json({ isOk: true, status: 200, data: employmentTypes });
  } catch (error) {
    console.log("Error in listEmploymentTypes", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listEmploymentTypeByParams = async (req, res) => {
  try {
    const list = await runListQuery(EmploymentType, req.body, {
      searchFields: ["employmentTypeName"],
      filterable: {
        employmentTypeName: "string",
        isActive: "boolean",
        createdAt: "date",
      },
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// ---------------------------------------------------------- Employee Grade --

export const createEmployeeGrade = async (req, res) => {
  try {
    const { gradeName, isActive, defaultSalaryStructureId, defaultBasePay } = req.body;
    if (!gradeName) {
      return res.status(400).json({ isOk: false, status: 400, message: "Grade name is required" });
    }

    const existing = await EmployeeGrade.findOne({ gradeName });
    if (existing) {
      return res.status(400).json({ isOk: false, status: 400, message: "Employee grade already exists" });
    }

    await EmployeeGrade.create({ gradeName, isActive, defaultSalaryStructureId, defaultBasePay });
    return res.status(201).json({ isOk: true, status: 201, message: "Employee grade created successfully" });
  } catch (error) {
    console.log("Error in createEmployeeGrade", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateEmployeeGrade = async (req, res) => {
  try {
    const { employeeGradeId } = req.params;
    // Merge only the fields the caller actually sent — the previous version
    // unconditionally overwrote gradeName/isActive and silently dropped any
    // other field (the same bug class already found and fixed in
    // updateDesignation; here it would have meant defaultSalaryStructureId/
    // defaultBasePay (ADR-026) could never actually be set from this
    // endpoint). Fixed while adding those two fields, since it would have
    // blocked them outright.
    const { gradeName, isActive, defaultSalaryStructureId, defaultBasePay } = req.body;

    const grade = await EmployeeGrade.findById(employeeGradeId);
    if (!grade) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee grade not found" });
    }

    if (gradeName !== undefined) grade.gradeName = gradeName;
    if (isActive !== undefined) grade.isActive = isActive;
    if (defaultSalaryStructureId !== undefined) grade.defaultSalaryStructureId = defaultSalaryStructureId;
    if (defaultBasePay !== undefined) grade.defaultBasePay = defaultBasePay;
    await grade.save();

    return res.status(200).json({ isOk: true, status: 200, message: "Employee grade updated successfully" });
  } catch (error) {
    console.log("Error in updateEmployeeGrade", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteEmployeeGrade = async (req, res) => {
  try {
    const { employeeGradeId } = req.params;
    const grade = await EmployeeGrade.findById(employeeGradeId);
    if (!grade) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee grade not found" });
    }

    const result = await referenceGuardedDelete(EmployeeGrade, "EmployeeGrade", employeeGradeId, "employee grade");
    if (result.blocked) return res.status(409).json(result.body);

    return res.status(200).json({ isOk: true, status: 200, message: "Employee grade deleted successfully" });
  } catch (error) {
    console.log("Error in deleteEmployeeGrade", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getEmployeeGradeById = async (req, res) => {
  try {
    const { employeeGradeId } = req.params;
    const grade = await EmployeeGrade.findById(employeeGradeId);
    if (!grade) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee grade not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: grade });
  } catch (error) {
    console.log("Error in getEmployeeGradeById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listEmployeeGrades = async (_req, res) => {
  try {
    const grades = await EmployeeGrade.find({ isActive: true });
    return res.status(200).json({ isOk: true, status: 200, data: grades });
  } catch (error) {
    console.log("Error in listEmployeeGrades", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listEmployeeGradeByParams = async (req, res) => {
  try {
    const list = await runListQuery(EmployeeGrade, req.body, {
      searchFields: ["gradeName"],
      filterable: {
        gradeName: "string",
        isActive: "boolean",
        createdAt: "date",
      },
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// ------------------------------------------------ Employee Health Insurance --

export const createEmployeeHealthInsurance = async (req, res) => {
  try {
    const { providerName, isActive } = req.body;
    if (!providerName) {
      return res.status(400).json({ isOk: false, status: 400, message: "Provider name is required" });
    }

    const existing = await EmployeeHealthInsurance.findOne({ providerName });
    if (existing) {
      return res.status(400).json({ isOk: false, status: 400, message: "Health insurance provider already exists" });
    }

    await EmployeeHealthInsurance.create({ providerName, isActive });
    return res.status(201).json({ isOk: true, status: 201, message: "Health insurance provider created successfully" });
  } catch (error) {
    console.log("Error in createEmployeeHealthInsurance", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateEmployeeHealthInsurance = async (req, res) => {
  try {
    const { employeeHealthInsuranceId } = req.params;
    const { providerName, isActive } = req.body;

    const provider = await EmployeeHealthInsurance.findById(employeeHealthInsuranceId);
    if (!provider) {
      return res.status(404).json({ isOk: false, status: 404, message: "Health insurance provider not found" });
    }

    provider.providerName = providerName;
    provider.isActive = isActive;
    await provider.save();

    return res.status(200).json({ isOk: true, status: 200, message: "Health insurance provider updated successfully" });
  } catch (error) {
    console.log("Error in updateEmployeeHealthInsurance", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteEmployeeHealthInsurance = async (req, res) => {
  try {
    const { employeeHealthInsuranceId } = req.params;
    const provider = await EmployeeHealthInsurance.findById(employeeHealthInsuranceId);
    if (!provider) {
      return res.status(404).json({ isOk: false, status: 404, message: "Health insurance provider not found" });
    }

    const result = await referenceGuardedDelete(
      EmployeeHealthInsurance,
      "EmployeeHealthInsurance",
      employeeHealthInsuranceId,
      "health insurance provider",
    );
    if (result.blocked) return res.status(409).json(result.body);

    return res.status(200).json({ isOk: true, status: 200, message: "Health insurance provider deleted successfully" });
  } catch (error) {
    console.log("Error in deleteEmployeeHealthInsurance", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getEmployeeHealthInsuranceById = async (req, res) => {
  try {
    const { employeeHealthInsuranceId } = req.params;
    const provider = await EmployeeHealthInsurance.findById(employeeHealthInsuranceId);
    if (!provider) {
      return res.status(404).json({ isOk: false, status: 404, message: "Health insurance provider not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: provider });
  } catch (error) {
    console.log("Error in getEmployeeHealthInsuranceById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listEmployeeHealthInsurances = async (_req, res) => {
  try {
    const providers = await EmployeeHealthInsurance.find({ isActive: true });
    return res.status(200).json({ isOk: true, status: 200, data: providers });
  } catch (error) {
    console.log("Error in listEmployeeHealthInsurances", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listEmployeeHealthInsuranceByParams = async (req, res) => {
  try {
    const list = await runListQuery(EmployeeHealthInsurance, req.body, {
      searchFields: ["providerName"],
      filterable: {
        providerName: "string",
        isActive: "boolean",
        createdAt: "date",
      },
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};
