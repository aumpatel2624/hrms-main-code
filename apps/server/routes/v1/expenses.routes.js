import express from "express";
import { ANY_ROLE } from "@demo-panel/shared/roles";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { checkPermission } from "../../middlewares/checkPermission.js";
import { allowOnlyFields } from "../../middlewares/inputValidator.js";
import * as controller from "../../controllers/v1/expenses.controller.js";
const router = express.Router();
// Expense Claim Type
/** @swagger */
router.post("/expense-claim-types", authMiddleware(ANY_ROLE), checkPermission("/expense-claim-type", "write"), allowOnlyFields(controller.EXPENSE_CLAIM_TYPE_FIELDS), controller.createExpenseClaimType);
/** @swagger */
router.get("/expense-claim-types", authMiddleware(ANY_ROLE), checkPermission("/expense-claim-type", "read"), controller.listExpenseClaimTypes);
/** @swagger */
router.post("/expense-claim-types/search", authMiddleware(ANY_ROLE), checkPermission("/expense-claim-type", "read"), controller.searchExpenseClaimTypes);
/** @swagger */
router.get("/expense-claim-types/:id", authMiddleware(ANY_ROLE), checkPermission("/expense-claim-type", "read"), controller.getExpenseClaimTypeById);
/** @swagger */
router.put("/expense-claim-types/:id", authMiddleware(ANY_ROLE), checkPermission("/expense-claim-type", "edit"), allowOnlyFields(controller.EXPENSE_CLAIM_TYPE_FIELDS), controller.updateExpenseClaimType);
router.delete("/expense-claim-types/:id", authMiddleware(ANY_ROLE), checkPermission("/expense-claim-type", "delete"), controller.deleteExpenseClaimType);
// Expense Claim
/** @swagger */
router.post("/expense-claims", authMiddleware(ANY_ROLE), checkPermission("/expense-claim", "write"), allowOnlyFields(controller.EXPENSE_CLAIM_FIELDS), controller.createExpenseClaim);
/** @swagger */
router.get("/expense-claims", authMiddleware(ANY_ROLE), checkPermission("/expense-claim", "read"), controller.listExpenseClaims);
/** @swagger */
router.post("/expense-claims/search", authMiddleware(ANY_ROLE), checkPermission("/expense-claim", "read"), controller.searchExpenseClaims);
/** @swagger */
router.get("/expense-claims/:id", authMiddleware(ANY_ROLE), checkPermission("/expense-claim", "read"), controller.getExpenseClaimById);
/** @swagger */
router.put("/expense-claims/:id", authMiddleware(ANY_ROLE), checkPermission("/expense-claim", "edit"), allowOnlyFields(controller.EXPENSE_CLAIM_FIELDS), controller.updateExpenseClaim);
for (const [name, handler] of Object.entries({ approve: controller.approveExpenseClaim, reject: controller.rejectExpenseClaim, submit: controller.submitExpenseClaim, cancel: controller.cancelExpenseClaim, "mark-paid": controller.markExpenseClaimAsPaid })) router.post(`/expense-claims/:id/${name}`, authMiddleware(ANY_ROLE), checkPermission("/expense-claim", "edit"), handler);
router.delete("/expense-claims/:id", authMiddleware(ANY_ROLE), checkPermission("/expense-claim", "delete"), controller.deleteExpenseClaim);
export default router;
