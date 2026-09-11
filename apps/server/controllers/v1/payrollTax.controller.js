import mongoose from "mongoose";
import { runListQuery } from "../../utils/listQuery.js";
import { attendanceScope } from "../../utils/attendanceScope.js";
import { resolveRequestEmployee } from "../../utils/requestEmployee.js";
import { SCOPES } from "@demo-panel/shared/scopes";
import IncomeTaxSlab from "../../models/IncomeTaxSlab.js";
import EmployeeTaxExemptionCategory from "../../models/EmployeeTaxExemptionCategory.js";
import EmployeeTaxExemptionSubCategory from "../../models/EmployeeTaxExemptionSubCategory.js";
import EmployeeTaxExemptionDeclaration from "../../models/EmployeeTaxExemptionDeclaration.js";
import EmployeeTaxExemptionProofSubmission from "../../models/EmployeeTaxExemptionProofSubmission.js";
import Employee from "../../models/Employee.js";
import PayrollPeriod from "../../models/PayrollPeriod.js";
import { calculateTotalExemption } from "../../utils/incomeTaxCalc.js";

const failure = (res, error) => {
  if (error.status) return res.status(error.status).json({ isOk: false, status: error.status, message: error.message });
  if (error.name === "ValidationError" || error.name === "CastError" || error.code === 11000) {
    return res.status(400).json({
      isOk: false,
      status: 400,
      message: error.code === 11000 ? "A record with these unique values already exists" : error.message,
    });
  }
  console.error("Payroll Tax request failed", error);
  return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
};

const throwError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  throw error;
};

/**
 * ADR-030: Real bracket overlap validation at save time.
 * Validates that bracket ranges [fromAmount, toAmount) within slabs do not overlap.
 */
export const validateTaxSlabs = (slabs = []) => {
  if (!Array.isArray(slabs) || slabs.length === 0) return;
  const sorted = [...slabs].sort((a, b) => (Number(a.fromAmount) || 0) - (Number(b.fromAmount) || 0));
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    const from = Number(cur.fromAmount) || 0;
    const to = cur.toAmount !== null && cur.toAmount !== undefined ? Number(cur.toAmount) : null;
    if (to !== null && to <= from) {
      throwError(400, `Taxable salary slab bracket toAmount (${to}) must be greater than fromAmount (${from})`);
    }
    if (i > 0) {
      const prev = sorted[i - 1];
      const prevTo = prev.toAmount !== null && prev.toAmount !== undefined ? Number(prev.toAmount) : null;
      if (prevTo === null) {
        throwError(400, "Taxable salary slabs bracket ranges cannot overlap: open-ended bracket must be the last bracket");
      }
      if (from < prevTo) {
        throwError(400, "Taxable salary slabs bracket ranges cannot overlap");
      }
    }
  }
};

// ============================================================================
// 1. Income Tax Slab (Plain CRUD Master)
// ============================================================================

export const INCOMETAXSLAB_FIELDS = [
  "name", "companyId", "effectiveFromDate", "allowTaxExemption", "standardDeduction",
  "taxReliefLimit", "disabled", "currency", "slabs", "otherTaxesAndCharges",
];

