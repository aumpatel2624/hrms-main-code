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
import { createUser, deleteUser, getUserById, updateUser, searchUsers, resetUserPassword } from "../api/users.api";
import {
    createMenu, deleteMenu, getMenuById, updateMenu, searchMenus, getAllMenuGroups, getAllMenus,
} from "../api/menus.api";
import {
    getAllEmailSetups, getAllEmailFor, searchEmailTemplates, createEmailTemplate,
    deleteEmailTemplate, getEmailTemplateById, updateEmailTemplate,
} from "../api/emails.api";
import { deleteSeoPage, getSeoPageById, searchSeoPages } from "../api/seo.api";
import PasswordResetSection from "@/components/crud/password-reset-section";
import EmailTemplateMergeFields from "@/components/crud/email-template-merge-fields";

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

export const ADVANCED_ENTITIES = [
    adminUserConfig, userConfig, menuMasterConfig, emailTemplateConfig,
    departmentConfig, branchConfig, designationConfig, employeeConfig,
];
