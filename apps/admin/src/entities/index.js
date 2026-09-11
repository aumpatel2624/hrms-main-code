import {
    Building07, CurrencyDollar, Flag01, Globe01, Hash02, Link01,
    Map01, MarkerPin01, Server01, Shield01, Tag01, Zap,
} from "@untitledui/icons";
import { isValidEmail } from "@demo-panel/shared/validation";
import {
    getAllCountries, getAllStates,
    createCountry, updateCountry, getCountryById, deleteCountry, searchCountries,
    createState, updateState, getStateById, deleteState, searchStates,
    createCity, updateCity, getCityById, deleteCity, searchCities,
} from "../api/locations.api";
import { createCurrency, deleteCurrency, getCurrencyById, updateCurrency, searchCurrencies } from "../api/currencies.api";
import { createRole, getRoleById, deleteRole, updateRole, searchRoles } from "../api/roles.api";
import {
    createCompany, deleteCompany, getCompanyById, updateCompany, searchCompanies,
    createEmploymentType, deleteEmploymentType, getEmploymentTypeById, updateEmploymentType, searchEmploymentTypes,
    createEmployeeGrade, deleteEmployeeGrade, getEmployeeGradeById, updateEmployeeGrade, searchEmployeeGrades,
    createEmployeeHealthInsurance, deleteEmployeeHealthInsurance, getEmployeeHealthInsuranceById,
    updateEmployeeHealthInsurance, searchEmployeeHealthInsurances,
} from "../api/organizationSetup.api";
import {
    createEmailFor, deleteEmailFor, getEmailForById, updateEmailFor, searchEmailFor, getEmailTriggers,
    createEmailSetup, deleteEmailSetup, getEmailSetupById, updateEmailSetup, searchEmailSetups,
} from "../api/emails.api";
import { createMenuGroup, deleteMenuGroup, getMenuGroupById, updateMenuGroup, searchMenuGroups } from "../api/menus.api";
import { getAllSalaryStructures } from "../api/payroll.api";
import { createSeoRedirect, deleteSeoRedirect, getSeoRedirectById, updateSeoRedirect, searchSeoRedirects } from "../api/seo.api";
import { REDIRECT_STATUSES } from "@demo-panel/shared/seo";

/** Maps an API list response to the { value, label } shape SelectField wants. */
const asOptions = (loader, labelKey) => () =>
    loader().then((res) => (res.data?.data ?? []).map((x) => ({ value: x._id, label: x[labelKey] })));

const ACTIVE = { name: "isActive", label: "Is Active", type: "checkbox", section: "status", default: false };

