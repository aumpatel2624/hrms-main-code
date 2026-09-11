import assert from "node:assert/strict";
import { generateShiftRanges } from "./shiftSchedule.js";
const dates = ranges => ranges.map(r => [r.startDate.toISOString().slice(0, 10), r.endDate.toISOString().slice(0, 10)]);
assert.deepEqual(dates(generateShiftRanges({ frequency: "every-1-week", repeatOnDays: ["Monday", "Wednesday", "Friday"] }, "2026-09-14", "2026-09-20")), [["2026-09-14", "2026-09-14"], ["2026-09-16", "2026-09-16"], ["2026-09-18", "2026-09-18"]]);
assert.deepEqual(dates(generateShiftRanges({ frequency: "every-2-weeks", repeatOnDays: ["Monday", "Tuesday", "Wednesday"] }, "2026-09-16", "2026-10-02")), [["2026-09-16", "2026-09-16"], ["2026-09-21", "2026-09-22"], ["2026-09-30", "2026-09-30"]]);
assert.deepEqual(dates(generateShiftRanges({ frequency: "every-4-weeks", repeatOnDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] }, "2026-09-14", "2026-10-12")), [["2026-09-14", "2026-09-20"], ["2026-10-12", "2026-10-12"]]);
assert.deepEqual(generateShiftRanges({ frequency: "every-1-week", repeatOnDays: [] }, "2026-09-14", "2026-09-20"), []);
console.log("shiftSchedule: weekly, anchored fortnightly, four-week boundaries and empty patterns passed");
