import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { checkPermission } from "../../middlewares/checkPermission.js";
import { ANY_ROLE } from "@demo-panel/shared/roles";
import {
  createCompany, updateCompany, deleteCompany, getCompanyById, listCompanies, listCompanyByParams,
  createBranch, updateBranch, deleteBranch, getBranchById, listBranches, listBranchByParams,
  createDesignation, updateDesignation, deleteDesignation, getDesignationById, listDesignations, listDesignationByParams,
  createEmploymentType, updateEmploymentType, deleteEmploymentType, getEmploymentTypeById, listEmploymentTypes, listEmploymentTypeByParams,
  createEmployeeGrade, updateEmployeeGrade, deleteEmployeeGrade, getEmployeeGradeById, listEmployeeGrades, listEmployeeGradeByParams,
  createEmployeeHealthInsurance, updateEmployeeHealthInsurance, deleteEmployeeHealthInsurance,
  getEmployeeHealthInsuranceById, listEmployeeHealthInsurances, listEmployeeHealthInsuranceByParams,
} from "../../controllers/v1/organizationSetup.controller.js";

const router = express.Router();

// ---------------------------------------------------------------- Company --

/**
 * @swagger
 * /companies:
 *   post:
 *     summary: Create a new company
 *     tags: [Organization Setup]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateCompany' }
 *     responses:
 *       201: { description: Company created successfully }
 */
router.post("/companies", authMiddleware(ANY_ROLE), checkPermission("/company", "write"), createCompany);

/**
 * @swagger
 * /companies:
 *   get:
 *     summary: List all active companies (dropdown source)
 *     tags: [Organization Setup]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of companies }
 */
router.get("/companies", authMiddleware(ANY_ROLE), listCompanies);

/**
 * @swagger
 * /companies/{companyId}:
 *   get:
 *     summary: Get company by ID
 *     tags: [Organization Setup]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Company details }
 *       404: { description: Company not found }
 */
router.get("/companies/:companyId", authMiddleware(ANY_ROLE), checkPermission("/company", "read"), getCompanyById);

/**
 * @swagger
 * /companies/{companyId}:
 *   put:
 *     summary: Update company
 *     tags: [Organization Setup]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateCompany' }
 *     responses:
 *       200: { description: Company updated successfully }
 *       404: { description: Company not found }
 */
router.put("/companies/:companyId", authMiddleware(ANY_ROLE), checkPermission("/company", "edit"), updateCompany);

/**
 * @swagger
 * /companies/{companyId}:
 *   delete:
 *     summary: Delete company (soft, reference-guarded)
 *     tags: [Organization Setup]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Company deleted successfully }
 *       404: { description: Company not found }
 *       409: { description: Company is referenced by other records }
 */
router.delete("/companies/:companyId", authMiddleware(ANY_ROLE), checkPermission("/company", "delete"), deleteCompany);

/**
 * @swagger
 * /companies/search:
 *   post:
 *     summary: Search companies with pagination
 *     tags: [Organization Setup]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/SearchParams' }
 *     responses:
 *       200: { description: Paginated list of companies, $ref: '#/components/schemas/PaginatedResponse' }
 */
router.post("/companies/search", authMiddleware(ANY_ROLE), checkPermission("/company", "read"), listCompanyByParams);

// ----------------------------------------------------------------- Branch --

/**
 * @swagger
 * /branches:
 *   post:
 *     summary: Create a new branch
 *     tags: [Organization Setup]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateBranch' }
 *     responses:
 *       201: { description: Branch created successfully }
 */
router.post("/branches", authMiddleware(ANY_ROLE), checkPermission("/branch", "write"), createBranch);

/**
 * @swagger
 * /branches:
 *   get:
 *     summary: List all active branches (dropdown source, optional ?companyId filter)
 *     tags: [Organization Setup]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of branches }
 */
router.get("/branches", authMiddleware(ANY_ROLE), listBranches);

/**
 * @swagger
 * /branches/{branchId}:
 *   get:
 *     summary: Get branch by ID
 *     tags: [Organization Setup]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Branch details }
 *       404: { description: Branch not found }
 */
router.get("/branches/:branchId", authMiddleware(ANY_ROLE), checkPermission("/branch", "read"), getBranchById);

/**
 * @swagger
 * /branches/{branchId}:
 *   put:
 *     summary: Update branch
 *     tags: [Organization Setup]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateBranch' }
 *     responses:
 *       200: { description: Branch updated successfully }
 *       404: { description: Branch not found }
 */
router.put("/branches/:branchId", authMiddleware(ANY_ROLE), checkPermission("/branch", "edit"), updateBranch);

/**
 * @swagger
 * /branches/{branchId}:
 *   delete:
 *     summary: Delete branch (soft, reference-guarded)
 *     tags: [Organization Setup]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Branch deleted successfully }
 *       404: { description: Branch not found }
 *       409: { description: Branch is referenced by other records }
 */
router.delete("/branches/:branchId", authMiddleware(ANY_ROLE), checkPermission("/branch", "delete"), deleteBranch);

