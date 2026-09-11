/**
 * Screenshot fixture seed (ADR-011).
 *
 * Fills a *throwaway* database with presentable demo data so the documentation
 * screenshots show populated screens instead of empty tables. This is not
 * `npm run seed` — that one creates the menu tree and a single admin user, and
 * a screenshot of it is a picture of an empty list.
 *
 *   npm run docs            (runs this, then captures)
 *   node apps/server/seed/fixtures.js
 *
 * The data here is fictional and deliberately dull: an office supplies company
 * with six departments. Nothing in it should read as a real person or company,
 * because it ends up in documentation the client shows their staff.
 *
 * SAFETY: this deletes and rewrites collections, so it refuses to run against
 * any database whose name is not the designated fixture one. See assertFixture-
 * Database below — that guard is the only thing standing between this and
 * somebody's real data.
 */
// Must stay the first two imports — same reason as seed/index.js: both are
// global Mongoose plugins that only reach models compiled after them.
import "../models/softDelete.js";
import "../models/auditPlugin.js";

import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

import AdminUser from "../models/AdminUser.js";
import City from "../models/City.js";
import Company from "../models/Company.js";
import Employee from "../models/Employee.js";
import Branch from "../models/Branch.js";
import Designation from "../models/Designation.js";
import ShiftType from "../models/ShiftType.js";
import ShiftLocation from "../models/ShiftLocation.js";
import ShiftAssignment from "../models/ShiftAssignment.js";
import ShiftSchedule from "../models/ShiftSchedule.js";
import ShiftScheduleAssignment from "../models/ShiftScheduleAssignment.js";
import EmployeeCheckin from "../models/EmployeeCheckin.js";
import Attendance from "../models/Attendance.js";

import Country from "../models/Country.js";
import CurrencyMaster from "../models/CurrencyMaster.js";
import DashboardWidget from "../models/DashboardWidget.js";
import Department from "../models/Department.js";
import EmailFor from "../models/EmailFor.js";
import EmailSetup from "../models/EmailSetup.js";
import EmailTemplate from "../models/EmailTemplate.js";
import LoginAttempt from "../models/LoginAttempt.js";
import RoleDashboard from "../models/RoleDashboard.js";
import RoleMaster from "../models/RoleMaster.js";
import SeoPage from "../models/SeoPage.js";
import SeoRedirect from "../models/SeoRedirect.js";
import State from "../models/State.js";
import User from "../models/User.js";

dotenv.config();

/** The only database name this file will write to. */
export const FIXTURE_DB_NAME = "demo-panel-docs-fixtures";

/** Credentials the capture script signs in with. Fixture-only, never a server. */
export const FIXTURE_ADMIN = {
  email: "admin@example.com",
  password: "Fixture@123",
  name: "Alex Morgan",
};

/**
 * Refuses to touch anything but the fixture database.
 *
 * `npm run docs` points DATABASE at the fixture database via DOCS_DATABASE, but
 * a mistyped env var or a copied command would otherwise drop the collections
 * of whatever `.env` happens to name — which on a developer's machine is their
 * working data and on a server is the client's.
 */
const assertFixtureDatabase = (uri) => {
  // Everything after the last "/" and before any "?" is the database name.
  const name = uri.split("/").pop().split("?")[0];
  if (name !== FIXTURE_DB_NAME) {
    console.error(
      `❌ Refusing to seed fixtures into "${name}".\n` +
        `   This wipes collections, so it only ever runs against "${FIXTURE_DB_NAME}".\n` +
        `   Set DOCS_DATABASE to a URI ending in /${FIXTURE_DB_NAME}.`,
    );
    process.exit(1);
  }
  return name;
};

/** Dates that look like a system in steady use rather than one seeded at once. */
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

