import assert from "node:assert/strict";
import { calculateHraExemption, getComponentPay, validateHouseRentDates } from "./hraExemptionCalc.js";

console.log("Running hraExemptionCalc.test.js...");
assert.equal(getComponentPay("Daily", 100, "2026-04-01", "2026-04-03"), 300);
assert.equal(getComponentPay("Weekly", 1000, "2026-04-01", "2026-04-14"), 2000);
assert.equal(getComponentPay("Fortnightly", 2000, "2026-04-01", "2026-04-28"), 4000);
assert.equal(getComponentPay("Monthly", 10000, "2026-04-01", "2026-05-31"), 20000);
assert.equal(getComponentPay("Bimonthly", 20000, "2026-04-01", "2026-05-31"), 20000);
assert.throws(() => getComponentPay("Quarterly", 1, "2026-04-01", "2026-04-01"), /unrecognized payroll frequency/);

{
  const result = calculateHraExemption({ annualBasic: 600000, annualHra: 240000, monthlyHouseRent: 30000, rentedInMetroCity: true });
  assert.deepEqual(result, { annualExemption: 240000, monthlyExemption: 20000 });
}
{
  const result = calculateHraExemption({ annualBasic: 600000, annualHra: 300000, monthlyHouseRent: 10000, rentedInMetroCity: false });
  assert.deepEqual(result, { annualExemption: 60000, monthlyExemption: 5000 });
}
assert.throws(() => validateHouseRentDates("2026-04-01", "2026-04-14"), /atleast 15 days/);
validateHouseRentDates("2026-04-01", "2026-04-15");
console.log("hraExemptionCalc.test.js passed");
