import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { checkPermission } from "../../middlewares/checkPermission.js";
import { ANY_ROLE } from "@demo-panel/shared/roles";
import {
  createLeaveAdjustment, getLeaveAdjustmentById, listLeaveAdjustmentByParams,
  createCompensatoryLeaveRequest, updateCompensatoryLeaveRequest, deleteCompensatoryLeaveRequest,
  getCompensatoryLeaveRequestById, listCompensatoryLeaveRequestByParams,
  approveCompensatoryLeaveRequest, rejectCompensatoryLeaveRequest,
  createLeaveApplication, updateLeaveApplication, getLeaveApplicationById, listLeaveApplicationByParams,
  approveLeaveApplication, rejectLeaveApplication, cancelLeaveApplication,
  createLeaveEncashment, updateLeaveEncashment, getLeaveEncashmentById, listLeaveEncashmentByParams, markLeaveEncashmentPaid,
  createLeaveBlockList, updateLeaveBlockList, deleteLeaveBlockList, getLeaveBlockListById, listLeaveBlockListByParams,
  bulkCreatePolicyAssignments, bulkAllocateLeaves,
} from "../../controllers/v1/leavesTransactions.controller.js";

const router = express.Router();

// ============================================================ LeaveAdjustment --
// Create IS the action (ADR-024) — no update/delete, immutable once its
// ledger entry is written.
/**
 * @swagger
 * /leave-adjustments:
 *   post:
 *     summary: Create a Leave Adjustment and write its signed Leave Ledger Entry (Allocate/Reduce)
 *     tags: [Leaves]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Leave Adjustment created successfully }, 400: { description: Validation error } }
 */
router.post("/leave-adjustments", authMiddleware(ANY_ROLE), checkPermission("/leave-adjustment", "write"), createLeaveAdjustment);
router.get("/leave-adjustments/:leaveAdjustmentId", authMiddleware(ANY_ROLE), checkPermission("/leave-adjustment", "read"), getLeaveAdjustmentById);
router.post("/leave-adjustments/search", authMiddleware(ANY_ROLE), checkPermission("/leave-adjustment", "read"), listLeaveAdjustmentByParams);

// ==================================================== CompensatoryLeaveRequest --
router.post("/compensatory-leave-requests", authMiddleware(ANY_ROLE), checkPermission("/compensatory-leave-request", "write"), createCompensatoryLeaveRequest);
router.put("/compensatory-leave-requests/:compensatoryLeaveRequestId", authMiddleware(ANY_ROLE), checkPermission("/compensatory-leave-request", "edit"), updateCompensatoryLeaveRequest);
router.delete("/compensatory-leave-requests/:compensatoryLeaveRequestId", authMiddleware(ANY_ROLE), checkPermission("/compensatory-leave-request", "delete"), deleteCompensatoryLeaveRequest);
router.get("/compensatory-leave-requests/:compensatoryLeaveRequestId", authMiddleware(ANY_ROLE), checkPermission("/compensatory-leave-request", "read"), getCompensatoryLeaveRequestById);
router.post("/compensatory-leave-requests/search", authMiddleware(ANY_ROLE), checkPermission("/compensatory-leave-request", "read"), listCompensatoryLeaveRequestByParams);
/**
 * @swagger
 * /compensatory-leave-requests/{id}/approve:
 *   post:
 *     summary: Approve a Compensatory Leave Request — validates the worked range against Holiday List + Attendance, then finds/creates the resulting Leave Allocation and writes a ledger entry
 *     tags: [Leaves]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Compensatory Leave Request approved successfully }, 400: { description: Validation error } }
 */
router.post(
  "/compensatory-leave-requests/:compensatoryLeaveRequestId/approve",
  authMiddleware(ANY_ROLE),
  checkPermission("/compensatory-leave-request", "edit"),
  approveCompensatoryLeaveRequest,
);
router.post(
  "/compensatory-leave-requests/:compensatoryLeaveRequestId/reject",
  authMiddleware(ANY_ROLE),
  checkPermission("/compensatory-leave-request", "edit"),
  rejectCompensatoryLeaveRequest,
);

// ============================================================ LeaveApplication --
router.post("/leave-applications", authMiddleware(ANY_ROLE), checkPermission("/leave-application", "write"), createLeaveApplication);
router.put("/leave-applications/:leaveApplicationId", authMiddleware(ANY_ROLE), checkPermission("/leave-application", "edit"), updateLeaveApplication);
router.get("/leave-applications/:leaveApplicationId", authMiddleware(ANY_ROLE), checkPermission("/leave-application", "read"), getLeaveApplicationById);
router.post("/leave-applications/search", authMiddleware(ANY_ROLE), checkPermission("/leave-application", "read"), listLeaveApplicationByParams);
/**
 * @swagger
 * /leave-applications/{id}/approve:
 *   post:
 *     summary: Approve a Leave Application — re-validates balance, creates/updates Attendance rows, writes 1-2 Leave Ledger Entry rows (split across an allocation boundary when the range crosses one)
 *     tags: [Leaves]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Leave Application approved successfully }, 400: { description: Validation error }, 403: { description: Not your leave to approve } }
 */
