import assert from "node:assert/strict";
import {
  prorateTenureLeaves,
  prorateEarnedLeaves,
  roundByRounding,
  periodicShare,
  buildEarnedLeaveSchedule,
} from "./leaveProration.js";

// --- prorateTenureLeaves (whole-number rounding) ---------------------------

// Joined before the period start -> full allocation, no pro-ration.
assert.equal(
  prorateTenureLeaves(12, new Date("2025-01-01"), new Date("2026-01-01"), new Date("2026-12-31")),
  12,
);

// Joined exactly mid-year into a 365-day period -> roughly half, rounded whole.
{
  const leaves = prorateTenureLeaves(12, new Date("2026-07-01"), new Date("2026-01-01"), new Date("2026-12-31"));
  assert.equal(Number.isInteger(leaves), true);
  assert.ok(leaves >= 5 && leaves <= 7, `expected ~6, got ${leaves}`);
}

// Joined after the period ends -> 0.
assert.equal(
  prorateTenureLeaves(12, new Date("2027-01-01"), new Date("2026-01-01"), new Date("2026-12-31")),
  0,
);

// --- prorateEarnedLeaves (decimal rounding) ---------------------------------

assert.equal(prorateEarnedLeaves(1, new Date("2025-01-01"), new Date("2026-01-01"), new Date("2026-01-31")), 1);
{
  // Joined on the 16th of a 31-day month -> ~half the monthly share.
  const share = prorateEarnedLeaves(1, new Date("2026-01-16"), new Date("2026-01-01"), new Date("2026-01-31"));
  assert.ok(share > 0.4 && share < 0.6, `expected ~0.5, got ${share}`);
  assert.notEqual(share, Math.round(share)); // decimal, not whole-number rounded
}

// --- roundByRounding ---------------------------------------------------------

assert.equal(roundByRounding(1.13, "0.25"), 1.25);
assert.equal(roundByRounding(1.13, "0.5"), 1);
assert.equal(roundByRounding(1.6, "1.0"), 2);
assert.equal(roundByRounding(1.666, ""), 1.67);

// --- periodicShare -----------------------------------------------------------

assert.equal(periodicShare(12, "Monthly", ""), 1);
assert.equal(periodicShare(12, "Quarterly", ""), 3);
assert.equal(periodicShare(12, "Yearly", ""), 12);

// --- buildEarnedLeaveSchedule -------------------------------------------------

{
  const schedule = buildEarnedLeaveSchedule({
    annualAllocation: 12,
    frequency: "Monthly",
    rounding: "1.0",
    fromDate: new Date("2026-01-01"),
    toDate: new Date("2026-12-31"),
    dateOfJoining: new Date("2020-01-01"), // joined long before -> no first-period pro-ration
    today: new Date("2026-04-15"),
  });
  assert.equal(schedule.length, 12);
  assert.equal(schedule.every((row) => row.numberOfLeaves === 1), true);
  // Jan, Feb, Mar, Apr rows are <= today -> already allocated.
  const pastRows = schedule.filter((r) => r.isAllocated);
  assert.equal(pastRows.length, 4);
  assert.equal(pastRows.every((r) => r.allocatedVia === "Leave Policy Assignment"), true);
  const futureRows = schedule.filter((r) => !r.isAllocated);
  assert.equal(futureRows.length, 8);
  assert.equal(futureRows.every((r) => r.attempted === false && r.allocatedVia === ""), true);
}

{
  // Employee joined mid-year (June 29), well after the schedule's fromDate
  // (Jan 1) — months entirely before joining must earn 0, not a full share.
  // (Found and fixed during verify: an earlier version only pro-rated the
  // schedule's FIRST row, so Feb-May would have wrongly earned a full
  // month's share each despite the employee not being hired yet.)
  const schedule = buildEarnedLeaveSchedule({
    annualAllocation: 12,
    frequency: "Monthly",
    rounding: "", // no LeaveType.rounding applied — keep June's small fraction visible
    fromDate: new Date("2026-01-01"),
    toDate: new Date("2026-12-31"),
    dateOfJoining: new Date("2026-06-29"),
    today: new Date("2026-09-10"),
  });
  const byMonth = schedule.map((r) => r.numberOfLeaves);
  // Jan-May: 0 (not yet joined). June: pro-rated partial (small, > 0, < 1).
  assert.deepEqual(byMonth.slice(0, 5), [0, 0, 0, 0, 0]);
  assert.ok(byMonth[5] > 0 && byMonth[5] < 1, `June should be a partial share, got ${byMonth[5]}`);
  // July-Dec: full share of 1 each.
  assert.deepEqual(byMonth.slice(6), [1, 1, 1, 1, 1, 1]);
}

console.log("leaveProration: all checks passed");
