// The leave expiry backfill's detection (ADR-053): an expiry row that wrote
// off the whole grant when leave had been taken is found and corrected to
// what was left; a correct row — including one the backfill already fixed —
// is left alone, so a second run changes nothing. Pure, no DB.
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { expiryCorrection, leavesLeftToExpire } from "./leaveExpiry.js";

const id = () => new mongoose.Types.ObjectId();
const day = (iso) => new Date(`${iso}T00:00:00.000Z`);
const allocation = { _id: id(), fromDate: day("2025-01-01"), toDate: day("2025-12-31") };
const own = (leaves, extra = {}) => ({
  _id: id(), transactionType: "LeaveAllocation", transactionId: allocation._id, leaves,
  fromDate: allocation.fromDate, toDate: allocation.toDate, isExpired: false, ...extra,
});
const expiry = (leaves) => own(leaves, { fromDate: allocation.toDate, isExpired: true });
const debit = (transactionType, leaves, fromDate) => ({
  _id: id(), transactionType, transactionId: id(), leaves, fromDate: day(fromDate), toDate: day(fromDate), isExpired: false,
});

// 1. Over-written: 12 granted, 3 taken, 12 expired → correct it to 9.
const overWritten = expiry(-12);
let rows = [own(12), debit("LeaveApplication", -3, "2025-03-10"), overWritten];
assert.deepEqual(expiryCorrection(allocation, rows), { rowId: overWritten._id, written: 12, left: 9 });

// 2. Idempotent: once it says 9, nothing more to do.
rows = [own(12), debit("LeaveApplication", -3, "2025-03-10"), expiry(-9)];
assert.equal(expiryCorrection(allocation, rows), null, "a corrected row is left alone");

// 3. Nothing was left (all 12 taken) but 12 expired → remove the row (left 0).
const nothingLeft = expiry(-12);
rows = [own(12), debit("LeaveApplication", -12, "2025-06-01"), nothingLeft];
assert.deepEqual(expiryCorrection(allocation, rows), { rowId: nothingLeft._id, written: 12, left: 0 });

// 4. Only leave dated inside the period counts: next year's leave, a debit
//    from another allocation's rows and a positive adjustment do not.
rows = [
  own(12),
  debit("LeaveApplication", -4, "2026-01-05"),
  { ...debit("LeaveAllocation", -5, "2025-06-01"), transactionId: id() },
  debit("LeaveAdjustment", 2, "2025-07-01"),
  expiry(-12),
];
assert.equal(expiryCorrection(allocation, rows), null, "nothing in the period was taken: the full write-off was right");

// 5. Encashments and negative adjustments in the period are taken too; the
//    period's last day counts; carry-forward and /adjust deltas are the allocation's own.
rows = [
  own(10), own(3, { isCarryForward: true }), own(-1),
  debit("LeaveEncashment", -2, "2025-12-31"),
  debit("LeaveAdjustment", -1, "2025-08-01"),
];
assert.equal(leavesLeftToExpire(allocation, rows), 9, "10 + 3 carried - 1 adjusted - 2 encashed - 1 adjusted down");

// 6. Never under-corrects upward: a write-off below what was left is not raised.
rows = [own(12), expiry(-5)];
assert.equal(expiryCorrection(allocation, rows), null, "only an over-written row is changed");

// 7. No expiry row (the job wrote none because nothing was left): nothing to do.
rows = [own(5), debit("LeaveApplication", -5, "2025-04-01")];
assert.equal(expiryCorrection(allocation, rows), null);

// 8. Two expiry rows is not something the job writes: reported, not guessed at.
rows = [own(12), expiry(-12), expiry(-12)];
assert.deepEqual(expiryCorrection(allocation, rows), { skip: "2 expiry rows" });

console.log("leaveExpiry: backfill detection, idempotency, period dating, own rows and skip checks passed");