router.post("/leave-applications/:leaveApplicationId/approve", authMiddleware(ANY_ROLE), checkPermission("/leave-application", "edit"), approveLeaveApplication);
router.post("/leave-applications/:leaveApplicationId/reject", authMiddleware(ANY_ROLE), checkPermission("/leave-application", "edit"), rejectLeaveApplication);
/**
 * @swagger
 * /leave-applications/{id}/cancel:
 *   post:
 *     summary: Cancel an already-approved Leave Application — soft-deletes its Leave Ledger Entry rows and Attendance rows, sets status Cancelled
 *     tags: [Leaves]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Leave Application cancelled successfully }, 400: { description: Only an approved application can be cancelled } }
 */
router.post("/leave-applications/:leaveApplicationId/cancel", authMiddleware(ANY_ROLE), checkPermission("/leave-application", "edit"), cancelLeaveApplication);

// ============================================================= LeaveEncashment --
/**
 * @swagger
 * /leave-encashments:
 *   post:
 *     summary: Create a Leave Encashment — computes leave balance/encashable days server-side, writes a negative Leave Ledger Entry immediately (create is the action, ADR-024)
 *     tags: [Leaves]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Leave Encashment created successfully }, 400: { description: Validation error } }
 */
router.post("/leave-encashments", authMiddleware(ANY_ROLE), checkPermission("/leave-encashment", "write"), createLeaveEncashment);
router.put("/leave-encashments/:leaveEncashmentId", authMiddleware(ANY_ROLE), checkPermission("/leave-encashment", "edit"), updateLeaveEncashment);
router.get("/leave-encashments/:leaveEncashmentId", authMiddleware(ANY_ROLE), checkPermission("/leave-encashment", "read"), getLeaveEncashmentById);
router.post("/leave-encashments/search", authMiddleware(ANY_ROLE), checkPermission("/leave-encashment", "read"), listLeaveEncashmentByParams);
/**
 * @swagger
 * /leave-encashments/{id}/mark-paid:
 *   post:
 *     summary: Mark a Leave Encashment as paid — amount/date/reference only, no GL posting, no Payment Entry (ADR-016/Q-3 precedent)
 *     tags: [Leaves]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Leave Encashment marked as paid }, 400: { description: Already paid } }
 */
router.post("/leave-encashments/:leaveEncashmentId/mark-paid", authMiddleware(ANY_ROLE), checkPermission("/leave-encashment", "edit"), markLeaveEncashmentPaid);

// ============================================================== LeaveBlockList --
router.post("/leave-block-lists", authMiddleware(ANY_ROLE), checkPermission("/leave-block-list", "write"), createLeaveBlockList);
router.put("/leave-block-lists/:leaveBlockListId", authMiddleware(ANY_ROLE), checkPermission("/leave-block-list", "edit"), updateLeaveBlockList);
router.delete("/leave-block-lists/:leaveBlockListId", authMiddleware(ANY_ROLE), checkPermission("/leave-block-list", "delete"), deleteLeaveBlockList);
router.get("/leave-block-lists/:leaveBlockListId", authMiddleware(ANY_ROLE), checkPermission("/leave-block-list", "read"), getLeaveBlockListById);
router.post("/leave-block-lists/search", authMiddleware(ANY_ROLE), checkPermission("/leave-block-list", "read"), listLeaveBlockListByParams);

// ========================================================= Leave Control Panel --
// Stateless bulk-action endpoints (ADR-024/source: a Frappe Single, no
// stored model) — gated on the same "/leave-control-panel" menu row for
// both, edit-level (it writes LeavePolicyAssignment/LeaveAllocation rows).
/**
 * @swagger
 * /leave-control-panel/bulk-policy-assignments:
 *   post:
 *     summary: Bulk-create Leave Policy Assignments for a set of employees, left unallocated (per-item failure isolation)
 *     tags: [Leaves]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Bulk policy assignment run complete } }
 */
router.post(
  "/leave-control-panel/bulk-policy-assignments",
  authMiddleware(ANY_ROLE),
  checkPermission("/leave-control-panel", "edit"),
  bulkCreatePolicyAssignments,
);
/**
 * @swagger
 * /leave-control-panel/bulk-allocations:
 *   post:
 *     summary: Bulk-create Leave Policy Assignments AND immediately grant their allocations for a set of employees (per-item failure isolation)
 *     tags: [Leaves]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Bulk allocation run complete } }
 */
router.post(
  "/leave-control-panel/bulk-allocations",
  authMiddleware(ANY_ROLE),
  checkPermission("/leave-control-panel", "edit"),
  bulkAllocateLeaves,
);

export default router;
