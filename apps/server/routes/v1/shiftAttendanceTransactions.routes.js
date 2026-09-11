import express from "express";
import { ANY_ROLE } from "@demo-panel/shared/roles";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { checkPermission } from "../../middlewares/checkPermission.js";
import { allowOnlyFields } from "../../middlewares/inputValidator.js";
import * as controller from "../../controllers/v1/shiftAttendanceTransactions.controller.js";

const router = express.Router();

// ================================================================ ShiftRequest --
/**
 * @swagger
 * /shift-requests:
 *   post:
 *     summary: createShiftRequest
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.post("/shift-requests", authMiddleware(ANY_ROLE), checkPermission("/shift-request", "write"), allowOnlyFields(controller.SHIFTREQUEST_FIELDS), controller.createShiftRequest);
/**
 * @swagger
 * /shift-requests/{shiftRequestId}:
 *   put:
 *     summary: updateShiftRequest
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.put("/shift-requests/:shiftRequestId", authMiddleware(ANY_ROLE), checkPermission("/shift-request", "edit"), allowOnlyFields(controller.SHIFTREQUEST_FIELDS), controller.updateShiftRequest);
/**
 * @swagger
 * /shift-requests/{shiftRequestId}:
 *   get:
 *     summary: getShiftRequestById
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.get("/shift-requests/:shiftRequestId", authMiddleware(ANY_ROLE), checkPermission("/shift-request", "read"), controller.getShiftRequestById);
/**
 * @swagger
 * /shift-requests/search:
 *   post:
 *     summary: listShiftRequestByParams
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.post("/shift-requests/search", authMiddleware(ANY_ROLE), checkPermission("/shift-request", "read"), controller.listShiftRequestByParams);
/**
 * @swagger
 * /shift-requests/{shiftRequestId}/approve:
 *   post:
 *     summary: Approve a Shift Request — creates a Shift Assignment through the write-locked save path
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: shiftRequestId, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Shift Request approved successfully }, 400: { description: Validation error } }
 */
router.post("/shift-requests/:shiftRequestId/approve", authMiddleware(ANY_ROLE), checkPermission("/shift-request", "edit"), controller.approveShiftRequest);
/**
 * @swagger
 * /shift-requests/{shiftRequestId}/reject:
 *   post:
 *     summary: Reject a Shift Request — no side effects
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: shiftRequestId, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Shift Request rejected }, 400: { description: Validation error } }
 */
router.post("/shift-requests/:shiftRequestId/reject", authMiddleware(ANY_ROLE), checkPermission("/shift-request", "edit"), controller.rejectShiftRequest);

// =========================================================== AttendanceRequest --
/**
 * @swagger
 * /attendance-requests:
 *   post:
 *     summary: Create an Attendance Request — create IS the action, writes/updates one Attendance row per covered day
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Attendance Request created successfully }, 400: { description: Validation error } }
 */
router.post("/attendance-requests", authMiddleware(ANY_ROLE), checkPermission("/attendance-request", "write"), allowOnlyFields(controller.ATTENDANCEREQUEST_FIELDS), controller.createAttendanceRequest);
/**
 * @swagger
 * /attendance-requests/{attendanceRequestId}:
 *   put:
 *     summary: updateAttendanceRequest — always a 400, this collection is immutable once created
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 400: { description: Cannot edit after creation } }
 */
router.put("/attendance-requests/:attendanceRequestId", authMiddleware(ANY_ROLE), checkPermission("/attendance-request", "edit"), controller.updateAttendanceRequest);
/**
 * @swagger
 * /attendance-requests/{attendanceRequestId}:
 *   get:
 *     summary: getAttendanceRequestById
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.get("/attendance-requests/:attendanceRequestId", authMiddleware(ANY_ROLE), checkPermission("/attendance-request", "read"), controller.getAttendanceRequestById);
/**
 * @swagger
 * /attendance-requests/search:
 *   post:
 *     summary: listAttendanceRequestByParams
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.post("/attendance-requests/search", authMiddleware(ANY_ROLE), checkPermission("/attendance-request", "read"), controller.listAttendanceRequestByParams);
/**
 * @swagger
 * /attendance-requests/{attendanceRequestId}/cancel:
 *   post:
 *     summary: Cancel an active Attendance Request — soft-deletes the specific Attendance rows it created
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: attendanceRequestId, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Attendance Request cancelled successfully }, 400: { description: Validation error } }
 */
router.post("/attendance-requests/:attendanceRequestId/cancel", authMiddleware(ANY_ROLE), checkPermission("/attendance-request", "edit"), controller.cancelAttendanceRequest);

// ========================================================= Shift Assignment Tool --
// Stateless bulk-action form (ADR-025) — no stored model, gated on its own menu row.
/**
 * @swagger
 * /shift-assignment-tool/bulk-assign:
 *   post:
 *     summary: Bulk-create Shift Assignments for many employees at once, per-item failure isolation
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Bulk shift assignment run complete }, 400: { description: No employees selected } }
 */
router.post("/shift-assignment-tool/bulk-assign", authMiddleware(ANY_ROLE), checkPermission("/shift-assignment-tool", "edit"), controller.bulkAssignShifts);
/**
 * @swagger
 * /shift-assignment-tool/bulk-assign-schedule:
 *   post:
 *     summary: Bulk-create Shift Schedule Assignments and immediately generate their first batch of Shift Assignments
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Bulk shift schedule assignment run complete }, 400: { description: No employees selected } }
 */
router.post("/shift-assignment-tool/bulk-assign-schedule", authMiddleware(ANY_ROLE), checkPermission("/shift-assignment-tool", "edit"), controller.bulkAssignShiftSchedules);
/**
 * @swagger
 * /shift-assignment-tool/process-requests:
 *   post:
 *     summary: Bulk-approve/reject Shift Requests
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Bulk shift request processing complete }, 400: { description: No requests selected } }
 */
router.post("/shift-assignment-tool/process-requests", authMiddleware(ANY_ROLE), checkPermission("/shift-assignment-tool", "edit"), controller.bulkProcessShiftRequests);

// ===================================================== Employee Attendance Tool --
// HR-Manager-only per ADR-025/source. Stateless bulk-action form, no stored model.
/**
 * @swagger
 * /employee-attendance-tool/mark:
 *   post:
 *     summary: Bulk-create Attendance rows for many employees on one date, per-item failure isolation
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Bulk attendance marking complete }, 400: { description: No employees selected } }
 */
router.post("/employee-attendance-tool/mark", authMiddleware(ANY_ROLE), checkPermission("/employee-attendance-tool", "edit"), controller.bulkMarkAttendance);
/**
 * @swagger
 * /employee-attendance-tool/resolve-half-day:
 *   post:
 *     summary: Directly update one Attendance row's Status for Other Half, bypassing the rest of Attendance's own validation (matches source)
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Half day status resolved }, 400: { description: Validation error } }
 */
router.post("/employee-attendance-tool/resolve-half-day", authMiddleware(ANY_ROLE), checkPermission("/employee-attendance-tool", "edit"), controller.resolveHalfDayAttendance);

export default router;
