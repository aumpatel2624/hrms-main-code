/**
 * Demo-data seeder for the Apidel HRMS admin panel.
 *
 * Run AFTER `npm run seed` (which seeds the real 195 employees, departments,
 * designations, branches, roles, and menu/permission matrices).
 *
 *   npm run seed:demo
 *
 * What this does:
 *   Part 1 — User accounts + role assignment for all 195 real employees
 *   Part 2 — Representative transactional data across every HRMS module
 *   Part 3 — Real DashboardWidget + RoleDashboard documents
 *
 * Idempotent: every upsert is keyed on a natural key. Safe to run twice.
 *
 * Shared demo password (printed again at the end):
 *   Demo@1234
 */

// Plugin imports must come first — same ordering constraint as seed/index.js.
import "../models/softDelete.js";
import "../models/auditPlugin.js";

import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

// Models
import Employee from "../models/Employee.js";
import RoleMaster from "../models/RoleMaster.js";
import Company from "../models/Company.js";
import Department from "../models/Department.js";
import Country from "../models/Country.js";
import State from "../models/State.js";
import City from "../models/City.js";
import LeaveType from "../models/LeaveType.js";
import LeaveAllocation from "../models/LeaveAllocation.js";
import LeaveApplication from "../models/LeaveApplication.js";
import LeaveLedgerEntry from "../models/LeaveLedgerEntry.js";
import LeaveEncashment from "../models/LeaveEncashment.js";
import CompensatoryLeaveRequest from "../models/CompensatoryLeaveRequest.js";
import ShiftType from "../models/ShiftType.js";
import ShiftAssignment from "../models/ShiftAssignment.js";
import Attendance from "../models/Attendance.js";
import EmployeeCheckin from "../models/EmployeeCheckin.js";
import AttendanceRequest from "../models/AttendanceRequest.js";
import SalaryComponent from "../models/SalaryComponent.js";
import SalaryStructure from "../models/SalaryStructure.js";
import SalaryStructureAssignment from "../models/SalaryStructureAssignment.js";
import SalarySlip from "../models/SalarySlip.js";
import AdditionalSalary from "../models/AdditionalSalary.js";
import RetentionBonus from "../models/RetentionBonus.js";
import IncomeTaxSlab from "../models/IncomeTaxSlab.js";
import GratuityRule from "../models/GratuityRule.js";
import Gratuity from "../models/Gratuity.js";
import KRA from "../models/KRA.js";
import AppraisalTemplate from "../models/AppraisalTemplate.js";
import AppraisalCycle from "../models/AppraisalCycle.js";
import Appraisal from "../models/Appraisal.js";
import Goal from "../models/Goal.js";
import EmployeePerformanceFeedback from "../models/EmployeePerformanceFeedback.js";
import EmployeeFeedbackCriteria from "../models/EmployeeFeedbackCriteria.js";
import ExpenseClaim from "../models/ExpenseClaim.js";
import ExpenseClaimType from "../models/ExpenseClaimType.js";
import JobRequisition from "../models/JobRequisition.js";
import JobOpening from "../models/JobOpening.js";
import JobApplicant from "../models/JobApplicant.js";
import JobApplicantSource from "../models/JobApplicantSource.js";
import InterviewType from "../models/InterviewType.js";
import Interview from "../models/Interview.js";
import InterviewFeedback from "../models/InterviewFeedback.js";
import JobOffer from "../models/JobOffer.js";
import TravelRequest from "../models/TravelRequest.js";
import PurposeOfTravel from "../models/PurposeOfTravel.js";
import EmployeeTransfer from "../models/EmployeeTransfer.js";
import EmployeePromotion from "../models/EmployeePromotion.js";
import EmployeeGrievance from "../models/EmployeeGrievance.js";
import GrievanceType from "../models/GrievanceType.js";
import TrainingProgram from "../models/TrainingProgram.js";
import TrainingEvent from "../models/TrainingEvent.js";
import DashboardWidget from "../models/DashboardWidget.js";
import RoleDashboard from "../models/RoleDashboard.js";
import Designation from "../models/Designation.js";

dotenv.config();

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEMO_PASSWORD = "Demo@1234";
const DEMO_EMAIL_DOMAIN = "apideltech.com";

/** Role priority order (highest = 1). If a user qualifies for multiple roles
 *  and the model is single-role-per-user (roleId is a single ObjectId), the
 *  highest-priority role wins. */
const ROLE_PRIORITY = [
  "HR Manager",        // 1 — senior titles
  "HR User",           // 2 — HR-adjacent departments at manager level
  "Interviewer",       // 3 — talent-acquisition departments
  "Leave Approver",    // 4 — people-managers with real direct reports
  "Expense Approver",  // 5 — (paired with Leave Approver in practice)
  "Employee",          // 6 — everyone else
];

/** Titles that map to HR Manager regardless of department. */
const SENIOR_TITLES = new Set([
  "MD & Founder", "CEO", "Sr. Director", "Director", "Vice President",
  "AVP", "Head", "CSBDO",
]);

/** Departments that qualify an HR-adjacent role (HR User) at manager level. */
const HR_ADJACENT_DEPARTMENTS = new Set([
  "Human Resources", "Employee Relations", "Payroll & Compliance",
  "Onboarding & Compliance",
]);

/** Manager-level titles within HR-adjacent departments → HR User. */
const MANAGER_TITLES = new Set([
  "Manager", "Sr. Manager", "Recruitment Manager", "Associate Manager",
  "Sr. Delivery Manager", "Associate Delivery Manager",
]);

/** Departments whose members get Interviewer role. */
const INTERVIEWER_DEPARTMENTS = new Set([
  "Talent Acquisition", "Corporate Recruitment & Facility Management",
  "Corporate Recruitment",
]);

// ---------------------------------------------------------------------------
// CSV helpers (mirrors seed/index.js — not imported from there to keep this
// script fully self-contained and not accidentally touch the base seed).
// ---------------------------------------------------------------------------

const parseCsvLine = (line) => {
  const fields = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') inQuotes = false;
      else current += char;
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
};

const readOrgChartRows = () => {
  const csvPath = path.join(
    import.meta.dirname,
    "../../../docs/knowledge/apidel-org-chart.csv",
  );
  const lines = fs
    .readFileSync(csvPath, "utf8")
    .replace(/\r\n/g, "\n")
    .trim()
    .split("\n");
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
};

const normalizeDepartmentName = (name) => {
  if (/^pr and social media$/i.test(name)) return "PR and Social media";
  if (/^corporate recruitment(\s*&\s*facility management)?$/i.test(name)) {
    return "Corporate Recruitment & Facility Management";
  }
  return name;
};

const MONTH_INDEX = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

const parseOrgChartDate = (value) => {
  const [day, mon, yy] = value.split("-");
  const month = MONTH_INDEX[mon.trim().toLowerCase()];
  if (month === undefined || !day || !yy) return null;
  return new Date(Date.UTC(2000 + Number(yy), month, Number(day)));
};

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/** Derive a corporate email from a full name. */
const nameToEmail = (name) => {
  const parts = name
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()
    .split(/\s+/);
  if (parts.length < 2) return `${parts[0]}@${DEMO_EMAIL_DOMAIN}`;
  return `${parts[0]}.${parts[parts.length - 1]}@${DEMO_EMAIL_DOMAIN}`;
};

/** Deduplicate emails by appending a numeric suffix when needed. */
const dedupeEmails = (rows) => {
  const seen = new Map();
  return rows.map((row) => {
    const base = nameToEmail(row.name);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return { ...row, _email: count === 0 ? base : base.replace("@", `${count}@`) };
  });
};

/** Assign the highest-priority applicable role to a CSV row given the manager
 *  set (employees who have at least one direct report). Returns role name. */
