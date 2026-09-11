/**
 * ADR-027 (Payroll — Run). The real payment-days/LWP pipeline — the
 * mechanism that connects attendance, leave and mid-period joining/leaving
 * to a Salary Slip's actual pay. Reproduces the real spec
 * (`Salary Slip.md`, sections A/B/C/D) as closely as this project's scope
 * allows (no Timesheet, no Additional Salary, no Payroll Correction — all
 * permanently/forward-deferred per ADR-027).
 *
 * Split into a pure calculator (`calculatePaymentDays`, unit-tested with
 * hand-computed values, no DB) and a thin DB-fetching wrapper
 * (`computePaymentDays`) — the same "pure calc + DB wrapper" shape as
 * `leaveBalance.js`'s neighbors, and the only way this logic can be exercised
 * by `npm test` without a live Mongo connection (this project's convention:
 * pure-logic tests are wired into `npm test`; DB-backed tests, like
 * `leaveBalance.test.js`, are not).
 *
 * Confirmed from the real spec, not assumed:
 * - `totalWorkingDays` and `workingDays` are the SAME number (source: literally
 *   `self.total_working_days = working_days`) — both computed here from the
 *   already-clamped `[actualStartDate, actualEndDate]` range (a deliberate
 *   simplification of source, which computes `total_working_days` from the
 *   *nominal* `[startDate, endDate]` and only the payment-days numerator from
 *   the clamped range — recorded as a judgment call in DECISIONS.md ADR-027
 *   "As built"; the practical effect is identical for a full-period employee
 *   and only differs, by design, for a mid-period joiner/leaver, where this
 *   simpler model prorates the *denominator* too rather than just the
 *   numerator).
 * - `paymentDays` stays a fractional Float throughout — source never rounds
 *   it to a whole number, only individual currency amounts get `flt(...,
 *   precision)` treatment. Rounded here to 2 decimal places only to avoid
 *   floating-point noise (e.g. 0.30000000000000004), not as a business rule.
 */
import Employee from "../models/Employee.js";
import Attendance from "../models/Attendance.js";
import LeaveType from "../models/LeaveType.js";
import LeaveApplication from "../models/LeaveApplication.js";
import { getHolidayDatesInRange } from "./holidayResolution.js";

const DAY_MS = 86400000;

