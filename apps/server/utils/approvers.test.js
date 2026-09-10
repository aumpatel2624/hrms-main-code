// Department Approver resolution (ADR-024) needs real Employee/Department
// documents and their relationships to exercise honestly — unlike every
// other *.test.js in this repo, this one is DB-backed (same pattern as
// seed/index.js: dotenv -> connect -> work -> disconnect). It is NOT wired
// into `npm test`'s dependency-free chain; run it directly:
//
//   node apps/server/utils/approvers.test.js
//
// It creates and always cleans up its own disposable fixtures, scoped under
// a throwaway Company/Department/Employee namespace so it never collides
// with seeded or real data.
import "../models/softDelete.js";
import "../models/auditPlugin.js";

import assert from "node:assert/strict";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Company from "../models/Company.js";
import Branch from "../models/Branch.js";
import Department from "../models/Department.js";
import Designation from "../models/Designation.js";
import Employee from "../models/Employee.js";
import { resolveApprovers, getEmployeesApprovedBy } from "./approvers.js";

dotenv.config();

const oid = () => new mongoose.Types.ObjectId();

const run = async () => {
  await mongoose.connect(process.env.DATABASE, { serverSelectionTimeoutMS: 10000 });

  const tag = `__approversTest_${Date.now()}`;
  const company = await Company.create({ companyName: tag, companyCode: tag.slice(0, 10) });
  const branch = await Branch.create({ branchName: tag, companyId: company._id });
  const designation = await Designation.create({ designationName: tag, companyId: company._id });

  const makeDept = async (name, parentDepartmentId = null, approvers = {}) =>
    Department.create({
      departmentName: `${tag}-${name}`,
      companyId: company._id,
      parentDepartmentId,
      ...approvers,
    });

  const makeEmployee = async (name, departmentId, overrides = {}) =>
    Employee.create({
      employeeCode: `${tag}-${name}`,
      employeeName: name,
      companyId: company._id,
      departmentId,
      designationId: designation._id,
      branchId: branch._id,
      dateOfJoining: new Date("2020-01-01"),
      ...overrides,
    });

  try {
    const grandparentApprover = oid();
    const parentApprover = oid();
    const directApprover = oid();

    const grandparentDept = await makeDept("GP", null, { leaveApprovers: [grandparentApprover] });
    const parentDept = await makeDept("P", grandparentDept._id, { leaveApprovers: [parentApprover] });
    const childDept = await makeDept("C", parentDept._id); // no approvers of its own

    // 1. Direct field wins over department entirely.
    const withDirect = await makeEmployee("Direct", childDept._id, { leaveApproverId: directApprover });
    const directResult = await resolveApprovers(withDirect._id, "leave");
    assert.deepEqual(directResult, [String(directApprover)]);

    // 2. No direct field -> union across the WHOLE ancestor chain, not just
    // the nearest non-empty level.
    const noDirect = await makeEmployee("NoDirect", childDept._id);
    const chainResult = await resolveApprovers(noDirect._id, "leave");
    assert.deepEqual(
      [...chainResult].sort(),
      [String(parentApprover), String(grandparentApprover)].sort(),
    );

    // 3. Depth bound doesn't infinite-loop on a manufactured cycle.
    const cycleA = await makeDept("CycleA");
    const cycleB = await makeDept("CycleB", cycleA._id, { leaveApprovers: [oid()] });
    cycleA.parentDepartmentId = cycleB._id; // A -> B -> A
    await cycleA.save();
    const cycleEmployee = await makeEmployee("Cycle", cycleA._id);
    const cycleResult = await resolveApprovers(cycleEmployee._id, "leave");
    assert.ok(Array.isArray(cycleResult)); // must return, not hang — content unimportant here

    // 4. getEmployeesApprovedBy: department fallback finds NoDirect (parent
    // approver covers it) but excludes Direct (has its own override), even
    // though Direct's department eventually inherits the same approver.
    const approvedByParent = await getEmployeesApprovedBy(parentApprover, "leave");
    const approvedIds = approvedByParent.map(String);
    assert.ok(approvedIds.includes(String(noDirect._id)), "department fallback should cover NoDirect");
    assert.ok(!approvedIds.includes(String(withDirect._id)), "direct override should exclude Direct");

    // 5. getEmployeesApprovedBy direct match.
    const approvedByDirect = await getEmployeesApprovedBy(directApprover, "leave");
    assert.deepEqual(approvedByDirect.map(String), [String(withDirect._id)]);

    console.log("approvers: all checks passed");
  } finally {
    // Cleanup — hard delete (these are throwaway fixtures, not real data).
    await Employee.deleteMany({ employeeCode: { $regex: `^${tag}` } });
    await Department.deleteMany({ companyId: company._id });
    await Designation.deleteMany({ _id: designation._id });
    await Branch.deleteMany({ _id: branch._id });
    await Company.deleteMany({ _id: company._id });
    await mongoose.disconnect();
  }
};

run().catch(async (error) => {
  console.error("approvers test failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
