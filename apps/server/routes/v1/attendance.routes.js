import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { checkPermission } from "../../middlewares/checkPermission.js";
import { ANY_ROLE } from "@demo-panel/shared/roles";
import {
  createAttendance, updateAttendance, deleteAttendance,
  getAttendanceById, listAttendances, listAttendanceByParams,
} from "../../controllers/v1/attendance.controller.js";

const router = express.Router();

/**
 * @swagger
 * /attendances:
 *   post:
 *     summary: Create an attendance record
 *     tags: [Leaves]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Attendance created successfully }
 */
router.post("/attendances", authMiddleware(ANY_ROLE), checkPermission("/attendance", "write"), createAttendance);

/**
 * @swagger
 * /attendances:
 *   get:
 *     summary: List all active attendance records (dropdown source)
 *     tags: [Leaves]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of attendance records }
 */
router.get("/attendances", authMiddleware(ANY_ROLE), checkPermission("/attendance", "read"), listAttendances);

/**
 * @swagger
 * /attendances/{attendanceId}:
 *   get:
 *     summary: Get attendance by ID
 *     tags: [Leaves]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: attendanceId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Attendance details }
 *       404: { description: Attendance not found }
 */
router.get("/attendances/:attendanceId", authMiddleware(ANY_ROLE), checkPermission("/attendance", "read"), getAttendanceById);

/**
 * @swagger
 * /attendances/{attendanceId}:
 *   put:
 *     summary: Update attendance
 *     tags: [Leaves]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: attendanceId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Attendance updated successfully }
 */
router.put("/attendances/:attendanceId", authMiddleware(ANY_ROLE), checkPermission("/attendance", "edit"), updateAttendance);

/**
 * @swagger
 * /attendances/{attendanceId}:
 *   delete:
 *     summary: Delete attendance
 *     tags: [Leaves]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: attendanceId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Attendance deleted successfully }
 *       409: { description: Cannot delete — referenced by other records }
 */
router.delete("/attendances/:attendanceId", authMiddleware(ANY_ROLE), checkPermission("/attendance", "delete"), deleteAttendance);

/**
 * @swagger
 * /attendances/search:
 *   post:
 *     summary: Search attendance records with pagination
 *     tags: [Leaves]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated list of attendance records }
 */
router.post("/attendances/search", authMiddleware(ANY_ROLE), checkPermission("/attendance", "read"), listAttendanceByParams);

export default router;
