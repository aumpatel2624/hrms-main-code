import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { checkPermission } from "../../middlewares/checkPermission.js";
import { ANY_ROLE } from "@demo-panel/shared/roles";
import {
  createEmployee, updateEmployee, deleteEmployee, getEmployeeById, listEmployees, listEmployeeByParams,
} from "../../controllers/v1/employee.controller.js";

const router = express.Router();

/**
 * @swagger
 * /employees:
 *   post:
 *     summary: Create a new employee
 *     tags: [Employee Records]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateEmployee' }
 *     responses:
 *       201: { description: Employee created successfully }
 */
router.post("/employees", authMiddleware(ANY_ROLE), checkPermission("/employee", "write"), createEmployee);

/**
 * @swagger
 * /employees:
 *   get:
 *     summary: List all active employees (dropdown source, optional ?companyId/?departmentId filter)
 *     tags: [Employee Records]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema: { type: string }
 *       - in: query
 *         name: departmentId
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of employees }
 */
router.get("/employees", authMiddleware(ANY_ROLE), listEmployees);

/**
 * @swagger
 * /employees/{employeeId}:
 *   get:
 *     summary: Get employee by ID
 *     tags: [Employee Records]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Employee details }
 *       404: { description: Employee not found }
 */
router.get("/employees/:employeeId", authMiddleware(ANY_ROLE), checkPermission("/employee", "read"), getEmployeeById);

/**
 * @swagger
 * /employees/{employeeId}:
 *   put:
 *     summary: Update employee
 *     tags: [Employee Records]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateEmployee' }
 *     responses:
 *       200: { description: Employee updated successfully }
 *       404: { description: Employee not found }
 */
router.put("/employees/:employeeId", authMiddleware(ANY_ROLE), checkPermission("/employee", "edit"), updateEmployee);

/**
 * @swagger
 * /employees/{employeeId}:
 *   delete:
 *     summary: Delete employee (soft, reference-guarded)
 *     tags: [Employee Records]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Employee deleted successfully }
 *       404: { description: Employee not found }
 *       409: { description: Employee is referenced by other records }
 */
router.delete("/employees/:employeeId", authMiddleware(ANY_ROLE), checkPermission("/employee", "delete"), deleteEmployee);

/**
 * @swagger
 * /employees/search:
 *   post:
 *     summary: Search employees with pagination
 *     tags: [Employee Records]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/SearchParams' }
 *     responses:
 *       200: { description: Paginated list of employees }
 */
router.post("/employees/search", authMiddleware(ANY_ROLE), checkPermission("/employee", "read"), listEmployeeByParams);

export default router;
