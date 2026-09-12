import assert from "node:assert/strict";
import { computeExpenseTotals, computeTaxAmount } from "./expenseClaimCalc.js";

assert.equal(computeTaxAmount(18, 250), 45);
assert.equal(computeTaxAmount(null, 250), 0);
assert.deepEqual(computeExpenseTotals([{ amount: 100, sanctionedAmount: 90 }, { amount: 25, sanctionedAmount: 25 }], [{ taxAmount: 11.5 }]), {
  totalClaimedAmount: 125, totalSanctionedAmount: 115, totalTaxesAndCharges: 11.5, grandTotal: 126.5,
});
console.log("expenseClaimCalc tests passed");
