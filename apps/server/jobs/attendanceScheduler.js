/**
 * ADR-025 — `processAutoAttendance`, the third of ADR-016's three named
 * background jobs (Leaves already built the other two categories,
 * `jobs/leaveScheduler.js`). NOT a literal port of source's three separate
 * hourly jobs (`update_last_sync_of_checkin` -> `process_auto_attendance_
 * for_all_shifts` -> `process_auto_shift_creation`) — this project's Q-5
 * scheduler is day-granularity, single-process, dependency-free (same
 * constraint leaveScheduler.js documents), so all of source's real work
 * folds into one daily job here. `process_auto_shift_creation` (schedule
 * generation) is deliberately NOT built as a job at all — see ADR-025,
 * it becomes the explicit `generate` action instead.
 *
 * This is a SEPARATE, independent runner file (own `runDueJobs`, own
 * `SchedulerRunLog.jobName`) — not merged into leaveScheduler.js's own
 * `JOBS` array, per ADR-025 (the two runners are not sequentially coupled
 * the way Leaves' three jobs are).
 *
 * **Judgment call — no watermark, "yesterday-or-earlier only" for BOTH
 * halves of this job.** Source uses `last_sync_of_checkin` as a mutable
 * upper-bound watermark advanced by its own separate hourly job (dropped
 * here per ADR-025). Rather than reintroduce that bookkeeping, this job
 * only ever processes a shift OCCURRENCE dated strictly before "today" —
 * exactly the same "yesterday only, no watermark" reasoning ADR-025 already
 * applies to the absence sweep, extended here to the checkin-grouping half
 * too: a shift still in progress today is never marked from partial
 * punches, and every daily run naturally catches up on whatever occurrences
 * are still unlinked, however long the server was stopped. The trade-off
 * (same one ADR-025 names for the absence sweep) is that a long-stopped
 * server does not backfill the gap; it only ever looks at "yesterday".
 */
import ShiftType from "../models/ShiftType.js";
import ShiftAssignment from "../models/ShiftAssignment.js";
import EmployeeCheckin from "../models/EmployeeCheckin.js";
import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";
import SchedulerRunLog from "../models/SchedulerRunLog.js";
import { dayStart, shiftWindow, DAY_MS, isAssignmentCurrentlyActive } from "../utils/shiftOccurrence.js";
import { isHolidayForEmployee } from "../utils/holidayResolution.js";
import { selectWorkingHoursFn, decideAttendanceStatus, computeLateEarlyFlags } from "../utils/attendanceAutoStatus.js";

const round2 = (n) => Math.round(n * 100) / 100;
const standardWorkingHoursFor = (shiftType, date) => {
  const window = shiftWindow(shiftType, date);
  return round2((window.end - window.start) / 3600000);
};

/**
 * Which calendar-date occurrence a checkin belongs to, for a specific
 * ShiftType — the same window math `matchShiftOccurrence` uses (today or
 * the previous day, whichever's buffered window contains the punch), but
 * applied directly against the ShiftType a checkin's own `shiftId` already
 * resolved to at checkin time (`shiftValidation.js`), rather than
 * re-resolving the occurrence from scratch. `EmployeeCheckin.shiftId` is set
 * once, at checkin creation (or any edit before it is linked to an
 * Attendance row) — see `shiftValidation.js`'s EmployeeCheckin block — so
 * grouping directly off that stored field, instead of re-querying
 * `ShiftAssignment` per checkin, is both simpler and exactly consistent
 * with what created the checkin in the first place.
 */
const occurrenceDateForCheckin = (shiftType, time) => {
  const t = new Date(time);
  const today = dayStart(t);
  for (const date of [today, new Date(+today - DAY_MS)]) {
    const window = shiftWindow(shiftType, date);
    if (t >= window.bufferedStart && t <= window.bufferedEnd) return date;
  }
  return today; // shouldn't happen — this checkin's shiftId was resolved against this exact shift
};

