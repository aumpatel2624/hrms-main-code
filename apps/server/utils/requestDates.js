/**
 * Dates on a request (leave, compensatory leave, expense, shift, attendance)
 * must be real calendar days in a sensible year. JavaScript reads
 * "2026-02-30" as 2 March without complaint, and nothing stopped a leave in
 * year 9999 (29 Oct security test, low).
 */
export const MIN_REQUEST_YEAR = 2000;
export const MAX_REQUEST_YEAR = 2100;

/** Why `value` is not a usable request date, or null. A blank value is left to the required-field checks. */
export const requestDateProblem = (value, label) => {
  if (value === undefined || value === null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return `${label} is not a valid date`;
  // The day as typed, before Date rolls it over — "2026-02-30" stays 30 Feb.
  const typed = typeof value === "string" && value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const year = typed ? Number(typed[1]) : date.getUTCFullYear();
  if (typed) {
    const month = Number(typed[2]);
    const day = Number(typed[3]);
    if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) {
      return `${label} is not a real calendar date`;
    }
  }
  if (year < MIN_REQUEST_YEAR || year > MAX_REQUEST_YEAR) {
    return `${label} must be between ${MIN_REQUEST_YEAR} and ${MAX_REQUEST_YEAR}`;
  }
  return null;
};

/** The first problem among `labels` ({ field: "Label" }) on `data`, or null. */
export const requestDatesProblem = (data, labels) => {
  for (const [field, label] of Object.entries(labels)) {
    const problem = requestDateProblem(data?.[field], label);
    if (problem) return problem;
  }
  return null;
};
