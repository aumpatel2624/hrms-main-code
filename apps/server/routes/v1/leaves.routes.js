import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { checkPermission } from "../../middlewares/checkPermission.js";
import { ANY_ROLE } from "@demo-panel/shared/roles";
import {
  createLeaveType, updateLeaveType, deleteLeaveType, getLeaveTypeById, listLeaveTypes, listLeaveTypeByParams,
  createLeavePeriod, updateLeavePeriod, deleteLeavePeriod, getLeavePeriodById, listLeavePeriods, listLeavePeriodByParams,
  createHolidayList, updateHolidayList, deleteHolidayList, getHolidayListById, listHolidayLists, listHolidayListByParams,
  createHolidayListAssignment, updateHolidayListAssignment, deleteHolidayListAssignment,
  getHolidayListAssignmentById, listHolidayListAssignments, listHolidayListAssignmentByParams,
  createLeavePolicy, updateLeavePolicy, deleteLeavePolicy, getLeavePolicyById, listLeavePolicies, listLeavePolicyByParams,
  createLeavePolicyAssignment, updateLeavePolicyAssignment, deleteLeavePolicyAssignment,
  getLeavePolicyAssignmentById, listLeavePolicyAssignments, listLeavePolicyAssignmentByParams,
  grantLeavePolicyAssignmentAllocations,
  createLeaveAllocation, updateLeaveAllocation, deleteLeaveAllocation,
  getLeaveAllocationById, listLeaveAllocations, listLeaveAllocationByParams, adjustLeaveAllocation,
  getLeaveLedgerEntryById, listLeaveLedgerEntryByParams, getLeaveBalanceForEmployee,
} from "../../controllers/v1/leaves.controller.js";

const router = express.Router();

// ==================================================================== LeaveType --
/**
 * @swagger
 * /leave-types:
 *   post:
 *     summary: Create a leave type
 *     tags: [Leaves]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Leave Type created successfully } }
 */
router.post("/leave-types", authMiddleware(ANY_ROLE), checkPermission("/leave-type", "write"), createLeaveType);
/**
 * @swagger
 * /leave-types:
 *   get:
 *     summary: List all active leave types (dropdown source)
 *     tags: [Leaves]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: List of leave types } }
 */
router.get("/leave-types", authMiddleware(ANY_ROLE), listLeaveTypes);
/**
 * @swagger
 * /leave-types/{leaveTypeId}:
 *   get:
 *     summary: Get leave type by ID
 *     tags: [Leaves]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: leaveTypeId, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Leave Type details }, 404: { description: Leave Type not found } }
 */
router.get("/leave-types/:leaveTypeId", authMiddleware(ANY_ROLE), checkPermission("/leave-type", "read"), getLeaveTypeById);
/**
 * @swagger
 * /leave-types/{leaveTypeId}:
 *   put:
 *     summary: Update leave type
 *     tags: [Leaves]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: leaveTypeId, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Leave Type updated successfully } }
 */
router.put("/leave-types/:leaveTypeId", authMiddleware(ANY_ROLE), checkPermission("/leave-type", "edit"), updateLeaveType);
/**
 * @swagger
 * /leave-types/{leaveTypeId}:
 *   delete:
 *     summary: Delete leave type
 *     tags: [Leaves]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: leaveTypeId, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Leave Type deleted successfully }, 409: { description: Cannot delete — referenced by other records } }
 */
router.delete("/leave-types/:leaveTypeId", authMiddleware(ANY_ROLE), checkPermission("/leave-type", "delete"), deleteLeaveType);
/**
 * @swagger
 * /leave-types/search:
 *   post:
 *     summary: Search leave types with pagination
 *     tags: [Leaves]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Paginated list of leave types } }
 */
router.post("/leave-types/search", authMiddleware(ANY_ROLE), checkPermission("/leave-type", "read"), listLeaveTypeByParams);

