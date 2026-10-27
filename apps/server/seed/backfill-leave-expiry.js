/**
 * One-off backfill for ADR-053: before it, leave allocation expiry wrote off
 * the whole grant instead of what was left after the leave taken in its
 * period, so from the second period on a balance came out short (even
 * negative). This finds every expired allocation whose expiry row wrote off
 * more than was left and corrects that row to what was left
 * (`expiryCorrection`, utils/leaveExpiry.js) — or removes it (soft delete)
 * when nothing was left, as the job now writes no row then.
 *
 *   npm run backfill:leave-expiry            dry run: prints what it would change
 *   npm run backfill:leave-expiry -- --apply makes the changes
 *
 * Run once on each install after deploying ADR-053. Idempotent: a corrected
 * row is no longer more than what was left, so a second run changes nothing.
 * Only ever lowers a write-off; never touches a running allocation.
 */
// Must stay the first two imports — see seed/index.js.
import "../models/softDelete.js";
import "../models/auditPlugin.js";

import dotenv from "dotenv";
import mongoose from "mongoose";

import LeaveAllocation from "../models/LeaveAllocation.js";
import LeaveLedgerEntry from "../models/LeaveLedgerEntry.js";
import { expiryCorrection } from "../utils/leaveExpiry.js";

dotenv.config();

const apply = process.argv.includes("--apply");

const run = async () => {
  if (!process.env.DATABASE) {
    console.error("❌ DATABASE is not set in .env");
    process.exit(1);
  }
  mongoose.set("strictQuery", false);
  await mongoose.connect(process.env.DATABASE, { serverSelectionTimeoutMS: 10000 });
  console.log(`✅ DB connected (${apply ? "applying" : "dry run — pass --apply to change anything"})`);

  const allocations = await LeaveAllocation.find({ status: "expired" }).lean();
  let corrected = 0;
  for (const allocation of allocations) {
    const rows = await LeaveLedgerEntry.find({ employeeId: allocation.employeeId, leaveTypeId: allocation.leaveTypeId }).lean();
    const correction = expiryCorrection(allocation, rows);
    if (!correction) continue;
    if (correction.skip) {
      console.log(`⚠️  allocation ${allocation._id}: ${correction.skip}, left as is`);
      continue;
    }
    const { rowId, written, left } = correction;
    console.log(`${apply ? "✏️ " : "→ "} allocation ${allocation._id} (employee ${allocation.employeeId}): expiry ${rowId} wrote off ${written}, left was ${left}${left ? "" : " — removing it"}`);
    if (apply) {
      await LeaveLedgerEntry.updateOne({ _id: rowId }, left ? { leaves: -left } : { isDeleted: true });
    }
    corrected += 1;
  }

  console.log(`✅ ${allocations.length} expired allocation(s) checked, ${corrected} expiry row(s) ${apply ? "corrected" : "to correct"}`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("❌ Leave expiry backfill failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
