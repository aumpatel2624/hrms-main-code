import { runListQuery } from "../../utils/listQuery.js";
import { attendanceScope } from "../../utils/attendanceScope.js";
import { saveShiftRecord, withShiftWriteLock } from "../../utils/shiftAssignmentWrite.js";
import { generateShiftRanges } from "../../utils/shiftSchedule.js";
import { DAY_MS } from "../../utils/shiftOccurrence.js";
import { getReferencingCounts, formatReferenceMessage } from "../../utils/referenceHelper.js";
import ShiftType from "../../models/ShiftType.js";
import ShiftLocation from "../../models/ShiftLocation.js";
import ShiftAssignment from "../../models/ShiftAssignment.js";
import ShiftSchedule from "../../models/ShiftSchedule.js";
import ShiftScheduleAssignment from "../../models/ShiftScheduleAssignment.js";
import EmployeeCheckin from "../../models/EmployeeCheckin.js";

const failure = (res, error) => {
  if (error.status === 400 || error.name === "ValidationError" || error.name === "CastError" || error.name === "RangeError" || error.code === 11000) {
    return res.status(400).json({ isOk: false, status: 400, message: error.code === 11000 ? "A record with these unique values already exists" : error.message });
  }
  console.error("Shift & Attendance request failed", error);
  return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
};

export const SHIFTTYPE_FIELDS = ["shiftTypeName", "startTime", "endTime", "holidayListId", "determineCheckInAndCheckOut", "workingHoursCalculationBasis", "color", "processAttendanceAfter", "lastSyncOfCheckin", "workingHoursThresholdForHalfDay", "workingHoursThresholdForAbsent", "beginCheckInBeforeShiftStartTime", "allowCheckOutAfterShiftEndTime", "lateEntryGracePeriod", "earlyExitGracePeriod", "enableAutoAttendance", "markAutoAttendanceOnHolidays", "enableLateEntryMarking", "enableEarlyExitMarking", "autoUpdateLastSync", "allowOvertime", "companyId", "isActive"];
export const createShiftType = async (req, res) => {
  try {
    const payload = {};
    for (const field of SHIFTTYPE_FIELDS) if (req.body[field] !== undefined) payload[field] = req.body[field];
    const doc = new ShiftType(payload);
    await saveShiftRecord(doc, null, req);
    return res.status(201).json({ isOk: true, status: 201, data: doc, message: "Shift Type created successfully" });
  } catch (error) { return failure(res, error); }
};
export const updateShiftType = async (req, res) => {
  try {
    const doc = await ShiftType.findOne({ $and: [{ _id: req.params.shiftTypeId }, await attendanceScope(req, false)] });
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Shift Type not found" });
    const previous = doc.toObject();
    for (const field of SHIFTTYPE_FIELDS) if (req.body[field] !== undefined) doc[field] = req.body[field];
    await saveShiftRecord(doc, previous, req);
    return res.status(200).json({ isOk: true, status: 200, data: doc, message: "Shift Type updated successfully" });
  } catch (error) { return failure(res, error); }
};
export const getShiftTypeById = async (req, res) => {
  try {
    const doc = await ShiftType.findOne({ $and: [{ _id: req.params.shiftTypeId }, await attendanceScope(req, false)] }).populate("holidayListId", "holidayListName").populate("companyId", "companyName");
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Shift Type not found" });
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) { return failure(res, error); }
};
export const listShiftTypes = async (req, res) => {
  try {
    const docs = await ShiftType.find({ $and: [{ isActive: true }, await attendanceScope(req, false)] });
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) { return failure(res, error); }
};
export const searchShiftTypes = async (req, res) => {
  try {
    const data = await runListQuery(ShiftType, req.body, { scopeFilter: await attendanceScope(req, false),
      searchFields: ["shiftTypeName"],
      filterable: {"shiftTypeName": "string", "holidayListId": "objectId", "enableAutoAttendance": "boolean", "companyId": "objectId", "isActive": "boolean", "createdAt": "date"},
      stages: [{"$lookup": {"from": "holidaylists", "localField": "holidayListId", "foreignField": "_id", "as": "holidayListId_joined"}}, {"$addFields": {"holidayListIdLabel": {"$arrayElemAt": ["$holidayListId_joined.holidayListName", 0]}}}, {"$project": {"holidayListId_joined": 0}}, {"$lookup": {"from": "companies", "localField": "companyId", "foreignField": "_id", "as": "companyId_joined"}}, {"$addFields": {"companyIdLabel": {"$arrayElemAt": ["$companyId_joined.companyName", 0]}}}, {"$project": {"companyId_joined": 0}}],
    });
    return res.status(200).json({ isOk: true, status: 200, data });
  } catch (error) { return failure(res, error); }
};
export const deleteShiftType = async (req, res) => {
  try {
    const doc = await ShiftType.findOne({ $and: [{ _id: req.params.shiftTypeId }, await attendanceScope(req, false)] });
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Shift Type not found" });
    const refs = await getReferencingCounts("ShiftType", doc._id);
    if (refs.totalReferences) return res.status(409).json({ isOk: false, status: 409,
      message: "Cannot delete Shift Type. It is being used by other records.", totalReferences: refs.totalReferences,
      references: refs.details, formattedMessage: formatReferenceMessage(refs.details),
    });
    await ShiftType.findByIdAndUpdate(doc._id, { isDeleted: true });
    return res.status(200).json({ isOk: true, status: 200, message: "Shift Type deleted successfully" });
  } catch (error) { return failure(res, error); }
};

