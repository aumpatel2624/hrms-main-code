/**
 * Database seeder.
 *
 * Creates the menu groups, menus and the first admin user so a fresh database
 * can be logged into, and backfills the soft-delete flag. Safe to re-run:
 * everything is upserted by name/email and an existing admin user's password is
 * never overwritten.
 *
 *   npm run seed
 */
// Must stay the first two imports — see models/softDelete.js and
// models/auditPlugin.js. Both are global plugins that only reach models
// compiled after them, and both throw on boot rather than skipping one
// silently. backfillSoftDelete() below imports every model file, so without
// these the loop would compile models unplugged.
import "../models/softDelete.js";
import "../models/auditPlugin.js";

import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

import MenuGroupMaster from "../models/MenuGroupMaster.js";
import MenuMaster from "../models/MenuMaster.js";
import AdminUser from "../models/AdminUser.js";
import Company from "../models/Company.js";
import Branch from "../models/Branch.js";
import Department from "../models/Department.js";
import Designation from "../models/Designation.js";
import EmploymentType from "../models/EmploymentType.js";
import RoleMaster from "../models/RoleMaster.js";
import UserRoles from "../models/UserRoles.js";
import { PERMISSION_KEYS } from "@demo-panel/shared/permissions";
import { SCOPES } from "@demo-panel/shared/scopes";

dotenv.config();

/**
 * ADR-017 (Organization Setup) — placeholder name until Apidel supplies real
 * multi-company data (grill-me, 2026-09-10: user chose "one entity for now,
 * placeholder name").
 */
const APIDEL_COMPANY_NAME = "Apidel";

/** Minimal RFC-4180-ish CSV line parser — good enough for this one file's
 * shape (quoted fields with embedded commas, no embedded newlines/escaped
 * quotes). Not a dependency: `docs/knowledge/apidel-org-chart.csv` is the
 * only CSV this repo reads. */
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

/**
 * Reads the real Apidel org-chart data recovered during grill-me (2026-09-10
 * — the source file is a Claude Design Canvas export, not plain HTML; the CSV
 * is the already-extracted, clean form). Returns parsed rows keyed by header.
 */
const readOrgChartRows = () => {
  const csvPath = path.join(import.meta.dirname, "../../../docs/knowledge/apidel-org-chart.csv");
  const lines = fs.readFileSync(csvPath, "utf8").trim().split("\n");
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
};

/** ADR-017: the two department-name pairs decided in DOMAIN.md/OPEN-QUESTIONS.md Q-6. */
const normalizeDepartmentName = (name) => {
  if (/^pr and social media$/i.test(name)) return "PR and Social media";
  if (/^corporate recruitment(\s*&\s*facility management)?$/i.test(name)) {
    return "Corporate Recruitment & Facility Management";
  }
  return name;
};

/**
 * Menu tree. `isLink: true` groups render as a single sidebar link with no
 * children; everything else is a collapsible group holding `menus`.
 */
