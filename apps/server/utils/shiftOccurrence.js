import ShiftAssignment from "../models/ShiftAssignment.js";

export const DAY_MS = 86400000;
// Date-only HR records and occurrences use UTC, like the existing leave utilities.
export const dayStart = value => new Date(new Date(value).toISOString().slice(0, 10));
export const isAssignmentCurrentlyActive = (assignment, asOfDate = new Date()) =>
  assignment.status === "active" && (!assignment.endDate || dayStart(assignment.endDate) >= dayStart(asOfDate));

export const shiftWindow = (shift, date) => {
  const minutes = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const start = new Date(+dayStart(date) + minutes(shift.startTime) * 60000);
  const end = new Date(+dayStart(date) + minutes(shift.endTime) * 60000 + (shift.endTime < shift.startTime ? DAY_MS : 0));
  return { start, end,
    bufferedStart: new Date(+start - (shift.beginCheckInBeforeShiftStartTime ?? 60) * 60000),
    bufferedEnd: new Date(+end + (shift.allowCheckOutAfterShiftEndTime ?? 60) * 60000),
  };
};

export const matchShiftOccurrence = (assignments, timestamp) => {
  const time = new Date(timestamp);
  const today = dayStart(time);
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
  const today = dayStart(timestamp);
  const previous = new Date(+today - DAY_MS);
  const assignments = await ShiftAssignment.find({ employeeId, status: "active", isActive: true,
    startDate: { $lte: today }, $or: [{ endDate: null }, { endDate: { $gte: previous } }],
  }).sort({ startDate: -1, _id: 1 }).populate("shiftTypeId").lean();
  return matchShiftOccurrence(assignments, timestamp);
};