// ================================================================== LeavePeriod --
router.post("/leave-periods", authMiddleware(ANY_ROLE), checkPermission("/leave-period", "write"), createLeavePeriod);
router.get("/leave-periods", authMiddleware(ANY_ROLE), listLeavePeriods);
router.get("/leave-periods/:leavePeriodId", authMiddleware(ANY_ROLE), checkPermission("/leave-period", "read"), getLeavePeriodById);
router.put("/leave-periods/:leavePeriodId", authMiddleware(ANY_ROLE), checkPermission("/leave-period", "edit"), updateLeavePeriod);
router.delete("/leave-periods/:leavePeriodId", authMiddleware(ANY_ROLE), checkPermission("/leave-period", "delete"), deleteLeavePeriod);
router.post("/leave-periods/search", authMiddleware(ANY_ROLE), checkPermission("/leave-period", "read"), listLeavePeriodByParams);

// ================================================================== HolidayList --
router.post("/holiday-lists", authMiddleware(ANY_ROLE), checkPermission("/holiday-list", "write"), createHolidayList);
router.get("/holiday-lists", authMiddleware(ANY_ROLE), listHolidayLists);
router.get("/holiday-lists/:holidayListId", authMiddleware(ANY_ROLE), checkPermission("/holiday-list", "read"), getHolidayListById);
router.put("/holiday-lists/:holidayListId", authMiddleware(ANY_ROLE), checkPermission("/holiday-list", "edit"), updateHolidayList);
router.delete("/holiday-lists/:holidayListId", authMiddleware(ANY_ROLE), checkPermission("/holiday-list", "delete"), deleteHolidayList);
router.post("/holiday-lists/search", authMiddleware(ANY_ROLE), checkPermission("/holiday-list", "read"), listHolidayListByParams);

// ======================================================= HolidayListAssignment --
router.post("/holiday-list-assignments", authMiddleware(ANY_ROLE), checkPermission("/holiday-list-assignment", "write"), createHolidayListAssignment);
router.get("/holiday-list-assignments", authMiddleware(ANY_ROLE), listHolidayListAssignments);
router.get("/holiday-list-assignments/:holidayListAssignmentId", authMiddleware(ANY_ROLE), checkPermission("/holiday-list-assignment", "read"), getHolidayListAssignmentById);
router.put("/holiday-list-assignments/:holidayListAssignmentId", authMiddleware(ANY_ROLE), checkPermission("/holiday-list-assignment", "edit"), updateHolidayListAssignment);
router.delete("/holiday-list-assignments/:holidayListAssignmentId", authMiddleware(ANY_ROLE), checkPermission("/holiday-list-assignment", "delete"), deleteHolidayListAssignment);
router.post("/holiday-list-assignments/search", authMiddleware(ANY_ROLE), checkPermission("/holiday-list-assignment", "read"), listHolidayListAssignmentByParams);

// ================================================================= LeavePolicy --
router.post("/leave-policies", authMiddleware(ANY_ROLE), checkPermission("/leave-policy", "write"), createLeavePolicy);
router.get("/leave-policies", authMiddleware(ANY_ROLE), listLeavePolicies);
router.get("/leave-policies/:leavePolicyId", authMiddleware(ANY_ROLE), checkPermission("/leave-policy", "read"), getLeavePolicyById);
router.put("/leave-policies/:leavePolicyId", authMiddleware(ANY_ROLE), checkPermission("/leave-policy", "edit"), updateLeavePolicy);
router.delete("/leave-policies/:leavePolicyId", authMiddleware(ANY_ROLE), checkPermission("/leave-policy", "delete"), deleteLeavePolicy);
router.post("/leave-policies/search", authMiddleware(ANY_ROLE), checkPermission("/leave-policy", "read"), listLeavePolicyByParams);