const MENU_GROUPS = [
  {
    menuGroupName: "Dashboard",
    sequence: 1,
    isLink: true,
    menuUrl: "/dashboard",
    icon: "ri-dashboard-2-line",
    menus: [],
  },
  {
    menuGroupName: "Setup",
    sequence: 2,
    icon: "ri-settings-3-line",
    menus: [
      { menuName: "Admin Users", menuUrl: "/admin-user", icon: "ri-shield-user-line" },
      { menuName: "Users", menuUrl: "/user", icon: "ri-user-3-line" },
      { menuName: "User Roles", menuUrl: "/user-roles", icon: "ri-lock-password-line" },
      { menuName: "Dashboard Builder", menuUrl: "/dashboard-builder", icon: "ri-bar-chart-2-line" },
      { menuName: "SEO Pages", menuUrl: "/seo-pages", icon: "ri-search-eye-line" },
      { menuName: "SEO Settings", menuUrl: "/seo-settings", icon: "ri-global-line" },
      { menuName: "Redirects", menuUrl: "/seo-redirects", icon: "ri-arrow-left-right-line" },
      { menuName: "404 Log", menuUrl: "/seo-404", icon: "ri-error-warning-line" },
    ],
  },
  // HRMS module 1 (ADR-017). Department already existed under "Master" —
  // moveDepartmentMenuToHrSetup() moves its existing row here in place
  // (same _id, so existing role permissions on it survive) rather than
  // seedMenus() creating a duplicate under this group's new menuGroup id.
  {
    menuGroupName: "HR Setup",
    sequence: 2.5,
    icon: "ri-building-4-line",
    menus: [
      { menuName: "Company", menuUrl: "/company", icon: "ri-community-line" },
      { menuName: "Branch", menuUrl: "/branch", icon: "ri-map-pin-2-line" },
      { menuName: "Department", menuUrl: "/department", icon: "ri-building-line" },
      { menuName: "Designation", menuUrl: "/designation", icon: "ri-user-star-line" },
      { menuName: "Employment Type", menuUrl: "/employment-type", icon: "ri-briefcase-line" },
      { menuName: "Employee Grade", menuUrl: "/employee-grade", icon: "ri-medal-line" },
    ],
  },
  {
    menuGroupName: "Master",
    sequence: 3,
    icon: "ri-database-2-line",
    menus: [
      { menuName: "Country", menuUrl: "/country", icon: "ri-earth-line" },
      { menuName: "State", menuUrl: "/state", icon: "ri-map-2-line" },
      { menuName: "City", menuUrl: "/city", icon: "ri-map-pin-line" },
      { menuName: "Currency", menuUrl: "/currency-master", icon: "ri-money-dollar-circle-line" },
      { menuName: "Role Master", menuUrl: "/role-master", icon: "ri-shield-keyhole-line" },
      { menuName: "Menu Group", menuUrl: "/menu-group", icon: "ri-menu-2-line" },
      { menuName: "Menu Master", menuUrl: "/menu-master", icon: "ri-list-check-2" },
      { menuName: "Login Attempt Logs", menuUrl: "/login-attempt-logs", icon: "ri-history-line" },
      { menuName: "Audit Log", menuUrl: "/audit-log", icon: "ri-file-list-3-line" },
    ],
  },
  {
    menuGroupName: "CMS",
    sequence: 4,
    icon: "ri-mail-settings-line",
    menus: [
      { menuName: "Email Setup", menuUrl: "/email-setup", icon: "ri-mail-settings-line" },
      { menuName: "Email For", menuUrl: "/email-for", icon: "ri-mail-open-line" },
      { menuName: "Email Template", menuUrl: "/email-template", icon: "ri-mail-line" },
    ],
  },
  // A direct link rather than a group: the end-user documentation is one
  // screen, and it is the screen a confused user goes looking for, so it sits
  // at the top level of the sidebar rather than inside Setup.
  {
    menuGroupName: "Documentation",
    sequence: 5,
    isLink: true,
    menuUrl: "/documentation",
    icon: "ri-book-open-line",
    menus: [],
  },
];

