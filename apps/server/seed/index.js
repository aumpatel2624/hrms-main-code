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
import "../models/ShiftType.js";
import "../models/ShiftLocation.js";
import "../models/ShiftAssignment.js";
import "../models/ShiftSchedule.js";
import "../models/ShiftScheduleAssignment.js";
import "../models/EmployeeCheckin.js";

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
import Employee from "../models/Employee.js";
import EmployeeHealthInsurance from "../models/EmployeeHealthInsurance.js";
import RoleMaster from "../models/RoleMaster.js";
import UserRoles from "../models/UserRoles.js";
import JobApplicantSource from "../models/JobApplicantSource.js";
import GrievanceType from "../models/GrievanceType.js";
import Skill from "../models/Skill.js";
import Country from "../models/Country.js";
import State from "../models/State.js";
import City from "../models/City.js";
import PurposeOfTravel from "../models/PurposeOfTravel.js";
import IdentificationDocumentType from "../models/IdentificationDocumentType.js";
import LeaveType from "../models/LeaveType.js";
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
  // The file was written by Python's csv module, which defaults to CRLF line
  // endings regardless of platform — normalize before splitting, or the last
  // column of every row (and the header) carries a trailing \r, which turned
  // "gender" into a header nothing could look up (found by spot-checking
  // seeded data, not by the row/link counts alone).
  const lines = fs.readFileSync(csvPath, "utf8").replace(/\r\n/g, "\n").trim().split("\n");
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
  // HRMS module 2 (ADR-018). Separate from "HR Setup" (module 1's pure
  // configuration masters) — Employee is the actual employee master, not
  // setup, so it gets its own group rather than crowding into HR Setup.
  {
    menuGroupName: "HR Core",
    sequence: 2.6,
    icon: "ri-team-line",
    menus: [
      { menuName: "Employee", menuUrl: "/employee", icon: "ri-user-3-line" },
      { menuName: "Employee Health Insurance", menuUrl: "/employee-health-insurance", icon: "ri-heart-pulse-line" },
    ],
  },
  // HRMS module 3 (ADR-019). The full hiring funnel; the public job
  // listing (/api/v1/public/jobs) is not a menu item — it's not an admin
  // screen.
  {
    menuGroupName: "Recruitment",
    sequence: 2.7,
    icon: "ri-briefcase-4-line",
    menus: [
      { menuName: "Job Requisition", menuUrl: "/job-requisition", icon: "ri-file-list-3-line" },
      { menuName: "Job Opening", menuUrl: "/job-opening", icon: "ri-door-open-line" },
      { menuName: "Job Applicant", menuUrl: "/job-applicant", icon: "ri-user-add-line" },
      { menuName: "Job Applicant Source", menuUrl: "/job-applicant-source", icon: "ri-links-line" },
      { menuName: "Interview Type", menuUrl: "/interview-type", icon: "ri-questionnaire-line" },
      { menuName: "Interview", menuUrl: "/interview", icon: "ri-chat-3-line" },
      { menuName: "Interview Feedback", menuUrl: "/interview-feedback", icon: "ri-star-line" },
      { menuName: "Job Offer", menuUrl: "/job-offer", icon: "ri-mail-send-line" },
      { menuName: "Job Offer Term Template", menuUrl: "/job-offer-term-template", icon: "ri-file-copy-line" },
    ],
  },
  // HRMS module 4 (ADR-020). Activities live embedded on Onboarding/
  // Separation/their Templates, not as their own screens.
  {
    menuGroupName: "Onboarding & Separation",
    sequence: 2.8,
    icon: "ri-user-follow-line",
    menus: [
      { menuName: "Employee Onboarding", menuUrl: "/employee-onboarding", icon: "ri-user-add-line" },
      { menuName: "Onboarding Template", menuUrl: "/employee-onboarding-template", icon: "ri-file-copy-line" },
      { menuName: "Employee Separation", menuUrl: "/employee-separation", icon: "ri-user-unfollow-line" },
      { menuName: "Separation Template", menuUrl: "/employee-separation-template", icon: "ri-file-copy-2-line" },
      { menuName: "Exit Interview", menuUrl: "/exit-interview", icon: "ri-chat-off-line" },
      { menuName: "Full and Final Statement", menuUrl: "/full-and-final-statement", icon: "ri-file-list-3-line" },
    ],
  },
  // HRMS module 5 (ADR-021).
  {
    menuGroupName: "Employee Career Events",
    sequence: 2.9,
    icon: "ri-git-branch-line",
    menus: [
      { menuName: "Grievance Type", menuUrl: "/grievance-type", icon: "ri-price-tag-3-line" },
      { menuName: "Employee Grievance", menuUrl: "/employee-grievance", icon: "ri-alarm-warning-line" },
      { menuName: "Employee Transfer", menuUrl: "/employee-transfer", icon: "ri-shuffle-line" },
      { menuName: "Employee Promotion", menuUrl: "/employee-promotion", icon: "ri-arrow-up-circle-line" },
      { menuName: "Employee Referral", menuUrl: "/employee-referral", icon: "ri-user-shared-line" },
      { menuName: "Staffing Plan", menuUrl: "/staffing-plan", icon: "ri-organization-chart" },
    ],
  },
  // HRMS module 6 (ADR-022). Training Result folds into Training Event's
  // own employees[] rows — no separate screen for it.
  {
    menuGroupName: "Training & Skills",
    sequence: 2.95,
    icon: "ri-graduation-cap-line",
    menus: [
      { menuName: "Training Program", menuUrl: "/training-program", icon: "ri-book-open-line" },
      { menuName: "Training Event", menuUrl: "/training-event", icon: "ri-calendar-event-line" },
      { menuName: "Training Feedback", menuUrl: "/training-feedback", icon: "ri-feedback-line" },
      { menuName: "Skill", menuUrl: "/skill", icon: "ri-star-smile-line" },
      { menuName: "Employee Skill Map", menuUrl: "/employee-skill-map", icon: "ri-user-star-line" },
    ],
  },
  // HRMS module 7 (ADR-023). Travel Itinerary/Costing are embedded arrays on
  // Travel Request, not their own screens — same shape as Training Result.
  {
    menuGroupName: "Travel",
    sequence: 2.96,
    icon: "ri-flight-takeoff-line",
    menus: [
      { menuName: "Travel Request", menuUrl: "/travel-request", icon: "ri-suitcase-3-line" },
      { menuName: "Purpose of Travel", menuUrl: "/purpose-of-travel", icon: "ri-flag-line" },
      { menuName: "Identification Document Type", menuUrl: "/identification-document-type", icon: "ri-id-card-line" },
    ],
  },
  // HRMS module 8 (ADR-024) — foundation + transactional fork, module complete.
  {
    menuGroupName: "Leaves",
    sequence: 2.97,
    icon: "ri-calendar-check-line",
    menus: [
      { menuName: "Leave Type", menuUrl: "/leave-type", icon: "ri-price-tag-3-line" },
      { menuName: "Leave Period", menuUrl: "/leave-period", icon: "ri-calendar-2-line" },
      { menuName: "Holiday List", menuUrl: "/holiday-list", icon: "ri-calendar-event-line" },
      { menuName: "Holiday List Assignment", menuUrl: "/holiday-list-assignment", icon: "ri-calendar-todo-line" },
      { menuName: "Leave Policy", menuUrl: "/leave-policy", icon: "ri-file-list-3-line" },
      { menuName: "Leave Policy Assignment", menuUrl: "/leave-policy-assignment", icon: "ri-file-user-line" },
      { menuName: "Leave Allocation", menuUrl: "/leave-allocation", icon: "ri-calendar-check-line" },
      { menuName: "Leave Ledger Entry", menuUrl: "/leave-ledger-entry", icon: "ri-file-list-line" },
      { menuName: "Leave Adjustment", menuUrl: "/leave-adjustment", icon: "ri-settings-4-line" },
      { menuName: "Compensatory Leave Request", menuUrl: "/compensatory-leave-request", icon: "ri-calendar-todo-fill" },
      { menuName: "Leave Application", menuUrl: "/leave-application", icon: "ri-file-list-3-fill" },
      { menuName: "Leave Encashment", menuUrl: "/leave-encashment", icon: "ri-money-dollar-circle-line" },
      { menuName: "Leave Block List", menuUrl: "/leave-block-list", icon: "ri-forbid-2-line" },
      { menuName: "Leave Control Panel", menuUrl: "/leave-control-panel", icon: "ri-tools-line" },
    ],
  },
  {
    menuGroupName: "Shift & Attendance", sequence: 2.98, icon: "ri-time-line",
    menus: [
      { menuName: "Shift Type", menuUrl: "/shift-type", icon: "ri-time-line" },
      { menuName: "Shift Location", menuUrl: "/shift-location", icon: "ri-time-line" },
      { menuName: "Shift Assignment", menuUrl: "/shift-assignment", icon: "ri-time-line" },
      { menuName: "Shift Schedule", menuUrl: "/shift-schedule", icon: "ri-time-line" },
      { menuName: "Shift Schedule Assignment", menuUrl: "/shift-schedule-assignment", icon: "ri-time-line" },
      { menuName: "Employee Checkin", menuUrl: "/employee-checkin", icon: "ri-time-line" },
      { menuName: "Attendance", menuUrl: "/attendance", icon: "ri-user-follow-line" },
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

/**
 * Collapse duplicate active MenuMaster rows sharing a menuUrl (found live,
 * OPEN-QUESTIONS.md Q-1 / GitHub #6) — the seeder used to upsert by
 * `{ menuName, menuGroup }`, so moving a screen to a different group (or a
 * non-idempotent reseed) left two active rows for the same URL under two
 * different MenuGroupMaster documents. Server-side `checkPermission` reads
 * `UserRoles` directly and is unaffected, but the admin client's own
 * menu-id-to-permission resolution (`MenuContext.findMenuIdByUrl`,
 * first-match-wins) can silently resolve the stale row, so a role granted
 * access via the role editor may not show write buttons the server would
 * actually allow.
 *
 * Keeps the newest row per URL, soft-deletes the rest, and re-points every
 * `UserRoles.roles[]` entry that referenced a removed row's `menuId` onto the
 * survivor — merging permission flags (OR'd) into the survivor's own row if
 * the matrix already had one, so no role silently loses a grant it had on
 * either copy. Must run before `seedMenus` adds the real unique index on
 * `menuUrl`, which would otherwise fail to build over existing duplicates.
 *
 * Idempotent: once each URL has one live row, this matches nothing.
 */
const dedupeMenuMasterByUrl = async () => {
  const menus = mongoose.connection.collection("menumasters");
  const userRoles = mongoose.connection.collection("userroles");

  const duplicates = await menus
    .aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $sort: { updatedAt: -1 } },
      { $group: { _id: "$menuUrl", ids: { $push: "$_id" } } },
      { $match: { $expr: { $gt: [{ $size: "$ids" }, 1] } } },
    ])
    .toArray();

  let collapsed = 0;
  let matricesRepointed = 0;
  for (const group of duplicates) {
    const [surviving, ...removed] = group.ids; // newest first — keep it

    for (const doc of await userRoles.find({ "roles.menuId": { $in: removed } }).toArray()) {
      const survivorRow = doc.roles.find((r) => String(r.menuId) === String(surviving));
      const nextRoles = [];
      let changed = false;
      for (const row of doc.roles) {
        const isRemoved = removed.some((id) => String(id) === String(row.menuId));
        if (!isRemoved) {
          nextRoles.push(row);
          continue;
        }
        changed = true;
        if (survivorRow) {
          // Merge into the survivor's own row (OR each permission flag);
          // drop this duplicate row rather than keeping two for one URL.
          for (const key of PERMISSION_KEYS) survivorRow[key] = survivorRow[key] || row[key];
        } else {
          // No row for the survivor yet on this matrix — repoint this one.
          nextRoles.push({ ...row, menuId: surviving });
        }
      }
      if (changed) {
        await userRoles.updateOne({ _id: doc._id }, { $set: { roles: nextRoles } });
        matricesRepointed += 1;
      }
    }

    const result = await menus.updateMany(
      { _id: { $in: removed } },
      { $set: { isDeleted: true } },
    );
    collapsed += result.modifiedCount;
  }

  if (collapsed) {
    console.log(
      `✅ Menu master: collapsed ${collapsed} duplicate row(s) across ${duplicates.length} URL(s), re-pointed ${matricesRepointed} role matrix document(s)`,
    );
  }
};

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
        { menuUrl: menu.menuUrl },
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
 * ADR-018 (Employee Records). Not derived from the CSV — it has no insurance
 * data. A small reasonable starter set the client can edit, same pattern as
 * Employment Type in ADR-017.
 */