// ======================================================= LeavePolicyAssignment --
router.post("/leave-policy-assignments", authMiddleware(ANY_ROLE), checkPermission("/leave-policy-assignment", "write"), createLeavePolicyAssignment);
router.get("/leave-policy-assignments", authMiddleware(ANY_ROLE), listLeavePolicyAssignments);
router.get("/leave-policy-assignments/:leavePolicyAssignmentId", authMiddleware(ANY_ROLE), checkPermission("/leave-policy-assignment", "read"), getLeavePolicyAssignmentById);
router.put("/leave-policy-assignments/:leavePolicyAssignmentId", authMiddleware(ANY_ROLE), checkPermission("/leave-policy-assignment", "edit"), updateLeavePolicyAssignment);
router.delete("/leave-policy-assignments/:leavePolicyAssignmentId", authMiddleware(ANY_ROLE), checkPermission("/leave-policy-assignment", "delete"), deleteLeavePolicyAssignment);
router.post("/leave-policy-assignments/search", authMiddleware(ANY_ROLE), checkPermission("/leave-policy-assignment", "read"), listLeavePolicyAssignmentByParams);
/**
 * @swagger
 * /leave-policy-assignments/{leavePolicyAssignmentId}/grant-allocations:
 *   post:
 *     summary: Grant Leave Allocations for every non-LWP Leave Policy Detail on the assigned policy (idempotent)
 *     tags: [Leaves]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: leavePolicyAssignmentId, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Leave allocations granted successfully }
 *       400: { description: Already allocated }
 */
router.post(
  "/leave-policy-assignments/:leavePolicyAssignmentId/grant-allocations",
  authMiddleware(ANY_ROLE),
  checkPermission("/leave-policy-assignment", "edit"),
  grantLeavePolicyAssignmentAllocations,
);

// =============================================================== LeaveAllocation --
router.post("/leave-allocations", authMiddleware(ANY_ROLE), checkPermission("/leave-allocation", "write"), createLeaveAllocation);
router.get("/leave-allocations", authMiddleware(ANY_ROLE), listLeaveAllocations);
router.get("/leave-allocations/:leaveAllocationId", authMiddleware(ANY_ROLE), checkPermission("/leave-allocation", "read"), getLeaveAllocationById);
router.put("/leave-allocations/:leaveAllocationId", authMiddleware(ANY_ROLE), checkPermission("/leave-allocation", "edit"), updateLeaveAllocation);
router.delete("/leave-allocations/:leaveAllocationId", authMiddleware(ANY_ROLE), checkPermission("/leave-allocation", "delete"), deleteLeaveAllocation);
router.post("/leave-allocations/search", authMiddleware(ANY_ROLE), checkPermission("/leave-allocation", "read"), listLeaveAllocationByParams);
/**
 * @swagger
 * /leave-allocations/{leaveAllocationId}/adjust:
 *   post:
 *     summary: Adjust newLeavesAllocated on an active allocation, writing a signed delta ledger entry (the only supported way to change it post-creation)
 *     tags: [Leaves]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: leaveAllocationId, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Leave Allocation adjusted successfully }
 *       400: { description: Validation error }
 */
router.post(
  "/leave-allocations/:leaveAllocationId/adjust",
  authMiddleware(ANY_ROLE),
  checkPermission("/leave-allocation", "edit"),
  adjustLeaveAllocation,
);

// ============================================================= LeaveLedgerEntry --
// Read-only — no create/update/delete route exists for this collection.
router.get("/leave-ledger-entries/:leaveLedgerEntryId", authMiddleware(ANY_ROLE), checkPermission("/leave-ledger-entry", "read"), getLeaveLedgerEntryById);
router.post("/leave-ledger-entries/search", authMiddleware(ANY_ROLE), checkPermission("/leave-ledger-entry", "read"), listLeaveLedgerEntryByParams);
/**
 * @swagger
 * /leave-balance:
 *   get:
 *     summary: Current (or as-of-date) leave balance for an employee/leave type — SUM(LeaveLedgerEntry.leaves)
 *     tags: [Leaves]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: leaveTypeId
 *         required: true
 *         schema: { type: string }
 *     responses: { 200: { description: Leave balance } }
 */
router.get("/leave-balance", authMiddleware(ANY_ROLE), checkPermission("/leave-ledger-entry", "read"), getLeaveBalanceForEmployee);

export default router;