const DEPARTMENTS = [
  { departmentName: "Sales", departmentCode: "SLS" },
  { departmentName: "Operations", departmentCode: "OPS" },
  { departmentName: "Finance", departmentCode: "FIN" },
  { departmentName: "Customer Support", departmentCode: "SUP" },
  { departmentName: "Warehouse", departmentCode: "WHS" },
  { departmentName: "Human Resources", departmentCode: "HR" },
];

const ROLES = ["Administrator", "Manager", "Sales Executive", "Support Agent", "Warehouse Staff"];

/**
 * Names are invented and generic on purpose. A screenshot in the client's
 * documentation should not look like it leaked somebody's real user list.
 */
const PEOPLE = [
  ["Priya Sharma", "Sales", "Manager"],
  ["Daniel Okafor", "Sales", "Sales Executive"],
  ["Mei Lin Tan", "Sales", "Sales Executive"],
  ["Rahul Verma", "Operations", "Manager"],
  ["Sofia Rossi", "Operations", "Warehouse Staff"],
  ["James Whitfield", "Finance", "Manager"],
  ["Aisha Rahman", "Finance", "Sales Executive"],
  ["Tomás Herrera", "Customer Support", "Support Agent"],
  ["Grace Mwangi", "Customer Support", "Support Agent"],
  ["Oliver Bennett", "Customer Support", "Manager"],
  ["Yuki Nakamura", "Warehouse", "Warehouse Staff"],
  ["Fatima Al-Sayed", "Warehouse", "Warehouse Staff"],
  ["Lucas Meyer", "Human Resources", "Manager"],
  ["Chloe Dubois", "Human Resources", "Support Agent"],
];

const emailFor = (name) => `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`;

/**
 * Wipes every fixture collection.
 *
 * deleteMany({}) rather than dropping the database, so the indexes built by
 * `npm run seed` survive and the screens behave exactly as they do in
 * production — a list sorted by a missing index would look the same but be a
 * different query.
 *
 * Note this bypasses the soft-delete plugin deliberately: fixtures are rebuilt
 * from nothing each run, so a hidden `isDeleted: true` row from a previous run
 * would linger forever and quietly grow the collection.
 */
const wipe = async () => {
  const models = [
    Employee, Branch, Designation, ShiftType, ShiftLocation, ShiftAssignment, ShiftSchedule, ShiftScheduleAssignment, EmployeeCheckin, Attendance,
    City, Company, Country, CurrencyMaster, DashboardWidget, Department, EmailFor,
    EmailSetup, EmailTemplate, LoginAttempt, RoleDashboard, RoleMaster,
    SeoPage, SeoRedirect, State, User,
  ];
  for (const model of models) await model.collection.deleteMany({});
  // Admin users are wiped by email so a real one on a shared database — which
  // the guard above should have prevented anyway — is not collateral.
  await AdminUser.collection.deleteMany({ email: FIXTURE_ADMIN.email });
  console.log("✅ Cleared fixture collections");
};

const seedLocations = async () => {
  const [india, uk] = await Country.create([
    { countryName: "India", countryCode: "IN", isActive: true },
    { countryName: "United Kingdom", countryCode: "GB", isActive: true },
  ]);
  const [gujarat, maharashtra, greaterLondon] = await State.create([
    { stateName: "Gujarat", stateCode: "GJ", countryId: india._id, isActive: true },
    { stateName: "Maharashtra", stateCode: "MH", countryId: india._id, isActive: true },
    { stateName: "Greater London", stateCode: "LDN", countryId: uk._id, isActive: true },
  ]);
  const cities = await City.create([
    { cityName: "Ahmedabad", cityCode: "AMD", stateId: gujarat._id, countryId: india._id, isActive: true },
    { cityName: "Surat", cityCode: "SRT", stateId: gujarat._id, countryId: india._id, isActive: true },
    { cityName: "Mumbai", cityCode: "BOM", stateId: maharashtra._id, countryId: india._id, isActive: true },
    { cityName: "Pune", cityCode: "PNQ", stateId: maharashtra._id, countryId: india._id, isActive: true },
    { cityName: "London", cityCode: "LON", stateId: greaterLondon._id, countryId: uk._id, isActive: true },
  ]);

  await CurrencyMaster.create([
    { currencyName: "Indian Rupee", currencyCode: "INR", currencySymbol: "₹", isActive: true },
    { currencyName: "Pound Sterling", currencyCode: "GBP", currencySymbol: "£", isActive: true },
    { currencyName: "US Dollar", currencyCode: "USD", currencySymbol: "$", isActive: true },
  ]);

  console.log(`✅ Locations: 2 countries, 3 states, ${cities.length} cities, 3 currencies`);
  return { country: india, state: gujarat, city: cities[0] };
};