/**
 * @swagger
 * /branches/search:
 *   post:
 *     summary: Search branches with pagination
 *     tags: [Organization Setup]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/SearchParams' }
 *     responses:
 *       200: { description: Paginated list of branches }
 */
router.post("/branches/search", authMiddleware(ANY_ROLE), checkPermission("/branch", "read"), listBranchByParams);

// ------------------------------------------------------------- Designation --

/**
 * @swagger
 * /designations:
 *   post:
 *     summary: Create a new designation
 *     tags: [Organization Setup]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateDesignation' }
 *     responses:
 *       201: { description: Designation created successfully }
 */
router.post("/designations", authMiddleware(ANY_ROLE), checkPermission("/designation", "write"), createDesignation);

/**
 * @swagger
 * /designations:
 *   get:
 *     summary: List all active designations (dropdown source, optional ?companyId filter)
 *     tags: [Organization Setup]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of designations }
 */
router.get("/designations", authMiddleware(ANY_ROLE), listDesignations);

/**
 * @swagger
 * /designations/{designationId}:
 *   get:
 *     summary: Get designation by ID
 *     tags: [Organization Setup]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: designationId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Designation details }
 *       404: { description: Designation not found }
 */
router.get("/designations/:designationId", authMiddleware(ANY_ROLE), checkPermission("/designation", "read"), getDesignationById);

/**
 * @swagger
 * /designations/{designationId}:
 *   put:
 *     summary: Update designation
 *     tags: [Organization Setup]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: designationId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateDesignation' }
 *     responses:
 *       200: { description: Designation updated successfully }
 *       404: { description: Designation not found }
 */
router.put("/designations/:designationId", authMiddleware(ANY_ROLE), checkPermission("/designation", "edit"), updateDesignation);

/**
 * @swagger
 * /designations/{designationId}:
 *   delete:
 *     summary: Delete designation (soft, reference-guarded)
 *     tags: [Organization Setup]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: designationId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Designation deleted successfully }
 *       404: { description: Designation not found }
 *       409: { description: Designation is referenced by other records }
 */
router.delete("/designations/:designationId", authMiddleware(ANY_ROLE), checkPermission("/designation", "delete"), deleteDesignation);

/**
 * @swagger
 * /designations/search:
 *   post:
 *     summary: Search designations with pagination
 *     tags: [Organization Setup]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/SearchParams' }
 *     responses:
 *       200: { description: Paginated list of designations }
 */
router.post("/designations/search", authMiddleware(ANY_ROLE), checkPermission("/designation", "read"), listDesignationByParams);

// --------------------------------------------------------- Employment Type --

/**
 * @swagger
 * /employment-types:
 *   post:
 *     summary: Create a new employment type
 *     tags: [Organization Setup]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateEmploymentType' }
 *     responses:
 *       201: { description: Employment type created successfully }
 */
router.post("/employment-types", authMiddleware(ANY_ROLE), checkPermission("/employment-type", "write"), createEmploymentType);

/**
 * @swagger
 * /employment-types:
 *   get:
 *     summary: List all active employment types (dropdown source)
 *     tags: [Organization Setup]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of employment types }
 */
router.get("/employment-types", authMiddleware(ANY_ROLE), listEmploymentTypes);

/**
 * @swagger
 * /employment-types/{employmentTypeId}:
 *   get:
 *     summary: Get employment type by ID
 *     tags: [Organization Setup]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: employmentTypeId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Employment type details }
 *       404: { description: Employment type not found }
 */
router.get("/employment-types/:employmentTypeId", authMiddleware(ANY_ROLE), checkPermission("/employment-type", "read"), getEmploymentTypeById);

/**
 * @swagger
 * /employment-types/{employmentTypeId}:
 *   put:
 *     summary: Update employment type
 *     tags: [Organization Setup]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: employmentTypeId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateEmploymentType' }
 *     responses:
 *       200: { description: Employment type updated successfully }
 *       404: { description: Employment type not found }
 */
router.put("/employment-types/:employmentTypeId", authMiddleware(ANY_ROLE), checkPermission("/employment-type", "edit"), updateEmploymentType);

/**
 * @swagger
 * /employment-types/{employmentTypeId}:
 *   delete:
 *     summary: Delete employment type (soft, reference-guarded)
 *     tags: [Organization Setup]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: employmentTypeId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Employment type deleted successfully }
 *       404: { description: Employment type not found }
 *       409: { description: Employment type is referenced by other records }
 */
router.delete("/employment-types/:employmentTypeId", authMiddleware(ANY_ROLE), checkPermission("/employment-type", "delete"), deleteEmploymentType);

/**
 * @swagger
 * /employment-types/search:
 *   post:
 *     summary: Search employment types with pagination
 *     tags: [Organization Setup]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/SearchParams' }
 *     responses:
 *       200: { description: Paginated list of employment types }
 */
router.post("/employment-types/search", authMiddleware(ANY_ROLE), checkPermission("/employment-type", "read"), listEmploymentTypeByParams);

// ---------------------------------------------------------- Employee Grade --

/**
 * @swagger
 * /employee-grades:
 *   post:
 *     summary: Create a new employee grade
 *     tags: [Organization Setup]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateEmployeeGrade' }
 *     responses:
 *       201: { description: Employee grade created successfully }
 */
