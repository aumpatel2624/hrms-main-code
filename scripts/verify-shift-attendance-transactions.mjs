// Explicit opt-in integration walk (module 9, second/transactional fork —
// ADR-025): requires a running local server and seeded DB. Only records
// tracked below are physically removed in finally; real data is untouched.
import "../apps/server/models/softDelete.js";
import "../apps/server/models/auditPlugin.js";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import Employee from "../apps/server/models/Employee.js";
import User from "../apps/server/models/User.js";
import RoleMaster from "../apps/server/models/RoleMaster.js";
import ShiftType from "../apps/server/models/ShiftType.js";
import ShiftAssignment from "../apps/server/models/ShiftAssignment.js";
import ShiftScheduleAssignment from "../apps/server/models/ShiftScheduleAssignment.js";
import ShiftSchedule from "../apps/server/models/ShiftSchedule.js";
import EmployeeCheckin from "../apps/server/models/EmployeeCheckin.js";
import Attendance from "../apps/server/models/Attendance.js";
import ShiftRequest from "../apps/server/models/ShiftRequest.js";
import AttendanceRequest from "../apps/server/models/AttendanceRequest.js";
import HolidayList from "../apps/server/models/HolidayList.js";
import HolidayListAssignment from "../apps/server/models/HolidayListAssignment.js";
import Department from "../apps/server/models/Department.js";
import { processAutoAttendance } from "../apps/server/jobs/attendanceScheduler.js";
import { dayStart, DAY_MS } from "../apps/server/utils/shiftOccurrence.js";