const seedMenus = async () => {
  let groupCount = 0;
  let menuCount = 0;

  for (const { menus, ...group } of MENU_GROUPS) {
    const savedGroup = await MenuGroupMaster.findOneAndUpdate(
      { menuGroupName: group.menuGroupName },
      { ...group, isLink: group.isLink || false, isActive: true },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    groupCount += 1;

    for (const [index, menu] of menus.entries()) {
      await MenuMaster.findOneAndUpdate(
        { menuName: menu.menuName, menuGroup: savedGroup._id },
        {
          ...menu,
          menuGroup: savedGroup._id,
          sequence: index + 1,
          isActive: true,
          isParent: false,
          parentMenu: null,
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
      menuCount += 1;
    }
  }

  console.log(`✅ Seeded ${groupCount} menu groups and ${menuCount} menus`);
};

const seedAdminUser = async () => {
  const email = (process.env.SEED_ADMIN_EMAIL || "admin@demopanel.com")
    .trim()
    .toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || "Admin@123";

  const existing = await AdminUser.findOne({ email });
  if (existing) {
    console.log(`ℹ️  Admin user ${email} already exists, password left as is`);
    return;
  }

  await AdminUser.create({
    adminName: process.env.SEED_ADMIN_NAME || "Super Admin",
    email,
    password: await bcrypt.hash(password, 10),
    mobileNumber: process.env.SEED_ADMIN_MOBILE || "9999999999",
    isActive: true,
  });

  console.log(`✅ Created admin user ${email} (password: ${password})`);
};

/**
 * Rename the Report Builder menu row to Dashboard Builder, in place.
 *
 * seedMenus upserts by `{ menuName, menuGroup }`, so on an existing database
 * the renamed row would not match and a *second* MenuMaster document would be
 * inserted with a new `_id`. Every UserRoles row references the screen by
 * `menuId`, and checkPermission resolves `/dashboard-builder` to the new id —
 * so every non-admin role would silently lose the screen while the old row
 * lingered in the matrix UI. Renaming first keeps the `_id`, and with it every
 * role's existing permissions.
 *
 * Must run before seedMenus(). Idempotent: matches nothing once renamed, and
 * skips if a Dashboard Builder row already exists (a database seeded after
 * this change, where seedMenus created it under the new name).
 */
const renameReportBuilderMenu = async () => {
  const existing = await MenuMaster.findOne({ menuUrl: "/dashboard-builder" }).lean();
  if (existing) return;

  const result = await MenuMaster.updateOne(
    { menuUrl: "/report-builder" },
    { $set: { menuName: "Dashboard Builder", menuUrl: "/dashboard-builder" } },
  );

  if (result.modifiedCount) {
    console.log("✅ Renamed the Report Builder menu row to Dashboard Builder (permissions kept)");
  }
};

/**
 * Collapse duplicate UserRoles documents per role (ADR-002).
 *
 * The schema now declares `{ roleId: 1 }` unique, and backfillSoftDelete's
 * syncIndexes builds it. If an existing database ever collected two matrix
 * documents for one role, the build would fail — so keep the newest document
 * per role and soft-delete the rest first. Runs on the raw collection because
 * the soft-delete partial index only counts `isDeleted: false` rows.
 *
 * Idempotent: once each role has a single live document, this matches nothing.
 */
const dedupeUserRoles = async () => {
  const collection = mongoose.connection.collection("userroles");
  const duplicates = await collection
    .aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $sort: { updatedAt: -1 } },
      { $group: { _id: "$roleId", ids: { $push: "$_id" } } },
      { $match: { $expr: { $gt: [{ $size: "$ids" }, 1] } } },
    ])
    .toArray();

  let collapsed = 0;
  for (const group of duplicates) {
    const [, ...older] = group.ids; // first is the newest — keep it
    const result = await collection.updateMany(
      { _id: { $in: older } },
      { $set: { isDeleted: true } },
    );
    collapsed += result.modifiedCount;
  }

  if (collapsed) {
    console.log(`✅ User roles: collapsed ${collapsed} duplicate matrix document(s)`);
  }
};

/**
 * Backfill for EmailFor.triggerKey (ADR-015), a new required+unique field.
 * Pre-existing rows have no value for it, and the field's unique index would
 * fail to build if two or more shared the missing-field "null". Must run
 * before backfillSoftDelete's syncIndexes.
 *
 * The one real row this starter ships, "Forget Password", gets the real
 * registry key it corresponds to. Anything else found (a project's own rows)
 * gets a slugged placeholder so the index can build; it is flagged for a
 * human to reassign from the trigger dropdown, since only a person knows
 * which registry entry an arbitrary label was meant to be.
 *
 * Idempotent: only touches documents with no triggerKey yet.
 */
const backfillEmailForTriggerKeys = async () => {
  const collection = mongoose.connection.collection("emailfors");

  await collection.updateOne(
    { emailFor: "Forget Password", triggerKey: { $exists: false } },
    { $set: { triggerKey: "password.forgot" } },
  );

  const orphans = await collection.find({ triggerKey: { $exists: false } }).toArray();
  for (const row of orphans) {
    const slug = row.emailFor
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    await collection.updateOne(
      { _id: row._id },
      { $set: { triggerKey: `unassigned.${slug || row._id}` } },
    );
  }

  if (orphans.length) {
    console.log(
      `⚠️  Email For: ${orphans.length} row(s) had no registry trigger — assigned a placeholder key, reassign from the admin dropdown`,
    );
  }
};