/**
 * Groups this ShiftType's still-unlinked checkins by (employeeId,
 * occurrenceDate) and marks Attendance for every fully-past occurrence.
 * Skips a date that already has a leave-backed Attendance row (ADR-025's
 * explicit simplification — no merge into source's pending-half-day
 * intermediate state, since `LeaveApplication.approve` never leaves one).
 * Per-group failure isolation.
 */
const processCheckinsForShiftType = async (shiftType, today) => {
  let attempted = 0;
  let created = 0;
  let skipped = 0;
  let failed = 0;

  const checkins = await EmployeeCheckin.find({
    shiftId: shiftType._id, attendanceId: null, skipAutoAttendance: false, offshift: false,
  }).sort({ employeeId: 1, time: 1 }).lean();

  const groups = new Map();
  for (const checkin of checkins) {
    const occurrenceDate = occurrenceDateForCheckin(shiftType, checkin.time);
    if (occurrenceDate >= today) continue; // eslint-disable-line no-continue -- still in progress or in the future
    if (shiftType.processAttendanceAfter && occurrenceDate < dayStart(shiftType.processAttendanceAfter)) continue; // eslint-disable-line no-continue -- before the configured watermark
    const key = `${checkin.employeeId}|${occurrenceDate.toISOString()}`;
    if (!groups.has(key)) groups.set(key, { employeeId: checkin.employeeId, occurrenceDate, logs: [] });
    groups.get(key).logs.push(checkin);
  }

  for (const group of groups.values()) {
    attempted += 1;
    try {
      // eslint-disable-next-line no-await-in-loop
      const existing = await Attendance.findOne({ employeeId: group.employeeId, attendanceDate: group.occurrenceDate }).lean();
      if (existing?.leaveApplicationId) { skipped += 1; continue; } // eslint-disable-line no-continue

      // eslint-disable-next-line no-await-in-loop
      const employee = await Employee.findById(group.employeeId).lean();
      if (!employee) { skipped += 1; continue; } // eslint-disable-line no-continue

      const workingHoursFn = selectWorkingHoursFn(shiftType);
      const workingHours = workingHoursFn(group.logs);
      const status = decideAttendanceStatus(workingHours, shiftType);
      const window = shiftWindow(shiftType, group.occurrenceDate);
      const { lateEntry, earlyExit } = computeLateEarlyFlags(group.logs, shiftType, window);

      // eslint-disable-next-line no-await-in-loop
      const doc = await Attendance.findOneAndUpdate(
        { employeeId: group.employeeId, attendanceDate: group.occurrenceDate },
        {
          employeeId: group.employeeId,
          companyId: employee.companyId,
          departmentId: employee.departmentId,
          attendanceDate: group.occurrenceDate,
          shiftId: shiftType._id,
          status,
          workingHours,
          standardWorkingHours: standardWorkingHoursFor(shiftType, group.occurrenceDate),
          lateEntry: lateEntry ?? undefined,
          earlyExit: earlyExit ?? undefined,
          inTime: group.logs[0].time,
          outTime: group.logs.at(-1).time,
          isActive: true,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      // eslint-disable-next-line no-await-in-loop
      await EmployeeCheckin.updateMany({ _id: { $in: group.logs.map((log) => log._id) } }, { attendanceId: doc._id });
      created += 1;
    } catch (error) {
      failed += 1;
      console.error(`processAutoAttendance: failed for employee ${group.employeeId} on ${group.occurrenceDate?.toISOString?.()}:`, error);
    }
  }

  return { attempted, created, skipped, failed };
};

/**
 * Once per day, for exactly "yesterday" (ADR-025 — no separate watermark
 * needed, every daily run covers its own yesterday): for every currently-
 * active auto-attendance-enabled Shift Assignment with no Attendance row
 * yet for yesterday, create an Absent row — unless yesterday is a holiday
 * for that employee and the shift doesn't mark attendance on holidays.
 * Per-assignment failure isolation.
 */
const processAbsenceSweep = async (today) => {
  let attempted = 0;
  let created = 0;
  let skipped = 0;
  let failed = 0;

  const yesterday = new Date(+today - DAY_MS);
  const assignments = await ShiftAssignment.find({ status: "active", isActive: true }).populate("shiftTypeId").lean();

  for (const assignment of assignments) {
    const shiftType = assignment.shiftTypeId;
    if (!shiftType?.enableAutoAttendance) continue; // eslint-disable-line no-continue
    if (!isAssignmentCurrentlyActive(assignment, yesterday)) continue; // eslint-disable-line no-continue
    if (dayStart(assignment.startDate) > yesterday) continue; // eslint-disable-line no-continue -- not yet started as of yesterday

    attempted += 1;
    try {
      // eslint-disable-next-line no-await-in-loop
      const existing = await Attendance.findOne({ employeeId: assignment.employeeId, attendanceDate: yesterday }).lean();
      if (existing) { skipped += 1; continue; } // eslint-disable-line no-continue

      // eslint-disable-next-line no-await-in-loop
      if (!shiftType.markAutoAttendanceOnHolidays && await isHolidayForEmployee(assignment.employeeId, yesterday)) {
        skipped += 1; continue; // eslint-disable-line no-continue
      }

      // eslint-disable-next-line no-await-in-loop
      const employee = await Employee.findById(assignment.employeeId).lean();
      if (!employee) { skipped += 1; continue; } // eslint-disable-line no-continue

      // eslint-disable-next-line no-await-in-loop
      await Attendance.create({
        employeeId: assignment.employeeId,
        companyId: employee.companyId,
        departmentId: employee.departmentId,
        attendanceDate: yesterday,
        shiftId: shiftType._id,
        status: "Absent",
        isActive: true,
      });
      created += 1;
    } catch (error) {
      failed += 1;
      console.error(`processAutoAttendance (absence sweep): failed for assignment ${assignment._id}:`, error);
    }
  }

  return { attempted, created, skipped, failed };
};

/** The job body `runDueJobs` below calls, at most once per calendar day. */
export const processAutoAttendance = async () => {
  const today = dayStart(new Date());
  const shiftTypes = await ShiftType.find({ enableAutoAttendance: true, processAttendanceAfter: { $ne: null } }).lean();

  const checkins = { attempted: 0, created: 0, skipped: 0, failed: 0 };
  for (const shiftType of shiftTypes) {
    // eslint-disable-next-line no-await-in-loop
    const result = await processCheckinsForShiftType(shiftType, today);
    checkins.attempted += result.attempted;
    checkins.created += result.created;
    checkins.skipped += result.skipped;
    checkins.failed += result.failed;
  }

  const absenceSweep = await processAbsenceSweep(today);

  return { checkins, absenceSweep };
};

// Same day-granularity bookkeeping as leaveScheduler.js's runDueJobs, a
// separate copy (not shared) matching that file's own "no shared date-util
// import" precedent — reused here so both runners' log entries mean exactly
// the same thing under SchedulerRunLog.
const startOfDayUTC = (date = new Date()) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const isToday = (lastRunDate) => {
  if (!lastRunDate) return false;
  return startOfDayUTC(new Date(lastRunDate)).getTime() === startOfDayUTC().getTime();
};

const JOBS = [{ name: "processAutoAttendance", fn: processAutoAttendance }];

export const runDueJobs = async () => {
  for (const { name, fn } of JOBS) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const log = await SchedulerRunLog.findOne({ jobName: name });
      if (isToday(log?.lastRunDate)) continue; // eslint-disable-line no-continue -- already attempted today

      const startedAt = Date.now();
      let status = "success";
      let error = null;
      try {
        // eslint-disable-next-line no-await-in-loop
        await fn();
      } catch (jobError) {
        status = "failed";
        error = jobError?.message || String(jobError);
        console.error(`attendanceScheduler: job "${name}" failed:`, jobError);
      }

      // eslint-disable-next-line no-await-in-loop
      await SchedulerRunLog.findOneAndUpdate(
        { jobName: name },
        {
          jobName: name,
          lastRunDate: startOfDayUTC(),
          lastStatus: status,
          lastError: error,
          lastDurationMs: Date.now() - startedAt,
          isActive: true,
        },
        { upsert: true, setDefaultsOnInsert: true },
      );
    } catch (outerError) {
      console.error(`attendanceScheduler: bookkeeping failed for job "${name}":`, outerError);
    }
  }
};
