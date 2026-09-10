import Employee from "../models/Employee.js";
import HolidayList from "../models/HolidayList.js";
import HolidayListAssignment from "../models/HolidayListAssignment.js";

/**
 * ADR-024 (module complete — second fork). The foundation fork built
 * `HolidayList`/`HolidayListAssignment` CRUD but no query-side resolution
 * helper — `Leave Application` and `Compensatory Leave Request` both need
 * "what is this employee's effective Holiday List on date X", so this is
 * built once here and reused by both, rather than duplicated.
 *
 * Employee-then-company fallback, matching `HolidayListAssignment.
 * applicableFor` ("Employee" | "Company"): the most recent employee-specific
 * assignment with `fromDate <= date` wins; if none exists, fall back to the
 * most recent company-level assignment with `fromDate <= date`. Returns
 * `null` if neither resolves — callers decide what that means for them.
 */
export const resolveHolidayListForEmployee = async (employeeId, date = new Date()) => {
  const employee = await Employee.findById(employeeId).lean();
  if (!employee) return null;

  const employeeAssignment = await HolidayListAssignment.findOne({
    applicableFor: "Employee",
    employeeId,
    fromDate: { $lte: date },
  }).sort({ fromDate: -1 });

  const assignment = employeeAssignment || (await HolidayListAssignment.findOne({
    applicableFor: "Company",
    companyId: employee.companyId,
    fromDate: { $lte: date },
  }).sort({ fromDate: -1 }));

  if (!assignment) return null;
  return HolidayList.findById(assignment.holidayListId).lean();
};

const sameCalendarDay = (a, b) => {
  const da = new Date(a);
  const db = new Date(b);
  return da.getUTCFullYear() === db.getUTCFullYear()
    && da.getUTCMonth() === db.getUTCMonth()
    && da.getUTCDate() === db.getUTCDate();
};

/** Is `date` a holiday per the employee's resolved Holiday List? */
export const isHolidayForEmployee = async (employeeId, date) => {
  const holidayList = await resolveHolidayListForEmployee(employeeId, date);
  if (!holidayList) return false;
  return (holidayList.holidays || []).some((h) => sameCalendarDay(h.holidayDate, date));
};

/** Every day in [fromDate, toDate] (inclusive) that is a holiday, as Date objects. */
export const getHolidayDatesInRange = async (employeeId, fromDate, toDate) => {
  const holidayList = await resolveHolidayListForEmployee(employeeId, fromDate);
  if (!holidayList) return [];
  const from = new Date(fromDate);
  const to = new Date(toDate);
  return (holidayList.holidays || [])
    .map((h) => new Date(h.holidayDate))
    .filter((d) => d >= from && d <= to);
};

/**
 * Whether every day in [fromDate, toDate] (inclusive) is a holiday per the
 * employee's resolved Holiday List — Compensatory Leave Request's
 * `validate_holidays()`.
 */
export const isEntireRangeHolidays = async (employeeId, fromDate, toDate) => {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  const dayCount = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
  if (dayCount <= 0) return false;
  const holidayDates = await getHolidayDatesInRange(employeeId, from, to);
  return holidayDates.length >= dayCount;
};
