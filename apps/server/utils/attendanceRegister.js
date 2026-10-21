import { alternatingEveryValidPair, strictEveryValidPair } from "./workingHours.js";
import { zonedDateKey, zonedWallTime } from "./zonedTime.js";

/**
 * ADR-042 — the Employee Checkin register's pure calculation core: one row
 * per calendar day of a month for one employee, built from records the
 * controller has already loaded (Attendance, Shift Assignment + Shift Type,
 * Holiday List, approved Leave Application, Employee Checkin). Nothing is
 * stored. A column with no source record stays null; the one exception is an
 * unmarked past working day, which takes PayrollSettings'
 * considerUnmarkedAttendanceAs, as payroll counts it. Status codes are
 * REGISTER_CODES in @demo-panel/shared/attendance.
 */

const DAY_MS = 86400000;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ATTENDANCE_CODE = { Present: "PR", Absent: "AB", "Half Day": "HD", "Work From Home": "WFH" };
// Half Day's halfDayStatus is the status of the *other* half (Employee Attendance Tool).
const OTHER_HALF_CODE = { Present: "PR", Absent: "AB" };

// Date-only HR fields are stored at UTC midnight, like the leave utilities.
const dayKey = (value) => new Date(value).toISOString().slice(0, 10);
const addDays = (key, days) => new Date(Date.parse(`${key}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
const clockMinutes = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
const minutesBetween = (from, to) => Math.max(0, Math.round((new Date(to) - new Date(from)) / 60000));
const leaveCode = (leaveType) => (leaveType?.isLwp ? "LWP" : "LV");

/** Every date of a "YYYY-MM" month, as "YYYY-MM-DD". */
export const monthDateKeys = (month) => {
  const keys = [];
  for (let key = `${month}-01`; key.startsWith(month); key = addDays(key, 1)) keys.push(key);
  return keys;
};

/** The Shift Type in force on a date — latest-starting active assignment wins, as in resolveShiftOccurrence. */
export const shiftOn = (assignments, key) => assignments
  .filter((row) => row.status === "active" && row.isActive !== false && row.shiftTypeId?.startTime
    && dayKey(row.startDate) <= key && (!row.endDate || dayKey(row.endDate) >= key))
  .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))[0]?.shiftTypeId ?? null;

/**
 * Holidays on a date: the employee's own Holiday List Assignment, else the
 * company's (holidayResolution.js's order), else the shift's own list.
 */
const holidaysOn = ({ employee = [], company = [] }, shift, listsById, key) => {
  const latest = (rows) => rows.filter((row) => dayKey(row.fromDate) <= key)
    .sort((a, b) => new Date(b.fromDate) - new Date(a.fromDate))[0];
  const listId = (latest(employee) ?? latest(company))?.holidayListId ?? shift?.holidayListId;
  const list = listId ? listsById.get(String(listId)) : null;
  return (list?.holidays ?? []).filter((holiday) => !holiday.isDeleted && dayKey(holiday.holidayDate) === key);
};

/**
 * First half / second half / portion for one day. A marked Attendance row
 * wins (someone may work a holiday), then approved leave — except on a
 * holiday its leave type does not count, which leave approval skips too —
 * then the holiday list. Anything else takes `unmarked`: the payroll
 * setting's code on a past working day, else blank.
 */
export const dayStatus = (record, leave, holidays, key, unmarked = null) => {
  if (record?.status === "On Leave") {
    const leaveType = record.leaveTypeId ?? leave?.leaveTypeId;
    return { firstHalf: leaveCode(leaveType), secondHalf: null, portion: 1, note: leaveType?.leaveTypeName ?? null };
  }
  if (record?.status === "Half Day") {
    return {
      firstHalf: "HD",
      secondHalf: record.leaveTypeId ? leaveCode(record.leaveTypeId) : OTHER_HALF_CODE[record.halfDayStatus] ?? null,
      portion: 0.5,
      note: record.leaveTypeId?.leaveTypeName ?? null,
    };
  }
  if (record) return { firstHalf: ATTENDANCE_CODE[record.status] ?? null, secondHalf: null, portion: 1, note: null };
  if (leave && (leave.leaveTypeId?.includeHoliday || !holidays.length)) {
    const halfDay = leave.halfDay && leave.halfDayDate && dayKey(leave.halfDayDate) === key;
    return { firstHalf: leaveCode(leave.leaveTypeId), secondHalf: null, portion: halfDay ? 0.5 : 1, note: leave.leaveTypeId?.leaveTypeName ?? null };
  }
  if (holidays.length) {
    const holiday = holidays.find((row) => !row.weeklyOff);
    return { firstHalf: holiday ? "HO" : "WO", secondHalf: null, portion: 1, note: (holiday ?? holidays[0]).description ?? null };
  }
  return { firstHalf: unmarked, secondHalf: null, portion: unmarked ? 1 : null, note: null };
};

/**
 * A shift's nominal start/end on a date and its check-in window (the buffers
 * either side), in the register's time zone — shiftOccurrence.js's
 * shiftWindow, read on the wall clock instead of UTC.
 */
const shiftTimes = (key, shift, timeZone) => {
  const startMinutes = clockMinutes(shift.startTime);
  const endMinutes = clockMinutes(shift.endTime) + (shift.endTime < shift.startTime ? 1440 : 0);
  return {
    start: zonedWallTime(key, startMinutes, timeZone),
    end: zonedWallTime(key, endMinutes, timeZone),
    bufferedStart: zonedWallTime(key, startMinutes - (shift.beginCheckInBeforeShiftStartTime ?? 60), timeZone),
    bufferedEnd: zonedWallTime(key, endMinutes + (shift.allowCheckOutAfterShiftEndTime ?? 60), timeZone),
  };
};

/**
 * The day a punch belongs to: the shift window it falls in on its own date
 * or the date before (ADR-025's matchShiftOccurrence order, so a night
 * shift keeps its after-midnight punches), else its own calendar date.
 */
export const punchDay = (time, timeZone, shiftFor) => {
  const own = zonedDateKey(time, timeZone);
  for (const key of [own, addDays(own, -1)]) {
    const shift = shiftFor(key);
    if (!shift) continue;
    const window = shiftTimes(key, shift, timeZone);
    if (new Date(time) >= window.bufferedStart && new Date(time) <= window.bufferedEnd) return key;
  }
  return own;
};

export const buildAttendanceRegister = ({
  month, timeZone, today = zonedDateKey(new Date(), timeZone), unmarkedAs = null, dateOfJoining = null, relievingDate = null,
  attendance = [], assignments = [], holidayAssignments = {}, holidayLists = [], leaves = [], checkins = [],
}) => {
  const keys = monthDateKeys(month);
  // Payroll counts an unmarked day only inside employment and only once it has passed.
  const unmarkedCode = ATTENDANCE_CODE[unmarkedAs] ?? null;
  const employed = (key) => (!dateOfJoining || dayKey(dateOfJoining) <= key) && (!relievingDate || dayKey(relievingDate) >= key);
  const shiftCache = new Map();
  const shiftFor = (key) => {
    if (!shiftCache.has(key)) shiftCache.set(key, shiftOn(assignments, key));
    return shiftCache.get(key);
  };
  const listsById = new Map(holidayLists.map((list) => [String(list._id), list]));
  const attendanceByDay = new Map(attendance.map((row) => [dayKey(row.attendanceDate), row]));
  const punchesByDay = Object.groupBy(
    [...checkins].sort((a, b) => new Date(a.time) - new Date(b.time)),
    (punch) => punchDay(punch.time, timeZone, shiftFor),
  );
  const summary = {};

  const days = keys.map((key) => {
    const shift = shiftFor(key);
    const times = shift ? shiftTimes(key, shift, timeZone) : null;
    const dayPunches = punchesByDay[key] ?? [];
    const record = attendanceByDay.get(key) ?? null;
    const leave = leaves.find((row) => dayKey(row.fromDate) <= key && dayKey(row.toDate) >= key) ?? null;
    const unmarked = key < today && employed(key) ? unmarkedCode : null;
    const status = dayStatus(record, leave, holidaysOn(holidayAssignments, shift, listsById, key), key, unmarked);
    if (status.firstHalf) summary[status.firstHalf] = (summary[status.firstHalf] ?? 0) + 1;

    // In/out come from the punches the day's popup lists; the Attendance row fills in without any.
    const strict = shift?.determineCheckInAndCheckOut === "strict-in-out";
    const firstIn = strict ? dayPunches.find((punch) => punch.logType === "IN") : dayPunches[0];
    const lastOut = strict ? dayPunches.findLast((punch) => punch.logType === "OUT") : dayPunches.length > 1 ? dayPunches.at(-1) : undefined;
    const inTime = firstIn?.time ?? record?.inTime ?? null;
    const outTime = lastOut?.time ?? record?.outTime ?? null;
    const late = inTime && times ? minutesBetween(times.start, inTime) : null;
    const netPunchMinutes = dayPunches.length > 1
      ? Math.round((strict ? strictEveryValidPair : alternatingEveryValidPair)(dayPunches) * 60)
      : null;

    return {
      date: key,
      weekday: WEEKDAYS[new Date(`${key}T00:00:00Z`).getUTCDay()],
      shift: shift ? { _id: shift._id, name: shift.shiftTypeName, startTime: shift.startTime, endTime: shift.endTime } : null,
      // The window whose punches count toward this day (punchDay) — the popup's cut-off time.
      cutOffStart: times?.bufferedStart ?? null,
      cutOffEnd: times?.bufferedEnd ?? null,
      inTime,
      outTime,
      ...status,
      // Minutes past shift start, counted only once past the grace period — the lateEntry rule.
      lateInMinutes: late === null ? null : late > (shift.lateEntryGracePeriod ?? 0) ? late : 0,
      grossMinutes: inTime && outTime ? minutesBetween(inTime, outTime) : record?.workingHours != null ? Math.round(record.workingHours * 60) : null,
      netPunchMinutes,
      breakMinutes: netPunchMinutes === null ? null : Math.max(0, minutesBetween(dayPunches[0].time, dayPunches.at(-1).time) - netPunchMinutes),
      attendanceId: record?._id ?? null,
      punches: dayPunches.map(({ _id, time, logType, deviceId, latitude, longitude, offshift, createdAt }) =>
        ({ _id, time, logType, deviceId, latitude, longitude, offshift, createdAt })),
    };
  });

  return { days, summary };
};
