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
  "shift-types": {
  "label": "Shift Type",
  "model": "ShiftType",
  menuUrl: "/shift-type",
  "aggregatable": {},
  "groupable": {
    "companyId": {
      "label": "Company",
      "lookup": {
        "from": "companies",
        "labelField": "companyName"
      }
    },
    "isActive": {
      "label": "Is active"
    }
  },
  "dateFields": {
    "createdAt": "createdAt"
  },
  "filterable": {
    "shiftTypeName": "string",
    "holidayListId": "objectId",
    "enableAutoAttendance": "boolean",
    "companyId": "objectId",
    "isActive": "boolean",
    "createdAt": "date"
  },
  "scopeable": {},
  "companyConfined": true,
  "employeeOwned": false
},
  "shift-locations": {
  "label": "Shift Location",
  "model": "ShiftLocation",
  menuUrl: "/shift-location",
  "aggregatable": {},
  "groupable": {
    "companyId": {
      "label": "Company",
      "lookup": {
        "from": "companies",
        "labelField": "companyName"
      }
    },
    "isActive": {
      "label": "Is active"
    }
  },
  "dateFields": {
    "createdAt": "createdAt"
  },
  "filterable": {
    "locationName": "string",
    "companyId": "objectId",
    "isActive": "boolean",
    "createdAt": "date"
  },
  "scopeable": {},
  "companyConfined": true,
  "employeeOwned": false
},
  "shift-assignments": {
  "label": "Shift Assignment",
  "model": "ShiftAssignment",
  menuUrl: "/shift-assignment",
  "aggregatable": {},
  "groupable": {
    "shiftTypeId": {
      "label": "Shift type",
      "lookup": {
        "from": "shifttypes",
        "labelField": "shiftTypeName"
      }
    },
    "status": {
      "label": "Status"
    },
    "companyId": {
      "label": "Company",
      "lookup": {
        "from": "companies",
        "labelField": "companyName"
      }
    },
    "isActive": {
      "label": "Is active"
    }
  },
  "dateFields": {
    "startDate": "startDate",
    "endDate": "endDate",
    "createdAt": "createdAt"
  },
  "filterable": {
    "employeeId": "objectId",
    "shiftTypeId": "objectId",
    "shiftLocationId": "objectId",
    "shiftScheduleAssignmentId": "objectId",
    "startDate": "date",
    "endDate": "date",
    "status": "string",
    "companyId": "objectId",
    "isActive": "boolean",
    "createdAt": "date"
  },
  "scopeable": {
    "owner": "employeeId"
  },
  "companyConfined": true,
  "employeeOwned": true
},
  "shift-schedules": {
  "label": "Shift Schedule",
  "model": "ShiftSchedule",
  menuUrl: "/shift-schedule",
  "aggregatable": {},
  "groupable": {
    "frequency": {
      "label": "Frequency"
    },
    "shiftTypeId": {
      "label": "Shift type",
      "lookup": {
        "from": "shifttypes",
        "labelField": "shiftTypeName"
      }
    },
    "companyId": {
      "label": "Company",
      "lookup": {
        "from": "companies",
        "labelField": "companyName"
      }
    },
    "isActive": {
      "label": "Is active"
    }
  },
  "dateFields": {
    "createdAt": "createdAt"
  },
  "filterable": {
    "frequency": "string",
    "shiftTypeId": "objectId",
    "companyId": "objectId",
    "isActive": "boolean",
    "createdAt": "date"
  },
  "scopeable": {},
  "companyConfined": true,
  "employeeOwned": false
},
  "shift-schedule-assignments": {
  "label": "Shift Schedule Assignment",
  "model": "ShiftScheduleAssignment",
  menuUrl: "/shift-schedule-assignment",
  "aggregatable": {},
  "groupable": {
    "enabled": {
      "label": "Enabled"
    },
    "status": {
      "label": "Status"
    },
    "companyId": {
      "label": "Company",
      "lookup": {
        "from": "companies",
        "labelField": "companyName"
      }
    },
    "isActive": {
      "label": "Is active"
    }
  },
  "dateFields": {
    "createShiftsAfter": "createShiftsAfter",
    "createdAt": "createdAt"
  },
  "filterable": {
    "employeeId": "objectId",
    "shiftScheduleId": "objectId",
    "shiftLocationId": "objectId",
    "enabled": "boolean",
    "createShiftsAfter": "date",
    "status": "string",
    "companyId": "objectId",
    "isActive": "boolean",
    "createdAt": "date"
  },
  "scopeable": {
    "owner": "employeeId"
  },
  "companyConfined": true,
  "employeeOwned": true
},
  "employee-checkins": {
  "label": "Employee Checkin",
  "model": "EmployeeCheckin",
  menuUrl: "/employee-checkin",
  "aggregatable": {},
  "groupable": {
    "shiftId": {
      "label": "Shift",
      "lookup": {
        "from": "shifttypes",
        "labelField": "shiftTypeName"
      }
    },
    "offshift": {
      "label": "Offshift"
    },
    "companyId": {
      "label": "Company",
      "lookup": {
        "from": "companies",
        "labelField": "companyName"
      }
    },
    "isActive": {
      "label": "Is active"
    }
  },
  "dateFields": {
    "time": "time",
    "createdAt": "createdAt"
  },
  "filterable": {
    "employeeId": "objectId",
    "shiftId": "objectId",
    "attendanceId": "objectId",
    "time": "date",
    "logType": "string",
    "deviceId": "objectId",
    "skipAutoAttendance": "boolean",
    "offshift": "boolean",
    "companyId": "objectId",
    "isActive": "boolean",
    "createdAt": "date"
  },
  "scopeable": {
    "owner": "employeeId"
  },
  "companyConfined": true,
  "employeeOwned": true
},
  "shift-requests": {
  "label": "Shift Request",
  "model": "ShiftRequest",
  menuUrl: "/shift-request",
  "aggregatable": {},
  "groupable": {
    "status": {
      "label": "Status"
    },
    "shiftTypeId": {
      "label": "Shift type",
      "lookup": {
        "from": "shifttypes",
        "labelField": "shiftTypeName"
      }
    },
    "companyId": {
      "label": "Company",
      "lookup": {
        "from": "companies",
        "labelField": "companyName"
      }
    }
  },
  "dateFields": {
    "fromDate": "fromDate",
    "toDate": "toDate",
    "createdAt": "createdAt"
  },
  "filterable": {
    "employeeId": "objectId",
    "shiftTypeId": "objectId",
    "companyId": "objectId",
    "approverId": "objectId",
    "status": "string",
    "fromDate": "date",
    "toDate": "date",
    "createdAt": "date"
  },
  "scopeable": {
    "owner": "employeeId"
  }
},
  "attendance-requests": {
  "label": "Attendance Request",
  "model": "AttendanceRequest",
  menuUrl: "/attendance-request",
  "aggregatable": {},
  "groupable": {
    "status": {
      "label": "Status"
    },
    "reason": {
      "label": "Reason"
    },
    "companyId": {
      "label": "Company",
      "lookup": {
        "from": "companies",
        "labelField": "companyName"
      }
    }
  },
  "dateFields": {
    "fromDate": "fromDate",
    "toDate": "toDate",
    "createdAt": "createdAt"
  },
  "filterable": {
    "employeeId": "objectId",
    "companyId": "objectId",
    "status": "string",
    "reason": "string",
    "fromDate": "date",
    "toDate": "date",
    "createdAt": "date"
  },
  "scopeable": {
    "owner": "employeeId"
  }
},

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

  // ADR-024 (Leaves, HRMS module 8 foundation). No entry for holidays[]/
  // leavePolicyDetails[]/earnedLeaveSchedule[] — embedded children, covered
  // by their parent's entry the same way every other module's has been.
  "leave-types": {
    label: "Leave Types",
    model: "LeaveType",
    aggregatable: { maxLeavesAllowed: "Max leaves allowed" },
    groupable: {
      isLwp: { label: "Leave without pay" },
      isEarnedLeave: { label: "Earned leave" },
      isCarryForward: { label: "Carry forward" },
      isActive: { label: "Active status" },
    },
    dateFields: { createdAt: "Created" },
    filterable: {
      leaveTypeName: "string",
      isLwp: "boolean",
      isEarnedLeave: "boolean",
      isCompensatory: "boolean",
      isActive: "boolean",
      createdAt: "date",
    },
  },

  "leave-periods": {
    label: "Leave Periods",
    model: "LeavePeriod",
    aggregatable: {},
    groupable: {
      companyId: { label: "Company", lookup: { from: "companies", labelField: "companyName" } },
      isActive: { label: "Active status" },
    },
    dateFields: { fromDate: "From date", toDate: "To date", createdAt: "Created" },
    filterable: {
      companyId: "objectId",
      fromDate: "date",
      toDate: "date",
      isActive: "boolean",
      createdAt: "date",
    },
  },

  "holiday-lists": {
    label: "Holiday Lists",
    model: "HolidayList",
    aggregatable: { totalHolidays: "Total holidays" },
    groupable: {
      companyId: { label: "Company", lookup: { from: "companies", labelField: "companyName" } },
      isActive: { label: "Active status" },
    },
    dateFields: { fromDate: "From date", toDate: "To date", createdAt: "Created" },
    filterable: {
      holidayListName: "string",
      companyId: "objectId",
      isActive: "boolean",
      createdAt: "date",
    },
  },

  "holiday-list-assignments": {
    label: "Holiday List Assignments",
    model: "HolidayListAssignment",
    aggregatable: {},
    groupable: {
      applicableFor: { label: "Applicable for" },
      holidayListId: { label: "Holiday List", lookup: { from: "holidaylists", labelField: "holidayListName" } },
      isActive: { label: "Active status" },
    },
    dateFields: { fromDate: "From date", createdAt: "Created" },
    filterable: {
      holidayListId: "objectId",
      applicableFor: "string",
      employeeId: "objectId",
      companyId: "objectId",
      fromDate: "date",
      isActive: "boolean",
      createdAt: "date",
    },
  },

  "leave-policies": {
    label: "Leave Policies",
    model: "LeavePolicy",
    aggregatable: {},
    groupable: { isActive: { label: "Active status" } },
    dateFields: { createdAt: "Created" },
    filterable: { title: "string", isActive: "boolean", createdAt: "date" },
  },

  "leave-policy-assignments": {
    label: "Leave Policy Assignments",
    model: "LeavePolicyAssignment",
    aggregatable: {},
    groupable: {
      status: { label: "Status" },
      leavePolicyId: { label: "Leave Policy", lookup: { from: "leavepolicies", labelField: "title" } },
      companyId: { label: "Company", lookup: { from: "companies", labelField: "companyName" } },
    },
    dateFields: { effectiveFrom: "Effective from", effectiveTo: "Effective to", createdAt: "Created" },
    filterable: {
      employeeId: "objectId",
      leavePolicyId: "objectId",
      leavePeriodId: "objectId",
      companyId: "objectId",
      status: "string",
      createdAt: "date",
    },
    scopeable: { owner: "employeeId" },
  },

  "leave-allocations": {
    label: "Leave Allocations",
    model: "LeaveAllocation",
    aggregatable: {
      newLeavesAllocated: "New leaves allocated",
      totalLeavesAllocated: "Total leaves allocated (cached)",
    },
    groupable: {
      leaveTypeId: { label: "Leave Type", lookup: { from: "leavetypes", labelField: "leaveTypeName" } },
      status: { label: "Status" },
      companyId: { label: "Company", lookup: { from: "companies", labelField: "companyName" } },
    },
    dateFields: { fromDate: "From date", toDate: "To date", createdAt: "Created" },
    filterable: {
      employeeId: "objectId",
      leaveTypeId: "objectId",
      companyId: "objectId",
      leavePolicyAssignmentId: "objectId",
      status: "string",
      createdAt: "date",
    },
    scopeable: { owner: "employeeId" },
  },

  "leave-ledger-entries": {
    label: "Leave Ledger Entries",
    model: "LeaveLedgerEntry",
    aggregatable: { leaves: "Leaves (signed)" },
    groupable: {
      transactionType: { label: "Transaction type" },
      leaveTypeId: { label: "Leave Type", lookup: { from: "leavetypes", labelField: "leaveTypeName" } },
      isExpired: { label: "Expired" },
      isCarryForward: { label: "Carry forward" },
    },
    dateFields: { fromDate: "From date", toDate: "To date", createdAt: "Created" },
    filterable: {
      employeeId: "objectId",
      leaveTypeId: "objectId",
      transactionType: "string",
      companyId: "objectId",
      isCarryForward: "boolean",
      isExpired: "boolean",
      createdAt: "date",
    },
    scopeable: { owner: "employeeId" },
  },

  attendances: {
    companyConfined: true, employeeOwned: true, menuUrl: "/attendance",
    label: "Attendance",
    model: "Attendance",
    aggregatable: { workingHours: "Working hours", standardWorkingHours: "Standard hours", actualOvertimeDuration: "Overtime hours" },
    groupable: {
      shiftId: { label: "Shift", lookup: { from: "shifttypes", labelField: "shiftTypeName" } },
      departmentId: { label: "Department", lookup: { from: "departments", labelField: "departmentName" } },
      status: { label: "Status" },
      companyId: { label: "Company", lookup: { from: "companies", labelField: "companyName" } },
    },
    dateFields: { inTime: "In time", outTime: "Out time", attendanceDate: "Attendance date", createdAt: "Created" },
    filterable: {
      departmentId: "objectId",
      shiftId: "objectId",
      workingHours: "number",
      standardWorkingHours: "number",
      actualOvertimeDuration: "number",
      lateEntry: "boolean",
      earlyExit: "boolean",
      inTime: "date",
      outTime: "date",
      halfDayStatus: "string",

      employeeId: "objectId",
      companyId: "objectId",
      status: "string",
      attendanceDate: "date",
      isActive: "boolean",
      createdAt: "date",
    },
    scopeable: { owner: "employeeId" },
  },

  // ADR-024 (Leaves, HRMS module 8 — transactional fork, module complete).
  "leave-adjustments": {
    label: "Leave Adjustments",
    model: "LeaveAdjustment",
    aggregatable: { leavesToAdjust: "Leaves adjusted" },
    groupable: {
      adjustmentType: { label: "Adjustment type" },
      leaveTypeId: { label: "Leave Type", lookup: { from: "leavetypes", labelField: "leaveTypeName" } },
      companyId: { label: "Company", lookup: { from: "companies", labelField: "companyName" } },
    },
    dateFields: { postingDate: "Posting date", createdAt: "Created" },
    filterable: {
      employeeId: "objectId",
      leaveTypeId: "objectId",
      leaveAllocationId: "objectId",
      adjustmentType: "string",
      companyId: "objectId",
      createdAt: "date",
    },
    scopeable: { owner: "employeeId" },
  },

  "compensatory-leave-requests": {
    label: "Compensatory Leave Requests",
    model: "CompensatoryLeaveRequest",
    aggregatable: {},
    groupable: {
      status: { label: "Status" },
      leaveTypeId: { label: "Leave Type", lookup: { from: "leavetypes", labelField: "leaveTypeName" } },
      companyId: { label: "Company", lookup: { from: "companies", labelField: "companyName" } },
    },
    dateFields: { workFromDate: "Work from date", workEndDate: "Work end date", createdAt: "Created" },
    filterable: {
      employeeId: "objectId",
      leaveTypeId: "objectId",
      status: "string",
      companyId: "objectId",
      workFromDate: "date",
      workEndDate: "date",
      createdAt: "date",
    },
    scopeable: { owner: "employeeId" },
  },

  // The module's centerpiece — groupable by status/leaveTypeId/companyId,
  // dateField fromDate, so leave-usage charts can actually be built.
  "leave-applications": {
    label: "Leave Applications",
    model: "LeaveApplication",
    aggregatable: { totalLeaveDays: "Total leave days" },
    groupable: {
      status: { label: "Status" },
      leaveTypeId: { label: "Leave Type", lookup: { from: "leavetypes", labelField: "leaveTypeName" } },
      companyId: { label: "Company", lookup: { from: "companies", labelField: "companyName" } },
    },
    dateFields: { fromDate: "From date", toDate: "To date", createdAt: "Created" },
    filterable: {
      employeeId: "objectId",
      leaveTypeId: "objectId",
      status: "string",
      companyId: "objectId",
      leaveApproverId: "objectId",
      fromDate: "date",
      toDate: "date",
      createdAt: "date",
    },
    scopeable: { owner: "employeeId" },
  },

  "leave-encashments": {
    label: "Leave Encashments",
    model: "LeaveEncashment",
    aggregatable: {
      encashmentDays: "Encashment days",
      encashmentAmount: "Encashment amount",
    },
    groupable: {
      status: { label: "Status" },
      leaveTypeId: { label: "Leave Type", lookup: { from: "leavetypes", labelField: "leaveTypeName" } },
      companyId: { label: "Company", lookup: { from: "companies", labelField: "companyName" } },
    },
    dateFields: { encashmentDate: "Encashment date", createdAt: "Created" },
    filterable: {
      employeeId: "objectId",
      leaveTypeId: "objectId",
      leaveAllocationId: "objectId",
      status: "string",
      companyId: "objectId",
      encashmentDate: "date",
      createdAt: "date",
    },
    scopeable: { owner: "employeeId" },
  },

  // No entry for blockDates[]/allowList[] — embedded children, covered by
  // their parent's entry the same way every other module's has been.
  "leave-block-lists": {
    label: "Leave Block Lists",
    model: "LeaveBlockList",
    aggregatable: {},
    groupable: {
      appliesToAllDepartments: { label: "Applies to all departments" },
      departmentId: { label: "Department", lookup: { from: "departments", labelField: "departmentName" } },
      companyId: { label: "Company", lookup: { from: "companies", labelField: "companyName" } },
      isActive: { label: "Active status" },
    },
    dateFields: { createdAt: "Created" },
    filterable: {
      leaveBlockListName: "string",
      companyId: "objectId",
      departmentId: "objectId",
      leaveTypeId: "objectId",
      appliesToAllDepartments: "boolean",
      isActive: "boolean",
      createdAt: "date",
    },
  },

  // ADR-026 (Payroll — Structure & Assignment). Company-confined via
  // attendanceScope(req, false) the same way the controller itself is —
  // this module has no self-service/employee-owned dimension at all.
  "salary-components": {
    label: "Salary Component",
    model: "SalaryComponent",
    menuUrl: "/salary-component",
    aggregatable: {},
    groupable: {
      type: { label: "Type" },
      companyId: { label: "Company", lookup: { from: "companies", labelField: "companyName" } },
      isActive: { label: "Is active" },
    },
    dateFields: { createdAt: "Created" },
    filterable: {
      salaryComponentName: "string",
      abbreviation: "string",
      type: "string",
      companyId: "objectId",
      isActive: "boolean",
      createdAt: "date",
    },
    scopeable: {},
    companyConfined: true,
    employeeOwned: false,
  },
  "salary-structures": {
    label: "Salary Structure",
    model: "SalaryStructure",
    menuUrl: "/salary-structure",
    aggregatable: { totalEarning: "Total earning", totalDeduction: "Total deduction", netPay: "Net pay" },
    groupable: {
      payrollFrequency: { label: "Payroll frequency" },
      companyId: { label: "Company", lookup: { from: "companies", labelField: "companyName" } },
      isActive: { label: "Is active" },
    },
    dateFields: { createdAt: "Created" },
    filterable: {
      companyId: "objectId",
      payrollFrequency: "string",
      isActive: "boolean",
      createdAt: "date",
    },
    scopeable: {},
    companyConfined: true,
    employeeOwned: false,
  },
  "salary-structure-assignments": {
    label: "Salary Structure Assignment",
    model: "SalaryStructureAssignment",
    menuUrl: "/salary-structure-assignment",
    aggregatable: { ctc: "CTC", annualGrossEarning: "Annual gross earning", base: "Base", variable: "Variable" },
    groupable: {
      companyId: { label: "Company", lookup: { from: "companies", labelField: "companyName" } },
      salaryStructureId: { label: "Salary Structure", lookup: { from: "salarystructures", labelField: "currency" } },
    },
    dateFields: { fromDate: "From date", createdAt: "Created" },
    filterable: {
      employeeId: "objectId",
      salaryStructureId: "objectId",
      fromDate: "date",
      companyId: "objectId",
      createdAt: "date",
    },
    scopeable: {},
    companyConfined: true,
    employeeOwned: false,
  },

  // ADR-027 (Payroll — Run, foundation half). Same company-confined,
  // no-self-service shape as module 10's three sources above.
  "payroll-periods": {
    label: "Payroll Period",
    model: "PayrollPeriod",
    menuUrl: "/payroll-period",
    aggregatable: {},
    groupable: {
      companyId: { label: "Company", lookup: { from: "companies", labelField: "companyName" } },
      isActive: { label: "Is active" },
    },
    dateFields: { startDate: "Start date", endDate: "End date", createdAt: "Created" },
    filterable: {
      companyId: "objectId", startDate: "date", endDate: "date", isActive: "boolean", createdAt: "date",
    },
    scopeable: {},
    companyConfined: true,
    employeeOwned: false,
  },
  "payroll-entries": {
    label: "Payroll Entries", model: "PayrollEntry", menuUrl: "/payroll-entry",
    aggregatable: {},
    groupable: { status: { label: "Status" }, payrollFrequency: { label: "Frequency" }, companyId: { label: "Company", lookup: { from: "companies", labelField: "companyName" } } },
    dateFields: { startDate: "Start date", endDate: "End date", createdAt: "Created" },
    filterable: { companyId: "objectId", startDate: "date", endDate: "date", payrollFrequency: "string", status: "string", createdAt: "date" },
    scopeable: {}, companyConfined: true, employeeOwned: false,
  },
  "salary-withholdings": {
    label: "Salary Withholdings", model: "SalaryWithholding", menuUrl: "/salary-withholding",
    aggregatable: { numberOfWithholdingCycles: { label: "Cycles" } },
    groupable: {
      status: { label: "Status" },
      payrollFrequency: { label: "Frequency" },
      companyId: { label: "Company", lookup: { from: "companies", labelField: "companyName" } },
      employeeId: { label: "Employee", lookup: { from: "employees", labelField: "employeeName" } },
    },
    dateFields: { fromDate: "From date", createdAt: "Created" },
    filterable: { employeeId: "objectId", companyId: "objectId", fromDate: "date", payrollFrequency: "string", numberOfWithholdingCycles: "number", status: "string", createdAt: "date" },
    scopeable: {}, companyConfined: true, employeeOwned: false,
  },
  "salary-slips": {
    label: "Salary Slip",
    model: "SalarySlip",
    menuUrl: "/salary-slip",
    aggregatable: {
      grossPay: "Gross pay", totalDeduction: "Total deduction", netPay: "Net pay",
      paymentDays: "Payment days", lwpDays: "LWP days", absentDays: "Absent days",
    },
    groupable: {
      status: { label: "Status" },
      companyId: { label: "Company", lookup: { from: "companies", labelField: "companyName" } },
      employeeId: { label: "Employee", lookup: { from: "employees", labelField: "employeeName" } },
    },
    dateFields: { startDate: "Start date", endDate: "End date", createdAt: "Created" },
    filterable: {
      employeeId: "objectId", companyId: "objectId", startDate: "date", endDate: "date",
      status: "string", createdAt: "date",
    },
    scopeable: {},
    companyConfined: true,
    employeeOwned: false,
  },

  // ADR-028 (Payroll — Adjustments & Incentives, module 12).
  "additional-salaries": {
    label: "Additional Salary",
    model: "AdditionalSalary",
    menuUrl: "/additional-salary",
    aggregatable: { amount: "Amount" },
    groupable: {
      type: { label: "Type" },
      status: { label: "Status" },
      companyId: { label: "Company", lookup: { from: "companies", labelField: "companyName" } },
      employeeId: { label: "Employee", lookup: { from: "employees", labelField: "employeeName" } },
    },
    dateFields: { payrollDate: "Payroll date", fromDate: "From date", toDate: "To date", createdAt: "Created" },
    filterable: {
      employeeId: "objectId", companyId: "objectId", salaryComponentId: "objectId",
      type: "string", amount: "number", isRecurring: "boolean", fromDate: "date",
      toDate: "date", payrollDate: "date", overwriteSalaryStructureAmount: "boolean",
      status: "string", refDoctype: "string", createdAt: "date",
    },
    scopeable: {},
    companyConfined: true,
    employeeOwned: false,
  },
  "arrears": {
    label: "Arrear",
    model: "Arrear",
    menuUrl: "/arrear",
    aggregatable: {},
    groupable: {
      status: { label: "Status" },
      companyId: { label: "Company", lookup: { from: "companies", labelField: "companyName" } },
      employeeId: { label: "Employee", lookup: { from: "employees", labelField: "employeeName" } },
    },
    dateFields: { payrollDate: "Payroll date", startDate: "Start date", endDate: "End date", createdAt: "Created" },
    filterable: {
      employeeId: "objectId", companyId: "objectId", startDate: "date", endDate: "date",
      payrollDate: "date", status: "string", createdAt: "date",
    },
    scopeable: {},
    companyConfined: true,
    employeeOwned: false,
  },
  "retention-bonuses": {
    label: "Retention Bonus",
    model: "RetentionBonus",
    menuUrl: "/retention-bonus",
    aggregatable: { bonusAmount: "Bonus amount" },
    groupable: {
      status: { label: "Status" },
      companyId: { label: "Company", lookup: { from: "companies", labelField: "companyName" } },
      employeeId: { label: "Employee", lookup: { from: "employees", labelField: "employeeName" } },
    },
    dateFields: { bonusPaymentDate: "Bonus payment date", createdAt: "Created" },
    filterable: {
      employeeId: "objectId", companyId: "objectId", salaryComponentId: "objectId",
      bonusAmount: "number", bonusPaymentDate: "date", status: "string", createdAt: "date",
    },
    scopeable: {},
    companyConfined: true,
    employeeOwned: false,
  },
  "employee-incentives": {
    label: "Employee Incentive",
    model: "EmployeeIncentive",
    menuUrl: "/employee-incentive",
    aggregatable: { incentiveAmount: "Incentive amount" },
    groupable: {
      status: { label: "Status" },
      companyId: { label: "Company", lookup: { from: "companies", labelField: "companyName" } },
      employeeId: { label: "Employee", lookup: { from: "employees", labelField: "employeeName" } },
    },
    dateFields: { incentiveDate: "Incentive date", createdAt: "Created" },
    filterable: {
      employeeId: "objectId", companyId: "objectId", salaryComponentId: "objectId",
      incentiveAmount: "number", incentiveDate: "date", status: "string", createdAt: "date",
    },
    scopeable: {},
    companyConfined: true,
    employeeOwned: false,
  },
  "employee-other-incomes": {
    label: "Employee Other Income",
    model: "EmployeeOtherIncome",
    menuUrl: "/employee-other-income",
    aggregatable: { amount: "Amount" },
    groupable: {
      source: { label: "Source" },
      status: { label: "Status" },
      companyId: { label: "Company", lookup: { from: "companies", labelField: "companyName" } },
      employeeId: { label: "Employee", lookup: { from: "employees", labelField: "employeeName" } },
    },
    dateFields: { date: "Date", createdAt: "Created" },
    filterable: {
      employeeId: "objectId", companyId: "objectId", payrollPeriodId: "objectId",
      source: "string", amount: "number", date: "date", status: "string", createdAt: "date",
    },
    scopeable: { owner: "employeeId" },
    companyConfined: true,
    employeeOwned: true,
  },
  "employee-benefit-applications": {
    label: "Employee Benefit Application",
    model: "EmployeeBenefitApplication",
    menuUrl: "/employee-benefit-application",
    aggregatable: {
      totalAmount: "Total elected amount",
      remainingBenefit: "Remaining benefit",
      maxBenefits: "Max benefits ceiling",
    },
    groupable: {
      status: { label: "Status" },
      companyId: { label: "Company", lookup: { from: "companies", labelField: "companyName" } },
      employeeId: { label: "Employee", lookup: { from: "employees", labelField: "employeeName" } },
      payrollPeriodId: { label: "Payroll Period", lookup: { from: "payrollperiods", labelField: "startDate" } },
    },
    dateFields: { date: "Date", createdAt: "Created" },
    filterable: {
      employeeId: "objectId",
      companyId: "objectId",
      payrollPeriodId: "objectId",
      currency: "string",
      maxBenefits: "number",
      totalAmount: "number",
      remainingBenefit: "number",
      status: "string",
      date: "date",
      createdAt: "date",
    },
    scopeable: { owner: "employeeId" },
    companyConfined: true,
    employeeOwned: true,
  },
  "employee-benefit-claims": {
    label: "Employee Benefit Claim",
    model: "EmployeeBenefitClaim",
    menuUrl: "/employee-benefit-claim",
    aggregatable: { claimedAmount: "Claimed amount" },
    groupable: {
      status: { label: "Status" },
      companyId: { label: "Company", lookup: { from: "companies", labelField: "companyName" } },
      employeeId: { label: "Employee", lookup: { from: "employees", labelField: "employeeName" } },
      salaryComponentId: { label: "Salary Component", lookup: { from: "salarycomponents", labelField: "name" } },
    },
    dateFields: { claimDate: "Claim date", createdAt: "Created" },
    filterable: {
      employeeId: "objectId",
      companyId: "objectId",
      salaryComponentId: "objectId",
      claimDate: "date",
      claimedAmount: "number",
      status: "string",
      additionalSalaryId: "objectId",
      createdAt: "date",
    },
    scopeable: { owner: "employeeId" },
    companyConfined: true,
    employeeOwned: true,
  },
  "employee-benefit-ledgers": {
    label: "Employee Benefit Ledger",
    model: "EmployeeBenefitLedger",
    menuUrl: "/employee-benefit-ledger",
    aggregatable: { amount: "Amount", yearlyBenefit: "Yearly benefit" },
    groupable: {
      transactionType: { label: "Transaction Type" },
      companyId: { label: "Company", lookup: { from: "companies", labelField: "companyName" } },
      employeeId: { label: "Employee", lookup: { from: "employees", labelField: "employeeName" } },
      salaryComponentId: { label: "Salary Component", lookup: { from: "salarycomponents", labelField: "name" } },
      refDoctype: { label: "Reference Doctype" },
    },
    dateFields: { postingDate: "Posting date", createdAt: "Created" },
    filterable: {
      postingDate: "date",
      employeeId: "objectId",
      companyId: "objectId",
      salaryComponentId: "objectId",
      payrollPeriodId: "objectId",
      transactionType: "string",
      amount: "number",
      yearlyBenefit: "number",
      flexibleBenefit: "boolean",
      salarySlipId: "objectId",
      refDoctype: "string",
      createdAt: "date",
    },
    scopeable: { owner: "employeeId" },
    companyConfined: true,
    employeeOwned: true,
  },
  "payroll-corrections": {
    label: "Payroll Correction",
    model: "PayrollCorrection",
    menuUrl: "/payroll-correction",
    aggregatable: { daysToReverse: "Days reversed" },
    groupable: {
      status: { label: "Status" },
      companyId: { label: "Company", lookup: { from: "companies", labelField: "companyName" } },
      employeeId: { label: "Employee", lookup: { from: "employees", labelField: "employeeName" } },
    },
    dateFields: { createdAt: "Created" },
    filterable: {
      salarySlipId: "objectId",
      employeeId: "objectId",
      companyId: "objectId",
      payrollPeriodId: "objectId",
      daysToReverse: "number",
      status: "string",
      createdAt: "date",
    },
    scopeable: {},
    companyConfined: true,
    employeeOwned: false,
  },
  // ADR-030 (module 14, feat/tax-exemptions).
  "income-tax-slabs": {
    label: "Income Tax Slab",
    model: "IncomeTaxSlab",
    menuUrl: "/income-tax-slab",
    aggregatable: { standardDeduction: "Standard deduction", taxReliefLimit: "Tax relief limit" },
    groupable: {
      allowTaxExemption: { label: "Allows tax exemption" },
      disabled: { label: "Disabled" },
      currency: { label: "Currency" },
      companyId: { label: "Company", lookup: { from: "companies", labelField: "companyName" } },
    },
    dateFields: { effectiveFromDate: "Effective from", createdAt: "Created" },
    filterable: {
      companyId: "objectId",
      name: "string",
      effectiveFromDate: "date",
      allowTaxExemption: "boolean",
      standardDeduction: "number",
      taxReliefLimit: "number",
      disabled: "boolean",
      createdAt: "date",
    },
    scopeable: {},
    companyConfined: true,
    employeeOwned: false,
  },
  "employee-tax-exemption-categories": {
    label: "Employee Tax Exemption Category",
    model: "EmployeeTaxExemptionCategory",
    menuUrl: "/employee-tax-exemption-category",
    aggregatable: { maxAmount: "Max amount" },
    groupable: {
      isActive: { label: "Active status" },
    },
    dateFields: { createdAt: "Created" },
    filterable: {
      name: "string",
      maxAmount: "number",
      isActive: "boolean",
      createdAt: "date",
    },
    scopeable: {},
    companyConfined: false,
    employeeOwned: false,
  },
  "employee-tax-exemption-sub-categories": {
    label: "Employee Tax Exemption Sub Category",
    model: "EmployeeTaxExemptionSubCategory",
    menuUrl: "/employee-tax-exemption-sub-category",
    aggregatable: { maxAmount: "Max amount" },
    groupable: {
      isActive: { label: "Active status" },
      exemptionCategoryId: { label: "Exemption Category", lookup: { from: "employeetaxexemptioncategories", labelField: "name" } },
    },
    dateFields: { createdAt: "Created" },
    filterable: {
      name: "string",
      exemptionCategoryId: "objectId",
      maxAmount: "number",
      isActive: "boolean",
      createdAt: "date",
    },
    scopeable: {},
    companyConfined: false,
    employeeOwned: false,
  },
  "employee-tax-exemption-declarations": {
    label: "Employee Tax Exemption Declaration",
    model: "EmployeeTaxExemptionDeclaration",
    menuUrl: "/employee-tax-exemption-declaration",
    aggregatable: { totalDeclaredAmount: "Total declared amount", totalExemptionAmount: "Total exemption amount" },
    groupable: {
      status: { label: "Status" },
      companyId: { label: "Company", lookup: { from: "companies", labelField: "companyName" } },
      employeeId: { label: "Employee", lookup: { from: "employees", labelField: "employeeName" } },
      payrollPeriodId: { label: "Payroll Period", lookup: { from: "payrollperiods", labelField: "startDate" } },
    },
    dateFields: { createdAt: "Created" },
    filterable: {
      employeeId: "objectId",
      companyId: "objectId",
      payrollPeriodId: "objectId",
      status: "string",
      totalDeclaredAmount: "number",
      totalExemptionAmount: "number",
      createdAt: "date",
    },
    scopeable: { owner: "employeeId" },
    companyConfined: true,
    employeeOwned: true,
  },
  "employee-tax-exemption-proof-submissions": {
    label: "Employee Tax Exemption Proof Submission",
    model: "EmployeeTaxExemptionProofSubmission",
    menuUrl: "/employee-tax-exemption-proof-submission",
    aggregatable: { totalActualAmount: "Total actual amount", exemptionAmount: "Exemption amount" },
    groupable: {
      status: { label: "Status" },
      companyId: { label: "Company", lookup: { from: "companies", labelField: "companyName" } },
      employeeId: { label: "Employee", lookup: { from: "employees", labelField: "employeeName" } },
      payrollPeriodId: { label: "Payroll Period", lookup: { from: "payrollperiods", labelField: "startDate" } },
    },
    dateFields: { submissionDate: "Submission date", createdAt: "Created" },
    filterable: {
      employeeId: "objectId",
      companyId: "objectId",
      payrollPeriodId: "objectId",
      submissionDate: "date",
      status: "string",
      totalActualAmount: "number",
      exemptionAmount: "number",
      createdAt: "date",
    },
    scopeable: { owner: "employeeId" },
    companyConfined: true,
    employeeOwned: true,
  },
});
