/**
 * API Endpoint Constants
 * All API endpoints defined in one place for easy maintenance
 */

// API Version prefix
const V1 = "/api/v1";

export const ENDPOINTS = {
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
