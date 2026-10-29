// Leave ledger, onboarding and payroll re-run — the 29 Oct functional test
// (P6, P8, P12):
//   1. one allocation per employee, leave type and day; "Add unused leaves
//      from previous allocations" works on a manual allocation; deleting an
//      allocation takes its days out of the balance; the Leave Allocation list
//      names the leave type,
//   2. an adjustment counts inside its allocation's period, and an equal
//      opposite adjustment on the same allocation reverses it,
//   3. an onboarding, and Create Employee from it, needs an Accepted Job Offer;
//      one offer onboards one hire; a linked onboarding makes no second employee,
//   4. a re-run blocked by cancelled slips says how to clear them.
// Calls the real controllers over in-memory stand-ins, like decisionIntegrity.test.js.
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Branch from "../../models/Branch.js";
import Department from "../../models/Department.js";
import Designation from "../../models/Designation.js";
import Employee from "../../models/Employee.js";
import EmployeeOnboarding from "../../models/EmployeeOnboarding.js";
import JobApplicant from "../../models/JobApplicant.js";
import JobOffer from "../../models/JobOffer.js";
import LeaveAdjustment from "../../models/LeaveAdjustment.js";
import LeaveAllocation from "../../models/LeaveAllocation.js";
import LeaveLedgerEntry from "../../models/LeaveLedgerEntry.js";
import LeaveType from "../../models/LeaveType.js";
import SalarySlip from "../../models/SalarySlip.js";
import { getLeaveBalance } from "../../utils/leaveBalance.js";
import {
  adjustLeaveAllocation, createLeaveAllocation, deleteLeaveAllocation, listLeaveAllocationByParams,
} from "./leaves.controller.js";
import { createLeaveAdjustment } from "./leavesTransactions.controller.js";
import {
  createEmployeeOnboarding, makeEmployeeFromOnboarding, updateEmployeeOnboarding,
} from "./employeeOnboarding.controller.js";
import { createEmployee } from "./employee.controller.js";
import { createSalarySlipForEmployee } from "./payrollRun.controller.js";

// ---------------------------------------------------------------- stand-ins --
const same = (a, b) => String(a) === String(b);
const OPERATORS = {
  $in: (value, arg) => arg.some((x) => same(value, x)),
  $ne: (value, arg) => !same(value ?? null, arg ?? null),
  $gt: (value, arg) => value != null && value > arg,
  $gte: (value, arg) => value != null && value >= arg,
  $lt: (value, arg) => value != null && value < arg,
  $lte: (value, arg) => value != null && value <= arg,
  $exists: (value, arg) => (value !== undefined) === arg,
};
const isOperators = (cond) => cond && typeof cond === "object" && !Array.isArray(cond) && !(cond instanceof mongoose.Types.ObjectId)
  && !(cond instanceof Date) && Object.keys(cond).length > 0 && Object.keys(cond).every((key) => key.startsWith("$"));
