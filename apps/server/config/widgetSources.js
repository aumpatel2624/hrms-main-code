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

  // Employee Records (ADR-018). Headcount is a count-of-records stat — no
  // numeric field on either collection to sum/average.
  employees: {
    label: "Employees",
    model: "Employee",
    aggregatable: {},
    groupable: {
      departmentId: {
        label: "Department",
        lookup: { from: "departments", labelField: "departmentName" },
      },
      designationId: {
        label: "Designation",
        lookup: { from: "designations", labelField: "designationName" },
      },
      companyId: {
        label: "Company",
        lookup: { from: "companies", labelField: "companyName" },
      },
      status: { label: "Status" },
    },
    dateFields: { dateOfJoining: "Date of Joining", createdAt: "Created" },
    filterable: {
      employeeCode: "string",
      employeeName: "string",
      companyId: "objectId",
      departmentId: "objectId",
      designationId: "objectId",
      branchId: "objectId",
      status: "enum",
      dateOfJoining: "date",
      isActive: "boolean",
      createdAt: "date",
    },
  },

  "employee-health-insurances": {
    label: "Employee Health Insurances",
    model: "EmployeeHealthInsurance",
    aggregatable: {},
    groupable: {
      isActive: { label: "Active status" },
    },
    dateFields: { createdAt: "Created" },
    filterable: {
      providerName: "string",
      isActive: "boolean",
      createdAt: "date",
    },
  },

  // ---- Recruitment (ADR-019) ----
  "job-openings": {
    label: "Job Openings",
    model: "JobOpening",
    aggregatable: {},
    groupable: {
      status: { label: "Status" },
      companyId: {
        label: "Company",
        lookup: { from: "companies", labelField: "companyName" },
      },
      departmentId: {
        label: "Department",
        lookup: { from: "departments", labelField: "departmentName" },
      },
      publish: { label: "Published" },
    },
    dateFields: { postedOn: "Posted On", createdAt: "Created" },
    filterable: {
      jobTitle: "string",
      designationId: "objectId",
      status: "enum",
      companyId: "objectId",
      departmentId: "objectId",
      publish: "boolean",
      postedOn: "date",
      isActive: "boolean",
      createdAt: "date",
    },
  },

  "job-applicants": {
    label: "Job Applicants",
    model: "JobApplicant",
    aggregatable: {},
    groupable: {
      status: { label: "Status" },
      sourceId: {
        label: "Source",
        lookup: { from: "jobapplicantsources", labelField: "sourceName" },
      },
    },
    dateFields: { createdAt: "Applied On" },
    filterable: {
      applicantName: "string",
      emailId: "string",
      jobOpeningId: "objectId",
      status: "enum",
      sourceId: "objectId",
      isActive: "boolean",
      createdAt: "date",
    },
  },

  // HRMS module 4 (ADR-020).
  "employee-onboardings": {
    label: "Employee Onboardings",
    model: "EmployeeOnboarding",
    aggregatable: {},
    groupable: {
      boardingStatus: { label: "Status" },
      companyId: {
        label: "Company",
        lookup: { from: "companies", labelField: "companyName" },
      },
      departmentId: {
        label: "Department",
        lookup: { from: "departments", labelField: "departmentName" },
      },
    },
    dateFields: { dateOfJoining: "Date of Joining", createdAt: "Created" },
    filterable: {
      jobApplicantId: "objectId",
      companyId: "objectId",
      departmentId: "objectId",
      boardingStatus: "enum",
      dateOfJoining: "date",
      isActive: "boolean",
      createdAt: "date",
    },
  },
  "employee-separations": {
    label: "Employee Separations",
    model: "EmployeeSeparation",
    aggregatable: {},
    groupable: {
      boardingStatus: { label: "Status" },
    },
    dateFields: { createdAt: "Created" },
    filterable: {
      employeeId: "objectId",
      boardingStatus: "enum",
      isActive: "boolean",
      createdAt: "date",
    },
  },

  // HRMS module 5 (ADR-021).
  "employee-grievances": {
    label: "Employee Grievances",
    model: "EmployeeGrievance",
    aggregatable: {},
    groupable: {
      status: { label: "Status" },
      grievanceTypeId: {
        label: "Grievance Type",
        lookup: { from: "grievancetypes", labelField: "grievanceTypeName" },
      },
    },
    dateFields: { date: "Date Raised", createdAt: "Created" },
    filterable: {
      raisedByEmployeeId: "objectId",
      grievanceTypeId: "objectId",
      status: "enum",
      date: "date",
      isActive: "boolean",
      createdAt: "date",
    },
  },
  "staffing-plans": {
    label: "Staffing Plans",
    model: "StaffingPlan",
    aggregatable: { totalEstimatedBudget: "Total Estimated Budget" },
    groupable: {
      companyId: {
        label: "Company",
        lookup: { from: "companies", labelField: "companyName" },
      },
      departmentId: {
        label: "Department",
        lookup: { from: "departments", labelField: "departmentName" },
      },
    },
    dateFields: { fromDate: "From Date", createdAt: "Created" },
    filterable: {
      companyId: "objectId",
      departmentId: "objectId",
      fromDate: "date",
      toDate: "date",
      isActive: "boolean",
      createdAt: "date",
    },
  },

  // ADR-022 (Training & Skills). No entry for employee-skill-maps — it's a
  // lookup screen (one row per employee, an embedded skills array), nothing
  // meaningful to group or sum yet.
  "training-events": {
    label: "Training Events",
    model: "TrainingEvent",
    aggregatable: {},
    groupable: {
      eventStatus: { label: "Status" },
      type: { label: "Type" },
      companyId: {
        label: "Company",
        lookup: { from: "companies", labelField: "companyName" },
      },
    },
    dateFields: { startTime: "Start Time", createdAt: "Created" },
    filterable: {
      eventName: "string",
      eventStatus: "enum",
      type: "enum",
      companyId: "objectId",
      trainingProgramId: "objectId",
      isActive: "boolean",
      createdAt: "date",
    },
  },

  // ADR-023 (Travel). No entry for purpose-of-travels /
  // identification-document-types — two one-field admin masters, nothing to
  // group or sum.
  "travel-requests": {
    label: "Travel Requests",
    model: "TravelRequest",
    aggregatable: {},
    groupable: {
      status: { label: "Status" },
      travelType: { label: "Travel Type" },
      companyId: {
        label: "Company",
        lookup: { from: "companies", labelField: "companyName" },
      },
    },
    dateFields: { createdAt: "Created" },
    filterable: {
      employeeId: "objectId",
      travelType: "string",
      status: "string",
      companyId: "objectId",
      createdAt: "date",
    },
  },
});
