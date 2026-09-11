// ADR-027: calendar arithmetic clamps month ends, like relativedelta.
export const PAYROLL_FREQUENCIES = ["Monthly", "Fortnightly", "Bimonthly", "Weekly", "Daily"];
export const addPayrollPeriods = (date, frequency, count = 1) => {
  const result = new Date(date);
  if (frequency === "Monthly" || frequency === "Bimonthly") {
    const day = result.getUTCDate();
    result.setUTCDate(1);
    result.setUTCMonth(result.getUTCMonth() + count * (frequency === "Monthly" ? 1 : 2));
    const last = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
    result.setUTCDate(Math.min(day, last));
  } else {
    const days = { Weekly: 7, Fortnightly: 14, Daily: 1 }[frequency];
    if (!days) throw new Error("Invalid payroll frequency");
    result.setUTCDate(result.getUTCDate() + days * count);
  }
  return result;
};
export const deriveWithholdingStatus = (cycles, status = "withheld") =>
  ["draft", "cancelled"].includes(status) ? status : cycles.every(cycle => cycle.isReleased) ? "released" : "withheld";

export const generateWithholdingCycles = ({ fromDate, numberOfWithholdingCycles: count, payrollFrequency }) => {
  const start = new Date(fromDate);
  if (!Number.isFinite(start.getTime()) || !Number.isInteger(count) || count < 1 || !PAYROLL_FREQUENCIES.includes(payrollFrequency)) {
    throw new Error("A valid From Date, payroll frequency and positive integer cycle count are required");
  }
  const windowEnd = new Date(addPayrollPeriods(start, payrollFrequency, count).getTime() - 86400000);
  const cycles = [];
  let cursor = start;
  // Walk one real frequency period each time, never divide the overall span.
  // Exactly N rows, including Daily x 1; final row absorbs month-end clamp drift.
  for (let index = 0; index < count; index++) {
    const next = addPayrollPeriods(cursor, payrollFrequency);
    const toDate = index === count - 1 ? windowEnd : new Date(next.getTime() - 86400000);
    cycles.push({ fromDate: cursor, toDate, isReleased: false });
    cursor = next;
  }
  return cycles;
};