const matches = (row, filter = {}) => Object.entries(filter).every(([key, cond]) => {
  if (key === "$and") return cond.every((part) => matches(row, part));
  if (key === "$or") return cond.some((part) => matches(row, part));
  if (key === "$nor") return !cond.some((part) => matches(row, part));
  if (!isOperators(cond)) return same(row[key] ?? null, cond ?? null);
  return Object.entries(cond).every(([op, arg]) => {
    if (!OPERATORS[op]) throw new Error(`stand-in query: unsupported ${op}`);
    return OPERATORS[op](row[key], arg);
  });
});
const notDeleted = (rows) => rows.filter((row) => row.isDeleted !== true);
const query = (result) => {
  const chain = {
    select: () => chain, populate: () => chain, lean: () => chain,
    sort: (order) => {
      const [[key, dir]] = Object.entries(order);
      if (Array.isArray(result)) result.sort((a, b) => (a[key] - b[key]) * dir);
      return chain;
    },
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return chain;
};
const plain = (row) => Object.fromEntries(Object.entries(row).filter(([, value]) => typeof value !== "function"));
const asDoc = (row) => Object.assign(row, {
  save: async () => row,
  populate: async () => row,
  toObject: () => plain(row),
});
const stub = (Model, rows) => {
  rows.forEach(asDoc);
  Model.find = (filter) => query(notDeleted(rows).filter((row) => matches(row, filter)));
  // findOne(...).sort(...) picks the first after sorting.
  Model.findOne = (filter) => {
    const found = notDeleted(rows).filter((row) => matches(row, filter));
    const chain = query(found);
    chain.then = (resolve, reject) => Promise.resolve(found[0] ?? null).then(resolve, reject);
    return chain;
  };
  Model.findById = (id) => query(notDeleted(rows).find((row) => same(row._id, id)) ?? null);
  Model.findByIdAndUpdate = async (id, update) => {
    const row = rows.find((candidate) => same(candidate._id, id));
    if (row) Object.assign(row, update.$set ?? update);
    return row ?? null;
  };
  // Date fields arrive as strings from a request body; Mongoose would cast them.
  Model.create = async (data) => {
    const cast = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, /Date$/.test(key) && typeof value === "string" ? new Date(value) : value]));
    const row = asDoc({ _id: oid(), createdAt: new Date(), ...cast });
    rows.push(row);
    return row;
  };
  Model.updateOne = async (filter, update) => {
    const row = notDeleted(rows).find((candidate) => matches(candidate, filter));
    if (row) Object.assign(row, update.$set ?? update);
    return { matchedCount: row ? 1 : 0 };
  };
  Model.updateMany = async (filter, update) => {
    notDeleted(rows).filter((row) => matches(row, filter)).forEach((row) => Object.assign(row, update.$set ?? update));
    return {};
  };
  return rows;
};
const fakeRes = () => ({
  statusCode: 200, body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = JSON.parse(JSON.stringify(body)); return this; },
});
const call = async (handler, req) => {
  const res = fakeRes();
  await handler({ params: {}, body: {}, query: {}, user: { role: "ADMIN" }, ...req }, res);
  return res;
};
// The delete guard counts references across every model; none here.
for (const name of mongoose.modelNames()) mongoose.model(name).countDocuments = async () => 0;

// ----------------------------------------------------------------- fixtures --
const oid = () => new mongoose.Types.ObjectId();
const day = (iso) => new Date(`${iso}T00:00:00.000Z`);
const companyId = oid();
const ekta = { _id: oid(), employeeName: "Ekta Bansal", companyId, dateOfJoining: day("2020-01-01"), status: "Active" };
const earned = { _id: oid(), leaveTypeName: "Earned Leave", maxLeavesAllowed: 24 };
const casual = { _id: oid(), leaveTypeName: "Casual Leave", isCarryForward: true, maximumCarryForwardedLeaves: 5 };
const sick = { _id: oid(), leaveTypeName: "Sick Leave" };

stub(Employee, [ekta]);
stub(LeaveType, [earned, casual, sick]);
const allocations = stub(LeaveAllocation, []);
const ledger = stub(LeaveLedgerEntry, []);
LeaveLedgerEntry.aggregate = async ([{ $match }]) => {
  const rows = ledger.filter((row) => matches(row, $match));
  return rows.length ? [{ balance: rows.reduce((sum, row) => sum + row.leaves, 0) }] : [];
};
stub(LeaveAdjustment, []);

const allocate = async (leaveType, fromDate, toDate, newLeavesAllocated, extra = {}) => {
  const res = await call(createLeaveAllocation, {
    body: { employeeId: ekta._id, leaveTypeId: leaveType._id, fromDate, toDate, newLeavesAllocated, ...extra },
  });
  return { res, allocation: res.body?.data?._id && allocations.find((row) => same(row._id, res.body.data._id)) };
};
const balance = (leaveType, iso) => getLeaveBalance(ekta._id, leaveType._id, day(iso));

// ------------------------------------------------- 1. allocations (P6 a, b, e) --
const { allocation: el2098 } = await allocate(earned, "2098-01-01", "2098-12-31", 20);
const { allocation: el2099 } = await allocate(earned, "2099-01-01", "2099-12-31", 24);
assert.ok(el2098 && el2099, "two allocations for separate years are accepted");

const overlapping = await allocate(earned, "2098-11-01", "2098-12-31", 2);
assert.equal(overlapping.res.statusCode, 409, "a second allocation over the same dates is refused");
assert.match(overlapping.res.body.message, /already has Earned Leave allocated for 2098-01-01 – 2098-12-31/);
assert.equal(await balance(earned, "2098-12-01"), 20, "and adds nothing to the balance");

