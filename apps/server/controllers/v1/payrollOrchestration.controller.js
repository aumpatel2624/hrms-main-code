import { getReferencingCounts, formatReferenceMessage } from "../../utils/referenceHelper.js";
import { runListQuery } from "../../utils/listQuery.js";
import { attendanceScope } from "../../utils/attendanceScope.js";
import { getCurrentSalaryStructureAssignment } from "../../utils/payrollAssignment.js";
import { getHolidayDatesInRange } from "../../utils/holidayResolution.js";
import { generateWithholdingCycles } from "../../utils/salaryWithholdingCycles.js";
import { isSalaryWithheld } from "../../utils/payrollWithholding.js";
import { createSalarySlipForEmployee, submitSalarySlipById, cancelSalarySlipById } from "./payrollRun.controller.js";
import PayrollEntry from "../../models/PayrollEntry.js";
import SalaryWithholding from "../../models/SalaryWithholding.js";
import PayrollPeriod from "../../models/PayrollPeriod.js";
import SalarySlip from "../../models/SalarySlip.js";
import SalaryStructure from "../../models/SalaryStructure.js";
import Employee from "../../models/Employee.js";
import Attendance from "../../models/Attendance.js";
import Company from "../../models/Company.js";

const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const handle = fn => async (req, res) => {
  try { const data = await fn(req); res.status(req.method === "POST" && !req.params.id && !req.path.endsWith("search") ? 201 : 200).json({ isOk: true, data }); }
  catch (error) {
    const status = error.status || (["ValidationError", "CastError"].includes(error.name) || error.code === 11000 ? 400 : error.name === "VersionError" ? 409 : 500);
    if (status === 500) console.error("Payroll orchestration failed", error);
    res.status(status).json({ isOk: false, status, message: status === 500 ? "Internal server error" : error.message });
  }
};
const getDoc = async (Model, req) => {
  const doc = await Model.findOne({ $and: [{ _id: req.params.id }, await attendanceScope(req, false)] });
  if (!doc) fail(404, `${Model.modelName} not found`);
  return doc;
};
const dayKey = date => new Date(date).toISOString().slice(0, 10);
export const resolveEligiblePayrollEmployees = async ({ companyId, payrollFrequency, startDate, endDate, validateAttendance = false }) => {
  const employees = await Employee.find({ companyId, status: { $ne: "Inactive" }, dateOfJoining: { $lte: endDate, $ne: null },
    $or: [{ relievingDate: null }, { relievingDate: { $gte: startDate } }] }).lean();
  const existing = new Set((await SalarySlip.find({ companyId, startDate, endDate }).select("employeeId").lean()).map(row => String(row.employeeId)));
  const rows = [];
  for (const employee of employees) {
    if (existing.has(String(employee._id))) continue;
    const assignment = await getCurrentSalaryStructureAssignment(employee._id, endDate);
    if (!assignment) continue;
    const structure = await SalaryStructure.findById(assignment.salaryStructureId);
    if (structure?.payrollFrequency !== payrollFrequency) continue;
    if (validateAttendance) {
      const start = new Date(Math.max(new Date(startDate), new Date(employee.dateOfJoining)));
      const end = new Date(Math.min(new Date(endDate), employee.relievingDate ? new Date(employee.relievingDate) : new Date(endDate)));
      const attendance = await Attendance.find({ employeeId: employee._id, isActive: true, attendanceDate: { $gte: start, $lte: end } }).lean();
      const holidays = await getHolidayDatesInRange(employee._id, start, end);
      const marked = new Set([...attendance.map(row => dayKey(row.attendanceDate)), ...holidays.map(dayKey)]);
      let unmarked = false;
      for (let day = +start; day <= +end; day += 86400000) if (!marked.has(dayKey(day))) { unmarked = true; break; }
      if (unmarked) continue;
    }
    rows.push({ employeeId: employee._id, employeeName: employee.employeeName, departmentId: employee.departmentId,
      designationId: employee.designationId, isSalaryWithheld: await isSalaryWithheld(employee._id, startDate, endDate), status: "pending" });
  }
  return rows;
};
export const createPayrollEntry = handle(async req => {
  const { companyId, payrollFrequency, validateAttendance = false, payrollPeriodId } = req.body;
  const scope = await attendanceScope(req, false);
  if (!await Company.exists({ $and: [{ _id: companyId }, scope.companyId ? { _id: scope.companyId } : {}] })) fail(404, "Company not found");
  let { startDate, endDate } = req.body;
  if (payrollPeriodId) {
    const period = await PayrollPeriod.findOne({ _id: payrollPeriodId, companyId });
    if (!period) fail(404, "Payroll Period not found for this company");
    if (startDate || endDate) fail(400, "Supply dates or Payroll Period, not both");
    ({ startDate, endDate } = period);
  }
  startDate = new Date(startDate); endDate = new Date(endDate);
  if (!Number.isFinite(+startDate) || !Number.isFinite(+endDate) || startDate > endDate) fail(400, "A valid Start Date and End Date are required");
  const employeeDetails = await resolveEligiblePayrollEmployees({ companyId, payrollFrequency, validateAttendance, startDate, endDate });
  return PayrollEntry.create({ companyId, payrollFrequency, validateAttendance, startDate, endDate, employeeDetails });
});
export const getPayrollEntry = handle(async req => {
  const doc = await getDoc(PayrollEntry, req);
  for (const row of doc.employeeDetails) row.isSalaryWithheld = doc.status !== "cancelled" && await isSalaryWithheld(row.employeeId, doc.startDate, doc.endDate);
  return doc;
});
// Serializes actions on an entry in this synchronous single-server deployment.
const running = new Set();
const bulk = action => handle(async req => {
  if (running.has(req.params.id)) fail(409, "This Payroll Entry is already being processed");
  running.add(req.params.id);
  try {
    const doc = await getDoc(PayrollEntry, req);
    if (doc.status === "cancelled" || (action !== "cancel" && doc.status !== "draft")) fail(400, "This Payroll Entry cannot be processed in its current state");
    if (action === "submit" && doc.employeeDetails.some(row => row.status === "pending")) fail(400, "Create slips before submitting this entry");
    const summary = { created: 0, submitted: 0, cancelled: 0, failed: 0, results: [] };
    for (const row of doc.employeeDetails) {
      if (action === "create" && row.status !== "pending") continue;
      if (action === "submit" && row.status !== "created") continue;
      if (action === "cancel" && !row.salarySlipId) continue;
      try {
        if (action === "create") {
          const slip = await createSalarySlipForEmployee({ employeeId: row.employeeId, startDate: doc.startDate, endDate: doc.endDate });
          row.salarySlipId = slip._id; row.status = "created"; summary.created++;
        } else if (action === "submit") {
          await submitSalarySlipById(row.salarySlipId, { companyId: doc.companyId });
          row.status = "submitted"; summary.submitted++;
        } else {
          const slip = await SalarySlip.findById(row.salarySlipId);
          if (slip?.status !== "cancelled") await cancelSalarySlipById(row.salarySlipId, { companyId: doc.companyId });
          summary.cancelled++;
        }
        if (action !== "cancel") row.failureReason = "";
      } catch (error) {
        row.status = "failed";
        row.failureReason = error.status || error.name === "ValidationError" || error.code === 11000 ? error.message : "Unable to process salary slip";
        summary.failed++;
      }
      row.isSalaryWithheld = action !== "cancel" && await isSalaryWithheld(row.employeeId, doc.startDate, doc.endDate);
      await doc.save(); // Persist each outcome before attempting the next employee.
      summary.results.push(row.toObject());
    }
    if (action === "submit") doc.status = "submitted";
    if (action === "cancel" && summary.failed === 0) doc.status = "cancelled";
    await doc.save();
    return summary;
  } finally { running.delete(req.params.id); }
});
export const createPayrollSlips = bulk("create");
export const submitPayrollSlips = bulk("submit");
export const cancelPayrollEntry = bulk("cancel");

