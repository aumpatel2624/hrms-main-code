/**
 * Org-tier seeder — the five reporting-line tiers plus the nine functional
 * roles, and their page access.
 *
 *   npm run seed:tiers   roles + permission matrices
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
 */
// Must stay the first two imports — see seed/index.js.
import "../models/softDelete.js";
import "../models/auditPlugin.js";

import dotenv from "dotenv";
import mongoose from "mongoose";

import MenuMaster from "../models/MenuMaster.js";
import RoleMaster from "../models/RoleMaster.js";
import UserRoles from "../models/UserRoles.js";
import { SCOPES } from "@demo-panel/shared/scopes";
import MenuGroupMaster from "../models/MenuGroupMaster.js";
import RoleDashboard from "../models/RoleDashboard.js";
import { ALL_ROLE_NAMES, LINK_PAGES, TIER_PAGES, buildRoleRows } from "./org-tiers.data.js";
import { FUNCTIONAL_ROLES } from "./org-functional-roles.data.js";

dotenv.config();

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

const run = async () => {
  if (!process.env.DATABASE) {
    console.error("❌ DATABASE is not set in .env");
    process.exit(1);
  }
  mongoose.set("strictQuery", false);
  await mongoose.connect(process.env.DATABASE, { serverSelectionTimeoutMS: 10000 });
  console.log("✅ DB connected");

  await seedTierRoles();

  await mongoose.disconnect();
  console.log("✅ Tier seeding complete");
};

run().catch(async (error) => {
  console.error("❌ Tier seeding failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