/**
 * Collapse duplicate *active* EmailTemplate rows per EmailFor — the ambiguity
 * INV-5/ADR-015 closes, which docs/email-trigger-system.md found already live
 * (otp.controller.js's unsorted lookup was picking whichever Mongo returned
 * first). The schema now declares a partial unique index on `emailFor` scoped
 * to `isActive: true`; two active templates for one trigger would fail that
 * build. Keep the most recently updated one, deactivate the rest — same
 * pattern as dedupeUserRoles above. Must run before backfillSoftDelete.
 *
 * Idempotent: once each EmailFor has at most one active template, this
 * matches nothing.
 */
const dedupeActiveEmailTemplates = async () => {
  const collection = mongoose.connection.collection("emailtemplates");
  const duplicates = await collection
    .aggregate([
      { $match: { isActive: true, isDeleted: { $ne: true } } },
      { $sort: { updatedAt: -1 } },
      { $group: { _id: "$emailFor", ids: { $push: "$_id" } } },
      { $match: { $expr: { $gt: [{ $size: "$ids" }, 1] } } },
    ])
    .toArray();

  let deactivated = 0;
  for (const group of duplicates) {
    const [, ...older] = group.ids; // first is the newest — keep it active
    const result = await collection.updateMany(
      { _id: { $in: older } },
      { $set: { isActive: false } },
    );
    deactivated += result.modifiedCount;
  }

  if (deactivated) {
    console.log(
      `⚠️  Email Template: deactivated ${deactivated} duplicate active template(s) sharing an Email For — the newest per trigger was kept active, review the rest`,
    );
  }
};

/**
 * Backfill for the soft-delete plugin (ADR-001), and the only place the unique
 * indexes get rebuilt as partial ones.
 *
 * Documents written before the plugin existed have no `isDeleted` field. Reads
 * still show them — the filter is `$ne: true` — but a partial unique index
 * keyed on `isDeleted: false` would skip them, so uniqueness would silently
 * stop being enforced on exactly the rows that predate this. Set the field
 * first, then sync.
 *
 * Idempotent: the update matches nothing on a second run, and `syncIndexes` is
 * a no-op once the indexes match the schema.
 */
const backfillSoftDelete = async () => {
  // Every model, not just the ones this file seeds — and without a hand-kept
  // list that the seventeenth model would drop off.
  const modelsDir = path.join(import.meta.dirname, "../models");
  for (const file of fs.readdirSync(modelsDir)) {
    if (file.endsWith(".js") && !file.endsWith(".test.js")) await import(`../models/${file}`);
  }

  let flagged = 0;
  for (const model of Object.values(mongoose.models)) {
    const result = await model.collection.updateMany(
      { isDeleted: { $exists: false } },
      { $set: { isDeleted: false } },
    );
    flagged += result.modifiedCount;
    // Rewrites plain unique indexes as partial ones. Note this also drops any
    // index that exists in the database but not in a schema.
    await model.syncIndexes();
  }

  console.log(`✅ Soft delete: flagged ${flagged} existing documents, indexes in sync`);
};

/**
 * ADR-017 (Organization Setup). Company.companyId is a required ref on
 * Department (and everything HRMS builds from here on) — this must exist,
 * and its _id be known, before backfillDepartmentCompany or any of the real
 * org-data seeding below. Upserted by name, like every other seed row here.
 */