export const SHIFTLOCATION_FIELDS = ["locationName", "checkinRadius", "latitude", "longitude", "companyId", "isActive"];
export const createShiftLocation = async (req, res) => {
  try {
    const payload = {};
    for (const field of SHIFTLOCATION_FIELDS) if (req.body[field] !== undefined) payload[field] = req.body[field];
    const doc = new ShiftLocation(payload);
    await saveShiftRecord(doc, null, req);
    return res.status(201).json({ isOk: true, status: 201, data: doc, message: "Shift Location created successfully" });
  } catch (error) { return failure(res, error); }
};
export const updateShiftLocation = async (req, res) => {
  try {
    const doc = await ShiftLocation.findOne({ $and: [{ _id: req.params.shiftLocationId }, await attendanceScope(req, false)] });
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Shift Location not found" });
    const previous = doc.toObject();
    for (const field of SHIFTLOCATION_FIELDS) if (req.body[field] !== undefined) doc[field] = req.body[field];
    await saveShiftRecord(doc, previous, req);
    return res.status(200).json({ isOk: true, status: 200, data: doc, message: "Shift Location updated successfully" });
  } catch (error) { return failure(res, error); }
};
export const getShiftLocationById = async (req, res) => {
  try {
    const doc = await ShiftLocation.findOne({ $and: [{ _id: req.params.shiftLocationId }, await attendanceScope(req, false)] }).populate("companyId", "companyName");
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Shift Location not found" });
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) { return failure(res, error); }
};
export const listShiftLocations = async (req, res) => {
  try {
    const docs = await ShiftLocation.find({ $and: [{ isActive: true }, await attendanceScope(req, false)] });
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) { return failure(res, error); }
};
export const searchShiftLocations = async (req, res) => {
  try {
    const data = await runListQuery(ShiftLocation, req.body, { scopeFilter: await attendanceScope(req, false),
      searchFields: ["locationName"],
      filterable: {"locationName": "string", "companyId": "objectId", "isActive": "boolean", "createdAt": "date"},
      stages: [{"$lookup": {"from": "companies", "localField": "companyId", "foreignField": "_id", "as": "companyId_joined"}}, {"$addFields": {"companyIdLabel": {"$arrayElemAt": ["$companyId_joined.companyName", 0]}}}, {"$project": {"companyId_joined": 0}}],
    });
    return res.status(200).json({ isOk: true, status: 200, data });
  } catch (error) { return failure(res, error); }
};
export const deleteShiftLocation = async (req, res) => {
  try {
    const doc = await ShiftLocation.findOne({ $and: [{ _id: req.params.shiftLocationId }, await attendanceScope(req, false)] });
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Shift Location not found" });
    const refs = await getReferencingCounts("ShiftLocation", doc._id);
    if (refs.totalReferences) return res.status(409).json({ isOk: false, status: 409,
      message: "Cannot delete Shift Location. It is being used by other records.", totalReferences: refs.totalReferences,
      references: refs.details, formattedMessage: formatReferenceMessage(refs.details),
    });
    await ShiftLocation.findByIdAndUpdate(doc._id, { isDeleted: true });
    return res.status(200).json({ isOk: true, status: 200, message: "Shift Location deleted successfully" });
  } catch (error) { return failure(res, error); }
};

