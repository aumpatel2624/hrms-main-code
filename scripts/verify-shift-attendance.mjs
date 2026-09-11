// Explicit opt-in integration walk: requires a running local server and seeded DB.
// Only records tracked below are physically removed in finally; real data is untouched.
import "../apps/server/models/softDelete.js";
import "../apps/server/models/auditPlugin.js";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import Employee from "../apps/server/models/Employee.js";
import Company from "../apps/server/models/Company.js";
import Department from "../apps/server/models/Department.js";
import User from "../apps/server/models/User.js";
import RoleMaster from "../apps/server/models/RoleMaster.js";
import DashboardWidget from "../apps/server/models/DashboardWidget.js";
import RoleDashboard from "../apps/server/models/RoleDashboard.js";
import Attendance from "../apps/server/models/Attendance.js";
import ShiftType from "../apps/server/models/ShiftType.js";
import ShiftLocation from "../apps/server/models/ShiftLocation.js";
import ShiftAssignment from "../apps/server/models/ShiftAssignment.js";
import ShiftSchedule from "../apps/server/models/ShiftSchedule.js";
import ShiftScheduleAssignment from "../apps/server/models/ShiftScheduleAssignment.js";
import EmployeeCheckin from "../apps/server/models/EmployeeCheckin.js";
import { alternatingFirstAndLast, alternatingEveryValidPair, strictFirstAndLast, strictEveryValidPair } from "../apps/server/utils/workingHours.js";