const seedEmployeeHealthInsuranceData = async () => {
  const PROVIDERS = ["Aetna", "Cigna", "Star Health", "ICICI Lombard"];
  let count = 0;
  for (const providerName of PROVIDERS) {
    await EmployeeHealthInsurance.findOneAndUpdate(
      { providerName },
      { providerName, isActive: true },
      { upsert: true, setDefaultsOnInsert: true },
    );
    count += 1;
  }
  console.log(`✅ Employee health insurance: ${count} providers`);
};

const MONTH_INDEX = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** Parses the org-chart CSV's "D-Mon-YY" dates (e.g. "2-Aug-12" → 2012-08-02).
 * Every date in this file falls between 2012 and 2026, so `YY` → `20YY`. */
const parseOrgChartDate = (value) => {
  const [day, mon, yy] = value.split("-");
  const month = MONTH_INDEX[mon.trim().toLowerCase()];
  if (month === undefined || !day || !yy) {
    throw new Error(`Unparseable date_of_joining value: "${value}"`);
  }
  return new Date(Date.UTC(2000 + Number(yy), month, Number(day)));
};

const GENDER_MAP = { male: "Male", female: "Female" };
const WORK_MODE_VALUES = new Set(["WFO", "WFH"]);
const SHIFT_PREFERENCE_VALUES = new Set(["Day", "Night", "UK"]);

