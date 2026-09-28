/**
 * Org-tier page access — the permission matrix for the five reporting-line
 * tiers, transcribed from the "Org Tier Page Access" proposal (claude.ai
 * artifact 5u5F2TonBJJMpizEHXAUj9): CEO, Tower, Department Manager, Team Lead,
 * Employee. Pure data + one builder, so it can be tested without a database.
 *
 * Each row is [menuUrl, actions, scopes]:
 *   actions — own-level things the tier may do on the page. "w" create,
 *             "e" edit / cancel / approve / reject (the matrix has one `edit`
 *             flag for all of them), "d" delete. Everyone can read a listed page.
 *   scopes  — the WIDEST data scope per tier, in TIER_ROLES order, taken from
 *             the proposal's "At a glance" table.
 *
 * Scope words map onto the matrix's existing values:
 *   own → OWN · team → TEAM · all → ALL · direct → APPROVER (the caller's own
 *   rows plus everyone they are the named approver for — by default their direct
 *   reports, ADR-024) · ref → no row scope (company reference data, nothing personal).
 *
 * KNOWN LIMIT — a matrix row carries ONE scope, but the proposal mixes scopes
 * on a page ("a Team Lead views the whole team's leave, approves only their
 * direct reports', edits only their own"). The row gets the widest (view)
 * scope; the narrower per-action rules (approve = direct reports only, edit =
 * own only while Pending) are whatever the controllers already enforce, not
 * something this matrix can express. Field-level hiding (bank, PAN, Aadhaar…
 * for managers) and the "NEW" items in the proposal (change-request flow,
 * directory card, approval steps that do not exist yet) are likewise not
 * seeded — they need code, not a grant.
 *
 * "/dashboard" and "/documentation" are sidebar LINK GROUPS, not menu rows: the
 * sidebar shows them only when the role has a matrix row carrying that group's
 * id (menuId null), so they are seeded via LINK_PAGES / buildLinkRows. Which
 * widgets the dashboard shows is a separate per-role setting (Dashboard
 * Builder). "/profile" is reachable by every signed-in user and needs no grant.
 */
import { SCOPES } from "@demo-panel/shared/scopes";
import { FUNCTIONAL_ROLES } from "./org-functional-roles.data.js";

/** Order matches the scope columns below. Employee is the pre-existing role. */
export const TIER_ROLES = ["CEO", "Tower", "Department Manager", "Team Lead", "Employee"];

/** The nine functional roles, then every role this seeder owns. */
export const FUNCTIONAL_ROLE_NAMES = Object.keys(FUNCTIONAL_ROLES);
export const ALL_ROLE_NAMES = [...TIER_ROLES, ...FUNCTIONAL_ROLE_NAMES];

// assigned / config only appear on the functional roles (org-functional-roles.data.js).
const SCOPE_WORDS = {
  own: SCOPES.OWN,
  direct: SCOPES.APPROVER,
  team: SCOPES.TEAM,
  all: SCOPES.ALL,
  assigned: SCOPES.ALL,
  config: null,
  ref: null,
};

export const TIER_PAGES = [
  ["/employee", "", "all team team team own"], // Employee
  ["/employee-separation", "we", "all team team team own"], // Employee Separation
  ["/employee-grievance", "we", "own own own own own"], // Employee Grievance
  ["/employee-referral", "w", "own own own own own"], // Employee Referral
  ["/training-feedback", "we", "all team team team own"], // Training Feedback
  ["/travel-request", "we", "all team team team own"], // Travel Request
  ["/leave-allocation", "", "all team team team own"], // Leave Allocation
  ["/compensatory-leave-request", "wed", "all team team team own"], // Compensatory Leave Request
  ["/leave-application", "we", "all team team team own"], // Leave Application
  ["/shift-assignment", "", "all team team team own"], // Shift Assignment
  ["/employee-checkin", "w", "all team team team own"], // Employee Checkin
  ["/attendance", "", "all team team team own"], // Attendance
  ["/shift-request", "we", "all team team team own"], // Shift Request
  ["/attendance-request", "we", "all team team team own"], // Attendance Request
  ["/salary-slip", "", "own own own own own"], // Salary Slip
  ["/employee-other-income", "we", "own own own own own"], // Employee Other Income
  ["/employee-benefit-application", "we", "own own own own own"], // Employee Benefit Application
  ["/employee-benefit-claim", "we", "own own own own own"], // Employee Benefit Claim
  ["/employee-benefit-ledger", "", "own own own own own"], // Employee Benefit Ledger
  ["/employee-tax-exemption-declaration", "we", "own own own own own"], // Employee Tax Exemption Declaration
  ["/employee-tax-exemption-proof-submission", "we", "own own own own own"], // Employee Tax Exemption Proof Submission
  ["/appraisal", "e", "all team team direct own"], // Appraisal
  ["/goal", "we", "all team team team own"], // Goal
  ["/employee-performance-feedback", "we", "all team team team own"], // Employee Performance Feedback
  ["/expense-claim", "we", "all team team team own"], // Expense Claim
];

