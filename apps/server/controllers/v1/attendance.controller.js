/**
 * ADR-024. Minimal CRUD for Attendance — module 9 (Shift & Attendance)
 * builds this out properly (shift assignment, check-in/out, geolocation).
 * This fork only establishes the collection so the second fork's Leave
 * Application/Compensatory Leave Request have something to reference.
 */
import { runListQuery } from "../../utils/listQuery.js";
import { dayStart } from "../../utils/shiftOccurrence.js";
import ShiftType from "../../models/ShiftType.js";
import { attendanceScope } from "../../utils/attendanceScope.js";
import Attendance from "../../models/Attendance.js";
import Employee from "../../models/Employee.js";
import {
  getReferencingCounts,
  formatReferenceMessage,
} from "../../utils/referenceHelper.js";

const ATTENDANCE_FIELDS = ["departmentId", "shiftId", "workingHours", "standardWorkingHours", "actualOvertimeDuration", "lateEntry", "earlyExit", "inTime", "outTime", "halfDayStatus", "employeeId", "companyId", "attendanceDate", "status", "leaveApplicationId", "leaveTypeId", "isActive"];

export const createAttendance = async (req, res) => {
  try {
    const { employeeId, attendanceDate, status } = req.body;
    if (!employeeId || !attendanceDate || !status) {
      return res.status(400).json({ isOk: false, status: 400, message: "Employee, Attendance Date and Status are required" });
    }
    const employee = await Employee.findOne({ $and: [{ _id: employeeId }, await attendanceScope(req, false)] }).lean();
    if (!employee) return res.status(404).json({ isOk: false, status: 404, message: "Employee not found" });

    const existing = await Attendance.findOne({ employeeId, attendanceDate });
    if (existing) {
      return res.status(400).json({ isOk: false, status: 400, message: "Attendance already recorded for this employee on this date" });
    }

    const payload = {};
    for (const field of ATTENDANCE_FIELDS) if (req.body[field] !== undefined) payload[field] = req.body[field];
    payload.companyId = employee.companyId;
    payload.departmentId = employee.departmentId;

    payload.attendanceDate = dayStart(payload.attendanceDate);
    if (payload.shiftId && !await ShiftType.exists({ _id: payload.shiftId, companyId: employee.companyId })) return res.status(400).json({ isOk: false, status: 400, message: "Shift must belong to the employee company" });
    await Attendance.create(payload);
    return res.status(201).json({ isOk: true, status: 201, message: "Attendance created successfully" });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError" || error.name === "RangeError" || error.code === 11000) return res.status(400).json({ isOk: false, status: 400, message: error.code === 11000 ? "Attendance already recorded for this employee on this date" : "Invalid attendance data" });
    console.log("Error in createAttendance", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateAttendance = async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const doc = await Attendance.findOne({ $and: [{ _id: attendanceId }, await attendanceScope(req)] });
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Attendance not found" });
    for (const field of ATTENDANCE_FIELDS) if (req.body[field] !== undefined) doc[field] = req.body[field];
    const employee = await Employee.findOne({ $and: [{ _id: doc.employeeId }, await attendanceScope(req, false)] }).lean();
    if (!employee) return res.status(400).json({ isOk: false, status: 400, message: "Employee not available in your company" });
    doc.companyId = employee.companyId;
    doc.departmentId = employee.departmentId;
    doc.attendanceDate = dayStart(doc.attendanceDate);
    if (doc.shiftId && !await ShiftType.exists({ _id: doc.shiftId, companyId: employee.companyId })) return res.status(400).json({ isOk: false, status: 400, message: "Shift must belong to the employee company" });
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Attendance updated successfully" });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError" || error.name === "RangeError" || error.code === 11000) return res.status(400).json({ isOk: false, status: 400, message: error.code === 11000 ? "Attendance already recorded for this employee on this date" : "Invalid attendance data" });
    console.log("Error in updateAttendance", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteAttendance = async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const doc = await Attendance.findOne({ $and: [{ _id: attendanceId }, await attendanceScope(req)] });
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
    if (error.name === "ValidationError" || error.name === "CastError" || error.name === "RangeError" || error.code === 11000) return res.status(400).json({ isOk: false, status: 400, message: error.code === 11000 ? "Attendance already recorded for this employee on this date" : "Invalid attendance data" });
    console.log("Error in deleteAttendance", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getAttendanceById = async (req, res) => {
  try {
    const doc = await Attendance.findOne({ $and: [{ _id: req.params.attendanceId }, await attendanceScope(req)] })
      .populate("employeeId", "employeeName employeeCode")
      .populate("companyId", "companyName")
      .populate("leaveTypeId", "leaveTypeName")
      .populate("shiftId", "shiftTypeName")
      .populate("departmentId", "departmentName");
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Attendance not found" });
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError" || error.name === "RangeError" || error.code === 11000) return res.status(400).json({ isOk: false, status: 400, message: error.code === 11000 ? "Attendance already recorded for this employee on this date" : "Invalid attendance data" });
    console.log("Error in getAttendanceById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listAttendances = async (req, res) => {
  try {
    const filter = { $and: [{ isActive: true }, await attendanceScope(req)] };
    if (req.query.employeeId) filter.employeeId = req.query.employeeId;
    const docs = await Attendance.find(filter).select("employeeId attendanceDate status");
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError" || error.name === "RangeError" || error.code === 11000) return res.status(400).json({ isOk: false, status: 400, message: error.code === 11000 ? "Attendance already recorded for this employee on this date" : "Invalid attendance data" });
    console.log("Error in listAttendances", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listAttendanceByParams = async (req, res) => {
  try {
    const list = await runListQuery(Attendance, req.body, {
      scopeFilter: await attendanceScope(req),
      stages: [
        { $lookup: { from: "employees", localField: "employeeId", foreignField: "_id", as: "employee" } },
        {
          $addFields: {
            employeeName: { $arrayElemAt: ["$employee.employeeName", 0] },
            employeeIdLabel: { $arrayElemAt: ["$employee.employeeName", 0] },
          },
        },
        { $project: { employee: 0 } },
      ],
      searchFields: ["employeeName", "status"],
      filterable: {
        departmentId: "objectId",
        shiftId: "objectId",
        workingHours: "number",
        standardWorkingHours: "number",
        actualOvertimeDuration: "number",
        lateEntry: "boolean",
        earlyExit: "boolean",
        inTime: "date",
        outTime: "date",
        halfDayStatus: "string",

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
    if (error.name === "ValidationError" || error.name === "CastError" || error.name === "RangeError" || error.code === 11000) return res.status(400).json({ isOk: false, status: 400, message: error.code === 11000 ? "Attendance already recorded for this employee on this date" : "Invalid attendance data" });
    console.log("Error in listAttendanceByParams", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};