const seedPeople = async (place) => {
  // ADR-017: Department.companyId is now required. This fixture company is
  // as fictional as everything else in this file — a real Apidel Company is
  // seeded separately by seed/index.js, never by this throwaway script.
  const fixtureCompany = await Company.create({ companyName: "Fixture Co", isActive: true });

  const departments = await Department.create(
    DEPARTMENTS.map((d) => ({ ...d, companyId: fixtureCompany._id, isActive: true })),
  );
  const roles = await RoleMaster.create(ROLES.map((roleName) => ({ roleName, isActive: true })));

  const byDepartment = Object.fromEntries(departments.map((d) => [d.departmentName, d._id]));
  const byRole = Object.fromEntries(roles.map((r) => [r.roleName, r._id]));

  // One hash, reused. bcrypt at cost 10 fourteen times is several seconds of a
  // run that happens on every documentation build, and no fixture user is ever
  // signed in as — the capture script uses the admin account below.
  const password = await bcrypt.hash("Fixture@123", 10);

  await User.create(
    PEOPLE.map(([userName, department, role], index) => ({
      userName,
      email: emailFor(userName),
      mobileNumber: `98${String(76543210 + index).padStart(8, "0")}`,
      departmentId: byDepartment[department],
      roleId: byRole[role],
      countryId: place.country._id,
      stateId: place.state._id,
      cityId: place.city._id,
      address: `${100 + index} Riverside Avenue`,
      password,
      isActive: index % 7 !== 6, // a couple inactive, so the status column varies
      createdAt: daysAgo(120 - index * 6),
    })),
  );

  await AdminUser.create({
    adminName: FIXTURE_ADMIN.name,
    email: FIXTURE_ADMIN.email,
    password: await bcrypt.hash(FIXTURE_ADMIN.password, 10),
    mobileNumber: "9999900000",
    isActive: true,
  });

  console.log(`✅ People: ${departments.length} departments, ${roles.length} roles, ${PEOPLE.length} users`);
  return { departments, roles };
};

/**
 * Sign-in state, so the Login Attempt Logs screen and the widgets reporting on
 * it have something to show.
 *
 * One row per person, not one per attempt: `userEmail` is uniquely indexed
 * because this collection holds each account's *current* lock state rather than
 * a history of events. (ADR-003 notes the same thing from the reporting side.)
 * A couple of rows are left locked so the screen's locked-account handling is
 * visible in the screenshot.
 */
const seedLoginAttempts = async () => {
  const rows = PEOPLE.map(([name], i) => {
    const locked = i % 7 === 3;
    return {
      userEmail: emailFor(name),
      attemptCount: locked ? 5 : i % 4,
      isLocked: locked,
      lockUntil: locked ? new Date(Date.now() + 15 * 60 * 1000) : null,
      lastLoginAttempt: daysAgo(i % 30),
      lastLoggedIn: locked ? null : daysAgo(i % 30),
      ipAddress: `192.0.2.${10 + i}`,
      createdAt: daysAgo(30 + i),
      updatedAt: daysAgo(i % 30),
    };
  });
  await LoginAttempt.collection.insertMany(rows);
  console.log(`✅ Login attempts: ${rows.length} rows`);
};