export const SHIFTASSIGNMENT_FIELDS = ["employeeId", "shiftTypeId", "shiftLocationId", "startDate", "endDate", "status", "companyId", "isActive"];
export const createShiftAssignment = async (req, res) => {
  try {
    const payload = {};
    for (const field of SHIFTASSIGNMENT_FIELDS) if (req.body[field] !== undefined) payload[field] = req.body[field];
    const doc = new ShiftAssignment(payload);
    await saveShiftRecord(doc, null, req);
    return res.status(201).json({ isOk: true, status: 201, data: doc, message: "Shift Assignment created successfully" });
  } catch (error) { return failure(res, error); }
};
export const updateShiftAssignment = async (req, res) => {
  try {
    const doc = await ShiftAssignment.findOne({ $and: [{ _id: req.params.shiftAssignmentId }, await attendanceScope(req, true)] });
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Shift Assignment not found" });
    const previous = doc.toObject();
    for (const field of SHIFTASSIGNMENT_FIELDS) if (req.body[field] !== undefined) doc[field] = req.body[field];
    await saveShiftRecord(doc, previous, req);
    return res.status(200).json({ isOk: true, status: 200, data: doc, message: "Shift Assignment updated successfully" });
  } catch (error) { return failure(res, error); }
};
export const getShiftAssignmentById = async (req, res) => {
  try {
    const doc = await ShiftAssignment.findOne({ $and: [{ _id: req.params.shiftAssignmentId }, await attendanceScope(req, true)] }).populate("employeeId", "employeeName").populate("shiftTypeId", "shiftTypeName").populate("shiftLocationId", "locationName").populate("companyId", "companyName");
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Shift Assignment not found" });
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) { return failure(res, error); }
};
export const listShiftAssignments = async (req, res) => {
  try {
    const docs = await ShiftAssignment.find({ $and: [{ isActive: true }, await attendanceScope(req, true)] });
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) { return failure(res, error); }
};
export const searchShiftAssignments = async (req, res) => {
  try {
    const data = await runListQuery(ShiftAssignment, req.body, { scopeFilter: await attendanceScope(req, true),
      searchFields: [],
      filterable: {"employeeId": "objectId", "shiftTypeId": "objectId", "shiftLocationId": "objectId", "shiftScheduleAssignmentId": "objectId", "startDate": "date", "endDate": "date", "status": "string", "companyId": "objectId", "isActive": "boolean", "createdAt": "date"},
      stages: [{"$lookup": {"from": "employees", "localField": "employeeId", "foreignField": "_id", "as": "employeeId_joined"}}, {"$addFields": {"employeeIdLabel": {"$arrayElemAt": ["$employeeId_joined.employeeName", 0]}}}, {"$project": {"employeeId_joined": 0}}, {"$lookup": {"from": "shifttypes", "localField": "shiftTypeId", "foreignField": "_id", "as": "shiftTypeId_joined"}}, {"$addFields": {"shiftTypeIdLabel": {"$arrayElemAt": ["$shiftTypeId_joined.shiftTypeName", 0]}}}, {"$project": {"shiftTypeId_joined": 0}}, {"$lookup": {"from": "shiftlocations", "localField": "shiftLocationId", "foreignField": "_id", "as": "shiftLocationId_joined"}}, {"$addFields": {"shiftLocationIdLabel": {"$arrayElemAt": ["$shiftLocationId_joined.locationName", 0]}}}, {"$project": {"shiftLocationId_joined": 0}}, {"$lookup": {"from": "companies", "localField": "companyId", "foreignField": "_id", "as": "companyId_joined"}}, {"$addFields": {"companyIdLabel": {"$arrayElemAt": ["$companyId_joined.companyName", 0]}}}, {"$project": {"companyId_joined": 0}}],
    });
    return res.status(200).json({ isOk: true, status: 200, data });
  } catch (error) { return failure(res, error); }
};
export const deleteShiftAssignment = async (req, res) => {
  try {
    const doc = await ShiftAssignment.findOne({ $and: [{ _id: req.params.shiftAssignmentId }, await attendanceScope(req, true)] });
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Shift Assignment not found" });
    const refs = await getReferencingCounts("ShiftAssignment", doc._id);
    if (refs.totalReferences) return res.status(409).json({ isOk: false, status: 409,
      message: "Cannot delete Shift Assignment. It is being used by other records.", totalReferences: refs.totalReferences,
      references: refs.details, formattedMessage: formatReferenceMessage(refs.details),
    });
    await ShiftAssignment.findByIdAndUpdate(doc._id, { isDeleted: true });
    return res.status(200).json({ isOk: true, status: 200, message: "Shift Assignment deleted successfully" });
  } catch (error) { return failure(res, error); }
};

