/**
 * ADR-024. Pro-ration math for `LeavePolicyAssignment`'s `grant-allocations`
 * action and the `allocateEarnedLeaves` scheduler job.
 *
 * **Deliberate simplification, documented in DECISIONS.md ADR-024 "As
 * built"**: source's real algorithm (see the Leave Policy Assignment /
 * Leave Allocation port-spec files) anchors earned-leave sub-periods to
 * calendar quarters/half-years with a dozen edge cases for month-length and
 * `effective_from`-relative boundaries. This is an idiomatic rebuild
 * (ADR-016), not a byte-for-byte port — the two rules ADR-024 explicitly
 * calls out are reproduced exactly (tenure pro-ration rounds to whole
 * numbers; earned-leave pro-ration rounds to decimals, further rounded per
 * `LeaveType.rounding`), but period boundaries are calendar-months-from-
 * `fromDate` rather than calendar-quarter/half-year-anchored.
 */

const PERIODS_PER_YEAR = { Monthly: 12, Quarterly: 4, "Half-Yearly": 2, Yearly: 1 };
const MONTHS_PER_PERIOD = { Monthly: 1, Quarterly: 3, "Half-Yearly": 6, Yearly: 12 };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Inclusive day count between two dates (UTC midnight-normalized). */
export const daysBetweenInclusive = (a, b) => Math.round((b.getTime() - a.getTime()) / MS_PER_DAY) + 1;

const round = (value, precision) => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

/** LeaveType.rounding ("" | "0.25" | "0.5" | "1.0") applied to a raw figure. */
export const roundByRounding = (value, rounding) => {
  if (rounding === "0.25") return Math.round(value * 4) / 4;
  if (rounding === "0.5") return Math.round(value * 2) / 2;
  if (rounding === "1.0") return Math.round(value);
  return round(value, 2);
};

/**
 * Whole-number tenure pro-ration for a non-earned-leave type — "tenure
 * pro-ration rounds to whole numbers" (ADR-024).
 */
export const prorateTenureLeaves = (annualAllocation, dateOfJoining, periodStart, periodEnd) => {
  if (!annualAllocation) return 0;
  if (!dateOfJoining || dateOfJoining <= periodStart) return annualAllocation;
  if (dateOfJoining > periodEnd) return 0;
  const actual = daysBetweenInclusive(dateOfJoining, periodEnd);
  const complete = daysBetweenInclusive(periodStart, periodEnd);
  return Math.round(annualAllocation * (actual / complete));
};

/**
 * Decimal earned-leave pro-ration for one sub-period's share — "earned-leave
 * pro-ration rounds to decimals" (ADR-024), rounded to 2 decimal places
 * before any further `LeaveType.rounding` is applied by the caller.
 */
export const prorateEarnedLeaves = (share, dateOfJoining, periodStart, periodEnd) => {
  if (!share) return 0;
  if (!dateOfJoining || dateOfJoining <= periodStart) return round(share, 2);
  if (dateOfJoining > periodEnd) return 0;
  const actual = daysBetweenInclusive(dateOfJoining, periodEnd);
  const complete = daysBetweenInclusive(periodStart, periodEnd);
  return round(share * (actual / complete), 2);
};

/** annualAllocation split into one frequency-period's flat share. */
export const periodicShare = (annualAllocation, frequency, rounding) => {
  const periods = PERIODS_PER_YEAR[frequency] || 1;
  return roundByRounding((annualAllocation || 0) / periods, rounding);
};

/** UTC-safe add-months, day-of-month preserved where the target month allows it. */
export const addMonthsUTC = (date, months) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()));

/**
 * Builds the future `earnedLeaveSchedule[]` rows for an earned-leave
 * allocation, one row every `12 / periodsPerYear` months from `fromDate` to
 * `toDate`. Rows on/before `today` are marked already-allocated
 * (`allocatedVia: "Leave Policy Assignment"`) — their leaves are summed by
 * the caller into the allocation's up-front `newLeavesAllocated`; rows after
 * `today` are left `isAllocated: false` for `allocateEarnedLeaves` to pick
 * up on its scheduled date.
 */
export const buildEarnedLeaveSchedule = ({ annualAllocation, frequency, rounding, fromDate, toDate, dateOfJoining, today = new Date() }) => {
  const monthsPerPeriod = MONTHS_PER_PERIOD[frequency] || 12;
  const share = periodicShare(annualAllocation, frequency, rounding);
  const schedule = [];
  let cursor = new Date(fromDate);

  while (cursor <= toDate) {
    const periodEndMs = Math.min(
      addMonthsUTC(cursor, monthsPerPeriod).getTime() - MS_PER_DAY,
      toDate.getTime(),
    );
    const periodEnd = new Date(periodEndMs);

    // Per-row placement of the join date, not just a one-time "first row"
    // special case — a period entirely before the employee joined earns
    // nothing, the period containing the join date is pro-rated, and every
    // period after it earns the full share. Fixed during verify: an
    // earlier version only pro-rated the schedule's first row, which wrongly
    // granted a full share for every month between the period start and the
    // employee's actual join date when the two didn't coincide.
    let numberOfLeaves;
    if (dateOfJoining && periodEnd < dateOfJoining) {
      numberOfLeaves = 0;
    } else if (dateOfJoining && dateOfJoining > cursor) {
      numberOfLeaves = roundByRounding(prorateEarnedLeaves(share, dateOfJoining, cursor, periodEnd), rounding);
    } else {
      numberOfLeaves = share;
    }

    const isPast = cursor.getTime() <= today.getTime();
    schedule.push({
      allocationDate: new Date(cursor),
      numberOfLeaves,
      isAllocated: isPast,
      attempted: isPast,
      failed: false,
      failureReason: "",
      allocatedVia: isPast ? "Leave Policy Assignment" : "",
    });
    cursor = addMonthsUTC(cursor, monthsPerPeriod);
  }
  return schedule;
};
