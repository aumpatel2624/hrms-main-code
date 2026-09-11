import express from "express";
import { ANY_ROLE } from "@demo-panel/shared/roles";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { checkPermission } from "../../middlewares/checkPermission.js";
import { allowOnlyFields } from "../../middlewares/inputValidator.js";
import * as controller from "../../controllers/v1/payrollRun.controller.js";

import * as orchestration from "../../controllers/v1/payrollOrchestration.controller.js";
import { body, param } from "express-validator";
import { handleValidationErrors, searchValidation } from "../../middlewares/inputValidator.js";
import { PAYROLL_FREQUENCIES } from "../../utils/salaryWithholdingCycles.js";

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

/**
 * @swagger
 * /payroll-entries:
 *   post:
 *     summary: createPayrollEntry
 *     tags: [Payroll]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input or transition }
 *       403: { description: Permission denied }
 */
router.post("/payroll-entries", authMiddleware(ANY_ROLE), checkPermission("/payroll-entry", "write"), allowOnlyFields(["companyId", "startDate", "endDate", "payrollPeriodId", "payrollFrequency", "validateAttendance"]), body("companyId").isMongoId(), body("payrollFrequency").isIn(PAYROLL_FREQUENCIES), body("payrollPeriodId").optional().isMongoId(), body("startDate").optional().isISO8601(), body("endDate").optional().isISO8601(), body("validateAttendance").optional().isBoolean(), handleValidationErrors, orchestration.createPayrollEntry);

/**
 * @swagger
 * /payroll-entries/search:
 *   post:
 *     summary: searchPayrollEntries
 *     tags: [Payroll]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input or transition }
 *       403: { description: Permission denied }
 */
router.post("/payroll-entries/search", authMiddleware(ANY_ROLE), checkPermission("/payroll-entry", "read"), searchValidation, orchestration.searchPayrollEntries);

/**
 * @swagger
 * /payroll-entries/{id}:
 *   get:
 *     summary: getPayrollEntry
 *     tags: [Payroll]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input or transition }
 *       403: { description: Permission denied }
 */
router.get("/payroll-entries/:id", authMiddleware(ANY_ROLE), checkPermission("/payroll-entry", "read"), param("id").isMongoId(), handleValidationErrors, orchestration.getPayrollEntry);

/**
 * @swagger
 * /payroll-entries/{id}/create-slips:
 *   post:
 *     summary: createPayrollSlips
 *     tags: [Payroll]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input or transition }
 *       403: { description: Permission denied }
 */
router.post("/payroll-entries/:id/create-slips", authMiddleware(ANY_ROLE), checkPermission("/payroll-entry", "edit"), allowOnlyFields([]), param("id").isMongoId(), handleValidationErrors, orchestration.createPayrollSlips);

/**
 * @swagger
 * /payroll-entries/{id}/submit-slips:
 *   post:
 *     summary: submitPayrollSlips
 *     tags: [Payroll]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input or transition }
 *       403: { description: Permission denied }
 */
router.post("/payroll-entries/:id/submit-slips", authMiddleware(ANY_ROLE), checkPermission("/payroll-entry", "edit"), allowOnlyFields([]), param("id").isMongoId(), handleValidationErrors, orchestration.submitPayrollSlips);

/**
 * @swagger
 * /payroll-entries/{id}/cancel:
 *   post:
 *     summary: cancelPayrollEntry
 *     tags: [Payroll]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input or transition }
 *       403: { description: Permission denied }
 */
router.post("/payroll-entries/:id/cancel", authMiddleware(ANY_ROLE), checkPermission("/payroll-entry", "edit"), allowOnlyFields([]), param("id").isMongoId(), handleValidationErrors, orchestration.cancelPayrollEntry);

/**
 * @swagger
 * /salary-withholdings:
 *   post:
 *     summary: createSalaryWithholding
 *     tags: [Payroll]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input or transition }
 *       403: { description: Permission denied }
 */
router.post("/salary-withholdings", authMiddleware(ANY_ROLE), checkPermission("/salary-withholding", "write"), allowOnlyFields(["employeeId", "fromDate", "numberOfWithholdingCycles"]), body("employeeId").isMongoId(), body("fromDate").isISO8601(), body("numberOfWithholdingCycles").isInt({ min: 1, max: 1200 }).toInt(), handleValidationErrors, orchestration.createSalaryWithholding);

