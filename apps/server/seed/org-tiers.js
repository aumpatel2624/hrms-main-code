/**
 * Org-tier seeder — the five reporting-line tiers plus the nine functional
 * roles, and their page access.
 *
 *   npm run seed:tiers                       roles + permission matrices only
 *   npm run seed:tiers -- --with-test-users  ...and REPLACE every employee with
 *                                            a small test roster (see below)
 *
 * Matrices come from org-tiers.data.js (CEO, Tower, Department Manager, Team
 * Lead, Employee) and org-functional-roles.data.js (HR Head, HR Executive,
 * Payroll, Recruiter, Hiring Manager & Interviewer, Finance, L&D Coordinator,
 * System Admin, Auditor) — the "Org Tier Page Access" proposal. Run
 * `npm run seed` first: this needs the menu rows and the "Employee" role.
 *
 * For each of those roles the WHOLE matrix is replaced, not merged: the
 * proposal lists exactly which pages a role can open, and a leftover grant from
 * an earlier seed would silently contradict it. The older HR User / HR Manager /
 * Leave Approver / Expense Approver / Interviewer roles are not touched.
 *
 * --with-test-users hard-deletes every Employee (including their logins) and
 * creates a test roster shaped like the real org (confirmed with the user,
 * 2026-09-18): 1 CEO, 2 Towers splitting 6 departments (3 each), 6 Department
 * Managers (one per department), Team Leads only in 2 of those departments (2
 * each) — the other 4 departments' Employees report straight to their
 * Department Manager. This is deliberate, not an oversight: `dataScope: TEAM`
 * (utils/subordinates.js) walks the live `reportsToId` chain to whatever depth
 * it finds, so a Department Manager with no Team Lead under them already sees
 * exactly their own Employees with no code change — this roster is what
 * exercises that branch, which the old single-chain roster never did. Login is
 * the Employee Code for both username and password, the same convention as
 * seed/index.js (ADR-040). Records other collections hold about the deleted
 * employees (attendance, leave…) are NOT removed.
 */
// Must stay the first two imports — see seed/index.js.
import "../models/softDelete.js";
import "../models/auditPlugin.js";

import bcrypt from "bcrypt";
import dotenv from "dotenv";
import mongoose from "mongoose";

import Branch from "../models/Branch.js";
import Company from "../models/Company.js";
import Department from "../models/Department.js";
import Designation from "../models/Designation.js";
import Employee from "../models/Employee.js";
import MenuMaster from "../models/MenuMaster.js";
import RoleMaster from "../models/RoleMaster.js";
import UserRoles from "../models/UserRoles.js";
import { SCOPES } from "@demo-panel/shared/scopes";
import MenuGroupMaster from "../models/MenuGroupMaster.js";
import RoleDashboard from "../models/RoleDashboard.js";
import { ALL_ROLE_NAMES, LINK_PAGES, TIER_PAGES, TIER_ROLES, buildRoleRows } from "./org-tiers.data.js";
import { FUNCTIONAL_ROLES } from "./org-functional-roles.data.js";

dotenv.config();

const WITH_TEST_USERS = process.argv.includes("--with-test-users");

const COMPANY_NAME = "Apidel";
const TEST_BRANCH = "Vadodara";

/**
 * 6 generic test departments — not real Apidel departments, so they read
 * unmistakably as test data. "Dept A" and "Dept B" are the two with Team
 * Leads; "Dept C"–"Dept F" go straight from Department Manager to Employee.
 */
const DEPARTMENTS = ["Dept A", "Dept B", "Dept C", "Dept D", "Dept E", "Dept F"];
const HAS_TEAM_LEADS = new Set(["Dept A", "Dept B"]);
const TOWER_1_DEPARTMENTS = ["Dept A", "Dept B", "Dept C"];
const TOWER_2_DEPARTMENTS = ["Dept D", "Dept E", "Dept F"];
const EMPLOYEES_PER_LEAF = 2;