/** Sidebar link groups — [url, scopes], read only, no action flags. */
export const LINK_PAGES = [
  ["/dashboard", "all team team team own"],
  ["/documentation", "ref ref ref ref ref"],
];

/**
 * The matrix rows for one tier: [{ menuUrl, dataScope, read, write, edit,
 * delete, print, mail }]. menuId/menuGroupId are attached by the runner, which
 * knows the database ids.
 */
const tierIndexOf = (roleName) => {
  const tierIndex = TIER_ROLES.indexOf(roleName);
  if (tierIndex === -1) throw new Error(`unknown tier role "${roleName}"`);
  return tierIndex;
};

/** Read-only rows for the sidebar link groups: [{ menuUrl, dataScope, read, ... }]. */
export const buildLinkRows = (roleName) => {
  const tierIndex = tierIndexOf(roleName);
  return LINK_PAGES.map(([menuUrl, scopes]) => ({
    menuUrl,
    dataScope: SCOPE_WORDS[scopes.split(" ")[tierIndex]],
    read: true,
    write: false,
    edit: false,
    delete: false,
    print: true,
    mail: false,
  }));
};

export const buildTierRows = (roleName) => {
  const tierIndex = tierIndexOf(roleName);

  return TIER_PAGES.map(([menuUrl, actions, scopes]) => {
    const word = scopes.split(" ")[tierIndex];
    if (!(word in SCOPE_WORDS)) throw new Error(`buildTierRows: bad scope "${word}" for ${menuUrl}`);
    const write = actions.includes("w");
    const edit = actions.includes("e");
    return {
      menuUrl,
      dataScope: SCOPE_WORDS[word],
      read: true,
      write,
      edit,
      delete: actions.includes("d"),
      print: true,
      mail: write || edit,
    };
  });
};

const actionFlags = (actions) => {
  const write = actions.includes("w");
  const edit = actions.includes("e");
  return { write, edit, delete: actions.includes("d"), mail: write || edit };
};

/**
 * Rows for any role this seeder owns: { menuRows, linkRows }. A tier gets its own
 * table. A functional role gets its own pages PLUS the Employee tier's (an
 * Employee holds one role, so it must still be able to do everything an
 * employee does) — where a page is in both, the functional row wins outright.
 */
export const buildRoleRows = (roleName) => {
  if (TIER_ROLES.includes(roleName)) {
    return { menuRows: buildTierRows(roleName), linkRows: buildLinkRows(roleName) };
  }
  const functional = FUNCTIONAL_ROLES[roleName];
  if (!functional) throw new Error(`unknown role "${roleName}"`);

  const ownPages = new Map();
  for (const [menuUrl, actions, word] of functional.pages) {
    if (!(word in SCOPE_WORDS)) throw new Error(`bad scope "${word}" for ${roleName} ${menuUrl}`);
    ownPages.set(menuUrl, { menuUrl, dataScope: SCOPE_WORDS[word], read: true, print: true, ...actionFlags(actions) });
  }
  const menuRows = [...ownPages.values(), ...buildTierRows("Employee").filter((row) => !ownPages.has(row.menuUrl))];

  const linkByUrl = new Map(buildLinkRows("Employee").map((row) => [row.menuUrl, row]));
  for (const [menuUrl, word] of functional.links) {
    linkByUrl.set(menuUrl, { menuUrl, dataScope: SCOPE_WORDS[word], read: true, write: false, edit: false, delete: false, print: true, mail: false });
  }
  return { menuRows, linkRows: [...linkByUrl.values()] };
};
