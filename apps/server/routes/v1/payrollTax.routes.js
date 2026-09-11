import express from "express";
import { ANY_ROLE } from "@demo-panel/shared/roles";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { checkPermission } from "../../middlewares/checkPermission.js";
import { allowOnlyFields } from "../../middlewares/inputValidator.js";
import * as controller from "../../controllers/v1/payrollTax.controller.js";

const router = express.Router();

// ============================================================================
// 1. Income Tax Slab
// ============================================================================

/**
 * @swagger
 * /income-tax-slabs:
 *   post:
 *     summary: createIncomeTaxSlab
 *     tags: [Payroll Tax]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/income-tax-slabs",
  authMiddleware(ANY_ROLE),
  checkPermission("/income-tax-slab", "write"),
  allowOnlyFields(controller.INCOMETAXSLAB_FIELDS),
  controller.createIncomeTaxSlab,
);

/**
 * @swagger
 * /income-tax-slabs:
 *   get:
 *     summary: listIncomeTaxSlabs
 *     tags: [Payroll Tax]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/income-tax-slabs",
  authMiddleware(ANY_ROLE),
  checkPermission("/income-tax-slab", "read"),
  controller.listIncomeTaxSlabs,
);

/**
 * @swagger
 * /income-tax-slabs/search:
 *   post:
 *     summary: searchIncomeTaxSlabs
 *     tags: [Payroll Tax]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/income-tax-slabs/search",
  authMiddleware(ANY_ROLE),
  checkPermission("/income-tax-slab", "read"),
  controller.searchIncomeTaxSlabs,
);

/**
 * @swagger
 * /income-tax-slabs/{incomeTaxSlabId}:
 *   get:
 *     summary: getIncomeTaxSlabById
 *     tags: [Payroll Tax]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/income-tax-slabs/:incomeTaxSlabId",
  authMiddleware(ANY_ROLE),
  checkPermission("/income-tax-slab", "read"),
  controller.getIncomeTaxSlabById,
);

/**
 * @swagger
 * /income-tax-slabs/{incomeTaxSlabId}:
 *   put:
 *     summary: updateIncomeTaxSlab
 *     tags: [Payroll Tax]
 *     security: [{ bearerAuth: [] }]
 */
router.put(
  "/income-tax-slabs/:incomeTaxSlabId",
  authMiddleware(ANY_ROLE),
  checkPermission("/income-tax-slab", "edit"),
  allowOnlyFields(controller.INCOMETAXSLAB_FIELDS),
  controller.updateIncomeTaxSlab,
);

/**
 * @swagger
 * /income-tax-slabs/{incomeTaxSlabId}:
 *   delete:
 *     summary: deleteIncomeTaxSlab
 *     tags: [Payroll Tax]
 *     security: [{ bearerAuth: [] }]
 */
router.delete(
  "/income-tax-slabs/:incomeTaxSlabId",
  authMiddleware(ANY_ROLE),
  checkPermission("/income-tax-slab", "delete"),
  controller.deleteIncomeTaxSlab,
);

// ============================================================================
// 2. Employee Tax Exemption Category
// ============================================================================

/**
 * @swagger
 * /employee-tax-exemption-categories:
 *   post:
 *     summary: createEmployeeTaxExemptionCategory
 *     tags: [Payroll Tax]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/employee-tax-exemption-categories",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-tax-exemption-category", "write"),
  allowOnlyFields(controller.EMPLOYEE_TAX_EXEMPTION_CATEGORY_FIELDS),
  controller.createEmployeeTaxExemptionCategory,
);

/**
 * @swagger
 * /employee-tax-exemption-categories:
 *   get:
 *     summary: listEmployeeTaxExemptionCategories
 *     tags: [Payroll Tax]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/employee-tax-exemption-categories",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-tax-exemption-category", "read"),
  controller.listEmployeeTaxExemptionCategories,
);

/**
 * @swagger
 * /employee-tax-exemption-categories/search:
 *   post:
 *     summary: searchEmployeeTaxExemptionCategories
 *     tags: [Payroll Tax]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/employee-tax-exemption-categories/search",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-tax-exemption-category", "read"),
  controller.searchEmployeeTaxExemptionCategories,
);

/**
 * @swagger
 * /employee-tax-exemption-categories/{id}:
 *   get:
 *     summary: getEmployeeTaxExemptionCategoryById
 *     tags: [Payroll Tax]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/employee-tax-exemption-categories/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-tax-exemption-category", "read"),
  controller.getEmployeeTaxExemptionCategoryById,
);

/**
 * @swagger
 * /employee-tax-exemption-categories/{id}:
 *   put:
 *     summary: updateEmployeeTaxExemptionCategory
 *     tags: [Payroll Tax]
 *     security: [{ bearerAuth: [] }]
 */
router.put(
  "/employee-tax-exemption-categories/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-tax-exemption-category", "edit"),
  allowOnlyFields(controller.EMPLOYEE_TAX_EXEMPTION_CATEGORY_FIELDS),
  controller.updateEmployeeTaxExemptionCategory,
);