/** Test roster: code doubles as username and password. `reportsTo` is another code. */
const buildTestUsers = () => {
  const users = [
    { code: "CEO001", name: "Test CEO", role: "CEO", title: "CEO", department: "Dept A", reportsTo: null },
    { code: "TWR001", name: "Test Tower One", role: "Tower", title: "Director", department: "Dept A", reportsTo: "CEO001" },
    { code: "TWR002", name: "Test Tower Two", role: "Tower", title: "Director", department: "Dept D", reportsTo: "CEO001" },
  ];
  const towerOf = (dept) => (TOWER_1_DEPARTMENTS.includes(dept) ? "TWR001" : "TWR002");

  DEPARTMENTS.forEach((dept, i) => {
    const dmCode = `DM00${i + 1}`;
    users.push({ code: dmCode, name: `Test ${dept} Manager`, role: "Department Manager", title: "Manager", department: dept, reportsTo: towerOf(dept) });

    if (!HAS_TEAM_LEADS.has(dept)) {
      for (let e = 1; e <= EMPLOYEES_PER_LEAF; e++) {
        users.push({ code: `${dmCode}E${e}`, name: `Test ${dept} Employee ${e}`, role: "Employee", title: "Executive", department: dept, reportsTo: dmCode });
      }
      return;
    }
    for (let t = 1; t <= 2; t++) {
      const tlCode = `${dmCode}TL${t}`;
      users.push({ code: tlCode, name: `Test ${dept} Team Lead ${t}`, role: "Team Lead", title: "Team Lead", department: dept, reportsTo: dmCode });
      for (let e = 1; e <= EMPLOYEES_PER_LEAF; e++) {
        users.push({ code: `${tlCode}E${e}`, name: `Test ${dept} Team ${t} Employee ${e}`, role: "Employee", title: "Executive", department: dept, reportsTo: tlCode });
      }
    }
  });
  return users;
};
const TEST_USERS = buildTestUsers();

