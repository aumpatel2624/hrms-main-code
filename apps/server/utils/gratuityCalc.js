/**
 * ADR-031 (Payroll — Gratuity). The whole gratuity calculation engine, kept
 * in its own small dedicated file (same "one calc file per module" pattern
 * as arrearCalc.js/payrollCorrectionCalc.js/incomeTaxCalc.js), since the
 * slab-walk logic is real enough to warrant its own unit tests.
 *
 * `countLwpDaysInRange` is the only DB-fetching export here — it re-uses
 * `utils/payrollPaymentDays.js`'s exact two-branch LWP-day resolution
 * (`settings.payrollBasedOn`: "Attendance" rows' isLwp-flagged status vs.
 * submitted "Leave Application" rows whose LeaveType.isLwp is true) but
 * scoped to an arbitrary multi-year date range (an employee's full tenure)
 * rather than one payroll period. It is a sibling to `computePaymentDays`,
 * not a change to it — the two answer different questions (a ratio within
 * one payroll cycle vs. a day-count across a whole employment span).
 *
 * `getWorkExperience` and `getGratuityAmount` are pure (no DB access) so
 * they can be unit-tested with hand-computed numbers, no live Mongo needed.
 */
import Attendance from "../models/Attendance.js";
import LeaveType from "../models/LeaveType.js";
import LeaveApplication from "../models/LeaveApplication.js";

const DAY_MS = 86400000;

