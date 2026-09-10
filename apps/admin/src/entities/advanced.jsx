import { Building07, Hash02, Link01, Mail01, MarkerPin01, Phone, Shield01, Tag01, Type01, User01 } from "@untitledui/icons";
import { isStrongPassword, isValidEmail, PASSWORD } from "@demo-panel/shared/validation";
import api from "../api/index";
import { ENDPOINTS } from "../api/endpoints";
import {
    createDepartment, deleteDepartment, getDepartmentById, updateDepartment, searchDepartments, getAllDepartments,
} from "../api/departments.api";
import {
    createBranch, deleteBranch, getBranchById, updateBranch, searchBranches, getAllBranches,
    createDesignation, deleteDesignation, getDesignationById, updateDesignation, searchDesignations, getAllDesignations,
    getAllCompanies, getAllEmploymentTypes, getAllEmployeeGrades, getAllEmployeeHealthInsurances,
} from "../api/organizationSetup.api";
import {
    createEmployee, deleteEmployee, getEmployeeById, updateEmployee, searchEmployees, getAllEmployees,
} from "../api/employees.api";
import { getAllRoles } from "../api/roles.api";
import { getAllCountries, getStatesByCountry, getCitiesByState } from "../api/locations.api";
import {
    createAdminUser, deleteAdminUser, getAdminUserById, updateAdminUser, searchAdminUsers, resetAdminUserPassword,
} from "../api/adminUsers.api";
import { createUser, deleteUser, getUserById, updateUser, searchUsers, resetUserPassword, getAllUsers } from "../api/users.api";
import {
    createMenu, deleteMenu, getMenuById, updateMenu, searchMenus, getAllMenuGroups, getAllMenus,
} from "../api/menus.api";
import {
    getAllEmailSetups, getAllEmailFor, searchEmailTemplates, createEmailTemplate,
    deleteEmailTemplate, getEmailTemplateById, updateEmailTemplate,
} from "../api/emails.api";
import { deleteSeoPage, getSeoPageById, searchSeoPages } from "../api/seo.api";
import {
    createJobRequisition, deleteJobRequisition, getJobRequisitionById, updateJobRequisition,
    searchJobRequisitions, getAllJobRequisitions, makeJobOpeningFromRequisition,
    createJobOpening, deleteJobOpening, getJobOpeningById, updateJobOpening, searchJobOpenings, getAllJobOpenings,
    createJobApplicant, deleteJobApplicant, getJobApplicantById, updateJobApplicant, searchJobApplicants, getAllJobApplicants,
    createJobApplicantSource, deleteJobApplicantSource, getJobApplicantSourceById, updateJobApplicantSource,
    searchJobApplicantSources, getAllJobApplicantSources,
} from "../api/recruitmentPipeline.api";
import {
    createInterviewType, deleteInterviewType, getInterviewTypeById, updateInterviewType, searchInterviewTypes, getAllInterviewTypes,
    createInterview, deleteInterview, getInterviewById, updateInterview, searchInterviews, getAllInterviews,
    createInterviewFeedback, deleteInterviewFeedback, getInterviewFeedbackById, updateInterviewFeedback, searchInterviewFeedbacks,
} from "../api/interviews.api";
import {
    createJobOffer, deleteJobOffer, getJobOfferById, updateJobOffer, searchJobOffers, makeEmployeeFromJobOffer, getAllJobOffers,
    createJobOfferTermTemplate, deleteJobOfferTermTemplate, getJobOfferTermTemplateById, updateJobOfferTermTemplate,
    searchJobOfferTermTemplates, getAllJobOfferTermTemplates,
} from "../api/jobOffers.api";
import {
    createEmployeeOnboarding, deleteEmployeeOnboarding, getEmployeeOnboardingById, updateEmployeeOnboarding,
    searchEmployeeOnboardings, markOnboardingAsCompleted, makeEmployeeFromOnboarding,
    createEmployeeOnboardingTemplate, deleteEmployeeOnboardingTemplate, getEmployeeOnboardingTemplateById,
    updateEmployeeOnboardingTemplate, searchEmployeeOnboardingTemplates, getAllEmployeeOnboardingTemplates,
    createEmployeeSeparation, deleteEmployeeSeparation, getEmployeeSeparationById, updateEmployeeSeparation,
    searchEmployeeSeparations,
    createEmployeeSeparationTemplate, deleteEmployeeSeparationTemplate, getEmployeeSeparationTemplateById,
    updateEmployeeSeparationTemplate, searchEmployeeSeparationTemplates, getAllEmployeeSeparationTemplates,
    createExitInterview, deleteExitInterview, getExitInterviewById, updateExitInterview, searchExitInterviews,
    createFullAndFinalStatement, deleteFullAndFinalStatement, getFullAndFinalStatementById,
    updateFullAndFinalStatement, searchFullAndFinalStatements, markStatementAsPaid,
} from "../api/onboardingSeparation.api";
import {
    createGrievanceType, deleteGrievanceType, getGrievanceTypeById, updateGrievanceType, searchGrievanceTypes, getAllGrievanceTypes,
    createEmployeeGrievance, deleteEmployeeGrievance, getEmployeeGrievanceById, updateEmployeeGrievance, searchEmployeeGrievances,
    createEmployeeTransfer, deleteEmployeeTransfer, getEmployeeTransferById, searchEmployeeTransfers,
    createEmployeePromotion, deleteEmployeePromotion, getEmployeePromotionById, searchEmployeePromotions,
    createEmployeeReferral, deleteEmployeeReferral, getEmployeeReferralById, updateEmployeeReferral,
    searchEmployeeReferrals, createJobApplicantFromReferral,
    createStaffingPlan, deleteStaffingPlan, getStaffingPlanById, updateStaffingPlan, searchStaffingPlans,
} from "../api/employeeCareerEvents.api";
import {
    createTrainingProgram, deleteTrainingProgram, getTrainingProgramById, updateTrainingProgram, searchTrainingPrograms, getAllTrainingPrograms,
    createTrainingEvent, deleteTrainingEvent, getTrainingEventById, updateTrainingEvent, searchTrainingEvents, getAllTrainingEvents,
    markTrainingEventCompleted, markTrainingEventScheduled,
    createTrainingFeedback, deleteTrainingFeedback, getTrainingFeedbackById, searchTrainingFeedbacks,
    createSkill, deleteSkill, getSkillById, updateSkill, searchSkills, getAllSkills,
    createEmployeeSkillMap, deleteEmployeeSkillMap, getEmployeeSkillMapById, updateEmployeeSkillMap,
    searchEmployeeSkillMaps, populateEmployeeSkillMapFromDesignation,
} from "../api/trainingSkills.api";
import {
    createPurposeOfTravel, deletePurposeOfTravel, getPurposeOfTravelById, updatePurposeOfTravel,
    searchPurposeOfTravels, getAllPurposeOfTravels,
    createIdentificationDocumentType, deleteIdentificationDocumentType, getIdentificationDocumentTypeById,
    updateIdentificationDocumentType, searchIdentificationDocumentTypes, getAllIdentificationDocumentTypes,
    createTravelRequest, deleteTravelRequest, getTravelRequestById, updateTravelRequest, searchTravelRequests,
} from "../api/travel.api";
import PasswordResetSection from "@/components/crud/password-reset-section";
import EmailTemplateMergeFields from "@/components/crud/email-template-merge-fields";
import SimpleArrayField from "@/components/crud/simple-array-field";
import SimpleActionButton from "@/components/crud/simple-action-button";

const ACTIVE = { name: "isActive", label: "Is Active", type: "checkbox", section: "status", default: false };
const asOptions = (loader, labelKey) => () =>
    loader().then((res) => (res.data?.data ?? []).map((x) => ({ value: x._id, label: x[labelKey] })));

/**
 * The id of a relation, however it arrived.
 *
 * The single-record endpoints `populate()` their refs, so on an edit form the
 * first lookup pass sees the whole referenced document rather than its id. Sent
 * to the API that way it stringifies to "[object Object]" and the request fails
 * its ObjectId cast, leaving the dependent dropdown empty — which is how a
 * user's existing state and city became invisible on the edit screen.
 */
const refId = (value) =>
    value && typeof value === "object" && !Array.isArray(value) ? (value._id ?? value.id) : value;

const mobileRule = (v) => (v && v.length !== 10 ? "Phone number should be 10 digits" : undefined);
const emailRule = (v) => (v && !isValidEmail(v) ? "Invalid email address" : undefined);
const passwordRule = (v, _values, mode) =>
    mode === "add" && v && !isStrongPassword(v) ? PASSWORD.MESSAGE : undefined;

