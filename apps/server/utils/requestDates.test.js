// Request dates are real calendar days in a sensible year: a leave for
// "30 Feb 2026" was saved as 2 March, and one in year 9999 was accepted
// (29 Oct security test, low).
import assert from "node:assert/strict";
import { requestDateProblem, requestDatesProblem } from "./requestDates.js";

assert.equal(requestDateProblem("2026-02-30", "From Date"), "From Date is not a real calendar date");
assert.equal(requestDateProblem("2026-02-29", "From Date"), "From Date is not a real calendar date", "2026 is not a leap year");
assert.equal(requestDateProblem("2028-02-29", "From Date"), null, "2028 is");
assert.equal(requestDateProblem("2026-04-31T00:00:00.000Z", "To Date"), "To Date is not a real calendar date");
assert.equal(requestDateProblem("2026-13-01", "To Date"), "To Date is not a valid date");
assert.equal(requestDateProblem("9999-12-30", "To Date"), "To Date must be between 2000 and 2100");
assert.equal(requestDateProblem("1999-12-31", "To Date"), "To Date must be between 2000 and 2100");
assert.equal(requestDateProblem("2100-12-31", "To Date"), null);
assert.equal(requestDateProblem("not a date", "Posting Date"), "Posting Date is not a valid date");
assert.equal(requestDateProblem(new Date("2026-11-20"), "From Date"), null, "a stored Date passes");
assert.equal(requestDateProblem(new Date("9999-01-01"), "From Date"), "From Date must be between 2000 and 2100");
assert.equal(requestDateProblem("2026-11-20T00:00:00+05:30", "From Date"), null, "a time zone does not move the typed day");
for (const blank of [undefined, null, ""]) assert.equal(requestDateProblem(blank, "From Date"), null, "blank is the required checks' business");

assert.equal(requestDatesProblem({ fromDate: "2026-11-20", toDate: "2026-02-30" }, { fromDate: "From Date", toDate: "To Date" }), "To Date is not a real calendar date");
assert.equal(requestDatesProblem({ fromDate: "2026-11-20" }, { fromDate: "From Date", toDate: "To Date" }), null);

console.log("requestDates.test.js passed");