/**
 * @swagger
 * /salary-withholdings/search:
 *   post:
 *     summary: searchSalaryWithholdings
 *     tags: [Payroll]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input or transition }
 *       403: { description: Permission denied }
 */
router.post("/salary-withholdings/search", authMiddleware(ANY_ROLE), checkPermission("/salary-withholding", "read"), searchValidation, orchestration.searchSalaryWithholdings);

/**
 * @swagger
 * /salary-withholdings/{id}:
 *   get:
 *     summary: getSalaryWithholding
 *     tags: [Payroll]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input or transition }
 *       403: { description: Permission denied }
 */
router.get("/salary-withholdings/:id", authMiddleware(ANY_ROLE), checkPermission("/salary-withholding", "read"), param("id").isMongoId(), handleValidationErrors, orchestration.getSalaryWithholding);

/**
 * @swagger
 * /salary-withholdings/{id}/release-cycle:
 *   post:
 *     summary: releaseWithholdingCycle
 *     tags: [Payroll]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input or transition }
 *       403: { description: Permission denied }
 */
router.post("/salary-withholdings/:id/release-cycle", authMiddleware(ANY_ROLE), checkPermission("/salary-withholding", "edit"), allowOnlyFields(["cycleId", "releaseReference"]), param("id").isMongoId(), body("cycleId").isMongoId(), body("releaseReference").optional().isString().isLength({ max: 500 }), handleValidationErrors, orchestration.releaseWithholdingCycle);

/**
 * @swagger
 * /salary-withholdings/{id}/release-all:
 *   post:
 *     summary: releaseAllWithholdingCycles
 *     tags: [Payroll]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input or transition }
 *       403: { description: Permission denied }
 */
router.post("/salary-withholdings/:id/release-all", authMiddleware(ANY_ROLE), checkPermission("/salary-withholding", "edit"), allowOnlyFields(["releaseReference"]), param("id").isMongoId(), body("releaseReference").optional().isString().isLength({ max: 500 }), handleValidationErrors, orchestration.releaseAllWithholdingCycles);

/**
 * @swagger
 * /salary-withholdings/{id}/cancel:
 *   post:
 *     summary: cancelSalaryWithholding
 *     tags: [Payroll]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input or transition }
 *       403: { description: Permission denied }
 */
router.post("/salary-withholdings/:id/cancel", authMiddleware(ANY_ROLE), checkPermission("/salary-withholding", "edit"), allowOnlyFields([]), param("id").isMongoId(), handleValidationErrors, orchestration.cancelSalaryWithholding);

/**
 * @swagger
 * /salary-withholdings/{id}:
 *   put:
 *     summary: updateSalaryWithholding
 *     tags: [Payroll]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Cancel before deleting; snapshots cannot be edited }
 *       409: { description: Referenced record }
 */
router.put("/salary-withholdings/:id", authMiddleware(ANY_ROLE), checkPermission("/salary-withholding", "edit"), allowOnlyFields([]), param("id").isMongoId(), handleValidationErrors, orchestration.updateSalaryWithholding);
/**
 * @swagger
 * /salary-withholdings/{id}:
 *   delete:
 *     summary: deleteSalaryWithholding
 *     tags: [Payroll]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Cancel before deleting; snapshots cannot be edited }
 *       409: { description: Referenced record }
 */
router.delete("/salary-withholdings/:id", authMiddleware(ANY_ROLE), checkPermission("/salary-withholding", "delete"), allowOnlyFields([]), param("id").isMongoId(), handleValidationErrors, orchestration.deleteSalaryWithholding);
/**
 * @swagger
 * /payroll-entries/{id}:
 *   delete:
 *     summary: deletePayrollEntry
 *     tags: [Payroll]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Cancel before deleting; snapshots cannot be edited }
 *       409: { description: Referenced record }
 */
router.delete("/payroll-entries/:id", authMiddleware(ANY_ROLE), checkPermission("/payroll-entry", "delete"), allowOnlyFields([]), param("id").isMongoId(), handleValidationErrors, orchestration.deletePayrollEntry);

export default router;
