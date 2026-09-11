import { dayStart, DAY_MS } from "./shiftOccurrence.js";
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
// Literal weekday/run state machine from Shift Schedule Assignment.md, A.
// The invocation's first date anchors the week; the watermark is the next date to generate.
export const generateShiftRanges = (schedule, startDate, endDate) => {
  let date = dayStart(startDate);
  const end = endDate ? dayStart(endDate) : new Date(+date + 90 * DAY_MS);
  if (end < date) throw Object.assign(new Error("End date must be on or after create shifts after"), { status: 400 });
  const gap = Number(schedule.frequency.split("-")[1]) - 1;
  const boundary = new Date(+date - DAY_MS).getUTCDay();
  const ranges = [];
  let start = null;
  const close = until => { if (start) { ranges.push({ startDate: start, endDate: new Date(until) }); start = null; } };
  while (date <= end) {
    if (schedule.repeatOnDays.includes(DAYS[date.getUTCDay()])) {
      start ??= new Date(date);
      if (+date === +end) close(date);
    } else close(+date - DAY_MS);
    if (date.getUTCDay() === boundary && gap) { close(date); date = new Date(+date + gap * 7 * DAY_MS); }
    date = new Date(+date + DAY_MS);
  }
  return ranges;
};