export const SHIFTSCHEDULE_FIELDS = ["frequency", "repeatOnDays", "shiftTypeId", "companyId", "isActive"];
export const createShiftSchedule = async (req, res) => {
  try {
    const payload = {};
    for (const field of SHIFTSCHEDULE_FIELDS) if (req.body[field] !== undefined) payload[field] = req.body[field];
    const doc = new ShiftSchedule(payload);
    await saveShiftRecord(doc, null, req);
    return res.status(201).json({ isOk: true, status: 201, data: doc, message: "Shift Schedule created successfully" });
  } catch (error) { return failure(res, error); }
};
export const updateShiftSchedule = async (req, res) => {
  try {
    const doc = await ShiftSchedule.findOne({ $and: [{ _id: req.params.shiftScheduleId }, await attendanceScope(req, false)] });
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Shift Schedule not found" });
    const previous = doc.toObject();
    for (const field of SHIFTSCHEDULE_FIELDS) if (req.body[field] !== undefined) doc[field] = req.body[field];
    await saveShiftRecord(doc, previous, req);
    return res.status(200).json({ isOk: true, status: 200, data: doc, message: "Shift Schedule updated successfully" });
  } catch (error) { return failure(res, error); }
};
export const getShiftScheduleById = async (req, res) => {
  try {
    const doc = await ShiftSchedule.findOne({ $and: [{ _id: req.params.shiftScheduleId }, await attendanceScope(req, false)] }).populate("shiftTypeId", "shiftTypeName").populate("companyId", "companyName");
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Shift Schedule not found" });
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) { return failure(res, error); }
};
export const listShiftSchedules = async (req, res) => {
  try {
    const docs = await ShiftSchedule.find({ $and: [{ isActive: true }, await attendanceScope(req, false)] });
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) { return failure(res, error); }
};
export const searchShiftSchedules = async (req, res) => {
  try {
    const data = await runListQuery(ShiftSchedule, req.body, { scopeFilter: await attendanceScope(req, false),
      searchFields: [],
      filterable: {"frequency": "string", "shiftTypeId": "objectId", "companyId": "objectId", "isActive": "boolean", "createdAt": "date"},
      stages: [{"$lookup": {"from": "shifttypes", "localField": "shiftTypeId", "foreignField": "_id", "as": "shiftTypeId_joined"}}, {"$addFields": {"shiftTypeIdLabel": {"$arrayElemAt": ["$shiftTypeId_joined.shiftTypeName", 0]}}}, {"$project": {"shiftTypeId_joined": 0}}, {"$lookup": {"from": "companies", "localField": "companyId", "foreignField": "_id", "as": "companyId_joined"}}, {"$addFields": {"companyIdLabel": {"$arrayElemAt": ["$companyId_joined.companyName", 0]}}}, {"$project": {"companyId_joined": 0}}],
    });
    return res.status(200).json({ isOk: true, status: 200, data });
  } catch (error) { return failure(res, error); }
};
export const deleteShiftSchedule = async (req, res) => {
  try {
    const doc = await ShiftSchedule.findOne({ $and: [{ _id: req.params.shiftScheduleId }, await attendanceScope(req, false)] });
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Shift Schedule not found" });
    const refs = await getReferencingCounts("ShiftSchedule", doc._id);
    if (refs.totalReferences) return res.status(409).json({ isOk: false, status: 409,
      message: "Cannot delete Shift Schedule. It is being used by other records.", totalReferences: refs.totalReferences,
      references: refs.details, formattedMessage: formatReferenceMessage(refs.details),
    });
    await ShiftSchedule.findByIdAndUpdate(doc._id, { isDeleted: true });
    return res.status(200).json({ isOk: true, status: 200, message: "Shift Schedule deleted successfully" });
  } catch (error) { return failure(res, error); }
};