const toUtcMidnight = (date) => {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

const dateKey = (date) => toUtcMidnight(date).toISOString().slice(0, 10);

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

/** Every calendar day from `start` to `end` inclusive, as UTC-midnight Dates. */
const listDays = (start, end) => {
  const days = [];
  let cursor = toUtcMidnight(start);
  const last = toUtcMidnight(end);
  while (cursor <= last) {
    days.push(cursor);
    cursor = new Date(cursor.getTime() + DAY_MS);
  }
  return days;
};

const ZERO_RESULT = (actualStartDate, actualEndDate) => ({
  workingDays: 0,
  totalWorkingDays: 0,
  paymentDays: 0,
  lwpDays: 0,
  absentDays: 0,
  halfDayDays: 0,
  actualStartDate,
  actualEndDate,
});

/**
 * Pure calculator — no DB access. All employee/attendance/leave data is
 * handed in already resolved.
 *
 * @param {object} args
 * @param {Date|string} args.startDate — the Salary Slip's nominal start date
 * @param {Date|string} args.endDate — the Salary Slip's nominal end date
 * @param {Date|string|null} [args.dateOfJoining]
 * @param {Date|string|null} [args.relievingDate]
 * @param {Array<Date|string>} [args.holidayDates] — every holiday date in
 *   `[startDate, endDate]`; ignored when `settings.includeHolidaysInTotalWorkingDays`.
 * @param {Array<{attendanceDate:Date|string, status:string, halfDayStatus?:string, isLwp?:boolean}>} [args.attendanceRows]
 *   — used only when `settings.payrollBasedOn !== "Leave Application"`. `isLwp`
 *   is true when the row's `status === "On Leave"` and its Leave Type has
 *   `isLwp: true` — resolved by the caller (the DB wrapper below), not here.
 * @param {Array<{fromDate:Date|string, toDate:Date|string, halfDay?:boolean, halfDayDate?:Date|string|null}>} [args.leaveApplications]
 *   — used only when `settings.payrollBasedOn === "Leave Application"`;
 *   already filtered by the caller to approved applications whose Leave Type
 *   has `isLwp: true`.
 * @param {object} args.settings — `payrollBasedOn`, `considerUnmarkedAttendanceAs`,
 *   `includeHolidaysInTotalWorkingDays`, `dailyWagesFractionForHalfDay`.
 */
export const calculatePaymentDays = ({
  startDate,
  endDate,
  dateOfJoining = null,
  relievingDate = null,
  holidayDates = [],
  attendanceRows = [],
  leaveApplications = [],
  settings,
}) => {
  const nominalStart = toUtcMidnight(startDate);
  const nominalEnd = toUtcMidnight(endDate);

  // Section C (mid-period joining/leaving proration base). Joined after the
  // period ends, or already relieved before it starts: zero payable days —
  // the caller (createSalarySlip) is expected to reject these outright
  // (source's own `validate_dates`/`get_payment_days` throws), this is just
  // a safe, pure fallback if it's ever called without that guard.
  if (dateOfJoining && toUtcMidnight(dateOfJoining) > nominalEnd) return ZERO_RESULT(nominalStart, nominalEnd);
  if (relievingDate && toUtcMidnight(relievingDate) < nominalStart) return ZERO_RESULT(nominalStart, nominalEnd);

  let actualStartDate = nominalStart;
  if (dateOfJoining) {
    const joining = toUtcMidnight(dateOfJoining);
    if (joining > nominalStart && joining <= nominalEnd) actualStartDate = joining;
  }
  let actualEndDate = nominalEnd;
  if (relievingDate) {
    const relieving = toUtcMidnight(relievingDate);
    if (relieving >= nominalStart && relieving < nominalEnd) actualEndDate = relieving;
  }
  if (actualEndDate < actualStartDate) return ZERO_RESULT(actualStartDate, actualEndDate);

  const holidayKeys = settings.includeHolidaysInTotalWorkingDays
    ? new Set()
    : new Set((holidayDates || []).map((d) => dateKey(d)));

  const workingDayList = listDays(actualStartDate, actualEndDate).filter((d) => !holidayKeys.has(dateKey(d)));
  const workingDays = workingDayList.length;
  const totalWorkingDays = workingDays; // source: self.total_working_days = working_days (confirmed, section A.11)

  let lwpDays = 0;
  let absentDays = 0;
  let halfDayDays = 0;

  if (settings.payrollBasedOn === "Leave Application") {
    // Leave-Application-based path — no Attendance involved at all (matches
    // source: this branch never touches Attendance). `leaveApplications` is
    // already filtered to approved + LWP-leave-type by the caller.
    for (const app of leaveApplications || []) {
      const appFrom = toUtcMidnight(app.fromDate);
      const appTo = toUtcMidnight(app.toDate);
      const rangeStart = appFrom > actualStartDate ? appFrom : actualStartDate;
      const rangeEnd = appTo < actualEndDate ? appTo : actualEndDate;
      if (rangeEnd < rangeStart) continue;

      const isSingleDayApplication = appFrom.getTime() === appTo.getTime();
      const halfDayKey = app.halfDayDate ? dateKey(app.halfDayDate) : null;

      for (const day of listDays(rangeStart, rangeEnd)) {
        const key = dateKey(day);
        if (holidayKeys.has(key)) continue; // not part of the working set
        const isHalfDayOccurrence = app.halfDay && (isSingleDayApplication || key === halfDayKey);
        if (isHalfDayOccurrence) halfDayDays += 1;
        else lwpDays += 1;
      }
    }
  } else {
    // Attendance-based path (default).
    const markedKeys = new Set();
    for (const row of attendanceRows || []) {
      const key = dateKey(row.attendanceDate);
      if (key < dateKey(actualStartDate) || key > dateKey(actualEndDate)) continue;
      if (holidayKeys.has(key)) continue; // outside the working set entirely
      markedKeys.add(key);

      if (row.status === "Absent") {
        absentDays += 1;
      } else if (row.status === "On Leave" && row.isLwp) {
        lwpDays += 1;
      }
      // A row carrying a half-day status (Present or Absent) marks that day
      // as a half day for proration purposes, per the module brief.
      if (row.halfDayStatus) halfDayDays += 1;
    }

    if (settings.considerUnmarkedAttendanceAs === "Absent") {
      for (const day of workingDayList) {
        if (!markedKeys.has(dateKey(day))) absentDays += 1;
      }
    }
  }

  const fraction = settings.dailyWagesFractionForHalfDay ?? 0.5;
  const rawPaymentDays = workingDays - lwpDays - absentDays - halfDayDays * fraction;
  const paymentDays = round2(Math.max(0, rawPaymentDays));

  return { workingDays, totalWorkingDays, paymentDays, lwpDays, absentDays, halfDayDays, actualStartDate, actualEndDate };
};

/**
 * DB-fetching wrapper around `calculatePaymentDays` — resolves the employee,
 * holidays, and (depending on `settings.payrollBasedOn`) either Attendance
 * rows (+ their Leave Types, for the `isLwp` flag) or approved LWP Leave
 * Applications, then delegates to the pure calculator above.
 *
 * @param {object} args
 * @param {string|ObjectId} args.employeeId
 * @param {Date|string} args.startDate
 * @param {Date|string} args.endDate
 * @param {object} args.settings — a `PayrollSettings` document or plain object.
 */
export const computePaymentDays = async ({ employeeId, startDate, endDate, settings }) => {
  const employee = await Employee.findById(employeeId).lean();
  if (!employee) throw new Error("Employee not found");

  const nominalStart = toUtcMidnight(startDate);
  const nominalEnd = toUtcMidnight(endDate);

  const holidayDates = settings.includeHolidaysInTotalWorkingDays
    ? []
    : await getHolidayDatesInRange(employeeId, nominalStart, nominalEnd);

  let attendanceRows = [];
  let leaveApplications = [];

  if (settings.payrollBasedOn === "Leave Application") {
    const apps = await LeaveApplication.find({
      employeeId,
      status: "approved",
      fromDate: { $lte: nominalEnd },
      toDate: { $gte: nominalStart },
    }).lean();
    if (apps.length) {
      const leaveTypeIds = [...new Set(apps.map((a) => String(a.leaveTypeId)))];
      const leaveTypes = await LeaveType.find({ _id: { $in: leaveTypeIds }, isLwp: true }).select("_id").lean();
      const lwpTypeIds = new Set(leaveTypes.map((t) => String(t._id)));
      leaveApplications = apps.filter((a) => lwpTypeIds.has(String(a.leaveTypeId)));
    }
  } else {
    const rows = await Attendance.find({
      employeeId,
      attendanceDate: { $gte: nominalStart, $lte: nominalEnd },
    }).lean();
    const leaveTypeIds = [...new Set(rows.filter((r) => r.leaveTypeId).map((r) => String(r.leaveTypeId)))];
    const leaveTypes = leaveTypeIds.length ? await LeaveType.find({ _id: { $in: leaveTypeIds } }).select("_id isLwp").lean() : [];
    const lwpTypeIds = new Set(leaveTypes.filter((t) => t.isLwp).map((t) => String(t._id)));
    attendanceRows = rows.map((r) => ({
      attendanceDate: r.attendanceDate,
      status: r.status,
      halfDayStatus: r.halfDayStatus,
      isLwp: Boolean(r.leaveTypeId) && lwpTypeIds.has(String(r.leaveTypeId)),
    }));
  }

  return calculatePaymentDays({
    startDate,
    endDate,
    dateOfJoining: employee.dateOfJoining,
    relievingDate: employee.relievingDate,
    holidayDates,
    attendanceRows,
    leaveApplications,
    settings,
  });
};
