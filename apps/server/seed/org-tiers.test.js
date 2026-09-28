import assert from "node:assert/strict";
import { SCOPES } from "@demo-panel/shared/scopes";
import { FUNCTIONAL_ROLES } from "./org-functional-roles.data.js";
import { ALL_ROLE_NAMES, FUNCTIONAL_ROLE_NAMES, LINK_PAGES, TIER_PAGES, TIER_ROLES, buildLinkRows, buildRoleRows, buildTierRows } from "./org-tiers.data.js";

const rowFor = (role, menuUrl) => buildTierRows(role).find((row) => row.menuUrl === menuUrl);

// Every page carries one scope word per tier, and no page is listed twice.
for (const [menuUrl, , scopes] of TIER_PAGES) {
  assert.equal(scopes.split(" ").length, TIER_ROLES.length, `${menuUrl}: one scope per tier`);
}
assert.equal(new Set(TIER_PAGES.map(([menuUrl]) => menuUrl)).size, TIER_PAGES.length, "no duplicate pages");

// Widest scope follows the proposal's "At a glance" table.
assert.equal(rowFor("CEO", "/leave-application").dataScope, SCOPES.ALL);
assert.equal(rowFor("Tower", "/leave-application").dataScope, SCOPES.TEAM);
assert.equal(rowFor("Team Lead", "/leave-application").dataScope, SCOPES.TEAM);
assert.equal(rowFor("Employee", "/leave-application").dataScope, SCOPES.OWN);
// Team Leads appraise direct reports only -> approver scope.
assert.equal(rowFor("Team Lead", "/appraisal").dataScope, SCOPES.APPROVER);
assert.equal(rowFor("Department Manager", "/appraisal").dataScope, SCOPES.TEAM);
// Reference data carries no row scope.
// Setup pages are closed to every tier (the leave form reads leave types through the API).
for (const role of TIER_ROLES) {
  for (const menuUrl of ["/leave-type", "/leave-period", "/holiday-list", "/shift-type"]) {
    assert.equal(rowFor(role, menuUrl), undefined, `${role}: ${menuUrl} must not be granted`);
  }
}

// Action flags: read-only pages, no delete anywhere but comp-off, no manual punch edits.
for (const role of TIER_ROLES) {
  const rows = buildTierRows(role);
  assert.ok(rows.every((row) => row.read), `${role}: read on every listed page`);
  assert.deepEqual(rows.filter((row) => row.delete).map((row) => row.menuUrl), ["/compensatory-leave-request"]);
  assert.equal(rowFor(role, "/salary-slip").write, false, `${role}: payslips are read-only`);
  assert.equal(rowFor(role, "/attendance").edit, false, `${role}: attendance is fixed via Attendance Request`);
  assert.equal(rowFor(role, "/employee-checkin").edit, false, `${role}: punches cannot be edited`);
  assert.equal(rowFor(role, "/employee-checkin").delete, false, `${role}: punches cannot be deleted`);
}

// Sidebar link groups (Dashboard, Documentation) get read-only rows for every tier.
for (const role of TIER_ROLES) {
  const links = buildLinkRows(role);
  assert.deepEqual(links.map((row) => row.menuUrl), LINK_PAGES.map(([url]) => url));
  assert.ok(links.every((row) => row.read && !row.write && !row.edit && !row.delete));
}
assert.equal(buildLinkRows("CEO")[0].dataScope, SCOPES.ALL);
assert.equal(buildLinkRows("Employee")[0].dataScope, SCOPES.OWN);
assert.equal(buildLinkRows("Team Lead")[1].dataScope, null);

// Functional roles: own pages win, Employee-tier pages are kept, logs are read-only.
assert.equal(FUNCTIONAL_ROLE_NAMES.length, 9);
for (const role of FUNCTIONAL_ROLE_NAMES) {
  const { menuRows, linkRows } = buildRoleRows(role);
  const urls = menuRows.map((row) => row.menuUrl);
  assert.equal(new Set(urls).size, urls.length, `${role}: no duplicate pages`);
  assert.ok(urls.includes("/leave-application"), `${role} still carries the Employee tier pages`);
  assert.ok(linkRows.some((row) => row.menuUrl === "/documentation"));
  for (const menuUrl of ["/audit-log", "/login-attempt-logs"]) {
    const row = menuRows.find((r) => r.menuUrl === menuUrl);
    if (row) assert.ok(!row.write && !row.edit && !row.delete, `${role}: ${menuUrl} is read-only`);
  }
}
const menuOf = (role, menuUrl) => buildRoleRows(role).menuRows.find((row) => row.menuUrl === menuUrl);
assert.equal(menuOf("Auditor", "/salary-slip").edit, false, "Auditor cannot edit payslips");
assert.equal(menuOf("HR Executive", "/leave-application").dataScope, SCOPES.ALL, "functional row wins over Employee row");
assert.equal(menuOf("Payroll", "/salary-slip").write, true);
assert.deepEqual(ALL_ROLE_NAMES, [...TIER_ROLES, ...Object.keys(FUNCTIONAL_ROLES)]);

assert.throws(() => buildTierRows("Nobody"), /unknown tier role/);
console.log("org-tiers.test.js passed");
