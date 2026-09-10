import assert from "node:assert/strict";
import { inclusiveDayCount, sameCalendarDay, countLeaveDays } from "./leaveDayCalculation.js";

// --- inclusiveDayCount ------------------------------------------------------

assert.equal(inclusiveDayCount(new Date("2026-01-01"), new Date("2026-01-01")), 1);
assert.equal(inclusiveDayCount(new Date("2026-01-01"), new Date("2026-01-05")), 5);

// --- sameCalendarDay ---------------------------------------------------------

assert.equal(sameCalendarDay(new Date("2026-01-01T00:00:00Z"), new Date("2026-01-01T23:59:00Z")), true);
assert.equal(sameCalendarDay(new Date("2026-01-01"), new Date("2026-01-02")), false);

// --- countLeaveDays ----------------------------------------------------------

// Plain 3-day range, no holidays, no half day.
assert.equal(
  countLeaveDays({ fromDate: "2026-01-05", toDate: "2026-01-07" }),
  3,
);

// Valid half day deducts 0.5.
assert.equal(
  countLeaveDays({ fromDate: "2026-01-05", toDate: "2026-01-05", halfDay: true, halfDayDate: "2026-01-05" }),
  0.5,
);

// Half day date outside the range is silently skipped (no deduction),
// matching source's documented behavior.
assert.equal(
  countLeaveDays({ fromDate: "2026-01-05", toDate: "2026-01-07", halfDay: true, halfDayDate: "2026-01-09" }),
  3,
);

// Holiday inside the range is excluded when includeHoliday is false (default).
assert.equal(
  countLeaveDays({
    fromDate: "2026-01-05", toDate: "2026-01-07",
    holidayDates: ["2026-01-06"],
  }),
  2,
);

// includeHoliday: true keeps the holiday counted as a leave day.
assert.equal(
  countLeaveDays({
    fromDate: "2026-01-05", toDate: "2026-01-07",
    holidayDates: ["2026-01-06"], includeHoliday: true,
  }),
  3,
);

// A half-day date that itself falls on a holiday is skipped (not deducted) —
// matches source: is_valid_half_day requires NOT is_holiday(half_day_date).
assert.equal(
  countLeaveDays({
    fromDate: "2026-01-05", toDate: "2026-01-07",
    halfDay: true, halfDayDate: "2026-01-06",
    holidayDates: ["2026-01-06"], includeHoliday: true,
  }),
  3, // no -0.5 (half day skipped), no -1 (includeHoliday keeps the holiday day)
);

console.log("leaveDayCalculation.test.js passed");
