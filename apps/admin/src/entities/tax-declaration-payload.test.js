import assert from "node:assert/strict";
import { taxDeclarationPayload } from "./tax-declaration-payload.js";

// What the form holds on create: the entered fields plus the read-only ones.
const created = taxDeclarationPayload({
    employeeId: "e1", payrollPeriodId: "p1", currency: "INR", monthlyHouseRent: "", rentedInMetroCity: false,
    declarations: [{ exemptionSubCategoryId: "s1", amount: 150000 }],
    annualHraExemption: "", monthlyHraExemption: "", hraAmount: "", totalDeclaredAmount: "", totalExemptionAmount: "", status: "",
});
assert.deepEqual(Object.keys(created).sort(), ["currency", "declarations", "employeeId", "monthlyHouseRent", "payrollPeriodId", "rentedInMetroCity"]);
assert.deepEqual(created.declarations, [{ exemptionSubCategoryId: "s1", amount: 150000 }], "declaration lines kept");

// On edit the form holds the whole stored record; only the entered fields go.
const edited = taxDeclarationPayload({
    _id: "d1", companyId: "c1", employeeId: "e1", payrollPeriodId: "p1", currency: "INR", status: "draft",
    totalDeclaredAmount: 150000, createdAt: "2026-10-27", updatedAt: "2026-10-27", __v: 0, declarations: [],
});
assert.deepEqual(Object.keys(edited).sort(), ["currency", "declarations", "employeeId", "payrollPeriodId"]);

console.log("tax-declaration-payload: all assertions passed");
