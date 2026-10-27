// Leave expiry writes off what is left, not the whole grant (ADR-053, review
// finding R3-2): a grant of 12 with 3 days taken expires 9, and the next
// period's balance is its own grant, not 3 short. DB-free: the models are
// in-memory stand-ins; the balance runs the real $match getLeaveBalance builds.
import assert from "node:assert/strict";
import mongoose from "mongoose";
import LeaveAllocation from "../models/LeaveAllocation.js";
import LeaveLedgerEntry from "../models/LeaveLedgerEntry.js";
import LeaveType from "../models/LeaveType.js";
import LeaveEncashment from "../models/LeaveEncashment.js";
import SchedulerRunLog from "../models/SchedulerRunLog.js";
import { getLeaveBalance } from "../utils/leaveBalance.js";
import { processExpiredAllocations } from "./processExpiredAllocations.js";
import { runDueJobs } from "./leaveScheduler.js";

const same = (a, b) => String(a) === String(b);
const OPERATORS = {
  $ne: (value, arg) => !same(value ?? null, arg ?? null),
  $in: (value, arg) => arg.some((item) => same(value, item)),
  $gt: (value, arg) => value > arg,
  $gte: (value, arg) => value != null && value >= arg,
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

// 5. An encashable type's leftover is encashed or expired, never both: the
//    scheduler's own pass over an allocation that ended yesterday, with 5 days
//    left and a 3-day encashment limit, encashes 3 and expires 2 — before the
//    fix expiry ran first and wrote off all 5, then encashment debited 3 more.
const encashable = { _id: leaveTypeId, allowEncashment: true, maxEncashableLeaves: 3, nonEncashableLeaves: 0 };
let encashments = [];
LeaveType.find = (filter) => ({ lean: async () => (filter.allowEncashment ? [encashable] : []) });
LeaveEncashment.findOne = async (filter) => encashments.find((doc) => matches(doc, filter)) ?? null;
LeaveEncashment.create = async (doc) => { const saved = { ...doc, _id: new mongoose.Types.ObjectId() }; encashments.push(saved); return saved; };
SchedulerRunLog.findOne = async () => null;
SchedulerRunLog.findOneAndUpdate = async () => null;

const now = new Date();
const yesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
const ended = { ...allocation("2025-01-01", "2025-12-31"), fromDate: new Date(yesterday.getTime() - 300 * 864e5), toDate: yesterday };
const following = { ...allocation("2025-01-01", "2025-12-31"), fromDate: now, toDate: day("2099-12-31") };
const earlier = (days) => new Date(yesterday.getTime() - days * 864e5);
allocations = [ended, following];
ledger = [
  { ...grant(ended, 8, earlier(299)), createdAt: earlier(299) },
  { ...leave(-3, "2025-01-01", earlier(100)), fromDate: earlier(90), toDate: earlier(90) },
  grant(following, 12, now),
];
encashments = [];
await runDueJobs();
const encashed = ledger.filter((row) => row.transactionType === "LeaveEncashment");
assert.equal(encashments.length, 1, "one encashment drafted");
assert.equal(encashments[0].encashmentDays, 3, "encashes up to the type's limit");
assert.deepEqual(encashed.map((row) => row.leaves), [-3], "one encashment debit of 3");
assert.deepEqual(expiryRows().map((row) => row.leaves), [-2], "expires only what encashment left (5 - 3), not all 5");
assert.equal(ended.status, "expired");
assert.equal(await getLeaveBalance(employeeId, leaveTypeId), 12, "next period: its own 12, not 3 short");

console.log("processExpiredAllocations: expiry nets leave taken, next period balance, unused, spent, carry-forward and encash-then-expire checks passed");