export const createIncomeTaxSlab = async (req, res) => {
  try {
    const { name, companyId, effectiveFromDate, slabs, otherTaxesAndCharges } = req.body;
    if (!name || !companyId || !effectiveFromDate) {
      throwError(400, "Name, Company and Effective From Date are required");
    }

    validateTaxSlabs(slabs);

    const effDate = new Date(effectiveFromDate);
    const existingEff = await IncomeTaxSlab.findOne({ companyId, effectiveFromDate: effDate });
    if (existingEff) {
      throwError(400, "An Income Tax Slab already exists for this company on this effective date");
    }

    const doc = await IncomeTaxSlab.create({
      name,
      companyId,
      effectiveFromDate: effDate,
      allowTaxExemption: req.body.allowTaxExemption ?? false,
      standardDeduction: Number(req.body.standardDeduction) || 0,
      taxReliefLimit: Number(req.body.taxReliefLimit) || 0,
      disabled: req.body.disabled ?? false,
      currency: req.body.currency || "INR",
      slabs: slabs || [],
      otherTaxesAndCharges: otherTaxesAndCharges || [],
    });

    return res.status(201).json({ isOk: true, status: 201, message: "Income Tax Slab created successfully", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const listIncomeTaxSlabs = async (req, res) => {
  try {
    const docs = await IncomeTaxSlab.find(await attendanceScope(req, false)).populate("companyId", "companyName");
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    return failure(res, error);
  }
};

export const searchIncomeTaxSlabs = async (req, res) => {
  try {
    const data = await runListQuery(IncomeTaxSlab, req.body, {
      scopeFilter: await attendanceScope(req, false),
      searchFields: ["name"],
      filterable: {
        companyId: "objectId",
        name: "string",
        effectiveFromDate: "date",
        allowTaxExemption: "boolean",
        disabled: "boolean",
        createdAt: "date",
      },
      stages: [
        { $lookup: { from: "companies", localField: "companyId", foreignField: "_id", as: "companyId_joined" } },
        { $addFields: { companyIdLabel: { $arrayElemAt: ["$companyId_joined.companyName", 0] } } },
        { $project: { companyId_joined: 0 } },
      ],
    });
    return res.status(200).json({ isOk: true, status: 200, data });
  } catch (error) {
    return failure(res, error);
  }
};

export const getIncomeTaxSlabById = async (req, res) => {
  try {
    const doc = await IncomeTaxSlab.findOne({
      $and: [{ _id: req.params.incomeTaxSlabId }, await attendanceScope(req, false)],
    }).populate("companyId", "companyName");
    if (!doc) throwError(404, "Income Tax Slab not found");
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const updateIncomeTaxSlab = async (req, res) => {
  try {
    const doc = await IncomeTaxSlab.findOne({
      $and: [{ _id: req.params.incomeTaxSlabId }, await attendanceScope(req, false)],
    });
    if (!doc) throwError(404, "Income Tax Slab not found");

    if (req.body.slabs !== undefined) {
      validateTaxSlabs(req.body.slabs);
      doc.slabs = req.body.slabs;
    }
    if (req.body.otherTaxesAndCharges !== undefined) doc.otherTaxesAndCharges = req.body.otherTaxesAndCharges;
    if (req.body.name !== undefined) doc.name = req.body.name;
    if (req.body.allowTaxExemption !== undefined) doc.allowTaxExemption = req.body.allowTaxExemption;
    if (req.body.standardDeduction !== undefined) doc.standardDeduction = Number(req.body.standardDeduction) || 0;
    if (req.body.taxReliefLimit !== undefined) doc.taxReliefLimit = Number(req.body.taxReliefLimit) || 0;
    if (req.body.disabled !== undefined) doc.disabled = req.body.disabled;
    if (req.body.currency !== undefined) doc.currency = req.body.currency;
    if (req.body.effectiveFromDate !== undefined) doc.effectiveFromDate = new Date(req.body.effectiveFromDate);

    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Income Tax Slab updated successfully", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const deleteIncomeTaxSlab = async (req, res) => {
  try {
    const doc = await IncomeTaxSlab.findOne({
      $and: [{ _id: req.params.incomeTaxSlabId }, await attendanceScope(req, false)],
    });
    if (!doc) throwError(404, "Income Tax Slab not found");
    await IncomeTaxSlab.findByIdAndDelete(doc._id);
    return res.status(200).json({ isOk: true, status: 200, message: "Income Tax Slab deleted successfully" });
  } catch (error) {
    return failure(res, error);
  }
};

// ============================================================================
// 2. Employee Tax Exemption Category (Plain CRUD Master)
// ============================================================================

export const EMPLOYEE_TAX_EXEMPTION_CATEGORY_FIELDS = ["name", "maxAmount", "isActive", "description"];

export const createEmployeeTaxExemptionCategory = async (req, res) => {
  try {
    const { name, maxAmount } = req.body;
    if (!name || maxAmount === undefined || maxAmount === null) {
      throwError(400, "Name and Max Amount are required");
    }
    const numMax = Number(maxAmount);
    if (!Number.isFinite(numMax) || numMax < 0) {
      throwError(400, "Max Amount must be a positive number");
    }

    const doc = await EmployeeTaxExemptionCategory.create({
      name,
      maxAmount: numMax,
      isActive: req.body.isActive ?? true,
      description: req.body.description || "",
    });

    return res.status(201).json({ isOk: true, status: 201, message: "Tax Exemption Category created successfully", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const listEmployeeTaxExemptionCategories = async (req, res) => {
  try {
    const docs = await EmployeeTaxExemptionCategory.find();
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    return failure(res, error);
  }
};

export const searchEmployeeTaxExemptionCategories = async (req, res) => {
  try {
    const data = await runListQuery(EmployeeTaxExemptionCategory, req.body, {
      searchFields: ["name", "description"],
      filterable: {
        name: "string",
        maxAmount: "number",
        isActive: "boolean",
        createdAt: "date",
      },
    });
    return res.status(200).json({ isOk: true, status: 200, data });
  } catch (error) {
    return failure(res, error);
  }
};

export const getEmployeeTaxExemptionCategoryById = async (req, res) => {
  try {
    const doc = await EmployeeTaxExemptionCategory.findById(req.params.id);
    if (!doc) throwError(404, "Tax Exemption Category not found");
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const updateEmployeeTaxExemptionCategory = async (req, res) => {
  try {
    const doc = await EmployeeTaxExemptionCategory.findById(req.params.id);
    if (!doc) throwError(404, "Tax Exemption Category not found");

    if (req.body.name !== undefined) doc.name = req.body.name;
    if (req.body.maxAmount !== undefined) {
      const numMax = Number(req.body.maxAmount);
      if (!Number.isFinite(numMax) || numMax < 0) throwError(400, "Max Amount must be a positive number");
      doc.maxAmount = numMax;
    }
    if (req.body.isActive !== undefined) doc.isActive = req.body.isActive;
    if (req.body.description !== undefined) doc.description = req.body.description;

    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Tax Exemption Category updated successfully", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const deleteEmployeeTaxExemptionCategory = async (req, res) => {
  try {
    const doc = await EmployeeTaxExemptionCategory.findById(req.params.id);
    if (!doc) throwError(404, "Tax Exemption Category not found");
    await EmployeeTaxExemptionCategory.findByIdAndDelete(doc._id);
    return res.status(200).json({ isOk: true, status: 200, message: "Tax Exemption Category deleted successfully" });
  } catch (error) {
    return failure(res, error);
  }
};

// ============================================================================
// 3. Employee Tax Exemption Sub Category (Plain CRUD Master)
// ============================================================================

export const EMPLOYEE_TAX_EXEMPTION_SUB_CATEGORY_FIELDS = [
  "name", "exemptionCategoryId", "maxAmount", "isActive", "description",
];

export const createEmployeeTaxExemptionSubCategory = async (req, res) => {
  try {
    const { name, exemptionCategoryId, maxAmount } = req.body;
    if (!name || !exemptionCategoryId) {
      throwError(400, "Name and Exemption Category are required");
    }

    const category = await EmployeeTaxExemptionCategory.findById(exemptionCategoryId);
    if (!category) throwError(404, "Parent Exemption Category not found");

    const numMax = maxAmount !== undefined && maxAmount !== null ? Number(maxAmount) : 0;
    if (!Number.isFinite(numMax) || numMax < 0) {
      throwError(400, "Max Amount must be a positive number");
    }

    if (numMax > category.maxAmount) {
      throwError(400, "Sub-category max amount cannot exceed category max amount");
    }

    const doc = await EmployeeTaxExemptionSubCategory.create({
      name,
      exemptionCategoryId,
      maxAmount: numMax,
      isActive: req.body.isActive ?? true,
      description: req.body.description || "",
    });

    return res.status(201).json({ isOk: true, status: 201, message: "Tax Exemption Sub Category created successfully", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const listEmployeeTaxExemptionSubCategories = async (req, res) => {
  try {
    const docs = await EmployeeTaxExemptionSubCategory.find().populate("exemptionCategoryId", "name maxAmount");
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    return failure(res, error);
  }
};

export const searchEmployeeTaxExemptionSubCategories = async (req, res) => {
  try {
    const data = await runListQuery(EmployeeTaxExemptionSubCategory, req.body, {
      searchFields: ["name", "description"],
      filterable: {
        name: "string",
        exemptionCategoryId: "objectId",
        maxAmount: "number",
        isActive: "boolean",
        createdAt: "date",
      },
      stages: [
        { $lookup: { from: "employeetaxexemptioncategories", localField: "exemptionCategoryId", foreignField: "_id", as: "exemptionCategoryId_joined" } },
        { $addFields: { exemptionCategoryIdLabel: { $arrayElemAt: ["$exemptionCategoryId_joined.name", 0] } } },
        { $project: { exemptionCategoryId_joined: 0 } },
      ],
    });
    return res.status(200).json({ isOk: true, status: 200, data });
  } catch (error) {
    return failure(res, error);
  }
};

export const getEmployeeTaxExemptionSubCategoryById = async (req, res) => {
  try {
    const doc = await EmployeeTaxExemptionSubCategory.findById(req.params.id).populate("exemptionCategoryId", "name maxAmount");
    if (!doc) throwError(404, "Tax Exemption Sub Category not found");
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const updateEmployeeTaxExemptionSubCategory = async (req, res) => {
  try {
    const doc = await EmployeeTaxExemptionSubCategory.findById(req.params.id);
    if (!doc) throwError(404, "Tax Exemption Sub Category not found");

    const resolvedCategoryId = req.body.exemptionCategoryId || doc.exemptionCategoryId;
    const category = await EmployeeTaxExemptionCategory.findById(resolvedCategoryId);
    if (!category) throwError(404, "Parent Exemption Category not found");

    if (req.body.maxAmount !== undefined) {
      const numMax = Number(req.body.maxAmount);
      if (!Number.isFinite(numMax) || numMax < 0) throwError(400, "Max Amount must be a positive number");
      if (numMax > category.maxAmount) {
        throwError(400, "Sub-category max amount cannot exceed category max amount");
      }
      doc.maxAmount = numMax;
    }
    if (req.body.name !== undefined) doc.name = req.body.name;
    if (req.body.exemptionCategoryId !== undefined) doc.exemptionCategoryId = req.body.exemptionCategoryId;
    if (req.body.isActive !== undefined) doc.isActive = req.body.isActive;
    if (req.body.description !== undefined) doc.description = req.body.description;

    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Tax Exemption Sub Category updated successfully", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const deleteEmployeeTaxExemptionSubCategory = async (req, res) => {
  try {
    const doc = await EmployeeTaxExemptionSubCategory.findById(req.params.id);
    if (!doc) throwError(404, "Tax Exemption Sub Category not found");
    await EmployeeTaxExemptionSubCategory.findByIdAndDelete(doc._id);
    return res.status(200).json({ isOk: true, status: 200, message: "Tax Exemption Sub Category deleted successfully" });
  } catch (error) {
    return failure(res, error);
  }
};

// ============================================================================
// 4. Employee Tax Exemption Declaration (Submittable Transaction, SCOPES.OWN)
// ============================================================================

export const EMPLOYEE_TAX_EXEMPTION_DECLARATION_FIELDS = [
  "employeeId", "payrollPeriodId", "currency", "declarations",
];

const prepareDeclarationRows = async (rows = []) => {
  const prepared = [];
  const categories = await EmployeeTaxExemptionCategory.find({ isActive: true }).lean();
  const categoryCeilings = {};
  for (const cat of categories) {
    categoryCeilings[String(cat._id)] = cat.maxAmount;
  }

  for (const r of rows) {
    if (!r.exemptionSubCategoryId) throwError(400, "Sub-category is required for each declaration line");
    const sub = await EmployeeTaxExemptionSubCategory.findById(r.exemptionSubCategoryId).lean();
    if (!sub) throwError(404, `Exemption Sub-Category ${r.exemptionSubCategoryId} not found`);

    const amount = Math.max(0, Number(r.amount) || 0);
    prepared.push({
      exemptionSubCategoryId: sub._id,
      exemptionCategoryId: sub.exemptionCategoryId,
      maxAmount: sub.maxAmount,
      amount,
    });
  }

  const totalDeclaredAmount = prepared.reduce((sum, r) => sum + r.amount, 0);
  const totalExemptionAmount = calculateTotalExemption(prepared, categoryCeilings);

  return { prepared, totalDeclaredAmount, totalExemptionAmount };
};

export const createEmployeeTaxExemptionDeclaration = async (req, res) => {
  try {
    const { employeeId, payrollPeriodId, declarations, currency } = req.body;
    if (!payrollPeriodId) throwError(400, "Payroll Period is required");

    let resolvedEmployeeId = employeeId;
    if (req.user?.dataScope === SCOPES.OWN) {
      const ownEmp = await resolveRequestEmployee(req);
      if (!ownEmp) throwError(403, "No employee record linked to this user");
      resolvedEmployeeId = ownEmp._id;
    } else if (!resolvedEmployeeId) {
      throwError(400, "Employee is required");
    }

    const employee = await Employee.findById(resolvedEmployeeId).lean();
    if (!employee) throwError(404, "Employee not found");

    const period = await PayrollPeriod.findById(payrollPeriodId).lean();
    if (!period) throwError(404, "Payroll Period not found");

    const existing = await EmployeeTaxExemptionDeclaration.findOne({
      employeeId: resolvedEmployeeId,
      payrollPeriodId,
      status: { $ne: "cancelled" },
    });
    if (existing) {
      throwError(400, "Tax exemption declaration already exists for this employee and payroll period");
    }

    const { prepared, totalDeclaredAmount, totalExemptionAmount } = await prepareDeclarationRows(declarations || []);

    const doc = await EmployeeTaxExemptionDeclaration.create({
      employeeId: resolvedEmployeeId,
      companyId: employee.companyId,
      payrollPeriodId,
      currency: currency || "INR",
      declarations: prepared,
      totalDeclaredAmount,
      totalExemptionAmount,
      status: "draft",
    });

    return res.status(201).json({ isOk: true, status: 201, message: "Tax Exemption Declaration created successfully", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const listEmployeeTaxExemptionDeclarations = async (req, res) => {
  try {
    const scopeFilter = await attendanceScope(req, true);
    const docs = await EmployeeTaxExemptionDeclaration.find(scopeFilter)
      .populate("employeeId", "employeeName employeeCode")
      .populate("payrollPeriodId", "startDate endDate")
      .populate("companyId", "companyName");
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    return failure(res, error);
  }
};

export const searchEmployeeTaxExemptionDeclarations = async (req, res) => {
  try {
    const scopeFilter = await attendanceScope(req, true);
    const data = await runListQuery(EmployeeTaxExemptionDeclaration, req.body, {
      scopeFilter,
      searchFields: [],
      filterable: {
        employeeId: "objectId",
        companyId: "objectId",
        payrollPeriodId: "objectId",
        status: "string",
        totalDeclaredAmount: "number",
        totalExemptionAmount: "number",
        createdAt: "date",
      },
      stages: [
        { $lookup: { from: "employees", localField: "employeeId", foreignField: "_id", as: "employeeId_joined" } },
        { $addFields: { employeeIdLabel: { $arrayElemAt: ["$employeeId_joined.employeeName", 0] } } },
        { $project: { employeeId_joined: 0 } },
        { $lookup: { from: "companies", localField: "companyId", foreignField: "_id", as: "companyId_joined" } },
        { $addFields: { companyIdLabel: { $arrayElemAt: ["$companyId_joined.companyName", 0] } } },
        { $project: { companyId_joined: 0 } },
        { $lookup: { from: "payrollperiods", localField: "payrollPeriodId", foreignField: "_id", as: "payrollPeriodId_joined" } },
        { $addFields: { payrollPeriodIdLabel: { $concat: [{ $substr: [{ $arrayElemAt: ["$payrollPeriodId_joined.startDate", 0] }, 0, 10] }, " to ", { $substr: [{ $arrayElemAt: ["$payrollPeriodId_joined.endDate", 0] }, 0, 10] }] } } },
        { $project: { payrollPeriodId_joined: 0 } },
      ],
    });
    return res.status(200).json({ isOk: true, status: 200, data });
  } catch (error) {
    return failure(res, error);
  }
};

export const getEmployeeTaxExemptionDeclarationById = async (req, res) => {
  try {
    const doc = await EmployeeTaxExemptionDeclaration.findById(req.params.id)
      .populate("employeeId", "employeeName employeeCode")
      .populate("payrollPeriodId", "startDate endDate")
      .populate("companyId", "companyName")
      .populate("declarations.exemptionSubCategoryId", "name maxAmount")
      .populate("declarations.exemptionCategoryId", "name maxAmount");
    if (!doc) throwError(404, "Tax Exemption Declaration not found");

    if (req.user?.dataScope === SCOPES.OWN) {
      const ownEmp = await resolveRequestEmployee(req);
      if (!ownEmp || String(doc.employeeId?._id || doc.employeeId) !== String(ownEmp._id)) {
        throwError(403, "Access denied");
      }
    }

    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const updateEmployeeTaxExemptionDeclaration = async (req, res) => {
  try {
    const doc = await EmployeeTaxExemptionDeclaration.findById(req.params.id);
    if (!doc) throwError(404, "Tax Exemption Declaration not found");
    if (doc.status !== "draft") throwError(400, "Only draft declarations can be updated");

    if (req.user?.dataScope === SCOPES.OWN) {
      const ownEmp = await resolveRequestEmployee(req);
      if (!ownEmp || String(doc.employeeId) !== String(ownEmp._id)) {
        throwError(403, "Access denied");
      }
    }

    if (req.body.declarations !== undefined) {
      const { prepared, totalDeclaredAmount, totalExemptionAmount } = await prepareDeclarationRows(req.body.declarations);
      doc.declarations = prepared;
      doc.totalDeclaredAmount = totalDeclaredAmount;
      doc.totalExemptionAmount = totalExemptionAmount;
    }
    if (req.body.currency !== undefined) doc.currency = req.body.currency;
    if (req.body.payrollPeriodId !== undefined) doc.payrollPeriodId = req.body.payrollPeriodId;

    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Tax Exemption Declaration updated successfully", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const submitEmployeeTaxExemptionDeclaration = async (req, res) => {
  try {
    const doc = await EmployeeTaxExemptionDeclaration.findById(req.params.id);
    if (!doc) throwError(404, "Tax Exemption Declaration not found");
    if (doc.status !== "draft") throwError(400, "Only draft declarations can be submitted");

    if (req.user?.dataScope === SCOPES.OWN) {
      const ownEmp = await resolveRequestEmployee(req);
      if (!ownEmp || String(doc.employeeId) !== String(ownEmp._id)) {
        throwError(403, "Access denied");
      }
    }

    doc.status = "submitted";
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Tax Exemption Declaration submitted successfully", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const cancelEmployeeTaxExemptionDeclaration = async (req, res) => {
  try {
    const doc = await EmployeeTaxExemptionDeclaration.findById(req.params.id);
    if (!doc) throwError(404, "Tax Exemption Declaration not found");
    if (doc.status !== "submitted") throwError(400, "Only submitted declarations can be cancelled");

    if (req.user?.dataScope === SCOPES.OWN) {
      const ownEmp = await resolveRequestEmployee(req);
      if (!ownEmp || String(doc.employeeId) !== String(ownEmp._id)) {
        throwError(403, "Access denied");
      }
    }

    doc.status = "cancelled";
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Tax Exemption Declaration cancelled successfully", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const deleteEmployeeTaxExemptionDeclaration = async (req, res) => {
  try {
    const doc = await EmployeeTaxExemptionDeclaration.findById(req.params.id);
    if (!doc) throwError(404, "Tax Exemption Declaration not found");
    if (doc.status !== "draft") throwError(400, "Only draft declarations can be deleted");

    if (req.user?.dataScope === SCOPES.OWN) {
      const ownEmp = await resolveRequestEmployee(req);
      if (!ownEmp || String(doc.employeeId) !== String(ownEmp._id)) {
        throwError(403, "Access denied");
      }
    }

    await EmployeeTaxExemptionDeclaration.findByIdAndDelete(doc._id);
    return res.status(200).json({ isOk: true, status: 200, message: "Tax Exemption Declaration deleted successfully" });
  } catch (error) {
    return failure(res, error);
  }
};

// ============================================================================
// 5. Employee Tax Exemption Proof Submission (Submittable Transaction, SCOPES.OWN)
// ============================================================================

export const EMPLOYEE_TAX_EXEMPTION_PROOF_SUBMISSION_FIELDS = [
  "employeeId", "payrollPeriodId", "submissionDate", "currency", "taxExemptionProofs", "attachments",
];

const prepareProofRows = async (rows = []) => {
  const prepared = [];
  const categories = await EmployeeTaxExemptionCategory.find({ isActive: true }).lean();
  const categoryCeilings = {};
  for (const cat of categories) {
    categoryCeilings[String(cat._id)] = cat.maxAmount;
  }

  for (const r of rows) {
    if (!r.exemptionSubCategoryId) throwError(400, "Sub-category is required for each proof line");
    const sub = await EmployeeTaxExemptionSubCategory.findById(r.exemptionSubCategoryId).lean();
    if (!sub) throwError(404, `Exemption Sub-Category ${r.exemptionSubCategoryId} not found`);

    const amount = Math.max(0, Number(r.amount) || 0);
    prepared.push({
      exemptionSubCategoryId: sub._id,
      exemptionCategoryId: sub.exemptionCategoryId,
      maxAmount: sub.maxAmount,
      typeOfProof: r.typeOfProof || "",
      amount,
      attachProof: r.attachProof || null,
    });
  }

  const totalActualAmount = prepared.reduce((sum, r) => sum + r.amount, 0);
  const exemptionAmount = calculateTotalExemption(prepared, categoryCeilings);

  return { prepared, totalActualAmount, exemptionAmount };
};

export const createEmployeeTaxExemptionProofSubmission = async (req, res) => {
  try {
    const { employeeId, payrollPeriodId, taxExemptionProofs, submissionDate, currency, attachments } = req.body;
    if (!payrollPeriodId) throwError(400, "Payroll Period is required");

    let resolvedEmployeeId = employeeId;
    if (req.user?.dataScope === SCOPES.OWN) {
      const ownEmp = await resolveRequestEmployee(req);
      if (!ownEmp) throwError(403, "No employee record linked to this user");
      resolvedEmployeeId = ownEmp._id;
    } else if (!resolvedEmployeeId) {
      throwError(400, "Employee is required");
    }

    const employee = await Employee.findById(resolvedEmployeeId).lean();
    if (!employee) throwError(404, "Employee not found");

    const period = await PayrollPeriod.findById(payrollPeriodId).lean();
    if (!period) throwError(404, "Payroll Period not found");

    const existing = await EmployeeTaxExemptionProofSubmission.findOne({
      employeeId: resolvedEmployeeId,
      payrollPeriodId,
      status: { $ne: "cancelled" },
    });
    if (existing) {
      throwError(400, "Tax exemption proof submission already exists for this employee and payroll period");
    }

    const { prepared, totalActualAmount, exemptionAmount } = await prepareProofRows(taxExemptionProofs || []);

    const doc = await EmployeeTaxExemptionProofSubmission.create({
      employeeId: resolvedEmployeeId,
      companyId: employee.companyId,
      payrollPeriodId,
      submissionDate: submissionDate ? new Date(submissionDate) : new Date(),
      currency: currency || "INR",
      taxExemptionProofs: prepared,
      totalActualAmount,
      exemptionAmount,
      attachments: attachments || null,
      status: "draft",
    });

    return res.status(201).json({ isOk: true, status: 201, message: "Tax Exemption Proof Submission created successfully", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const listEmployeeTaxExemptionProofSubmissions = async (req, res) => {
  try {
    const scopeFilter = await attendanceScope(req, true);
    const docs = await EmployeeTaxExemptionProofSubmission.find(scopeFilter)
      .populate("employeeId", "employeeName employeeCode")
      .populate("payrollPeriodId", "startDate endDate")
      .populate("companyId", "companyName");
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    return failure(res, error);
  }
};

export const searchEmployeeTaxExemptionProofSubmissions = async (req, res) => {
  try {
    const scopeFilter = await attendanceScope(req, true);
    const data = await runListQuery(EmployeeTaxExemptionProofSubmission, req.body, {
      scopeFilter,
      searchFields: [],
      filterable: {
        employeeId: "objectId",
        companyId: "objectId",
        payrollPeriodId: "objectId",
        status: "string",
        totalActualAmount: "number",
        exemptionAmount: "number",
        createdAt: "date",
      },
      stages: [
        { $lookup: { from: "employees", localField: "employeeId", foreignField: "_id", as: "employeeId_joined" } },
        { $addFields: { employeeIdLabel: { $arrayElemAt: ["$employeeId_joined.employeeName", 0] } } },
        { $project: { employeeId_joined: 0 } },
        { $lookup: { from: "companies", localField: "companyId", foreignField: "_id", as: "companyId_joined" } },
        { $addFields: { companyIdLabel: { $arrayElemAt: ["$companyId_joined.companyName", 0] } } },
        { $project: { companyId_joined: 0 } },
        { $lookup: { from: "payrollperiods", localField: "payrollPeriodId", foreignField: "_id", as: "payrollPeriodId_joined" } },
        { $addFields: { payrollPeriodIdLabel: { $concat: [{ $substr: [{ $arrayElemAt: ["$payrollPeriodId_joined.startDate", 0] }, 0, 10] }, " to ", { $substr: [{ $arrayElemAt: ["$payrollPeriodId_joined.endDate", 0] }, 0, 10] }] } } },
        { $project: { payrollPeriodId_joined: 0 } },
      ],
    });
    return res.status(200).json({ isOk: true, status: 200, data });
  } catch (error) {
    return failure(res, error);
  }
};

export const getEmployeeTaxExemptionProofSubmissionById = async (req, res) => {
  try {
    const doc = await EmployeeTaxExemptionProofSubmission.findById(req.params.id)
      .populate("employeeId", "employeeName employeeCode")
      .populate("payrollPeriodId", "startDate endDate")
      .populate("companyId", "companyName")
      .populate("taxExemptionProofs.exemptionSubCategoryId", "name maxAmount")
      .populate("taxExemptionProofs.exemptionCategoryId", "name maxAmount");
    if (!doc) throwError(404, "Tax Exemption Proof Submission not found");

    if (req.user?.dataScope === SCOPES.OWN) {
      const ownEmp = await resolveRequestEmployee(req);
      if (!ownEmp || String(doc.employeeId?._id || doc.employeeId) !== String(ownEmp._id)) {
        throwError(403, "Access denied");
      }
    }

    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const updateEmployeeTaxExemptionProofSubmission = async (req, res) => {
  try {
    const doc = await EmployeeTaxExemptionProofSubmission.findById(req.params.id);
    if (!doc) throwError(404, "Tax Exemption Proof Submission not found");
    if (doc.status !== "draft") throwError(400, "Only draft proof submissions can be updated");

    if (req.user?.dataScope === SCOPES.OWN) {
      const ownEmp = await resolveRequestEmployee(req);
      if (!ownEmp || String(doc.employeeId) !== String(ownEmp._id)) {
        throwError(403, "Access denied");
      }
    }

    if (req.body.taxExemptionProofs !== undefined) {
      const { prepared, totalActualAmount, exemptionAmount } = await prepareProofRows(req.body.taxExemptionProofs);
      doc.taxExemptionProofs = prepared;
      doc.totalActualAmount = totalActualAmount;
      doc.exemptionAmount = exemptionAmount;
    }
    if (req.body.submissionDate !== undefined) doc.submissionDate = new Date(req.body.submissionDate);
    if (req.body.currency !== undefined) doc.currency = req.body.currency;
    if (req.body.attachments !== undefined) doc.attachments = req.body.attachments;
    if (req.body.payrollPeriodId !== undefined) doc.payrollPeriodId = req.body.payrollPeriodId;

    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Tax Exemption Proof Submission updated successfully", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const submitEmployeeTaxExemptionProofSubmission = async (req, res) => {
  try {
    const doc = await EmployeeTaxExemptionProofSubmission.findById(req.params.id);
    if (!doc) throwError(404, "Tax Exemption Proof Submission not found");
    if (doc.status !== "draft") throwError(400, "Only draft proof submissions can be submitted");

    if (req.user?.dataScope === SCOPES.OWN) {
      const ownEmp = await resolveRequestEmployee(req);
      if (!ownEmp || String(doc.employeeId) !== String(ownEmp._id)) {
        throwError(403, "Access denied");
      }
    }

    doc.status = "submitted";
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Tax Exemption Proof Submission submitted successfully", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const cancelEmployeeTaxExemptionProofSubmission = async (req, res) => {
  try {
    const doc = await EmployeeTaxExemptionProofSubmission.findById(req.params.id);
    if (!doc) throwError(404, "Tax Exemption Proof Submission not found");
    if (doc.status !== "submitted") throwError(400, "Only submitted proof submissions can be cancelled");

    if (req.user?.dataScope === SCOPES.OWN) {
      const ownEmp = await resolveRequestEmployee(req);
      if (!ownEmp || String(doc.employeeId) !== String(ownEmp._id)) {
        throwError(403, "Access denied");
      }
    }

    doc.status = "cancelled";
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Tax Exemption Proof Submission cancelled successfully", data: doc });
  } catch (error) {
    return failure(res, error);
  }
};

export const deleteEmployeeTaxExemptionProofSubmission = async (req, res) => {
  try {
    const doc = await EmployeeTaxExemptionProofSubmission.findById(req.params.id);
    if (!doc) throwError(404, "Tax Exemption Proof Submission not found");
    if (doc.status !== "draft") throwError(400, "Only draft proof submissions can be deleted");

    if (req.user?.dataScope === SCOPES.OWN) {
      const ownEmp = await resolveRequestEmployee(req);
      if (!ownEmp || String(doc.employeeId) !== String(ownEmp._id)) {
        throwError(403, "Access denied");
      }
    }

    await EmployeeTaxExemptionProofSubmission.findByIdAndDelete(doc._id);
    return res.status(200).json({ isOk: true, status: 200, message: "Tax Exemption Proof Submission deleted successfully" });
  } catch (error) {
    return failure(res, error);
  }
};