/**
 * Real Apidel employees (ADR-018), 195 rows from apidel-org-chart.csv.
 * Two-pass: pass 1 creates every row (companyId fixed to the seeded Apidel
 * company; departmentId/designationId/branchId resolved against module 1's
 * seeded rows — same normalizeDepartmentName() module 1 uses, so lookups
 * agree); pass 2 resolves reportsToId by employeeName (confirmed clean data:
 * 195 unique names, zero collisions, every manager_name value resolves to
 * another row in this same file, only 2 rows have no manager).
 *
 * Upserts by employeeCode, so safe to re-run. A lookup that fails to resolve
 * is a real bug (module 1's seed covers every distinct department/
 * designation/branch value in this CSV) — fails loudly, not skipped.
 */
const seedEmployees = async (companyId) => {
  const rows = readOrgChartRows();

  const [departments, designations, branches] = await Promise.all([
    Department.find({ companyId }).lean(),
    Designation.find({ companyId }).lean(),
    Branch.find({ companyId }).lean(),
  ]);
  const departmentByName = new Map(departments.map((d) => [d.departmentName, d._id]));
  const designationByName = new Map(designations.map((d) => [d.designationName, d._id]));
  const branchByName = new Map(branches.map((b) => [b.branchName, b._id]));

  // Pass 1 — create/update every row, reportsToId left untouched here.
  let created = 0;
  let updated = 0;
  for (const row of rows) {
    const departmentId = departmentByName.get(normalizeDepartmentName(row.department));
    const designationId = designationByName.get(row.title);
    const branchId = branchByName.get(row.location);

    if (!departmentId) {
      throw new Error(`seedEmployees: no Department found for "${row.department}" (employee ${row.code})`);
    }
    if (!designationId) {
      throw new Error(`seedEmployees: no Designation found for "${row.title}" (employee ${row.code})`);
    }
    if (!branchId) {
      throw new Error(`seedEmployees: no Branch found for "${row.location}" (employee ${row.code})`);
    }

    const doc = {
      employeeCode: row.code,
      employeeName: row.name,
      companyId,
      departmentId,
      designationId,
      branchId,
      dateOfJoining: parseOrgChartDate(row.date_of_joining),
      gender: GENDER_MAP[row.gender?.trim().toLowerCase()] ?? null,
      workMode: WORK_MODE_VALUES.has(row.work_mode) ? row.work_mode : null,
      shiftPreference: SHIFT_PREFERENCE_VALUES.has(row.shift) ? row.shift : null,
      isActive: true,
    };

    const existing = await Employee.findOne({ employeeCode: row.code });
    if (existing) {
      Object.assign(existing, doc);
      await existing.save();
      updated += 1;
    } else {
      await Employee.create(doc);
      created += 1;
    }
  }

  // Pass 2 — resolve reportsToId by employeeName.
  const employees = await Employee.find({ companyId }).lean();
  const employeeIdByName = new Map(employees.map((e) => [e.employeeName, e._id]));

  let reportsToSet = 0;
  for (const row of rows) {
    if (!row.manager_name) continue;
    const managerId = employeeIdByName.get(row.manager_name);
    if (!managerId) {
      throw new Error(`seedEmployees: manager "${row.manager_name}" not found for employee ${row.code}`);
    }
    const employeeId = employeeIdByName.get(row.name);
    await Employee.updateOne({ _id: employeeId }, { $set: { reportsToId: managerId } });
    reportsToSet += 1;
  }

  console.log(
    `✅ Employees: ${created} created, ${updated} updated, ${reportsToSet} reports-to link(s) resolved`,
  );
};

/**
 * Extends the HRMS role matrix (ADR-018) — HR User and HR Manager get full
 * access to Employee; Employee Health Insurance is HR-Manager-full/
 * HR-User-**read-only**, the one doctype so far with an asymmetric split
 * (matches the source permissions table exactly). The other 4 roles get no
 * matrix row for either screen in this module, same reasoning as ADR-017.
 */
