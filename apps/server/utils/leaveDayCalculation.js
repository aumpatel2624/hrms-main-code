/**
 * ADR-024 (module complete — second fork). Pure day-count math for `Leave
 * Application` — split out from the controller so it's independently
 * testable without a database, matching this project's `leaveProration.js`
 * precedent. Idiomatic rebuild (ADR-016) of source's `get_number_of_leave_
 * days` (`Leave Application.md` Business Logic #1): inclusive day count,
 * minus 0.5 for a valid half day (in range, not itself a holiday), minus the
 * count of holiday dates in range when the leave type does not
 * `includeHoliday`.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const inclusiveDayCount = (fromDate, toDate) =>
  Math.round((new Date(toDate).getTime() - new Date(fromDate).getTime()) / MS_PER_DAY) + 1;

export const sameCalendarDay = (a, b) => {
  const da = new Date(a);
  const db = new Date(b);
  return da.getUTCFullYear() === db.getUTCFullYear()
    && da.getUTCMonth() === db.getUTCMonth()
    && da.getUTCDate() === db.getUTCDate();
};

/**
 * @param {object} args
 * @param {Date|string} args.fromDate
 * @param {Date|string} args.toDate
 * @param {boolean} [args.halfDay]
 * @param {Date|string|null} [args.halfDayDate]
 * @param {(Date|string)[]} [args.holidayDates] pre-resolved holiday dates (any within or outside range are fine — filtered internally)
 * @param {boolean} [args.includeHoliday] when true, holidays still count as leave days (Leave Type.includeHoliday)
 * @returns {number} may be fractional (half day), zero, or negative
 */
export const countLeaveDays = ({ fromDate, toDate, halfDay = false, halfDayDate = null, holidayDates = [], includeHoliday = false }) => {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  let days = inclusiveDayCount(from, to);

  const holidaysInRange = holidayDates
    .map((d) => new Date(d))
    .filter((d) => d >= from && d <= to);

  if (halfDay && halfDayDate) {
    const hd = new Date(halfDayDate);
    const isHalfDayOnHoliday = holidaysInRange.some((d) => sameCalendarDay(d, hd));
    const validHalfDay = hd >= from && hd <= to && !isHalfDayOnHoliday;
    // Matches source: an invalid half-day date (holiday, or out of range)
    // silently skips the 0.5 deduction rather than throwing here — the
    // caller's own validation is responsible for rejecting a bad
    // halfDayDate outright before this is ever called for real.
    if (validHalfDay) days -= 0.5;
  }

  if (!includeHoliday) {
    days -= holidaysInRange.length;
  }

  return days;
};