// Carry-forward on a manual allocation: what was left of the previous one, capped at 5.
await allocate(casual, "2096-01-01", "2096-12-31", 8);
const carried = await allocate(casual, "2097-01-01", "2097-12-31", 6, { carryForward: true });
assert.equal(carried.res.statusCode, 201, carried.res.body?.message);
assert.equal(carried.allocation.unusedLeaves, 5, "unused leaves are carried forward, up to the leave type's maximum");
assert.equal(carried.allocation.totalLeavesAllocated, 11);
assert.ok(ledger.some((row) => same(row.transactionId, carried.allocation._id) && row.isCarryForward && row.leaves === 5), "the carried leaves are in the ledger");
const notCarried = await allocate(sick, "2097-01-01", "2097-12-31", 6, { carryForward: true });
assert.equal(notCarried.res.statusCode, 400, "a leave type that does not carry forward refuses the tick");

// Deleting an allocation takes its days out of the balance.
const { allocation: sick2096 } = await allocate(sick, "2096-01-01", "2096-12-31", 7);
assert.equal(await balance(sick, "2096-06-01"), 7);
const deleted = await call(deleteLeaveAllocation, { params: { leaveAllocationId: sick2096._id } });
assert.equal(deleted.statusCode, 200, deleted.body?.message);
assert.equal(await balance(sick, "2096-06-01"), 0, "a deleted allocation's days no longer count");

// The list names the leave type.
let pipeline = null;
LeaveAllocation.aggregate = async (stages) => { pipeline = stages; return [{ count: 0, data: [] }]; };
await call(listLeaveAllocationByParams, { body: {} });
assert.ok(pipeline.some((stage) => stage.$addFields?.leaveTypeName), "the Leave Allocation list adds leaveTypeName");

// ------------------------------------------------- 2. adjustments (P6 c, d) --
// Reduce next year's allocation by 15, posted this year.
const reduce = await call(createLeaveAdjustment, {
  body: { employeeId: ekta._id, leaveTypeId: earned._id, leaveAllocationId: el2099._id, leavesToAdjust: 15, adjustmentType: "Reduce", postingDate: "2098-06-01" },
});
assert.equal(reduce.statusCode, 201, reduce.body?.message);
const reduceRow = ledger.find((row) => row.transactionType === "LeaveAdjustment");
assert.equal(reduceRow.fromDate.toISOString().slice(0, 10), "2099-01-01", "posted inside the chosen allocation's period");
assert.equal(await balance(earned, "2098-07-01"), 20, "this year's balance is untouched by next year's reduction");
assert.equal(await getLeaveBalance(ekta._id, earned._id, day("2098-07-01"), { forConsumption: true }), 20, "and so is a leave application's check");
assert.equal(await balance(earned, "2099-02-01"), 29, "next year's allocation is 15 lower");

// The equal opposite adjustment on the same allocation reverses it.
const reverse = await call(createLeaveAdjustment, {
  body: { employeeId: ekta._id, leaveTypeId: earned._id, leaveAllocationId: el2099._id, leavesToAdjust: 15, adjustmentType: "Allocate", postingDate: "2099-03-01" },
});
assert.equal(reverse.statusCode, 201, reverse.body?.message);
assert.equal(await balance(earned, "2099-03-02"), 44, "the reduction is reversed");
const tooMuch = await call(createLeaveAdjustment, {
  body: { employeeId: ekta._id, leaveTypeId: earned._id, leaveAllocationId: el2099._id, leavesToAdjust: 1, adjustmentType: "Allocate" },
});
assert.equal(tooMuch.statusCode, 400, "beyond the leave type's maximum for that allocation is still refused");

const otherType = await call(createLeaveAdjustment, {
  body: { employeeId: ekta._id, leaveTypeId: casual._id, leaveAllocationId: el2099._id, leavesToAdjust: 1, adjustmentType: "Allocate" },
});
assert.equal(otherType.statusCode, 400, "the allocation must be this employee's, of this leave type");

// /adjust on next year's allocation also waits for its period.
el2099.status = "active"; // the schema default the stand-in does not apply
const adjusted = await call(adjustLeaveAllocation, { params: { leaveAllocationId: el2099._id }, body: { newLeavesAllocated: 20 } });
assert.equal(adjusted.statusCode, 200, adjusted.body?.message);
assert.equal(await balance(earned, "2098-07-01"), 20, "an /adjust of next year's allocation leaves this year alone");