const seedEmployeeRecordsRoles = async () => {
  const FULL_ACCESS_ROLES = ["HR User", "HR Manager"];
  const EMPLOYEE_MENU_URL = "/employee";
  const HEALTH_INSURANCE_MENU_URL = "/employee-health-insurance";

  const [employeeMenu, healthInsuranceMenu] = await Promise.all([
    MenuMaster.findOne({ menuUrl: EMPLOYEE_MENU_URL }).lean(),
    MenuMaster.findOne({ menuUrl: HEALTH_INSURANCE_MENU_URL }).lean(),
  ]);
  if (!employeeMenu || !healthInsuranceMenu) {
    console.log("⚠️  Employee records roles: HR Core menu rows don't exist yet — run seedMenus first");
    return;
  }

  const allPermTrue = Object.fromEntries(PERMISSION_KEYS.map((key) => [key, key === "read" || key === "write" || key === "edit" || key === "delete"]));
  const readOnlyPerm = Object.fromEntries(PERMISSION_KEYS.map((key) => [key, key === "read"]));

  let matrixRowsAdded = 0;
  for (const roleName of FULL_ACCESS_ROLES) {
    const role = await RoleMaster.findOne({ roleName });
    if (!role) continue;
    const userRoles = await UserRoles.findOne({ roleId: role._id });
    if (!userRoles) continue;

    let changed = false;
    const hasEmployeeRow = userRoles.roles.some((r) => String(r.menuId) === String(employeeMenu._id));
    if (!hasEmployeeRow) {
      userRoles.roles.push({ menuId: employeeMenu._id, menuGroupId: employeeMenu.menuGroup, ...allPermTrue });
      matrixRowsAdded += 1;
      changed = true;
    }

    const hasHealthInsuranceRow = userRoles.roles.some((r) => String(r.menuId) === String(healthInsuranceMenu._id));
    if (!hasHealthInsuranceRow) {
      const perm = roleName === "HR User" ? readOnlyPerm : allPermTrue;
      userRoles.roles.push({ menuId: healthInsuranceMenu._id, menuGroupId: healthInsuranceMenu.menuGroup, ...perm });
      matrixRowsAdded += 1;
      changed = true;
    }

    if (changed) await userRoles.save();
  }

  console.log(`✅ Employee records roles: ${matrixRowsAdded} menu grant(s) added`);
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

/**
 * Job Applicant Source starter set (ADR-019) — not derived from any real
 * data, the org-chart CSV has no source column. Upserted by name.
 */
const seedRecruitmentMasters = async () => {
  const SOURCES = ["Referral", "Job Board", "LinkedIn", "Career Site", "Walk-in"];
  let created = 0;
  for (const sourceName of SOURCES) {
    const result = await JobApplicantSource.findOneAndUpdate(
      { sourceName },
      { sourceName, isActive: true },
      { upsert: true, setDefaultsOnInsert: true, new: false },
    );
    if (!result) created += 1;
  }
  console.log(`✅ Recruitment masters: ${created} new Job Applicant Source(s), ${SOURCES.length} ensured`);
};

/**
 * Recruitment roles (ADR-019). HR User/HR Manager get full CRUD on the
 * whole funnel EXCEPT Interview Feedback, where — matching source's own
 * permission table exactly — both are read-only and only Interviewer
 * writes. Interviewer gets full CRUD on Interview and Interview Feedback
 * only, same as source (no if_owner-style "only my assigned interviews"
 * restriction at the permission-table level — see ADR-019 point 9).
 */
const seedRecruitmentRoles = async () => {
  const FULL_ACCESS_ROLES = ["HR User", "HR Manager"];
  const FULL_ACCESS_MENU_URLS = [
    "/job-requisition", "/job-opening", "/job-applicant", "/job-applicant-source",
    "/interview-type", "/interview", "/job-offer", "/job-offer-term-template",
  ];
  const READ_ONLY_FOR_HR_MENU_URLS = ["/interview-feedback"];
  const INTERVIEWER_MENU_URLS = ["/interview", "/interview-feedback"];

  const allMenus = await MenuMaster.find({
    menuUrl: { $in: [...FULL_ACCESS_MENU_URLS, ...READ_ONLY_FOR_HR_MENU_URLS] },
  }).lean();
  if (allMenus.length !== FULL_ACCESS_MENU_URLS.length + READ_ONLY_FOR_HR_MENU_URLS.length) {
    console.log("⚠️  Recruitment roles: not every Recruitment menu row exists yet — run seedMenus first");
    return;
  }
  const menuByUrl = Object.fromEntries(allMenus.map((m) => [m.menuUrl, m]));

  const fullPerm = Object.fromEntries(PERMISSION_KEYS.map((key) => [key, key === "read" || key === "write" || key === "edit" || key === "delete"]));
  const readOnlyPerm = Object.fromEntries(PERMISSION_KEYS.map((key) => [key, key === "read"]));

  const addRow = (userRoles, menu, perm) => {
    const hasRow = userRoles.roles.some((r) => String(r.menuId) === String(menu._id));
    if (hasRow) return false;
    userRoles.roles.push({ menuId: menu._id, menuGroupId: menu.menuGroup, ...perm });
    return true;
  };

  let matrixRowsAdded = 0;

  for (const roleName of FULL_ACCESS_ROLES) {
    const role = await RoleMaster.findOne({ roleName });
    if (!role) continue;
    const userRoles = await UserRoles.findOne({ roleId: role._id });
    if (!userRoles) continue;

    let changed = false;
    for (const url of FULL_ACCESS_MENU_URLS) {
      if (addRow(userRoles, menuByUrl[url], fullPerm)) { matrixRowsAdded += 1; changed = true; }
    }
    for (const url of READ_ONLY_FOR_HR_MENU_URLS) {
      if (addRow(userRoles, menuByUrl[url], readOnlyPerm)) { matrixRowsAdded += 1; changed = true; }
    }
    if (changed) await userRoles.save();
  }

  const interviewerRole = await RoleMaster.findOne({ roleName: "Interviewer" });
  if (interviewerRole) {
    const userRoles = await UserRoles.findOne({ roleId: interviewerRole._id });
    if (userRoles) {
      let changed = false;
      for (const url of INTERVIEWER_MENU_URLS) {
        if (addRow(userRoles, menuByUrl[url], fullPerm)) { matrixRowsAdded += 1; changed = true; }
      }
      if (changed) await userRoles.save();
    }
  }

  console.log(`✅ Recruitment roles: ${matrixRowsAdded} menu grant(s) added`);
};

/**
 * Onboarding & Separation roles (ADR-020). Reproduces each doctype's real,
 * *not-symmetric* source permission table — several of these differ from
 * this project's usual "HR User + HR Manager both full CRUD" default:
 * neither role gets delete on Employee Onboarding or Employee Separation
 * (System Manager/ADMIN only, in source); Employee Separation Template and
 * Exit Interview give HR User read-only; Full and Final Statement is the
 * one screen here where HR User also gets delete. The `markAsCompleted`/
 * `makeEmployee`/`markAsPaid` action endpoints are gated on the existing
 * "edit" key (this starter's permission matrix has no separate "submit"
 * dimension the way source's submit/cancel/amend columns do — HR User
 * therefore keeps action access on screens where source restricted it to
 * HR Manager only; a deliberate, noted simplification, not an oversight).
 */
const seedOnboardingSeparationRoles = async () => {
  const perm = (write, edit, del) =>
    Object.fromEntries(PERMISSION_KEYS.map((key) => [key, key === "read" || (key === "write" && write) || (key === "edit" && edit) || (key === "delete" && del)]));
  const fullNoDelete = perm(true, true, false);
  const full = perm(true, true, true);
  const readOnly = perm(false, false, false);

  // { menuUrl: { "HR User": permObject, "HR Manager": permObject } }
  const GRANTS = {
    "/employee-onboarding": { "HR User": fullNoDelete, "HR Manager": fullNoDelete },
    "/employee-onboarding-template": { "HR User": fullNoDelete, "HR Manager": full },
    "/employee-separation": { "HR User": fullNoDelete, "HR Manager": fullNoDelete },
    "/employee-separation-template": { "HR User": readOnly, "HR Manager": full },
    "/exit-interview": { "HR User": readOnly, "HR Manager": fullNoDelete },
    "/full-and-final-statement": { "HR User": full, "HR Manager": full },
  };

  const menus = await MenuMaster.find({ menuUrl: { $in: Object.keys(GRANTS) } }).lean();
  if (menus.length !== Object.keys(GRANTS).length) {
    console.log("⚠️  Onboarding & Separation roles: not every menu row exists yet — run seedMenus first");
    return;
  }
  const menuByUrl = Object.fromEntries(menus.map((m) => [m.menuUrl, m]));

  const addRow = (userRoles, menu, permObj) => {
    if (userRoles.roles.some((r) => String(r.menuId) === String(menu._id))) return false;
    userRoles.roles.push({ menuId: menu._id, menuGroupId: menu.menuGroup, ...permObj });
    return true;
  };

  let matrixRowsAdded = 0;
  for (const roleName of ["HR User", "HR Manager"]) {
    const role = await RoleMaster.findOne({ roleName });
    if (!role) continue;
    const userRoles = await UserRoles.findOne({ roleId: role._id });
    if (!userRoles) continue;

    let changed = false;
    for (const [menuUrl, grantByRole] of Object.entries(GRANTS)) {
      if (addRow(userRoles, menuByUrl[menuUrl], grantByRole[roleName])) { matrixRowsAdded += 1; changed = true; }
    }
    if (changed) await userRoles.save();
  }

  console.log(`✅ Onboarding & Separation roles: ${matrixRowsAdded} menu grant(s) added`);
};

/**
 * Grievance Type starter set (ADR-021) — not derived from any real data,
 * the org-chart CSV has no grievance data. Upserted by name.
 */
const seedEmployeeCareerEventsMasters = async () => {
  const TYPES = [
    { grievanceTypeName: "Harassment", description: "Workplace harassment or bullying" },
    { grievanceTypeName: "Workplace Safety", description: "Safety or working-conditions concerns" },
    { grievanceTypeName: "Compensation", description: "Pay, benefits or compensation disputes" },
    { grievanceTypeName: "Discrimination", description: "Discrimination on any protected ground" },
    { grievanceTypeName: "Policy Violation", description: "A colleague or manager violating company policy" },
  ];
  let created = 0;
  for (const type of TYPES) {
    const result = await GrievanceType.findOneAndUpdate(
      { grievanceTypeName: type.grievanceTypeName },
      { ...type, isActive: true },
      { upsert: true, setDefaultsOnInsert: true, new: false },
    );
    if (!result) created += 1;
  }
  console.log(`✅ Employee Career Events masters: ${created} new Grievance Type(s), ${TYPES.length} ensured`);
};

/**
 * Employee Career Events roles (ADR-021). Reproduces each doctype's real,
 * not-symmetric source permission table: Staffing Plan has no System
 * Manager row in source (ADMIN/System-Manager-equivalent still bypasses
 * the matrix regardless — this starter's own convention, not omitted) and
 * HR User gets a submit-equivalent right there (here: full "edit", same
 * key everything else uses since this matrix has no separate submit
 * dimension) that HR User doesn't get on Employee Transfer/Promotion
 * (create+read only, no edit/delete in source — HR Manager alone gets
 * full control there). Employee Grievance's Employee role gets write+
 * delete on their own screen access (per source's literal permission
 * table — not an "only mine" restriction, that mechanism is still open,
 * OPEN-QUESTIONS.md Q-4) but the matrix only grants roles here, not a
 * scoped subset — Employee gets the same full-within-menu grant HR does.
 */
const seedEmployeeCareerEventsRoles = async () => {
  const perm = (write, edit, del) =>
    Object.fromEntries(PERMISSION_KEYS.map((key) => [key, key === "read" || (key === "write" && write) || (key === "edit" && edit) || (key === "delete" && del)]));
  const full = perm(true, true, true);
  const fullNoDelete = perm(true, true, false);
  const createReadOnly = perm(true, false, false);

  // { menuUrl: { roleName: permObject } }
  const GRANTS = {
    "/grievance-type": { "HR User": full, "HR Manager": full },
    "/employee-grievance": { "HR User": full, "HR Manager": full, Employee: full },
    "/employee-transfer": { "HR User": createReadOnly, "HR Manager": full },
    "/employee-promotion": { "HR User": createReadOnly, "HR Manager": full },
    "/employee-referral": { "HR User": fullNoDelete, "HR Manager": full },
    "/staffing-plan": { "HR User": fullNoDelete, "HR Manager": full },
  };

  const allMenuUrls = Object.keys(GRANTS);
  const menus = await MenuMaster.find({ menuUrl: { $in: allMenuUrls } }).lean();
  if (menus.length !== allMenuUrls.length) {
    console.log("⚠️  Employee Career Events roles: not every menu row exists yet — run seedMenus first");
    return;
  }
  const menuByUrl = Object.fromEntries(menus.map((m) => [m.menuUrl, m]));

  const addRow = (userRoles, menu, permObj) => {
    if (userRoles.roles.some((r) => String(r.menuId) === String(menu._id))) return false;
    userRoles.roles.push({ menuId: menu._id, menuGroupId: menu.menuGroup, ...permObj });
    return true;
  };

  let matrixRowsAdded = 0;
  const roleNames = ["Employee", "HR User", "HR Manager"];
  for (const roleName of roleNames) {
    const role = await RoleMaster.findOne({ roleName });
    if (!role) continue;
    const userRoles = await UserRoles.findOne({ roleId: role._id });
    if (!userRoles) continue;

    let changed = false;
    for (const [menuUrl, grantByRole] of Object.entries(GRANTS)) {
      const permObj = grantByRole[roleName];
      if (!permObj) continue;
      if (addRow(userRoles, menuByUrl[menuUrl], permObj)) { matrixRowsAdded += 1; changed = true; }
    }
    if (changed) await userRoles.save();
  }

  console.log(`✅ Employee Career Events roles: ${matrixRowsAdded} menu grant(s) added`);
};

/**
 * Skill starter set (ADR-022) — not derived from any real data, the
 * org-chart CSV has no skills data. Upserted by name.
 */
const seedTrainingSkillsMasters = async () => {
  const SKILLS = [
    { skillName: "Communication", description: "Written and verbal communication" },
    { skillName: "Leadership", description: "Team leadership and people management" },
    { skillName: "Client Servicing", description: "Client relationship management" },
    { skillName: "Recruitment Sourcing", description: "Candidate sourcing and pipeline building" },
    { skillName: "MS Excel", description: "Spreadsheet analysis and reporting" },
    { skillName: "Negotiation", description: "Offer and vendor negotiation" },
  ];
  let created = 0;
  for (const skill of SKILLS) {
    const result = await Skill.findOneAndUpdate(
      { skillName: skill.skillName },
      { ...skill, isActive: true },
      { upsert: true, setDefaultsOnInsert: true, new: false },
    );
    if (!result) created += 1;
  }
  console.log(`✅ Training & Skills masters: ${created} new Skill(s), ${SKILLS.length} ensured`);
};

/**
 * Training & Skills roles (ADR-022). Reproduces each doctype's real,
 * not-symmetric source permission table — several HR User rows here are
 * "read + edit existing, no create/delete" (source's own Write/Create
 * distinction: Write=1, Create=0), not this project's usual full-CRUD-minus-
 * delete pattern. Skill is HR-Manager-full / HR-User-**read-only** (same
 * shape as Employee Health Insurance, module 2) — matches source exactly,
 * don't default to the usual pattern here.
 */
const seedTrainingSkillsRoles = async () => {
  const perm = (write, edit, del) =>
    Object.fromEntries(PERMISSION_KEYS.map((key) => [key, key === "read" || (key === "write" && write) || (key === "edit" && edit) || (key === "delete" && del)]));
  const full = perm(true, true, true);
  const fullNoDelete = perm(true, true, false);
  const editOnly = perm(false, true, false); // read + edit existing, no create/delete — source's Write-without-Create rows
  const readOnly = perm(false, false, false);

  // { menuUrl: { roleName: permObject } }
  const GRANTS = {
    "/training-program": { "HR User": editOnly, "HR Manager": full },
    "/training-event": { "HR User": editOnly, "HR Manager": full },
    "/training-feedback": { "HR User": editOnly, "HR Manager": full, Employee: fullNoDelete },
    "/skill": { "HR User": readOnly, "HR Manager": full },
    "/employee-skill-map": { "HR User": fullNoDelete, "HR Manager": full },
  };

  const allMenuUrls = Object.keys(GRANTS);
  const menus = await MenuMaster.find({ menuUrl: { $in: allMenuUrls } }).lean();
  if (menus.length !== allMenuUrls.length) {
    console.log("⚠️  Training & Skills roles: not every menu row exists yet — run seedMenus first");
    return;
  }
  const menuByUrl = Object.fromEntries(menus.map((m) => [m.menuUrl, m]));

  const addRow = (userRoles, menu, permObj) => {
    if (userRoles.roles.some((r) => String(r.menuId) === String(menu._id))) return false;
    userRoles.roles.push({ menuId: menu._id, menuGroupId: menu.menuGroup, ...permObj });
    return true;
  };

  let matrixRowsAdded = 0;
  const roleNames = ["Employee", "HR User", "HR Manager"];
  for (const roleName of roleNames) {
    const role = await RoleMaster.findOne({ roleName });
    if (!role) continue;
    const userRoles = await UserRoles.findOne({ roleId: role._id });
    if (!userRoles) continue;

    let changed = false;
    for (const [menuUrl, grantByRole] of Object.entries(GRANTS)) {
      const permObj = grantByRole[roleName];
      if (!permObj) continue;
      if (addRow(userRoles, menuByUrl[menuUrl], permObj)) { matrixRowsAdded += 1; changed = true; }
    }
    if (changed) await userRoles.save();
  }

  console.log(`✅ Training & Skills roles: ${matrixRowsAdded} menu grant(s) added`);
};

/**
 * Fixes docs/knowledge/OPEN-QUESTIONS.md Q-10 (partial): this starter's
 * generic User model requires countryId/stateId/cityId, but nothing had ever
 * seeded any — every module's `verify` pass had to create throwaway
 * geography just to test a non-admin login. Seeds a small, REAL set (the
 * countries/states/cities the Apidel org-chart data actually names —
 * docs/knowledge/apidel-org-chart.csv — not generic placeholders), upserted
 * by natural key so this is safe to re-run.
 */
const seedGeographyData = async () => {
  const countries = [
    { countryName: "India", countryCode: "IN" },
    { countryName: "United States", countryCode: "US" },
    { countryName: "Guyana", countryCode: "GY" },
  ];
  const countryByName = {};
  for (const c of countries) {
    const doc = await Country.findOneAndUpdate(
      { countryName: c.countryName },
      { $setOnInsert: { ...c, isActive: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    countryByName[c.countryName] = doc._id;
  }

  // Only the states the org-chart's `location` column actually names, per
  // country — not a full geography reference set.
  const states = [
    { stateName: "Madhya Pradesh", stateCode: "MP", country: "India" },
    { stateName: "Rajasthan", stateCode: "RJ", country: "India" },
    { stateName: "Uttar Pradesh", stateCode: "UP", country: "India" },
    { stateName: "Maharashtra", stateCode: "MH", country: "India" },
    { stateName: "Gujarat", stateCode: "GJ", country: "India" },
  ];
  const stateByName = {};
  for (const s of states) {
    const doc = await State.findOneAndUpdate(
      { stateName: s.stateName },
      {
        $setOnInsert: {
          stateName: s.stateName,
          stateCode: s.stateCode,
          countryId: countryByName[s.country],
          isActive: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    stateByName[s.stateName] = doc._id;
  }

  // Every India location in apidel-org-chart.csv (Guna/Shivpuri distinguish
  // by state despite similar names elsewhere; both are Madhya Pradesh here).
  const cities = [
    { cityName: "Guna", state: "Madhya Pradesh" },
    { cityName: "Indore", state: "Madhya Pradesh" },
    { cityName: "Shivpuri", state: "Madhya Pradesh" },
    { cityName: "Kota", state: "Rajasthan" },
    { cityName: "Meerut", state: "Uttar Pradesh" },
    { cityName: "Noida", state: "Uttar Pradesh" },
    { cityName: "Mumbai", state: "Maharashtra" },
    { cityName: "Pune", state: "Maharashtra" },
    { cityName: "Porbandar", state: "Gujarat" },
    { cityName: "Vadodara", state: "Gujarat" },
  ];
  let citiesCreated = 0;
  for (const c of cities) {
    const existed = await City.exists({ cityName: c.cityName });
    await City.findOneAndUpdate(
      { cityName: c.cityName },
      {
        $setOnInsert: {
          cityName: c.cityName,
          stateId: stateByName[c.state],
          countryId: countryByName["India"],
          isActive: true,
        },
      },
      { upsert: true, setDefaultsOnInsert: true },
    );
    if (!existed) citiesCreated += 1;
  }

  console.log(
    `✅ Geography: ${countries.length} countries, ${states.length} states, ${citiesCreated} new / ${cities.length} total cities`,
  );
};

/**
 * Travel masters (ADR-023) — small starter lists so Travel Request's two
 * dropdowns aren't empty on a fresh seed. Upserted by natural key.
 */
const seedTravelMasters = async () => {
  const PURPOSES = [
    "Client Meeting",
    "Conference",
    "Training",
    "Onsite Deployment",
    "Interview",
  ];
  let purposesCreated = 0;
  for (const purposeOfTravelName of PURPOSES) {
    const result = await PurposeOfTravel.findOneAndUpdate(
      { purposeOfTravelName },
      { purposeOfTravelName, isActive: true },
      { upsert: true, setDefaultsOnInsert: true, new: false },
    );
    if (!result) purposesCreated += 1;
  }

  const ID_DOC_TYPES = ["Passport", "Aadhaar Card", "PAN Card", "Driving License"];
  let idDocTypesCreated = 0;
  for (const identificationDocumentTypeName of ID_DOC_TYPES) {
    const result = await IdentificationDocumentType.findOneAndUpdate(
      { identificationDocumentTypeName },
      { identificationDocumentTypeName, isActive: true },
      { upsert: true, setDefaultsOnInsert: true, new: false },
    );
    if (!result) idDocTypesCreated += 1;
  }

  console.log(
    `✅ Travel masters: ${purposesCreated} new Purpose(s) of Travel, ${idDocTypesCreated} new Identification Document Type(s)`,
  );
};

/**
 * Travel roles (ADR-023). `Employee` gets full-minus-delete on their own
 * Travel Request; `HR User`/`HR Manager` get full CRUD — the access-opening
 * decision recorded in the ADR (source's literal table is System-Manager-only
 * for all three doctypes, which would make Travel Request unusable by the
 * employees it exists for). `PurposeOfTravel`/`IdentificationDocumentType`
 * get NO grants for any of the six HRMS roles — ADMIN-only, matching source.
 */
const seedTravelRoles = async () => {
  const perm = (write, edit, del) =>
    Object.fromEntries(PERMISSION_KEYS.map((key) => [key, key === "read" || (key === "write" && write) || (key === "edit" && edit) || (key === "delete" && del)]));
  const full = perm(true, true, true);
  const fullNoDelete = perm(true, true, false);

  // { menuUrl: { roleName: permObject } }
  const GRANTS = {
    "/travel-request": { Employee: fullNoDelete, "HR User": full, "HR Manager": full },
  };

  const allMenuUrls = Object.keys(GRANTS);
  const menus = await MenuMaster.find({ menuUrl: { $in: allMenuUrls } }).lean();
  if (menus.length !== allMenuUrls.length) {
    console.log("⚠️  Travel roles: not every menu row exists yet — run seedMenus first");
    return;
  }
  const menuByUrl = Object.fromEntries(menus.map((m) => [m.menuUrl, m]));

  const addRow = (userRoles, menu, permObj) => {
    if (userRoles.roles.some((r) => String(r.menuId) === String(menu._id))) return false;
    userRoles.roles.push({ menuId: menu._id, menuGroupId: menu.menuGroup, ...permObj });
    return true;
  };

  let matrixRowsAdded = 0;
  const roleNames = ["Employee", "HR User", "HR Manager"];
  for (const roleName of roleNames) {
    const role = await RoleMaster.findOne({ roleName });
    if (!role) continue;
    const userRoles = await UserRoles.findOne({ roleId: role._id });
    if (!userRoles) continue;

    let changed = false;
    for (const [menuUrl, grantByRole] of Object.entries(GRANTS)) {
      const permObj = grantByRole[roleName];
      if (!permObj) continue;
      if (addRow(userRoles, menuByUrl[menuUrl], permObj)) { matrixRowsAdded += 1; changed = true; }
    }
    if (changed) await userRoles.save();
  }

  console.log(`✅ Travel roles: ${matrixRowsAdded} menu grant(s) added`);
};

/**
 * Leave Type starter set (ADR-024, foundation half of module 8). NOT
 * confirmed by the port spec — `Leave Type.md` documents the field schema
 * but lists no named example leave types, unlike some other modules'
 * masters. Seeded the same way Travel seeded a generic placeholder set:
 * the five Frappe HRMS defaults (Casual/Sick/Earned/Compensatory Off/LWP),
 * flagged here explicitly as a starting point, not a client-confirmed list.
 * Upserted by natural key.
 */
const seedLeaveMasters = async () => {
  const LEAVE_TYPES = [
    { leaveTypeName: "Casual Leave", maxLeavesAllowed: 12 },
    { leaveTypeName: "Sick Leave", maxLeavesAllowed: 12 },
    {
      leaveTypeName: "Earned Leave",
      isEarnedLeave: true,
      earnedLeaveFrequency: "Monthly",
      allocateOnDay: "Last Day",
      rounding: "0.5",
      isCarryForward: true,
      maximumCarryForwardedLeaves: 15,
      expireCarryForwardedLeavesAfterDays: 365,
      maxLeavesAllowed: 24,
    },
    { leaveTypeName: "Compensatory Off", isCompensatory: true },
    { leaveTypeName: "Leave Without Pay", isLwp: true },
  ];

  let created = 0;
  for (const leaveType of LEAVE_TYPES) {
    const result = await LeaveType.findOneAndUpdate(
      { leaveTypeName: leaveType.leaveTypeName },
      { ...leaveType, isActive: true },
      { upsert: true, setDefaultsOnInsert: true, new: false },
    );
    if (!result) created += 1;
  }

  console.log(`✅ Leave masters: ${created} new Leave Type(s)`);
};

/**
 * Leaves roles (ADR-024, module complete). HR User/HR Manager get full read/
 * write/edit/delete on every screen except the two collections that are
 * immutable once created (Leave Adjustment, Leave Encashment — write only,
 * no edit/delete grant, matching their controllers having no real update
 * path; Leave Encashment's `edit` is granted so the Mark as Paid action
 * route works) and Leave Ledger Entry (no write endpoint at all regardless
 * of the flags set here — Employee Health Insurance's module-2 precedent).
 * Employee gets read on LeaveType/LeavePeriod/HolidayList (to understand
 * their own balances, not the admin-configuration screens) and full
 * self-service (minus delete on Leave Application, which has no delete
 * route) on Leave Application/Compensatory Leave Request — this IS where
 * Q-4's "own"/"approver" scoping finally means something (ADR-024's own
 * words), so both those two rows carry `dataScope: SCOPES.APPROVER`.
 *
 * **The scoping judgment call (ADR-024 "As built (module complete)",
 * DECISIONS.md)**: `Employee` and the pre-existing (but until now ungranted)
 * `Leave Approver` role both get `dataScope: SCOPES.APPROVER` on
 * `/leave-application`. `getEmployeesApprovedBy` returns `[]` for a plain
 * Employee with nobody reporting to them, so the `approver` scope
 * degenerates to exactly "my own applications" — reusing one scope value
 * for both roles instead of introducing a separate plain-`own` case, since
 * `buildScopeFilter`'s `own` dimension compares against the login User's own
 * id (`reqUser.id`), not the Employee id `LeaveApplication.employeeId`
 * actually stores; `approver` was already built to read `reqUser.
 * employeeId` instead (ADR-024's own `resolveRequestEmployee`), which is the
 * one that's actually correct here.
 */
const seedLeaveRoles = async () => {
  const perm = (write, edit, del) =>
    Object.fromEntries(PERMISSION_KEYS.map((key) => [key, key === "read" || (key === "write" && write) || (key === "edit" && edit) || (key === "delete" && del)]));
  const full = perm(true, true, true);
  const fullNoDelete = perm(true, true, false);
  const writeOnly = perm(true, false, false);
  const writeAndEdit = perm(true, true, false);
  const readOnly = perm(false, false, false);

  // { menuUrl: { roleName: permObject } }
  const GRANTS = {
    "/leave-type": { Employee: readOnly, "HR User": full, "HR Manager": full },
    "/leave-period": { Employee: readOnly, "HR User": full, "HR Manager": full },
    "/holiday-list": { Employee: readOnly, "HR User": full, "HR Manager": full },
    "/holiday-list-assignment": { "HR User": full, "HR Manager": full },
    "/leave-policy": { "HR User": full, "HR Manager": full },
    "/leave-policy-assignment": { "HR User": full, "HR Manager": full },
    "/leave-allocation": { "HR User": full, "HR Manager": full },
    "/leave-ledger-entry": { "HR User": readOnly, "HR Manager": full },
    "/attendance": { "HR User": full, "HR Manager": full },
    // Immutable once created — write (create) only, no edit/delete grant
    // anywhere (matches the controller having no real update/delete path).
    "/leave-adjustment": { "HR User": writeOnly, "HR Manager": writeOnly },
    // `edit` is granted so the Mark as Paid action route (checkPermission
    // "edit") works — the generic edit FORM is still a clean 400 (issue #11,
    // updateLeaveEncashment), not a silent no-op.
    "/leave-encashment": { "HR User": writeAndEdit, "HR Manager": writeAndEdit },
    "/leave-block-list": { "HR User": full, "HR Manager": full },
    "/leave-control-panel": { "HR User": writeAndEdit, "HR Manager": writeAndEdit },
    // Self-service, scoped to "own" via the `approver` dimension (see the
    // file-level doc comment above) — Employee never gets `delete` (no
    // delete route exists for Leave Application at all; Compensatory Leave
    // Request's delete is further guarded server-side to pre-approval only).
    "/leave-application": {
      Employee: { ...fullNoDelete, dataScope: SCOPES.APPROVER },
      "Leave Approver": { ...perm(false, true, false), dataScope: SCOPES.APPROVER },
      "HR User": fullNoDelete,
      "HR Manager": fullNoDelete,
    },
    "/compensatory-leave-request": {
      Employee: { ...full, dataScope: SCOPES.APPROVER },
      "HR User": full,
      "HR Manager": full,
    },
  };

  const allMenuUrls = Object.keys(GRANTS);
  const menus = await MenuMaster.find({ menuUrl: { $in: allMenuUrls } }).lean();
  if (menus.length !== allMenuUrls.length) {
    console.log("⚠️  Leaves roles: not every menu row exists yet — run seedMenus first");
    return;
  }
  const menuByUrl = Object.fromEntries(menus.map((m) => [m.menuUrl, m]));

  const addRow = (userRoles, menu, permObj) => {
    if (userRoles.roles.some((r) => String(r.menuId) === String(menu._id))) return false;
    userRoles.roles.push({ menuId: menu._id, menuGroupId: menu.menuGroup, ...permObj });
    return true;
  };

  let matrixRowsAdded = 0;
  const roleNames = ["Employee", "HR User", "HR Manager", "Leave Approver"];
  for (const roleName of roleNames) {
    const role = await RoleMaster.findOne({ roleName });
    if (!role) continue;
    const userRoles = await UserRoles.findOne({ roleId: role._id });
    if (!userRoles) continue;

    let changed = false;
    for (const [menuUrl, grantByRole] of Object.entries(GRANTS)) {
      const permObj = grantByRole[roleName];
      if (!permObj) continue;
      if (addRow(userRoles, menuByUrl[menuUrl], permObj)) { matrixRowsAdded += 1; changed = true; }
    }
    if (changed) await userRoles.save();
  }

  console.log(`✅ Leaves roles: ${matrixRowsAdded} menu grant(s) added`);
};

const seedShiftAttendanceRoles = async () => {
  const full = { write: true, read: true, edit: true, delete: true, print: true, mail: true };
  const read = { ...full, write: false, edit: false, delete: false, mail: false };
  let changes = 0;
  for (const roleName of ["HR User", "HR Manager", "Employee"]) {
    const role = await RoleMaster.findOne({ roleName });
    const matrix = role && await UserRoles.findOne({ roleId: role._id });
    if (!matrix) continue;
    let changed = false;
    for (const menu of await MenuMaster.find({ menuUrl: { $in: ["/shift-type", "/shift-location", "/shift-assignment", "/shift-schedule", "/shift-schedule-assignment", "/employee-checkin", "/attendance"] } })) {
      let permissions = full;
      if (roleName === "Employee") {
        if (!["/shift-type", "/shift-assignment", "/employee-checkin"].includes(menu.menuUrl)) continue;
        permissions = { ...read, ...(menu.menuUrl === "/shift-type" ? {} : { dataScope: SCOPES.OWN }), write: menu.menuUrl === "/employee-checkin" };
      }
      const existing = matrix.roles.find(row => String(row.menuId) === String(menu._id));
      if (!existing) { matrix.roles.push({ menuId: menu._id, menuGroupId: menu.menuGroup, ...permissions }); changes++; changed = true; }
      else if (String(existing.menuGroupId) !== String(menu.menuGroup)) { existing.menuGroupId = menu.menuGroup; changed = true; changes++; }
    }
    if (changed) await matrix.save();
  }
  console.log(`✅ Shift & Attendance roles: ${changes} menu grant/group change(s)`);
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
  await dedupeMenuMasterByUrl();
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
  await seedEmployeeHealthInsuranceData();
  await seedEmployees(companyId);
  await seedEmployeeRecordsRoles();
  await seedRecruitmentMasters();
  await seedRecruitmentRoles();
  await seedOnboardingSeparationRoles();
  await seedEmployeeCareerEventsMasters();
  await seedEmployeeCareerEventsRoles();
  await seedTrainingSkillsMasters();
  await seedTrainingSkillsRoles();
  await seedTravelMasters();
  await seedTravelRoles();
  await seedLeaveMasters();
  await seedLeaveRoles();
  await seedShiftAttendanceRoles();
  await seedGeographyData();

  await mongoose.disconnect();
  console.log("✅ Seeding complete");
};

run().catch(async (error) => {
  console.error("❌ Seeding failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