const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const toUtcMidnight = (date) => {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

const throwErr = (message) => {
  const error = new Error(message);
  error.status = 400;
  throw error;
};

/**
 * DB-fetching. Counts LWP (loss-of-pay) days for `employeeId` within
 * `[startDate, endDate]` inclusive, using this project's already-established
 * `settings.payrollBasedOn` branching (see `utils/payrollPaymentDays.js`'s
 * `computePaymentDays` for the one-payroll-period sibling of this exact
 * resolution logic):
 *  - "Attendance": Attendance rows in range with status "On Leave" whose
 *    leaveTypeId resolves to a LeaveType with isLwp: true.
 *  - "Leave Application" (default): submitted... actually approved
 *    LeaveApplication rows overlapping the range whose LeaveType has
 *    isLwp: true, counted in whole days over the intersection with the range.
 */
export const countLwpDaysInRange = async ({ employeeId, startDate, endDate, settings }) => {
  const start = toUtcMidnight(startDate);
  const end = toUtcMidnight(endDate);
  let lwpDays = 0;

  if (settings?.payrollBasedOn === "Leave Application") {
    const apps = await LeaveApplication.find({
      employeeId,
      status: "approved",
      fromDate: { $lte: end },
      toDate: { $gte: start },
    }).lean();
    if (apps.length) {
      const leaveTypeIds = [...new Set(apps.map((a) => String(a.leaveTypeId)))];
      const leaveTypes = await LeaveType.find({ _id: { $in: leaveTypeIds }, isLwp: true }).select("_id").lean();
      const lwpTypeIds = new Set(leaveTypes.map((t) => String(t._id)));
      for (const app of apps) {
        if (!lwpTypeIds.has(String(app.leaveTypeId))) continue;
        const appFrom = toUtcMidnight(app.fromDate);
        const appTo = toUtcMidnight(app.toDate);
        const rangeStart = appFrom > start ? appFrom : start;
        const rangeEnd = appTo < end ? appTo : end;
        if (rangeEnd < rangeStart) continue;
        lwpDays += Math.round((rangeEnd - rangeStart) / DAY_MS) + 1;
      }
    }
  } else {
    const rows = await Attendance.find({
      employeeId,
      attendanceDate: { $gte: start, $lte: end },
      status: "On Leave",
    }).lean();
    const leaveTypeIds = [...new Set(rows.filter((r) => r.leaveTypeId).map((r) => String(r.leaveTypeId)))];
    const leaveTypes = leaveTypeIds.length
      ? await LeaveType.find({ _id: { $in: leaveTypeIds } }).select("_id isLwp").lean()
      : [];
    const lwpTypeIds = new Set(leaveTypes.filter((t) => t.isLwp).map((t) => String(t._id)));
    for (const row of rows) {
      if (row.leaveTypeId && lwpTypeIds.has(String(row.leaveTypeId))) lwpDays += 1;
    }
  }

  return lwpDays;
};

/**
 * Pure. Computes an employee's gratuity-eligible work experience (in years).
 *
 * `minimumYearForGratuity` is not part of ADR-031's literal parameter list
 * for this function, but the same bullet requires "throw if the result is
 * below minimumYearForGratuity" — there is nowhere else for that floor to
 * live, so it is accepted here as an extra optional parameter (defaults to
 * 0, meaning no floor). Judgment call, flagged in the module's final summary
 * rather than guessed silently.
 *
 * "Round off Work Experience" uses standard round-half-up (`Math.round`),
 * not source's Python round-half-to-even — a deliberate simplification
 * (only observable exactly at a .5 boundary), noted for the same reason.
 */
export const getWorkExperience = ({
  dateOfJoining,
  relievingDate,
  lwpDays = 0,
  totalWorkingDaysPerYear,
  workExperienceCalculationFunction,
  manualValue,
  minimumYearForGratuity = 0,
} = {}) => {
  let experience;

  if (workExperienceCalculationFunction === "Manual") {
    experience = Number(manualValue) || 0;
  } else {
    const doj = toUtcMidnight(dateOfJoining);
    const rd = toUtcMidnight(relievingDate);
    const totalCalendarDays = Math.round((rd - doj) / DAY_MS);
    const workingDays = totalCalendarDays - (Number(lwpDays) || 0);
    const denom = Number(totalWorkingDaysPerYear) || 1;
    const rawExperience = workingDays / denom;

    if (workExperienceCalculationFunction === "Round off Work Experience") {
      experience = Math.round(rawExperience);
    } else {
      // "Take Exact Completed Years" — misleadingly named in source; it does
      // NOT truncate, it keeps the fractional value (ADR-031).
      experience = round2(rawExperience);
    }
  }

  if (experience < (Number(minimumYearForGratuity) || 0)) {
    throwErr(`Employee has to complete minimum ${minimumYearForGratuity} years for gratuity`);
  }

  return experience || 0;
};

/**
 * Pure. Computes the final gratuity payout amount.
 *
 * `slabs` is re-sorted ascending by `fromYear` defensively (the caller is
 * expected to already store them in order, same as `validateGratuitySlabs`
 * assumes, but this function does not trust that).
 *
 * "Current Slab": the fraction===0 "treated as not found, keep scanning"
 * quirk in source is preserved literally, not fixed (ADR-031) — a matching
 * slab whose fraction is exactly 0 does not stop the loop.
 *
 * "Sum of all previous slabs": each slab the employee has fully passed
 * contributes `(toYear - fromYear + 1) * totalComponentAmount * fraction`
 * (an inclusive slab-width count), and the remaining partial year is applied
 * against whichever slab currently contains `workExperience`.
 */
export const getGratuityAmount = ({
  workExperience,
  applicableComponentIds = [],
  latestSlipEarnings,
  calculateGratuityAmountBasedOn,
  slabs = [],
} = {}) => {
  if (!Array.isArray(applicableComponentIds) || applicableComponentIds.length === 0) {
    throwErr("No applicable Earning components found for Gratuity Rule");
  }
  if (!Array.isArray(latestSlipEarnings) || latestSlipEarnings.length === 0) {
    throwErr("No Salary Slip found for Employee");
  }

  const idSet = new Set(applicableComponentIds.map((id) => String(id)));
  let totalComponentAmount = 0;
  let matched = false;
  for (const row of latestSlipEarnings) {
    if (idSet.has(String(row.salaryComponentId))) {
      matched = true;
      totalComponentAmount += Number(row.defaultAmount ?? row.amount ?? 0);
    }
  }
  if (!matched) {
    throwErr("No applicable Earning component found in last salary slip for Gratuity Rule");
  }

  const sortedSlabs = [...slabs].sort((a, b) => (Number(a.fromYear) || 0) - (Number(b.fromYear) || 0));

  let amount = 0;
  let slabFound = false;

  if (calculateGratuityAmountBasedOn === "Current Slab") {
    for (const slab of sortedSlabs) {
      const from = Number(slab.fromYear) || 0;
      const to = slab.toYear === null || slab.toYear === undefined ? null : Number(slab.toYear);
      const isWithin = from <= workExperience && (to === null || workExperience <= to);
      if (isWithin) {
        const fraction = Number(slab.fractionOfApplicableEarnings) || 0;
        amount = totalComponentAmount * workExperience * fraction;
        if (fraction !== 0) {
          slabFound = true;
          break;
        }
        // fraction === 0 quirk (ADR-031): keep scanning, do not break/stop.
      }
    }
  } else if (calculateGratuityAmountBasedOn === "Sum of all previous slabs") {
    let yearsLeft = workExperience;
    for (const slab of sortedSlabs) {
      const from = Number(slab.fromYear) || 0;
      const to = slab.toYear === null || slab.toYear === undefined ? null : Number(slab.toYear);
      const fraction = Number(slab.fractionOfApplicableEarnings) || 0;

      const isBeyond = to !== null && from < workExperience && to < workExperience;
      if (isBeyond) {
        const slabWidth = to - from + 1;
        amount += slabWidth * totalComponentAmount * fraction;
        yearsLeft -= slabWidth;
        slabFound = true;
        continue;
      }

      const isWithin = from <= workExperience && (to === null || workExperience <= to);
      if (isWithin) {
        amount += yearsLeft * totalComponentAmount * fraction;
        slabFound = true;
        break;
      }
    }
  }

  if (!slabFound) {
    throwErr("No applicable slab found for the calculation of gratuity amount as per the Gratuity Rule");
  }

  return round2(amount);
};