// --------------------------------------------------------- 3. onboarding (P8) --
const applicant = { _id: oid(), applicantName: "Rohan Mehta" };
const kiran = { _id: oid(), applicantName: "Kiran Shah" };
const rejectedOffer = { _id: oid(), jobApplicantId: applicant._id, companyId, status: "Rejected" };
const acceptedOffer = { _id: oid(), jobApplicantId: kiran._id, companyId, status: "Accepted" };
stub(JobApplicant, [applicant, kiran]);
const offers = stub(JobOffer, [rejectedOffer, acceptedOffer]);
const onboardings = stub(EmployeeOnboarding, []);
const onboardingBody = (who, offer) => ({ jobApplicantId: who._id, jobOfferId: offer._id, dateOfJoining: "2098-01-05", boardingBeginsOn: "2098-01-01", activities: [] });

const fromRejected = await call(createEmployeeOnboarding, { body: onboardingBody(applicant, rejectedOffer) });
assert.equal(fromRejected.statusCode, 400, "an onboarding from a Rejected offer is refused");
assert.match(fromRejected.body.message, /Accepted.*Rejected/);
assert.equal(onboardings.length, 0);

const fromAccepted = await call(createEmployeeOnboarding, { body: onboardingBody(kiran, acceptedOffer) });
assert.equal(fromAccepted.statusCode, 201, fromAccepted.body?.message);

// A second onboarding moved onto the same offer.
const leftover = asDoc({ _id: oid(), jobApplicantId: applicant._id, jobOfferId: rejectedOffer._id, companyId, activities: [], employeeId: null });
onboardings.push(leftover);
const moved = await call(updateEmployeeOnboarding, { params: { onboardingId: leftover._id }, body: { jobApplicantId: kiran._id, jobOfferId: acceptedOffer._id } });
assert.equal(moved.statusCode, 400, "one offer onboards one hire");
assert.match(moved.body.message, /already has an Employee Onboarding/);

// Create Employee: refused for the rejected-offer leftover and once linked.
const fromLeftover = await call(makeEmployeeFromOnboarding, { params: { onboardingId: leftover._id } });
assert.equal(fromLeftover.statusCode, 409, "Create Employee refuses a hire whose offer is not Accepted");
const kiranOnboarding = onboardings.find((row) => same(row.jobApplicantId, kiran._id));
assert.equal((await call(makeEmployeeFromOnboarding, { params: { onboardingId: kiranOnboarding._id } })).statusCode, 200);
kiranOnboarding.employeeId = oid();
assert.equal((await call(makeEmployeeFromOnboarding, { params: { onboardingId: kiranOnboarding._id } })).statusCode, 409, "a linked onboarding offers no second employee");

// Saving the Add Employee form for the rejected hire is refused too.
const departmentId = oid(); const designationId = oid(); const branchId = oid();
stub(Department, [{ _id: departmentId, companyId }]);
stub(Designation, [{ _id: designationId, companyId }]);
stub(Branch, [{ _id: branchId, companyId }]);
const hire = await call(createEmployee, {
  body: {
    employeeCode: "NUV099", employeeName: "Rohan Mehta", companyId, departmentId, designationId, branchId,
    dateOfJoining: "2098-01-05", email: "rohan@example.com", password: "x", roleId: oid(), jobApplicantId: applicant._id,
  },
});
assert.equal(hire.statusCode, 409, "an employee is not made from a rejected offer's onboarding");
assert.equal(offers.find((row) => same(row._id, rejectedOffer._id)).status, "Rejected", "and the offer is not flipped to Accepted");

// ------------------------------------------------------- 4. payroll re-run (P12) --
stub(SalarySlip, [{ _id: oid(), employeeId: ekta._id, startDate: day("2098-10-01"), endDate: day("2098-10-31"), status: "cancelled" }]);
await assert.rejects(
  createSalarySlipForEmployee({ employeeId: ekta._id, startDate: "2098-10-01", endDate: "2098-10-31" }),
  /delete the cancelled Payroll Entry from Payroll Entries \(its cancelled slips are deleted with it\)/,
  "a re-run blocked by a cancelled slip says how to clear it",
);

console.log("leaveOnboardingIntegrity.test.js: all assertions passed");