export const countryConfig = {
    filterFields: [
        { name: "countryName", label: "Country Name", type: "string" },
        { name: "countryCode", label: "Country Code", type: "string" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "country",
    path: "/country",
    section: "Master",
    singular: "Country",
    plural: "Countries",
    description: "Countries available across the application.",
    api: { search: searchCountries, getById: getCountryById, create: createCountry, update: updateCountry, remove: deleteCountry },
    sections: [
        { id: "details", title: "Country details", description: "Name and ISO code for this country." },
        { id: "status", title: "Status", description: "Controls whether this record is selectable elsewhere." },
    ],
    fields: [
        { name: "countryName", icon: Globe01, label: "Country Name", required: true, section: "details", error: "Country Name is required!" , placeholder: "Enter country name" },
        { name: "countryCode", icon: Hash02, label: "Country Code", required: true, section: "details", error: "Country Code is required!" , placeholder: "Enter country code" },
        ACTIVE,
    ],
    columns: [
        { name: "Country Name", selector: (row) => row.countryName, minWidth: "160px" },
        { name: "Country Code", selector: (row) => row.countryCode, minWidth: "140px" },
    ],
    recordTitle: (r) => r.countryName,
};

export const stateConfig = {
    filterFields: [
        { name: "stateName", label: "State Name", type: "string" },
        { name: "stateCode", label: "State Code", type: "string" },
        { name: "countryName", label: "Country Name", type: "string" },
        { name: "countryId", label: "Country", type: "objectId", optionsFrom: "countries" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    filterLookups: { countries: asOptions(getAllCountries, "countryName") },
    key: "state",
    path: "/state",
    section: "Master",
    singular: "State",
    plural: "States",
    description: "States and provinces, grouped by country.",
    api: { search: searchStates, getById: getStateById, create: createState, update: updateState, remove: deleteState },
    lookups: { countries: asOptions(getAllCountries, "countryName") },
    sections: [
        { id: "details", title: "State details", description: "Which country this state belongs to, and its name and code." },
        { id: "status", title: "Status" },
    ],
    fields: [
        { name: "countryId", icon: Globe01, label: "Country", type: "select", optionsFrom: "countries", required: true, section: "details", error: "Country is required!" , placeholder: "Search country..." },
        { name: "stateName", icon: Map01, label: "State Name", required: true, section: "details", error: "State Name is required!" , placeholder: "Enter state name" },
        { name: "stateCode", icon: Hash02, label: "State Code", required: true, section: "details", error: "State Code is required!" , placeholder: "Enter state code" },
        ACTIVE,
    ],
    columns: [
        { name: "Country", selector: (row) => row.countryName, minWidth: "150px" },
        { name: "State Name", selector: (row) => row.stateName, minWidth: "150px" },
        { name: "State Code", selector: (row) => row.stateCode, minWidth: "130px" },
    ],
    recordTitle: (r) => r.stateName,
};

export const cityConfig = {
    filterFields: [
        { name: "cityName", label: "City Name", type: "string" },
        { name: "cityCode", label: "City Code", type: "string" },
        { name: "stateName", label: "State Name", type: "string" },
        { name: "countryName", label: "Country Name", type: "string" },
        { name: "countryId", label: "Country", type: "objectId", optionsFrom: "countries" },
        { name: "stateId", label: "State", type: "objectId", optionsFrom: "states" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    filterLookups: { countries: asOptions(getAllCountries, "countryName"), states: asOptions(getAllStates, "stateName") },
    key: "city",
    path: "/city",
    section: "Master",
    singular: "City",
    plural: "Cities",
    description: "Cities, grouped by state.",
    api: { search: searchCities, getById: getCityById, create: createCity, update: updateCity, remove: deleteCity },
    lookups: { countries: asOptions(getAllCountries, "countryName"), states: asOptions(getAllStates, "stateName") },
    sections: [
        { id: "details", title: "City details", description: "Where this city sits, and its name and code." },
        { id: "status", title: "Status" },
    ],
    fields: [
        { name: "countryId", icon: Globe01, label: "Country", type: "select", optionsFrom: "countries", required: true, section: "details", error: "Country is required!", clears: ["stateId"] , placeholder: "Search country..." },
        { name: "stateId", icon: Map01, label: "State", type: "select", optionsFrom: "states", required: true, section: "details", error: "State is required!" , placeholder: "Search state..." },
        { name: "cityName", icon: MarkerPin01, label: "City Name", required: true, section: "details", error: "City Name is required!" , placeholder: "Enter city name" },
        { name: "cityCode", icon: Hash02, label: "City Code", required: true, section: "details", error: "City Code is required!" , placeholder: "Enter city code" },
        ACTIVE,
    ],
    columns: [
        { name: "Country", selector: (row) => row.countryName, minWidth: "140px" },
        { name: "State", selector: (row) => row.stateName, minWidth: "140px" },
        { name: "City Name", selector: (row) => row.cityName, minWidth: "140px" },
        { name: "City Code", selector: (row) => row.cityCode, minWidth: "120px" },
    ],
    recordTitle: (r) => r.cityName,
};

export const currencyConfig = {
    filterFields: [
        { name: "currencyName", label: "Currency Name", type: "string" },
        { name: "currencyCode", label: "Currency Code", type: "string" },
        { name: "currencySymbol", label: "Symbol", type: "string" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "currency",
    path: "/currency-master",
    section: "Master",
    singular: "Currency",
    plural: "Currencies",
    description: "Currencies available for pricing and reporting.",
    api: { search: searchCurrencies, getById: getCurrencyById, create: createCurrency, update: updateCurrency, remove: deleteCurrency },
    sections: [
        { id: "details", title: "Currency details", description: "Name, ISO code and the symbol shown to users." },
        { id: "status", title: "Status" },
    ],
    fields: [
        { name: "currencyName", icon: CurrencyDollar, label: "Currency Name", required: true, section: "details", error: "Currency Name is required!" , placeholder: "Enter currency name" },
        { name: "currencyCode", icon: Hash02, label: "Currency Code", required: true, section: "details", error: "Currency Code is required!" , placeholder: "Enter currency code" },
        { name: "currencySymbol", icon: Tag01, label: "Currency Symbol", required: true, section: "details", error: "Currency Symbol is required!" , placeholder: "Enter currency symbol" },
        ACTIVE,
    ],
    columns: [
        { name: "Currency Name", selector: (row) => row.currencyName, minWidth: "160px" },
        { name: "Code", selector: (row) => row.currencyCode, minWidth: "110px" },
        { name: "Symbol", selector: (row) => row.currencySymbol, minWidth: "110px" },
    ],
    recordTitle: (r) => r.currencyName,
};

export const roleConfig = {
    filterFields: [
        { name: "roleName", label: "Role Name", type: "string" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "role",
    path: "/role-master",
    section: "Master",
    singular: "Role",
    plural: "Roles",
    description: "Roles that permissions are assigned to on the User Roles screen.",
    api: { search: searchRoles, getById: getRoleById, create: createRole, update: updateRole, remove: deleteRole },
    sections: [
        { id: "details", title: "Role details" },
        { id: "status", title: "Status" },
    ],
    fields: [
        { name: "roleName", icon: Shield01, label: "Role Name", required: true, section: "details", full: true, error: "Role Name is required!" , placeholder: "Enter role name" },
        { ...ACTIVE, default: true },
    ],
    columns: [
        { name: "Role Name", selector: (row) => row.roleName, sortable: true, sortField: "roleName", minWidth: "200px" },
        { name: "Status", selector: (row) => (row.isActive ? "Active" : "Inactive"), minWidth: "130px" },
    ],
    recordTitle: (r) => r.roleName,
};

// departmentConfig moved to entities/advanced.jsx (ADR-017) — it now needs a
// companyId select (lookups), which is an advanced-tier concern.

export const companyConfig = {
    filterFields: [
        { name: "companyName", label: "Company Name", type: "string" },
        { name: "companyCode", label: "Company Code", type: "string" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "company",
    path: "/company",
    section: "HR Setup",
    singular: "Company",
    plural: "Companies",
    description: "Legal entities within Apidel. Every branch, department and designation belongs to one.",
    api: { search: searchCompanies, getById: getCompanyById, create: createCompany, update: updateCompany, remove: deleteCompany },
    sections: [
        { id: "details", title: "Company details" },
        { id: "status", title: "Status" },
    ],
    fields: [
        { name: "companyName", icon: Building07, label: "Company Name", required: true, section: "details", error: "Company Name is required!", placeholder: "Enter company name" },
        { name: "companyCode", icon: Hash02, label: "Company Code", section: "details", placeholder: "Enter company code (optional)" },
        ACTIVE,
    ],
    columns: [
        { name: "Company Name", selector: (row) => row.companyName, minWidth: "200px" },
        { name: "Code", selector: (row) => row.companyCode, minWidth: "130px" },
        { name: "Status", selector: (row) => (row.isActive ? "Active" : "Inactive"), minWidth: "130px" },
    ],
    recordTitle: (r) => r.companyName,
};

export const employmentTypeConfig = {
    filterFields: [
        { name: "employmentTypeName", label: "Employment Type", type: "string" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "employment-type",
    path: "/employment-type",
    section: "HR Setup",
    singular: "Employment Type",
    plural: "Employment Types",
    description: "Employment categories (Full-time, Contract, ...) assignable to an employee.",
    api: {
        search: searchEmploymentTypes, getById: getEmploymentTypeById, create: createEmploymentType,
        update: updateEmploymentType, remove: deleteEmploymentType,
    },
    sections: [
        { id: "details", title: "Employment type details" },
        { id: "status", title: "Status" },
    ],
    fields: [
        { name: "employmentTypeName", icon: Tag01, label: "Employment Type", required: true, section: "details", error: "Employment Type is required!", placeholder: "Enter employment type" },
        ACTIVE,
    ],
    columns: [
        { name: "Employment Type", selector: (row) => row.employmentTypeName, minWidth: "200px" },
        { name: "Status", selector: (row) => (row.isActive ? "Active" : "Inactive"), minWidth: "130px" },
    ],
    recordTitle: (r) => r.employmentTypeName,
};

export const employeeGradeConfig = {
    filterFields: [
        { name: "gradeName", label: "Grade Name", type: "string" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "employee-grade",
    path: "/employee-grade",
    section: "HR Setup",
    singular: "Employee Grade",
    plural: "Employee Grades",
    description: "Pay-grade master assignable to an employee.",
    api: {
        search: searchEmployeeGrades, getById: getEmployeeGradeById, create: createEmployeeGrade,
        update: updateEmployeeGrade, remove: deleteEmployeeGrade,
    },
    // ADR-026 (Payroll — Structure & Assignment): these two fields exist now
    // that SalaryStructure does — see EmployeeGrade.js's own comment on why
    // they weren't modelled speculatively before this module.
    lookups: { defaultSalaryStructureId: asOptions(getAllSalaryStructures, "currency") },
    sections: [
        { id: "details", title: "Employee grade details" },
        { id: "defaults", title: "Payroll defaults" },
        { id: "status", title: "Status" },
    ],
    fields: [
        { name: "gradeName", icon: Tag01, label: "Grade Name", required: true, section: "details", error: "Grade Name is required!", placeholder: "Enter grade name" },
        { name: "defaultSalaryStructureId", label: "Default Salary Structure", section: "defaults", type: "select", optionsFrom: "defaultSalaryStructureId", hint: "Not auto-fetched onto a new Salary Structure Assignment (MVP) — informational for now." },
        { name: "defaultBasePay", label: "Default Base Pay", section: "defaults", type: "number", hint: "Pre-fills the Bulk Salary Structure Assignment tool's eligible-employees list." },
        ACTIVE,
    ],
    columns: [
        { name: "Grade Name", selector: (row) => row.gradeName, minWidth: "200px" },
        { name: "Status", selector: (row) => (row.isActive ? "Active" : "Inactive"), minWidth: "130px" },
    ],
    recordTitle: (r) => r.gradeName,
};

export const employeeHealthInsuranceConfig = {
    filterFields: [
        { name: "providerName", label: "Provider Name", type: "string" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "employee-health-insurance",
    path: "/employee-health-insurance",
    section: "HR Core",
    singular: "Employee Health Insurance",
    plural: "Employee Health Insurances",
    description: "Health insurance providers employees can be enrolled with.",
    api: {
        search: searchEmployeeHealthInsurances, getById: getEmployeeHealthInsuranceById, create: createEmployeeHealthInsurance,
        update: updateEmployeeHealthInsurance, remove: deleteEmployeeHealthInsurance,
    },
    sections: [
        { id: "details", title: "Provider details" },
        { id: "status", title: "Status" },
    ],
    fields: [
        { name: "providerName", icon: Tag01, label: "Provider Name", required: true, section: "details", error: "Provider Name is required!", placeholder: "Enter provider name" },
        ACTIVE,
    ],
    columns: [
        { name: "Provider Name", selector: (row) => row.providerName, minWidth: "200px" },
        { name: "Status", selector: (row) => (row.isActive ? "Active" : "Inactive"), minWidth: "130px" },
    ],
    recordTitle: (r) => r.providerName,
};

export const emailForConfig = {
    filterFields: [
        { name: "emailFor", label: "Email For", type: "string" },
        { name: "triggerKey", label: "Trigger", type: "string" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "email-for",
    path: "/email-for",
    section: "CMS",
    singular: "Email For",
    plural: "Email For",
    description: "The events an email template can be attached to.",
    api: { search: searchEmailFor, getById: getEmailForById, create: createEmailFor, update: updateEmailFor, remove: deleteEmailFor },
    lookups: {
        // The trigger registry (ADR-015), filtered to entries not already
        // claimed by another live Email For — except the one this record
        // itself already claims, so editing it doesn't blank the field. `id`
        // is undefined on the add form, so nothing is ever "this record" yet.
        //
        // A row backfilled before the registry existed (or whose registry
        // entry was since removed) can carry a triggerKey that was never a
        // real option — e.g. `unassigned.*` from `backfillEmailForTriggerKeys`
        // (found live, OPEN-QUESTIONS.md Q-2 / GitHub #5). Such a value can
        // never appear in the registry list, so the select renders empty and
        // saving either fails validation or silently reassigns the row to a
        // different real trigger. This loader runs before the record's own
        // fetch resolves (the two effects aren't linked — see crud-form.jsx),
        // so it re-fetches the record itself in edit mode purely to learn its
        // *current* triggerKey and, if that value isn't a real registry
        // option, injects it as a synthetic, clearly-labelled one — keeping
        // the row editable (and re-savable without a silent reassignment)
        // without pretending it points at a real event.
        triggerOptions: (_values, { id }) =>
            Promise.all([
                getEmailTriggers(),
                id ? getEmailForById(id).catch(() => null) : Promise.resolve(null),
            ]).then(([triggersRes, recordRes]) => {
                const options = (triggersRes.data?.data?.triggers ?? [])
                    .filter((t) => !t.claimedByEmailForId || t.claimedByEmailForId === id)
                    .map((t) => ({ value: t.key, label: t.label }));

                const currentKey = recordRes?.data?.data?.triggerKey;
                if (currentKey && !options.some((o) => o.value === currentKey)) {
                    options.push({
                        value: currentKey,
                        label: `${currentKey} (not a real event — reassign or remove)`,
                    });
                }
                return options;
            }),
    },
    sections: [
        { id: "details", title: "Details" },
        { id: "status", title: "Status" },
    ],
    fields: [
        { name: "emailFor", icon: Flag01, label: "Email For", required: true, section: "details", full: true, error: "Email For is required!" , placeholder: "Enter email for" },
        {
            name: "triggerKey", icon: Zap, label: "Trigger", type: "select", optionsFrom: "triggerOptions",
            required: true, section: "details", full: true, placeholder: "Search event...",
            hint: "Which event in the app sends this email. New events are added by a developer.",
            error: "Trigger is required!",
        },
        ACTIVE,
    ],
    columns: [
        { name: "Email For", selector: (row) => row.emailFor, minWidth: "220px" },
        { name: "Trigger", selector: (row) => row.triggerKey, minWidth: "180px" },
    ],
    recordTitle: (r) => r.emailFor,
};

export const emailSetupConfig = {
    filterFields: [
        { name: "email", label: "Email", type: "string" },
        { name: "host", label: "Host", type: "string" },
        { name: "port", label: "Port", type: "string" },
        { name: "SSL", label: "Uses SSL", type: "boolean" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "email-setup",
    path: "/email-setup",
    section: "CMS",
    singular: "Email Setup",
    plural: "Email Setups",
    description: "SMTP accounts outgoing mail is sent from.",
    api: { search: searchEmailSetups, getById: getEmailSetupById, create: createEmailSetup, update: updateEmailSetup, remove: deleteEmailSetup },
    sections: [
        { id: "account", title: "Account", description: "The mailbox messages are sent from." },
        { id: "server", title: "Server", description: "SMTP host and port for this account." },
        { id: "status", title: "Status" },
    ],
    fields: [
        {
            name: "email", label: "Email", type: "email", required: true, section: "account", error: "Email is required!", placeholder: "name@company.com",
            validate: (v) => (v && !isValidEmail(v) ? "Invalid email address" : undefined),
        },
        { name: "appPassword", label: "App Password", type: "password", required: true, section: "account", error: "App Password is required!", placeholder: "Enter app password",
          hint: "An app-specific password, not the account password." },
        { name: "host", icon: Server01, label: "Host", required: true, section: "server", placeholder: "smtp.example.com", error: "Host is required!" },
        { name: "port", icon: Hash02, label: "Port", required: true, section: "server", placeholder: "587", error: "Port is required!" },
        { name: "SSL", label: "Use SSL", type: "checkbox", section: "server", default: false },
        ACTIVE,
    ],
    columns: [
        { name: "Email", selector: (row) => row.email, minWidth: "220px" },
        { name: "Host", selector: (row) => row.host, minWidth: "170px" },
        { name: "Port", selector: (row) => row.port, minWidth: "100px" },
    ],
    recordTitle: (r) => r.email,
};

export const menuGroupConfig = {
    filterFields: [
        { name: "menuGroupName", label: "Menu Group Name", type: "string" },
        { name: "sequence", label: "Sequence", type: "number" },
        { name: "isLink", label: "Direct Link", type: "boolean" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "menu-group",
    path: "/menu-group",
    section: "Master",
    singular: "Menu Group",
    plural: "Menu Groups",
    description: "Top-level groupings in the sidebar navigation.",
    api: { search: searchMenuGroups, getById: getMenuGroupById, create: createMenuGroup, update: updateMenuGroup, remove: deleteMenuGroup },
    sections: [
        { id: "details", title: "Group details", description: "Name, ordering and the icon shown in the sidebar." },
        { id: "link", title: "Navigation", description: "A direct-link group has no submenus and navigates straight to a URL." },
        { id: "status", title: "Status" },
    ],
    fields: [
        { name: "menuGroupName", icon: Tag01, label: "Menu Group Name", required: true, section: "details", error: "Menu Group Name is required!" , placeholder: "Enter menu group name" },
        { name: "sequence", icon: Hash02, label: "Sequence", type: "number", min: 1, required: true, section: "details", error: "Sequence is required!" , placeholder: "Enter sequence" },
        { name: "icon", label: "Menu Group Icon", type: "icon", section: "details", full: true },
        { name: "isLink", label: "Is Direct Link (no submenus)", type: "checkbox", section: "link", default: false },
        {
            name: "menuUrl", label: "Menu URL", section: "link", full: true,
            disabled: (values) => !values.isLink,
            validate: (v, values) => (values.isLink && !v ? "Menu URL is required for direct link menu groups!" : undefined),
        },
        ACTIVE,
    ],
    columns: [
        { name: "Menu Group Name", selector: (row) => row.menuGroupName, sortable: true, sortField: "menuGroupName", minWidth: "180px" },
        { name: "Sequence", selector: (row) => row.sequence, sortable: true, sortField: "sequence", minWidth: "120px" },
        { name: "Status", selector: (row) => (row.isActive ? "Active" : "Inactive"), minWidth: "130px" },
    ],
    recordTitle: (r) => r.menuGroupName,
};


/**
 * Redirects are plain CRUD over one entity, so they are a config and nothing
 * else. The SEO *pages* screen is not — its form is replaced by a custom
 * editor; see seoPageConfig in advanced.jsx.
 */
const REDIRECT_LABELS = {
    301: "301 — moved permanently",
    302: "302 — moved temporarily",
    307: "307 — temporary, keeps the method",
    308: "308 — permanent, keeps the method",
    410: "410 — gone for good",
};

export const seoRedirectConfig = {
    filterFields: [
        { name: "fromPath", label: "From", type: "string" },
        { name: "toPath", label: "To", type: "string" },
        { name: "statusCode", label: "Status Code", type: "number" },
        { name: "hits", label: "Times Used", type: "number" },
        { name: "notes", label: "Notes", type: "string" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "lastHitAt", label: "Last Used", type: "date" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "seo-redirect",
    path: "/seo-redirects",
    section: "Setup",
    singular: "Redirect",
    plural: "Redirects",
    description: "Send visitors from an old URL to its replacement, so old links and search results keep working.",
    api: {
        search: searchSeoRedirects,
        getById: getSeoRedirectById,
        create: createSeoRedirect,
        update: updateSeoRedirect,
        remove: deleteSeoRedirect,
    },
    sections: [
        { id: "details", title: "Where it goes", description: "The old address, and where visitors should end up instead." },
        { id: "notes", title: "Notes", description: "Why this redirect exists — useful a year from now." },
        { id: "status", title: "Status" },
    ],
    fields: [
        {
            name: "fromPath", icon: Link01, label: "Old URL", required: true, section: "details",
            error: "The old URL is required!", placeholder: "/old-page",
            hint: "The path visitors are still asking for.",
        },
        {
            name: "statusCode", label: "Type of move", type: "select", section: "details", default: 301,
            options: REDIRECT_STATUSES.map((code) => ({ value: code, label: REDIRECT_LABELS[code] })),
            hint: "Use 301 unless the page is coming back.",
        },
        {
            name: "toPath", icon: Link01, label: "New URL", section: "details", full: true,
            placeholder: "/new-page",
            hint: "A path on your site, or a full URL to send them elsewhere. Leave blank only for 410.",
            disabled: (values) => Number(values.statusCode) === 410,
            validate: (value, values) =>
                Number(values.statusCode) !== 410 && !value ? "Tell us where to send visitors!" : undefined,
        },
        { name: "notes", label: "Notes", type: "textarea", section: "notes", full: true, placeholder: "Replaced by the new pricing page, Aug 2026" },
        ACTIVE,
    ],
    columns: [
        { name: "From", selector: (row) => row.fromPath, sortable: true, sortField: "fromPath", minWidth: "220px" },
        { name: "To", selector: (row) => row.toPath || "—", minWidth: "220px" },
        { name: "Type", selector: (row) => row.statusCode, sortable: true, sortField: "statusCode", maxWidth: "110px" },
        { name: "Times Used", selector: (row) => row.hits ?? 0, sortable: true, sortField: "hits", maxWidth: "130px" },
        {
            name: "Last Used",
            selector: (row) => (row.lastHitAt ? new Date(row.lastHitAt).toLocaleDateString() : "Never"),
            sortable: true, sortField: "lastHitAt", minWidth: "140px",
        },
    ],
    recordTitle: (r) => r.fromPath,
};

export const UNIFORM_ENTITIES = [
    countryConfig, stateConfig, cityConfig, currencyConfig,
    roleConfig, emailForConfig, emailSetupConfig, menuGroupConfig,
    seoRedirectConfig,
    companyConfig, employmentTypeConfig, employeeGradeConfig, employeeHealthInsuranceConfig,
];