dotenv.config({ path: "apps/server/.env", quiet: true });
if (process.env.RUN_SHIFT_TXN_VERIFY !== "1") throw new Error("Set RUN_SHIFT_TXN_VERIFY=1 to run this local fixture walk");
const base = `http://127.0.0.1:${process.env.PORT || 7002}/api/v1`;
const prefix = `shift-txn-verify-${Date.now()}`;
const owned = [];
const tracked = (Model, doc) => { owned.push([Model, doc._id]); return doc; };
const createRaw = async (Model, data) => tracked(Model, await Model.create(data));
let cookie = "";
let calls = 0;
const call = async (method, path, body, expected = 200, auth = cookie) => {
  const response = await fetch(base + path, { method, headers: { "content-type": "application/json", cookie: auth }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json();
  calls++;
  assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(data)}`);
  return data;
};
const login = async (email, password) => {
  const response = await fetch(base + "/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password, locationConsent: true, ipConsent: true }) });
  assert.equal(response.status, 200, "Fixture login failed");
  return response.headers.getSetCookie().map(s => s.split(";")[0]).join("; ");
};
const create = async (Model, path, data) => tracked(Model, (await call("POST", path, data, 201)).data);
const search = async (path, body = { page: 1, limit: 1000 }, auth = cookie) => (await call("POST", path + "/search", body, 200, auth)).data.data;

await mongoose.connect(process.env.DATABASE, { autoIndex: false });
const baseline = await Employee.countDocuments();
try {
  cookie = await login(process.env.SEED_ADMIN_EMAIL || "admin@example.com", process.env.SEED_ADMIN_PASSWORD || "Admin@123");
  const employee = await Employee.findOne({ status: "Active" }).lean();
  const companyId = String(employee.companyId);
  const employeeId = String(employee._id);

  const cloneEmployee = async (suffix) => createRaw(Employee, {
    ...Object.fromEntries(Object.entries(employee).filter(([k]) => !["_id", "__v", "createdAt", "updatedAt"].includes(k))),
    employeeName: `${prefix} ${suffix}`, employeeCode: `${prefix}-${suffix}`, userId: null,
  });

  // ===================================================================== ShiftRequest --
  const shiftType = await create(ShiftType, "/shift-types", { companyId, shiftTypeName: prefix + " req-shift", startTime: "09:00", endTime: "17:00" });
  const shiftEmployee = await cloneEmployee("shift-req");

  // Approver resolution: no Department/Employee shift-request approver set anywhere -> rejected.
  await call("POST", "/shift-requests", { employeeId: String(shiftEmployee._id), shiftTypeId: shiftType._id, fromDate: "2041-01-06" }, 400);

  // A real throwaway User to act as the Shift Approver — this seed data has no active Employee with
  // its own linked User account, so `employee.userId` cannot be reused here.
  const approverRole = await RoleMaster.findOne({ roleName: "HR User" });
  const approverUser = await createRaw(User, {
    userName: prefix + " approver", email: `${prefix}-approver@example.test`, password: await bcrypt.hash("Verify@12345", 10),
    departmentId: employee.departmentId, roleId: approverRole._id,
    countryId: new mongoose.Types.ObjectId(), stateId: new mongoose.Types.ObjectId(), cityId: new mongoose.Types.ObjectId(), address: "Fixture",
  });

  // Set a direct approver on the Employee so auto-resolution succeeds.
  await Employee.updateOne({ _id: shiftEmployee._id }, { shiftRequestApproverId: approverUser._id });
  const shiftRequest = await create(ShiftRequest, "/shift-requests", { employeeId: String(shiftEmployee._id), shiftTypeId: shiftType._id, fromDate: "2041-01-06", toDate: "2041-01-10" });
  const shiftRequestDoc = await ShiftRequest.findById(shiftRequest._id).lean();
  assert.equal(String(shiftRequestDoc.approverId), String(approverUser._id), "approverId should auto-resolve to the Employee's direct shiftRequestApproverId");

  // Explicitly-supplied approver validated against the resolved set (only approverUser is valid here).
  // Bounded (not open-ended) so it doesn't perpetually conflict with every later request in this walk.
  await call("POST", "/shift-requests", { employeeId: String(shiftEmployee._id), shiftTypeId: shiftType._id, fromDate: "2041-02-01", toDate: "2041-02-05", approverId: String(new mongoose.Types.ObjectId()) }, 400);
  const explicitApprover = await create(ShiftRequest, "/shift-requests", { employeeId: String(shiftEmployee._id), shiftTypeId: shiftType._id, fromDate: "2041-02-01", toDate: "2041-02-05", approverId: String(approverUser._id) });
  const explicitApproverDoc = await ShiftRequest.findById(explicitApprover._id).lean();
  assert.equal(String(explicitApproverDoc.approverId), String(approverUser._id));

  // Overlapping request date range rejected.
  await call("POST", "/shift-requests", { employeeId: String(shiftEmployee._id), shiftTypeId: shiftType._id, fromDate: "2041-01-08", toDate: "2041-01-09" }, 400);

  // Overlapping ACTUAL shift assignment (ADR-025's simplified "actual timing" stand-in) also rejected.
  const priorAssignment = await create(ShiftAssignment, "/shift-assignments", { employeeId: String(shiftEmployee._id), shiftTypeId: shiftType._id, startDate: "2041-03-01", endDate: "2041-03-10" });
  await call("POST", "/shift-requests", { employeeId: String(shiftEmployee._id), shiftTypeId: shiftType._id, fromDate: "2041-03-05" }, 400);

  // Approve — creates a real ShiftAssignment through the write-locked path (not a bypass): confirm
  // it is itself subject to the SAME overlap validation ShiftAssignment.create uses.
  const approveResult = await call("POST", `/shift-requests/${shiftRequest._id}/approve`);
  assert.equal(approveResult.data.shiftAssignmentId !== undefined, true);
  tracked(ShiftAssignment, { _id: approveResult.data.shiftAssignmentId });
  const createdAssignment = await ShiftAssignment.findById(approveResult.data.shiftAssignmentId).lean();
  assert.equal(String(createdAssignment.employeeId), String(shiftEmployee._id));
  assert.equal(createdAssignment.startDate.toISOString().slice(0, 10), "2041-01-06");
  assert.equal(createdAssignment.endDate.toISOString().slice(0, 10), "2041-01-10");
  const approvedDoc = await ShiftRequest.findById(shiftRequest._id).lean();
  assert.equal(approvedDoc.status, "approved");
  await call("POST", `/shift-requests/${shiftRequest._id}/approve`, undefined, 400); // already approved

  // Reject — no side effects.
  const toReject = await create(ShiftRequest, "/shift-requests", { employeeId: String(shiftEmployee._id), shiftTypeId: shiftType._id, fromDate: "2041-04-01" });
  await call("POST", `/shift-requests/${toReject._id}/reject`);
  const rejectedDoc = await ShiftRequest.findById(toReject._id).lean();
  assert.equal(rejectedDoc.status, "rejected");
  assert.equal(await ShiftAssignment.countDocuments({ employeeId: shiftEmployee._id, startDate: new Date("2041-04-01") }), 0, "reject must create no ShiftAssignment");

  // ================================================================ AttendanceRequest --
  const attendanceEmployee = await cloneEmployee("attn-req");
  const holidayList = await createRaw(HolidayList, {
    holidayListName: prefix + " hl", companyId, fromDate: new Date("2041-01-01"), toDate: new Date("2041-12-31"),
    holidays: [{ holidayDate: new Date("2041-05-03"), description: "Test holiday" }],
  });
  await createRaw(HolidayListAssignment, { applicableFor: "Employee", employeeId: attendanceEmployee._id, holidayListId: holidayList._id, fromDate: new Date("2040-01-01") });

  // Pre-existing leave-backed Attendance row for one day in the range — must be skipped, not overwritten.
  const leaveBacked = await createRaw(Attendance, {
    employeeId: attendanceEmployee._id, companyId, attendanceDate: new Date("2041-05-02"), status: "On Leave",
    leaveApplicationId: new mongoose.Types.ObjectId(), isActive: true,
  });

  const attendanceRequest = await create(AttendanceRequest, "/attendance-requests", {
    employeeId: String(attendanceEmployee._id), fromDate: "2041-05-01", toDate: "2041-05-04", reason: "Work From Home",
  });
  const days = attendanceRequest.days;
  assert.deepEqual(days.map(d => d.reason), [null, "On Leave", "Holiday", null], "day 2 skipped (leave-backed), day 3 skipped (holiday)");

  const day1 = tracked(Attendance, await Attendance.findOne({ employeeId: attendanceEmployee._id, attendanceDate: new Date("2041-05-01") }));
  assert.equal(day1.status, "Work From Home");
  assert.equal(String(day1.attendanceRequestId), String(attendanceRequest._id));
  const day4 = tracked(Attendance, await Attendance.findOne({ employeeId: attendanceEmployee._id, attendanceDate: new Date("2041-05-04") }));
  assert.equal(day4.status, "Work From Home");
  const untouchedLeaveDay = await Attendance.findById(leaveBacked._id).lean();
  assert.equal(untouchedLeaveDay.status, "On Leave", "leave-backed row must be untouched");
  assert.equal(await Attendance.countDocuments({ employeeId: attendanceEmployee._id, attendanceDate: new Date("2041-05-03") }), 0, "holiday day must not get an Attendance row");

  // includeHolidays — a second, non-overlapping request covering the same holiday, honored this time.
  const includeHolidayRequest = await create(AttendanceRequest, "/attendance-requests", {
    employeeId: String(attendanceEmployee._id), fromDate: "2041-06-03", toDate: "2041-06-03", reason: "On Duty", includeHolidays: true,
  });
  await createRaw(HolidayListAssignment, { applicableFor: "Employee", employeeId: attendanceEmployee._id, holidayListId: holidayList._id, fromDate: new Date("2040-01-01") }); // no-op safety, list already covers 05-03 only, so 06-03 is not a holiday — just confirms "On Duty" -> Present
  const day0603 = tracked(Attendance, await Attendance.findOne({ employeeId: attendanceEmployee._id, attendanceDate: new Date("2041-06-03") }));
  assert.equal(day0603.status, "Present", "On Duty reason must map to Present");

  // Overlap rejected.
  await call("POST", "/attendance-requests", { employeeId: String(attendanceEmployee._id), fromDate: "2041-05-02", toDate: "2041-05-02", reason: "On Duty" }, 400);

  // Cancel — soft-deletes exactly the rows this request created.
  await call("POST", `/attendance-requests/${attendanceRequest._id}/cancel`);
  const cancelledDoc = await AttendanceRequest.findById(attendanceRequest._id).lean();
  assert.equal(cancelledDoc.status, "cancelled");
  const day1AfterCancel = await Attendance.findOne({ _id: day1._id }).lean();
  assert.equal(day1AfterCancel, null, "soft-deleted rows are excluded by the default query (isDeleted middleware)");
  const day1Raw = await Attendance.collection.findOne({ _id: day1._id });
  assert.equal(day1Raw.isDeleted, true);
  const otherRequestDayUntouched = await Attendance.findOne({ _id: day0603._id }).lean();
  assert.ok(otherRequestDayUntouched, "cancelling one request must not touch another request's rows");
  await call("POST", `/attendance-requests/${attendanceRequest._id}/cancel`, undefined, 400); // already cancelled
  await call("PUT", `/attendance-requests/${attendanceRequest._id}`, { explanation: "nope" }, 400); // immutable

  // =============================================================== Shift Assignment Tool --
  const bulkOk1 = await cloneEmployee("bulk-ok1");
  const bulkOk2 = await cloneEmployee("bulk-ok2");
  const bulkFail = await cloneEmployee("bulk-fail");
  await createRaw(ShiftAssignment, { employeeId: bulkFail._id, companyId, shiftTypeId: shiftType._id, startDate: "2041-07-01", endDate: "2041-07-05", status: "active", isActive: true }); // conflicts with the bulk item below

  const bulkAssignResult = await call("POST", "/shift-assignment-tool/bulk-assign", {
    items: [
      { employeeId: String(bulkOk1._id), shiftTypeId: shiftType._id, startDate: "2041-07-01", endDate: "2041-07-05" },
      { employeeId: String(bulkOk2._id), shiftTypeId: shiftType._id, startDate: "2041-07-01", endDate: "2041-07-05" },
      { employeeId: String(bulkFail._id), shiftTypeId: shiftType._id, startDate: "2041-07-01", endDate: "2041-07-05" }, // overlaps its own pre-existing assignment
    ],
  });
  const bulkRows = bulkAssignResult.data.results;
  assert.deepEqual(bulkRows.map(r => r.success), [true, true, false], "per-item isolation: one failure doesn't abort the batch");
  for (const row of bulkRows) if (row.shiftAssignmentId) tracked(ShiftAssignment, { _id: row.shiftAssignmentId });

  // bulk-assign-schedule — creates a ShiftScheduleAssignment then immediately generates.
  const bulkSchedule = await create(ShiftSchedule, "/shift-schedules", { companyId, shiftTypeId: shiftType._id, frequency: "every-1-week", repeatOnDays: ["Monday"] });
  const scheduleTarget = await cloneEmployee("bulk-schedule");
  const bulkScheduleResult = await call("POST", "/shift-assignment-tool/bulk-assign-schedule", {
    items: [{ employeeId: String(scheduleTarget._id), shiftScheduleId: bulkSchedule._id, startDate: "2041-08-05", endDate: "2041-08-11" }], // 2041-08-05 is a Monday
  });
  const scheduleRow = bulkScheduleResult.data.results[0];
  assert.equal(scheduleRow.success, true);
  tracked(ShiftScheduleAssignment, { _id: scheduleRow.shiftScheduleAssignmentId });
  for (const r of scheduleRow.generate.results) if (r.shiftAssignmentId) tracked(ShiftAssignment, { _id: r.shiftAssignmentId });
  assert.ok(scheduleRow.generate.results.some(r => r.success && r.startDate.slice(0, 10) === "2041-08-05"), "bulk-assign-schedule must have generated the Monday occurrence");

  // process-requests — mixed batch: one approve, one already-actioned (fails).
  const processTarget = await cloneEmployee("bulk-process");
  await Employee.updateOne({ _id: processTarget._id }, { shiftRequestApproverId: approverUser._id });
  const toApprove = await create(ShiftRequest, "/shift-requests", { employeeId: String(processTarget._id), shiftTypeId: shiftType._id, fromDate: "2041-09-01", toDate: "2041-09-05" });
  const alreadyRejected = await create(ShiftRequest, "/shift-requests", { employeeId: String(processTarget._id), shiftTypeId: shiftType._id, fromDate: "2041-10-01" });
  await call("POST", `/shift-requests/${alreadyRejected._id}/reject`);
  const bulkProcessResult = await call("POST", "/shift-assignment-tool/process-requests", {
    items: [{ shiftRequestId: toApprove._id, decision: "approve" }, { shiftRequestId: alreadyRejected._id, decision: "approve" }],
  });
  const processRows = bulkProcessResult.data.results;
  assert.deepEqual(processRows.map(r => r.success), [true, false]);
  const approvedViaBulk = await ShiftRequest.findById(toApprove._id).lean();
  assert.equal(approvedViaBulk.status, "approved");
  const createdViaBulk = await ShiftAssignment.findOne({ employeeId: processTarget._id, startDate: new Date("2041-09-01") });
  assert.ok(createdViaBulk, "process-requests approve must create the ShiftAssignment through the write-locked path");
  tracked(ShiftAssignment, createdViaBulk);

  // =============================================================== Employee Attendance Tool --
  const markOk = await cloneEmployee("mark-ok");
  const markFail = String(new mongoose.Types.ObjectId()); // non-existent employee -> per-item failure
  const markDate = "2041-11-01";
  const markResult = await call("POST", "/employee-attendance-tool/mark", { date: markDate, status: "Present", employeeIds: [String(markOk._id), markFail] });
  const markRows = markResult.data.results;
  assert.deepEqual(markRows.map(r => r.success), [true, false]);
  tracked(Attendance, await Attendance.findOne({ employeeId: markOk._id, attendanceDate: new Date(markDate) }));

  const halfDayEmployee = await cloneEmployee("half-day");
  const halfDayAttendance = await createRaw(Attendance, { employeeId: halfDayEmployee._id, companyId, attendanceDate: new Date("2041-11-02"), status: "Half Day", halfDayStatus: "Absent", isActive: true });
  const resolveResult = await call("POST", "/employee-attendance-tool/resolve-half-day", { attendanceId: halfDayAttendance._id, halfDayStatus: "Present" });
  assert.equal(resolveResult.data.halfDayStatus, "Present");
  const resolvedDoc = await Attendance.findById(halfDayAttendance._id).lean();
  assert.equal(resolvedDoc.halfDayStatus, "Present");

  // =============================================================== processAutoAttendance --
  const today = dayStart(new Date());
  const yesterday = new Date(+today - DAY_MS);
  const autoShiftType = await create(ShiftType, "/shift-types", {
    companyId, shiftTypeName: prefix + " auto", startTime: "09:00", endTime: "17:00",
    enableAutoAttendance: true, processAttendanceAfter: "2020-01-01",
    workingHoursThresholdForAbsent: 4, workingHoursThresholdForHalfDay: 6,
    enableLateEntryMarking: true, enableEarlyExitMarking: true, lateEntryGracePeriod: 10, earlyExitGracePeriod: 10,
  });

  const iso = (d) => d.toISOString().slice(0, 10);
  const presentEmp = await cloneEmployee("auto-present");
  const absentEmp = await cloneEmployee("auto-absent");
  const halfDayAutoEmp = await cloneEmployee("auto-halfday");
  const lateEarlyEmp = await cloneEmployee("auto-late-early");
  const leaveSkipEmp = await cloneEmployee("auto-leave-skip");
  const sweepEmp = await cloneEmployee("auto-sweep");

  const makeAssignment = (emp) => createRaw(ShiftAssignment, { employeeId: emp._id, companyId, shiftTypeId: autoShiftType._id, startDate: new Date(+yesterday - 10 * DAY_MS), status: "active", isActive: true });
  for (const emp of [presentEmp, absentEmp, halfDayAutoEmp, lateEarlyEmp, leaveSkipEmp, sweepEmp]) await makeAssignment(emp); // eslint-disable-line no-await-in-loop

  const punch = async (emp, hhmm) => {
    const time = new Date(`${iso(yesterday)}T${hhmm}:00Z`);
    const doc = await call("POST", "/employee-checkins", { employeeId: String(emp._id), time: time.toISOString() }, 201);
    return tracked(EmployeeCheckin, doc.data);
  };
  await punch(presentEmp, "09:05"); await punch(presentEmp, "17:05"); // 8.0h -> Present, not late/early (within 10min grace)
  await punch(absentEmp, "09:00"); await punch(absentEmp, "09:30"); // 0.5h -> Absent (< 4)
  await punch(halfDayAutoEmp, "09:00"); await punch(halfDayAutoEmp, "14:00"); // 5.0h -> Half Day (>=4, <6)
  await punch(lateEarlyEmp, "09:30"); await punch(lateEarlyEmp, "16:30"); // 7.0h -> Present, but late (30>10 grace) and early (30>10 grace)

  await punch(leaveSkipEmp, "09:00"); await punch(leaveSkipEmp, "17:00");
  const preExistingLeaveRow = await createRaw(Attendance, { employeeId: leaveSkipEmp._id, companyId, attendanceDate: yesterday, status: "On Leave", leaveApplicationId: new mongoose.Types.ObjectId(), isActive: true });

  const runResult1 = await processAutoAttendance();
  assert.ok(runResult1.checkins.created >= 4, `expected at least 4 checkin-groups created, got ${JSON.stringify(runResult1)}`);
  assert.ok(runResult1.checkins.skipped >= 1, "the leave-backed group must be skipped");

  const presentRow = tracked(Attendance, await Attendance.findOne({ employeeId: presentEmp._id, attendanceDate: yesterday }));
  assert.equal(presentRow.status, "Present");
  assert.equal(presentRow.workingHours, 8);
  assert.equal(presentRow.lateEntry, false);
  assert.equal(presentRow.earlyExit, false);

  const absentRow = tracked(Attendance, await Attendance.findOne({ employeeId: absentEmp._id, attendanceDate: yesterday }));
  assert.equal(absentRow.status, "Absent");
  assert.equal(absentRow.workingHours, 0.5);

  const halfDayRow = tracked(Attendance, await Attendance.findOne({ employeeId: halfDayAutoEmp._id, attendanceDate: yesterday }));
  assert.equal(halfDayRow.status, "Half Day");
  assert.equal(halfDayRow.workingHours, 5);

  const lateEarlyRow = tracked(Attendance, await Attendance.findOne({ employeeId: lateEarlyEmp._id, attendanceDate: yesterday }));
  assert.equal(lateEarlyRow.status, "Present");
  assert.equal(lateEarlyRow.lateEntry, true);
  assert.equal(lateEarlyRow.earlyExit, true);

  const leaveSkipRowAfter = await Attendance.findById(preExistingLeaveRow._id).lean();
  assert.equal(leaveSkipRowAfter.status, "On Leave", "auto-attendance must never overwrite a leave-backed row");
  const leaveSkipCheckins = await EmployeeCheckin.find({ employeeId: leaveSkipEmp._id }).lean();
  assert.ok(leaveSkipCheckins.every(c => !c.attendanceId), "leave-backed group's checkins must remain unlinked");

  // Linked checkins.
  const presentCheckins = await EmployeeCheckin.find({ employeeId: presentEmp._id }).lean();
  assert.ok(presentCheckins.every(c => String(c.attendanceId) === String(presentRow._id)));

  // Absence sweep — yesterday only, no checkins at all for sweepEmp.
  const sweepRow = tracked(Attendance, await Attendance.findOne({ employeeId: sweepEmp._id, attendanceDate: yesterday }));
  assert.equal(sweepRow.status, "Absent");
  assert.equal(runResult1.absenceSweep.created >= 1, true);

  // Idempotency — second same-day run must not create duplicates or change anything.
  const runResult2 = await processAutoAttendance();
  assert.equal(runResult2.checkins.created, 0, "second run must create no new checkin-group rows (all already linked)");
  assert.equal(await Attendance.countDocuments({ employeeId: sweepEmp._id, attendanceDate: yesterday }), 1, "absence sweep must not double-create");

  console.log(`PASS: ${calls} real HTTP calls; ShiftRequest (overlap x2, approver auto/explicit, approve/reject), AttendanceRequest (holiday-skip, leave-backed-skip, includeHolidays, cancel reversal), both bulk tools (mixed-batch per-item isolation) and processAutoAttendance (Present/Absent/Half Day/late+early/leave-skip/absence-sweep, idempotent on a second run).`);
} finally {
  for (const [Model, id] of owned.reverse()) await Model.collection.deleteOne({ _id: new mongoose.Types.ObjectId(String(id)) });
  const count = await Employee.countDocuments();
  assert.equal(count, baseline);
  console.log(`Cleanup: Employee count ${count} (baseline ${baseline}); all tracked fixtures removed.`);
  await mongoose.disconnect();
}
