import express from "express";
import { ANY_ROLE } from "@demo-panel/shared/roles";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { checkPermission } from "../../middlewares/checkPermission.js";
import { allowOnlyFields } from "../../middlewares/inputValidator.js";
import * as controller from "../../controllers/v1/payrollRun.controller.js";

const router = express.Router();

// ------------------------------------------------------------- PayrollPeriod --
/**
 * @swagger
 * /payroll-periods:
 *   post:
 *     summary: createPayrollPeriod
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.post("/payroll-periods", authMiddleware(ANY_ROLE), checkPermission("/payroll-period", "write"), allowOnlyFields(controller.PAYROLLPERIOD_FIELDS), controller.createPayrollPeriod);
/**
 * @swagger
 * /payroll-periods:
 *   get:
 *     summary: listPayrollPeriods
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 */
router.get("/payroll-periods", authMiddleware(ANY_ROLE), checkPermission("/payroll-period", "read"), controller.listPayrollPeriods);
/**
 * @swagger
 * /payroll-periods/search:
 *   post:
 *     summary: searchPayrollPeriods
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 */
router.post("/payroll-periods/search", authMiddleware(ANY_ROLE), checkPermission("/payroll-period", "read"), controller.searchPayrollPeriods);
/**
 * @swagger
 * /payroll-periods/{payrollPeriodId}:
 *   get:
 *     summary: getPayrollPeriodById
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 */
router.get("/payroll-periods/:payrollPeriodId", authMiddleware(ANY_ROLE), checkPermission("/payroll-period", "read"), controller.getPayrollPeriodById);
/**
 * @swagger
 * /payroll-periods/{payrollPeriodId}:
 *   put:
 *     summary: updatePayrollPeriod
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 */
router.put("/payroll-periods/:payrollPeriodId", authMiddleware(ANY_ROLE), checkPermission("/payroll-period", "edit"), allowOnlyFields(controller.PAYROLLPERIOD_FIELDS), controller.updatePayrollPeriod);
/**
 * @swagger
 * /payroll-periods/{payrollPeriodId}:
 *   delete:
 *     summary: deletePayrollPeriod
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 */
router.delete("/payroll-periods/:payrollPeriodId", authMiddleware(ANY_ROLE), checkPermission("/payroll-period", "delete"), controller.deletePayrollPeriod);

// ------------------------------------------------------------ PayrollSettings --
// A true global singleton — GET/PUT only, no create/delete/list/search.
/**
 * @swagger
 * /payroll-settings:
 *   get:
 *     summary: getPayrollSettings
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 */
router.get("/payroll-settings", authMiddleware(ANY_ROLE), checkPermission("/payroll-settings", "read"), controller.getPayrollSettings);
/**
 * @swagger
 * /payroll-settings:
 *   put:
 *     summary: updatePayrollSettings
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 */
router.put("/payroll-settings", authMiddleware(ANY_ROLE), checkPermission("/payroll-settings", "edit"), allowOnlyFields(controller.PAYROLLSETTINGS_FIELDS), controller.updatePayrollSettings);

// ------------------------------------------------------------------ SalarySlip --
/**
 * @swagger
 * /salary-slips:
 *   post:
 *     summary: createSalarySlip
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 */
router.post("/salary-slips", authMiddleware(ANY_ROLE), checkPermission("/salary-slip", "write"), allowOnlyFields(["employeeId", "startDate", "endDate", "salaryStructureAssignmentId"]), controller.createSalarySlip);
/**
 * @swagger
 * /salary-slips:
 *   get:
 *     summary: listSalarySlips
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 */
router.get("/salary-slips", authMiddleware(ANY_ROLE), checkPermission("/salary-slip", "read"), controller.listSalarySlips);
/**
 * @swagger
 * /salary-slips/search:
 *   post:
 *     summary: searchSalarySlips
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 */
router.post("/salary-slips/search", authMiddleware(ANY_ROLE), checkPermission("/salary-slip", "read"), controller.searchSalarySlips);
/**
 * @swagger
 * /salary-slips/{salarySlipId}:
 *   get:
 *     summary: getSalarySlipById
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 */
router.get("/salary-slips/:salarySlipId", authMiddleware(ANY_ROLE), checkPermission("/salary-slip", "read"), controller.getSalarySlipById);
/**
 * @swagger
 * /salary-slips/{salarySlipId}:
 *   put:
 *     summary: updateSalarySlip
 *     description: A Salary Slip is a read-only snapshot — no field can actually be changed through this endpoint (allowOnlyFields([])). Exists only so the admin's generic edit screen has something to call; Submit/Cancel are the real actions.
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 */
router.put("/salary-slips/:salarySlipId", authMiddleware(ANY_ROLE), checkPermission("/salary-slip", "edit"), allowOnlyFields([]), controller.updateSalarySlip);
/**
 * @swagger
 * /salary-slips/{salarySlipId}:
 *   delete:
 *     summary: deleteSalarySlip
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 */
router.delete("/salary-slips/:salarySlipId", authMiddleware(ANY_ROLE), checkPermission("/salary-slip", "delete"), controller.deleteSalarySlip);
/**
 * @swagger
 * /salary-slips/{salarySlipId}/submit:
 *   post:
 *     summary: submitSalarySlip
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 */
router.post("/salary-slips/:salarySlipId/submit", authMiddleware(ANY_ROLE), checkPermission("/salary-slip", "edit"), controller.submitSalarySlip);
/**
 * @swagger
 * /salary-slips/{salarySlipId}/cancel:
 *   post:
 *     summary: cancelSalarySlip
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 */
router.post("/salary-slips/:salarySlipId/cancel", authMiddleware(ANY_ROLE), checkPermission("/salary-slip", "edit"), controller.cancelSalarySlip);

export default router;