const assignRoleName = (row, managerNames) => {
  const title = row.title?.trim() ?? "";
  const dept = normalizeDepartmentName(row.department?.trim() ?? "");
  const isManager = managerNames.has(row.name);

  if (SENIOR_TITLES.has(title)) return "HR Manager";
  if (HR_ADJACENT_DEPARTMENTS.has(dept) && MANAGER_TITLES.has(title)) return "HR User";
  if (INTERVIEWER_DEPARTMENTS.has(dept)) return "Interviewer";
  // People-managers with real direct reports get Leave Approver
  // (Expense Approver is a second capability — single role, so Leave Approver wins here;
  //  see conflict-resolution note in the final report).
  if (isManager) return "Leave Approver";
  return "Employee";
};

/** Returns a Date set to today - offsetDays at midnight UTC. */
const daysAgo = (n) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
};

/** Returns a Date set to today + offsetDays at midnight UTC. */
const daysFromNow = (n) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
};

/** Simple pick-Nth helper from an array (wraps around). */
const pick = (arr, i) => arr[i % arr.length];

// ---------------------------------------------------------------------------
// Part 1 — User accounts + role assignment
// ---------------------------------------------------------------------------

const seedUserAccounts = async (companyId) => {
  const rows = readOrgChartRows();
  const rowsWithEmail = dedupeEmails(rows);

  // Identify managers (names that appear as manager_name for another row).
  const managerNames = new Set(rows.map((r) => r.manager_name).filter(Boolean));

  // Fetch all seeded employees by name for lookup.
  const employees = await Employee.find({ companyId }).lean();
  const empByName = new Map(employees.map((e) => [e.employeeName, e]));

  // Fetch all role masters once.
  const allRoles = await RoleMaster.find({}).lean();
  const roleByName = new Map(allRoles.map((r) => [r.roleName, r._id]));

  // Fetch a stable country/state/city for the User model's required fields.
  // The base seed creates these; if somehow absent, fall back to first found.
  const country =
    (await Country.findOne({ countryName: "India" }).lean()) ||
    (await Country.findOne({}).lean());
  const state =
    (await State.findOne({ countryId: country?._id }).lean()) ||
    (await State.findOne({}).lean());
  const city =
    (await City.findOne({ stateId: state?._id }).lean()) ||
    (await City.findOne({}).lean());

  if (!country || !state || !city) {
    console.log("⚠️  Demo data: no geography rows found — run npm run seed first");
    return { managerNames, empByName };
  }

  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);

  let usersCreated = 0;
  let usersSkipped = 0;
  let leaveApproverLinked = 0;
  let expenseApproverLinked = 0;

  const createdUserByName = new Map(); // name → Employee doc (login identity now, ADR-040)

  // Pass 1: set the real login fields directly on each Employee doc — there
  // is no separate User collection to create/link any more (ADR-040).
  for (const row of rowsWithEmail) {
    const emp = empByName.get(row.name);
    if (!emp) {
      console.log(`⚠️  Demo data: employee "${row.name}" not in DB — skipping user`);
      continue;
    }

    // Skip if this Employee already has a real (non-placeholder) login.
    if (emp.email && !emp.email.endsWith("@apidel.placeholder")) {
      createdUserByName.set(row.name, emp);
      usersSkipped += 1;
      continue;
    }

    const roleName = assignRoleName(row, managerNames);
    const roleId = roleByName.get(roleName);
    if (!roleId) {
      console.log(`⚠️  Demo data: role "${roleName}" not found for ${row.name}`);
      continue;
    }

    // Idempotent: another Employee row already holding this email means a
    // dedupe issue in the source data, not something to overwrite.
    const emailTaken = await Employee.findOne({ email: row._email, _id: { $ne: emp._id } }).lean();
    if (emailTaken) {
      console.log(`⚠️  Demo data: email ${row._email} already used by another employee — skipping ${row.name}`);
      continue;
    }

    try {
      await Employee.updateOne(
        { _id: emp._id },
        {
          $set: {
            email: row._email,
            password: hashedPassword,
            roleId,
            countryId: country._id,
            stateId: state._id,
            cityId: city._id,
            address: "Apidel Technologies",
          },
        },
      );
      usersCreated += 1;
    } catch (err) {
      console.log(`⚠️  Demo data: could not set login for ${row.name}: ${err.message}`);
      continue;
    }

    createdUserByName.set(row.name, { ...emp, _id: emp._id, roleId });
  }

  // Pass 2: for every real manager, set leaveApproverId + expenseApproverId
  //         on each of their direct reports (self-ref onto Employee now).
  for (const row of rows) {
    if (!row.manager_name) continue;
    const managerEmployee = createdUserByName.get(row.manager_name) || empByName.get(row.manager_name);
    if (!managerEmployee) continue;

    const subordinate = empByName.get(row.name);
    if (!subordinate) continue;

    const updates = {};
    if (
      !subordinate.leaveApproverId ||
      String(subordinate.leaveApproverId) !== String(managerEmployee._id)
    ) {
      updates.leaveApproverId = managerEmployee._id;
      leaveApproverLinked += 1;
    }
    if (
      !subordinate.expenseApproverId ||
      String(subordinate.expenseApproverId) !== String(managerEmployee._id)
    ) {
      updates.expenseApproverId = managerEmployee._id;
      expenseApproverLinked += 1;
    }
    if (Object.keys(updates).length) {
      await Employee.updateOne({ _id: subordinate._id }, { $set: updates });
    }
  }

  console.log(
    `✅ Demo Part 1: ${usersCreated} employee login(s) set, ${usersSkipped} already had a real login, ` +
    `${leaveApproverLinked} leave approver link(s), ${expenseApproverLinked} expense approver link(s)`,
  );

  return { managerNames, empByName, createdUserByName };
};

// ---------------------------------------------------------------------------
// Part 2 helpers: resolve seeded data
// ---------------------------------------------------------------------------

const resolveLeaveTypes = async () => {
  const types = await LeaveType.find({}).lean();
  return Object.fromEntries(types.map((t) => [t.leaveTypeName, t]));
};

const resolveShiftTypes = async (companyId) => {
  return ShiftType.find({ companyId }).lean();
};

// ---------------------------------------------------------------------------
// Part 2A — Leaves
// ---------------------------------------------------------------------------