const seedTierRoles = async () => {
  const menuUrls = [...new Set([
    ...TIER_PAGES.map(([menuUrl]) => menuUrl),
    ...Object.values(FUNCTIONAL_ROLES).flatMap((role) => role.pages.map(([menuUrl]) => menuUrl)),
  ])];
  const menus = await MenuMaster.find({ menuUrl: { $in: menuUrls } }).lean();
  const menuByUrl = new Map(menus.map((menu) => [menu.menuUrl, menu]));
  const missing = menuUrls.filter((menuUrl) => !menuByUrl.has(menuUrl));
  if (missing.length) {
    throw new Error(`Menu rows missing for: ${missing.join(", ")} — run \`npm run seed\` first`);
  }

  // Dashboard / Documentation are link groups: the sidebar shows them only when
  // the role has a row for the group itself.
  const linkUrls = LINK_PAGES.map(([menuUrl]) => menuUrl);
  const groups = await MenuGroupMaster.find({ menuUrl: { $in: linkUrls }, isLink: true }).lean();
  const groupByUrl = new Map(groups.map((group) => [group.menuUrl, group]));
  const missingGroups = linkUrls.filter((menuUrl) => !groupByUrl.has(menuUrl));
  if (missingGroups.length) {
    throw new Error(`Link groups missing for: ${missingGroups.join(", ")} — run \`npm run seed\` first`);
  }

  const employeeRole = await RoleMaster.findOne({ roleName: "Employee" }).lean();
  const employeeDashboard = employeeRole && await RoleDashboard.findOne({ roleId: employeeRole._id }).lean();

  for (const roleName of ALL_ROLE_NAMES) {
    const role = await RoleMaster.findOneAndUpdate(
      { roleName },
      { roleName, isActive: true },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    const rows = buildRoleRows(roleName);
    const menuRows = rows.menuRows.map(({ menuUrl, ...permissions }) => {
      const menu = menuByUrl.get(menuUrl);
      return { menuId: menu._id, menuGroupId: menu.menuGroup, ...permissions };
    });
    const linkRows = rows.linkRows.map(({ menuUrl, ...permissions }) => ({
      menuId: null,
      menuGroupId: groupByUrl.get(menuUrl)._id,
      ...permissions,
    }));
    const roles = [...linkRows, ...menuRows];

    await UserRoles.findOneAndUpdate(
      { roleId: role._id },
      { roleId: role._id, roles, dataScope: SCOPES.ALL, isActive: true },
      { upsert: true, setDefaultsOnInsert: true },
    );
    // A role with no dashboard shows an empty one — start the new tiers from the
    // Employee dashboard. Never overwrites one that already exists.
    if (employeeDashboard && roleName !== "Employee") {
      const widgets = employeeDashboard.widgets.map(({ widgetId, sequence, size }) => ({ widgetId, sequence, size }));
      await RoleDashboard.updateOne(
        { roleId: role._id },
        { $setOnInsert: { roleId: role._id, isActive: true, widgets } },
        { upsert: true },
      );
    }
    console.log(`✅ ${roleName}: ${roles.length} grant(s) (${linkRows.length} link group + ${menuRows.length} page)`);
  }
};

const lookupId = (byName, name, kind) => {
  const id = byName.get(name);
  if (!id) throw new Error(`Test users: no ${kind} named "${name}" — run \`npm run seed\` first`);
  return id;
};

const seedTestUsers = async () => {
  const company = await Company.findOne({ companyName: COMPANY_NAME }).lean();
  if (!company) throw new Error(`Test users: company "${COMPANY_NAME}" not found — run \`npm run seed\` first`);

  // The 6 generic test departments are seeded here rather than assumed present —
  // a fresh clone's Department Setup starter data won't have "Dept A"..."Dept F".
  for (const departmentName of DEPARTMENTS) {
    await Department.findOneAndUpdate(
      { departmentName, companyId: company._id },
      { departmentName, companyId: company._id, isActive: true },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }

  const [departments, designations, branches, roles] = await Promise.all([
    Department.find({ companyId: company._id }).lean(),
    Designation.find({ companyId: company._id }).lean(),
    Branch.find({ companyId: company._id }).lean(),
    RoleMaster.find({ roleName: { $in: TIER_ROLES } }).lean(),
  ]);
  const departmentByName = new Map(departments.map((d) => [d.departmentName, d._id]));
  const designationByName = new Map(designations.map((d) => [d.designationName, d._id]));
  const branchByName = new Map(branches.map((b) => [b.branchName, b._id]));
  const roleByName = new Map(roles.map((r) => [r.roleName, r._id]));

  // Native delete: bypasses soft delete so the unique codes/emails are freed.
  const { deletedCount } = await Employee.collection.deleteMany({});
  console.log(`🗑️  Removed ${deletedCount} employee(s)`);

  const idByCode = new Map();
  for (const user of TEST_USERS) {
    const employee = await Employee.create({
      employeeCode: user.code,
      employeeName: user.name,
      email: user.code,
      password: await bcrypt.hash(user.code, 10),
      roleId: roleByName.get(user.role),
      companyId: company._id,
      departmentId: lookupId(departmentByName, user.department, "department"),
      designationId: lookupId(designationByName, user.title, "designation"),
      branchId: lookupId(branchByName, TEST_BRANCH, "branch"),
      dateOfJoining: new Date(),
      isActive: true,
      reportsToId: user.reportsTo ? idByCode.get(user.reportsTo) : null,
    });
    idByCode.set(user.code, employee._id);
  }
  console.log(`✅ Test users: ${TEST_USERS.length} created (login = Employee Code / Employee Code)`);
  for (const user of TEST_USERS) {
    console.log(`   ${user.code.padEnd(10)} ${user.role.padEnd(19)} ${user.department.padEnd(8)} reports to ${user.reportsTo ?? "—"}`);
  }
};

const run = async () => {
  if (!process.env.DATABASE) {
    console.error("❌ DATABASE is not set in .env");
    process.exit(1);
  }
  mongoose.set("strictQuery", false);
  await mongoose.connect(process.env.DATABASE, { serverSelectionTimeoutMS: 10000 });
  console.log("✅ DB connected");

  await seedTierRoles();
  if (WITH_TEST_USERS) await seedTestUsers();

  await mongoose.disconnect();
  console.log("✅ Tier seeding complete");
};

run().catch(async (error) => {
  console.error("❌ Tier seeding failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