/**
 * @swagger
 * /employee-tax-exemption-categories/{id}:
 *   delete:
 *     summary: deleteEmployeeTaxExemptionCategory
 *     tags: [Payroll Tax]
 *     security: [{ bearerAuth: [] }]
 */
router.delete(
  "/employee-tax-exemption-categories/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-tax-exemption-category", "delete"),
  controller.deleteEmployeeTaxExemptionCategory,
);

// ============================================================================
// 3. Employee Tax Exemption Sub Category
// ============================================================================

/**
 * @swagger
 * /employee-tax-exemption-sub-categories:
 *   post:
 *     summary: createEmployeeTaxExemptionSubCategory
 *     tags: [Payroll Tax]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/employee-tax-exemption-sub-categories",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-tax-exemption-sub-category", "write"),
  allowOnlyFields(controller.EMPLOYEE_TAX_EXEMPTION_SUB_CATEGORY_FIELDS),
  controller.createEmployeeTaxExemptionSubCategory,
);

/**
 * @swagger
 * /employee-tax-exemption-sub-categories:
 *   get:
 *     summary: listEmployeeTaxExemptionSubCategories
 *     tags: [Payroll Tax]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/employee-tax-exemption-sub-categories",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-tax-exemption-sub-category", "read"),
  controller.listEmployeeTaxExemptionSubCategories,
);

/**
 * @swagger
 * /employee-tax-exemption-sub-categories/search:
 *   post:
 *     summary: searchEmployeeTaxExemptionSubCategories
 *     tags: [Payroll Tax]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/employee-tax-exemption-sub-categories/search",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-tax-exemption-sub-category", "read"),
  controller.searchEmployeeTaxExemptionSubCategories,
);

/**
 * @swagger
 * /employee-tax-exemption-sub-categories/{id}:
 *   get:
 *     summary: getEmployeeTaxExemptionSubCategoryById
 *     tags: [Payroll Tax]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/employee-tax-exemption-sub-categories/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-tax-exemption-sub-category", "read"),
  controller.getEmployeeTaxExemptionSubCategoryById,
);

/**
 * @swagger
 * /employee-tax-exemption-sub-categories/{id}:
 *   put:
 *     summary: updateEmployeeTaxExemptionSubCategory
 *     tags: [Payroll Tax]
 *     security: [{ bearerAuth: [] }]
 */
router.put(
  "/employee-tax-exemption-sub-categories/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-tax-exemption-sub-category", "edit"),
  allowOnlyFields(controller.EMPLOYEE_TAX_EXEMPTION_SUB_CATEGORY_FIELDS),
  controller.updateEmployeeTaxExemptionSubCategory,
);

/**
 * @swagger
 * /employee-tax-exemption-sub-categories/{id}:
 *   delete:
 *     summary: deleteEmployeeTaxExemptionSubCategory
 *     tags: [Payroll Tax]
 *     security: [{ bearerAuth: [] }]
 */
router.delete(
  "/employee-tax-exemption-sub-categories/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-tax-exemption-sub-category", "delete"),
  controller.deleteEmployeeTaxExemptionSubCategory,
);

// ============================================================================
// 4. Employee Tax Exemption Declaration
// ============================================================================

/**
 * @swagger
 * /employee-tax-exemption-declarations:
 *   post:
 *     summary: createEmployeeTaxExemptionDeclaration
 *     tags: [Payroll Tax]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/employee-tax-exemption-declarations",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-tax-exemption-declaration", "write"),
  allowOnlyFields(controller.EMPLOYEE_TAX_EXEMPTION_DECLARATION_FIELDS),
  controller.createEmployeeTaxExemptionDeclaration,
);

/**
 * @swagger
 * /employee-tax-exemption-declarations:
 *   get:
 *     summary: listEmployeeTaxExemptionDeclarations
 *     tags: [Payroll Tax]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/employee-tax-exemption-declarations",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-tax-exemption-declaration", "read"),
  controller.listEmployeeTaxExemptionDeclarations,
);

/**
 * @swagger
 * /employee-tax-exemption-declarations/search:
 *   post:
 *     summary: searchEmployeeTaxExemptionDeclarations
 *     tags: [Payroll Tax]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/employee-tax-exemption-declarations/search",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-tax-exemption-declaration", "read"),
  controller.searchEmployeeTaxExemptionDeclarations,
);

/**
 * @swagger
 * /employee-tax-exemption-declarations/{id}:
 *   get:
 *     summary: getEmployeeTaxExemptionDeclarationById
 *     tags: [Payroll Tax]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/employee-tax-exemption-declarations/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-tax-exemption-declaration", "read"),
  controller.getEmployeeTaxExemptionDeclarationById,
);

/**
 * @swagger
 * /employee-tax-exemption-declarations/{id}:
 *   put:
 *     summary: updateEmployeeTaxExemptionDeclaration
 *     tags: [Payroll Tax]
 *     security: [{ bearerAuth: [] }]
 */