router.post("/employee-grades", authMiddleware(ANY_ROLE), checkPermission("/employee-grade", "write"), createEmployeeGrade);

/**
 * @swagger
 * /employee-grades:
 *   get:
 *     summary: List all active employee grades (dropdown source)
 *     tags: [Organization Setup]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of employee grades }
 */
router.get("/employee-grades", authMiddleware(ANY_ROLE), listEmployeeGrades);

/**
 * @swagger
 * /employee-grades/{employeeGradeId}:
 *   get:
 *     summary: Get employee grade by ID
 *     tags: [Organization Setup]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: employeeGradeId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Employee grade details }
 *       404: { description: Employee grade not found }
 */
router.get("/employee-grades/:employeeGradeId", authMiddleware(ANY_ROLE), checkPermission("/employee-grade", "read"), getEmployeeGradeById);

/**
 * @swagger
 * /employee-grades/{employeeGradeId}:
 *   put:
 *     summary: Update employee grade
 *     tags: [Organization Setup]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: employeeGradeId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateEmployeeGrade' }
 *     responses:
 *       200: { description: Employee grade updated successfully }
 *       404: { description: Employee grade not found }
 */
router.put("/employee-grades/:employeeGradeId", authMiddleware(ANY_ROLE), checkPermission("/employee-grade", "edit"), updateEmployeeGrade);

/**
 * @swagger
 * /employee-grades/{employeeGradeId}:
 *   delete:
 *     summary: Delete employee grade (soft, reference-guarded)
 *     tags: [Organization Setup]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: employeeGradeId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Employee grade deleted successfully }
 *       404: { description: Employee grade not found }
 *       409: { description: Employee grade is referenced by other records }
 */
router.delete("/employee-grades/:employeeGradeId", authMiddleware(ANY_ROLE), checkPermission("/employee-grade", "delete"), deleteEmployeeGrade);

/**
 * @swagger
 * /employee-grades/search:
 *   post:
 *     summary: Search employee grades with pagination
 *     tags: [Organization Setup]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/SearchParams' }
 *     responses:
 *       200: { description: Paginated list of employee grades }
 */
router.post("/employee-grades/search", authMiddleware(ANY_ROLE), checkPermission("/employee-grade", "read"), listEmployeeGradeByParams);

// ------------------------------------------------ Employee Health Insurance --

/**
 * @swagger
 * /employee-health-insurances:
 *   post:
 *     summary: Create a new employee health insurance provider
 *     tags: [Employee Records]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateEmployeeHealthInsurance' }
 *     responses:
 *       201: { description: Health insurance provider created successfully }
 */
router.post(
  "/employee-health-insurances",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-health-insurance", "write"),
  createEmployeeHealthInsurance,
);

/**
 * @swagger
 * /employee-health-insurances:
 *   get:
 *     summary: List all active employee health insurance providers (dropdown source)
 *     tags: [Employee Records]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of health insurance providers }
 */
router.get("/employee-health-insurances", authMiddleware(ANY_ROLE), listEmployeeHealthInsurances);

/**
 * @swagger
 * /employee-health-insurances/{employeeHealthInsuranceId}:
 *   get:
 *     summary: Get employee health insurance provider by ID
 *     tags: [Employee Records]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: employeeHealthInsuranceId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Health insurance provider details }
 *       404: { description: Health insurance provider not found }
 */
router.get(
  "/employee-health-insurances/:employeeHealthInsuranceId",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-health-insurance", "read"),
  getEmployeeHealthInsuranceById,
);

/**
 * @swagger
 * /employee-health-insurances/{employeeHealthInsuranceId}:
 *   put:
 *     summary: Update employee health insurance provider
 *     tags: [Employee Records]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: employeeHealthInsuranceId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateEmployeeHealthInsurance' }
 *     responses:
 *       200: { description: Health insurance provider updated successfully }
 *       404: { description: Health insurance provider not found }
 */
router.put(
  "/employee-health-insurances/:employeeHealthInsuranceId",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-health-insurance", "edit"),
  updateEmployeeHealthInsurance,
);

/**
 * @swagger
 * /employee-health-insurances/{employeeHealthInsuranceId}:
 *   delete:
 *     summary: Delete employee health insurance provider (soft, reference-guarded)
 *     tags: [Employee Records]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: employeeHealthInsuranceId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Health insurance provider deleted successfully }
 *       404: { description: Health insurance provider not found }
 *       409: { description: Health insurance provider is referenced by other records }
 */
router.delete(
  "/employee-health-insurances/:employeeHealthInsuranceId",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-health-insurance", "delete"),
  deleteEmployeeHealthInsurance,
);

/**
 * @swagger
 * /employee-health-insurances/search:
 *   post:
 *     summary: Search employee health insurance providers with pagination
 *     tags: [Employee Records]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/SearchParams' }
 *     responses:
 *       200: { description: Paginated list of health insurance providers }
 */
router.post(
  "/employee-health-insurances/search",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-health-insurance", "read"),
  listEmployeeHealthInsuranceByParams,
);

export default router;