const seedEmails = async () => {
  // Trigger keys (ADR-015): "Password reset" claims the one real registered
  // trigger, `password.forgot`, so its screenshots illustrate the merge-field
  // hint actually populated. The other two use `unassigned.*` placeholders —
  // the same shape a project's own pre-existing purposes get from the
  // `backfillEmailForTriggerKeys` migration in seed/index.js — since this
  // starter only registers one real trigger.
  const purposes = await EmailFor.create([
    { emailFor: "Welcome email", triggerKey: "unassigned.welcome-email", isActive: true },
    { emailFor: "Password reset", triggerKey: "password.forgot", isActive: true },
    { emailFor: "Order confirmation", triggerKey: "unassigned.order-confirmation", isActive: true },
  ]);
  const setup = await EmailSetup.create({
    email: "no-reply@example.com",
    appPassword: "fixture-app-password",
    host: "smtp.example.com",
    port: "587",
    SSL: true,
    isActive: true,
  });
  await EmailTemplate.create(
    purposes.map((purpose, index) => ({
      templateName: purpose.emailFor,
      emailFrom: setup._id,
      emailFor: purpose._id,
      mailerName: "Example Co",
      emailSubject: purpose.triggerKey === "password.forgot" ? "Your one-time code" : purpose.emailFor,
      emailSignature:
        purpose.triggerKey === "password.forgot"
          ? "<p>Hi {{USERNAME}},</p><p>Your one-time code is {{OTP_CODE}}.</p><p>Thanks,<br/>The Example Co team</p>"
          : "<p>Thanks,<br/>The Example Co team</p>",
      isActive: true,
      createdAt: daysAgo(60 - index * 10),
    })),
  );
  console.log("✅ Email: 3 purposes, 1 SMTP account, 3 templates");
};

const seedSeo = async () => {
  await SeoPage.create([
    {
      path: "/",
      pageName: "Home",
      focusKeyword: "office supplies",
      title: "Office Supplies, Delivered Next Day | Example Co",
      description: "Everything your workplace runs on, shipped from our warehouse the same day you order it.",
      isActive: true,
    },
    {
      path: "/about",
      pageName: "About us",
      title: "About Example Co",
      description: "Family-run since 1998, supplying offices across the country.",
      isActive: true,
    },
    {
      path: "/contact",
      pageName: "Contact",
      title: "Contact Us | Example Co",
      description: "Talk to our support team by phone, email or live chat.",
      isActive: true,
    },
  ]);
  await SeoRedirect.create([
    { fromPath: "/old-pricing", toPath: "/pricing", statusCode: 301, hits: 148, lastHitAt: daysAgo(2), notes: "Replaced by the new pricing page", isActive: true },
    { fromPath: "/blog/2019", toPath: "/blog", statusCode: 301, hits: 32, lastHitAt: daysAgo(9), isActive: true },
    { fromPath: "/promo-expired", statusCode: 410, hits: 7, lastHitAt: daysAgo(21), notes: "Campaign ended, no replacement", isActive: true },
  ]);
  console.log("✅ SEO: 3 pages, 3 redirects");
};

/**
 * A dashboard with something on it. Widget shapes here must stay valid against
 * config/widgetSources.js — a widget referencing a field outside the registry's
 * allowlists is rejected at run time and the tile renders as an error, which is
 * a poor thing to photograph.
 */
