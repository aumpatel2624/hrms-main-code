// DB-backed, like approvers.test.js — getLeaveBalance is a real aggregation
// against real documents, and the whole point of this test is proving the
// soft-delete trap (ADR-024) is actually closed. Not wired into `npm test`;
// run directly: node apps/server/utils/leaveBalance.test.js
import "../models/softDelete.js";
import "../models/auditPlugin.js";

import assert from "node:assert/strict";
import mongoose from "mongoose";
import dotenv from "dotenv";
import LeaveLedgerEntry from "../models/LeaveLedgerEntry.js";
import { getLeaveBalance } from "./leaveBalance.js";

dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.DATABASE, { serverSelectionTimeoutMS: 10000 });

  const employeeId = new mongoose.Types.ObjectId();
  const leaveTypeId = new mongoose.Types.ObjectId();
  const transactionId = new mongoose.Types.ObjectId();

  try {
    await LeaveLedgerEntry.create({
      employeeId, leaveTypeId, transactionType: "LeaveAllocation", transactionId,
      leaves: 12, fromDate: new Date("2026-01-01"), toDate: new Date("2026-12-31"),
    });
    const afterFirst = await getLeaveBalance(employeeId, leaveTypeId);
    assert.equal(afterFirst, 12);

    const toDelete = await LeaveLedgerEntry.create({
      employeeId, leaveTypeId, transactionType: "LeaveAllocation", transactionId,
      leaves: 5, fromDate: new Date("2026-01-01"), toDate: new Date("2026-12-31"),
    });
    const afterSecond = await getLeaveBalance(employeeId, leaveTypeId);
    assert.equal(afterSecond, 17);

    // Soft-delete the second row — the balance must fall back to 12. This is
    // the exact trap ADR-024 flags: .aggregate() does not run the
    // soft-delete plugin's query middleware, so getLeaveBalance's own
    // $match must exclude isDeleted rows itself.
    await LeaveLedgerEntry.findByIdAndUpdate(toDelete._id, { isDeleted: true });
    const afterSoftDelete = await getLeaveBalance(employeeId, leaveTypeId);
    assert.equal(afterSoftDelete, 12, "soft-deleted ledger row must be excluded from the balance sum");

    console.log("leaveBalance: all checks passed");
  } finally {
    await LeaveLedgerEntry.deleteMany({ employeeId });
    await mongoose.disconnect();
  }
};

run().catch(async (error) => {
  console.error("leaveBalance test failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