dotenv.config({ path: "apps/server/.env", quiet: true });
if (process.env.RUN_SHIFT_VERIFY !== "1") throw new Error("Set RUN_SHIFT_VERIFY=1 to run this local fixture walk");
const base = `http://127.0.0.1:${process.env.PORT || 7002}/api/v1`;
const prefix = `shift-verify-${Date.now()}`;
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
const search = async (path, auth = cookie) => (await call("POST", path + "/search", { page: 1, limit: 1000 }, 200, auth)).data[0].data;
await mongoose.connect(process.env.DATABASE, { autoIndex: false });
const baseline = await Employee.countDocuments();
let linkedEmployee;
let previousUserId;
const fixtureEmails = [];
const dashboardSnapshots = [];
try {
  cookie = await login(process.env.SEED_ADMIN_EMAIL || "admin@example.com", process.env.SEED_ADMIN_PASSWORD || "Admin@123");
  const employee = await Employee.findOne({ status: "Active" }).lean();
  const otherEmployee = await Employee.findOne({ status: "Active", _id: { $ne: employee._id }, companyId: employee.companyId }).lean();
  const companyId = String(employee.companyId);
  const employeeId = String(employee._id);
  const day = await create(ShiftType, "/shift-types", { companyId, shiftTypeName: prefix + " day", startTime: "09:00", endTime: "17:00" });
  await call("POST", "/shift-types", { companyId, shiftTypeName: prefix + " invalid", startTime: "09:00", endTime: "09:00" }, 400);
  await call("POST", "/shift-types", { companyId, shiftTypeName: prefix + " circular", startTime: "09:00", endTime: "08:00" }, 400);
  await call("POST", "/shift-types", { companyId, shiftTypeName: prefix + " auto", startTime: "09:00", endTime: "17:00", enableAutoAttendance: true }, 400);
  await call("GET", `/shift-types/${day._id}`);
  await call("PUT", `/shift-types/${day._id}`, { color: "Green" });
  assert.ok((await search("/shift-types")).some(row => row._id === day._id));
  const night = await create(ShiftType, "/shift-types", { companyId, shiftTypeName: prefix + " night", startTime: "22:00", endTime: "06:00" });
  const location = await create(ShiftLocation, "/shift-locations", { companyId, locationName: prefix, latitude: 0, longitude: 0, checkinRadius: 100 });
  await call("GET", `/shift-locations/${location._id}`);
  await call("PUT", `/shift-locations/${location._id}`, { checkinRadius: 120 });
  assert.ok((await search("/shift-locations")).some(row => row._id === location._id));
  const assignment = await create(ShiftAssignment, "/shift-assignments", { employeeId, shiftTypeId: day._id, shiftLocationId: location._id, startDate: "2040-09-10", endDate: "2040-09-10" });
  await call("POST", "/shift-assignments", { employeeId, shiftTypeId: day._id, startDate: "2040-09-10", endDate: "2040-09-11" }, 400);
  const inactive = await create(ShiftAssignment, "/shift-assignments", { employeeId, shiftTypeId: day._id, startDate: "2040-09-10", endDate: "2040-09-11", status: "inactive" });
  await call("PUT", `/shift-assignments/${inactive._id}`, { status: "active" }, 400);
  await create(ShiftAssignment, "/shift-assignments", { employeeId, shiftTypeId: night._id, startDate: "2040-09-12", endDate: "2040-09-12" });
  await call("DELETE", `/shift-types/${day._id}`, undefined, 409);
  const inside = await create(EmployeeCheckin, "/employee-checkins", { employeeId, time: "2040-09-10T09:00:00Z", logType: "IN", latitude: 0, longitude: 0.0001 });
  assert.equal(inside.shiftId, day._id); assert.equal(inside.offshift, false);
  await call("POST", "/employee-checkins", { employeeId, time: "2040-09-10T10:00:00Z", latitude: 1, longitude: 1 }, 400);
  await call("POST", "/employee-checkins", { employeeId, time: "2040-09-10T09:00:00Z", logType: "IN" }, 400);
  const noCoordinates = await create(EmployeeCheckin, "/employee-checkins", { employeeId, time: "2040-09-10T12:00:00Z", logType: "OUT" });
  const reentry = await create(EmployeeCheckin, "/employee-checkins", { employeeId, time: "2040-09-10T13:00:00Z", logType: "IN" });
  const exit = await create(EmployeeCheckin, "/employee-checkins", { employeeId, time: "2040-09-10T17:30:00Z", logType: "OUT" });
  const actualPunches = [inside, noCoordinates, reentry, exit];
  assert.deepEqual([alternatingFirstAndLast, alternatingEveryValidPair, strictFirstAndLast, strictEveryValidPair].map(fn => fn(actualPunches)), [8.5, 7.5, 8.5, 7.5]);
  const overnight = await create(EmployeeCheckin, "/employee-checkins", { employeeId, time: "2040-09-13T00:10:00Z" });
  assert.equal(overnight.shiftId, night._id);
  const offshift = await create(EmployeeCheckin, "/employee-checkins", { employeeId, time: "2040-09-13T12:00:00Z" });
  assert.equal(offshift.offshift, true); assert.equal(offshift.shiftId, null);
  await call("POST", "/attendances", { employeeId, attendanceDate: "2040-09-10", status: "Present" }, 201);
  const attendance = tracked(Attendance, await Attendance.findOne({ employeeId, attendanceDate: new Date("2040-09-10") }));
  await EmployeeCheckin.updateOne({ _id: inside._id }, { attendanceId: attendance._id });
  await call("PUT", `/employee-checkins/${inside._id}`, { time: "2040-09-10T09:01:00Z" }, 400);
  await call("PUT", `/employee-checkins/${inside._id}`, { attendanceId: null }, 400);
  assert.ok((await search("/attendances")).find(row => row._id === String(attendance._id)).employeeName);
  const schedule = await create(ShiftSchedule, "/shift-schedules", { companyId, shiftTypeId: day._id, frequency: "every-1-week", repeatOnDays: ["Monday", "Wednesday", "Friday", "Monday"] });
  assert.equal(schedule.repeatOnDays.length, 3);
  await call("GET", `/shift-schedules/${schedule._id}`);
  await call("PUT", `/shift-schedules/${schedule._id}`, { isActive: true });
  assert.ok((await search("/shift-schedules")).some(row => row._id === schedule._id));
  const recurring = await create(ShiftScheduleAssignment, "/shift-schedule-assignments", { employeeId, shiftScheduleId: schedule._id, createShiftsAfter: "2040-10-01" });
  // 2040-10-01 is Monday: expected Mon/Wed/Fri => 1st/3rd/5th.
  const generated = (await call("POST", `/shift-schedule-assignments/${recurring._id}/generate`, { endDate: "2040-10-07" })).data;
  for (const row of generated.results) if (row.shiftAssignmentId) tracked(ShiftAssignment, { _id: row.shiftAssignmentId });
  assert.deepEqual(generated.results.map(row => [row.startDate.slice(0, 10), row.endDate.slice(0, 10), row.success]), [["2040-10-01", "2040-10-01", true], ["2040-10-03", "2040-10-03", true], ["2040-10-05", "2040-10-05", true]]);
  assert.equal(generated.createShiftsAfter.slice(0, 10), "2040-10-06");
  await call("PUT", `/shift-schedule-assignments/${recurring._id}`, { createShiftsAfter: "2040-10-01" }, 400);
  const again = (await call("POST", `/shift-schedule-assignments/${recurring._id}/generate`, { endDate: "2040-10-07" })).data;
  assert.equal(again.results.length, 0);
  // Mixed-range isolation: Monday succeeds, Wednesday overlaps, Friday still succeeds.
  await create(ShiftAssignment, "/shift-assignments", { employeeId, shiftTypeId: day._id, startDate: "2040-10-10", endDate: "2040-10-10" });
  const mixed = (await call("POST", `/shift-schedule-assignments/${recurring._id}/generate`, { endDate: "2040-10-14" })).data;
  for (const row of mixed.results) if (row.shiftAssignmentId) tracked(ShiftAssignment, { _id: row.shiftAssignmentId });
  assert.deepEqual(mixed.results.map(row => row.success), [true, false, true]);
  assert.equal(mixed.createShiftsAfter.slice(0, 10), "2040-10-13");
  await call("POST", `/shift-schedule-assignments/${recurring._id}/generate`, { endDate: "2040-10-01" }, 400);
  const concurrent = await Promise.all([1, 2].map(() => fetch(base + "/shift-assignments", { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ employeeId, shiftTypeId: day._id, startDate: "2040-11-01", endDate: "2040-11-01" }) })));
  for (const response of concurrent) if (response.status === 201) tracked(ShiftAssignment, (await response.json()).data);
  assert.deepEqual(concurrent.map(response => response.status).sort(), [201, 400]); calls += 2;
  await call("POST", "/employee-checkins", { employeeId, time: "2040-09-13T00:10:00Z" }, 400);
  for (const source of ["shift-types", "shift-locations", "shift-assignments", "shift-schedules", "shift-schedule-assignments", "employee-checkins", "attendances"]) {
    for (const chartType of ["stat", "bar", "line"]) {
      const data = (await call("POST", "/dashboard-widgets/preview", { source, metric: { type: "count" }, chartType, groupBy: chartType === "bar" ? "companyId" : null, dateField: chartType === "line" ? "createdAt" : null, dateRange: "all", filters: [] })).data;
      assert.ok(data.rows.length > 0);
    }
  }
  // Real non-admin sessions: HR has no Employee link; Department resolves the company.
  const company2 = await createRaw(Company, { companyName: prefix + " company2", companyCode: prefix });
  const department2 = await createRaw(Department, { departmentName: prefix + " department2", companyId: company2._id });
  const employee2 = await createRaw(Employee, { ...Object.fromEntries(Object.entries(employee).filter(([k]) => !["_id", "__v", "createdAt", "updatedAt"].includes(k))), employeeName: prefix, employeeCode: prefix, companyId: company2._id, departmentId: department2._id, userId: null });
  const foreignAttendance = await createRaw(Attendance, { employeeId: employee2._id, companyId: company2._id, attendanceDate: "2040-09-10", status: "Present" });
  const makeUser = async (roleName, departmentId) => {
    const role = await RoleMaster.findOne({ roleName });
    const id = () => new mongoose.Types.ObjectId();
    const email = `${prefix}-${roleName.replaceAll(" ", "")}@example.test`;
    fixtureEmails.push(email);
    return createRaw(User, { userName: prefix, email, password: await bcrypt.hash("Verify@12345", 10), departmentId, roleId: role._id, countryId: id(), stateId: id(), cityId: id(), address: "Fixture" });
  };
  const hr = await makeUser("HR User", employee.departmentId);
  const hrCookie = await login(hr.email, "Verify@12345");
  const hrRows = await search("/attendances", hrCookie);
  assert.ok(hrRows.some(row => row._id === String(attendance._id)));
  assert.ok(!hrRows.some(row => row._id === String(foreignAttendance._id)));
  for (const method of ["GET", "PUT", "DELETE"]) await call(method, `/attendances/${foreignAttendance._id}`, method === "PUT" ? { status: "Absent" } : undefined, 404, hrCookie);
  await call("POST", "/attendances", { employeeId: employee2._id, attendanceDate: "2040-09-11", status: "Present" }, 404, hrCookie);
  const self = await makeUser("Employee", employee.departmentId);
  linkedEmployee = employee._id; previousUserId = employee.userId;
  await Employee.updateOne({ _id: employee._id }, { userId: self._id });
  const selfCookie = await login(self.email, "Verify@12345");
  const selfRows = await search("/shift-assignments", selfCookie);
  assert.ok(selfRows.some(row => row._id === assignment._id));
  assert.ok(selfRows.every(row => row.employeeId === employeeId));
  await call("POST", "/employee-checkins", { employeeId: String(otherEmployee._id), time: "2040-09-14T09:00:00Z" }, 400, selfCookie);
  const selfCheck = (await call("POST", "/employee-checkins", { employeeId, time: "2040-09-14T09:00:00Z" }, 201, selfCookie)).data;
  tracked(EmployeeCheckin, selfCheck);
  assert.ok((await search("/employee-checkins", selfCookie)).every(row => row.employeeId === employeeId));
  await call("POST", "/shift-locations/search", {}, 403, selfCookie);
  const foreignShift = await createRaw(ShiftType, { companyId: company2._id, shiftTypeName: prefix + " foreign", startTime: "09:00", endTime: "17:00" });
  await call("POST", "/shift-assignments", { employeeId, shiftTypeId: foreignShift._id, startDate: "2040-12-01" }, 400, hrCookie);
  const foreignAssignment = await create(ShiftAssignment, "/shift-assignments", { employeeId: String(otherEmployee._id), shiftTypeId: day._id, startDate: "2040-12-01" });
  await call("GET", `/shift-assignments/${foreignAssignment._id}`, undefined, 404, selfCookie);
  await call("GET", "/attendances", undefined, 403, selfCookie);
  const dropdown = (await call("GET", "/attendances", undefined, 200, hrCookie)).data;
  assert.ok(!dropdown.some(row => row._id === String(foreignAttendance._id)));
  const pin = async (user, widget) => {
    const existing = await RoleDashboard.findOne({ roleId: user.roleId }).lean();
    if (existing) { dashboardSnapshots.push(existing); await RoleDashboard.updateOne({ _id: existing._id }, { $push: { widgets: { widgetId: widget._id, size: "md", sequence: 99 } } }); }
    else await createRaw(RoleDashboard, { roleId: user.roleId, widgets: [{ widgetId: widget._id, size: "md", sequence: 0 }] });
  };
  const hrWidget = await createRaw(DashboardWidget, { title: prefix + " hr", source: "attendances", metric: { type: "count" }, chartType: "bar", groupBy: "companyId", dateRange: "all" });
  await pin(hr, hrWidget);
  const hrChart = (await call("POST", `/dashboard-widgets/${hrWidget._id}/run`, {}, 200, hrCookie)).data;
  assert.ok(!JSON.stringify(hrChart).includes(prefix + " company2"));
  const selfWidget = await createRaw(DashboardWidget, { title: prefix + " self", source: "shift-assignments", metric: { type: "count" }, chartType: "stat", dateRange: "all" });
  await pin(self, selfWidget);
  const selfChart = (await call("POST", `/dashboard-widgets/${selfWidget._id}/run`, {}, 200, selfCookie)).data;
  const ownAssignments = await ShiftAssignment.countDocuments({ employeeId });
  assert.equal(selfChart.rows[0].value, ownAssignments);
  // CRUD deletion paths on unreferenced copies, plus soft-delete visibility.
  for (const [Model, path, data] of [[ShiftType, "/shift-types", { companyId, shiftTypeName: prefix + " delete", startTime: "10:00", endTime: "18:00" }], [ShiftLocation, "/shift-locations", { companyId, locationName: prefix + " delete" }], [ShiftSchedule, "/shift-schedules", { companyId, shiftTypeId: day._id, repeatOnDays: ["Sunday"] }]]) {
    const doc = await create(Model, path, data);
    await call("DELETE", `${path}/${doc._id}`);
    await call("GET", `${path}/${doc._id}`, undefined, 404);
  }
  console.log(`PASS: ${calls} real HTTP calls; CRUD, overlap/inactive, day/overnight/offshift, geofence, duplicate/linked lock, schedule dates/watermark, HR company confinement and Employee own scope; four calculations from API punches = 8.5/7.5/8.5/7.5.`);
} finally {
  for (const snapshot of dashboardSnapshots) await RoleDashboard.collection.replaceOne({ _id: snapshot._id }, snapshot);
  if (linkedEmployee) await Employee.updateOne({ _id: linkedEmployee }, { userId: previousUserId || null });
  // These are explicitly disposable records; remove in reverse dependency order, including soft-deleted copies.
  for (const [Model, id] of owned.reverse()) await Model.collection.deleteOne({ _id: new mongoose.Types.ObjectId(String(id)) });
  await mongoose.connection.collection("loginattempts").deleteMany({ email: { $in: fixtureEmails } });
  const count = await Employee.countDocuments();
  assert.equal(count, baseline);
  console.log(`Cleanup: Employee count ${count} (baseline ${baseline}); all tracked fixtures removed.`);
  await mongoose.disconnect();
}