const seedLeaveData = async (companyId, employees) => {
  const leaveTypes = await resolveLeaveTypes();
  const casualLeave = leaveTypes["Casual Leave"];
  const sickLeave = leaveTypes["Sick Leave"];
  const earnedLeave = leaveTypes["Earned Leave"];
  const compensatoryOff = leaveTypes["Compensatory Off"];

  if (!casualLeave || !sickLeave) {
    console.log("⚠️  Demo data: leave types not found — run npm run seed first");
    return;
  }

  // Use a representative slice of 20 employees for demo volume.
  const slice = employees.slice(0, 20);
  const fromDate = daysAgo(180);
  const toDate = daysFromNow(180);

  let allocCount = 0;
  let appCount = 0;
  let ledgerCount = 0;

  for (const emp of slice) {
    // Allocation — Casual Leave
    let alloc = await LeaveAllocation.findOne({
      employeeId: emp._id,
      leaveTypeId: casualLeave._id,
      fromDate,
    }).lean();
    if (!alloc) {
      alloc = await LeaveAllocation.create({
        employeeId: emp._id,
        leaveTypeId: casualLeave._id,
        companyId,
        fromDate,
        toDate,
        newLeavesAllocated: 12,
        totalLeavesAllocated: 12,
        status: "active",
        isActive: true,
      });
      allocCount += 1;
    }

    // Write this independently of allocation creation: a prior interrupted
    // run may already have created the allocation but not its ledger row.
    const existingLedger = await LeaveLedgerEntry.findOne({
      employeeId: emp._id,
      leaveTypeId: casualLeave._id,
      transactionType: "LeaveAllocation",
      transactionId: alloc._id,
    }).lean();
    if (!existingLedger) {
      await LeaveLedgerEntry.create({
        employeeId: emp._id,
        leaveTypeId: casualLeave._id,
        companyId,
        transactionId: alloc._id,
        transactionType: "LeaveAllocation",
        leaves: 12,
        fromDate,
        toDate,
        isCarryForward: false,
        isExpired: false,
        isActive: true,
      });
      ledgerCount += 1;
    }

    // Allocation — Sick Leave
    const existingSickAlloc = await LeaveAllocation.findOne({
      employeeId: emp._id,
      leaveTypeId: sickLeave._id,
      fromDate,
    }).lean();
    if (!existingSickAlloc) {
      await LeaveAllocation.create({
        employeeId: emp._id,
        leaveTypeId: sickLeave._id,
        companyId,
        fromDate,
        toDate,
        newLeavesAllocated: 12,
        totalLeavesAllocated: 12,
        status: "active",
        isActive: true,
      });
      allocCount += 1;
    }
  }

  // Leave Applications — mix of statuses, using real approver links.
  const APPLICATIONS = [
    { idx: 0, leaveType: casualLeave, from: daysAgo(30), to: daysAgo(28), status: "approved" },
    { idx: 1, leaveType: sickLeave,  from: daysAgo(20), to: daysAgo(19), status: "rejected" },
    { idx: 2, leaveType: casualLeave, from: daysAgo(10), to: daysAgo(9), status: "open" },
    { idx: 3, leaveType: casualLeave, from: daysAgo(5),  to: daysAgo(4), status: "open" },
    { idx: 4, leaveType: sickLeave,  from: daysAgo(60), to: daysAgo(58), status: "approved" },
    { idx: 5, leaveType: casualLeave, from: daysAgo(45), to: daysAgo(44), status: "cancelled" },
    { idx: 6, leaveType: sickLeave,  from: daysAgo(15), to: daysAgo(14), status: "open" },
    { idx: 7, leaveType: casualLeave, from: daysAgo(8),  to: daysAgo(7), status: "approved" },
  ];

  for (const app of APPLICATIONS) {
    const emp = slice[app.idx];
    if (!emp) continue;
    const existing = await LeaveApplication.findOne({
      employeeId: emp._id,
      leaveTypeId: app.leaveType._id,
      fromDate: app.from,
    }).lean();
    if (!existing) {
      const days = Math.round((app.to - app.from) / 86400000) + 1;
      // Re-fetch the employee to get the latest leaveApproverId.
      const freshEmp = await Employee.findById(emp._id).lean();
      await LeaveApplication.create({
        employeeId: emp._id,
        leaveTypeId: app.leaveType._id,
        companyId,
        fromDate: app.from,
        toDate: app.to,
        totalLeaveDays: days,
        leaveApproverId: freshEmp?.leaveApproverId ?? null,
        postingDate: app.from,
        status: app.status,
        description: `Demo ${app.leaveType.leaveTypeName} application`,
        isActive: true,
      });
      appCount += 1;
    }
  }

  // Compensatory Leave Request (one, approved)
  if (compensatoryOff && slice[0]) {
    const freshEmp0 = await Employee.findById(slice[0]._id).lean();
    const existingComp = await CompensatoryLeaveRequest.findOne({
      employeeId: slice[0]._id,
    }).lean();
    if (!existingComp) {
      await CompensatoryLeaveRequest.create({
        employeeId: slice[0]._id,
        companyId,
        leaveTypeId: compensatoryOff._id,
        workFromDate: daysAgo(14),
        workEndDate: daysAgo(14),
        halfDay: false,
        reason: "Worked on a weekend for project delivery",
        leaveApproverId: freshEmp0?.leaveApproverId ?? null,
        status: "approved",
        isActive: true,
      });
      appCount += 1;
    }
  }

  // Leave Encashment (one, for earnedLeave)
  if (earnedLeave && slice[2]) {
    const earnedAlloc = await LeaveAllocation.findOne({
      employeeId: slice[2]._id,
      leaveTypeId: earnedLeave._id,
    }).lean();
    let allocForEncash = earnedAlloc;
    if (!allocForEncash) {
      allocForEncash = await LeaveAllocation.create({
        employeeId: slice[2]._id,
        leaveTypeId: earnedLeave._id,
        companyId,
        fromDate,
        toDate,
        newLeavesAllocated: 24,
        totalLeavesAllocated: 24,
        status: "active",
        isActive: true,
      });
      allocCount += 1;
    }
    const existingEncash = await LeaveEncashment.findOne({
      employeeId: slice[2]._id,
      leaveTypeId: earnedLeave._id,
    }).lean();
    if (!existingEncash) {
      await LeaveEncashment.create({
        employeeId: slice[2]._id,
        companyId,
        leaveTypeId: earnedLeave._id,
        leaveAllocationId: allocForEncash._id,
        encashmentDate: daysAgo(7),
        encashmentDays: 5,
        perDayEncashmentAmount: 2000,
        encashmentAmount: 10000,
        status: "pending",
        isActive: true,
      });
      appCount += 1;
    }
  }

  console.log(
    `✅ Demo Part 2A (Leaves): ${allocCount} allocation(s), ${appCount} application/request(s), ${ledgerCount} ledger entrie(s)`,
  );
};

// ---------------------------------------------------------------------------
// Part 2B — Shift & Attendance
// ---------------------------------------------------------------------------