export const SHIFTSCHEDULEASSIGNMENT_FIELDS = ["employeeId", "shiftScheduleId", "shiftLocationId", "enabled", "createShiftsAfter", "status", "companyId", "isActive"];
export const createShiftScheduleAssignment = async (req, res) => {
  try {
    const payload = {};
    for (const field of SHIFTSCHEDULEASSIGNMENT_FIELDS) if (req.body[field] !== undefined) payload[field] = req.body[field];
    const doc = new ShiftScheduleAssignment(payload);
    await saveShiftRecord(doc, null, req);
    return res.status(201).json({ isOk: true, status: 201, data: doc, message: "Shift Schedule Assignment created successfully" });
  } catch (error) { return failure(res, error); }
};
export const updateShiftScheduleAssignment = async (req, res) => {
  try {
    const doc = await ShiftScheduleAssignment.findOne({ $and: [{ _id: req.params.shiftScheduleAssignmentId }, await attendanceScope(req, true)] });
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Shift Schedule Assignment not found" });
    const previous = doc.toObject();
    for (const field of SHIFTSCHEDULEASSIGNMENT_FIELDS) if (req.body[field] !== undefined) doc[field] = req.body[field];
    await saveShiftRecord(doc, previous, req);
    return res.status(200).json({ isOk: true, status: 200, data: doc, message: "Shift Schedule Assignment updated successfully" });
  } catch (error) { return failure(res, error); }
};
export const getShiftScheduleAssignmentById = async (req, res) => {
  try {
    const doc = await ShiftScheduleAssignment.findOne({ $and: [{ _id: req.params.shiftScheduleAssignmentId }, await attendanceScope(req, true)] }).populate("employeeId", "employeeName").populate("shiftScheduleId", "frequency").populate("shiftLocationId", "locationName").populate("companyId", "companyName");
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Shift Schedule Assignment not found" });
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) { return failure(res, error); }
};
export const listShiftScheduleAssignments = async (req, res) => {
  try {
    const docs = await ShiftScheduleAssignment.find({ $and: [{ isActive: true }, await attendanceScope(req, true)] });
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) { return failure(res, error); }
};
export const searchShiftScheduleAssignments = async (req, res) => {
  try {
    const data = await runListQuery(ShiftScheduleAssignment, req.body, { scopeFilter: await attendanceScope(req, true),
      searchFields: [],
      filterable: {"employeeId": "objectId", "shiftScheduleId": "objectId", "shiftLocationId": "objectId", "enabled": "boolean", "createShiftsAfter": "date", "status": "string", "companyId": "objectId", "isActive": "boolean", "createdAt": "date"},
      stages: [{"$lookup": {"from": "employees", "localField": "employeeId", "foreignField": "_id", "as": "employeeId_joined"}}, {"$addFields": {"employeeIdLabel": {"$arrayElemAt": ["$employeeId_joined.employeeName", 0]}}}, {"$project": {"employeeId_joined": 0}}, {"$lookup": {"from": "shiftschedules", "localField": "shiftScheduleId", "foreignField": "_id", "as": "shiftScheduleId_joined"}}, {"$addFields": {"shiftScheduleIdLabel": {"$arrayElemAt": ["$shiftScheduleId_joined.frequency", 0]}}}, {"$project": {"shiftScheduleId_joined": 0}}, {"$lookup": {"from": "shiftlocations", "localField": "shiftLocationId", "foreignField": "_id", "as": "shiftLocationId_joined"}}, {"$addFields": {"shiftLocationIdLabel": {"$arrayElemAt": ["$shiftLocationId_joined.locationName", 0]}}}, {"$project": {"shiftLocationId_joined": 0}}, {"$lookup": {"from": "companies", "localField": "companyId", "foreignField": "_id", "as": "companyId_joined"}}, {"$addFields": {"companyIdLabel": {"$arrayElemAt": ["$companyId_joined.companyName", 0]}}}, {"$project": {"companyId_joined": 0}}],
    });
    return res.status(200).json({ isOk: true, status: 200, data });
  } catch (error) { return failure(res, error); }
};
export const deleteShiftScheduleAssignment = async (req, res) => {
  try {
    const doc = await ShiftScheduleAssignment.findOne({ $and: [{ _id: req.params.shiftScheduleAssignmentId }, await attendanceScope(req, true)] });
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Shift Schedule Assignment not found" });
    const refs = await getReferencingCounts("ShiftScheduleAssignment", doc._id);
    if (refs.totalReferences) return res.status(409).json({ isOk: false, status: 409,
      message: "Cannot delete Shift Schedule Assignment. It is being used by other records.", totalReferences: refs.totalReferences,
      references: refs.details, formattedMessage: formatReferenceMessage(refs.details),
    });
    await ShiftScheduleAssignment.findByIdAndUpdate(doc._id, { isDeleted: true });
    return res.status(200).json({ isOk: true, status: 200, message: "Shift Schedule Assignment deleted successfully" });
  } catch (error) { return failure(res, error); }
};

