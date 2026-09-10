/**
 * ADR-024. Minimal CRUD for Attendance — module 9 (Shift & Attendance)
 * builds this out properly (shift assignment, check-in/out, geolocation).
 * This fork only establishes the collection so the second fork's Leave
 * Application/Compensatory Leave Request have something to reference.
 */
import { runListQuery } from "../../utils/listQuery.js";
import Attendance from "../../models/Attendance.js";
import Employee from "../../models/Employee.js";
import {
  getReferencingCounts,
  formatReferenceMessage,
} from "../../utils/referenceHelper.js";

const ATTENDANCE_FIELDS = ["employeeId", "companyId", "attendanceDate", "status", "leaveApplicationId", "leaveTypeId", "isActive"];

export const createAttendance = async (req, res) => {
  try {
    const { employeeId, attendanceDate, status } = req.body;
    if (!employeeId || !attendanceDate || !status) {
      return res.status(400).json({ isOk: false, status: 400, message: "Employee, Attendance Date and Status are required" });
    }
    const employee = await Employee.findById(employeeId).lean();
    if (!employee) return res.status(404).json({ isOk: false, status: 404, message: "Employee not found" });

    const existing = await Attendance.findOne({ employeeId, attendanceDate });
    if (existing) {
      return res.status(400).json({ isOk: false, status: 400, message: "Attendance already recorded for this employee on this date" });
    }

    const payload = {};
    for (const field of ATTENDANCE_FIELDS) if (req.body[field] !== undefined) payload[field] = req.body[field];
    if (!payload.companyId) payload.companyId = employee.companyId;

    await Attendance.create(payload);
    return res.status(201).json({ isOk: true, status: 201, message: "Attendance created successfully" });
  } catch (error) {
    console.log("Error in createAttendance", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateAttendance = async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const doc = await Attendance.findById(attendanceId);
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Attendance not found" });
    for (const field of ATTENDANCE_FIELDS) if (req.body[field] !== undefined) doc[field] = req.body[field];
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Attendance updated successfully" });
  } catch (error) {
    console.log("Error in updateAttendance", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteAttendance = async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const doc = await Attendance.findById(attendanceId);
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Attendance not found" });
    const referenceInfo = await getReferencingCounts("Attendance", attendanceId);
    if (referenceInfo.totalReferences > 0) {
      return res.status(409).json({
        isOk: false,
        status: 409,
        message: "Cannot delete attendance. It is being used by other records.",
        totalReferences: referenceInfo.totalReferences,
        references: referenceInfo.details,
        formattedMessage: formatReferenceMessage(referenceInfo.details),
      });
    }
    await Attendance.findByIdAndUpdate(attendanceId, { isDeleted: true });
    return res.status(200).json({ isOk: true, status: 200, message: "Attendance deleted successfully" });
  } catch (error) {
    console.log("Error in deleteAttendance", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getAttendanceById = async (req, res) => {
  try {
    const doc = await Attendance.findById(req.params.attendanceId)
      .populate("employeeId", "employeeName employeeCode")
      .populate("companyId", "companyName")
      .populate("leaveTypeId", "leaveTypeName");
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Attendance not found" });
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getAttendanceById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listAttendances = async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.employeeId) filter.employeeId = req.query.employeeId;
    const docs = await Attendance.find(filter).select("employeeId attendanceDate status");
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    console.log("Error in listAttendances", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listAttendanceByParams = async (req, res) => {
  try {
    const list = await runListQuery(Attendance, req.body, {
      searchFields: [],
      filterable: {
        employeeId: "objectId",
        companyId: "objectId",
        status: "string",
        attendanceDate: "date",
        isActive: "boolean",
        createdAt: "date",
      },
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log("Error in listAttendanceByParams", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};
