import express from "express";
import { ANY_ROLE } from "@demo-panel/shared/roles";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { checkPermission } from "../../middlewares/checkPermission.js";
import { allowOnlyFields } from "../../middlewares/inputValidator.js";
import * as controller from "../../controllers/v1/payroll.controller.js";

const router = express.Router();

// ------------------------------------------------------------ SalaryComponent --
/**
 * @swagger
 * /salary-components:
 *   post:
 *     summary: createSalaryComponent
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.post("/salary-components", authMiddleware(ANY_ROLE), checkPermission("/salary-component", "write"), allowOnlyFields(controller.SALARYCOMPONENT_FIELDS), controller.createSalaryComponent);
/**
 * @swagger
 * /salary-components:
 *   get:
 *     summary: listSalaryComponents
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 */
router.get("/salary-components", authMiddleware(ANY_ROLE), checkPermission("/salary-component", "read"), controller.listSalaryComponents);
/**
 * @swagger
 * /salary-components/search:
 *   post:
 *     summary: searchSalaryComponents
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 */
router.post("/salary-components/search", authMiddleware(ANY_ROLE), checkPermission("/salary-component", "read"), controller.searchSalaryComponents);
/**
 * @swagger
 * /salary-components/{salaryComponentId}:
 *   get:
 *     summary: getSalaryComponentById
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 */
router.get("/salary-components/:salaryComponentId", authMiddleware(ANY_ROLE), checkPermission("/salary-component", "read"), controller.getSalaryComponentById);
/**
 * @swagger
 * /salary-components/{salaryComponentId}:
 *   put:
 *     summary: updateSalaryComponent
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 */
router.put("/salary-components/:salaryComponentId", authMiddleware(ANY_ROLE), checkPermission("/salary-component", "edit"), allowOnlyFields(controller.SALARYCOMPONENT_FIELDS), controller.updateSalaryComponent);
/**
 * @swagger
 * /salary-components/{salaryComponentId}:
 *   delete:
 *     summary: deleteSalaryComponent
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 */
router.delete("/salary-components/:salaryComponentId", authMiddleware(ANY_ROLE), checkPermission("/salary-component", "delete"), controller.deleteSalaryComponent);

// ------------------------------------------------------------ SalaryStructure --
/**
 * @swagger
 * /salary-structures:
 *   post:
 *     summary: createSalaryStructure
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 */
router.post("/salary-structures", authMiddleware(ANY_ROLE), checkPermission("/salary-structure", "write"), allowOnlyFields(controller.SALARYSTRUCTURE_FIELDS), controller.createSalaryStructure);
/**
 * @swagger
 * /salary-structures:
 *   get:
 *     summary: listSalaryStructures
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 */
router.get("/salary-structures", authMiddleware(ANY_ROLE), checkPermission("/salary-structure", "read"), controller.listSalaryStructures);
/**
 * @swagger
 * /salary-structures/search:
 *   post:
 *     summary: searchSalaryStructures
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 */
router.post("/salary-structures/search", authMiddleware(ANY_ROLE), checkPermission("/salary-structure", "read"), controller.searchSalaryStructures);
/**
 * @swagger
 * /salary-structures/{salaryStructureId}:
 *   get:
 *     summary: getSalaryStructureById
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 */
router.get("/salary-structures/:salaryStructureId", authMiddleware(ANY_ROLE), checkPermission("/salary-structure", "read"), controller.getSalaryStructureById);
/**
 * @swagger
 * /salary-structures/{salaryStructureId}:
 *   put:
 *     summary: updateSalaryStructure
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 */
router.put("/salary-structures/:salaryStructureId", authMiddleware(ANY_ROLE), checkPermission("/salary-structure", "edit"), allowOnlyFields(controller.SALARYSTRUCTURE_FIELDS), controller.updateSalaryStructure);
/**
 * @swagger
 * /salary-structures/{salaryStructureId}:
 *   delete:
 *     summary: deleteSalaryStructure
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 */
router.delete("/salary-structures/:salaryStructureId", authMiddleware(ANY_ROLE), checkPermission("/salary-structure", "delete"), controller.deleteSalaryStructure);

// ---------------------------------------------------- SalaryStructureAssignment --
/**
 * @swagger
 * /salary-structure-assignments:
 *   post:
 *     summary: createSalaryStructureAssignment
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 */
router.post("/salary-structure-assignments", authMiddleware(ANY_ROLE), checkPermission("/salary-structure-assignment", "write"), allowOnlyFields(controller.SALARYSTRUCTUREASSIGNMENT_FIELDS), controller.createSalaryStructureAssignment);
/**
 * @swagger
 * /salary-structure-assignments:
 *   get:
 *     summary: listSalaryStructureAssignments
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 */
router.get("/salary-structure-assignments", authMiddleware(ANY_ROLE), checkPermission("/salary-structure-assignment", "read"), controller.listSalaryStructureAssignments);
/**
 * @swagger
 * /salary-structure-assignments/search:
 *   post:
 *     summary: searchSalaryStructureAssignments
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 */
router.post("/salary-structure-assignments/search", authMiddleware(ANY_ROLE), checkPermission("/salary-structure-assignment", "read"), controller.searchSalaryStructureAssignments);
/**
 * @swagger
 * /salary-structure-assignments/{salaryStructureAssignmentId}:
 *   get:
 *     summary: getSalaryStructureAssignmentById
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 */
router.get("/salary-structure-assignments/:salaryStructureAssignmentId", authMiddleware(ANY_ROLE), checkPermission("/salary-structure-assignment", "read"), controller.getSalaryStructureAssignmentById);
/**
 * @swagger
 * /salary-structure-assignments/{salaryStructureAssignmentId}:
 *   put:
 *     summary: updateSalaryStructureAssignment
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 */
router.put("/salary-structure-assignments/:salaryStructureAssignmentId", authMiddleware(ANY_ROLE), checkPermission("/salary-structure-assignment", "edit"), allowOnlyFields(["base", "variable", "leaveEncashmentAmountPerDay", "maxBenefits", "employeeBenefits", "incomeTaxSlabId", "taxDeductedTillDate", "taxableEarningsTillDate"]), controller.updateSalaryStructureAssignment);
/**
 * @swagger
 * /salary-structure-assignments/{salaryStructureAssignmentId}:
 *   delete:
 *     summary: deleteSalaryStructureAssignment
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 */
router.delete("/salary-structure-assignments/:salaryStructureAssignmentId", authMiddleware(ANY_ROLE), checkPermission("/salary-structure-assignment", "delete"), controller.deleteSalaryStructureAssignment);

// ---------------------------------------------- Bulk Salary Structure Assignment --
// Stateless bulk-action tool, no stored model (ADR-026). Gated on the same
// menu row as the Structure Assignment screen itself, matching Shift
// Assignment Tool's own precedent of a dedicated menu row for the tool.
/**
 * @swagger
 * /payroll/bulk-salary-structure-assignment/eligible-employees:
 *   post:
 *     summary: eligibleEmployeesForBulkAssignment
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 */
router.post("/payroll/bulk-salary-structure-assignment/eligible-employees", authMiddleware(ANY_ROLE), checkPermission("/bulk-salary-structure-assignment", "read"), controller.eligibleEmployeesForBulkAssignment);
/**
 * @swagger
 * /payroll/bulk-salary-structure-assignment/assign:
 *   post:
 *     summary: bulkAssignSalaryStructure
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 */
router.post("/payroll/bulk-salary-structure-assignment/assign", authMiddleware(ANY_ROLE), checkPermission("/bulk-salary-structure-assignment", "edit"), controller.bulkAssignSalaryStructure);

export default router;
