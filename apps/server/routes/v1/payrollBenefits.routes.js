import express from "express";
import { ANY_ROLE } from "@demo-panel/shared/roles";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { checkPermission } from "../../middlewares/checkPermission.js";
import { allowOnlyFields } from "../../middlewares/inputValidator.js";
import * as controller from "../../controllers/v1/payrollBenefits.controller.js";

const router = express.Router();

// ============================================================================
// 1. Employee Benefit Application
// ============================================================================

/**
 * @swagger
 * /employee-benefit-applications:
 *   post:
 *     summary: createEmployeeBenefitApplication
 *     tags: [Payroll Benefits]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/employee-benefit-applications",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-benefit-application", "write"),
  allowOnlyFields(controller.EMPLOYEE_BENEFIT_APPLICATION_FIELDS),
  controller.createEmployeeBenefitApplication,
);

/**
 * @swagger
 * /employee-benefit-applications:
 *   get:
 *     summary: listEmployeeBenefitApplications
 *     tags: [Payroll Benefits]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/employee-benefit-applications",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-benefit-application", "read"),
  controller.listEmployeeBenefitApplications,
);

/**
 * @swagger
 * /employee-benefit-applications/search:
 *   post:
 *     summary: searchEmployeeBenefitApplications
 *     tags: [Payroll Benefits]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/employee-benefit-applications/search",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-benefit-application", "read"),
  controller.searchEmployeeBenefitApplications,
);

/**
 * @swagger
 * /employee-benefit-applications/{id}:
 *   get:
 *     summary: getEmployeeBenefitApplicationById
 *     tags: [Payroll Benefits]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/employee-benefit-applications/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-benefit-application", "read"),
  controller.getEmployeeBenefitApplicationById,
);

/**
 * @swagger
 * /employee-benefit-applications/{id}:
 *   put:
 *     summary: updateEmployeeBenefitApplication
 *     tags: [Payroll Benefits]
 *     security: [{ bearerAuth: [] }]
 */
router.put(
  "/employee-benefit-applications/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-benefit-application", "edit"),
  allowOnlyFields(controller.EMPLOYEE_BENEFIT_APPLICATION_FIELDS),
  controller.updateEmployeeBenefitApplication,
);

/**
 * @swagger
 * /employee-benefit-applications/{id}/submit:
 *   post:
 *     summary: submitEmployeeBenefitApplication
 *     tags: [Payroll Benefits]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/employee-benefit-applications/:id/submit",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-benefit-application", "edit"),
  controller.submitEmployeeBenefitApplication,
);

/**
 * @swagger
 * /employee-benefit-applications/{id}/cancel:
 *   post:
 *     summary: cancelEmployeeBenefitApplication
 *     tags: [Payroll Benefits]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/employee-benefit-applications/:id/cancel",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-benefit-application", "edit"),
  controller.cancelEmployeeBenefitApplication,
);

/**
 * @swagger
 * /employee-benefit-applications/{id}:
 *   delete:
 *     summary: deleteEmployeeBenefitApplication
 *     tags: [Payroll Benefits]
 *     security: [{ bearerAuth: [] }]
 */
router.delete(
  "/employee-benefit-applications/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-benefit-application", "delete"),
  controller.deleteEmployeeBenefitApplication,
);

// ============================================================================
// 2. Employee Benefit Claim
// ============================================================================

/**
 * @swagger
 * /employee-benefit-claims/calculate-eligibility:
 *   post:
 *     summary: calculateClaimEligibility
 *     tags: [Payroll Benefits]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/employee-benefit-claims/calculate-eligibility",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-benefit-claim", "read"),
  controller.calculateEligibility,
);

/**
 * @swagger
 * /employee-benefit-claims:
 *   post:
 *     summary: createEmployeeBenefitClaim
 *     tags: [Payroll Benefits]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/employee-benefit-claims",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-benefit-claim", "write"),
  allowOnlyFields(controller.EMPLOYEE_BENEFIT_CLAIM_FIELDS),
  controller.createEmployeeBenefitClaim,
);

/**
 * @swagger
 * /employee-benefit-claims:
 *   get:
 *     summary: listEmployeeBenefitClaims
 *     tags: [Payroll Benefits]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/employee-benefit-claims",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-benefit-claim", "read"),
  controller.listEmployeeBenefitClaims,
);

/**
 * @swagger
 * /employee-benefit-claims/search:
 *   post:
 *     summary: searchEmployeeBenefitClaims
 *     tags: [Payroll Benefits]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/employee-benefit-claims/search",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-benefit-claim", "read"),
  controller.searchEmployeeBenefitClaims,
);

/**
 * @swagger
 * /employee-benefit-claims/{id}:
 *   get:
 *     summary: getEmployeeBenefitClaimById
 *     tags: [Payroll Benefits]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/employee-benefit-claims/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-benefit-claim", "read"),
  controller.getEmployeeBenefitClaimById,
);

/**
 * @swagger
 * /employee-benefit-claims/{id}:
 *   put:
 *     summary: updateEmployeeBenefitClaim
 *     tags: [Payroll Benefits]
 *     security: [{ bearerAuth: [] }]
 */
router.put(
  "/employee-benefit-claims/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-benefit-claim", "edit"),
  allowOnlyFields(controller.EMPLOYEE_BENEFIT_CLAIM_FIELDS),
  controller.updateEmployeeBenefitClaim,
);

