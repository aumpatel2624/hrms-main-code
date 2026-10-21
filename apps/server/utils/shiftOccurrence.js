import { COMPANY_TIME_ZONE } from "@demo-panel/shared/attendance";
import { zonedDateKey, zonedWallTime } from "@demo-panel/shared/zonedTime";
import ShiftAssignment from "../models/ShiftAssignment.js";

export const DAY_MS = 86400000;
// Date-only HR records and occurrences are stored at UTC midnight, like the existing leave utilities.
export const dayStart = value => new Date(new Date(value).toISOString().slice(0, 10));
// ADR-042 / Q-34: shift times are wall-clock "HH:mm" on the company's clock, so an
// occurrence date is the company's calendar date at that instant.
export const companyDay = value => new Date(zonedDateKey(value, COMPANY_TIME_ZONE));
export const isAssignmentCurrentlyActive = (assignment, asOfDate = new Date()) =>
  assignment.status === "active" && (!assignment.endDate || dayStart(assignment.endDate) >= dayStart(asOfDate));

export const shiftWindow = (shift, date, timeZone = COMPANY_TIME_ZONE) => {
  const key = dayStart(date).toISOString().slice(0, 10);
  const minutes = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const start = zonedWallTime(key, minutes(shift.startTime), timeZone);
  const end = zonedWallTime(key, minutes(shift.endTime) + (shift.endTime < shift.startTime ? 1440 : 0), timeZone);
  return { start, end,
    bufferedStart: new Date(+start - (shift.beginCheckInBeforeShiftStartTime ?? 60) * 60000),
    bufferedEnd: new Date(+end + (shift.allowCheckOutAfterShiftEndTime ?? 60) * 60000),
  };
};

export const matchShiftOccurrence = (assignments, timestamp) => {
  const time = new Date(timestamp);
  const today = companyDay(time);
  // ADR-025 deliberately limits candidates to this date and the previous date.
  for (const date of [today, new Date(+today - DAY_MS)]) {
    for (const assignment of assignments) {
      if (!isAssignmentCurrentlyActive(assignment, date) || dayStart(assignment.startDate) > date) continue;
      const shift = assignment.shiftTypeId;
      if (!shift?.startTime || shift.isActive === false) continue;
      const window = shiftWindow(shift, date);
      if (time >= window.bufferedStart && time <= window.bufferedEnd) {
        return { assignment, shift, occurrenceDate: date, ...window };
      }
    }
  }
  return null;
};

export const resolveShiftOccurrence = async (employeeId, timestamp) => {
  const today = companyDay(timestamp);
  const previous = new Date(+today - DAY_MS);
  const assignments = await ShiftAssignment.find({ employeeId, status: "active", isActive: true,
    startDate: { $lte: today }, $or: [{ endDate: null }, { endDate: { $gte: previous } }],
  }).sort({ startDate: -1, _id: 1 }).populate("shiftTypeId").lean();
  return matchShiftOccurrence(assignments, timestamp);
};