const seedShiftAttendanceData = async (companyId, employees) => {
  // Create demo Shift Types matching the CSV's three shift values.
  const SHIFT_DEFS = [
    { shiftTypeName: "Night Shift", startTime: "22:00", endTime: "06:00" },
    { shiftTypeName: "Day Shift",   startTime: "09:00", endTime: "18:00" },
    { shiftTypeName: "UK Shift",    startTime: "13:00", endTime: "22:00" },
  ];

  const shiftByName = {};
  for (const def of SHIFT_DEFS) {
    const doc = await ShiftType.findOneAndUpdate(
      { shiftTypeName: def.shiftTypeName, companyId },
      { ...def, companyId, isActive: true },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    shiftByName[def.shiftTypeName] = doc;
  }

  const CSV_SHIFT_TO_SHIFT_NAME = { Day: "Day Shift", Night: "Night Shift", UK: "UK Shift" };

  // Shift assignments — use all employees but cap the DB writes at 30.
  const slice = employees.slice(0, 30);
  let assignCount = 0;

  for (const emp of slice) {
    // Derive shift from the employees shiftPreference (set by base seed from CSV).
    const shiftPref = emp.shiftPreference ?? "Night";
    const shiftName = CSV_SHIFT_TO_SHIFT_NAME[shiftPref] ?? "Night Shift";
    const shiftDoc = shiftByName[shiftName];
    if (!shiftDoc) continue;

    const existing = await ShiftAssignment.findOne({
      employeeId: emp._id,
      shiftTypeId: shiftDoc._id,
    }).lean();
    if (!existing) {
      await ShiftAssignment.create({
        employeeId: emp._id,
        shiftTypeId: shiftDoc._id,
        startDate: daysAgo(60),
        status: "active",
        companyId,
        isActive: true,
      });
      assignCount += 1;
    }
  }

  // Attendance + Checkin records for the last 10 working days for 10 employees.
  const attnSlice = employees.slice(0, 10);
  let attnCount = 0;
  let checkinCount = 0;

  for (const emp of attnSlice) {
    for (let d = 10; d >= 1; d--) {
      const attnDate = daysAgo(d);
      const existing = await Attendance.findOne({
        employeeId: emp._id,
        attendanceDate: attnDate,
      }).lean();
      if (existing) continue;

      const status = d === 5 ? "Absent" : d === 3 ? "On Leave" : "Present";
      await Attendance.create({
        employeeId: emp._id,
        companyId,
        attendanceDate: attnDate,
        status,
        workingHours: status === "Present" ? 8 : 0,
        standardWorkingHours: 8,
        inTime: status === "Present"
          ? new Date(attnDate.getTime() + 9 * 3600000)  // 9 AM
          : null,
        outTime: status === "Present"
          ? new Date(attnDate.getTime() + 18 * 3600000) // 6 PM
          : null,
        isActive: true,
      });
      attnCount += 1;

      if (status === "Present") {
        // IN checkin
        const inTime = new Date(attnDate.getTime() + 9 * 3600000);
        const existingIn = await EmployeeCheckin.findOne({
          employeeId: emp._id,
          time: inTime,
          logType: "IN",
        }).lean();
        if (!existingIn) {
          await EmployeeCheckin.create({
            employeeId: emp._id,
            time: inTime,
            logType: "IN",
            offshift: false,
            companyId,
            isActive: true,
          });
          checkinCount += 1;
        }

        // OUT checkin
        const outTime = new Date(attnDate.getTime() + 18 * 3600000);
        const existingOut = await EmployeeCheckin.findOne({
          employeeId: emp._id,
          time: outTime,
          logType: "OUT",
        }).lean();
        if (!existingOut) {
          await EmployeeCheckin.create({
            employeeId: emp._id,
            time: outTime,
            logType: "OUT",
            offshift: false,
            companyId,
            isActive: true,
          });
          checkinCount += 1;
        }
      }
    }
  }

  // Attendance Request (one pending)
  if (attnSlice[0]) {
    const existing = await AttendanceRequest.findOne({
      employeeId: attnSlice[0]._id,
    }).lean();
    if (!existing) {
      await AttendanceRequest.create({
        employeeId: attnSlice[0]._id,
        companyId,
        fromDate: daysAgo(4),
        toDate: daysAgo(4),
        reason: "Work From Home",
        status: "active",
        isActive: true,
      });
    }
  }

  console.log(
    `✅ Demo Part 2B (Shift & Attendance): ${Object.keys(shiftByName).length} shift type(s), ` +
    `${assignCount} assignment(s), ${attnCount} attendance record(s), ${checkinCount} checkin(s)`,
  );

  return shiftByName;
};

// ---------------------------------------------------------------------------
// Part 2C — Payroll
// ---------------------------------------------------------------------------

const seedPayrollData = async (companyId, employees) => {
  // --- Salary Components ---
  const COMPONENTS = [
    { salaryComponentName: "Basic Salary",   abbreviation: "BS",  type: "Earning",   dependsOnPaymentDays: true },
    { salaryComponentName: "HRA",            abbreviation: "HRA", type: "Earning",   dependsOnPaymentDays: true },
    { salaryComponentName: "Special Allowance", abbreviation: "SA", type: "Earning", dependsOnPaymentDays: false },
    { salaryComponentName: "Provident Fund", abbreviation: "PF",  type: "Deduction", dependsOnPaymentDays: false, componentType: "Provident Fund" },
    { salaryComponentName: "Professional Tax", abbreviation: "PT", type: "Deduction", dependsOnPaymentDays: false, componentType: "Professional Tax" },
    { salaryComponentName: "Gratuity Component", abbreviation: "GRA", type: "Earning", accrualComponent: true },
  ];

  const componentByName = {};
  for (const c of COMPONENTS) {
    const doc = await SalaryComponent.findOneAndUpdate(
      { salaryComponentName: c.salaryComponentName, companyId },
      { ...c, companyId, isActive: true },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    componentByName[c.salaryComponentName] = doc;
  }

  // --- Update GratuityRule to add the applicable earnings component (fix ADR-031 gap) ---
  const gratuityComp = componentByName["Gratuity Component"];
  if (gratuityComp) {
    const gratuityRules = await GratuityRule.find({}).lean();
    let gratuityRulesFixed = 0;
    for (const rule of gratuityRules) {
      const alreadyHasComp = rule.applicableEarningsComponent?.some(
        (c) => String(c.salaryComponentId) === String(gratuityComp._id),
      );
      if (!alreadyHasComp) {
        await GratuityRule.updateOne(
          { _id: rule._id },
          {
            $push: {
              applicableEarningsComponent: { salaryComponentId: gratuityComp._id },
            },
          },
        );
        gratuityRulesFixed += 1;
      }
    }
    if (gratuityRulesFixed) {
      console.log(`✅ Demo: Fixed ${gratuityRulesFixed} GratuityRule(s) — added Gratuity Component to applicableEarningsComponent`);
    }
  }

  // --- Salary Structure ---
  let salaryStructure = await SalaryStructure.findOne({ companyId }).lean();
  if (!salaryStructure) {
    const bs = componentByName["Basic Salary"];
    const hra = componentByName["HRA"];
    const sa = componentByName["Special Allowance"];
    const pf = componentByName["Provident Fund"];
    const pt = componentByName["Professional Tax"];

    const makeDetail = (comp, amount) => ({
      salaryComponentId: comp._id,
      abbreviation: comp.abbreviation,
      statisticalComponent: comp.statisticalComponent ?? false,
      isTaxApplicable: comp.isTaxApplicable ?? false,
      variableBasedOnTaxableSalary: comp.variableBasedOnTaxableSalary ?? false,
      dependsOnPaymentDays: comp.dependsOnPaymentDays ?? false,
      exemptedFromIncomeTax: comp.exemptedFromIncomeTax ?? false,
      doNotIncludeInTotal: comp.doNotIncludeInTotal ?? false,
      accrualComponent: comp.accrualComponent ?? false,
      condition: "",
      amountBasedOnFormula: false,
      formula: "",
      amount,
      defaultAmount: amount,
    });

    salaryStructure = await SalaryStructure.create({
      companyId,
      payrollFrequency: "Monthly",
      currency: "INR",
      isActive: true,
      earnings: [
        makeDetail(bs, 30000),
        makeDetail(hra, 12000),
        makeDetail(sa, 8000),
      ],
      deductions: [
        makeDetail(pf, 1800),
        makeDetail(pt, 200),
      ],
      employerContributions: [],
      totalEarning: 50000,
      totalDeduction: 2000,
      netPay: 48000,
    });
  }

  // --- Salary Structure Assignments for 15 employees ---
  const paySlice = employees.slice(0, 15);
  let ssaCount = 0;

  for (const emp of paySlice) {
    const existing = await SalaryStructureAssignment.findOne({
      employeeId: emp._id,
      salaryStructureId: salaryStructure._id,
    }).lean();
    if (!existing) {
      try {
        await SalaryStructureAssignment.create({
          employeeId: emp._id,
          salaryStructureId: salaryStructure._id,
          fromDate: daysAgo(365),
          companyId,
          base: 30000,
          variable: 0,
          currency: "INR",
          annualGrossEarning: 600000,
          ctc: 624000,
        });
        ssaCount += 1;
      } catch (err) {
        if (!err.message?.includes("duplicate")) throw err;
      }
    }
  }

  // --- Salary Slips for 5 employees, 2 periods ---
  const slipSlice = paySlice.slice(0, 5);
  let slipCount = 0;

  const periods = [
    { start: new Date("2026-07-01"), end: new Date("2026-07-31") },
    { start: new Date("2026-08-01"), end: new Date("2026-08-31") },
  ];

  const bs = componentByName["Basic Salary"];
  const hra = componentByName["HRA"];
  const sa = componentByName["Special Allowance"];
  const pf = componentByName["Provident Fund"];
  const pt = componentByName["Professional Tax"];

  for (const emp of slipSlice) {
    const ssa = await SalaryStructureAssignment.findOne({
      employeeId: emp._id,
      companyId,
    }).lean();
    if (!ssa) continue;

    for (const period of periods) {
      const existing = await SalarySlip.findOne({
        employeeId: emp._id,
        startDate: period.start,
        endDate: period.end,
      }).lean();
      if (!existing) {
        try {
          const makeSlipDetail = (comp, amount) => ({
            salaryComponentId: comp._id,
            abbreviation: comp.abbreviation,
            dependsOnPaymentDays: comp.dependsOnPaymentDays ?? false,
            amount,
            defaultAmount: amount,
          });

          await SalarySlip.create({
            employeeId: emp._id,
            salaryStructureAssignmentId: ssa._id,
            companyId,
            startDate: period.start,
            endDate: period.end,
            workingDays: 26,
            totalWorkingDays: 26,
            paymentDays: 26,
            lwpDays: 0,
            absentDays: 0,
            halfDayDays: 0,
            earnings: [
              makeSlipDetail(bs, 30000),
              makeSlipDetail(hra, 12000),
              makeSlipDetail(sa, 8000),
            ],
            deductions: [
              makeSlipDetail(pf, 1800),
              makeSlipDetail(pt, 200),
            ],
            employerContributions: [],
            grossPay: 50000,
            totalDeduction: 2000,
            netPay: 48000,
            status: "submitted",
          });
          slipCount += 1;
        } catch (err) {
          if (!err.message?.includes("duplicate")) throw err;
        }
      }
    }
  }

  // --- Additional Salary / Retention Bonus / Incentive ---
  if (slipSlice[0]) {
    const existingAddl = await AdditionalSalary.findOne({
      employeeId: slipSlice[0]._id,
      salaryComponentId: sa._id,
    }).lean();
    if (!existingAddl) {
      await AdditionalSalary.create({
        employeeId: slipSlice[0]._id,
        companyId,
        salaryComponentId: sa._id,
        type: "Earning",
        payrollDate: daysAgo(15),
        amount: 5000,
        currency: "INR",
        status: "active",
        overwriteSalaryStructureAmount: false,
      });
    }
  }

  if (slipSlice[1]) {
    const existingBonus = await RetentionBonus.findOne({
      employeeId: slipSlice[1]._id,
    }).lean();
    if (!existingBonus) {
      await RetentionBonus.create({
        employeeId: slipSlice[1]._id,
        companyId,
        salaryComponentId: sa._id,
        bonusPaymentDate: daysAgo(30),
        bonusAmount: 20000,
        status: "draft",
      });
    }
  }

  // --- Income Tax Slab ---
  const existingSlab = await IncomeTaxSlab.findOne({ companyId }).lean();
  if (!existingSlab) {
    await IncomeTaxSlab.create({
      name: "India FY 2026-27 New Regime",
      companyId,
      effectiveFromDate: new Date("2026-04-01"),
      currency: "INR",
      slabs: [
        { fromAmount: 0,       toAmount: 300000,  percentDeduction: 0 },
        { fromAmount: 300000,  toAmount: 700000,  percentDeduction: 5 },
        { fromAmount: 700000,  toAmount: 1000000, percentDeduction: 10 },
        { fromAmount: 1000000, toAmount: 1200000, percentDeduction: 15 },
        { fromAmount: 1200000, toAmount: 1500000, percentDeduction: 20 },
        { fromAmount: 1500000, toAmount: null,    percentDeduction: 30 },
      ],
      otherTaxesAndCharges: [],
    });
  }

  console.log(
    `✅ Demo Part 2C (Payroll): ${Object.keys(componentByName).length} component(s), ` +
    `${ssaCount} salary structure assignment(s), ${slipCount} salary slip(s)`,
  );

  return { componentByName, salaryStructure };
};

// ---------------------------------------------------------------------------
// Part 2D — Gratuity (longest-tenured employee)
// ---------------------------------------------------------------------------

const seedGratuityData = async (companyId, employees, componentByName) => {
  // Find the employee with the earliest date_of_joining.
  const sortedByJoining = [...employees].sort(
    (a, b) => new Date(a.dateOfJoining) - new Date(b.dateOfJoining),
  );
  const longestTenured = sortedByJoining[0];
  if (!longestTenured) return;

  const gratuityRule = await GratuityRule.findOne({
    name: "Indian Standard Gratuity Rule",
  }).lean();
  if (!gratuityRule) {
    console.log("⚠️  Demo Part 2D: Indian Standard Gratuity Rule not found — run seed first");
    return;
  }

  const gratuityComp = componentByName?.["Gratuity Component"];
  if (!gratuityComp) {
    console.log("⚠️  Demo Part 2D: Gratuity Component salary component not found");
    return;
  }

  const existing = await Gratuity.findOne({ employeeId: longestTenured._id }).lean();
  if (!existing) {
    const joinDate = new Date(longestTenured.dateOfJoining);
    const yearsWorked = Math.floor(
      (Date.now() - joinDate.getTime()) / (365.25 * 24 * 3600 * 1000),
    );
    // Basic gratuity calc: (Basic/26) * 15 * years  (Indian standard rule)
    const basicMonthly = 30000;
    const amount = Math.round((basicMonthly / 26) * 15 * yearsWorked);

    await Gratuity.create({
      employeeId: longestTenured._id,
      companyId,
      gratuityRuleId: gratuityRule._id,
      salaryComponentId: gratuityComp._id,
      postingDate: daysAgo(1),
      payrollDate: daysFromNow(30),
      currentWorkExperience: yearsWorked,
      amount,
      status: "draft",
    });

    console.log(
      `✅ Demo Part 2D (Gratuity): 1 draft gratuity record for ${longestTenured.employeeName}` +
      ` (${yearsWorked} years, ₹${amount.toLocaleString()})`,
    );
  } else {
    console.log("✅ Demo Part 2D (Gratuity): already seeded");
  }
};

// ---------------------------------------------------------------------------
// Part 2E — Performance
// ---------------------------------------------------------------------------

const seedPerformanceData = async (companyId, employees) => {
  // KRAs
  const KRA_NAMES = [
    "Revenue Growth",
    "Client Satisfaction Score",
    "Team Attrition Rate",
    "Process Improvement",
    "Recruitment Turnaround Time",
  ];
  const kraByName = {};
  for (const kraName of KRA_NAMES) {
    const doc = await KRA.findOneAndUpdate(
      { name: kraName },
      { name: kraName },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    kraByName[kraName] = doc;
  }

  // Feedback Criteria
  const CRITERIA = ["Communication", "Leadership", "Delivery", "Collaboration"];
  const criteriaByName = {};
  for (const criteriaName of CRITERIA) {
    const doc = await EmployeeFeedbackCriteria.findOneAndUpdate(
      { criteria: criteriaName },
      { criteria: criteriaName },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    criteriaByName[criteriaName] = doc;
  }

  // Appraisal Template
  let template = await AppraisalTemplate.findOne({ templateTitle: "Standard Appraisal" }).lean();
  if (!template) {
    const kras = Object.values(kraByName).slice(0, 3);
    template = await AppraisalTemplate.create({
      templateTitle: "Standard Appraisal",
      goals: kras.map((k, i) => ({
        kraId: k._id,
        weightage: i === 0 ? 40 : i === 1 ? 35 : 25,
      })),
      ratingCriteria: Object.values(criteriaByName).slice(0, 3).map((c) => ({
        criteriaId: c._id,
        weightage: 100 / 3,
      })),
      isActive: true,
    });
  }

  // Appraisal Cycle
  let cycle = await AppraisalCycle.findOne({ cycleName: "FY 2026 Q2" }).lean();
  if (!cycle) {
    cycle = await AppraisalCycle.create({
      cycleName: "FY 2026 Q2",
      companyId,
      appraisalTemplateId: template._id,
      startDate: new Date("2026-07-01"),
      endDate: new Date("2026-09-30"),
      appraisees: employees.slice(0, 8).map((e) => ({
        employeeId: e._id,
        branchId: e.branchId,
        designationId: e.designationId,
        departmentId: e.departmentId,
        appraisalTemplateId: template._id,
      })),
      status: "In Progress",
    });
  }

  // Appraisals for first 5 employees in cycle
  const appraisalSlice = employees.slice(0, 5);
  let appraisalCount = 0;
  for (const emp of appraisalSlice) {
    const existing = await Appraisal.findOne({
      employeeId: emp._id,
      appraisalCycleId: cycle._id,
    }).lean();
    if (!existing) {
      await Appraisal.create({
        employeeId: emp._id,
        appraisalCycleId: cycle._id,
        appraisalTemplateId: template._id,
        companyId,
        startDate: cycle.startDate,
        endDate: cycle.endDate,
        appraisalKra: Object.values(kraByName).slice(0, 3).map((k) => ({
          kraId: k._id,
          weightage: 100 / 3,
        })),
        goals: [],
        status: "draft",
        selfScore: 0,
        avgFeedbackScore: 0,
        finalScore: 0,
      });
      appraisalCount += 1;
    }
  }

  // Goals (for first 3 employees)
  let goalCount = 0;
  for (const emp of appraisalSlice.slice(0, 3)) {
    const existing = await Goal.findOne({ employeeId: emp._id, appraisalCycleId: cycle._id }).lean();
    if (!existing) {
      await Goal.create({
        goalName: `Q2 OKR — ${emp.employeeName.split(" ")[0]}`,
        employeeId: emp._id,
        appraisalCycleId: cycle._id,
        companyId,
        startDate: cycle.startDate,
        endDate: cycle.endDate,
        status: "In Progress",
        progress: 40,
      });
      goalCount += 1;
    }
  }

  // Employee Performance Feedback (one submitted)
  if (appraisalSlice[0] && appraisalSlice[1]) {
    const appraisal = await Appraisal.findOne({
      employeeId: appraisalSlice[0]._id,
      appraisalCycleId: cycle._id,
    }).lean();
    if (appraisal) {
      const existingFeedback = await EmployeePerformanceFeedback.findOne({
        appraisalId: appraisal._id,
        reviewerId: appraisalSlice[1]._id,
      }).lean();
      if (!existingFeedback) {
        await EmployeePerformanceFeedback.create({
          appraisalId: appraisal._id,
          employeeId: appraisalSlice[0]._id,
          companyId,
          reviewerId: appraisalSlice[1]._id,
          appraisalCycleId: cycle._id,
          feedbackRatings: Object.values(criteriaByName).slice(0, 3).map((c) => ({
            criteriaId: c._id,
            weightage: 100 / 3,
            rating: 0.8,
          })),
          totalScore: 4,
          feedback: "Strong collaborative spirit and consistent delivery.",
          status: "submitted",
        });
      }
    }
  }

  console.log(
    `✅ Demo Part 2E (Performance): ${Object.keys(kraByName).length} KRA(s), ` +
    `1 template, 1 cycle, ${appraisalCount} appraisal(s), ${goalCount} goal(s)`,
  );
};

// ---------------------------------------------------------------------------
// Part 2F — Expenses
// ---------------------------------------------------------------------------

const seedExpenseData = async (companyId, employees) => {
  // Expense Claim Types
  const TYPES = ["Accommodation", "Transport", "Meals", "Office Supplies", "Internet"];
  const typeByName = {};
  for (const typeName of TYPES) {
    const doc = await ExpenseClaimType.findOneAndUpdate(
      { name: typeName },
      { name: typeName },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    typeByName[typeName] = doc;
  }

  const slice = employees.slice(0, 6);
  const CLAIMS = [
    { idx: 0, typeName: "Transport",     amount: 1500, status: "approved" },
    { idx: 1, typeName: "Meals",         amount: 800,  status: "draft" },
    { idx: 2, typeName: "Accommodation", amount: 4500, status: "rejected" },
    { idx: 3, typeName: "Office Supplies", amount: 1200, status: "submitted" },
    { idx: 4, typeName: "Internet",      amount: 600,  status: "draft" },
    { idx: 5, typeName: "Transport",     amount: 2000, status: "approved" },
  ];

  let claimCount = 0;
  for (const claim of CLAIMS) {
    const emp = slice[claim.idx];
    if (!emp) continue;
    const existing = await ExpenseClaim.findOne({
      employeeId: emp._id,
      status: claim.status,
    }).lean();
    if (!existing) {
      // Re-fetch for latest expenseApproverId
      const freshEmp = await Employee.findById(emp._id).lean();
      const expenseType = typeByName[claim.typeName];
      await ExpenseClaim.create({
        employeeId: emp._id,
        companyId,
        departmentId: emp.departmentId,
        postingDate: daysAgo(claim.idx * 5 + 1),
        expenseApproverId: freshEmp?.expenseApproverId ?? null,
        expenses: [{
          expenseDate: daysAgo(claim.idx * 5 + 2),
          expenseTypeId: expenseType._id,
          description: `${claim.typeName} expense`,
          amount: claim.amount,
          sanctionedAmount: claim.status === "approved" ? claim.amount : null,
        }],
        taxes: [],
        totalClaimedAmount: claim.amount,
        totalSanctionedAmount: claim.status === "approved" ? claim.amount : 0,
        totalTaxesAndCharges: 0,
        grandTotal: claim.amount,
        status: claim.status,
        isPaid: claim.status === "approved",
      });
      claimCount += 1;
    }
  }

  console.log(`✅ Demo Part 2F (Expenses): ${Object.keys(typeByName).length} type(s), ${claimCount} claim(s)`);
};

// ---------------------------------------------------------------------------
// Part 2G — Recruitment
// ---------------------------------------------------------------------------

const seedRecruitmentData = async (companyId, employees, companyDoc) => {
  // Find a designation for the opening
  const designations = await Designation.find({ companyId }).lean();
  const designation = designations.find((d) => d.designationName === "Sr. Executive")
    || designations[0];
  if (!designation) return;

  // Job Requisition
  let requisition = await JobRequisition.findOne({
    designationId: designation._id,
    companyId,
  }).lean();
  if (!requisition) {
    requisition = await JobRequisition.create({
      designationId: designation._id,
      companyId,
      departmentId: employees[0]?.departmentId ?? null,
      noOfPositions: 2,
      expectedCompensation: 500000,
      requestedById: employees[0]._id,
      postingDate: daysAgo(14),
      expectedBy: daysFromNow(30),
      description: "Looking for a driven Sr. Executive to join the TA team.",
      status: "Open & Approved",
      isActive: true,
    });
  }

  // Job Opening
  let opening = await JobOpening.findOne({
    jobRequisitionId: requisition._id,
    companyId,
  }).lean();
  if (!opening) {
    opening = await JobOpening.create({
      jobTitle: "Senior Executive — Talent Acquisition",
      designationId: designation._id,
      companyId,
      departmentId: employees[0]?.departmentId ?? null,
      jobRequisitionId: requisition._id,
      vacancies: 2,
      status: "Open",
      postedOn: daysAgo(14),
      publish: false,
      publishSalaryRange: false,
      publishApplicationsReceived: true,
      preventDuplicateApplicant: false,
      currency: "INR",
      isActive: true,
    });
  }

  // Find a source
  const source = await JobApplicantSource.findOne({}).lean();

  // Find India country ref
  const country = await Country.findOne({ countryName: "India" }).lean();

  // Job Applicants
  const APPLICANTS = [
    { name: "Priya Mehta",    email: "priya.mehta.candidate@gmail.com",    status: "Shortlisted" },
    { name: "Rahul Kumar",    email: "rahul.kumar.candidate@gmail.com",     status: "Open" },
    { name: "Sneha Joshi",    email: "sneha.joshi.candidate@gmail.com",     status: "Rejected" },
  ];

  const applicantDocs = [];
  for (const a of APPLICANTS) {
    let applicant = await JobApplicant.findOne({ emailId: a.email }).lean();
    if (!applicant) {
      applicant = await JobApplicant.create({
        applicantName: a.name,
        emailId: a.email,
        designationId: designation._id,
        countryId: country?._id ?? null,
        status: a.status,
        sourceId: source?._id ?? null,
        currency: "INR",
        isActive: true,
      });
    }
    applicantDocs.push(applicant);
  }

  // Find an interviewer-role user
  const interviewerRole = await RoleMaster.findOne({ roleName: "Interviewer" }).lean();
  const interviewerUser = interviewerRole
    ? await Employee.findOne({ roleId: interviewerRole._id }).lean()
    : null;

  // Interview Type
  let interviewType = await InterviewType.findOne({ interviewTypeName: "Technical Round" }).lean();
  if (!interviewType) {
    interviewType = await InterviewType.create({
      interviewTypeName: "Technical Round",
      designationId: designation._id,
      companyId,
      defaultInterviewers: interviewerUser ? [interviewerUser._id] : [],
      rescheduleEmailTemplate: null,
      reminderEmailTemplate: null,
      isActive: true,
    });
  }

  // Interview for the shortlisted applicant
  const shortlistedApplicant = applicantDocs.find(
    (a) => a.status === "Shortlisted",
  );
  if (shortlistedApplicant) {
    const existingInterview = await Interview.findOne({
      jobApplicantId: shortlistedApplicant._id,
    }).lean();
    if (!existingInterview) {
      await Interview.create({
        interviewTypeId: interviewType._id,
        jobApplicantId: shortlistedApplicant._id,
        jobOpeningId: opening._id,
        designationId: designation._id,
        scheduledOn: daysFromNow(3),
        fromTime: "10:00",
        toTime: "11:00",
        status: "Pending",
        interviewers: interviewerUser ? [interviewerUser._id] : [],
        isActive: true,
      });
    }
  }

  // Job Offer for the shortlisted applicant
  if (shortlistedApplicant) {
    const existingOffer = await JobOffer.findOne({
      jobApplicantId: shortlistedApplicant._id,
    }).lean();
    if (!existingOffer) {
      await JobOffer.create({
        jobApplicantId: shortlistedApplicant._id,
        jobOpeningId: opening._id,
        designationId: designation._id,
        companyId,
        offerDate: daysAgo(2),
        status: "Awaiting Response",
        offerTerms: [
          { term: "Annual CTC", value: "₹5,00,000" },
          { term: "Joining Date", value: daysFromNow(30).toISOString().slice(0, 10) },
          { term: "Location", value: "Vadodara" },
        ],
        isActive: true,
      });
    }
  }

  console.log("✅ Demo Part 2G (Recruitment): 1 requisition, 1 opening, 3 applicants, 1 interview, 1 offer");
};

// ---------------------------------------------------------------------------
// Part 2H — Travel
// ---------------------------------------------------------------------------

const seedTravelData = async (companyId, employees) => {
  const slice = employees.slice(0, 5);
  const purpose = await PurposeOfTravel.findOne({ purposeOfTravelName: "Client Meeting" }).lean();

  let count = 0;
  for (const [i, emp] of slice.entries()) {
    const existing = await TravelRequest.findOne({ employeeId: emp._id }).lean();
    if (existing) continue;
    const statuses = ["Draft", "Submitted", "Cancelled"];
    await TravelRequest.create({
      employeeId: emp._id,
      companyId,
      purposeOfTravelId: purpose?._id ?? null,
      travelType: i % 2 === 0 ? "Domestic" : "International",
      status: statuses[i % statuses.length],
      description: "Client demo visit",
      itinerary: [{
        travelFrom: "Vadodara",
        travelTo: i % 2 === 0 ? "Mumbai" : "Singapore",
        modeOfTravel: "Flight",
        departureDate: daysFromNow(7 + i),
        arrivalDate: daysFromNow(8 + i),
        lodgingRequired: true,
      }],
      costings: [{
        sponsoredAmount: 10000,
        fundedAmount: 0,
        totalAmount: 10000,
        comments: "Company sponsored",
      }],
      isActive: true,
    });
    count += 1;
  }

  console.log(`✅ Demo Part 2H (Travel): ${count} travel request(s)`);
};

// ---------------------------------------------------------------------------
// Part 2I — Career Events (Transfer / Promotion / Grievance)
// ---------------------------------------------------------------------------

const seedCareerEventData = async (companyId, employees) => {
  const departments = await Department.find({ companyId }).lean();
  const designations = await Designation.find({ companyId }).lean();
  const grievanceType = await GrievanceType.findOne({}).lean();

  let count = 0;

  // Transfer
  if (employees[3] && departments[1]) {
    const existing = await EmployeeTransfer.findOne({ employeeId: employees[3]._id }).lean();
    if (!existing) {
      await EmployeeTransfer.create({
        employeeId: employees[3]._id,
        transferDate: daysAgo(30),
        newDepartmentId: departments[1]._id,
        isActive: true,
      });
      count += 1;
    }
  }

  // Promotion
  if (employees[4] && designations[2]) {
    const existing = await EmployeePromotion.findOne({ employeeId: employees[4]._id }).lean();
    if (!existing) {
      await EmployeePromotion.create({
        employeeId: employees[4]._id,
        promotionDate: daysAgo(60),
        newDesignationId: designations[2]._id,
        currentCtc: 600000,
        revisedCtc: 720000,
        isActive: true,
      });
      count += 1;
    }
  }

  // Grievance
  if (employees[5] && grievanceType) {
    const existing = await EmployeeGrievance.findOne({
      raisedByEmployeeId: employees[5]._id,
    }).lean();
    if (!existing) {
      await EmployeeGrievance.create({
        subject: "Workspace safety concern",
        description: "A safety concern has been raised for review by the HR team.",
        raisedByEmployeeId: employees[5]._id,
        date: daysAgo(10),
        status: "Open",
        grievanceTypeId: grievanceType._id,
        isActive: true,
      });
      count += 1;
    }
  }

  console.log(`✅ Demo Part 2I (Career Events): ${count} record(s)`);
};

// ---------------------------------------------------------------------------
// Part 2J — Training
// ---------------------------------------------------------------------------

const seedTrainingData = async (companyId, employees) => {
  let program = await TrainingProgram.findOne({ trainingProgramName: "HRMS Fundamentals" }).lean();
  if (!program) {
    program = await TrainingProgram.create({
      trainingProgramName: "HRMS Fundamentals",
      companyId,
      description: "Foundation training for using the Apidel HRMS platform.",
      status: "Completed",
      isActive: true,
    });
  }

  const existing = await TrainingEvent.findOne({ eventName: "HRMS Onboarding Workshop" }).lean();
  if (!existing) {
    const start = daysAgo(7);
    const end = new Date(start.getTime() + 4 * 3600000);
    await TrainingEvent.create({
      eventName: "HRMS Onboarding Workshop",
      trainingProgramId: program._id,
      eventStatus: "Completed",
      type: "Workshop",
      level: "Beginner",
      companyId,
      trainerName: "Apidel L&D Team",
      location: "Vadodara HQ",
      startTime: start,
      endTime: end,
      introduction: "Introduction to the new HRMS platform for all employees.",
      employees: employees.slice(0, 5).map((e) => ({
        employeeId: e._id,
        isMandatory: true,
        attendance: "Present",
        status: "Completed",
        hours: 4,
        grade: "A",
      })),
      isActive: true,
    });
  }

  console.log("✅ Demo Part 2J (Training): 1 program, 1 event with 5 attendees");
};

// ---------------------------------------------------------------------------
// Part 3 — Dashboards
// ---------------------------------------------------------------------------

const seedDashboards = async () => {
  const roleNames = ["HR Manager", "HR User", "Leave Approver", "Employee"];
  const roles = await RoleMaster.find({ roleName: { $in: roleNames } }).lean();
  const roleByName = new Map(roles.map((role) => [role.roleName, role]));

  // --- Widgets ---
  const WIDGETS = [
    {
      title: "Total Headcount",
      description: "Live count of all active employees",
      source: "employees",
      chartType: "stat",
      metric: { type: "count", field: null },
      groupBy: null,
      dateField: null,
      dateRange: "all",
      filters: [{ field: "isActive", op: "eq", value: true }],
    },
    {
      title: "Leave Applications by Status",
      description: "Breakdown of leave requests by approval state",
      source: "leave-applications",
      chartType: "bar",
      metric: { type: "count", field: null },
      groupBy: "status",
      dateField: "fromDate",
      dateRange: "last365",
      filters: [],
    },
    {
      title: "Headcount by Department",
      description: "Employee distribution across departments",
      source: "employees",
      chartType: "bar",
      metric: { type: "count", field: null },
      groupBy: "departmentId",
      dateField: null,
      dateRange: "all",
      filters: [{ field: "isActive", op: "eq", value: true }],
    },
    {
      title: "Daily Checkins — Last 30 Days",
      description: "Attendance checkin volume over recent days",
      source: "employee-checkins",
      chartType: "line",
      metric: { type: "count", field: null },
      groupBy: null,
      dateField: "time",
      dateRange: "last30",
      filters: [],
    },
    {
      title: "Expense Claims by Status",
      description: "Expense claim states across the organisation",
      source: "expense-claims",
      chartType: "bar",
      metric: { type: "count", field: null },
      groupBy: "status",
      dateField: "postingDate",
      dateRange: "last365",
      filters: [],
    },
    {
      title: "Net Pay — Salary Slips",
      description: "Total net payroll disbursed",
      source: "salary-slips",
      chartType: "stat",
      metric: { type: "sum", field: "netPay" },
      groupBy: null,
      dateField: "startDate",
      dateRange: "last90",
      filters: [{ field: "status", op: "eq", value: "submitted" }],
    },
    {
      title: "Job Applicants by Status",
      description: "Funnel view of the current recruitment pipeline",
      source: "job-applicants",
      chartType: "bar",
      metric: { type: "count", field: null },
      groupBy: "status",
      dateField: "createdAt",
      dateRange: "last365",
      filters: [],
    },
  ];

  const widgetDocs = [];
  for (const w of WIDGETS) {
    const doc = await DashboardWidget.findOneAndUpdate(
      { title: w.title },
      { ...w, isActive: true },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    widgetDocs.push(doc);
  }

  // --- Admin/Default Dashboard (roleId: null) ---
  const adminWidgetIds = widgetDocs.slice(0, 4).map((w, i) => ({
    widgetId: w._id,
    sequence: i + 1,
    size: i === 0 ? "sm" : i === 3 ? "lg" : "md",
  }));

  const saveDashboard = async (roleId, widgets) => {
    await RoleDashboard.findOneAndUpdate(
      { roleId },
      { $set: { widgets, isActive: true } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  };

  await saveDashboard(null, adminWidgetIds);

  const roleWidgetIndexes = {
    "HR Manager": [0, 1, 2, 4, 5],
    "HR User": [0, 1, 2, 4],
    // These roles receive only sources seeded for their own accounts, so each
    // dashboard demonstrates populated, role-scoped data rather than empty cards.
    "Leave Approver": [1],
    "Employee": [1, 3],
  };

  for (const [roleName, indexes] of Object.entries(roleWidgetIndexes)) {
    const role = roleByName.get(roleName);
    if (!role) continue;
    const widgets = indexes.map((index, sequence) => ({
      widgetId: widgetDocs[index]._id,
      sequence: sequence + 1,
      size: sequence === 0 ? "sm" : "md",
    }));
    await saveDashboard(role._id, widgets);
  }

  console.log(
    `✅ Demo Part 3 (Dashboards): ${widgetDocs.length} widget(s), ` +
    `admin dashboard + ${roles.length} role dashboard(s) assembled`,
  );
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const run = async () => {
  if (!process.env.DATABASE) {
    console.error("❌ DATABASE is not set in .env");
    process.exit(1);
  }

  mongoose.set("strictQuery", false);
  await mongoose.connect(process.env.DATABASE, { serverSelectionTimeoutMS: 10000 });
  console.log("✅ DB connected");

  const company = await Company.findOne({ companyName: "Apidel" }).lean();
  if (!company) {
    console.error("❌ Apidel company not found — run npm run seed first");
    await mongoose.disconnect();
    process.exit(1);
  }
  const companyId = company._id;

  // Part 1
  const { empByName, createdUserByName } = await seedUserAccounts(companyId);

  // Load all employees for Part 2
  const employees = await Employee.find({ companyId }).lean();

  // Part 2
  await seedLeaveData(companyId, employees);
  await seedShiftAttendanceData(companyId, employees);
  const { componentByName } = await seedPayrollData(companyId, employees);
  await seedGratuityData(companyId, employees, componentByName);
  await seedPerformanceData(companyId, employees);
  await seedExpenseData(companyId, employees);
  await seedRecruitmentData(companyId, employees, company);
  await seedTravelData(companyId, employees);
  await seedCareerEventData(companyId, employees);
  await seedTrainingData(companyId, employees);

  // Part 3
  await seedDashboards();

  // ---------------------------------------------------------------------------
  // Final report
  // ---------------------------------------------------------------------------
  console.log("\n" + "=".repeat(70));
  console.log("✅  DEMO DATA SEED COMPLETE");
  console.log("=".repeat(70));
  console.log(`\n  Shared demo password: ${DEMO_PASSWORD}\n`);
  console.log("  Sample login accounts (email → assigned role):");

  // Print a few representative accounts.
  const SAMPLE_NAMES = [
    "Hemant Patel",    // MD & Founder → HR Manager
    "Amita Patel",     // CEO → HR Manager
    "Mamta Patel",     // Sr. Manager, Payroll & Compliance → HR User
    "Pradeep Talreja", // Sr. Director (has direct reports) → HR Manager
    "Sheldon Bobby",   // AVP, Talent Acquisition → HR Manager
    "Roshani Kandalkar", // Senior Team Lead, TA → Interviewer (has manager role in hierarchy)
  ];

  for (const name of SAMPLE_NAMES) {
    const emp = empByName?.get(name) || createdUserByName?.get(name);
    const user = emp?.email ? emp : null;
    if (!user) {
      const rows = (await readOrgChartRows()).filter((r) => r.name === name);
      if (rows[0]) {
        const r = dedupeEmails(rows)[0];
        const employee = await Employee.findOne({ email: r._email }).lean();
        if (employee) {
          const roleName = await RoleMaster.findById(employee.roleId).lean();
          console.log(`  ${r._email.padEnd(45)} → ${roleName?.roleName ?? "?"}`);
        }
      }
      continue;
    }
    const roleName = await RoleMaster.findById(user.roleId).lean();
    console.log(`  ${user.email.padEnd(45)} → ${roleName?.roleName ?? "?"}`);
  }

  console.log("\n  Role-conflict resolution (single roleId per User):");
  console.log("  • Senior titles win over all others (HR Manager).");
  console.log("  • HR-adjacent dept + manager title → HR User (below HR Manager).");
  console.log("  • Talent-Acquisition dept members → Interviewer (not Leave Approver).");
  console.log("  • Real managers (appear in manager_name) → Leave Approver when no");
  console.log("    higher-priority role applies; also get Expense Approver links.");
  console.log("  • Expense Approver is a capability wired via Employee.expenseApproverId,");
  console.log("    not a separate User.roleId (single-role model — noted as judgment call).");
  console.log("\n  leaveApproverId + expenseApproverId wired on direct-reports: YES");
  console.log("  GratuityRule applicableEarningsComponent patched: YES");
  console.log("=".repeat(70) + "\n");

  await mongoose.disconnect();
  console.log("✅ Done.");
};

run().catch(async (error) => {
  console.error("❌ Demo seed failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
