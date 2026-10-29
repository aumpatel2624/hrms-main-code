// Leave recorded after go-live (pre-production simulation): an allocation
// counts from the start of the period it covers, not from the day it was
// typed in, so the 2026 allocation entered on 27 Oct covers Sick Leave on
// 15-16 Sep. DB-free: the ledger is an in-memory stand-in that evaluates the
// real $match getLeaveBalance builds.
import assert from "node:assert/strict";
import mongoose from "mongoose";
import LeaveLedgerEntry from "../models/LeaveLedgerEntry.js";
import { getLeaveBalance } from "./leaveBalance.js";

const same = (a, b) => String(a) === String(b);
const OPERATORS = {
  $in: (value, arg) => arg.some((x) => same(value, x)),
  $ne: (value, arg) => !same(value ?? null, arg ?? null),
  $gt: (value, arg) => value > arg,
  $lt: (value, arg) => value < arg,
  $lte: (value, arg) => value != null && value <= arg,
};
const matches = (row, filter) => Object.entries(filter).every(([key, cond]) => {
  if (key === "$or") return cond.some((part) => matches(row, part));
  if (key === "$nor") return !cond.some((part) => matches(row, part));
  if (cond && typeof cond === "object" && !(cond instanceof mongoose.Types.ObjectId)) {
    return Object.entries(cond).every(([op, arg]) => {
      if (!OPERATORS[op]) throw new Error(`stand-in query: unsupported ${op}`);
      return OPERATORS[op](row[key], arg);
    });
  }
  return same(row[key] ?? null, cond ?? null);
});

let ledger = [];
LeaveLedgerEntry.aggregate = async ([{ $match }]) => {
  const rows = ledger.filter((row) => matches(row, $match));
  return rows.length ? [{ balance: rows.reduce((sum, row) => sum + row.leaves, 0) }] : [];
};

const employeeId = new mongoose.Types.ObjectId();
const leaveTypeId = new mongoose.Types.ObjectId();
const day = (iso) => new Date(`${iso}T00:00:00.000Z`);
const row = (leaves, fromDate, toDate, createdAt, extra = {}) => ({
  employeeId, leaveTypeId, transactionType: "LeaveAllocation", leaves,
  fromDate: day(fromDate), toDate: day(toDate), createdAt: new Date(createdAt), isExpired: false, ...extra,
});
const sickLeave = (to) => getLeaveBalance(employeeId, leaveTypeId, day(to), { forConsumption: true });

// 1. The 2026 allocation of 8 days, recorded on 27 Oct, covers 15-16 Sep.
ledger = [row(8, "2026-01-01", "2026-12-31", "2026-10-27T10:00:00Z")];
assert.equal(await sickLeave("2026-09-16"), 8, "an allocation covers leave dated before it was recorded");
assert.equal(await getLeaveBalance(employeeId, leaveTypeId, day("2026-09-16")), 8, "plain balance as of a date in its period");

// 2. Next year's allocation, recorded early, does not count yet.
ledger.push(row(10, "2027-01-01", "2027-12-31", "2026-10-27T10:05:00Z"));
assert.equal(await sickLeave("2026-12-20"), 8, "a future period's allocation is not spendable now");

// 3. Leave already taken or booked is gone, whenever it was recorded and
//    whatever its date: 2 days for 15-16 Sep (recorded today) and 3 days in
//    Nov (recorded in Oct) leave 3 for a 1 Sep check, not 8.
ledger.push(
  { ...row(-2, "2026-09-15", "2026-09-16", "2026-10-27T11:00:00Z"), transactionType: "LeaveApplication" },
  { ...row(-3, "2026-11-10", "2026-11-12", "2026-10-20T09:00:00Z"), transactionType: "LeaveApplication" },
);
assert.equal(await sickLeave("2026-09-01"), 3, "debits recorded later or dated later still count when consuming");

// 4. Expiry stays as it was: the expiry row counts from when it was written.
ledger = [
  row(8, "2025-01-01", "2025-12-31", "2025-01-02T00:00:00Z"),
  row(-8, "2025-12-31", "2025-12-31", "2026-01-01T00:30:00Z", { isExpired: true }),
];
assert.equal(await getLeaveBalance(employeeId, leaveTypeId, day("2025-12-31")), 8, "not expired yet on its last day");
assert.equal(await getLeaveBalance(employeeId, leaveTypeId, day("2026-01-02")), 0, "expired once the expiry row is written");

// 6. A Leave Adjustment counts from its own date (29 Oct P6): reducing
//    next year's allocation, recorded now, leaves this year's balance and a
//    this-year leave check alone.
ledger = [
  row(8, "2026-01-01", "2026-12-31", "2026-01-01T00:00:00Z"),
  row(10, "2027-01-01", "2027-12-31", "2026-10-27T10:05:00Z"),
  { ...row(-6, "2027-01-01", "2027-01-01", "2026-10-28T09:00:00Z"), transactionType: "LeaveAdjustment" },
];
assert.equal(await getLeaveBalance(employeeId, leaveTypeId, day("2026-11-01")), 8, "next year's reduction does not count this year");
assert.equal(await sickLeave("2026-11-01"), 8, "nor in a this-year leave check");
assert.equal(await getLeaveBalance(employeeId, leaveTypeId, day("2027-02-01")), 12, "it counts from its own date");

// 5. Soft-deleted rows never count (ADR-024's aggregate trap).
ledger = [row(8, "2026-01-01", "2026-12-31", "2026-01-01T00:00:00Z", { isDeleted: true })];
assert.equal(await sickLeave("2026-09-16"), 0, "a soft-deleted allocation is excluded");

console.log("leaveBalancePeriod: allocation period, future allocations, consumption, expiry and soft-delete checks passed");
