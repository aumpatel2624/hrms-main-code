// Leave expiry writes off what is left, not the whole grant (ADR-053, review
// finding R3-2): a grant of 12 with 3 days taken expires 9, and the next
// period's balance is its own grant, not 3 short. DB-free: the models are
// in-memory stand-ins; the balance runs the real $match getLeaveBalance builds.
import assert from "node:assert/strict";
import mongoose from "mongoose";
import LeaveAllocation from "../models/LeaveAllocation.js";
import LeaveLedgerEntry from "../models/LeaveLedgerEntry.js";
import { getLeaveBalance } from "../utils/leaveBalance.js";
import { processExpiredAllocations } from "./processExpiredAllocations.js";

const same = (a, b) => String(a) === String(b);
const OPERATORS = {
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
let allocations = [];
const live = () => ledger.filter((row) => !row.isDeleted);
LeaveLedgerEntry.aggregate = async ([{ $match }]) => {
  const rows = ledger.filter((row) => matches(row, $match));
  return rows.length ? [{ balance: rows.reduce((sum, row) => sum + row.leaves, 0) }] : [];
};
LeaveLedgerEntry.find = (filter) => ({ lean: async () => live().filter((row) => matches(row, filter)) });
LeaveLedgerEntry.create = async (doc) => { ledger.push({ ...doc, createdAt: new Date() }); };
LeaveAllocation.find = async (filter) => allocations.filter((a) => matches(a, filter));

const employeeId = new mongoose.Types.ObjectId();
const leaveTypeId = new mongoose.Types.ObjectId();
const day = (iso) => new Date(`${iso}T00:00:00.000Z`);
const allocation = (fromDate, toDate) => ({
  _id: new mongoose.Types.ObjectId(), employeeId, leaveTypeId, fromDate: day(fromDate), toDate: day(toDate),
  status: "active", async save() {},
});
const grant = (alloc, leaves, createdAt) => ({
  employeeId, leaveTypeId, transactionType: "LeaveAllocation", transactionId: alloc._id, leaves,
  fromDate: alloc.fromDate, toDate: alloc.toDate, createdAt: new Date(createdAt), isExpired: false,
});
const leave = (leaves, fromDate, createdAt) => ({
  employeeId, leaveTypeId, transactionType: "LeaveApplication", transactionId: new mongoose.Types.ObjectId(), leaves,
  fromDate: day(fromDate), toDate: day(fromDate), createdAt: new Date(createdAt), isExpired: false,
});
const expiryRows = () => ledger.filter((row) => row.isExpired);

// 1. A grant of 12 with 3 days taken expires 9, and the next period's
//    balance is its own 12 — before the fix the whole 12 expired, leaving 9.
const year2025 = allocation("2025-01-01", "2025-12-31");
const year2026 = allocation("2026-01-01", "2026-12-31");
year2026.toDate = day("2099-12-31"); // still running whenever this test runs
allocations = [year2025, year2026];
ledger = [
  grant(year2025, 12, "2025-01-02T00:00:00Z"),
  leave(-3, "2025-03-10", "2025-03-01T00:00:00Z"),
  grant(year2026, 12, "2026-01-02T00:00:00Z"),
  leave(-2, "2026-02-10", "2026-02-01T00:00:00Z"), // next period's leave is not last period's
];
assert.deepEqual(await processExpiredAllocations(), { processed: 1 });
assert.equal(expiryRows().length, 1, "one expiry row");
assert.equal(expiryRows()[0].leaves, -9, "expires what is left (12 - 3), not the whole grant");
assert.equal(year2025.status, "expired");
assert.equal(year2026.status, "active", "a running allocation is not expired");
assert.equal(await getLeaveBalance(employeeId, leaveTypeId), 10, "next period: its own 12 less the 2 taken in it");
assert.equal(await getLeaveBalance(employeeId, leaveTypeId, new Date(), { forConsumption: true }), 10, "and leave can be applied against it");

// 2. Nothing taken: the whole grant expires, as before.
const untouched = allocation("2025-01-01", "2025-12-31");
allocations = [untouched];
ledger = [grant(untouched, 12, "2025-01-02T00:00:00Z")];
await processExpiredAllocations();
assert.equal(expiryRows()[0].leaves, -12, "an unused grant expires in full");

// 3. Everything taken (or more, e.g. allowed-negative leave): nothing to
//    write off, never a positive "expiry".
const spent = allocation("2025-01-01", "2025-12-31");
allocations = [spent];
ledger = [grant(spent, 5, "2025-01-02T00:00:00Z"), leave(-6, "2025-06-01", "2025-05-20T00:00:00Z")];
await processExpiredAllocations();
assert.equal(expiryRows().length, 0, "no expiry row when nothing is left");
assert.equal(spent.status, "expired");

// 4. Carry-forward and a soft-deleted (cancelled) application: the
//    carry-forward portion is the allocation's own, the cancelled leave is not taken.
const carried = allocation("2025-01-01", "2025-12-31");
allocations = [carried];
ledger = [
  grant(carried, 10, "2025-01-02T00:00:00Z"),
  { ...grant(carried, 4, "2025-01-02T00:00:00Z"), isCarryForward: true },
  leave(-5, "2025-04-01", "2025-03-20T00:00:00Z"),
  { ...leave(-7, "2025-05-01", "2025-04-20T00:00:00Z"), isDeleted: true },
];
await processExpiredAllocations();
assert.equal(expiryRows()[0].leaves, -9, "14 granted (10 + 4 carried) less 5 taken; the cancelled 7 do not count");

console.log("processExpiredAllocations: expiry nets leave taken, next period balance, unused, spent and carry-forward checks passed");
