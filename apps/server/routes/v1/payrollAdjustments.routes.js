import express from "express";
import { ANY_ROLE } from "@demo-panel/shared/roles";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { checkPermission } from "../../middlewares/checkPermission.js";
import { allowOnlyFields } from "../../middlewares/inputValidator.js";
import * as controller from "../../controllers/v1/payrollAdjustments.controller.js";

const router = express.Router();

// ============================================================================
// 1. Additional Salary
// ============================================================================

/**
 * @swagger
 * /additional-salaries:
 *   post:
 *     summary: createAdditionalSalary
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/additional-salaries",
  authMiddleware(ANY_ROLE),
  checkPermission("/additional-salary", "write"),
  allowOnlyFields(controller.ADDITIONAL_SALARY_FIELDS),
  controller.createAdditionalSalary,
);

/**
 * @swagger
 * /additional-salaries:
 *   get:
 *     summary: listAdditionalSalaries
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/additional-salaries",
  authMiddleware(ANY_ROLE),
  checkPermission("/additional-salary", "read"),
  controller.listAdditionalSalaries,
);

/**
 * @swagger
 * /additional-salaries/search:
 *   post:
 *     summary: searchAdditionalSalaries
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/additional-salaries/search",
  authMiddleware(ANY_ROLE),
  checkPermission("/additional-salary", "read"),
  controller.searchAdditionalSalaries,
);

/**
 * @swagger
 * /additional-salaries/{id}:
 *   get:
 *     summary: getAdditionalSalaryById
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/additional-salaries/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/additional-salary", "read"),
  controller.getAdditionalSalaryById,
);

/**
 * @swagger
 * /additional-salaries/{id}/cancel:
 *   post:
 *     summary: cancelAdditionalSalary
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/additional-salaries/:id/cancel",
  authMiddleware(ANY_ROLE),
  checkPermission("/additional-salary", "edit"),
  controller.cancelAdditionalSalary,
);

/**
 * @swagger
 * /additional-salaries/{id}:
 *   delete:
 *     summary: deleteAdditionalSalary
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.delete(
  "/additional-salaries/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/additional-salary", "delete"),
  controller.deleteAdditionalSalary,
);

// ============================================================================
// 2. Arrear
// ============================================================================

/**
 * @swagger
 * /arrears:
 *   post:
 *     summary: createArrear
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/arrears",
  authMiddleware(ANY_ROLE),
  checkPermission("/arrear", "write"),
  allowOnlyFields(controller.ARREAR_FIELDS),
  controller.createArrear,
);

/**
 * @swagger
 * /arrears/calculate:
 *   post:
 *     summary: calculateArrearPreview
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/arrears/calculate",
  authMiddleware(ANY_ROLE),
  checkPermission("/arrear", "read"),
  controller.calculateArrearPreview,
);

/**
 * @swagger
 * /arrears:
 *   get:
 *     summary: listArrears
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/arrears",
  authMiddleware(ANY_ROLE),
  checkPermission("/arrear", "read"),
  controller.listArrears,
);

/**
 * @swagger
 * /arrears/search:
 *   post:
 *     summary: searchArrears
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/arrears/search",
  authMiddleware(ANY_ROLE),
  checkPermission("/arrear", "read"),
  controller.searchArrears,
);

/**
 * @swagger
 * /arrears/{id}:
 *   get:
 *     summary: getArrearById
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/arrears/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/arrear", "read"),
  controller.getArrearById,
);

/**
 * @swagger
 * /arrears/{id}:
 *   put:
 *     summary: updateArrear
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.put(
  "/arrears/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/arrear", "edit"),
  controller.updateArrear,
);

/**
 * @swagger
 * /arrears/{id}/submit:
 *   post:
 *     summary: submitArrear
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/arrears/:id/submit",
  authMiddleware(ANY_ROLE),
  checkPermission("/arrear", "edit"),
  controller.submitArrear,
);

/**
 * @swagger
 * /arrears/{id}/cancel:
 *   post:
 *     summary: cancelArrear
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/arrears/:id/cancel",
  authMiddleware(ANY_ROLE),
  checkPermission("/arrear", "edit"),
  controller.cancelArrear,
);

/**
 * @swagger
 * /arrears/{id}:
 *   delete:
 *     summary: deleteArrear
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.delete(
  "/arrears/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/arrear", "delete"),
  controller.deleteArrear,
);

// ============================================================================
// 3. Retention Bonus
// ============================================================================

/**
 * @swagger
 * /retention-bonuses:
 *   post:
 *     summary: createRetentionBonus
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/retention-bonuses",
  authMiddleware(ANY_ROLE),
  checkPermission("/retention-bonus", "write"),
  allowOnlyFields(controller.RETENTION_BONUS_FIELDS),
  controller.createRetentionBonus,
);

/**
 * @swagger
 * /retention-bonuses:
 *   get:
 *     summary: listRetentionBonuses
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/retention-bonuses",
  authMiddleware(ANY_ROLE),
  checkPermission("/retention-bonus", "read"),
  controller.listRetentionBonuses,
);

/**
 * @swagger
 * /retention-bonuses/search:
 *   post:
 *     summary: searchRetentionBonuses
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/retention-bonuses/search",
  authMiddleware(ANY_ROLE),
  checkPermission("/retention-bonus", "read"),
  controller.searchRetentionBonuses,
);

/**
 * @swagger
 * /retention-bonuses/{id}:
 *   get:
 *     summary: getRetentionBonusById
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/retention-bonuses/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/retention-bonus", "read"),
  controller.getRetentionBonusById,
);

/**
 * @swagger
 * /retention-bonuses/{id}:
 *   put:
 *     summary: updateRetentionBonus
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.put(
  "/retention-bonuses/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/retention-bonus", "edit"),
  controller.updateRetentionBonus,
);

/**
 * @swagger
 * /retention-bonuses/{id}/submit:
 *   post:
 *     summary: submitRetentionBonus
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/retention-bonuses/:id/submit",
  authMiddleware(ANY_ROLE),
  checkPermission("/retention-bonus", "edit"),
  controller.submitRetentionBonus,
);

/**
 * @swagger
 * /retention-bonuses/{id}/cancel:
 *   post:
 *     summary: cancelRetentionBonus
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/retention-bonuses/:id/cancel",
  authMiddleware(ANY_ROLE),
  checkPermission("/retention-bonus", "edit"),
  controller.cancelRetentionBonus,
);

/**
 * @swagger
 * /retention-bonuses/{id}:
 *   delete:
 *     summary: deleteRetentionBonus
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.delete(
  "/retention-bonuses/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/retention-bonus", "delete"),
  controller.deleteRetentionBonus,
);

// ============================================================================
// 4. Employee Incentive
// ============================================================================

/**
 * @swagger
 * /employee-incentives:
 *   post:
 *     summary: createEmployeeIncentive
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/employee-incentives",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-incentive", "write"),
  allowOnlyFields(controller.EMPLOYEE_INCENTIVE_FIELDS),
  controller.createEmployeeIncentive,
);

/**
 * @swagger
 * /employee-incentives:
 *   get:
 *     summary: listEmployeeIncentives
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/employee-incentives",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-incentive", "read"),
  controller.listEmployeeIncentives,
);

/**
 * @swagger
 * /employee-incentives/search:
 *   post:
 *     summary: searchEmployeeIncentives
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/employee-incentives/search",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-incentive", "read"),
  controller.searchEmployeeIncentives,
);

/**
 * @swagger
 * /employee-incentives/{id}:
 *   get:
 *     summary: getEmployeeIncentiveById
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/employee-incentives/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-incentive", "read"),
  controller.getEmployeeIncentiveById,
);

/**
 * @swagger
 * /employee-incentives/{id}:
 *   put:
 *     summary: updateEmployeeIncentive
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.put(
  "/employee-incentives/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-incentive", "edit"),
  controller.updateEmployeeIncentive,
);

/**
 * @swagger
 * /employee-incentives/{id}/submit:
 *   post:
 *     summary: submitEmployeeIncentive
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/employee-incentives/:id/submit",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-incentive", "edit"),
  controller.submitEmployeeIncentive,
);

/**
 * @swagger
 * /employee-incentives/{id}/cancel:
 *   post:
 *     summary: cancelEmployeeIncentive
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/employee-incentives/:id/cancel",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-incentive", "edit"),
  controller.cancelEmployeeIncentive,
);

/**
 * @swagger
 * /employee-incentives/{id}:
 *   delete:
 *     summary: deleteEmployeeIncentive
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.delete(
  "/employee-incentives/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-incentive", "delete"),
  controller.deleteEmployeeIncentive,
);

// ============================================================================
// 5. Employee Other Income
// ============================================================================

/**
 * @swagger
 * /employee-other-incomes:
 *   post:
 *     summary: createEmployeeOtherIncome
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/employee-other-incomes",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-other-income", "write"),
  allowOnlyFields(controller.EMPLOYEE_OTHER_INCOME_FIELDS),
  controller.createEmployeeOtherIncome,
);

/**
 * @swagger
 * /employee-other-incomes:
 *   get:
 *     summary: listEmployeeOtherIncomes
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/employee-other-incomes",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-other-income", "read"),
  controller.listEmployeeOtherIncomes,
);

/**
 * @swagger
 * /employee-other-incomes/search:
 *   post:
 *     summary: searchEmployeeOtherIncomes
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/employee-other-incomes/search",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-other-income", "read"),
  controller.searchEmployeeOtherIncomes,
);

/**
 * @swagger
 * /employee-other-incomes/{id}:
 *   get:
 *     summary: getEmployeeOtherIncomeById
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/employee-other-incomes/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-other-income", "read"),
  controller.getEmployeeOtherIncomeById,
);

/**
 * @swagger
 * /employee-other-incomes/{id}:
 *   put:
 *     summary: updateEmployeeOtherIncome
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.put(
  "/employee-other-incomes/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-other-income", "edit"),
  controller.updateEmployeeOtherIncome,
);

/**
 * @swagger
 * /employee-other-incomes/{id}/submit:
 *   post:
 *     summary: submitEmployeeOtherIncome
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/employee-other-incomes/:id/submit",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-other-income", "edit"),
  controller.submitEmployeeOtherIncome,
);

/**
 * @swagger
 * /employee-other-incomes/{id}/cancel:
 *   post:
 *     summary: cancelEmployeeOtherIncome
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/employee-other-incomes/:id/cancel",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-other-income", "edit"),
  controller.cancelEmployeeOtherIncome,
);

/**
 * @swagger
 * /employee-other-incomes/{id}:
 *   delete:
 *     summary: deleteEmployeeOtherIncome
 *     tags: [Payroll Adjustments]
 *     security: [{ bearerAuth: [] }]
 */
router.delete(
  "/employee-other-incomes/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-other-income", "delete"),
  controller.deleteEmployeeOtherIncome,
);

export default router;
