import express from "express";
import { ANY_ROLE } from "@demo-panel/shared/roles";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { checkPermission } from "../../middlewares/checkPermission.js";
import { allowOnlyFields } from "../../middlewares/inputValidator.js";
import * as controller from "../../controllers/v1/shiftAttendance.controller.js";
const router = express.Router();
/**
 * @swagger
 * /shift-types:
 *   post:
 *     summary: createShiftType
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.post("/shift-types", authMiddleware(ANY_ROLE), checkPermission("/shift-type", "write"), allowOnlyFields(controller.SHIFTTYPE_FIELDS), controller.createShiftType);
/**
 * @swagger
 * /shift-types:
 *   get:
 *     summary: listShiftTypes
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.get("/shift-types", authMiddleware(ANY_ROLE), checkPermission("/shift-type", "read"), controller.listShiftTypes);
/**
 * @swagger
 * /shift-types/search:
 *   post:
 *     summary: searchShiftTypes
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.post("/shift-types/search", authMiddleware(ANY_ROLE), checkPermission("/shift-type", "read"), controller.searchShiftTypes);
/**
 * @swagger
 * /shift-types/{shiftTypeId}:
 *   get:
 *     summary: getShiftTypeById
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.get("/shift-types/:shiftTypeId", authMiddleware(ANY_ROLE), checkPermission("/shift-type", "read"), controller.getShiftTypeById);
/**
 * @swagger
 * /shift-types/{shiftTypeId}:
 *   put:
 *     summary: updateShiftType
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.put("/shift-types/:shiftTypeId", authMiddleware(ANY_ROLE), checkPermission("/shift-type", "edit"), allowOnlyFields(controller.SHIFTTYPE_FIELDS), controller.updateShiftType);
/**
 * @swagger
 * /shift-types/{shiftTypeId}:
 *   delete:
 *     summary: deleteShiftType
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.delete("/shift-types/:shiftTypeId", authMiddleware(ANY_ROLE), checkPermission("/shift-type", "delete"), controller.deleteShiftType);
/**
 * @swagger
 * /shift-locations:
 *   post:
 *     summary: createShiftLocation
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.post("/shift-locations", authMiddleware(ANY_ROLE), checkPermission("/shift-location", "write"), allowOnlyFields(controller.SHIFTLOCATION_FIELDS), controller.createShiftLocation);
/**
 * @swagger
 * /shift-locations:
 *   get:
 *     summary: listShiftLocations
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.get("/shift-locations", authMiddleware(ANY_ROLE), checkPermission("/shift-location", "read"), controller.listShiftLocations);
/**
 * @swagger
 * /shift-locations/search:
 *   post:
 *     summary: searchShiftLocations
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.post("/shift-locations/search", authMiddleware(ANY_ROLE), checkPermission("/shift-location", "read"), controller.searchShiftLocations);
/**
 * @swagger
 * /shift-locations/{shiftLocationId}:
 *   get:
 *     summary: getShiftLocationById
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.get("/shift-locations/:shiftLocationId", authMiddleware(ANY_ROLE), checkPermission("/shift-location", "read"), controller.getShiftLocationById);
/**
 * @swagger
 * /shift-locations/{shiftLocationId}:
 *   put:
 *     summary: updateShiftLocation
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.put("/shift-locations/:shiftLocationId", authMiddleware(ANY_ROLE), checkPermission("/shift-location", "edit"), allowOnlyFields(controller.SHIFTLOCATION_FIELDS), controller.updateShiftLocation);
/**
 * @swagger
 * /shift-locations/{shiftLocationId}:
 *   delete:
 *     summary: deleteShiftLocation
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.delete("/shift-locations/:shiftLocationId", authMiddleware(ANY_ROLE), checkPermission("/shift-location", "delete"), controller.deleteShiftLocation);
/**
 * @swagger
 * /shift-assignments:
 *   post:
 *     summary: createShiftAssignment
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.post("/shift-assignments", authMiddleware(ANY_ROLE), checkPermission("/shift-assignment", "write"), allowOnlyFields(controller.SHIFTASSIGNMENT_FIELDS), controller.createShiftAssignment);
/**
 * @swagger
 * /shift-assignments:
 *   get:
 *     summary: listShiftAssignments
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.get("/shift-assignments", authMiddleware(ANY_ROLE), checkPermission("/shift-assignment", "read"), controller.listShiftAssignments);
/**
 * @swagger
 * /shift-assignments/search:
 *   post:
 *     summary: searchShiftAssignments
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.post("/shift-assignments/search", authMiddleware(ANY_ROLE), checkPermission("/shift-assignment", "read"), controller.searchShiftAssignments);
/**
 * @swagger
 * /shift-assignments/{shiftAssignmentId}:
 *   get:
 *     summary: getShiftAssignmentById
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.get("/shift-assignments/:shiftAssignmentId", authMiddleware(ANY_ROLE), checkPermission("/shift-assignment", "read"), controller.getShiftAssignmentById);
/**
 * @swagger
 * /shift-assignments/{shiftAssignmentId}:
 *   put:
 *     summary: updateShiftAssignment
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.put("/shift-assignments/:shiftAssignmentId", authMiddleware(ANY_ROLE), checkPermission("/shift-assignment", "edit"), allowOnlyFields(controller.SHIFTASSIGNMENT_FIELDS), controller.updateShiftAssignment);
/**
 * @swagger
 * /shift-assignments/{shiftAssignmentId}:
 *   delete:
 *     summary: deleteShiftAssignment
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.delete("/shift-assignments/:shiftAssignmentId", authMiddleware(ANY_ROLE), checkPermission("/shift-assignment", "delete"), controller.deleteShiftAssignment);
/**
 * @swagger
 * /shift-schedules:
 *   post:
 *     summary: createShiftSchedule
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.post("/shift-schedules", authMiddleware(ANY_ROLE), checkPermission("/shift-schedule", "write"), allowOnlyFields(controller.SHIFTSCHEDULE_FIELDS), controller.createShiftSchedule);
/**
 * @swagger
 * /shift-schedules:
 *   get:
 *     summary: listShiftSchedules
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.get("/shift-schedules", authMiddleware(ANY_ROLE), checkPermission("/shift-schedule", "read"), controller.listShiftSchedules);
/**
 * @swagger
 * /shift-schedules/search:
 *   post:
 *     summary: searchShiftSchedules
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.post("/shift-schedules/search", authMiddleware(ANY_ROLE), checkPermission("/shift-schedule", "read"), controller.searchShiftSchedules);
/**
 * @swagger
 * /shift-schedules/{shiftScheduleId}:
 *   get:
 *     summary: getShiftScheduleById
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.get("/shift-schedules/:shiftScheduleId", authMiddleware(ANY_ROLE), checkPermission("/shift-schedule", "read"), controller.getShiftScheduleById);
/**
 * @swagger
 * /shift-schedules/{shiftScheduleId}:
 *   put:
 *     summary: updateShiftSchedule
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.put("/shift-schedules/:shiftScheduleId", authMiddleware(ANY_ROLE), checkPermission("/shift-schedule", "edit"), allowOnlyFields(controller.SHIFTSCHEDULE_FIELDS), controller.updateShiftSchedule);
/**
 * @swagger
 * /shift-schedules/{shiftScheduleId}:
 *   delete:
 *     summary: deleteShiftSchedule
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.delete("/shift-schedules/:shiftScheduleId", authMiddleware(ANY_ROLE), checkPermission("/shift-schedule", "delete"), controller.deleteShiftSchedule);
/**
 * @swagger
 * /shift-schedule-assignments:
 *   post:
 *     summary: createShiftScheduleAssignment
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.post("/shift-schedule-assignments", authMiddleware(ANY_ROLE), checkPermission("/shift-schedule-assignment", "write"), allowOnlyFields(controller.SHIFTSCHEDULEASSIGNMENT_FIELDS), controller.createShiftScheduleAssignment);
/**
 * @swagger
 * /shift-schedule-assignments:
 *   get:
 *     summary: listShiftScheduleAssignments
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.get("/shift-schedule-assignments", authMiddleware(ANY_ROLE), checkPermission("/shift-schedule-assignment", "read"), controller.listShiftScheduleAssignments);
/**
 * @swagger
 * /shift-schedule-assignments/search:
 *   post:
 *     summary: searchShiftScheduleAssignments
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.post("/shift-schedule-assignments/search", authMiddleware(ANY_ROLE), checkPermission("/shift-schedule-assignment", "read"), controller.searchShiftScheduleAssignments);
/**
 * @swagger
 * /shift-schedule-assignments/{shiftScheduleAssignmentId}:
 *   get:
 *     summary: getShiftScheduleAssignmentById
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.get("/shift-schedule-assignments/:shiftScheduleAssignmentId", authMiddleware(ANY_ROLE), checkPermission("/shift-schedule-assignment", "read"), controller.getShiftScheduleAssignmentById);
/**
 * @swagger
 * /shift-schedule-assignments/{shiftScheduleAssignmentId}:
 *   put:
 *     summary: updateShiftScheduleAssignment
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.put("/shift-schedule-assignments/:shiftScheduleAssignmentId", authMiddleware(ANY_ROLE), checkPermission("/shift-schedule-assignment", "edit"), allowOnlyFields(controller.SHIFTSCHEDULEASSIGNMENT_FIELDS), controller.updateShiftScheduleAssignment);
/**
 * @swagger
 * /shift-schedule-assignments/{shiftScheduleAssignmentId}:
 *   delete:
 *     summary: deleteShiftScheduleAssignment
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.delete("/shift-schedule-assignments/:shiftScheduleAssignmentId", authMiddleware(ANY_ROLE), checkPermission("/shift-schedule-assignment", "delete"), controller.deleteShiftScheduleAssignment);
/**
 * @swagger
 * /employee-checkins:
 *   post:
 *     summary: createEmployeeCheckin
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.post("/employee-checkins", authMiddleware(ANY_ROLE), checkPermission("/employee-checkin", "write"), allowOnlyFields(controller.EMPLOYEECHECKIN_FIELDS), controller.createEmployeeCheckin);
/**
 * @swagger
 * /employee-checkins:
 *   get:
 *     summary: listEmployeeCheckins
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.get("/employee-checkins", authMiddleware(ANY_ROLE), checkPermission("/employee-checkin", "read"), controller.listEmployeeCheckins);
/**
 * @swagger
 * /employee-checkins/search:
 *   post:
 *     summary: searchEmployeeCheckins
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.post("/employee-checkins/search", authMiddleware(ANY_ROLE), checkPermission("/employee-checkin", "read"), controller.searchEmployeeCheckins);
/**
 * @swagger
 * /employee-checkins/{employeeCheckinId}:
 *   get:
 *     summary: getEmployeeCheckinById
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.get("/employee-checkins/:employeeCheckinId", authMiddleware(ANY_ROLE), checkPermission("/employee-checkin", "read"), controller.getEmployeeCheckinById);
/**
 * @swagger
 * /employee-checkins/{employeeCheckinId}:
 *   put:
 *     summary: updateEmployeeCheckin
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.put("/employee-checkins/:employeeCheckinId", authMiddleware(ANY_ROLE), checkPermission("/employee-checkin", "edit"), allowOnlyFields(controller.EMPLOYEECHECKIN_FIELDS), controller.updateEmployeeCheckin);
/**
 * @swagger
 * /employee-checkins/{employeeCheckinId}:
 *   delete:
 *     summary: deleteEmployeeCheckin
 *     tags: [Shift & Attendance]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful operation }
 *       400: { description: Invalid input }
 *       403: { description: Access denied }
 */
router.delete("/employee-checkins/:employeeCheckinId", authMiddleware(ANY_ROLE), checkPermission("/employee-checkin", "delete"), controller.deleteEmployeeCheckin);
/**
 * @swagger
 * /shift-schedule-assignments/{shiftScheduleAssignmentId}/generate:
 *   post:
 *     summary: Generate contiguous shift assignments and advance the watermark
 *     tags: [Shift & Attendance]
 *     responses:
 *       200: { description: Per-range results and next generation date }
 */
router.post("/shift-schedule-assignments/:shiftScheduleAssignmentId/generate", authMiddleware(ANY_ROLE), checkPermission("/shift-schedule-assignment", "edit"), allowOnlyFields(["endDate"]), controller.generateShiftScheduleAssignments);
export default router;
