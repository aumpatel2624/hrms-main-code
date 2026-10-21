import assert from "node:assert/strict";
import { matchShiftOccurrence, isAssignmentCurrentlyActive, shiftWindow } from "./shiftOccurrence.js";
// Shift times are on the company's clock, India time (UTC+05:30) — ADR-042 / Q-34.
const day = { status: "active", startDate: "2026-09-14", endDate: "2026-09-14", shiftTypeId: { startTime: "09:00", endTime: "17:00", beginCheckInBeforeShiftStartTime: 60, allowCheckOutAfterShiftEndTime: 60 } };
assert.equal(matchShiftOccurrence([day], "2026-09-14T03:40:00Z").occurrenceDate.toISOString(), "2026-09-14T00:00:00.000Z"); // 09:10 IST
assert.ok(matchShiftOccurrence([day], "2026-09-14T02:30:00Z")); // 08:00 IST, the buffered start
assert.ok(matchShiftOccurrence([day], "2026-09-14T12:30:00Z")); // 18:00 IST, the buffered end
assert.equal(matchShiftOccurrence([day], "2026-09-14T02:29:59Z"), null);
assert.equal(matchShiftOccurrence([day], "2026-09-14T12:30:01Z"), null);
const night = { ...day, shiftTypeId: { ...day.shiftTypeId, startTime: "22:00", endTime: "06:00" } };
assert.equal(matchShiftOccurrence([night], "2026-09-14T18:40:00Z").occurrenceDate.toISOString(), "2026-09-14T00:00:00.000Z"); // 00:10 IST on the 15th
assert.ok(matchShiftOccurrence([night], "2026-09-15T01:30:00Z")); // 07:00 IST
assert.equal(matchShiftOccurrence([{ ...night, status: "inactive" }], "2026-09-14T18:40:00Z"), null);
assert.equal(isAssignmentCurrentlyActive(day, "2026-09-15"), false);
assert.equal(isAssignmentCurrentlyActive(day, "2026-09-14"), true);
assert.equal(matchShiftOccurrence([day], "2026-09-13T03:40:00Z"), null);

// A 09:30 India-time IN on a 09:30-18:30 shift is on shift — read as UTC it was 04:00Z, outside 08:30Z-19:30Z.
const general = { status: "active", startDate: "2026-09-01", endDate: null, shiftTypeId: { startTime: "09:30", endTime: "18:30" } };
assert.equal(matchShiftOccurrence([general], "2026-09-21T04:00:00Z").occurrenceDate.toISOString(), "2026-09-21T00:00:00.000Z");
assert.equal(matchShiftOccurrence([general], "2026-09-21T14:01:00Z"), null); // 19:31 IST, past the check-out buffer
assert.equal(shiftWindow(general.shiftTypeId, "2026-09-21").start.toISOString(), "2026-09-21T04:00:00.000Z");
assert.equal(shiftWindow(general.shiftTypeId, "2026-09-21").end.toISOString(), "2026-09-21T13:00:00.000Z");

// An early shift whose punch falls on the previous UTC date still belongs to its India date.
const early = { ...general, shiftTypeId: { startTime: "05:00", endTime: "13:00" } };
assert.equal(matchShiftOccurrence([early], "2026-09-20T23:00:00Z").occurrenceDate.toISOString(), "2026-09-21T00:00:00.000Z"); // 04:30 IST on the 21st

console.log("shiftOccurrence: day, overnight, expiry, offshift, company-clock and inclusive boundaries passed");