/**
 * @swagger
 * /employee-benefit-claims/{id}/submit:
 *   post:
 *     summary: submitEmployeeBenefitClaim
 *     tags: [Payroll Benefits]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/employee-benefit-claims/:id/submit",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-benefit-claim", "edit"),
  controller.submitEmployeeBenefitClaim,
);

/**
 * @swagger
 * /employee-benefit-claims/{id}/cancel:
 *   post:
 *     summary: cancelEmployeeBenefitClaim
 *     tags: [Payroll Benefits]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/employee-benefit-claims/:id/cancel",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-benefit-claim", "edit"),
  controller.cancelEmployeeBenefitClaim,
);

/**
 * @swagger
 * /employee-benefit-claims/{id}:
 *   delete:
 *     summary: deleteEmployeeBenefitClaim
 *     tags: [Payroll Benefits]
 *     security: [{ bearerAuth: [] }]
 */
router.delete(
  "/employee-benefit-claims/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-benefit-claim", "delete"),
  controller.deleteEmployeeBenefitClaim,
);

// ============================================================================
// 3. Employee Benefit Ledger (Read-Only API)
// ============================================================================

/**
 * @swagger
 * /employee-benefit-ledgers:
 *   get:
 *     summary: listEmployeeBenefitLedgers
 *     tags: [Payroll Benefits]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/employee-benefit-ledgers",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-benefit-ledger", "read"),
  controller.listEmployeeBenefitLedgers,
);

/**
 * @swagger
 * /employee-benefit-ledgers/search:
 *   post:
 *     summary: searchEmployeeBenefitLedgers
 *     tags: [Payroll Benefits]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/employee-benefit-ledgers/search",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-benefit-ledger", "read"),
  controller.searchEmployeeBenefitLedgers,
);

/**
 * @swagger
 * /employee-benefit-ledgers/{id}:
 *   get:
 *     summary: getEmployeeBenefitLedgerById
 *     tags: [Payroll Benefits]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/employee-benefit-ledgers/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-benefit-ledger", "read"),
  controller.getEmployeeBenefitLedgerById,
);

// ============================================================================
// 4. Payroll Correction
// ============================================================================

/**
 * @swagger
 * /payroll-corrections/calculate-breakup:
 *   post:
 *     summary: calculatePayrollCorrectionBreakup
 *     tags: [Payroll Benefits]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/payroll-corrections/calculate-breakup",
  authMiddleware(ANY_ROLE),
  checkPermission("/payroll-correction", "read"),
  controller.calculateBreakup,
);

/**
 * @swagger
 * /payroll-corrections:
 *   post:
 *     summary: createPayrollCorrection
 *     tags: [Payroll Benefits]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/payroll-corrections",
  authMiddleware(ANY_ROLE),
  checkPermission("/payroll-correction", "write"),
  allowOnlyFields(controller.PAYROLL_CORRECTION_FIELDS),
  controller.createPayrollCorrection,
);

/**
 * @swagger
 * /payroll-corrections:
 *   get:
 *     summary: listPayrollCorrections
 *     tags: [Payroll Benefits]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/payroll-corrections",
  authMiddleware(ANY_ROLE),
  checkPermission("/payroll-correction", "read"),
  controller.listPayrollCorrections,
);

/**
 * @swagger
 * /payroll-corrections/search:
 *   post:
 *     summary: searchPayrollCorrections
 *     tags: [Payroll Benefits]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/payroll-corrections/search",
  authMiddleware(ANY_ROLE),
  checkPermission("/payroll-correction", "read"),
  controller.searchPayrollCorrections,
);

/**
 * @swagger
 * /payroll-corrections/{id}:
 *   get:
 *     summary: getPayrollCorrectionById
 *     tags: [Payroll Benefits]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/payroll-corrections/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/payroll-correction", "read"),
  controller.getPayrollCorrectionById,
);

/**
 * @swagger
 * /payroll-corrections/{id}:
 *   put:
 *     summary: updatePayrollCorrection
 *     tags: [Payroll Benefits]
 *     security: [{ bearerAuth: [] }]
 */
router.put(
  "/payroll-corrections/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/payroll-correction", "edit"),
  allowOnlyFields(controller.PAYROLL_CORRECTION_FIELDS),
  controller.updatePayrollCorrection,
);

/**
 * @swagger
 * /payroll-corrections/{id}/submit:
 *   post:
 *     summary: submitPayrollCorrection
 *     tags: [Payroll Benefits]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/payroll-corrections/:id/submit",
  authMiddleware(ANY_ROLE),
  checkPermission("/payroll-correction", "edit"),
  controller.submitPayrollCorrection,
);

/**
 * @swagger
 * /payroll-corrections/{id}/cancel:
 *   post:
 *     summary: cancelPayrollCorrection
 *     tags: [Payroll Benefits]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/payroll-corrections/:id/cancel",
  authMiddleware(ANY_ROLE),
  checkPermission("/payroll-correction", "edit"),
  controller.cancelPayrollCorrection,
);

/**
 * @swagger
 * /payroll-corrections/{id}:
 *   delete:
 *     summary: deletePayrollCorrection
 *     tags: [Payroll Benefits]
 *     security: [{ bearerAuth: [] }]
 */
router.delete(
  "/payroll-corrections/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/payroll-correction", "delete"),
  controller.deletePayrollCorrection,
);

export default router;
