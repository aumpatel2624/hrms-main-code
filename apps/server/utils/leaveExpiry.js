/**
 * What an allocation's expiry writes off (ADR-053), shared by
 * `jobs/processExpiredAllocations.js` and the one-off
 * `seed/backfill-leave-expiry.js`. Pure: callers pass the employee's ledger
 * rows for the allocation's leave type (soft-deleted rows already excluded).
 *
 * Left to expire = the allocation's own rows (grant, carry-forward, `/adjust`
 * deltas) plus every leave debit dated inside the period it covers
 * (applications, encashments, negative adjustments), never below zero. This
 * is the same dating the live balance uses (INV-27, ADR-052): a grant covers
 * its period, and leave taken in that period is gone from it — so writing off
 * only what is left keeps the next period's balance from coming out short by
 * last period's leave.
 */
const same = (a, b) => String(a) === String(b);
const sum = (rows) => rows.reduce((total, row) => total + row.leaves, 0);

const isOwnRow = (allocation, row) => row.transactionType === "LeaveAllocation" && same(row.transactionId, allocation._id);

export const leavesLeftToExpire = (allocation, rows) => {
  const from = new Date(allocation.fromDate);
  const to = new Date(allocation.toDate);
  const own = rows.filter((row) => isOwnRow(allocation, row) && !row.isExpired);
  const taken = rows.filter((row) => row.transactionType !== "LeaveAllocation"
    && row.leaves < 0
    && !row.isExpired
    && row.fromDate && new Date(row.fromDate) >= from && new Date(row.fromDate) <= to);
  return Math.max(sum(own) + sum(taken), 0);
};

/**
 * The backfill's check: an expired allocation whose expiry row writes off
 * more than was left. Returns `null` when nothing needs changing (including a
 * second run after the fix), else the row to correct and the value it should
 * hold — `0` meaning "remove it", as the job writes no row when nothing is
 * left. More than one expiry row is never written by the job; it is reported,
 * not guessed at.
 */
export const expiryCorrection = (allocation, rows) => {
  const expiryRows = rows.filter((row) => isOwnRow(allocation, row) && row.isExpired);
  if (expiryRows.length === 0) return null;
  if (expiryRows.length > 1) return { skip: `${expiryRows.length} expiry rows` };
  const [row] = expiryRows;
  const written = -row.leaves;
  const left = leavesLeftToExpire(allocation, rows);
  if (written <= left) return null;
  return { rowId: row._id, written, left };
};
