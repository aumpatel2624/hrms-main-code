/**
 * The widget source registry (ADR-003) — the trust boundary of the dashboard
 * grammar. The builder UI can only offer, and a stored widget can only
 * reference, what is declared here. A new collection is invisible to the
 * builder until a developer adds an entry; that is the security model, the
 * same philosophy as a controller's `filterable` map.
 *
 * Per source:
 * - model        mongoose model *name* (resolved at run — avoids import cycles)
 * - label        what the builder shows
 * - aggregatable numeric fields usable by sum/avg, `{ field: label }`
 * - groupable    fields usable as group-by; optional `lookup` joins a display
 *                label (`from` collection, `labelField`) for ObjectId refs.
 *                The FIRST entry is also the default breakdown a stat tile
 *                shows behind its info icon, so put the most meaningful cut
 *                of the collection first.
 * - dateFields   date fields a preset range may apply to, `{ field: label }`
 * - filterable   `{ field: type }` allowlist for widget filters — exactly the
 *                runListQuery grammar (see 30-api.md)
 * - scopeable    ADR-002 scope dimensions, passed to buildScopeFilter at run
 */
export const WIDGET_SOURCES = Object.freeze({
  users: {
    label: "Users",
    model: "User",
    aggregatable: {},
    groupable: {
      departmentId: {
        label: "Department",
        lookup: { from: "departments", labelField: "departmentName" },
      },
      roleId: {
        label: "Role",
        lookup: { from: "rolemasters", labelField: "roleName" },
      },
      isActive: { label: "Active status" },
    },
    dateFields: { createdAt: "Created" },
    filterable: {
      userName: "string",
      email: "string",
      isActive: "boolean",
      departmentId: "objectId",
      roleId: "objectId",
      createdAt: "date",
    },
    scopeable: { department: "departmentId", owner: "_id" },
  },

  "login-attempts": {
    label: "Login Attempts",
    model: "LoginAttempt",
    aggregatable: { attemptCount: "Failed attempt count" },
    groupable: {
      isLocked: { label: "Locked status" },
    },
    dateFields: { lastLoggedIn: "Last logged in", createdAt: "Created" },
    filterable: {
      userEmail: "string",
      isLocked: "boolean",
      attemptCount: "number",
      createdAt: "date",
      lastLoggedIn: "date",
    },
    scopeable: { owner: "userId" },
  },

  // Organization Setup (ADR-017). Pure masters with no numeric field yet —
  // no `aggregatable` on any of them. Company is the top of the hierarchy so
  // it has nothing to group by; the rest group by companyId once a project
  // seeds more than one.
  companies: {
    label: "Companies",
    model: "Company",
    aggregatable: {},
    groupable: {
      isActive: { label: "Active status" },
    },
    dateFields: { createdAt: "Created" },
    filterable: {
      companyName: "string",
      companyCode: "string",
      isActive: "boolean",
      createdAt: "date",
    },
  },

  branches: {
    label: "Branches",
    model: "Branch",
    aggregatable: {},
    groupable: {
      companyId: {
        label: "Company",
        lookup: { from: "companies", labelField: "companyName" },
      },
      isActive: { label: "Active status" },
    },
    dateFields: { createdAt: "Created" },
    filterable: {
      branchName: "string",
      companyId: "objectId",
      isActive: "boolean",
      createdAt: "date",
    },
  },

  departments: {
    label: "Departments",
    model: "Department",
    aggregatable: {},
    groupable: {
      companyId: {
        label: "Company",
        lookup: { from: "companies", labelField: "companyName" },
      },
      isActive: { label: "Active status" },
    },
    dateFields: { createdAt: "Created" },
    filterable: {
      departmentName: "string",
      departmentCode: "string",
      companyId: "objectId",
      isActive: "boolean",
      createdAt: "date",
    },
  },

  designations: {
    label: "Designations",
    model: "Designation",
    aggregatable: {},
    groupable: {
      companyId: {
        label: "Company",
        lookup: { from: "companies", labelField: "companyName" },
      },
      isActive: { label: "Active status" },
    },
    dateFields: { createdAt: "Created" },
    filterable: {
      designationName: "string",
      companyId: "objectId",
      isActive: "boolean",
      createdAt: "date",
    },
  },

  "employment-types": {
    label: "Employment Types",
    model: "EmploymentType",
    aggregatable: {},
    groupable: {
      isActive: { label: "Active status" },
    },
    dateFields: { createdAt: "Created" },
    filterable: {
      employmentTypeName: "string",
      isActive: "boolean",
      createdAt: "date",
    },
  },

  "employee-grades": {
    label: "Employee Grades",
    model: "EmployeeGrade",
    aggregatable: {},
    groupable: {
      isActive: { label: "Active status" },
    },
    dateFields: { createdAt: "Created" },
    filterable: {
      gradeName: "string",
      isActive: "boolean",
      createdAt: "date",
    },
  },
});
