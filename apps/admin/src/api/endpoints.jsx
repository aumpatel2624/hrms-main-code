/**
 * API Endpoint Constants
 * All API endpoints defined in one place for easy maintenance
 */

// API Version prefix
const V1 = "/api/v1";

export const ENDPOINTS = {
    // Bug fix (found during module 9's second/transactional fork verify):
    // these six were missing the `${V1}` prefix every other endpoint group
    // uses, and the admin axios client's baseURL is the bare host (no
    // `/api/v1` of its own) — every foundation Shift & Attendance screen was
    // therefore calling a 404 (e.g. `/shift-types` instead of
    // `/api/v1/shift-types`). Filed as a GitHub issue and fixed here.
    SHIFT_TYPES: { BASE: `${V1}/shift-types`, SEARCH: `${V1}/shift-types/search`, BY_ID: (id) => `${V1}/shift-types/${id}` },
    SHIFT_LOCATIONS: { BASE: `${V1}/shift-locations`, SEARCH: `${V1}/shift-locations/search`, BY_ID: (id) => `${V1}/shift-locations/${id}` },
    SHIFT_ASSIGNMENTS: { BASE: `${V1}/shift-assignments`, SEARCH: `${V1}/shift-assignments/search`, BY_ID: (id) => `${V1}/shift-assignments/${id}` },
    SHIFT_SCHEDULES: { BASE: `${V1}/shift-schedules`, SEARCH: `${V1}/shift-schedules/search`, BY_ID: (id) => `${V1}/shift-schedules/${id}` },
    SHIFT_SCHEDULE_ASSIGNMENTS: { BASE: `${V1}/shift-schedule-assignments`, SEARCH: `${V1}/shift-schedule-assignments/search`, BY_ID: (id) => `${V1}/shift-schedule-assignments/${id}` },
    EMPLOYEE_CHECKINS: { BASE: `${V1}/employee-checkins`, SEARCH: `${V1}/employee-checkins/search`, BY_ID: (id) => `${V1}/employee-checkins/${id}` },
    SHIFT_REQUESTS: {
        BASE: `${V1}/shift-requests`, SEARCH: `${V1}/shift-requests/search`, BY_ID: (id) => `${V1}/shift-requests/${id}`,
        APPROVE: (id) => `${V1}/shift-requests/${id}/approve`, REJECT: (id) => `${V1}/shift-requests/${id}/reject`,
    },
    ATTENDANCE_REQUESTS: {
        BASE: `${V1}/attendance-requests`, SEARCH: `${V1}/attendance-requests/search`, BY_ID: (id) => `${V1}/attendance-requests/${id}`,
        CANCEL: (id) => `${V1}/attendance-requests/${id}/cancel`,
    },
    SHIFT_ASSIGNMENT_TOOL: {
        BULK_ASSIGN: `${V1}/shift-assignment-tool/bulk-assign`,
        BULK_ASSIGN_SCHEDULE: `${V1}/shift-assignment-tool/bulk-assign-schedule`,
        PROCESS_REQUESTS: `${V1}/shift-assignment-tool/process-requests`,
    },
    // ADR-026 (Payroll — Structure & Assignment).
    SALARY_COMPONENTS: { BASE: `${V1}/salary-components`, SEARCH: `${V1}/salary-components/search`, BY_ID: (id) => `${V1}/salary-components/${id}` },
    SALARY_STRUCTURES: { BASE: `${V1}/salary-structures`, SEARCH: `${V1}/salary-structures/search`, BY_ID: (id) => `${V1}/salary-structures/${id}` },
    SALARY_STRUCTURE_ASSIGNMENTS: { BASE: `${V1}/salary-structure-assignments`, SEARCH: `${V1}/salary-structure-assignments/search`, BY_ID: (id) => `${V1}/salary-structure-assignments/${id}` },
    BULK_SALARY_STRUCTURE_ASSIGNMENT: {
        ELIGIBLE_EMPLOYEES: `${V1}/payroll/bulk-salary-structure-assignment/eligible-employees`,
        ASSIGN: `${V1}/payroll/bulk-salary-structure-assignment/assign`,
    },
    // ADR-027 (Payroll — Run, foundation half).
    PAYROLL_ENTRIES: { BASE: `${V1}/payroll-entries`, SEARCH: `${V1}/payroll-entries/search`, BY_ID: (id) => `${V1}/payroll-entries/${id}`,
        CREATE_SLIPS: (id) => `${V1}/payroll-entries/${id}/create-slips`, SUBMIT_SLIPS: (id) => `${V1}/payroll-entries/${id}/submit-slips`, CANCEL: (id) => `${V1}/payroll-entries/${id}/cancel` },
    SALARY_WITHHOLDINGS: { BASE: `${V1}/salary-withholdings`, SEARCH: `${V1}/salary-withholdings/search`, BY_ID: (id) => `${V1}/salary-withholdings/${id}`,
        RELEASE_CYCLE: (id) => `${V1}/salary-withholdings/${id}/release-cycle`, RELEASE_ALL: (id) => `${V1}/salary-withholdings/${id}/release-all`, CANCEL: (id) => `${V1}/salary-withholdings/${id}/cancel` },
    PAYROLL_PERIODS: { BASE: `${V1}/payroll-periods`, SEARCH: `${V1}/payroll-periods/search`, BY_ID: (id) => `${V1}/payroll-periods/${id}` },
    PAYROLL_SETTINGS: { BASE: `${V1}/payroll-settings` },
    SALARY_SLIPS: {
        BASE: `${V1}/salary-slips`, SEARCH: `${V1}/salary-slips/search`, BY_ID: (id) => `${V1}/salary-slips/${id}`,
        SUBMIT: (id) => `${V1}/salary-slips/${id}/submit`, CANCEL: (id) => `${V1}/salary-slips/${id}/cancel`,
    },
    // ADR-028 (Payroll — Adjustments & Incentives).
    ADDITIONAL_SALARIES: {
        BASE: `${V1}/additional-salaries`,
        SEARCH: `${V1}/additional-salaries/search`,
        BY_ID: (id) => `${V1}/additional-salaries/${id}`,
        CANCEL: (id) => `${V1}/additional-salaries/${id}/cancel`,
    },
    ARREARS: {
        BASE: `${V1}/arrears`,
        SEARCH: `${V1}/arrears/search`,
        BY_ID: (id) => `${V1}/arrears/${id}`,
        CALCULATE: `${V1}/arrears/calculate`,
        SUBMIT: (id) => `${V1}/arrears/${id}/submit`,
        CANCEL: (id) => `${V1}/arrears/${id}/cancel`,
    },
    RETENTION_BONUSES: {
        BASE: `${V1}/retention-bonuses`,
        SEARCH: `${V1}/retention-bonuses/search`,
        BY_ID: (id) => `${V1}/retention-bonuses/${id}`,
        SUBMIT: (id) => `${V1}/retention-bonuses/${id}/submit`,
        CANCEL: (id) => `${V1}/retention-bonuses/${id}/cancel`,
    },
    EMPLOYEE_INCENTIVES: {
        BASE: `${V1}/employee-incentives`,
        SEARCH: `${V1}/employee-incentives/search`,
        BY_ID: (id) => `${V1}/employee-incentives/${id}`,
        SUBMIT: (id) => `${V1}/employee-incentives/${id}/submit`,
        CANCEL: (id) => `${V1}/employee-incentives/${id}/cancel`,
    },
    EMPLOYEE_OTHER_INCOMES: {
        BASE: `${V1}/employee-other-incomes`,
        SEARCH: `${V1}/employee-other-incomes/search`,
        BY_ID: (id) => `${V1}/employee-other-incomes/${id}`,
        SUBMIT: (id) => `${V1}/employee-other-incomes/${id}/submit`,
        CANCEL: (id) => `${V1}/employee-other-incomes/${id}/cancel`,
    },
    // ADR-029 (Payroll — Benefits).
    EMPLOYEE_BENEFIT_APPLICATIONS: {
        BASE: `${V1}/employee-benefit-applications`,
        SEARCH: `${V1}/employee-benefit-applications/search`,
        BY_ID: (id) => `${V1}/employee-benefit-applications/${id}`,
        SUBMIT: (id) => `${V1}/employee-benefit-applications/${id}/submit`,
        CANCEL: (id) => `${V1}/employee-benefit-applications/${id}/cancel`,
    },
    EMPLOYEE_BENEFIT_CLAIMS: {
        BASE: `${V1}/employee-benefit-claims`,
        SEARCH: `${V1}/employee-benefit-claims/search`,
        BY_ID: (id) => `${V1}/employee-benefit-claims/${id}`,
        CALCULATE_ELIGIBILITY: `${V1}/employee-benefit-claims/calculate-eligibility`,
        SUBMIT: (id) => `${V1}/employee-benefit-claims/${id}/submit`,
        CANCEL: (id) => `${V1}/employee-benefit-claims/${id}/cancel`,
    },
    EMPLOYEE_BENEFIT_LEDGERS: {
        BASE: `${V1}/employee-benefit-ledgers`,
        SEARCH: `${V1}/employee-benefit-ledgers/search`,
        BY_ID: (id) => `${V1}/employee-benefit-ledgers/${id}`,
    },
    PAYROLL_CORRECTIONS: {
        BASE: `${V1}/payroll-corrections`,
        SEARCH: `${V1}/payroll-corrections/search`,
        BY_ID: (id) => `${V1}/payroll-corrections/${id}`,
        CALCULATE_BREAKUP: `${V1}/payroll-corrections/calculate-breakup`,
        SUBMIT: (id) => `${V1}/payroll-corrections/${id}/submit`,
        CANCEL: (id) => `${V1}/payroll-corrections/${id}/cancel`,
    },
    // ADR-030 (Payroll — Tax & Exemptions).
    INCOME_TAX_SLABS: {
        BASE: `${V1}/income-tax-slabs`,
        SEARCH: `${V1}/income-tax-slabs/search`,
        BY_ID: (id) => `${V1}/income-tax-slabs/${id}`,
    },
    EMPLOYEE_TAX_EXEMPTION_CATEGORIES: {
        BASE: `${V1}/employee-tax-exemption-categories`,
        SEARCH: `${V1}/employee-tax-exemption-categories/search`,
        BY_ID: (id) => `${V1}/employee-tax-exemption-categories/${id}`,
    },
    EMPLOYEE_TAX_EXEMPTION_SUB_CATEGORIES: {
        BASE: `${V1}/employee-tax-exemption-sub-categories`,
        SEARCH: `${V1}/employee-tax-exemption-sub-categories/search`,
        BY_ID: (id) => `${V1}/employee-tax-exemption-sub-categories/${id}`,
    },
    EMPLOYEE_TAX_EXEMPTION_DECLARATIONS: {
        BASE: `${V1}/employee-tax-exemption-declarations`,
        SEARCH: `${V1}/employee-tax-exemption-declarations/search`,
        BY_ID: (id) => `${V1}/employee-tax-exemption-declarations/${id}`,
        SUBMIT: (id) => `${V1}/employee-tax-exemption-declarations/${id}/submit`,
        CANCEL: (id) => `${V1}/employee-tax-exemption-declarations/${id}/cancel`,
    },
    EMPLOYEE_TAX_EXEMPTION_PROOF_SUBMISSIONS: {
        BASE: `${V1}/employee-tax-exemption-proof-submissions`,
        SEARCH: `${V1}/employee-tax-exemption-proof-submissions/search`,
        BY_ID: (id) => `${V1}/employee-tax-exemption-proof-submissions/${id}`,
        SUBMIT: (id) => `${V1}/employee-tax-exemption-proof-submissions/${id}/submit`,
        CANCEL: (id) => `${V1}/employee-tax-exemption-proof-submissions/${id}/cancel`,
    },
    EMPLOYEE_ATTENDANCE_TOOL: {
        MARK: `${V1}/employee-attendance-tool/mark`,
        RESOLVE_HALF_DAY: `${V1}/employee-attendance-tool/resolve-half-day`,
    },
    // ADR-031 (Payroll — Gratuity).
    GRATUITY_RULES: {
        BASE: `${V1}/gratuity-rules`,
        SEARCH: `${V1}/gratuity-rules/search`,
        BY_ID: (id) => `${V1}/gratuity-rules/${id}`,
    },
    GRATUITIES: {
        BASE: `${V1}/gratuities`,
        SEARCH: `${V1}/gratuities/search`,
        BY_ID: (id) => `${V1}/gratuities/${id}`,
        SUBMIT: (id) => `${V1}/gratuities/${id}/submit`,
        CANCEL: (id) => `${V1}/gratuities/${id}/cancel`,
    },
    // ADR-032 (Performance, module 16, foundation half).
    KRAS: {
        BASE: `${V1}/kras`,
        SEARCH: `${V1}/kras/search`,
        BY_ID: (id) => `${V1}/kras/${id}`,
    },
    EMPLOYEE_FEEDBACK_CRITERIA: {
        BASE: `${V1}/employee-feedback-criteria`,
        SEARCH: `${V1}/employee-feedback-criteria/search`,
        BY_ID: (id) => `${V1}/employee-feedback-criteria/${id}`,
    },
    APPRAISAL_TEMPLATES: {
        BASE: `${V1}/appraisal-templates`,
        SEARCH: `${V1}/appraisal-templates/search`,
        BY_ID: (id) => `${V1}/appraisal-templates/${id}`,
    },
    APPRAISAL_CYCLES: {
        BASE: `${V1}/appraisal-cycles`,
        SEARCH: `${V1}/appraisal-cycles/search`,
        BY_ID: (id) => `${V1}/appraisal-cycles/${id}`,
        ELIGIBLE_EMPLOYEES: (id) => `${V1}/appraisal-cycles/${id}/eligible-employees`,
        CREATE_APPRAISALS: (id) => `${V1}/appraisal-cycles/${id}/create-appraisals`,
        COMPLETE: (id) => `${V1}/appraisal-cycles/${id}/complete`,
    },
    APPRAISALS: {
        BASE: `${V1}/appraisals`,
        SEARCH: `${V1}/appraisals/search`,
        BY_ID: (id) => `${V1}/appraisals/${id}`,
        SUBMIT: (id) => `${V1}/appraisals/${id}/submit`,
        CANCEL: (id) => `${V1}/appraisals/${id}/cancel`,
    },
    // ADR-032 (Performance, module 16, transactional half, feat/performance-goals).
    GOALS: {
        BASE: `${V1}/goals`,
        SEARCH: `${V1}/goals/search`,
        BY_ID: (id) => `${V1}/goals/${id}`,
        BULK_STATUS: `${V1}/goals/bulk-status`,
        ARCHIVE: (id) => `${V1}/goals/${id}/archive`,
        UNARCHIVE: (id) => `${V1}/goals/${id}/unarchive`,
        CLOSE: (id) => `${V1}/goals/${id}/close`,
        REOPEN: (id) => `${V1}/goals/${id}/reopen`,
    },
    EMPLOYEE_PERFORMANCE_FEEDBACKS: {
        BASE: `${V1}/employee-performance-feedbacks`,
        SEARCH: `${V1}/employee-performance-feedbacks/search`,
        BY_ID: (id) => `${V1}/employee-performance-feedbacks/${id}`,
        SUBMIT: (id) => `${V1}/employee-performance-feedbacks/${id}/submit`,
        CANCEL: (id) => `${V1}/employee-performance-feedbacks/${id}/cancel`,
    },

    // Auth endpoints
    AUTH: {
        LOGIN: `${V1}/auth/login`,
        ME: `${V1}/auth/me`,
        LOGOUT: `${V1}/auth/logout`,
        OTP_SEND: `${V1}/otp/send`,
        OTP_VERIFY: `${V1}/otp/verify`,
        PASSWORD_RESET: `${V1}/otp/reset-password`,
        LOGIN_STATUS_BY_EMAIL: `${V1}/auth/login-status-by-email`,
        LOGIN_STATUS: (userId) => `${V1}/auth/login-status/${userId}`,
        VERIFY_SESSION: `${V1}/auth/verify-session`
    },

    // Admin user endpoints
    ADMIN_USERS: {
        BASE: `${V1}/admin-users`,
        BY_ID: (id) => `${V1}/admin-users/${id}`,
        SEARCH: `${V1}/admin-users/search`,
        RESET_PASSWORD: (id) => `${V1}/admin-users/${id}/reset-password`,
    },

    // Department endpoints
    DEPARTMENTS: {
        BASE: `${V1}/departments`,
        BY_ID: (id) => `${V1}/departments/${id}`,
        SEARCH: `${V1}/departments/search`,
    },

    // Organization Setup endpoints (ADR-017)
    COMPANIES: {
        BASE: `${V1}/companies`,
        BY_ID: (id) => `${V1}/companies/${id}`,
        SEARCH: `${V1}/companies/search`,
    },
    BRANCHES: {
        BASE: `${V1}/branches`,
        BY_ID: (id) => `${V1}/branches/${id}`,
        SEARCH: `${V1}/branches/search`,
    },
    DESIGNATIONS: {
        BASE: `${V1}/designations`,
        BY_ID: (id) => `${V1}/designations/${id}`,
        SEARCH: `${V1}/designations/search`,
    },
    EMPLOYMENT_TYPES: {
        BASE: `${V1}/employment-types`,
        BY_ID: (id) => `${V1}/employment-types/${id}`,
        SEARCH: `${V1}/employment-types/search`,
    },
    EMPLOYEE_GRADES: {
        BASE: `${V1}/employee-grades`,
        BY_ID: (id) => `${V1}/employee-grades/${id}`,
        SEARCH: `${V1}/employee-grades/search`,
    },
    EMPLOYEE_HEALTH_INSURANCES: {
        BASE: `${V1}/employee-health-insurances`,
        BY_ID: (id) => `${V1}/employee-health-insurances/${id}`,
        SEARCH: `${V1}/employee-health-insurances/search`,
    },

    // Employee Records endpoints (ADR-018)
    EMPLOYEES: {
        BASE: `${V1}/employees`,
        BY_ID: (id) => `${V1}/employees/${id}`,
        SEARCH: `${V1}/employees/search`,
    },

    // Recruitment endpoints (ADR-019)
    JOB_REQUISITIONS: {
        BASE: `${V1}/job-requisitions`,
        BY_ID: (id) => `${V1}/job-requisitions/${id}`,
        SEARCH: `${V1}/job-requisitions/search`,
        MAKE_JOB_OPENING: (id) => `${V1}/job-requisitions/${id}/make-job-opening`,
    },
    JOB_OPENINGS: {
        BASE: `${V1}/job-openings`,
        BY_ID: (id) => `${V1}/job-openings/${id}`,
        SEARCH: `${V1}/job-openings/search`,
    },
    JOB_APPLICANTS: {
        BASE: `${V1}/job-applicants`,
        BY_ID: (id) => `${V1}/job-applicants/${id}`,
        SEARCH: `${V1}/job-applicants/search`,
    },
    JOB_APPLICANT_SOURCES: {
        BASE: `${V1}/job-applicant-sources`,
        BY_ID: (id) => `${V1}/job-applicant-sources/${id}`,
        SEARCH: `${V1}/job-applicant-sources/search`,
    },
    INTERVIEW_TYPES: {
        BASE: `${V1}/interview-types`,
        BY_ID: (id) => `${V1}/interview-types/${id}`,
        SEARCH: `${V1}/interview-types/search`,
    },
    INTERVIEWS: {
        BASE: `${V1}/interviews`,
        BY_ID: (id) => `${V1}/interviews/${id}`,
        SEARCH: `${V1}/interviews/search`,
        RESCHEDULE: (id) => `${V1}/interviews/${id}/reschedule`,
    },
    INTERVIEW_FEEDBACKS: {
        BASE: `${V1}/interview-feedbacks`,
        BY_ID: (id) => `${V1}/interview-feedbacks/${id}`,
        SEARCH: `${V1}/interview-feedbacks/search`,
    },
    JOB_OFFERS: {
        BASE: `${V1}/job-offers`,
        BY_ID: (id) => `${V1}/job-offers/${id}`,
        SEARCH: `${V1}/job-offers/search`,
        MAKE_EMPLOYEE: (id) => `${V1}/job-offers/${id}/make-employee`,
    },
    JOB_OFFER_TERM_TEMPLATES: {
        BASE: `${V1}/job-offer-term-templates`,
        BY_ID: (id) => `${V1}/job-offer-term-templates/${id}`,
        SEARCH: `${V1}/job-offer-term-templates/search`,
    },

    // Onboarding & Separation endpoints (ADR-020)
    EMPLOYEE_ONBOARDINGS: {
        BASE: `${V1}/employee-onboardings`,
        BY_ID: (id) => `${V1}/employee-onboardings/${id}`,
        SEARCH: `${V1}/employee-onboardings/search`,
        MARK_AS_COMPLETED: (id) => `${V1}/employee-onboardings/${id}/mark-as-completed`,
        MAKE_EMPLOYEE: (id) => `${V1}/employee-onboardings/${id}/make-employee`,
    },
    EMPLOYEE_ONBOARDING_TEMPLATES: {
        BASE: `${V1}/employee-onboarding-templates`,
        BY_ID: (id) => `${V1}/employee-onboarding-templates/${id}`,
        SEARCH: `${V1}/employee-onboarding-templates/search`,
    },
    EMPLOYEE_SEPARATIONS: {
        BASE: `${V1}/employee-separations`,
        BY_ID: (id) => `${V1}/employee-separations/${id}`,
        SEARCH: `${V1}/employee-separations/search`,
    },
    EMPLOYEE_SEPARATION_TEMPLATES: {
        BASE: `${V1}/employee-separation-templates`,
        BY_ID: (id) => `${V1}/employee-separation-templates/${id}`,
        SEARCH: `${V1}/employee-separation-templates/search`,
    },
    EXIT_INTERVIEWS: {
        BASE: `${V1}/exit-interviews`,
        BY_ID: (id) => `${V1}/exit-interviews/${id}`,
        SEARCH: `${V1}/exit-interviews/search`,
    },
    FULL_AND_FINAL_STATEMENTS: {
        BASE: `${V1}/full-and-final-statements`,
        BY_ID: (id) => `${V1}/full-and-final-statements/${id}`,
        SEARCH: `${V1}/full-and-final-statements/search`,
        MARK_AS_PAID: (id) => `${V1}/full-and-final-statements/${id}/mark-as-paid`,
    },

    // HRMS module 5 (ADR-021)
    GRIEVANCE_TYPES: {
        BASE: `${V1}/grievance-types`,
        BY_ID: (id) => `${V1}/grievance-types/${id}`,
        SEARCH: `${V1}/grievance-types/search`,
    },
    EMPLOYEE_GRIEVANCES: {
        BASE: `${V1}/employee-grievances`,
        BY_ID: (id) => `${V1}/employee-grievances/${id}`,
        SEARCH: `${V1}/employee-grievances/search`,
    },
    EMPLOYEE_TRANSFERS: {
        BASE: `${V1}/employee-transfers`,
        BY_ID: (id) => `${V1}/employee-transfers/${id}`,
        SEARCH: `${V1}/employee-transfers/search`,
    },
    EMPLOYEE_PROMOTIONS: {
        BASE: `${V1}/employee-promotions`,
        BY_ID: (id) => `${V1}/employee-promotions/${id}`,
        SEARCH: `${V1}/employee-promotions/search`,
    },
    EMPLOYEE_PROPERTY_CHANGES: {
        SEARCH: `${V1}/employee-property-changes/search`,
    },
    EMPLOYEE_REFERRALS: {
        BASE: `${V1}/employee-referrals`,
        BY_ID: (id) => `${V1}/employee-referrals/${id}`,
        SEARCH: `${V1}/employee-referrals/search`,
        CREATE_JOB_APPLICANT: (id) => `${V1}/employee-referrals/${id}/create-job-applicant`,
    },
    STAFFING_PLANS: {
        BASE: `${V1}/staffing-plans`,
        BY_ID: (id) => `${V1}/staffing-plans/${id}`,
        SEARCH: `${V1}/staffing-plans/search`,
    },

    // HRMS module 6 (ADR-022)
    TRAINING_PROGRAMS: {
        BASE: `${V1}/training-programs`,
        BY_ID: (id) => `${V1}/training-programs/${id}`,
        SEARCH: `${V1}/training-programs/search`,
    },
    TRAINING_EVENTS: {
        BASE: `${V1}/training-events`,
        BY_ID: (id) => `${V1}/training-events/${id}`,
        SEARCH: `${V1}/training-events/search`,
        MARK_COMPLETED: (id) => `${V1}/training-events/${id}/mark-completed`,
        MARK_SCHEDULED: (id) => `${V1}/training-events/${id}/mark-scheduled`,
    },
    TRAINING_FEEDBACKS: {
        BASE: `${V1}/training-feedbacks`,
        BY_ID: (id) => `${V1}/training-feedbacks/${id}`,
        SEARCH: `${V1}/training-feedbacks/search`,
    },
    SKILLS: {
        BASE: `${V1}/skills`,
        BY_ID: (id) => `${V1}/skills/${id}`,
        SEARCH: `${V1}/skills/search`,
    },
    EMPLOYEE_SKILL_MAPS: {
        BASE: `${V1}/employee-skill-maps`,
        BY_ID: (id) => `${V1}/employee-skill-maps/${id}`,
        SEARCH: `${V1}/employee-skill-maps/search`,
        POPULATE_FROM_DESIGNATION: (id) => `${V1}/employee-skill-maps/${id}/populate-from-designation`,
    },

    // HRMS module 7 (ADR-023)
    PURPOSE_OF_TRAVELS: {
        BASE: `${V1}/purpose-of-travels`,
        BY_ID: (id) => `${V1}/purpose-of-travels/${id}`,
        SEARCH: `${V1}/purpose-of-travels/search`,
    },
    IDENTIFICATION_DOCUMENT_TYPES: {
        BASE: `${V1}/identification-document-types`,
        BY_ID: (id) => `${V1}/identification-document-types/${id}`,
        SEARCH: `${V1}/identification-document-types/search`,
    },
    TRAVEL_REQUESTS: {
        BASE: `${V1}/travel-requests`,
        BY_ID: (id) => `${V1}/travel-requests/${id}`,
        SEARCH: `${V1}/travel-requests/search`,
    },

    // HRMS module 8 foundation (ADR-024) — LeaveAdjustment/CompensatoryLeaveRequest/
    // LeaveApplication/LeaveEncashment/LeaveBlockList are the second fork's work.
    LEAVE_TYPES: {
        BASE: `${V1}/leave-types`,
        BY_ID: (id) => `${V1}/leave-types/${id}`,
        SEARCH: `${V1}/leave-types/search`,
    },
    LEAVE_PERIODS: {
        BASE: `${V1}/leave-periods`,
        BY_ID: (id) => `${V1}/leave-periods/${id}`,
        SEARCH: `${V1}/leave-periods/search`,
    },
    HOLIDAY_LISTS: {
        BASE: `${V1}/holiday-lists`,
        BY_ID: (id) => `${V1}/holiday-lists/${id}`,
        SEARCH: `${V1}/holiday-lists/search`,
    },
    HOLIDAY_LIST_ASSIGNMENTS: {
        BASE: `${V1}/holiday-list-assignments`,
        BY_ID: (id) => `${V1}/holiday-list-assignments/${id}`,
        SEARCH: `${V1}/holiday-list-assignments/search`,
    },
    LEAVE_POLICIES: {
        BASE: `${V1}/leave-policies`,
        BY_ID: (id) => `${V1}/leave-policies/${id}`,
        SEARCH: `${V1}/leave-policies/search`,
    },
    LEAVE_POLICY_ASSIGNMENTS: {
        BASE: `${V1}/leave-policy-assignments`,
        BY_ID: (id) => `${V1}/leave-policy-assignments/${id}`,
        SEARCH: `${V1}/leave-policy-assignments/search`,
        GRANT_ALLOCATIONS: (id) => `${V1}/leave-policy-assignments/${id}/grant-allocations`,
    },
    LEAVE_ALLOCATIONS: {
        BASE: `${V1}/leave-allocations`,
        BY_ID: (id) => `${V1}/leave-allocations/${id}`,
        SEARCH: `${V1}/leave-allocations/search`,
        ADJUST: (id) => `${V1}/leave-allocations/${id}/adjust`,
    },
    LEAVE_LEDGER_ENTRIES: {
        BY_ID: (id) => `${V1}/leave-ledger-entries/${id}`,
        SEARCH: `${V1}/leave-ledger-entries/search`,
    },
    LEAVE_BALANCE: `${V1}/leave-balance`,

    // HRMS module 8, transactional fork (ADR-024 module complete).
    LEAVE_ADJUSTMENTS: {
        BASE: `${V1}/leave-adjustments`,
        BY_ID: (id) => `${V1}/leave-adjustments/${id}`,
        SEARCH: `${V1}/leave-adjustments/search`,
    },
    COMPENSATORY_LEAVE_REQUESTS: {
        BASE: `${V1}/compensatory-leave-requests`,
        BY_ID: (id) => `${V1}/compensatory-leave-requests/${id}`,
        SEARCH: `${V1}/compensatory-leave-requests/search`,
        APPROVE: (id) => `${V1}/compensatory-leave-requests/${id}/approve`,
        REJECT: (id) => `${V1}/compensatory-leave-requests/${id}/reject`,
    },
    LEAVE_APPLICATIONS: {
        BASE: `${V1}/leave-applications`,
        BY_ID: (id) => `${V1}/leave-applications/${id}`,
        SEARCH: `${V1}/leave-applications/search`,
        APPROVE: (id) => `${V1}/leave-applications/${id}/approve`,
        REJECT: (id) => `${V1}/leave-applications/${id}/reject`,
        CANCEL: (id) => `${V1}/leave-applications/${id}/cancel`,
    },
    LEAVE_ENCASHMENTS: {
        BASE: `${V1}/leave-encashments`,
        BY_ID: (id) => `${V1}/leave-encashments/${id}`,
        SEARCH: `${V1}/leave-encashments/search`,
        MARK_PAID: (id) => `${V1}/leave-encashments/${id}/mark-paid`,
    },
    LEAVE_BLOCK_LISTS: {
        BASE: `${V1}/leave-block-lists`,
        BY_ID: (id) => `${V1}/leave-block-lists/${id}`,
        SEARCH: `${V1}/leave-block-lists/search`,
    },
    LEAVE_CONTROL_PANEL: {
        BULK_POLICY_ASSIGNMENTS: `${V1}/leave-control-panel/bulk-policy-assignments`,
        BULK_ALLOCATIONS: `${V1}/leave-control-panel/bulk-allocations`,
    },

    ATTENDANCES: {
        BASE: `${V1}/attendances`,
        BY_ID: (id) => `${V1}/attendances/${id}`,
        SEARCH: `${V1}/attendances/search`,
    },
    EXPENSE_CLAIM_TYPES: { BASE: `${V1}/expense-claim-types`, SEARCH: `${V1}/expense-claim-types/search`, BY_ID: (id) => `${V1}/expense-claim-types/${id}` },
    EXPENSE_CLAIMS: { BASE: `${V1}/expense-claims`, SEARCH: `${V1}/expense-claims/search`, BY_ID: (id) => `${V1}/expense-claims/${id}`,
        APPROVE: (id) => `${V1}/expense-claims/${id}/approve`, REJECT: (id) => `${V1}/expense-claims/${id}/reject`, SUBMIT: (id) => `${V1}/expense-claims/${id}/submit`, CANCEL: (id) => `${V1}/expense-claims/${id}/cancel`, MARK_PAID: (id) => `${V1}/expense-claims/${id}/mark-paid` },

    // User endpoints
    USERS: {
        BASE: `${V1}/users`,
        BY_ID: (id) => `${V1}/users/${id}`,
        SEARCH: `${V1}/users/search`,
        RESET_PASSWORD: (id) => `${V1}/users/${id}/reset-password`,
    },

    // Location endpoints
    COUNTRIES: {
        BASE: `${V1}/countries`,
        BY_ID: (id) => `${V1}/countries/${id}`,
        SEARCH: `${V1}/countries/search`,
        STATES: (countryId) => `${V1}/countries/${countryId}/states`,
    },

    STATES: {
        BASE: `${V1}/states`,
        BY_ID: (id) => `${V1}/states/${id}`,
        SEARCH: `${V1}/states/search`,
        CITIES: (stateId) => `${V1}/states/${stateId}/cities`,
    },

    CITIES: {
        BASE: `${V1}/cities`,
        BY_ID: (id) => `${V1}/cities/${id}`,
        SEARCH: `${V1}/cities/search`,
    },

    LOCATIONS: {
        BASE: `${V1}/locations`,
    },

    // Menu endpoints
    MENU_GROUPS: {
        BASE: `${V1}/menu-groups`,
        BY_ID: (id) => `${V1}/menu-groups/${id}`,
        SEARCH: `${V1}/menu-groups/search`,
    },

    MENUS: {
        BASE: `${V1}/menus`,
        BY_ID: (id) => `${V1}/menus/${id}`,
        SEARCH: `${V1}/menus/search`,
        BY_GROUPS: `${V1}/menus/by-groups`,
    },

    // Role endpoints
    ROLES: {
        BASE: `${V1}/roles`,
        BY_ID: (id) => `${V1}/roles/${id}`,
        SEARCH: `${V1}/roles/search`,
    },

    // Currency endpoints
    CURRENCIES: {
        BASE: `${V1}/currencies`,
        BY_ID: (id) => `${V1}/currencies/${id}`,
        SEARCH: `${V1}/currencies/search`,
    },

    // Email endpoints
    EMAIL_SETUPS: {
        BASE: `${V1}/email-setups`,
        BY_ID: (id) => `${V1}/email-setups/${id}`,
        SEARCH: `${V1}/email-setups/search`,
    },

    EMAIL_FOR: {
        BASE: `${V1}/email-for`,
        BY_ID: (id) => `${V1}/email-for/${id}`,
        SEARCH: `${V1}/email-for/search`,
        TRIGGERS: `${V1}/email-for/triggers`,
    },

    EMAIL_TEMPLATES: {
        BASE: `${V1}/email-templates`,
        BY_ID: (id) => `${V1}/email-templates/${id}`,
        SEARCH: `${V1}/email-templates/search`,
        UPLOAD_SIGNATURE: `${V1}/email-templates/upload-signature`,
    },

    // User Roles endpoints (role -> menu permissions)
    USER_ROLES: {
        BASE: `${V1}/user-roles`,
        BY_ID: (id) => `${V1}/user-roles/${id}`,
    },

    // Dashboard widgets + per-role dashboards (ADR-003)
    DASHBOARDS: {
        WIDGETS: `${V1}/dashboard-widgets`,
        WIDGET_BY_ID: (id) => `${V1}/dashboard-widgets/${id}`,
        WIDGET_SEARCH: `${V1}/dashboard-widgets/search`,
        WIDGET_SOURCES: `${V1}/dashboard-widgets/sources`,
        WIDGET_PREVIEW: `${V1}/dashboard-widgets/preview`,
        WIDGET_RUN: (id) => `${V1}/dashboard-widgets/${id}/run`,
        ROLE_DASHBOARDS: `${V1}/role-dashboards`,
        ROLE_DASHBOARD_BY_ID: (roleId) => `${V1}/role-dashboards/${roleId}`,
        MY_DASHBOARD: `${V1}/role-dashboards/me`,
    },

    // Audit trail (read-only — the collection is written by the server plugin)
    AUDIT_LOGS: {
        SEARCH: `${V1}/audit-logs/search`,
        BY_ID: (id) => `${V1}/audit-logs/${id}`,
        MODELS: `${V1}/audit-logs/models`,
        RECORD_HISTORY: (model, documentId) => `${V1}/audit-logs/record/${model}/${documentId}`,
    },

    // SEO management
    SEO: {
        PAGES: `${V1}/seo-pages`,
        PAGE_BY_ID: (id) => `${V1}/seo-pages/${id}`,
        PAGE_SEARCH: `${V1}/seo-pages/search`,
        PAGE_UPLOAD_IMAGE: `${V1}/seo-pages/upload-image`,
        SETTINGS: `${V1}/seo-settings`,
        SITE_KEY: `${V1}/seo-settings/site-key`,
        REDIRECTS: `${V1}/seo-redirects`,
        REDIRECT_BY_ID: (id) => `${V1}/seo-redirects/${id}`,
        REDIRECT_SEARCH: `${V1}/seo-redirects/search`,
        REDIRECT_IMPORT: `${V1}/seo-redirects/import`,
        NOT_FOUND_SEARCH: `${V1}/seo-not-found/search`,
        NOT_FOUND_BY_ID: (id) => `${V1}/seo-not-found/${id}`,
        NOT_FOUND_REDIRECT: (id) => `${V1}/seo-not-found/${id}/redirect`,
    },

    // Admin endpoints
    ADMIN: {
        LOGIN_ATTEMPTS: `${V1}/admin/auth/login-attempts`,
        RESET_ATTEMPTS: `${V1}/admin/auth/reset-attempts`,
        UNLOCK_ACCOUNT: `${V1}/admin/auth/unlock`,
        BLOCK_USER: `${V1}/admin/auth/block`,
        UNBLOCK_USER: `${V1}/admin/auth/unblock`,
    },
};

export default ENDPOINTS;