export const EMPLOYEECHECKIN_FIELDS = ["employeeId", "time", "logType", "deviceId", "skipAutoAttendance", "latitude", "longitude", "companyId", "isActive"];
export const createEmployeeCheckin = async (req, res) => {
  try {
    const payload = {};
    for (const field of EMPLOYEECHECKIN_FIELDS) if (req.body[field] !== undefined) payload[field] = req.body[field];
    const doc = new EmployeeCheckin(payload);
    await saveShiftRecord(doc, null, req);
    return res.status(201).json({ isOk: true, status: 201, data: doc, message: "Employee Checkin created successfully" });
  } catch (error) { return failure(res, error); }
};
export const updateEmployeeCheckin = async (req, res) => {
  try {
    const doc = await EmployeeCheckin.findOne({ $and: [{ _id: req.params.employeeCheckinId }, await attendanceScope(req, true)] });
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Employee Checkin not found" });
    const previous = doc.toObject();
    for (const field of EMPLOYEECHECKIN_FIELDS) if (req.body[field] !== undefined) doc[field] = req.body[field];
    await saveShiftRecord(doc, previous, req);
    return res.status(200).json({ isOk: true, status: 200, data: doc, message: "Employee Checkin updated successfully" });
  } catch (error) { return failure(res, error); }
};
export const getEmployeeCheckinById = async (req, res) => {
  try {
    const doc = await EmployeeCheckin.findOne({ $and: [{ _id: req.params.employeeCheckinId }, await attendanceScope(req, true)] }).populate("employeeId", "employeeName").populate("shiftId", "shiftTypeName").populate("companyId", "companyName");
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Employee Checkin not found" });
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) { return failure(res, error); }
};
export const listEmployeeCheckins = async (req, res) => {
  try {
    const docs = await EmployeeCheckin.find({ $and: [{ isActive: true }, await attendanceScope(req, true)] });
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) { return failure(res, error); }
};
export const searchEmployeeCheckins = async (req, res) => {
  try {
    const data = await runListQuery(EmployeeCheckin, req.body, { scopeFilter: await attendanceScope(req, true),
      searchFields: [],
      filterable: {"employeeId": "objectId", "shiftId": "objectId", "attendanceId": "objectId", "time": "date", "logType": "string", "deviceId": "objectId", "skipAutoAttendance": "boolean", "offshift": "boolean", "companyId": "objectId", "isActive": "boolean", "createdAt": "date"},
      stages: [{"$lookup": {"from": "employees", "localField": "employeeId", "foreignField": "_id", "as": "employeeId_joined"}}, {"$addFields": {"employeeIdLabel": {"$arrayElemAt": ["$employeeId_joined.employeeName", 0]}}}, {"$project": {"employeeId_joined": 0}}, {"$lookup": {"from": "shifttypes", "localField": "shiftId", "foreignField": "_id", "as": "shiftId_joined"}}, {"$addFields": {"shiftIdLabel": {"$arrayElemAt": ["$shiftId_joined.shiftTypeName", 0]}}}, {"$project": {"shiftId_joined": 0}}, {"$lookup": {"from": "companies", "localField": "companyId", "foreignField": "_id", "as": "companyId_joined"}}, {"$addFields": {"companyIdLabel": {"$arrayElemAt": ["$companyId_joined.companyName", 0]}}}, {"$project": {"companyId_joined": 0}}],
    });
    return res.status(200).json({ isOk: true, status: 200, data });
  } catch (error) { return failure(res, error); }
};
export const deleteEmployeeCheckin = async (req, res) => {
  try {
    const doc = await EmployeeCheckin.findOne({ $and: [{ _id: req.params.employeeCheckinId }, await attendanceScope(req, true)] });
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Employee Checkin not found" });
    const refs = await getReferencingCounts("EmployeeCheckin", doc._id);
    if (refs.totalReferences) return res.status(409).json({ isOk: false, status: 409,
      message: "Cannot delete Employee Checkin. It is being used by other records.", totalReferences: refs.totalReferences,
      references: refs.details, formattedMessage: formatReferenceMessage(refs.details),
    });
    await EmployeeCheckin.findByIdAndUpdate(doc._id, { isDeleted: true });
    return res.status(200).json({ isOk: true, status: 200, message: "Employee Checkin deleted successfully" });
  } catch (error) { return failure(res, error); }
};