router.put(
  "/employee-tax-exemption-declarations/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-tax-exemption-declaration", "edit"),
  allowOnlyFields(controller.EMPLOYEE_TAX_EXEMPTION_DECLARATION_FIELDS),
  controller.updateEmployeeTaxExemptionDeclaration,
);

/**
 * @swagger
 * /employee-tax-exemption-declarations/{id}/submit:
 *   post:
 *     summary: submitEmployeeTaxExemptionDeclaration
 *     tags: [Payroll Tax]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/employee-tax-exemption-declarations/:id/submit",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-tax-exemption-declaration", "edit"),
  controller.submitEmployeeTaxExemptionDeclaration,
);

/**
 * @swagger
 * /employee-tax-exemption-declarations/{id}/cancel:
 *   post:
 *     summary: cancelEmployeeTaxExemptionDeclaration
 *     tags: [Payroll Tax]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/employee-tax-exemption-declarations/:id/cancel",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-tax-exemption-declaration", "edit"),
  controller.cancelEmployeeTaxExemptionDeclaration,
);

/**
 * @swagger
 * /employee-tax-exemption-declarations/{id}:
 *   delete:
 *     summary: deleteEmployeeTaxExemptionDeclaration
 *     tags: [Payroll Tax]
 *     security: [{ bearerAuth: [] }]
 */
router.delete(
  "/employee-tax-exemption-declarations/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-tax-exemption-declaration", "delete"),
  controller.deleteEmployeeTaxExemptionDeclaration,
);

// ============================================================================
// 5. Employee Tax Exemption Proof Submission
// ============================================================================

/**
 * @swagger
 * /employee-tax-exemption-proof-submissions:
 *   post:
 *     summary: createEmployeeTaxExemptionProofSubmission
 *     tags: [Payroll Tax]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/employee-tax-exemption-proof-submissions",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-tax-exemption-proof-submission", "write"),
  allowOnlyFields(controller.EMPLOYEE_TAX_EXEMPTION_PROOF_SUBMISSION_FIELDS),
  controller.createEmployeeTaxExemptionProofSubmission,
);

/**
 * @swagger
 * /employee-tax-exemption-proof-submissions:
 *   get:
 *     summary: listEmployeeTaxExemptionProofSubmissions
 *     tags: [Payroll Tax]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/employee-tax-exemption-proof-submissions",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-tax-exemption-proof-submission", "read"),
  controller.listEmployeeTaxExemptionProofSubmissions,
);

/**
 * @swagger
 * /employee-tax-exemption-proof-submissions/search:
 *   post:
 *     summary: searchEmployeeTaxExemptionProofSubmissions
 *     tags: [Payroll Tax]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/employee-tax-exemption-proof-submissions/search",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-tax-exemption-proof-submission", "read"),
  controller.searchEmployeeTaxExemptionProofSubmissions,
);

/**
 * @swagger
 * /employee-tax-exemption-proof-submissions/{id}:
 *   get:
 *     summary: getEmployeeTaxExemptionProofSubmissionById
 *     tags: [Payroll Tax]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/employee-tax-exemption-proof-submissions/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-tax-exemption-proof-submission", "read"),
  controller.getEmployeeTaxExemptionProofSubmissionById,
);

/**
 * @swagger
 * /employee-tax-exemption-proof-submissions/{id}:
 *   put:
 *     summary: updateEmployeeTaxExemptionProofSubmission
 *     tags: [Payroll Tax]
 *     security: [{ bearerAuth: [] }]
 */
router.put(
  "/employee-tax-exemption-proof-submissions/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-tax-exemption-proof-submission", "edit"),
  allowOnlyFields(controller.EMPLOYEE_TAX_EXEMPTION_PROOF_SUBMISSION_FIELDS),
  controller.updateEmployeeTaxExemptionProofSubmission,
);

/**
 * @swagger
 * /employee-tax-exemption-proof-submissions/{id}/submit:
 *   post:
 *     summary: submitEmployeeTaxExemptionProofSubmission
 *     tags: [Payroll Tax]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/employee-tax-exemption-proof-submissions/:id/submit",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-tax-exemption-proof-submission", "edit"),
  controller.submitEmployeeTaxExemptionProofSubmission,
);

/**
 * @swagger
 * /employee-tax-exemption-proof-submissions/{id}/cancel:
 *   post:
 *     summary: cancelEmployeeTaxExemptionProofSubmission
 *     tags: [Payroll Tax]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/employee-tax-exemption-proof-submissions/:id/cancel",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-tax-exemption-proof-submission", "edit"),
  controller.cancelEmployeeTaxExemptionProofSubmission,
);

/**
 * @swagger
 * /employee-tax-exemption-proof-submissions/{id}:
 *   delete:
 *     summary: deleteEmployeeTaxExemptionProofSubmission
 *     tags: [Payroll Tax]
 *     security: [{ bearerAuth: [] }]
 */
router.delete(
  "/employee-tax-exemption-proof-submissions/:id",
  authMiddleware(ANY_ROLE),
  checkPermission("/employee-tax-exemption-proof-submission", "delete"),
  controller.deleteEmployeeTaxExemptionProofSubmission,
);

export default router;