export const createSalaryWithholding = handle(async req => {
  const { employeeId, fromDate, numberOfWithholdingCycles } = req.body;
  const employee = await Employee.findOne({ $and: [{ _id: employeeId }, await attendanceScope(req, false)] });
  if (!employee) fail(404, "Employee not found");
  if (employee.status === "Inactive") fail(400, "Cannot withhold salary for an Inactive Employee");
  const assignment = await getCurrentSalaryStructureAssignment(employeeId, fromDate);
  const structure = assignment && await SalaryStructure.findById(assignment.salaryStructureId);
  if (!structure) fail(400, "No current Salary Structure Assignment for this employee");
  const payrollFrequency = structure.payrollFrequency;
  const cycles = generateWithholdingCycles({ fromDate, numberOfWithholdingCycles, payrollFrequency });
  if (await SalaryWithholding.exists({ employeeId, status: { $ne: "cancelled" }, "cycles.fromDate": { $lte: cycles.at(-1).toDate }, "cycles.toDate": { $gte: cycles[0].fromDate } })) fail(400, "Salary Withholding already exists for this employee and period");
  return SalaryWithholding.create({ employeeId, companyId: employee.companyId, fromDate, numberOfWithholdingCycles, payrollFrequency, cycles });
});
export const getSalaryWithholding = handle(req => getDoc(SalaryWithholding, req));
const release = all => handle(async req => {
  const doc = await getDoc(SalaryWithholding, req);
  if (["cancelled", "draft"].includes(doc.status)) fail(400, "Only an active withholding can be released");
  const cycles = all ? doc.cycles : [doc.cycles.id(req.body.cycleId)];
  if (!cycles[0] && !all) fail(404, "Withholding cycle not found");
  for (const cycle of cycles) if (!cycle.isReleased) {
    cycle.isReleased = true; cycle.releasedAt = new Date(); cycle.releaseReference = req.body.releaseReference;
  }
  await doc.save();
  return doc;
});
export const releaseWithholdingCycle = release(false);
export const releaseAllWithholdingCycles = release(true);
export const cancelSalaryWithholding = handle(async req => {
  const doc = await getDoc(SalaryWithholding, req); doc.status = "cancelled"; await doc.save(); return doc;
});
export const ENTRY_FILTERS = { companyId: "objectId", startDate: "date", endDate: "date", payrollFrequency: "string", status: "string", createdAt: "date" };
export const WITHHOLDING_FILTERS = { employeeId: "objectId", companyId: "objectId", fromDate: "date", payrollFrequency: "string", numberOfWithholdingCycles: "number", status: "string", createdAt: "date" };
const search = (Model, filterable) => handle(async req => runListQuery(Model, req.body, {
  scopeFilter: await attendanceScope(req, false), searchFields: [], filterable,
  stages: [{ $lookup: { from: Model === PayrollEntry ? "companies" : "employees", localField: Model === PayrollEntry ? "companyId" : "employeeId", foreignField: "_id", as: "labelRow" } },
    { $addFields: { recordLabel: { $arrayElemAt: [Model === PayrollEntry ? "$labelRow.companyName" : "$labelRow.employeeName", 0] } } }, { $project: { labelRow: 0 } }],
}));
export const searchPayrollEntries = search(PayrollEntry, ENTRY_FILTERS);
export const searchSalaryWithholdings = search(SalaryWithholding, WITHHOLDING_FILTERS);
// Snapshots are action-only: no arbitrary PUT or DELETE can bypass their lifecycle.

export const updateSalaryWithholding = handle(req => getDoc(SalaryWithholding, req));

const remove = Model => async (req, res) => {
  try {
    const doc = await getDoc(Model, req);
    if (doc.status !== "cancelled") return res.status(400).json({ isOk: false, status: 400, message: "Cancel this record before deleting it" });
    const references = await getReferencingCounts(Model.modelName, doc._id);
    if (references.totalReferences) return res.status(409).json({ isOk: false, status: 409, message: "This record is referenced", totalReferences: references.totalReferences, references: references.details, formattedMessage: formatReferenceMessage(references.details) });
    await Model.findByIdAndUpdate(doc._id, { isDeleted: true });
    return res.json({ isOk: true, status: 200 });
  } catch (error) { return res.status(error.status || 500).json({ isOk: false, message: error.status ? error.message : "Unable to delete record" }); }
};
export const deletePayrollEntry = remove(PayrollEntry);
export const deleteSalaryWithholding = remove(SalaryWithholding);