export const generateShiftScheduleAssignments = async (req, res) => withShiftWriteLock(`schedule:${req.params.shiftScheduleAssignmentId}`, async () => {
  try {
    const doc = await ShiftScheduleAssignment.findOne({ $and: [{ _id: req.params.shiftScheduleAssignmentId }, await attendanceScope(req)] });
    if (!doc) return res.status(404).json({ isOk: false, status: 404, message: "Shift Schedule Assignment not found" });
    if (!doc.enabled || !doc.createShiftsAfter) return res.status(400).json({ isOk: false, status: 400, message: "Enable the schedule assignment and set create shifts after before generating" });
    const schedule = await ShiftSchedule.findOne({ _id: doc.shiftScheduleId, companyId: doc.companyId, isActive: true });
    if (!schedule) return res.status(400).json({ isOk: false, status: 400, message: "Active Shift Schedule not found" });
    const ranges = generateShiftRanges(schedule, doc.createShiftsAfter, req.body.endDate);
    const results = [];
    for (const range of ranges) {
      try {
        const assignment = new ShiftAssignment({ employeeId: doc.employeeId, companyId: doc.companyId,
          shiftTypeId: schedule.shiftTypeId, shiftLocationId: doc.shiftLocationId,
          shiftScheduleAssignmentId: doc._id, status: doc.status, ...range,
        });
        await saveShiftRecord(assignment, null, req);
        doc.createShiftsAfter = new Date(+range.endDate + DAY_MS);
        await doc.save();
        results.push({ ...range, success: true, shiftAssignmentId: assignment._id });
      } catch (error) {
        results.push({ ...range, success: false, message: error.status === 400 || error.name === "ValidationError" ? error.message : "Could not generate this range" });
      }
    }
    return res.status(200).json({ isOk: true, status: 200, data: { results, createShiftsAfter: doc.createShiftsAfter } });
  } catch (error) { return failure(res, error); }
});