const seedDashboard = async () => {
  const widgets = await DashboardWidget.create([
    {
      title: "Total users",
      description: "Everyone with an account, including inactive ones.",
      source: "users",
      metric: { type: "count", field: null },
      chartType: "stat",
      dateRange: "all",
      isActive: true,
    },
    {
      title: "Users by department",
      source: "users",
      metric: { type: "count", field: null },
      groupBy: "departmentId",
      chartType: "bar",
      dateRange: "all",
      isActive: true,
    },
    {
      title: "Team split",
      source: "users",
      metric: { type: "count", field: null },
      groupBy: "departmentId",
      chartType: "pie",
      dateRange: "all",
      isActive: true,
    },
    {
      title: "Accounts created over time",
      source: "users",
      metric: { type: "count", field: null },
      dateField: "createdAt",
      chartType: "line",
      dateRange: "all",
      isActive: true,
    },
  ]);

  await RoleDashboard.create({
    roleId: null, // the admin / default dashboard
    widgets: [
      { widgetId: widgets[0]._id, sequence: 1, size: "sm" },
      { widgetId: widgets[1]._id, sequence: 2, size: "md" },
      { widgetId: widgets[2]._id, sequence: 3, size: "md" },
      { widgetId: widgets[3]._id, sequence: 4, size: "lg" },
    ],
    isActive: true,
  });

  console.log(`✅ Dashboard: ${widgets.length} widgets pinned to the default dashboard`);
};


// ADR-025: fictional records for all seven foundation screens, only in the guarded docs DB.
const seedShiftAttendance = async () => {
  const department = await Department.findOne({ departmentName: "Operations" });
  const companyId = department.companyId;
  const branch = await Branch.create({ branchName: "Central Office", companyId });
  const designation = await Designation.create({ designationName: "Operations Specialist", companyId });
  const employee = await Employee.create({ employeeCode: "DOC-SHIFT-001", employeeName: "Morgan Taylor", companyId,
    departmentId: department._id, branchId: branch._id, designationId: designation._id, dateOfJoining: "2026-01-01" });
  const shift = await ShiftType.create({ shiftTypeName: "Office Day", companyId, startTime: "09:00", endTime: "17:00" });
  const location = await ShiftLocation.create({ locationName: "Central Office", companyId, latitude: 51.5074, longitude: -0.1278, checkinRadius: 150 });
  const schedule = await ShiftSchedule.create({ companyId, shiftTypeId: shift._id, frequency: "every-1-week", repeatOnDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] });
  const recurring = await ShiftScheduleAssignment.create({ employeeId: employee._id, companyId, shiftScheduleId: schedule._id, shiftLocationId: location._id, createShiftsAfter: "2026-10-01" });
  await ShiftAssignment.create({ employeeId: employee._id, companyId, shiftTypeId: shift._id, shiftLocationId: location._id, shiftScheduleAssignmentId: recurring._id, startDate: "2026-09-01", endDate: "2026-09-30" });
  const attendance = await Attendance.create({ employeeId: employee._id, companyId, departmentId: department._id, shiftId: shift._id,
    attendanceDate: "2026-09-10", status: "Present", workingHours: 8, standardWorkingHours: 8, inTime: "2026-09-10T09:00:00Z", outTime: "2026-09-10T17:00:00Z" });
  await EmployeeCheckin.create({ employeeId: employee._id, companyId, shiftId: shift._id, attendanceId: attendance._id, time: "2026-09-10T09:00:00Z", logType: "IN", offshift: false, deviceId: "Office terminal" });
};

const run = async () => {
  const uri = process.env.DOCS_DATABASE || process.env.DATABASE;
  if (!uri) {
    console.error("❌ Neither DOCS_DATABASE nor DATABASE is set");
    process.exit(1);
  }
  assertFixtureDatabase(uri);

  mongoose.set("strictQuery", false);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log(`✅ Connected to ${FIXTURE_DB_NAME}`);

  await wipe();
  const place = await seedLocations();
  await seedPeople(place);
  await seedShiftAttendance();
  await seedLoginAttempts();
  await seedEmails();
  await seedSeo();
  await seedDashboard();

  await mongoose.disconnect();
  console.log("✅ Fixtures ready");
};

// Only when run directly — the capture script imports FIXTURE_ADMIN from here.
if (process.argv[1] && process.argv[1].endsWith("fixtures.js")) {
  run().catch(async (error) => {
    console.error("❌ Fixture seeding failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  });
}