const ensureApidelCompany = async () => {
  const company = await Company.findOneAndUpdate(
    { companyName: APIDEL_COMPANY_NAME },
    { companyName: APIDEL_COMPANY_NAME, isActive: true },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return company._id;
};

/**
 * Backfill for Department.companyId (ADR-017), a new required field.
 * Pre-existing rows (the starter's 6 fixture departments, or any project's
 * own) have no value for it — the new unique index is compound with
 * companyId, so this must run before backfillSoftDelete's syncIndexes, same
 * reasoning as backfillEmailForTriggerKeys above.
 *
 * Idempotent: only touches documents with no companyId yet.
 */
const backfillDepartmentCompany = async (companyId) => {
  const result = await Department.updateMany(
    { companyId: { $exists: false } },
    { $set: { companyId } },
  );

  if (result.modifiedCount) {
    console.log(
      `✅ Department: backfilled companyId on ${result.modifiedCount} existing row(s) → ${APIDEL_COMPANY_NAME}`,
    );
  }
};

/**
 * Move the existing Department menu row into the new "HR Setup" group, in
 * place — same reasoning and pattern as renameReportBuilderMenu above.
 * seedMenus() upserts by { menuName, menuGroup }, so if this row still
 * pointed at the old "Master" group's id, seedMenus creating "HR Setup"'s
 * Department entry would insert a *second* MenuMaster document (new _id),
 * silently dropping every role's existing permissions on the first one.
 *
 * Must run before seedMenus(). Idempotent: no-op once the row already
 * belongs to a group named "HR Setup".
 */
const moveDepartmentMenuToHrSetup = async () => {
  const existing = await MenuMaster.findOne({ menuUrl: "/department" }).populate("menuGroup");
  if (!existing || existing.menuGroup?.menuGroupName === "HR Setup") return;

  const hrSetupGroup = await MenuGroupMaster.findOneAndUpdate(
    { menuGroupName: "HR Setup" },
    { menuGroupName: "HR Setup", sequence: 2.5, icon: "ri-building-4-line", isActive: true, isLink: false },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  await MenuMaster.updateOne({ _id: existing._id }, { $set: { menuGroup: hrSetupGroup._id } });
  console.log("✅ Moved the Department menu row from Master to HR Setup (permissions kept)");
};

/**
 * Real Apidel org-structure data (ADR-017), recovered from the org-chart
 * file during grill-me — see readOrgChartRows(). Every row upserted by its
 * natural key, scoped to the one seeded Company, so this is safe to re-run.
 * Does NOT touch seed/fixtures.js's 6 fictional demo departments — those are
 * a separate, deliberately-fictional dataset (see that file's own header).
 */
const seedOrganizationSetupData = async (companyId) => {
  const rows = readOrgChartRows();

  const locations = [...new Set(rows.map((r) => r.location).filter(Boolean))];
  let branchCount = 0;
  for (const branchName of locations) {
    await Branch.findOneAndUpdate(
      { branchName, companyId },
      { branchName, companyId, isActive: true },
      { upsert: true, setDefaultsOnInsert: true },
    );
    branchCount += 1;
  }

  const departmentNames = [
    ...new Set(rows.map((r) => normalizeDepartmentName(r.department)).filter(Boolean)),
  ];
  let departmentCount = 0;
  for (const departmentName of departmentNames) {
    await Department.findOneAndUpdate(
      { departmentName, companyId },
      { departmentName, companyId, isActive: true },
      { upsert: true, setDefaultsOnInsert: true },
    );
    departmentCount += 1;
  }

  const designationNames = [...new Set(rows.map((r) => r.title).filter(Boolean))];
  let designationCount = 0;
  for (const designationName of designationNames) {
    await Designation.findOneAndUpdate(
      { designationName, companyId },
      { designationName, companyId, isActive: true },
      { upsert: true, setDefaultsOnInsert: true },
    );
    designationCount += 1;
  }

  // Not derived from the CSV — it has no employment-type column. A small
  // reasonable starter set the client can edit (ADR-017).
  const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Intern"];
  let employmentTypeCount = 0;
  for (const employmentTypeName of EMPLOYMENT_TYPES) {
    await EmploymentType.findOneAndUpdate(
      { employmentTypeName },
      { employmentTypeName, isActive: true },
      { upsert: true, setDefaultsOnInsert: true },
    );
    employmentTypeCount += 1;
  }

  console.log(
    `✅ Organization setup data: ${branchCount} branches, ${departmentCount} departments, ` +
      `${designationCount} designations, ${employmentTypeCount} employment types (${APIDEL_COMPANY_NAME})`,
  );
};

/**
 * The 6 HRMS roles below System Manager (ADR-017 — System Manager maps to
 * this starter's existing ADMIN account type, already unrestricted, so it
 * gets no RoleMaster row). Grants full read/write/edit/delete on this
 * module's 6 menus to HR User and HR Manager only; the other four roles have
 * no business reason to touch org-structure masters and get no matrix row
 * for them (no row = no access, the existing fail-closed default).
 *
 * Idempotent, and deliberately additive rather than overwriting: a role's
 * UserRoles document is only ever created here, never reset, and a matrix
 * row is only added for a menu that doesn't already have one — so an
 * admin's later edits in the Role Permissions screen survive a re-seed.
 */
const seedOrganizationSetupRoles = async () => {
  const HRMS_ROLE_NAMES = [
    "Employee",
    "HR User",
    "HR Manager",
    "Leave Approver",
    "Expense Approver",
    "Interviewer",
  ];
  const FULL_ACCESS_ROLES = ["HR User", "HR Manager"];
  const HR_SETUP_MENU_URLS = ["/company", "/branch", "/department", "/designation", "/employment-type", "/employee-grade"];

  const roleIds = {};
  for (const roleName of HRMS_ROLE_NAMES) {
    const role = await RoleMaster.findOneAndUpdate(
      { roleName },
      { roleName, isActive: true },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    roleIds[roleName] = role._id;
  }

  const menus = await MenuMaster.find({ menuUrl: { $in: HR_SETUP_MENU_URLS } }).lean();
  if (menus.length !== HR_SETUP_MENU_URLS.length) {
    console.log("⚠️  Organization setup roles: not every HR Setup menu row exists yet — run seedMenus first");
    return;
  }

  let created = 0;
  let matrixRowsAdded = 0;
  for (const roleName of HRMS_ROLE_NAMES) {
    let userRoles = await UserRoles.findOne({ roleId: roleIds[roleName] });
    if (!userRoles) {
      userRoles = await UserRoles.create({
        roleId: roleIds[roleName],
        roles: [],
        dataScope: SCOPES.ALL,
        isActive: true,
      });
      created += 1;
    }

    if (!FULL_ACCESS_ROLES.includes(roleName)) continue;

    let changed = false;
    for (const menu of menus) {
      const hasRow = userRoles.roles.some((r) => String(r.menuId) === String(menu._id));
      if (hasRow) continue;
      userRoles.roles.push({
        menuId: menu._id,
        menuGroupId: menu.menuGroup,
        ...Object.fromEntries(PERMISSION_KEYS.map((key) => [key, key === "read" || key === "write" || key === "edit" || key === "delete"])),
      });
      matrixRowsAdded += 1;
      changed = true;
    }
    if (changed) await userRoles.save();
  }

  console.log(
    `✅ Organization setup roles: ${HRMS_ROLE_NAMES.length} roles ensured, ${created} new matrix document(s), ${matrixRowsAdded} menu grant(s) added`,
  );
};

const run = async () => {
  if (!process.env.DATABASE) {
    console.error("❌ DATABASE is not set in .env");
    process.exit(1);
  }

  mongoose.set("strictQuery", false);
  await mongoose.connect(process.env.DATABASE, {
    serverSelectionTimeoutMS: 10000,
  });
  console.log("✅ DB connected");

  await dedupeUserRoles();
  await backfillEmailForTriggerKeys();
  await dedupeActiveEmailTemplates();
  const companyId = await ensureApidelCompany();
  await backfillDepartmentCompany(companyId);
  await backfillSoftDelete();
  await moveDepartmentMenuToHrSetup();
  await renameReportBuilderMenu();
  await seedMenus();
  await seedAdminUser();
  await seedOrganizationSetupData(companyId);
  await seedOrganizationSetupRoles();

  await mongoose.disconnect();
  console.log("✅ Seeding complete");
};

run().catch(async (error) => {
  console.error("❌ Seeding failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