export const adminUserConfig = {
    filterFields: [
        { name: "adminName", label: "Name", type: "string" },
        { name: "email", label: "Email", type: "string" },
        { name: "mobileNumber", label: "Mobile", type: "string" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "admin-user",
    path: "/admin-user",
    section: "Setup",
    singular: "Admin User",
    plural: "Admin Users",
    description: "Accounts with access to this admin panel.",
    api: {
        search: searchAdminUsers, getById: getAdminUserById, create: createAdminUser,
        update: updateAdminUser, remove: deleteAdminUser,
    },
    sections: [
        { id: "details", title: "Account details", description: "Who this administrator is and how to reach them." },
        { id: "security", title: "Security", description: "Password used to sign in." },
        { id: "status", title: "Status" },
    ],
    fields: [
        { name: "adminName", icon: User01, label: "Name", required: true, section: "details", placeholder: "Enter name", error: "Name is required" },
        { name: "email", type: "email", label: "Email", required: true, section: "details", error: "Email is required", validate: emailRule },
        { name: "mobileNumber", icon: Phone, label: "Mobile Number", section: "details", placeholder: "10-digit number", validate: mobileRule },
        {
            name: "password", type: "password", label: "Password", required: true, section: "security",
            placeholder: "Enter password", hint: PASSWORD.MESSAGE, hideIn: ["edit"],
            error: "Password is required", validate: passwordRule,
        },
        { ...ACTIVE, default: true },
    ],
    // The update endpoint takes the profile only; passwords go through their
    // own reset endpoint.
    toPayload: (values, mode) =>
        mode === "edit"
            ? { adminName: values.adminName, email: values.email, mobileNumber: values.mobileNumber, isActive: values.isActive }
            : values,
    renderExtra: ({ mode, id }) =>
        mode === "edit" ? <PasswordResetSection id={id} resetApi={resetAdminUserPassword} /> : null,
    columns: [
        { name: "Name", selector: (row) => row.adminName, sortable: true, sortField: "adminName", minWidth: "170px" },
        { name: "Email", selector: (row) => row.email, sortable: true, sortField: "email", minWidth: "220px" },
        { name: "Mobile", selector: (row) => row.mobileNumber, minWidth: "140px" },
    ],
    recordTitle: (r) => r.adminName,
};

export const userConfig = {
    filterFields: [
        { name: "userName", label: "User Name", type: "string" },
        { name: "email", label: "Email", type: "string" },
        { name: "mobileNumber", label: "Mobile", type: "string" },
        { name: "address", label: "Address", type: "string" },
        { name: "departmentId", label: "Department", type: "objectId", optionsFrom: "departments" },
        { name: "roleId", label: "Role", type: "objectId", optionsFrom: "roles" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    filterLookups: {
        departments: asOptions(getAllDepartments, "departmentName"),
        roles: asOptions(getAllRoles, "roleName"),
    },
    key: "user",
    path: "/user",
    section: "Setup",
    singular: "User",
    plural: "Users",
    description: "People who use the application, and where they are based.",
    api: { search: searchUsers, getById: getUserById, create: createUser, update: updateUser, remove: deleteUser },
    lookups: {
        departments: asOptions(getAllDepartments, "departmentName"),
        roles: asOptions(getAllRoles, "roleName"),
        countries: asOptions(getAllCountries, "countryName"),
        // Cascade: each level reloads when the level above it changes.
        states: (values) =>
            refId(values.countryId)
                ? getStatesByCountry(refId(values.countryId)).then((res) => (res.data?.data ?? []).map((x) => ({ value: x._id, label: x.stateName })))
                : Promise.resolve([]),
        cities: (values) =>
            refId(values.stateId)
                ? getCitiesByState(refId(values.stateId)).then((res) => (res.data?.data ?? []).map((x) => ({ value: x._id, label: x.cityName })))
                : Promise.resolve([]),
    },
    lookupDeps: ["countryId", "stateId"],
    sections: [
        { id: "details", title: "User details", description: "Name, contact details and where they sit in the organisation." },
        { id: "location", title: "Location", description: "Country, state and city. Each list narrows the next." },
        { id: "security", title: "Security" },
        { id: "status", title: "Status" },
    ],
    fields: [
        { name: "userName", icon: User01, label: "User Name", required: true, section: "details", placeholder: "Enter user name", error: "Name is required" },
        { name: "departmentId", icon: Building07, label: "Department", type: "select", optionsFrom: "departments", required: true, section: "details", placeholder: "Search department...", error: "Department is required" },
        { name: "roleId", icon: Shield01, label: "Role", type: "select", optionsFrom: "roles", required: true, section: "details", placeholder: "Search role...", error: "Role is required" },
        { name: "email", type: "email", label: "Email", required: true, section: "details", error: "Email is required", validate: emailRule },
        { name: "mobileNumber", icon: Phone, label: "Mobile Number", section: "details", placeholder: "10-digit number", validate: mobileRule },
        { name: "countryId", label: "Country", type: "select", optionsFrom: "countries", required: true, section: "location", placeholder: "Search country...", error: "Country is required", clears: ["stateId", "cityId"] },
        { name: "stateId", label: "State", type: "select", optionsFrom: "states", required: true, section: "location", placeholder: "Search state...", error: "State is required", clears: ["cityId"], disabled: (v) => !v.countryId },
        { name: "cityId", icon: MarkerPin01, label: "City", type: "select", optionsFrom: "cities", required: true, section: "location", placeholder: "Search city...", error: "City is required", disabled: (v) => !v.stateId },
        { name: "address", type: "textarea", label: "Address", required: true, section: "location", placeholder: "Enter address", error: "Address is required" },
        {
            name: "password", type: "password", label: "Password", required: true, section: "security",
            placeholder: "Enter password", hint: PASSWORD.MESSAGE, hideIn: ["edit"],
            error: "Password is required", validate: passwordRule,
        },
        { ...ACTIVE, default: true },
    ],
    toForm: (d) => ({
        userName: d.userName ?? "",
        departmentId: d.departmentId?._id ?? d.departmentId ?? "",
        roleId: d.roleId?._id ?? d.roleId ?? "",
        email: d.email ?? "",
        mobileNumber: d.mobileNumber ?? "",
        countryId: d.countryId?._id ?? d.countryId ?? "",
        stateId: d.stateId?._id ?? d.stateId ?? "",
        cityId: d.cityId?._id ?? d.cityId ?? "",
        address: d.address ?? "",
        password: "",
        isActive: d.isActive ?? true,
    }),
    toPayload: (values, mode) => {
        const { password, ...rest } = values;
        return mode === "edit" ? rest : values;
    },
    renderExtra: ({ mode, id }) => (mode === "edit" ? <PasswordResetSection id={id} resetApi={resetUserPassword} /> : null),
    columns: [
        { name: "User Name", selector: (row) => row.userName, minWidth: "160px" },
        { name: "Department", selector: (row) => row.department?.departmentName ?? row.departmentId?.departmentName, minWidth: "160px" },
        { name: "Email", selector: (row) => row.email, minWidth: "220px" },
        { name: "Phone", selector: (row) => row.mobileNumber, minWidth: "140px" },
    ],
    recordTitle: (r) => r.userName,
};

export const menuMasterConfig = {
    filterFields: [
        { name: "menuName", label: "Menu Name", type: "string" },
        { name: "menuUrl", label: "Menu URL", type: "string" },
        { name: "sequence", label: "Sequence", type: "number" },
        { name: "isParent", label: "Is Parent", type: "boolean" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "menu-master",
    path: "/menu-master",
    section: "Master",
    singular: "Menu",
    plural: "Menu Master",
    description: "Individual sidebar entries and their nesting.",
    api: { search: searchMenus, getById: getMenuById, create: createMenu, update: updateMenu, remove: deleteMenu },
    lookups: {
        menuGroups: asOptions(getAllMenuGroups, "menuGroupName"),
        /**
         * Parent candidates are the isParent menus inside the selected group,
         * labelled with their full "Parent > Child" path. A menu can never be
         * its own parent, hence the route id.
         */
        parentMenus: async (values, ctx) => {
            if (!values.menuGroup) return [];
            const res = await getAllMenus();
            const all = res.data?.data ?? [];
            const inGroup = (m) => m.menuGroup?._id === values.menuGroup || m.menuGroup === values.menuGroup;

            const byId = new Map();
            all.forEach((m) => inGroup(m) && byId.set(m._id.toString(), { ...m, path: m.menuName }));
            all.forEach((m) => {
                if (!inGroup(m)) return;
                const parent = m.parentMenu && byId.get(m.parentMenu.toString());
                if (!parent) return;
                const self = byId.get(m._id.toString());
                self.path = `${parent.path} > ${self.path}`;
            });

            return [...byId.values()]
                .filter((m) => m.isParent === true && (!ctx?.id || m._id.toString() !== ctx.id.toString()))
                .map((m) => ({ value: m._id, label: m.path }));
        },
    },
    lookupDeps: ["menuGroup"],
    sections: [
        { id: "details", title: "Menu details", description: "Name, group and the icon shown in the sidebar." },
        { id: "nesting", title: "Nesting", description: "A parent menu holds submenus and has no URL of its own." },
        { id: "status", title: "Status" },
    ],
    fields: [
        { name: "menuName", icon: Type01, label: "Menu Name", required: true, section: "details", placeholder: "Enter menu name", error: "Menu Name is required!" },
        { name: "menuGroup", icon: Tag01, label: "Menu Group", type: "select", optionsFrom: "menuGroups", required: true, section: "details", placeholder: "Search menu group...", error: "Menu Group is required!", clears: ["parentMenu"] },
        { name: "sequence", icon: Hash02, type: "number", min: 1, label: "Sequence", required: true, section: "details", placeholder: "Enter sequence", error: "Sequence is required!" },
        { name: "icon", type: "icon", label: "Menu Icon", section: "details" },
        { name: "isParent", type: "checkbox", label: "Is Parent Menu (holds submenus)", section: "nesting", default: false },
        {
            name: "menuUrl", icon: Link01, label: "Menu URL", section: "nesting", placeholder: "/example",
            disabled: (v) => v.isParent,
            validate: (v, values) => (!values.isParent && !v ? "Menu URL is required for non-parent menus!" : undefined),
        },
        { name: "parentMenu", label: "Parent Menu", type: "select", optionsFrom: "parentMenus", section: "nesting", placeholder: "Search parent menu...", disabled: (v) => !v.menuGroup },
        ACTIVE,
    ],
    toForm: (d) => ({
        menuName: d.menuName ?? "",
        menuGroup: d.menuGroup?._id ?? d.menuGroup ?? "",
        menuUrl: d.menuUrl ?? "",
        sequence: d.sequence ?? "",
        isActive: d.isActive ?? false,
        isParent: d.isParent ?? false,
        parentMenu: d.parentMenu ?? "",
        icon: d.icon ?? "",
    }),
    toPayload: (values) => ({ ...values, parentMenu: values.parentMenu || null }),
    columns: [
        { name: "Menu Name", selector: (row) => row.menuName, sortable: true, sortField: "menuName", minWidth: "160px" },
        { name: "Menu Group", selector: (row) => row.menuGroup?.menuGroupName ?? row.menuGroup, sortable: true, sortField: "menuGroup.menuGroupName", minWidth: "160px" },
        { name: "Menu URL", selector: (row) => row.menuUrl, minWidth: "150px" },
        { name: "Sequence", selector: (row) => row.sequence, sortable: true, sortField: "sequence", minWidth: "110px" },
    ],
    recordTitle: (r) => r.menuName,
};

// Jodit uploads signature images straight to the template endpoint.
const editorConfig = {
    uploader: {
        url: `${api.defaults.baseURL}${ENDPOINTS.EMAIL_TEMPLATES.UPLOAD_SIGNATURE}`,
        method: "POST",
        withCredentials: true,
        filesVariableName: () => "signatureImage",
        format: "json",
        isSuccess: (resp) => resp.data.isOk,
        getMessage: (resp) => resp.data.message,
        process: (resp) => ({
            files: [resp.data.url],
            path: resp.data.url,
            baseurl: "",
            error: resp.data.isOk ? 0 : 1,
            message: resp.data.message,
        }),
        defaultHandlerSuccess: function (data) {
            if (data.files?.length) this.selection.insertImage(data.files[0]);
        },
    },
};

export const emailTemplateConfig = {
    filterFields: [
        { name: "templateName", label: "Template Name", type: "string" },
        { name: "mailerName", label: "Mailer Name", type: "string" },
        { name: "emailSubject", label: "Email Subject", type: "string" },
        { name: "emailCC", label: "Email CC", type: "string" },
        { name: "emailBCC", label: "Email BCC", type: "string" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "email-template",
    path: "/email-template",
    section: "CMS",
    singular: "Email Template",
    plural: "Email Templates",
    description: "The content sent for each email event.",
    api: {
        search: searchEmailTemplates, getById: getEmailTemplateById, create: createEmailTemplate,
        update: updateEmailTemplate, remove: deleteEmailTemplate,
    },
    lookups: {
        emailFrom: asOptions(getAllEmailSetups, "email"),
        emailForList: asOptions(getAllEmailFor, "emailFor"),
    },
    sections: [
        { id: "details", title: "Template details", description: "What this template is called and which event it serves." },
        { id: "recipients", title: "Recipients", description: "Who receives a copy of every message." },
        { id: "content", title: "Content", description: "Subject line and the signature appended to the message." },
        { id: "status", title: "Status" },
    ],
    fields: [
        { name: "templateName", icon: Type01, label: "Template Name", required: true, section: "details", placeholder: "Enter template name", error: "Template Name is required" },
        { name: "mailerName", icon: User01, label: "Mailer Name", required: true, section: "details", placeholder: "Name shown as the sender", error: "Mailer Name is required" },
        { name: "emailFrom", icon: Mail01, label: "Email From", type: "select", optionsFrom: "emailFrom", required: true, section: "details", placeholder: "Search sender...", error: "Email From is required" },
        { name: "emailFor", label: "Email For", type: "select", optionsFrom: "emailForList", required: true, section: "details", placeholder: "Search event...", error: "Email For is required" },
        { name: "emailCC", icon: Mail01, label: "Email CC", section: "recipients", placeholder: "cc@company.com" },
        { name: "emailBCC", icon: Mail01, label: "Email BCC", section: "recipients", placeholder: "bcc@company.com" },
        { name: "emailSubject", label: "Email Subject", required: true, section: "content", full: true, placeholder: "Enter email subject", error: "Email Subject is required" },
        { name: "emailSignature", type: "richtext", label: "Email Signature", required: true, section: "content", editorConfig, error: "Email Signature is required" },
        ACTIVE,
    ],
    toForm: (d) => ({
        templateName: d.templateName ?? "",
        mailerName: d.mailerName ?? "",
        emailFrom: d.emailFrom?._id ?? d.emailFrom ?? "",
        emailFor: d.emailFor?._id ?? d.emailFor ?? "",
        emailCC: d.emailCC ?? "",
        emailBCC: d.emailBCC ?? "",
        emailSubject: d.emailSubject ?? "",
        emailSignature: d.emailSignature ?? "",
        isActive: d.isActive ?? false,
    }),
    renderExtra: ({ values }) => <EmailTemplateMergeFields values={values} />,
    columns: [
        { name: "Template Name", selector: (row) => row.templateName, minWidth: "180px" },
        { name: "Email From", selector: (row) => row.emailFrom?.email, minWidth: "200px" },
        { name: "Email For", selector: (row) => row.emailFor?.emailFor, minWidth: "160px" },
        { name: "Mailer Name", selector: (row) => row.mailerName, minWidth: "160px" },
    ],
    recordTitle: (r) => r.templateName,
};


/**
 * SEO pages — list, view and delete only.
 *
 * NOT in ADVANCED_ENTITIES on purpose. crudRoutes would generate an add/edit
 * form from `fields`, and this is the one screen where a generated form is the
 * wrong answer: its whole value is the live Google preview, share card and
 * health checklist beside the inputs, which no config can express. allRoutes
 * takes the list route from here and points the rest at SeoPageEditor.
 *
 * `create`/`update` are deliberately absent — the editor calls the API itself.
 */
export const seoPageConfig = {
    filterFields: [
        { name: "path", label: "URL", type: "string" },
        { name: "pageName", label: "Page Name", type: "string" },
        { name: "title", label: "Title", type: "string" },
        { name: "description", label: "Description", type: "string" },
        { name: "focusKeyword", label: "Focus Keyword", type: "string" },
        { name: "robots.index", label: "Shown in search", type: "boolean" },
        { name: "sitemap.include", label: "In sitemap", type: "boolean" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
        { name: "updatedAt", label: "Updated", type: "date" },
    ],
    key: "seo-page",
    path: "/seo-pages",
    section: "Setup",
    singular: "SEO Page",
    plural: "SEO Pages",
    description: "How each fixed URL of your website appears in search results and when shared.",
    api: { search: searchSeoPages, getById: getSeoPageById, remove: deleteSeoPage },
    columns: [
        { name: "URL", selector: (row) => row.path, sortable: true, sortField: "path", minWidth: "200px" },
        { name: "Page Name", selector: (row) => row.pageName, sortable: true, sortField: "pageName", minWidth: "180px" },
        { name: "Title", selector: (row) => row.title || "Uses the site template", minWidth: "220px" },
        { name: "In Search", selector: (row) => (row.robots?.index === false ? "Hidden" : "Yes"), maxWidth: "120px" },
        { name: "In Sitemap", selector: (row) => (row.sitemap?.include === false ? "No" : "Yes"), maxWidth: "130px" },
        {
            name: "Updated",
            selector: (row) => (row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : "-"),
            sortable: true, sortField: "updatedAt", minWidth: "130px",
        },
    ],
    recordTitle: (r) => r.pageName,
};

// ADR-017 (Organization Setup): Department, Branch and Designation each need
// a companyId select (a `lookups` entry), which is why they live here rather
// than in entities/index.js's UNIFORM_ENTITIES.

export const departmentConfig = {
    filterFields: [
        { name: "departmentName", label: "Department Name", type: "string" },
        { name: "departmentCode", label: "Department Code", type: "string" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "department",
    path: "/department",
    section: "HR Setup",
    singular: "Department",
    plural: "Departments",
    description: "Departments users can be assigned to.",
    api: { search: searchDepartments, getById: getDepartmentById, create: createDepartment, update: updateDepartment, remove: deleteDepartment },
    lookups: { companyId: asOptions(getAllCompanies, "companyName") },
    sections: [
        { id: "details", title: "Department details" },
        { id: "status", title: "Status" },
    ],
    fields: [
        { name: "companyId", icon: Building07, label: "Company", type: "select", required: true, section: "details", error: "Company is required!", optionsFrom: "companyId" },
        { name: "departmentName", icon: Building07, label: "Department Name", required: true, section: "details", error: "Department Name is required!", placeholder: "Enter department name" },
        { name: "departmentCode", icon: Hash02, label: "Department Code", section: "details", placeholder: "Enter department code (optional)" },
        ACTIVE,
    ],
    columns: [
        { name: "Department Name", selector: (row) => row.departmentName, minWidth: "180px" },
        { name: "Code", selector: (row) => row.departmentCode, minWidth: "130px" },
        { name: "Status", selector: (row) => (row.isActive ? "Active" : "Inactive"), minWidth: "130px" },
    ],
    recordTitle: (r) => r.departmentName,
    toForm: (data) => ({ ...data, companyId: refId(data.companyId) }),
};

export const branchConfig = {
    filterFields: [
        { name: "branchName", label: "Branch Name", type: "string" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "branch",
    path: "/branch",
    section: "HR Setup",
    singular: "Branch",
    plural: "Branches",
    description: "Sites/locations under a company (e.g. Vadodara, USA).",
    api: { search: searchBranches, getById: getBranchById, create: createBranch, update: updateBranch, remove: deleteBranch },
    lookups: { companyId: asOptions(getAllCompanies, "companyName") },
    sections: [
        { id: "details", title: "Branch details" },
        { id: "status", title: "Status" },
    ],
    fields: [
        { name: "companyId", icon: Building07, label: "Company", type: "select", required: true, section: "details", error: "Company is required!", optionsFrom: "companyId" },
        { name: "branchName", icon: MarkerPin01, label: "Branch Name", required: true, section: "details", error: "Branch Name is required!", placeholder: "Enter branch name" },
        ACTIVE,
    ],
    columns: [
        { name: "Branch Name", selector: (row) => row.branchName, minWidth: "180px" },
        { name: "Status", selector: (row) => (row.isActive ? "Active" : "Inactive"), minWidth: "130px" },
    ],
    recordTitle: (r) => r.branchName,
    toForm: (data) => ({ ...data, companyId: refId(data.companyId) }),
};

export const designationConfig = {
    filterFields: [
        { name: "designationName", label: "Designation Name", type: "string" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "designation",
    path: "/designation",
    section: "HR Setup",
    singular: "Designation",
    plural: "Designations",
    description: "Job titles assignable to an employee.",
    api: { search: searchDesignations, getById: getDesignationById, create: createDesignation, update: updateDesignation, remove: deleteDesignation },
    lookups: { companyId: asOptions(getAllCompanies, "companyName") },
    sections: [
        { id: "details", title: "Designation details" },
        { id: "status", title: "Status" },
    ],
    fields: [
        { name: "companyId", icon: Building07, label: "Company", type: "select", required: true, section: "details", error: "Company is required!", optionsFrom: "companyId" },
        { name: "designationName", icon: User01, label: "Designation Name", required: true, section: "details", error: "Designation Name is required!", placeholder: "Enter designation name" },
        ACTIVE,
    ],
    columns: [
        { name: "Designation Name", selector: (row) => row.designationName, minWidth: "180px" },
        { name: "Status", selector: (row) => (row.isActive ? "Active" : "Inactive"), minWidth: "130px" },
    ],
    recordTitle: (r) => r.designationName,
    toForm: (data) => ({ ...data, companyId: refId(data.companyId) }),
};

// Reports-to needs a combined "code — name" label, unlike asOptions' single
// labelKey — a small custom loader instead of reusing that helper.
const employeeOptionsLoader = () =>
    getAllEmployees().then((res) =>
        (res.data?.data ?? []).map((x) => ({ value: x._id, label: `${x.employeeCode} — ${x.employeeName}` })));

export const employeeConfig = {
    filterFields: [
        { name: "employeeCode", label: "Employee Code", type: "string" },
        { name: "employeeName", label: "Employee Name", type: "string" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "departmentId", label: "Department", type: "objectId" },
        { name: "designationId", label: "Designation", type: "objectId" },
        { name: "branchId", label: "Branch", type: "objectId" },
        { name: "status", label: "Status", type: "enum" },
        { name: "dateOfJoining", label: "Date of Joining", type: "date" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "employee",
    path: "/employee",
    section: "HR Core",
    singular: "Employee",
    plural: "Employees",
    description: "The employee master — the hub every other HRMS record links to.",
    api: { search: searchEmployees, getById: getEmployeeById, create: createEmployee, update: updateEmployee, remove: deleteEmployee },
    lookups: {
        companyId: asOptions(getAllCompanies, "companyName"),
        departmentId: asOptions(getAllDepartments, "departmentName"),
        designationId: asOptions(getAllDesignations, "designationName"),
        branchId: asOptions(getAllBranches, "branchName"),
        reportsToId: employeeOptionsLoader,
        employmentTypeId: asOptions(getAllEmploymentTypes, "employmentTypeName"),
        gradeId: asOptions(getAllEmployeeGrades, "gradeName"),
        healthInsuranceProviderId: asOptions(getAllEmployeeHealthInsurances, "providerName"),
    },
    sections: [
        { id: "identity", title: "Identity" },
        { id: "organization", title: "Organization" },
        { id: "employment", title: "Employment" },
        { id: "other", title: "Other" },
        { id: "status", title: "Status" },
    ],
    fields: [
        { name: "employeeCode", icon: Hash02, label: "Employee Code", required: true, section: "identity", error: "Employee Code is required!", placeholder: "e.g. A005" },
        { name: "employeeName", icon: User01, label: "Employee Name", required: true, section: "identity", error: "Employee Name is required!", placeholder: "Enter employee name" },
        { name: "gender", label: "Gender", type: "select", section: "identity", options: [{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }, { value: "Other", label: "Other" }] },
        { name: "dateOfBirth", label: "Date of Birth", type: "date", section: "identity" },

        { name: "companyId", icon: Building07, label: "Company", type: "select", required: true, section: "organization", error: "Company is required!", optionsFrom: "companyId" },
        { name: "departmentId", icon: Building07, label: "Department", type: "select", required: true, section: "organization", error: "Department is required!", optionsFrom: "departmentId" },
        { name: "designationId", icon: User01, label: "Designation", type: "select", required: true, section: "organization", error: "Designation is required!", optionsFrom: "designationId" },
        { name: "branchId", icon: MarkerPin01, label: "Branch", type: "select", required: true, section: "organization", error: "Branch is required!", optionsFrom: "branchId" },
        { name: "reportsToId", icon: User01, label: "Reports To", type: "select", section: "organization", optionsFrom: "reportsToId" },

        { name: "status", label: "Status", type: "select", section: "employment", options: [{ value: "Active", label: "Active" }, { value: "Inactive", label: "Inactive" }, { value: "Suspended", label: "Suspended" }, { value: "Left", label: "Left" }] },
        { name: "dateOfJoining", label: "Date of Joining", type: "date", required: true, section: "employment", error: "Date of Joining is required!" },
        { name: "relievingDate", label: "Relieving Date", type: "date", section: "employment" },
        { name: "employmentTypeId", icon: Tag01, label: "Employment Type", type: "select", section: "employment", optionsFrom: "employmentTypeId" },
        { name: "gradeId", icon: Tag01, label: "Employee Grade", type: "select", section: "employment", optionsFrom: "gradeId" },
        { name: "workMode", label: "Work Mode", type: "select", section: "employment", options: [{ value: "WFO", label: "Work From Office" }, { value: "WFH", label: "Work From Home" }] },
        { name: "shiftPreference", label: "Shift", type: "select", section: "employment", options: [{ value: "Day", label: "Day" }, { value: "Night", label: "Night" }, { value: "UK", label: "UK" }] },

        { name: "healthInsuranceProviderId", icon: Tag01, label: "Health Insurance Provider", type: "select", section: "other", optionsFrom: "healthInsuranceProviderId" },
        { name: "healthInsuranceNo", label: "Health Insurance No.", section: "other", placeholder: "Enter policy/member number" },

        ACTIVE,
    ],
    columns: [
        { name: "Employee Code", selector: (row) => row.employeeCode, minWidth: "130px" },
        { name: "Employee Name", selector: (row) => row.employeeName, minWidth: "180px" },
        { name: "Department", selector: (row) => row.departmentName ?? "—", minWidth: "160px" },
        { name: "Designation", selector: (row) => row.designationName ?? "—", minWidth: "160px" },
        { name: "Status", selector: (row) => row.status, minWidth: "120px" },
    ],
    recordTitle: (r) => `${r.employeeCode} — ${r.employeeName}`,
    toForm: (data) => ({
        ...data,
        companyId: refId(data.companyId),
        departmentId: refId(data.departmentId),
        designationId: refId(data.designationId),
        branchId: refId(data.branchId),
        reportsToId: refId(data.reportsToId),
        employmentTypeId: refId(data.employmentTypeId),
        gradeId: refId(data.gradeId),
        healthInsuranceProviderId: refId(data.healthInsuranceProviderId),
    }),
};

// ---------------------------------------------------------- Recruitment (ADR-019) --
// Interviewers/defaultInterviewers (arrays of User refs) are schema-ready but
// not exposed on these quick-entry forms — this admin has no multi-select
// field type precedent to build against yet; a known simplification, not an
// oversight.

export const jobApplicantSourceConfig = {
    filterFields: [
        { name: "sourceName", label: "Source Name", type: "string" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "job-applicant-source",
    path: "/job-applicant-source",
    section: "Recruitment",
    singular: "Job Applicant Source",
    plural: "Job Applicant Sources",
    description: "Where a candidate came from (referral, job board, ...).",
    api: { search: searchJobApplicantSources, getById: getJobApplicantSourceById, create: createJobApplicantSource, update: updateJobApplicantSource, remove: deleteJobApplicantSource },
    sections: [{ id: "details", title: "Details" }, { id: "status", title: "Status" }],
    fields: [
        { name: "sourceName", icon: Link01, label: "Source Name", required: true, section: "details", error: "Source Name is required!", placeholder: "Enter source name" },
        ACTIVE,
    ],
    columns: [
        { name: "Source Name", selector: (row) => row.sourceName, minWidth: "180px" },
        { name: "Status", selector: (row) => (row.isActive ? "Active" : "Inactive"), minWidth: "130px" },
    ],
    recordTitle: (r) => r.sourceName,
};

export const interviewTypeConfig = {
    filterFields: [
        { name: "interviewTypeName", label: "Interview Type", type: "string" },
        { name: "designationId", label: "Designation", type: "objectId" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "interview-type",
    path: "/interview-type",
    section: "Recruitment",
    singular: "Interview Type",
    plural: "Interview Types",
    description: "A reusable interview round definition.",
    api: { search: searchInterviewTypes, getById: getInterviewTypeById, create: createInterviewType, update: updateInterviewType, remove: deleteInterviewType },
    lookups: { designationId: asOptions(getAllDesignations, "designationName") },
    sections: [{ id: "details", title: "Details" }, { id: "status", title: "Status" }],
    fields: [
        { name: "interviewTypeName", icon: Type01, label: "Interview Type Name", required: true, section: "details", error: "Interview Type Name is required!", placeholder: "e.g. Technical Round 1" },
        { name: "designationId", icon: User01, label: "Designation", type: "select", section: "details", optionsFrom: "designationId" },
        { name: "expectedAverageRating", label: "Expected Average Rating", type: "number", section: "details", placeholder: "0-5" },
        ACTIVE,
    ],
    columns: [
        { name: "Interview Type", selector: (row) => row.interviewTypeName, minWidth: "180px" },
        { name: "Status", selector: (row) => (row.isActive ? "Active" : "Inactive"), minWidth: "130px" },
    ],
    recordTitle: (r) => r.interviewTypeName,
    toForm: (data) => ({ ...data, designationId: refId(data.designationId) }),
};

export const jobOfferTermTemplateConfig = {
    filterFields: [
        { name: "templateName", label: "Template Name", type: "string" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "job-offer-term-template",
    path: "/job-offer-term-template",
    section: "Recruitment",
    singular: "Job Offer Term Template",
    plural: "Job Offer Term Templates",
    description: "A reusable set of Job Offer terms.",
    api: { search: searchJobOfferTermTemplates, getById: getJobOfferTermTemplateById, create: createJobOfferTermTemplate, update: updateJobOfferTermTemplate, remove: deleteJobOfferTermTemplate },
    sections: [{ id: "details", title: "Details" }, { id: "status", title: "Status" }],
    fields: [
        { name: "templateName", icon: Type01, label: "Template Name", required: true, section: "details", error: "Template Name is required!", placeholder: "Enter template name" },
        ACTIVE,
    ],
    columns: [
        { name: "Template Name", selector: (row) => row.templateName, minWidth: "180px" },
        { name: "Status", selector: (row) => (row.isActive ? "Active" : "Inactive"), minWidth: "130px" },
    ],
    recordTitle: (r) => r.templateName,
};

export const jobRequisitionConfig = {
    filterFields: [
        { name: "designationId", label: "Designation", type: "objectId" },
        { name: "departmentId", label: "Department", type: "objectId" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "status", label: "Status", type: "enum" },
        { name: "requestedById", label: "Requested By", type: "objectId" },
        { name: "postingDate", label: "Posting Date", type: "date" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "job-requisition",
    path: "/job-requisition",
    section: "Recruitment",
    singular: "Job Requisition",
    plural: "Job Requisitions",
    description: "A headcount request — the first stage of the hiring funnel.",
    api: { search: searchJobRequisitions, getById: getJobRequisitionById, create: createJobRequisition, update: updateJobRequisition, remove: deleteJobRequisition },
    lookups: {
        designationId: asOptions(getAllDesignations, "designationName"),
        departmentId: asOptions(getAllDepartments, "departmentName"),
        companyId: asOptions(getAllCompanies, "companyName"),
        requestedById: employeeOptionsLoader,
    },
    sections: [{ id: "details", title: "Details" }, { id: "timeline", title: "Timeline" }, { id: "status", title: "Status" }],
    fields: [
        { name: "designationId", icon: User01, label: "Designation", type: "select", required: true, section: "details", error: "Designation is required!", optionsFrom: "designationId" },
        { name: "departmentId", icon: Building07, label: "Department", type: "select", section: "details", optionsFrom: "departmentId" },
        { name: "companyId", icon: Building07, label: "Company", type: "select", required: true, section: "details", error: "Company is required!", optionsFrom: "companyId" },
        { name: "requestedById", icon: User01, label: "Requested By", type: "select", required: true, section: "details", error: "Requested By is required!", optionsFrom: "requestedById" },
        { name: "noOfPositions", icon: Hash02, label: "No. of Positions", type: "number", required: true, section: "details", error: "No. of Positions is required!" },
        { name: "expectedCompensation", label: "Expected Compensation", type: "number", required: true, section: "details", error: "Expected Compensation is required!" },
        { name: "description", label: "Job Description", type: "textarea", section: "details" },
        { name: "reasonForRequesting", label: "Reason for Requesting", type: "textarea", section: "details" },

        { name: "postingDate", label: "Posting Date", type: "date", section: "timeline" },
        { name: "expectedBy", label: "Expected By", type: "date", section: "timeline" },
        { name: "completedOn", label: "Completed On", type: "date", section: "timeline" },

        {
            name: "status", label: "Status", type: "select", section: "status",
            options: ["Pending", "Open & Approved", "Rejected", "Filled", "On Hold", "Cancelled"].map((v) => ({ value: v, label: v })),
        },
        ACTIVE,
    ],
    columns: [
        { name: "Designation", selector: (row) => row.designationName ?? "—", minWidth: "160px" },
        { name: "Company", selector: (row) => row.companyName ?? "—", minWidth: "160px" },
        { name: "Positions", selector: (row) => row.noOfPositions, minWidth: "100px" },
        { name: "Status", selector: (row) => row.status, minWidth: "140px" },
    ],
    recordTitle: (r) => `Requisition — ${r.designationName ?? r.designationId}`,
    toForm: (data) => ({
        ...data,
        designationId: refId(data.designationId), departmentId: refId(data.departmentId),
        companyId: refId(data.companyId), requestedById: refId(data.requestedById),
    }),
};

export const jobOpeningConfig = {
    filterFields: [
        { name: "jobTitle", label: "Job Title", type: "string" },
        { name: "designationId", label: "Designation", type: "objectId" },
        { name: "status", label: "Status", type: "enum" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "departmentId", label: "Department", type: "objectId" },
        { name: "employmentTypeId", label: "Employment Type", type: "objectId" },
        { name: "branchId", label: "Location", type: "objectId" },
        { name: "publish", label: "Published", type: "boolean" },
        { name: "postedOn", label: "Posted On", type: "date" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "job-opening",
    path: "/job-opening",
    section: "Recruitment",
    singular: "Job Opening",
    plural: "Job Openings",
    description: "A vacancy posting — publish it to list it on the public job board.",
    api: { search: searchJobOpenings, getById: getJobOpeningById, create: createJobOpening, update: updateJobOpening, remove: deleteJobOpening },
    lookups: {
        designationId: asOptions(getAllDesignations, "designationName"),
        companyId: asOptions(getAllCompanies, "companyName"),
        departmentId: asOptions(getAllDepartments, "departmentName"),
        employmentTypeId: asOptions(getAllEmploymentTypes, "employmentTypeName"),
        branchId: asOptions(getAllBranches, "branchName"),
    },
    sections: [{ id: "details", title: "Details" }, { id: "publishing", title: "Publishing" }, { id: "pay", title: "Pay details" }, { id: "status", title: "Status" }],
    fields: [
        { name: "jobTitle", icon: Type01, label: "Job Title", required: true, section: "details", error: "Job Title is required!", placeholder: "Enter job title" },
        { name: "designationId", icon: User01, label: "Designation", type: "select", required: true, section: "details", error: "Designation is required!", optionsFrom: "designationId" },
        { name: "companyId", icon: Building07, label: "Company", type: "select", required: true, section: "details", error: "Company is required!", optionsFrom: "companyId" },
        { name: "departmentId", icon: Building07, label: "Department", type: "select", section: "details", optionsFrom: "departmentId" },
        { name: "employmentTypeId", icon: Tag01, label: "Employment Type", type: "select", section: "details", optionsFrom: "employmentTypeId" },
        { name: "branchId", icon: MarkerPin01, label: "Location", type: "select", section: "details", optionsFrom: "branchId" },
        { name: "description", label: "Job Description", type: "textarea", section: "details" },
        {
            name: "status", label: "Status", type: "select", section: "details",
            options: [{ value: "Open", label: "Open" }, { value: "Closed", label: "Closed" }],
        },
        { name: "closesOn", label: "Closes On", type: "date", section: "details" },

        { name: "publish", label: "Publish on job board", type: "checkbox", section: "publishing" },
        { name: "preventDuplicateApplicant", label: "Prevent duplicate applications", type: "checkbox", section: "publishing" },
        { name: "publishSalaryRange", label: "Publish salary range", type: "checkbox", section: "publishing" },
        { name: "publishApplicationsReceived", label: "Publish applications-received count", type: "checkbox", section: "publishing" },

        { name: "currency", label: "Currency", section: "pay", placeholder: "e.g. USD" },
        { name: "lowerRange", label: "Lower Range", type: "number", section: "pay" },
        { name: "upperRange", label: "Upper Range", type: "number", section: "pay" },
        { name: "salaryPer", label: "Salary Per", type: "select", section: "pay", options: [{ value: "Month", label: "Month" }, { value: "Year", label: "Year" }] },

        ACTIVE,
    ],
    columns: [
        { name: "Job Title", selector: (row) => row.jobTitle, minWidth: "180px" },
        { name: "Company", selector: (row) => row.companyName ?? "—", minWidth: "150px" },
        { name: "Status", selector: (row) => row.status, minWidth: "110px" },
        { name: "Published", selector: (row) => (row.publish ? "Yes" : "No"), minWidth: "100px" },
    ],
    recordTitle: (r) => r.jobTitle,
    toForm: (data) => ({
        ...data,
        designationId: refId(data.designationId), companyId: refId(data.companyId),
        departmentId: refId(data.departmentId), employmentTypeId: refId(data.employmentTypeId),
        branchId: refId(data.branchId),
    }),
};

export const jobApplicantConfig = {
    filterFields: [
        { name: "applicantName", label: "Applicant Name", type: "string" },
        { name: "emailId", label: "Email", type: "string" },
        { name: "jobOpeningId", label: "Job Opening", type: "objectId" },
        { name: "designationId", label: "Designation", type: "objectId" },
        { name: "status", label: "Status", type: "enum" },
        { name: "sourceId", label: "Source", type: "objectId" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "job-applicant",
    path: "/job-applicant",
    section: "Recruitment",
    singular: "Job Applicant",
    plural: "Job Applicants",
    description: "A candidate's application.",
    api: { search: searchJobApplicants, getById: getJobApplicantById, create: createJobApplicant, update: updateJobApplicant, remove: deleteJobApplicant },
    lookups: {
        jobOpeningId: asOptions(getAllJobOpenings, "jobTitle"),
        designationId: asOptions(getAllDesignations, "designationName"),
        sourceId: asOptions(getAllJobApplicantSources, "sourceName"),
    },
    sections: [{ id: "details", title: "Details" }, { id: "resume", title: "Resume" }, { id: "salary", title: "Salary Expectation" }, { id: "status", title: "Status" }],
    fields: [
        { name: "applicantName", icon: User01, label: "Applicant Name", section: "details", placeholder: "Auto-filled from email if left blank" },
        { name: "emailId", icon: Mail01, label: "Email Address", required: true, section: "details", error: "Email Address is required!", placeholder: "candidate@example.com" },
        { name: "phoneNumber", icon: Phone, label: "Phone Number", section: "details" },
        { name: "jobOpeningId", icon: Building07, label: "Job Opening", type: "select", section: "details", optionsFrom: "jobOpeningId" },
        { name: "designationId", icon: User01, label: "Designation", type: "select", section: "details", optionsFrom: "designationId" },
        { name: "sourceId", icon: Link01, label: "Source", type: "select", section: "details", optionsFrom: "sourceId" },
        {
            name: "status", label: "Status", type: "select", section: "status",
            options: ["Open", "Replied", "Shortlisted", "Rejected", "Hold", "Accepted"].map((v) => ({ value: v, label: v })),
        },
        { name: "applicantRating", label: "Applicant Rating", type: "number", section: "status", placeholder: "0-5" },

        { name: "resumeLink", label: "Resume Link", section: "resume", placeholder: "https://..." },
        { name: "coverLetter", label: "Cover Letter", type: "textarea", section: "resume" },
        { name: "notes", label: "Notes", type: "textarea", section: "resume" },

        { name: "currency", label: "Currency", section: "salary", placeholder: "e.g. USD" },
        { name: "lowerRange", label: "Lower Range", type: "number", section: "salary" },
        { name: "upperRange", label: "Upper Range", type: "number", section: "salary" },

        ACTIVE,
    ],
    columns: [
        { name: "Applicant Name", selector: (row) => row.applicantName, minWidth: "180px" },
        { name: "Email", selector: (row) => row.emailId, minWidth: "200px" },
        { name: "Job Opening", selector: (row) => row.jobOpeningTitle ?? "—", minWidth: "160px" },
        { name: "Status", selector: (row) => row.status, minWidth: "120px" },
    ],
    recordTitle: (r) => r.applicantName,
    toForm: (data) => ({ ...data, jobOpeningId: refId(data.jobOpeningId), designationId: refId(data.designationId), sourceId: refId(data.sourceId) }),
};

export const interviewConfig = {
    filterFields: [
        { name: "interviewTypeId", label: "Interview Type", type: "objectId" },
        { name: "jobApplicantId", label: "Job Applicant", type: "objectId" },
        { name: "designationId", label: "Designation", type: "objectId" },
        { name: "status", label: "Status", type: "enum" },
        { name: "scheduledOn", label: "Scheduled On", type: "date" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "interview",
    path: "/interview",
    section: "Recruitment",
    singular: "Interview",
    plural: "Interviews",
    description: "A scheduled interview round for a candidate.",
    api: { search: searchInterviews, getById: getInterviewById, create: createInterview, update: updateInterview, remove: deleteInterview },
    lookups: {
        interviewTypeId: asOptions(getAllInterviewTypes, "interviewTypeName"),
        jobApplicantId: asOptions(getAllJobApplicants, "applicantName"),
        designationId: asOptions(getAllDesignations, "designationName"),
    },
    sections: [{ id: "details", title: "Details" }, { id: "schedule", title: "Schedule" }, { id: "status", title: "Status" }],
    fields: [
        { name: "interviewTypeId", icon: Type01, label: "Interview Type", type: "select", required: true, section: "details", error: "Interview Type is required!", optionsFrom: "interviewTypeId" },
        { name: "jobApplicantId", icon: User01, label: "Job Applicant", type: "select", required: true, section: "details", error: "Job Applicant is required!", optionsFrom: "jobApplicantId" },
        { name: "designationId", icon: User01, label: "Designation", type: "select", section: "details", optionsFrom: "designationId" },
        { name: "interviewSummary", label: "Interview Summary", type: "textarea", section: "details" },

        { name: "scheduledOn", label: "Scheduled On", type: "date", required: true, section: "schedule", error: "Scheduled On is required!" },
        { name: "fromTime", label: "From Time", required: true, section: "schedule", error: "From Time is required!", placeholder: "HH:MM" },
        { name: "toTime", label: "To Time", required: true, section: "schedule", error: "To Time is required!", placeholder: "HH:MM" },

        {
            name: "status", label: "Status", type: "select", section: "status",
            options: ["Pending", "Under Review", "Cleared", "Rejected", "Cancelled"].map((v) => ({ value: v, label: v })),
        },
        ACTIVE,
    ],
    columns: [
        { name: "Job Applicant", selector: (row) => row.jobApplicantName ?? "—", minWidth: "170px" },
        { name: "Interview Type", selector: (row) => row.interviewTypeName ?? "—", minWidth: "170px" },
        { name: "Scheduled On", selector: (row) => row.scheduledOn?.slice?.(0, 10) ?? "—", minWidth: "130px" },
        { name: "Status", selector: (row) => row.status, minWidth: "120px" },
    ],
    recordTitle: (r) => `${r.jobApplicantName ?? "Interview"} — ${r.interviewTypeName ?? ""}`,
    toForm: (data) => ({ ...data, interviewTypeId: refId(data.interviewTypeId), jobApplicantId: refId(data.jobApplicantId), designationId: refId(data.designationId) }),
};

// Interview's own list rows carry no human-readable label (jobApplicantId
// is an id, not a name) — a small custom loader instead of asOptions.
const interviewOptionsLoader = () =>
    getAllInterviews().then((res) =>
        (res.data?.data ?? []).map((x) => ({ value: x._id, label: `Interview — ${x.scheduledOn?.slice?.(0, 10) ?? ""} (${x.status})` })));

export const interviewFeedbackConfig = {
    filterFields: [
        { name: "interviewId", label: "Interview", type: "objectId" },
        { name: "interviewerId", label: "Interviewer", type: "objectId" },
        { name: "result", label: "Result", type: "enum" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "interview-feedback",
    path: "/interview-feedback",
    section: "Recruitment",
    singular: "Interview Feedback",
    plural: "Interview Feedback",
    description: "A per-interviewer scorecard for one Interview.",
    api: { search: searchInterviewFeedbacks, getById: getInterviewFeedbackById, create: createInterviewFeedback, update: updateInterviewFeedback, remove: deleteInterviewFeedback },
    lookups: {
        interviewId: interviewOptionsLoader,
        interviewerId: asOptions(getAllUsers, "userName"),
    },
    sections: [{ id: "details", title: "Details" }, { id: "status", title: "Status" }],
    fields: [
        { name: "interviewId", icon: Type01, label: "Interview", type: "select", required: true, section: "details", error: "Interview is required!", optionsFrom: "interviewId" },
        { name: "interviewerId", icon: User01, label: "Interviewer", type: "select", required: true, section: "details", error: "Interviewer is required!", optionsFrom: "interviewerId" },
        {
            name: "result", label: "Result", type: "select", required: true, section: "details", error: "Result is required!",
            options: [{ value: "Cleared", label: "Cleared" }, { value: "Rejected", label: "Rejected" }],
        },
        { name: "feedback", label: "Feedback", type: "textarea", section: "details" },
        ACTIVE,
    ],
    columns: [
        { name: "Interviewer", selector: (row) => row.interviewerId, minWidth: "160px" },
        { name: "Result", selector: (row) => row.result, minWidth: "120px" },
    ],
    recordTitle: (r) => `Feedback — ${r.result ?? ""}`,
    toForm: (data) => ({ ...data, interviewId: refId(data.interviewId), interviewerId: refId(data.interviewerId) }),
};

export const jobOfferConfig = {
    filterFields: [
        { name: "jobApplicantId", label: "Job Applicant", type: "objectId" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "designationId", label: "Designation", type: "objectId" },
        { name: "status", label: "Status", type: "enum" },
        { name: "offerDate", label: "Offer Date", type: "date" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "job-offer",
    path: "/job-offer",
    section: "Recruitment",
    singular: "Job Offer",
    plural: "Job Offers",
    description: "A compensation/terms offer extended to a candidate.",
    api: { search: searchJobOffers, getById: getJobOfferById, create: createJobOffer, update: updateJobOffer, remove: deleteJobOffer },
    lookups: {
        jobApplicantId: asOptions(getAllJobApplicants, "applicantName"),
        companyId: asOptions(getAllCompanies, "companyName"),
        designationId: asOptions(getAllDesignations, "designationName"),
        jobOfferTermTemplateId: asOptions(getAllJobOfferTermTemplates, "templateName"),
    },
    sections: [{ id: "details", title: "Details" }, { id: "terms", title: "Terms" }, { id: "status", title: "Status" }],
    fields: [
        { name: "jobApplicantId", icon: User01, label: "Job Applicant", type: "select", required: true, section: "details", error: "Job Applicant is required!", optionsFrom: "jobApplicantId" },
        { name: "companyId", icon: Building07, label: "Company", type: "select", required: true, section: "details", error: "Company is required!", optionsFrom: "companyId" },
        { name: "designationId", icon: User01, label: "Designation", type: "select", section: "details", optionsFrom: "designationId" },
        { name: "offerDate", label: "Offer Date", type: "date", required: true, section: "details", error: "Offer Date is required!" },
        {
            name: "status", label: "Status", type: "select", section: "status",
            options: ["Awaiting Response", "Accepted", "Rejected", "Cancelled"].map((v) => ({ value: v, label: v })),
        },

        { name: "jobOfferTermTemplateId", icon: Type01, label: "Term Template", type: "select", section: "terms", optionsFrom: "jobOfferTermTemplateId" },
        { name: "terms", label: "Terms and Conditions", type: "textarea", section: "terms" },

        ACTIVE,
    ],
    columns: [
        { name: "Applicant", selector: (row) => row.applicantName ?? "—", minWidth: "170px" },
        { name: "Company", selector: (row) => row.companyName ?? "—", minWidth: "150px" },
        { name: "Offer Date", selector: (row) => row.offerDate?.slice?.(0, 10) ?? "—", minWidth: "120px" },
        { name: "Status", selector: (row) => row.status ?? "—", minWidth: "140px" },
    ],
    recordTitle: (r) => `Offer — ${r.applicantName ?? r.jobApplicantId}`,
    toForm: (data) => ({
        ...data, jobApplicantId: refId(data.jobApplicantId), companyId: refId(data.companyId),
        designationId: refId(data.designationId), jobOfferTermTemplateId: refId(data.jobOfferTermTemplateId),
    }),
};

// ---------------------------------------------------------------------------
// Onboarding & Separation (ADR-020). Activities/payables/receivables/assets
// are embedded arrays with no generic grid-field precedent in this admin —
// SimpleArrayField/SimpleActionButton (both new, module 4) fill that gap via
// the same `renderExtra` hook EmailTemplateMergeFields already uses.
// ---------------------------------------------------------------------------

const ACTIVITY_COLUMNS = [
    { name: "activityName", label: "Activity", type: "text" },
    { name: "description", label: "Description", type: "text" },
    { name: "status", label: "Status", type: "select", options: ["Pending", "Completed", "Cancelled"] },
    { name: "requiredForEmployeeCreation", label: "Required for hire", type: "checkbox" },
    { name: "beginOnDays", label: "Begin on (days)", type: "number" },
    { name: "durationDays", label: "Duration (days)", type: "number" },
];

export const employeeOnboardingTemplateConfig = {
    filterFields: [
        { name: "title", label: "Title", type: "string" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "employee-onboarding-template",
    path: "/employee-onboarding-template",
    section: "Onboarding & Separation",
    singular: "Onboarding Template",
    plural: "Onboarding Templates",
    description: "Reusable activity checklist for onboarding a new hire.",
    api: {
        search: searchEmployeeOnboardingTemplates, getById: getEmployeeOnboardingTemplateById,
        create: createEmployeeOnboardingTemplate, update: updateEmployeeOnboardingTemplate, remove: deleteEmployeeOnboardingTemplate,
    },
    lookups: {
        companyId: asOptions(getAllCompanies, "companyName"),
        departmentId: asOptions(getAllDepartments, "departmentName"),
        designationId: asOptions(getAllDesignations, "designationName"),
        employeeGradeId: asOptions(getAllEmployeeGrades, "gradeName"),
    },
    sections: [{ id: "details", title: "Details" }, { id: "activities", title: "Activities" }, { id: "status", title: "Status" }],
    fields: [
        { name: "title", icon: Type01, label: "Title", type: "text", required: true, section: "details", error: "Title is required!" },
        { name: "companyId", icon: Building07, label: "Company", type: "select", section: "details", optionsFrom: "companyId" },
        { name: "departmentId", label: "Department", type: "select", section: "details", optionsFrom: "departmentId" },
        { name: "designationId", label: "Designation", type: "select", section: "details", optionsFrom: "designationId" },
        { name: "employeeGradeId", label: "Employee Grade", type: "select", section: "details", optionsFrom: "employeeGradeId" },
        ACTIVE,
    ],
    renderExtra: ({ values, setValues }) => (
        <SimpleArrayField
            title="Activities" description="Copied into every Employee Onboarding created from this template."
            fieldName="activities" columns={ACTIVITY_COLUMNS} values={values} setValues={setValues}
        />
    ),
    columns: [
        { name: "Title", selector: (row) => row.title, minWidth: "220px" },
        { name: "Activities", selector: (row) => row.activities?.length ?? 0, minWidth: "100px" },
    ],
    recordTitle: (r) => r.title,
    toForm: (data) => ({
        ...data, companyId: refId(data.companyId), departmentId: refId(data.departmentId),
        designationId: refId(data.designationId), employeeGradeId: refId(data.employeeGradeId),
    }),
};

export const employeeOnboardingConfig = {
    filterFields: [
        { name: "jobApplicantId", label: "Job Applicant", type: "objectId" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "departmentId", label: "Department", type: "objectId" },
        { name: "boardingStatus", label: "Status", type: "enum" },
        { name: "dateOfJoining", label: "Date of Joining", type: "date" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "employee-onboarding",
    path: "/employee-onboarding",
    section: "Onboarding & Separation",
    singular: "Employee Onboarding",
    plural: "Employee Onboardings",
    description: "Checklist-driven process for bringing a new hire to Active status.",
    api: {
        search: searchEmployeeOnboardings, getById: getEmployeeOnboardingById,
        create: createEmployeeOnboarding, update: updateEmployeeOnboarding, remove: deleteEmployeeOnboarding,
    },
    lookups: {
        jobApplicantId: asOptions(getAllJobApplicants, "applicantName"),
        jobOfferId: asOptions(getAllJobOffers, "status"),
        employeeOnboardingTemplateId: asOptions(getAllEmployeeOnboardingTemplates, "title"),
        companyId: asOptions(getAllCompanies, "companyName"),
        departmentId: asOptions(getAllDepartments, "departmentName"),
        designationId: asOptions(getAllDesignations, "designationName"),
        employeeGradeId: asOptions(getAllEmployeeGrades, "gradeName"),
    },
    sections: [{ id: "details", title: "Details" }, { id: "activities", title: "Activities" }, { id: "actions", title: "Actions" }],
    fields: [
        { name: "jobApplicantId", icon: User01, label: "Job Applicant", type: "select", required: true, section: "details", error: "Job Applicant is required!", optionsFrom: "jobApplicantId" },
        { name: "jobOfferId", label: "Job Offer", type: "select", required: true, section: "details", error: "Job Offer is required!", optionsFrom: "jobOfferId" },
        { name: "employeeOnboardingTemplateId", label: "Template", type: "select", section: "details", optionsFrom: "employeeOnboardingTemplateId" },
        { name: "companyId", icon: Building07, label: "Company", type: "select", section: "details", optionsFrom: "companyId" },
        { name: "departmentId", label: "Department", type: "select", section: "details", optionsFrom: "departmentId" },
        { name: "designationId", label: "Designation", type: "select", section: "details", optionsFrom: "designationId" },
        { name: "employeeGradeId", label: "Employee Grade", type: "select", section: "details", optionsFrom: "employeeGradeId" },
        { name: "dateOfJoining", label: "Date of Joining", type: "date", required: true, section: "details", error: "Date of Joining is required!" },
        { name: "boardingBeginsOn", label: "Onboarding Begins On", type: "date", required: true, section: "details", error: "Onboarding Begins On is required!" },
        ACTIVE,
    ],
    renderExtra: ({ mode, id, values, setValues }) => (
        <>
            <SimpleArrayField
                title="Activities" description={`Status: ${values.boardingStatus ?? "Pending"} (derived from the activities below).`}
                fieldName="activities" columns={ACTIVITY_COLUMNS} values={values} setValues={setValues}
            />
            {mode === "edit" && id && (
                <>
                    <SimpleActionButton
                        label="Mark as Completed" description="Marks every activity, and this onboarding, Completed."
                        onRun={() => markOnboardingAsCompleted(id)}
                        onResult={() => window.location.reload()}
                    />
                    <SimpleActionButton
                        label="Create Employee" description="Builds a prefilled Employee record from this onboarding (once every required activity is Completed) — review and save it on the Employee screen."
                        onRun={() => makeEmployeeFromOnboarding(id)}
                    />
                </>
            )}
        </>
    ),
    columns: [
        { name: "Applicant", selector: (row) => row.employeeName ?? "—", minWidth: "170px" },
        { name: "Status", selector: (row) => row.boardingStatus ?? "—", minWidth: "120px" },
        { name: "Date of Joining", selector: (row) => row.dateOfJoining?.slice?.(0, 10) ?? "—", minWidth: "130px" },
    ],
    recordTitle: (r) => `Onboarding — ${r.employeeName ?? r.jobApplicantId}`,
    toForm: (data) => ({
        ...data, jobApplicantId: refId(data.jobApplicantId), jobOfferId: refId(data.jobOfferId),
        employeeOnboardingTemplateId: refId(data.employeeOnboardingTemplateId), companyId: refId(data.companyId),
        departmentId: refId(data.departmentId), designationId: refId(data.designationId), employeeGradeId: refId(data.employeeGradeId),
    }),
};

export const employeeSeparationTemplateConfig = {
    filterFields: [
        { name: "title", label: "Title", type: "string" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "employee-separation-template",
    path: "/employee-separation-template",
    section: "Onboarding & Separation",
    singular: "Separation Template",
    plural: "Separation Templates",
    description: "Reusable activity checklist for relieving an employee.",
    api: {
        search: searchEmployeeSeparationTemplates, getById: getEmployeeSeparationTemplateById,
        create: createEmployeeSeparationTemplate, update: updateEmployeeSeparationTemplate, remove: deleteEmployeeSeparationTemplate,
    },
    lookups: {
        companyId: asOptions(getAllCompanies, "companyName"),
        departmentId: asOptions(getAllDepartments, "departmentName"),
        designationId: asOptions(getAllDesignations, "designationName"),
        employeeGradeId: asOptions(getAllEmployeeGrades, "gradeName"),
    },
    sections: [{ id: "details", title: "Details" }, { id: "activities", title: "Activities" }, { id: "status", title: "Status" }],
    fields: [
        { name: "title", icon: Type01, label: "Title", type: "text", required: true, section: "details", error: "Title is required!" },
        { name: "companyId", icon: Building07, label: "Company", type: "select", section: "details", optionsFrom: "companyId" },
        { name: "departmentId", label: "Department", type: "select", section: "details", optionsFrom: "departmentId" },
        { name: "designationId", label: "Designation", type: "select", section: "details", optionsFrom: "designationId" },
        { name: "employeeGradeId", label: "Employee Grade", type: "select", section: "details", optionsFrom: "employeeGradeId" },
        ACTIVE,
    ],
    renderExtra: ({ values, setValues }) => (
        <SimpleArrayField
            title="Activities" description="Copied into every Employee Separation created from this template."
            fieldName="activities" columns={ACTIVITY_COLUMNS} values={values} setValues={setValues}
        />
    ),
    columns: [
        { name: "Title", selector: (row) => row.title, minWidth: "220px" },
        { name: "Activities", selector: (row) => row.activities?.length ?? 0, minWidth: "100px" },
    ],
    recordTitle: (r) => r.title,
    toForm: (data) => ({
        ...data, companyId: refId(data.companyId), departmentId: refId(data.departmentId),
        designationId: refId(data.designationId), employeeGradeId: refId(data.employeeGradeId),
    }),
};

export const employeeSeparationConfig = {
    filterFields: [
        { name: "employeeId", label: "Employee", type: "objectId" },
        { name: "boardingStatus", label: "Status", type: "enum" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "employee-separation",
    path: "/employee-separation",
    section: "Onboarding & Separation",
    singular: "Employee Separation",
    plural: "Employee Separations",
    description: "Checklist-driven process for relieving an employee.",
    api: {
        search: searchEmployeeSeparations, getById: getEmployeeSeparationById,
        create: createEmployeeSeparation, update: updateEmployeeSeparation, remove: deleteEmployeeSeparation,
    },
    lookups: {
        employeeId: asOptions(getAllEmployees, "employeeName"),
        employeeSeparationTemplateId: asOptions(getAllEmployeeSeparationTemplates, "title"),
    },
    sections: [{ id: "details", title: "Details" }, { id: "activities", title: "Activities" }],
    fields: [
        { name: "employeeId", icon: User01, label: "Employee", type: "select", required: true, section: "details", error: "Employee is required!", optionsFrom: "employeeId" },
        { name: "employeeSeparationTemplateId", label: "Template", type: "select", section: "details", optionsFrom: "employeeSeparationTemplateId" },
        { name: "boardingBeginsOn", label: "Separation Begins On", type: "date", required: true, section: "details", error: "Separation Begins On is required!" },
        { name: "exitInterviewSummary", label: "Exit Interview Summary (notes only — not linked to Exit Interview records)", type: "textarea", section: "details" },
        ACTIVE,
    ],
    renderExtra: ({ values, setValues }) => (
        <SimpleArrayField
            title="Activities" description={`Status: ${values.boardingStatus ?? "Pending"} (derived from the activities below).`}
            fieldName="activities" columns={ACTIVITY_COLUMNS} values={values} setValues={setValues}
        />
    ),
    columns: [
        { name: "Employee", selector: (row) => row.employeeName ?? "—", minWidth: "170px" },
        { name: "Status", selector: (row) => row.boardingStatus ?? "—", minWidth: "120px" },
    ],
    recordTitle: (r) => `Separation — ${r.employeeName ?? r.employeeId}`,
    toForm: (data) => ({
        ...data, employeeId: refId(data.employeeId), employeeSeparationTemplateId: refId(data.employeeSeparationTemplateId),
    }),
};

export const exitInterviewConfig = {
    filterFields: [
        { name: "employeeId", label: "Employee", type: "objectId" },
        { name: "status", label: "Status", type: "enum" },
        { name: "date", label: "Date", type: "date" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "exit-interview",
    path: "/exit-interview",
    section: "Onboarding & Separation",
    singular: "Exit Interview",
    plural: "Exit Interviews",
    description: "Standalone exit feedback capture — the linked Employee must have a Relieving Date set first.",
    api: {
        search: searchExitInterviews, getById: getExitInterviewById,
        create: createExitInterview, update: updateExitInterview, remove: deleteExitInterview,
    },
    lookups: {
        employeeId: asOptions(getAllEmployees, "employeeName"),
        interviewers: asOptions(getAllEmployees, "employeeName"),
    },
    sections: [{ id: "details", title: "Details" }],
    fields: [
        { name: "employeeId", icon: User01, label: "Employee", type: "select", required: true, section: "details", error: "Employee is required!", optionsFrom: "employeeId" },
        {
            name: "status", label: "Status", type: "select", section: "details",
            options: ["Pending", "Scheduled", "Completed", "Cancelled"].map((v) => ({ value: v, label: v })),
        },
        { name: "date", label: "Date", type: "date", section: "details" },
        { name: "interviewSummary", label: "Interview Summary", type: "textarea", section: "details" },
        {
            name: "employeeStatus", label: "Final Decision", type: "select", section: "details",
            options: ["Employee Retained", "Exit Confirmed"].map((v) => ({ value: v, label: v })),
        },
        ACTIVE,
    ],
    columns: [
        { name: "Employee", selector: (row) => row.employeeName ?? "—", minWidth: "170px" },
        { name: "Status", selector: (row) => row.status ?? "—", minWidth: "120px" },
        { name: "Date", selector: (row) => row.date?.slice?.(0, 10) ?? "—", minWidth: "120px" },
    ],
    recordTitle: (r) => `Exit Interview — ${r.employeeName ?? r.employeeId}`,
    toForm: (data) => ({ ...data, employeeId: refId(data.employeeId) }),
};

const OUTSTANDING_LINE_COLUMNS = [
    { name: "component", label: "Component", type: "text" },
    { name: "description", label: "Description", type: "text" },
    { name: "amount", label: "Amount", type: "number" },
    { name: "status", label: "Status", type: "select", options: ["Settled", "Unsettled"] },
];
const ASSET_COLUMNS = [
    { name: "assetName", label: "Asset", type: "text" },
    { name: "action", label: "Action", type: "select", options: ["Return", "Recover Cost"] },
    { name: "cost", label: "Cost (Recover Cost only)", type: "number" },
    { name: "status", label: "Status", type: "select", options: ["Owned", "Returned"] },
];

export const fullAndFinalStatementConfig = {
    filterFields: [
        { name: "employeeId", label: "Employee", type: "objectId" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "status", label: "Status", type: "enum" },
        { name: "transactionDate", label: "Transaction Date", type: "date" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "full-and-final-statement",
    path: "/full-and-final-statement",
    section: "Onboarding & Separation",
    singular: "Full and Final Statement",
    plural: "Full and Final Statements",
    description: "A manually entered final-settlement worksheet — not an accounting document (ADR-020). The Employee must have a Relieving Date set first.",
    api: {
        search: searchFullAndFinalStatements, getById: getFullAndFinalStatementById,
        create: createFullAndFinalStatement, update: updateFullAndFinalStatement, remove: deleteFullAndFinalStatement,
    },
    lookups: { employeeId: asOptions(getAllEmployees, "employeeName") },
    sections: [
        { id: "details", title: "Details" }, { id: "payables", title: "Payables" },
        { id: "receivables", title: "Receivables" }, { id: "assets", title: "Assets" }, { id: "actions", title: "Actions" },
    ],
    fields: [
        { name: "employeeId", icon: User01, label: "Employee", type: "select", required: true, section: "details", error: "Employee is required!", optionsFrom: "employeeId" },
        { name: "transactionDate", label: "Transaction Date", type: "date", required: true, section: "details", error: "Transaction Date is required!" },
    ],
    renderExtra: ({ mode, id, values, setValues }) => (
        <>
            <SimpleArrayField title="Payables" description={`Total payable: ${values.totalPayableAmount ?? 0}`} fieldName="payables" columns={OUTSTANDING_LINE_COLUMNS} values={values} setValues={setValues} />
            <SimpleArrayField title="Receivables" description={`Total receivable: ${values.totalReceivableAmount ?? 0} (includes asset recovery cost)`} fieldName="receivables" columns={OUTSTANDING_LINE_COLUMNS} values={values} setValues={setValues} />
            <SimpleArrayField title="Assets Allocated" description={`Total asset recovery cost: ${values.totalAssetRecoveryCost ?? 0}`} fieldName="assetsAllocated" columns={ASSET_COLUMNS} values={values} setValues={setValues} />
            {mode === "edit" && id && (
                <SimpleActionButton
                    label="Mark as Paid" description={`Status: ${values.status ?? "Unpaid"}. Blocked until every payable/receivable is Settled and every returned asset is Returned.`}
                    onRun={() => markStatementAsPaid(id)}
                    onResult={() => window.location.reload()}
                />
            )}
        </>
    ),
    columns: [
        { name: "Employee", selector: (row) => row.employeeName ?? "—", minWidth: "170px" },
        { name: "Status", selector: (row) => row.status ?? "—", minWidth: "110px" },
        { name: "Payable", selector: (row) => row.totalPayableAmount ?? 0, minWidth: "100px" },
        { name: "Receivable", selector: (row) => row.totalReceivableAmount ?? 0, minWidth: "100px" },
    ],
    recordTitle: (r) => `F&F Statement — ${r.employeeName ?? r.employeeId}`,
    toForm: (data) => ({ ...data, employeeId: refId(data.employeeId) }),
};

// ---------------------------------------------------------- HRMS module 5 (ADR-021) --

export const grievanceTypeConfig = {
    filterFields: [
        { name: "grievanceTypeName", label: "Name", type: "string" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "grievance-type",
    path: "/grievance-type",
    section: "Employee Career Events",
    singular: "Grievance Type",
    plural: "Grievance Types",
    api: {
        search: searchGrievanceTypes, getById: getGrievanceTypeById,
        create: createGrievanceType, update: updateGrievanceType, remove: deleteGrievanceType,
    },
    fields: [
        { name: "grievanceTypeName", icon: Tag01, label: "Name", type: "text", required: true, section: "details", error: "Name is required!" },
        { name: "description", label: "Description", type: "textarea", section: "details" },
        ACTIVE,
    ],
    columns: [
        { name: "Name", selector: (row) => row.grievanceTypeName, minWidth: "200px" },
        { name: "Active", selector: (row) => (row.isActive ? "Yes" : "No"), minWidth: "90px" },
    ],
    recordTitle: (r) => r.grievanceTypeName,
};

export const employeeGrievanceConfig = {
    filterFields: [
        { name: "raisedByEmployeeId", label: "Raised By", type: "objectId" },
        { name: "grievanceTypeId", label: "Grievance Type", type: "objectId" },
        { name: "status", label: "Status", type: "enum" },
        { name: "date", label: "Date", type: "date" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "employee-grievance",
    path: "/employee-grievance",
    section: "Employee Career Events",
    singular: "Employee Grievance",
    plural: "Employee Grievances",
    description: "Cause of Grievance is required once Investigated/Resolved; Resolved By, Resolution Date and Resolution Detail are required once Resolved.",
    api: {
        search: searchEmployeeGrievances, getById: getEmployeeGrievanceById,
        create: createEmployeeGrievance, update: updateEmployeeGrievance, remove: deleteEmployeeGrievance,
    },
    lookups: {
        raisedByEmployeeId: asOptions(getAllEmployees, "employeeName"),
        grievanceAgainstEmployeeId: asOptions(getAllEmployees, "employeeName"),
        employeeResponsibleId: asOptions(getAllEmployees, "employeeName"),
        grievanceTypeId: asOptions(getAllGrievanceTypes, "grievanceTypeName"),
    },
    sections: [{ id: "details", title: "Details" }, { id: "investigation", title: "Investigation & Resolution" }],
    fields: [
        { name: "subject", icon: Type01, label: "Subject", type: "text", required: true, section: "details", error: "Subject is required!" },
        { name: "raisedByEmployeeId", icon: User01, label: "Raised By", type: "select", required: true, section: "details", error: "Raised By is required!", optionsFrom: "raisedByEmployeeId" },
        { name: "date", label: "Date", type: "date", required: true, section: "details", error: "Date is required!" },
        { name: "status", label: "Status", type: "select", options: ["Open", "Investigated", "Resolved", "Invalid", "Cancelled"], default: "Open", section: "details" },
        { name: "grievanceTypeId", label: "Grievance Type", type: "select", required: true, section: "details", error: "Grievance Type is required!", optionsFrom: "grievanceTypeId" },
        { name: "grievanceAgainstEmployeeId", label: "Grievance Against (Employee)", type: "select", section: "details", optionsFrom: "grievanceAgainstEmployeeId" },
        { name: "grievanceAgainstText", label: "Grievance Against (free text, if not a specific employee)", type: "text", section: "details" },
        { name: "description", label: "Description", type: "textarea", required: true, section: "details", error: "Description is required!" },
        { name: "causeOfGrievance", label: "Cause of Grievance", type: "textarea", section: "investigation" },
        { name: "resolvedByUserId", label: "Resolved By (User id)", type: "text", section: "investigation" },
        { name: "resolutionDate", label: "Resolution Date", type: "date", section: "investigation" },
        { name: "resolutionDetail", label: "Resolution Detail", type: "textarea", section: "investigation" },
        { name: "employeeResponsibleId", label: "Employee Responsible", type: "select", section: "investigation", optionsFrom: "employeeResponsibleId" },
        ACTIVE,
    ],
    columns: [
        { name: "Subject", selector: (row) => row.subject, minWidth: "200px" },
        { name: "Status", selector: (row) => row.status, minWidth: "110px" },
        { name: "Date", selector: (row) => row.date?.slice?.(0, 10) ?? "—", minWidth: "110px" },
    ],
    recordTitle: (r) => r.subject,
    toForm: (data) => ({
        ...data,
        raisedByEmployeeId: refId(data.raisedByEmployeeId),
        grievanceAgainstEmployeeId: refId(data.grievanceAgainstEmployeeId),
        grievanceTypeId: refId(data.grievanceTypeId),
        employeeResponsibleId: refId(data.employeeResponsibleId),
    }),
};

const PROPERTY_CHANGE_NOTE = "Any changes you set below are applied to the Employee record and logged on creation — this record cannot be edited afterward, only deleted.";

export const employeeTransferConfig = {
    filterFields: [
        { name: "employeeId", label: "Employee", type: "objectId" },
        { name: "transferDate", label: "Transfer Date", type: "date" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "employee-transfer",
    path: "/employee-transfer",
    section: "Employee Career Events",
    singular: "Employee Transfer",
    plural: "Employee Transfers",
    description: `Only Active employees can be transferred. Same-company only — inter-company transfer is not supported. ${PROPERTY_CHANGE_NOTE}`,
    api: {
        search: searchEmployeeTransfers, getById: getEmployeeTransferById,
        create: createEmployeeTransfer, remove: deleteEmployeeTransfer,
    },
    lookups: {
        employeeId: asOptions(getAllEmployees, "employeeName"),
        newDepartmentId: asOptions(getAllDepartments, "departmentName"),
        newDesignationId: asOptions(getAllDesignations, "designationName"),
        newBranchId: asOptions(getAllBranches, "branchName"),
    },
    fields: [
        { name: "employeeId", icon: User01, label: "Employee", type: "select", required: true, section: "details", error: "Employee is required!", optionsFrom: "employeeId" },
        { name: "transferDate", label: "Transfer Date", type: "date", required: true, section: "details", error: "Transfer Date is required!" },
        { name: "newDepartmentId", label: "New Department", type: "select", section: "details", optionsFrom: "newDepartmentId" },
        { name: "newDesignationId", label: "New Designation", type: "select", section: "details", optionsFrom: "newDesignationId" },
        { name: "newBranchId", label: "New Branch", type: "select", section: "details", optionsFrom: "newBranchId" },
        ACTIVE,
    ],
    columns: [
        { name: "Transfer Date", selector: (row) => row.transferDate?.slice?.(0, 10) ?? "—", minWidth: "130px" },
    ],
    recordTitle: (r) => `Transfer — ${r._id}`,
    toForm: (data) => ({ ...data, employeeId: refId(data.employeeId) }),
};

export const employeePromotionConfig = {
    filterFields: [
        { name: "employeeId", label: "Employee", type: "objectId" },
        { name: "promotionDate", label: "Promotion Date", type: "date" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "employee-promotion",
    path: "/employee-promotion",
    section: "Employee Career Events",
    singular: "Employee Promotion",
    plural: "Employee Promotions",
    description: `Blocked for Inactive employees. Current CTC is fetched from the Employee once, and never overwritten by a later fetch once entered. ${PROPERTY_CHANGE_NOTE}`,
    api: {
        search: searchEmployeePromotions, getById: getEmployeePromotionById,
        create: createEmployeePromotion, remove: deleteEmployeePromotion,
    },
    lookups: {
        employeeId: asOptions(getAllEmployees, "employeeName"),
        newDepartmentId: asOptions(getAllDepartments, "departmentName"),
        newDesignationId: asOptions(getAllDesignations, "designationName"),
        newGradeId: asOptions(getAllEmployeeGrades, "gradeName"),
    },
    fields: [
        { name: "employeeId", icon: User01, label: "Employee", type: "select", required: true, section: "details", error: "Employee is required!", optionsFrom: "employeeId" },
        { name: "promotionDate", label: "Promotion Date", type: "date", required: true, section: "details", error: "Promotion Date is required!" },
        { name: "newDepartmentId", label: "New Department", type: "select", section: "details", optionsFrom: "newDepartmentId" },
        { name: "newDesignationId", label: "New Designation", type: "select", section: "details", optionsFrom: "newDesignationId" },
        { name: "newGradeId", label: "New Grade", type: "select", section: "details", optionsFrom: "newGradeId" },
        { name: "currentCtc", label: "Current CTC (leave blank to fetch from Employee)", type: "number", section: "details" },
        { name: "revisedCtc", label: "Revised CTC", type: "number", section: "details" },
        ACTIVE,
    ],
    columns: [
        { name: "Promotion Date", selector: (row) => row.promotionDate?.slice?.(0, 10) ?? "—", minWidth: "130px" },
        { name: "Revised CTC", selector: (row) => row.revisedCtc ?? "—", minWidth: "110px" },
    ],
    recordTitle: (r) => `Promotion — ${r._id}`,
    toForm: (data) => ({ ...data, employeeId: refId(data.employeeId) }),
};

export const employeeReferralConfig = {
    filterFields: [
        { name: "status", label: "Status", type: "enum" },
        { name: "referrerId", label: "Referrer", type: "objectId" },
        { name: "forDesignationId", label: "For Designation", type: "objectId" },
        { name: "date", label: "Date", type: "date" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "employee-referral",
    path: "/employee-referral",
    section: "Employee Career Events",
    singular: "Employee Referral",
    plural: "Employee Referrals",
    api: {
        search: searchEmployeeReferrals, getById: getEmployeeReferralById,
        create: createEmployeeReferral, update: updateEmployeeReferral, remove: deleteEmployeeReferral,
    },
    lookups: {
        referrerId: asOptions(getAllEmployees, "employeeName"),
        forDesignationId: asOptions(getAllDesignations, "designationName"),
    },
    sections: [{ id: "details", title: "Details" }, { id: "actions", title: "Actions" }],
    fields: [
        { name: "firstName", icon: User01, label: "First Name", type: "text", required: true, section: "details", error: "First Name is required!" },
        { name: "lastName", label: "Last Name", type: "text", required: true, section: "details", error: "Last Name is required!" },
        { name: "email", icon: Mail01, label: "Email", type: "text", required: true, section: "details", error: "Email is required!", validate: (v) => (isValidEmail(v) ? undefined : "Enter a valid email") },
        { name: "contactNo", icon: Phone, label: "Contact No.", type: "text", section: "details" },
        { name: "currentEmployer", label: "Current Employer", type: "text", section: "details" },
        { name: "currentJobTitle", label: "Current Job Title", type: "text", section: "details" },
        { name: "date", label: "Date", type: "date", required: true, section: "details", error: "Date is required!" },
        { name: "status", label: "Status", type: "select", options: ["Pending", "In Process", "Accepted", "Rejected", "Cancelled"], default: "Pending", section: "details" },
        { name: "forDesignationId", label: "For Designation", type: "select", required: true, section: "details", error: "Designation is required!", optionsFrom: "forDesignationId" },
        { name: "referrerId", label: "Referrer", type: "select", required: true, section: "details", error: "Referrer is required!", optionsFrom: "referrerId" },
        { name: "resumeLink", label: "Resume Link", type: "text", section: "details" },
        { name: "workReferences", label: "Work References", type: "textarea", section: "details" },
        { name: "qualificationReason", label: "Why is this candidate qualified?", type: "textarea", section: "details" },
        { name: "isApplicableForReferralBonus", label: "Applicable for Referral Bonus", type: "checkbox", default: true, section: "details" },
        ACTIVE,
    ],
    renderExtra: ({ mode, id, values }) => (
        mode === "edit" && id && (
            <SimpleActionButton
                label="Create Job Applicant" description={`Status: ${values.status ?? "Pending"}. Creates a real Job Applicant from this referral and sets this record to In Process.`}
                onRun={() => createJobApplicantFromReferral(id)}
                onResult={() => window.location.reload()}
            />
        )
    ),
    columns: [
        { name: "Name", selector: (row) => row.fullName ?? `${row.firstName} ${row.lastName}`, minWidth: "170px" },
        { name: "Status", selector: (row) => row.status, minWidth: "110px" },
        { name: "Email", selector: (row) => row.email, minWidth: "180px" },
    ],
    recordTitle: (r) => r.fullName ?? `${r.firstName} ${r.lastName}`,
    toForm: (data) => ({ ...data, referrerId: refId(data.referrerId), forDesignationId: refId(data.forDesignationId) }),
};

const STAFFING_DETAIL_COLUMNS = [
    { name: "designationId", label: "Designation (id)", type: "text" },
    { name: "vacancies", label: "Vacancies", type: "number" },
    { name: "estimatedCostPerPosition", label: "Est. Cost / Position", type: "number" },
];

export const staffingPlanConfig = {
    filterFields: [
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "departmentId", label: "Department", type: "objectId" },
        { name: "fromDate", label: "From Date", type: "date" },
        { name: "toDate", label: "To Date", type: "date" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "staffing-plan",
    path: "/staffing-plan",
    section: "Employee Career Events",
    singular: "Staffing Plan",
    plural: "Staffing Plans",
    description: "Blocks a second active plan for the same company + designation in an overlapping date range. Designation rows use the Designation's id (no company-hierarchy validation — this project's companies are a flat list, not a tree, per ADR-021).",
    api: {
        search: searchStaffingPlans, getById: getStaffingPlanById,
        create: createStaffingPlan, update: updateStaffingPlan, remove: deleteStaffingPlan,
    },
    lookups: {
        companyId: asOptions(getAllCompanies, "companyName"),
        departmentId: asOptions(getAllDepartments, "departmentName"),
    },
    fields: [
        { name: "companyId", icon: Building07, label: "Company", type: "select", required: true, section: "details", error: "Company is required!", optionsFrom: "companyId" },
        { name: "departmentId", label: "Department", type: "select", section: "details", optionsFrom: "departmentId" },
        { name: "fromDate", label: "From Date", type: "date", required: true, section: "details", error: "From Date is required!" },
        { name: "toDate", label: "To Date", type: "date", required: true, section: "details", error: "To Date is required!" },
        ACTIVE,
    ],
    renderExtra: ({ values, setValues }) => (
        <SimpleArrayField
            title="Staffing Details" description={`Total estimated budget: ${values.totalEstimatedBudget ?? 0}. Paste a Designation's id into each row — current count/openings/positions/cost are computed on save.`}
            fieldName="staffingDetails" columns={STAFFING_DETAIL_COLUMNS} values={values} setValues={setValues}
        />
    ),
    columns: [
        { name: "From", selector: (row) => row.fromDate?.slice?.(0, 10) ?? "—", minWidth: "110px" },
        { name: "To", selector: (row) => row.toDate?.slice?.(0, 10) ?? "—", minWidth: "110px" },
        { name: "Budget", selector: (row) => row.totalEstimatedBudget ?? 0, minWidth: "110px" },
    ],
    recordTitle: (r) => `Staffing Plan — ${r._id}`,
    toForm: (data) => ({ ...data, companyId: refId(data.companyId), departmentId: refId(data.departmentId) }),
};

// ---------------------------------------------------------------------------
// Training & Skills (ADR-022). Training Result folds into TrainingEvent's
// own `employees[]` rows — markCompleted/markScheduled reproduce source's
// real on_update_after_submit cascade explicitly (no docstatus to trigger
// it). Designation/InterviewType/InterviewFeedback's Skill-ref retrofits
// (own commit) aren't given form fields here — no multi-select precedent in
// this admin beyond SimpleArrayField's row editor, which doesn't fit a bare
// ref array; left API-only, a follow-up if a screen actually needs it.
// ---------------------------------------------------------------------------

const TRAINING_EVENT_ATTENDEE_COLUMNS = [
    { name: "employeeId", label: "Employee id", type: "text" },
    { name: "isMandatory", label: "Mandatory", type: "checkbox" },
    { name: "attendance", label: "Attendance", type: "select", options: ["Present", "Absent"] },
    { name: "status", label: "Status", type: "select", options: ["Open", "Completed", "Feedback Submitted"] },
    { name: "hours", label: "Hours", type: "number" },
    { name: "grade", label: "Grade", type: "text" },
    { name: "comments", label: "Comments", type: "text" },
];

export const trainingProgramConfig = {
    filterFields: [
        { name: "trainingProgramName", label: "Name", type: "string" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "status", label: "Status", type: "enum" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "training-program",
    path: "/training-program",
    section: "Training & Skills",
    singular: "Training Program",
    plural: "Training Programs",
    api: {
        search: searchTrainingPrograms, getById: getTrainingProgramById,
        create: createTrainingProgram, update: updateTrainingProgram, remove: deleteTrainingProgram,
    },
    lookups: { companyId: asOptions(getAllCompanies, "companyName") },
    fields: [
        { name: "trainingProgramName", icon: Tag01, label: "Training Program Name", type: "string", required: true, section: "details", error: "Training Program Name is required!" },
        { name: "companyId", icon: Building07, label: "Company", type: "select", required: true, section: "details", error: "Company is required!", optionsFrom: "companyId" },
        { name: "status", label: "Status", type: "select", section: "details", options: ["Scheduled", "Completed", "Cancelled"] },
        { name: "trainerName", label: "Trainer Name", type: "string", section: "details" },
        { name: "trainerEmail", label: "Trainer Email", type: "string", section: "details" },
        { name: "supplierName", label: "Supplier", type: "string", section: "details" },
        { name: "contactNumber", label: "Contact Number", type: "string", section: "details" },
        { name: "description", label: "Description", type: "textarea", required: true, section: "details", error: "Description is required!" },
        ACTIVE,
    ],
    columns: [
        { name: "Name", selector: (row) => row.trainingProgramName, minWidth: "220px" },
        { name: "Status", selector: (row) => row.status, minWidth: "120px" },
    ],
    recordTitle: (r) => r.trainingProgramName,
    toForm: (data) => ({ ...data, companyId: refId(data.companyId) }),
};

export const trainingEventConfig = {
    filterFields: [
        { name: "eventName", label: "Event Name", type: "string" },
        { name: "eventStatus", label: "Status", type: "enum" },
        { name: "type", label: "Type", type: "enum" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "trainingProgramId", label: "Training Program", type: "objectId" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "training-event",
    path: "/training-event",
    section: "Training & Skills",
    singular: "Training Event",
    plural: "Training Events",
    description: "Attendee scoring (attendance/hours/grade/comments) lives on each row below, folding in what source calls Training Result.",
    api: {
        search: searchTrainingEvents, getById: getTrainingEventById,
        create: createTrainingEvent, update: updateTrainingEvent, remove: deleteTrainingEvent,
    },
    lookups: {
        companyId: asOptions(getAllCompanies, "companyName"),
        trainingProgramId: asOptions(getAllTrainingPrograms, "trainingProgramName"),
    },
    fields: [
        { name: "eventName", icon: Tag01, label: "Event Name", type: "string", required: true, section: "details", error: "Event Name is required!" },
        { name: "trainingProgramId", label: "Training Program", type: "select", section: "details", optionsFrom: "trainingProgramId" },
        { name: "eventStatus", label: "Status", type: "select", section: "details", options: ["Scheduled", "Completed", "Cancelled"] },
        { name: "type", label: "Type", type: "select", required: true, section: "details", error: "Type is required!", options: ["Seminar", "Theory", "Workshop", "Conference", "Exam", "Internet", "Self-Study"] },
        { name: "level", label: "Level", type: "select", section: "details", options: ["Beginner", "Intermediate", "Advance"] },
        { name: "companyId", icon: Building07, label: "Company", type: "select", section: "details", optionsFrom: "companyId" },
        { name: "trainerName", label: "Trainer Name", type: "string", section: "details" },
        { name: "trainerEmail", label: "Trainer Email", type: "string", section: "details" },
        { name: "supplierName", label: "Supplier", type: "string", section: "details" },
        { name: "contactNumber", label: "Contact Number", type: "string", section: "details" },
        { name: "course", label: "Course", type: "string", section: "details" },
        { name: "location", label: "Location", type: "string", required: true, section: "details", error: "Location is required!" },
        { name: "startTime", label: "Start Time", type: "datetime-local", required: true, section: "details", error: "Start Time is required!" },
        { name: "endTime", label: "End Time", type: "datetime-local", required: true, section: "details", error: "End Time is required!" },
        { name: "introduction", label: "Introduction", type: "textarea", required: true, section: "details", error: "Introduction is required!" },
        ACTIVE,
    ],
    sections: [{ id: "details", title: "Details" }, { id: "attendees", title: "Attendees" }, { id: "actions", title: "Actions" }],
    renderExtra: ({ mode, id, values, setValues }) => (
        <>
            <SimpleArrayField
                title="Attendees" description="Paste an Employee's id into each row."
                fieldName="employees" columns={TRAINING_EVENT_ATTENDEE_COLUMNS} values={values} setValues={setValues}
            />
            {mode === "edit" && id && (
                <>
                    <SimpleActionButton
                        label="Mark as Completed" description="Present, not-yet-feedback-submitted attendees move to Completed; the event moves to Completed."
                        onRun={() => markTrainingEventCompleted(id)}
                        onResult={() => window.location.reload()}
                    />
                    <SimpleActionButton
                        label="Reopen as Scheduled" description="Resets every attendee row to Open; the event moves back to Scheduled."
                        onRun={() => markTrainingEventScheduled(id)}
                        onResult={() => window.location.reload()}
                    />
                </>
            )}
        </>
    ),
    columns: [
        { name: "Event", selector: (row) => row.eventName, minWidth: "200px" },
        { name: "Status", selector: (row) => row.eventStatus, minWidth: "120px" },
        { name: "Type", selector: (row) => row.type, minWidth: "120px" },
    ],
    recordTitle: (r) => r.eventName,
    toForm: (data) => ({ ...data, companyId: refId(data.companyId), trainingProgramId: refId(data.trainingProgramId) }),
};

export const trainingFeedbackConfig = {
    filterFields: [
        { name: "employeeId", label: "Employee", type: "objectId" },
        { name: "trainingEventId", label: "Training Event", type: "objectId" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "training-feedback",
    path: "/training-feedback",
    section: "Training & Skills",
    singular: "Training Feedback",
    plural: "Training Feedback",
    description: "Only allowed once the Training Event is Completed, the employee was an attendee, and they weren't marked Absent.",
    api: {
        search: searchTrainingFeedbacks, getById: getTrainingFeedbackById,
        create: createTrainingFeedback, remove: deleteTrainingFeedback,
    },
    lookups: {
        employeeId: asOptions(getAllEmployees, "employeeName"),
        trainingEventId: asOptions(getAllTrainingEvents, "eventName"),
    },
    fields: [
        { name: "employeeId", icon: User01, label: "Employee", type: "select", required: true, section: "details", error: "Employee is required!", optionsFrom: "employeeId" },
        { name: "trainingEventId", label: "Training Event", type: "select", required: true, section: "details", error: "Training Event is required!", optionsFrom: "trainingEventId" },
        { name: "feedback", label: "Feedback", type: "textarea", required: true, section: "details", error: "Feedback is required!" },
        ACTIVE,
    ],
    columns: [
        { name: "Employee", selector: (row) => row.employeeId, minWidth: "180px" },
        { name: "Training Event", selector: (row) => row.trainingEventId, minWidth: "180px" },
    ],
    recordTitle: (r) => `Training Feedback — ${r._id}`,
    toForm: (data) => ({ ...data, employeeId: refId(data.employeeId), trainingEventId: refId(data.trainingEventId) }),
};

export const skillConfig = {
    filterFields: [
        { name: "skillName", label: "Skill Name", type: "string" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "skill",
    path: "/skill",
    section: "Training & Skills",
    singular: "Skill",
    plural: "Skills",
    api: {
        search: searchSkills, getById: getSkillById,
        create: createSkill, update: updateSkill, remove: deleteSkill,
    },
    fields: [
        { name: "skillName", icon: Tag01, label: "Skill Name", type: "string", required: true, section: "details", error: "Skill Name is required!" },
        { name: "description", label: "Description", type: "textarea", section: "details" },
        ACTIVE,
    ],
    columns: [{ name: "Skill", selector: (row) => row.skillName, minWidth: "220px" }],
    recordTitle: (r) => r.skillName,
};

export const employeeSkillMapConfig = {
    filterFields: [
        { name: "employeeId", label: "Employee", type: "objectId" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "employee-skill-map",
    path: "/employee-skill-map",
    section: "Training & Skills",
    singular: "Employee Skill Map",
    plural: "Employee Skill Maps",
    api: {
        search: searchEmployeeSkillMaps, getById: getEmployeeSkillMapById,
        create: createEmployeeSkillMap, update: updateEmployeeSkillMap, remove: deleteEmployeeSkillMap,
    },
    lookups: { employeeId: asOptions(getAllEmployees, "employeeName") },
    fields: [
        { name: "employeeId", icon: User01, label: "Employee", type: "select", required: true, section: "details", error: "Employee is required!", optionsFrom: "employeeId" },
        ACTIVE,
    ],
    sections: [{ id: "details", title: "Details" }, { id: "skills", title: "Skills" }, { id: "actions", title: "Actions" }],
    renderExtra: ({ mode, id, values, setValues }) => (
        <>
            <SimpleArrayField
                title="Employee Skills" description="Paste a Skill's id into each row; proficiency is 1-5."
                fieldName="employeeSkills"
                columns={[
                    { name: "skillId", label: "Skill id", type: "text" },
                    { name: "proficiency", label: "Proficiency (1-5)", type: "number" },
                ]}
                values={values} setValues={setValues}
            />
            {mode === "edit" && id && (
                <SimpleActionButton
                    label="Populate from Designation" description="Clears and repopulates skills from the Employee's Designation's skill list."
                    onRun={() => populateEmployeeSkillMapFromDesignation(id)}
                    onResult={() => window.location.reload()}
                />
            )}
        </>
    ),
    columns: [{ name: "Employee", selector: (row) => row.employeeId, minWidth: "220px" }],
    recordTitle: (r) => `Employee Skill Map — ${r._id}`,
    toForm: (data) => ({ ...data, employeeId: refId(data.employeeId) }),
};

// ---------------------------------------------------------------------------
// Travel (ADR-023). Two one-field masters (ADMIN-only per RoleMaster — no
// grants seeded for either, matching source's own literal permission table)
// plus Travel Request, whose itinerary/costings arrays reuse SimpleArrayField
// the same way modules 4-6 do. No rollup total and no date-order validation
// here on purpose — source has neither; see DECISIONS.md ADR-023.
// ---------------------------------------------------------------------------

const TRAVEL_ITINERARY_COLUMNS = [
    { name: "travelFrom", label: "From", type: "text" },
    { name: "travelTo", label: "To", type: "text" },
    { name: "modeOfTravel", label: "Mode", type: "select", options: ["Flight", "Train", "Taxi", "Rented Car"] },
    { name: "mealPreference", label: "Meal Preference", type: "select", options: ["Vegetarian", "Non-Vegetarian", "Gluten Free", "Non Diary"] },
    { name: "travelAdvanceRequired", label: "Advance Required", type: "checkbox" },
    { name: "advanceAmount", label: "Advance Amount", type: "number" },
    { name: "departureDate", label: "Departure Date", type: "date" },
    { name: "arrivalDate", label: "Arrival Date", type: "date" },
    { name: "lodgingRequired", label: "Lodging Required", type: "checkbox" },
    { name: "preferredAreaForLodging", label: "Preferred Area for Lodging", type: "text" },
    { name: "checkInDate", label: "Check-in Date", type: "date" },
    { name: "checkOutDate", label: "Check-out Date", type: "date" },
    { name: "otherDetails", label: "Other Details", type: "text" },
];

const TRAVEL_COSTING_COLUMNS = [
    { name: "expenseType", label: "Expense Type", type: "text" },
    { name: "sponsoredAmount", label: "Sponsored Amount", type: "number" },
    { name: "fundedAmount", label: "Funded Amount", type: "number" },
    { name: "totalAmount", label: "Total Amount", type: "number" },
    { name: "comments", label: "Comments", type: "text" },
];

export const purposeOfTravelConfig = {
    filterFields: [
        { name: "purposeOfTravelName", label: "Name", type: "string" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "purpose-of-travel",
    path: "/purpose-of-travel",
    section: "Travel",
    singular: "Purpose of Travel",
    plural: "Purposes of Travel",
    api: {
        search: searchPurposeOfTravels, getById: getPurposeOfTravelById,
        create: createPurposeOfTravel, update: updatePurposeOfTravel, remove: deletePurposeOfTravel,
    },
    fields: [
        { name: "purposeOfTravelName", icon: Tag01, label: "Purpose of Travel Name", type: "string", required: true, section: "details", error: "Purpose of Travel Name is required!" },
        ACTIVE,
    ],
    columns: [{ name: "Name", selector: (row) => row.purposeOfTravelName, minWidth: "220px" }],
    recordTitle: (r) => r.purposeOfTravelName,
};

export const identificationDocumentTypeConfig = {
    filterFields: [
        { name: "identificationDocumentTypeName", label: "Name", type: "string" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "identification-document-type",
    path: "/identification-document-type",
    section: "Travel",
    singular: "Identification Document Type",
    plural: "Identification Document Types",
    api: {
        search: searchIdentificationDocumentTypes, getById: getIdentificationDocumentTypeById,
        create: createIdentificationDocumentType, update: updateIdentificationDocumentType, remove: deleteIdentificationDocumentType,
    },
    fields: [
        { name: "identificationDocumentTypeName", icon: Tag01, label: "Identification Document Type Name", type: "string", required: true, section: "details", error: "Identification Document Type Name is required!" },
        ACTIVE,
    ],
    columns: [{ name: "Name", selector: (row) => row.identificationDocumentTypeName, minWidth: "220px" }],
    recordTitle: (r) => r.identificationDocumentTypeName,
};

export const travelRequestConfig = {
    filterFields: [
        { name: "employeeId", label: "Employee", type: "objectId" },
        { name: "travelType", label: "Travel Type", type: "string" },
        { name: "status", label: "Status", type: "string" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "travel-request",
    path: "/travel-request",
    section: "Travel",
    singular: "Travel Request",
    plural: "Travel Requests",
    description: "Total Amount is not auto-summed from Sponsored/Funded — source has no rollup formula despite the field names.",
    api: {
        search: searchTravelRequests, getById: getTravelRequestById,
        create: createTravelRequest, update: updateTravelRequest, remove: deleteTravelRequest,
    },
    lookups: {
        employeeId: asOptions(getAllEmployees, "employeeName"),
        purposeOfTravelId: asOptions(getAllPurposeOfTravels, "purposeOfTravelName"),
        personalIdTypeId: asOptions(getAllIdentificationDocumentTypes, "identificationDocumentTypeName"),
        companyId: asOptions(getAllCompanies, "companyName"),
    },
    fields: [
        { name: "employeeId", icon: User01, label: "Employee", type: "select", required: true, section: "details", error: "Employee is required!", optionsFrom: "employeeId" },
        { name: "travelType", label: "Travel Type", type: "select", required: true, section: "details", error: "Travel Type is required!", options: ["Domestic", "International"] },
        { name: "travelFunding", label: "Travel Funding", type: "select", section: "details", options: ["Require Full Funding", "Fully Sponsored", "Partially Sponsored, Require Partial Funding"] },
        { name: "purposeOfTravelId", label: "Purpose of Travel", type: "select", required: true, section: "details", error: "Purpose of Travel is required!", optionsFrom: "purposeOfTravelId" },
        { name: "detailsOfSponsor", label: "Details of Sponsor", type: "string", section: "details" },
        { name: "description", label: "Description", type: "textarea", section: "details" },
        { name: "personalIdTypeId", label: "Identification Document Type", type: "select", section: "details", optionsFrom: "personalIdTypeId" },
        { name: "personalIdNumber", label: "Personal ID Number", type: "string", section: "details" },
        { name: "companyId", icon: Building07, label: "Company", type: "select", section: "details", optionsFrom: "companyId" },
        { name: "status", label: "Status", type: "select", section: "details", options: ["Draft", "Submitted", "Cancelled"] },
        ACTIVE,
    ],
    sections: [{ id: "details", title: "Details" }, { id: "itinerary", title: "Itinerary" }, { id: "costings", title: "Costings" }],
    renderExtra: ({ values, setValues }) => (
        <>
            <SimpleArrayField
                title="Itinerary" description="One row per travel leg."
                fieldName="itinerary" columns={TRAVEL_ITINERARY_COLUMNS} values={values} setValues={setValues}
            />
            <SimpleArrayField
                title="Costings" description="Total Amount is entered manually, not computed."
                fieldName="costings" columns={TRAVEL_COSTING_COLUMNS} values={values} setValues={setValues}
            />
        </>
    ),
    columns: [
        { name: "Employee", selector: (row) => row.employeeName || row.employeeId, minWidth: "200px" },
        { name: "Type", selector: (row) => row.travelType, minWidth: "120px" },
        { name: "Status", selector: (row) => row.status, minWidth: "120px" },
    ],
    recordTitle: (r) => `Travel Request — ${r._id}`,
    toForm: (data) => ({
        ...data,
        employeeId: refId(data.employeeId),
        purposeOfTravelId: refId(data.purposeOfTravelId),
        personalIdTypeId: refId(data.personalIdTypeId),
        companyId: refId(data.companyId),
    }),
};

export const ADVANCED_ENTITIES = [
    adminUserConfig, userConfig, menuMasterConfig, emailTemplateConfig,
    departmentConfig, branchConfig, designationConfig, employeeConfig,
    jobApplicantSourceConfig, interviewTypeConfig, jobOfferTermTemplateConfig,
    jobRequisitionConfig, jobOpeningConfig, jobApplicantConfig,
    interviewConfig, interviewFeedbackConfig, jobOfferConfig,
    employeeOnboardingTemplateConfig, employeeOnboardingConfig,
    employeeSeparationTemplateConfig, employeeSeparationConfig,
    exitInterviewConfig, fullAndFinalStatementConfig,
    grievanceTypeConfig, employeeGrievanceConfig, employeeTransferConfig,
    employeePromotionConfig, employeeReferralConfig, staffingPlanConfig,
    trainingProgramConfig, trainingEventConfig, trainingFeedbackConfig,
    skillConfig, employeeSkillMapConfig,
    purposeOfTravelConfig, identificationDocumentTypeConfig, travelRequestConfig,
];
